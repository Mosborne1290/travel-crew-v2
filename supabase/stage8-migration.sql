-- ============================================================
-- TRAVEL CREW V2 - STAGE 8 MIGRATION
-- Final major feature release:
-- search support, document automation, smarter flights,
-- owner controls and reminder automation.
-- ============================================================

begin;

alter table public.profiles
  add column if not exists email text,
  add column if not exists account_disabled boolean not null default false,
  add column if not exists last_seen_at timestamptz;

alter table public.documents
  add column if not exists alert_days integer not null default 30,
  add column if not exists document_status text not null default 'active';

alter table public.flights
  add column if not exists gate_departure text,
  add column if not exists gate_arrival text,
  add column if not exists boarding_datetime timestamptz,
  add column if not exists checkin_opens_datetime timestamptz,
  add column if not exists baggage_allowance text,
  add column if not exists departure_timezone text,
  add column if not exists arrival_timezone text,
  add column if not exists flight_status text default 'scheduled';

create index if not exists stage8_documents_expiry_idx
  on public.documents (trip_id, expiry_date);

create index if not exists stage8_activities_search_idx
  on public.activities (trip_id, title);

create index if not exists stage8_bookings_search_idx
  on public.bookings (trip_id, provider);

create index if not exists stage8_places_search_idx
  on public.saved_places (trip_id, name);

create index if not exists stage8_messages_search_idx
  on public.messages (room_id, created_at desc);

create or replace function public.stage8_is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role = 'owner'
  );
$$;

grant execute on function public.stage8_is_owner() to authenticated;

create or replace function public.owner_set_user_disabled(
  p_user_id uuid,
  p_disabled boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.stage8_is_owner() then
    raise exception 'Owner access required.';
  end if;

  if p_user_id = auth.uid() and p_disabled then
    raise exception 'You cannot disable your own owner account.';
  end if;

  update public.profiles
  set account_disabled = p_disabled
  where id = p_user_id;

  insert into public.audit_log(user_id, action, entity_type, entity_id, detail)
  values(auth.uid(), 'owner_user_disabled_changed', 'profile', p_user_id,
    jsonb_build_object('disabled', p_disabled));

  return true;
end;
$$;

grant execute on function public.owner_set_user_disabled(uuid,boolean) to authenticated;

create or replace function public.owner_set_user_role(
  p_user_id uuid,
  p_role text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.stage8_is_owner() then
    raise exception 'Owner access required.';
  end if;

  if p_role not in ('owner','admin','member') then
    raise exception 'Invalid role.';
  end if;

  insert into public.user_roles(user_id, role)
  values(p_user_id, p_role)
  on conflict (user_id) do update set role=excluded.role;

  insert into public.audit_log(user_id, action, entity_type, entity_id, detail)
  values(auth.uid(), 'owner_user_role_changed', 'user_role', p_user_id,
    jsonb_build_object('role', p_role));

  return true;
end;
$$;

grant execute on function public.owner_set_user_role(uuid,text) to authenticated;

create or replace function public.create_document_expiry_reminders(p_trip_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_rows integer := 0;
  r record;
begin
  if not app_private.is_trip_member(p_trip_id) then
    raise exception 'Not a member of this trip.';
  end if;

  for r in
    select d.id, d.name, d.expiry_date, d.alert_days,
           coalesce(d.traveller_user_id, tm.user_id) as target_user
    from public.documents d
    join public.trip_members tm on tm.trip_id=d.trip_id
    where d.trip_id=p_trip_id
      and d.expiry_date is not null
      and d.document_status='active'
      and d.expiry_date >= current_date
      and d.expiry_date <= current_date + interval '365 days'
      and (d.traveller_user_id is null or tm.user_id=d.traveller_user_id)
  loop
    insert into public.trip_reminders(
      trip_id,user_id,title,message,remind_at,target_url,
      reminder_type,created_by
    )
    select
      p_trip_id,
      r.target_user,
      'Document expiry warning',
      r.name || ' expires on ' || r.expiry_date::text,
      (r.expiry_date::timestamp - make_interval(days=>greatest(r.alert_days,0))) + interval '09 hours',
      '/trips/' || p_trip_id::text || '/documents',
      'document_expiry',
      auth.uid()
    where not exists(
      select 1 from public.trip_reminders x
      where x.trip_id=p_trip_id
        and x.user_id=r.target_user
        and x.reminder_type='document_expiry'
        and x.message = r.name || ' expires on ' || r.expiry_date::text
    );

    get diagnostics v_rows = row_count;
    v_count := v_count + v_rows;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.create_document_expiry_reminders(uuid) to authenticated;

create or replace function public.create_flight_reminders(p_trip_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_rows integer := 0;
  r record;
begin
  if not app_private.is_trip_member(p_trip_id) then
    raise exception 'Not a member of this trip.';
  end if;

  for r in
    select
      b.id as booking_id,
      coalesce(f.airline,b.provider,'Flight') as airline,
      coalesce(f.flight_number,'') as flight_number,
      f.departure_datetime,
      f.boarding_datetime,
      f.checkin_opens_datetime,
      tm.user_id
    from public.bookings b
    join public.flights f on f.booking_id=b.id
    join public.trip_members tm on tm.trip_id=b.trip_id
    where b.trip_id=p_trip_id
      and f.departure_datetime is not null
      and f.departure_datetime > now()
  loop
    if r.checkin_opens_datetime is not null then
      insert into public.trip_reminders(
        trip_id,user_id,title,message,remind_at,target_url,reminder_type,created_by
      )
      select p_trip_id,r.user_id,'Flight check-in opens',
        trim(r.airline || ' ' || r.flight_number),
        r.checkin_opens_datetime,
        '/trips/'||p_trip_id::text||'/bookings','flight_checkin',auth.uid()
      where not exists(
        select 1 from public.trip_reminders x
        where x.trip_id=p_trip_id and x.user_id=r.user_id
          and x.reminder_type='flight_checkin'
          and x.message=trim(r.airline || ' ' || r.flight_number)
      );
      get diagnostics v_rows=row_count; v_count:=v_count+v_rows;
    end if;

    if r.boarding_datetime is not null then
      insert into public.trip_reminders(
        trip_id,user_id,title,message,remind_at,target_url,reminder_type,created_by
      )
      select p_trip_id,r.user_id,'Flight boarding soon',
        trim(r.airline || ' ' || r.flight_number),
        r.boarding_datetime - interval '30 minutes',
        '/trips/'||p_trip_id::text||'/bookings','flight_boarding',auth.uid()
      where not exists(
        select 1 from public.trip_reminders x
        where x.trip_id=p_trip_id and x.user_id=r.user_id
          and x.reminder_type='flight_boarding'
          and x.message=trim(r.airline || ' ' || r.flight_number)
      );
      get diagnostics v_rows=row_count; v_count:=v_count+v_rows;
    end if;

    insert into public.trip_reminders(
      trip_id,user_id,title,message,remind_at,target_url,reminder_type,created_by
    )
    select p_trip_id,r.user_id,'Flight departs tomorrow',
      trim(r.airline || ' ' || r.flight_number),
      r.departure_datetime - interval '24 hours',
      '/trips/'||p_trip_id::text||'/bookings','flight_24h',auth.uid()
    where not exists(
      select 1 from public.trip_reminders x
      where x.trip_id=p_trip_id and x.user_id=r.user_id
        and x.reminder_type='flight_24h'
        and x.message=trim(r.airline || ' ' || r.flight_number)
    );
    get diagnostics v_rows=row_count; v_count:=v_count+v_rows;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.create_flight_reminders(uuid) to authenticated;


drop policy if exists stage8_owner_profiles_select on public.profiles;
create policy stage8_owner_profiles_select on public.profiles
for select to authenticated
using (id=auth.uid() or public.stage8_is_owner());

drop policy if exists stage8_owner_roles_select on public.user_roles;
create policy stage8_owner_roles_select on public.user_roles
for select to authenticated
using (user_id=auth.uid() or public.stage8_is_owner());
commit;
