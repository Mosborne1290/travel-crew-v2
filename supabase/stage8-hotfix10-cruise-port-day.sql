-- ============================================================
-- TRAVEL CREW V2 - STAGE 8 HOTFIX 10
-- CRUISE PORT DAY PLANNER
-- Safe additive migration. No existing tables are dropped.
-- ============================================================

begin;

create table if not exists public.cruise_port_days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  port_name text not null,
  region text,
  country text,
  port_date date not null,
  timezone text not null default 'Australia/Sydney',
  cruise_ship text,
  cruise_line text,
  wharf_name text,
  wharf_address text,
  wharf_lat numeric,
  wharf_lng numeric,
  ship_arrival_time time,
  disembark_time time,
  required_return_time time,
  recommended_return_time time,
  ship_departure_time time,
  tender_port boolean not null default false,
  transport_notes text,
  notes text,
  hero_image_url text,
  warning_green_minutes integer not null default 90,
  warning_amber_minutes integer not null default 90,
  warning_orange_minutes integer not null default 60,
  warning_red_minutes integer not null default 30,
  warning_critical_minutes integer not null default 15,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cruise_port_shopping_items (
  id uuid primary key default gen_random_uuid(),
  cruise_port_day_id uuid not null references public.cruise_port_days(id) on delete cascade,
  trip_id uuid not null references public.trips(id) on delete cascade,
  activity_id uuid references public.activities(id) on delete set null,
  item_name text not null,
  suggested_location text,
  category text,
  budget numeric,
  actual_cost numeric,
  currency text not null default 'AUD',
  purchased boolean not null default false,
  purchased_by uuid references auth.users(id) on delete set null,
  notes text,
  photo_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.cruise_port_day_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null unique,
  title text not null,
  port_name text not null,
  region text,
  country text,
  timezone text not null,
  default_data jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.activities
  add column if not exists timezone text,
  add column if not exists time_storage_version integer not null default 1,
  add column if not exists cruise_port_day_id uuid references public.cruise_port_days(id) on delete cascade,
  add column if not exists cruise_local_start_time time,
  add column if not exists cruise_local_end_time time,
  add column if not exists priority text,
  add column if not exists website text,
  add column if not exists phone text,
  add column if not exists booking_reference text,
  add column if not exists estimated_cost numeric,
  add column if not exists transport_method text,
  add column if not exists estimated_travel_minutes integer,
  add column if not exists needs_confirmation boolean not null default false,
  add column if not exists confirmation_date timestamptz,
  add column if not exists confirmation_source text,
  add column if not exists weather_dependent boolean not null default false,
  add column if not exists bad_weather_alternative text,
  add column if not exists is_indoor boolean,
  add column if not exists visited boolean not null default false,
  add column if not exists market_open_time time,
  add column if not exists market_close_time time,
  add column if not exists market_website text,
  add column if not exists market_notes text;

alter table public.photos
  add column if not exists cruise_port_day_id uuid references public.cruise_port_days(id) on delete set null,
  add column if not exists activity_id uuid references public.activities(id) on delete set null;

alter table public.expenses
  add column if not exists cruise_port_day_id uuid references public.cruise_port_days(id) on delete set null,
  add column if not exists activity_id uuid references public.activities(id) on delete set null;

create index if not exists cruise_port_days_trip_idx on public.cruise_port_days(trip_id);
create index if not exists cruise_port_days_date_idx on public.cruise_port_days(port_date);
create index if not exists cruise_port_days_created_by_idx on public.cruise_port_days(created_by);
create index if not exists cruise_port_shopping_day_idx on public.cruise_port_shopping_items(cruise_port_day_id);
create index if not exists cruise_port_shopping_trip_idx on public.cruise_port_shopping_items(trip_id);
create index if not exists activities_cruise_day_sort_idx on public.activities(cruise_port_day_id, sort_order, cruise_local_start_time);

create or replace function public.can_manage_cruise_day(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.stage8_is_owner()
    or exists (
      select 1 from public.user_roles ur
      where ur.user_id=auth.uid() and ur.role='admin'
    )
    or exists (
      select 1 from public.trip_members tm
      where tm.trip_id=p_trip_id
        and tm.user_id=auth.uid()
        and tm.role='organiser'
    );
$$;

grant execute on function public.can_manage_cruise_day(uuid) to authenticated;

alter table public.cruise_port_days enable row level security;
alter table public.cruise_port_shopping_items enable row level security;
alter table public.cruise_port_day_templates enable row level security;

drop policy if exists cruise_port_days_select on public.cruise_port_days;
create policy cruise_port_days_select on public.cruise_port_days
for select to authenticated
using (app_private.is_trip_member(trip_id));

drop policy if exists cruise_port_days_insert on public.cruise_port_days;
create policy cruise_port_days_insert on public.cruise_port_days
for insert to authenticated
with check (
  created_by=auth.uid()
  and public.can_manage_cruise_day(trip_id)
);

drop policy if exists cruise_port_days_update on public.cruise_port_days;
create policy cruise_port_days_update on public.cruise_port_days
for update to authenticated
using (public.can_manage_cruise_day(trip_id))
with check (public.can_manage_cruise_day(trip_id));

drop policy if exists cruise_port_days_delete on public.cruise_port_days;
create policy cruise_port_days_delete on public.cruise_port_days
for delete to authenticated
using (public.can_manage_cruise_day(trip_id));

drop policy if exists cruise_port_shopping_select on public.cruise_port_shopping_items;
create policy cruise_port_shopping_select on public.cruise_port_shopping_items
for select to authenticated
using (app_private.is_trip_member(trip_id));

drop policy if exists cruise_port_shopping_insert on public.cruise_port_shopping_items;
create policy cruise_port_shopping_insert on public.cruise_port_shopping_items
for insert to authenticated
with check (app_private.is_trip_member(trip_id));

drop policy if exists cruise_port_shopping_update on public.cruise_port_shopping_items;
create policy cruise_port_shopping_update on public.cruise_port_shopping_items
for update to authenticated
using (app_private.is_trip_member(trip_id))
with check (app_private.is_trip_member(trip_id));

drop policy if exists cruise_port_shopping_delete on public.cruise_port_shopping_items;
create policy cruise_port_shopping_delete on public.cruise_port_shopping_items
for delete to authenticated
using (public.can_manage_cruise_day(trip_id));

drop policy if exists cruise_port_templates_owner on public.cruise_port_day_templates;
create policy cruise_port_templates_owner on public.cruise_port_day_templates
for select to authenticated
using (public.stage8_is_owner() or exists (
  select 1 from public.user_roles ur
  where ur.user_id=auth.uid() and ur.role='admin'
));

create or replace function public.cruise_member_mark_visited(
  p_activity_id uuid,
  p_visited boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip_id uuid;
begin
  select trip_id into v_trip_id from public.activities where id=p_activity_id;
  if v_trip_id is null or not app_private.is_trip_member(v_trip_id) then
    raise exception 'Trip access required.';
  end if;

  perform set_config('travelcrew.cruise_member_action','visited',true);

  update public.activities
  set visited=p_visited
  where id=p_activity_id;

  return true;
end;
$$;

grant execute on function public.cruise_member_mark_visited(uuid,boolean) to authenticated;

create or replace function public.create_cruise_return_reminders(p_cruise_day_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.cruise_port_days%rowtype;
  tm record;
  v_return_at timestamptz;
  v_count integer := 0;
  v_rows integer := 0;
  mins integer;
  title_text text;
begin
  select * into d from public.cruise_port_days where id=p_cruise_day_id;

  if d.id is null then
    raise exception 'Cruise port day not found.';
  end if;

  if not public.can_manage_cruise_day(d.trip_id) then
    raise exception 'Owner/Admin/Organiser access required.';
  end if;

  if d.required_return_time is null then
    return 0;
  end if;

  v_return_at := (d.port_date + d.required_return_time) at time zone d.timezone;

  for tm in
    select user_id from public.trip_members where trip_id=d.trip_id
  loop
    foreach mins in array array[90,60,30,15]
    loop
      title_text := case mins
        when 90 then 'Return-to-ship reminder'
        when 60 then 'Return-to-ship warning'
        when 30 then 'Urgent return-to-ship warning'
        else 'CRITICAL return-to-ship warning'
      end;

      insert into public.trip_reminders(
        trip_id,user_id,title,message,remind_at,target_url,
        reminder_type,created_by
      )
      select
        d.trip_id,
        tm.user_id,
        title_text,
        d.port_name || ': return to ship by ' || to_char(d.required_return_time,'HH12:MI AM'),
        v_return_at - make_interval(mins=>mins),
        '/trips/'||d.trip_id::text||'/cruise-days/'||d.id::text,
        'cruise_return',
        auth.uid()
      where not exists(
        select 1 from public.trip_reminders r
        where r.trip_id=d.trip_id
          and r.user_id=tm.user_id
          and r.reminder_type='cruise_return'
          and r.remind_at=v_return_at - make_interval(mins=>mins)
      );

      get diagnostics v_rows=row_count;
      v_count:=v_count+v_rows;
    end loop;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.create_cruise_return_reminders(uuid) to authenticated;

do $$
declare t text;
begin
  foreach t in array array['cruise_port_days','cruise_port_shopping_items','activities']
  loop
    if not exists(
      select 1 from pg_publication_tables
      where pubname='supabase_realtime'
        and schemaname='public'
        and tablename=t
    ) then
      execute format('alter publication supabase_realtime add table public.%I',t);
    end if;
  end loop;
end $$;



create or replace function public.create_cruise_day_reminders(p_cruise_day_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.cruise_port_days%rowtype;
  tm record;
  a record;
  v_count integer := 0;
  v_rows integer := 0;
  v_at timestamptz;
begin
  select * into d from public.cruise_port_days where id=p_cruise_day_id;
  if d.id is null then raise exception 'Cruise port day not found.'; end if;
  if not public.can_manage_cruise_day(d.trip_id) then raise exception 'Owner/Admin/Organiser access required.'; end if;

  for tm in select user_id from public.trip_members where trip_id=d.trip_id
  loop
    -- Weather check one day before, 9:00 AM destination local time.
    v_at := ((d.port_date - 1) + time '09:00') at time zone d.timezone;
    insert into public.trip_reminders(trip_id,user_id,title,message,remind_at,target_url,reminder_type,created_by)
    select d.trip_id,tm.user_id,'Check cruise-day weather',
      'Check the weather for '||d.port_name||' and review weather-dependent activities.',
      v_at,'/trips/'||d.trip_id::text||'/cruise-days/'||d.id::text,'cruise_weather',auth.uid()
    where not exists(select 1 from public.trip_reminders r where r.user_id=tm.user_id and r.reminder_type='cruise_weather' and r.trip_id=d.trip_id and r.remind_at=v_at);
    get diagnostics v_rows=row_count;v_count:=v_count+v_rows;

    for a in
      select id,title,cruise_local_start_time,needs_confirmation
      from public.activities
      where cruise_port_day_id=d.id
    loop
      if a.needs_confirmation then
        v_at := ((d.port_date - 7) + time '09:00') at time zone d.timezone;
        insert into public.trip_reminders(trip_id,user_id,title,message,remind_at,target_url,reminder_type,created_by)
        select d.trip_id,tm.user_id,'Confirm before cruise day',
          a.title||' needs confirmation before '||d.port_name||'.',
          v_at,'/trips/'||d.trip_id::text||'/cruise-days/'||d.id::text,'cruise_confirm',auth.uid()
        where not exists(select 1 from public.trip_reminders r where r.user_id=tm.user_id and r.reminder_type='cruise_confirm' and r.trip_id=d.trip_id and r.message like a.title||'%');
        get diagnostics v_rows=row_count;v_count:=v_count+v_rows;
      end if;

      if a.cruise_local_start_time is not null then
        v_at := (d.port_date + a.cruise_local_start_time) at time zone d.timezone;
        insert into public.trip_reminders(trip_id,user_id,title,message,remind_at,target_url,reminder_type,created_by)
        select d.trip_id,tm.user_id,'Activity starting soon',
          a.title||' starts in about 15 minutes.',
          v_at - interval '15 minutes','/trips/'||d.trip_id::text||'/cruise-days/'||d.id::text,'cruise_activity',auth.uid()
        where not exists(select 1 from public.trip_reminders r where r.user_id=tm.user_id and r.reminder_type='cruise_activity' and r.trip_id=d.trip_id and r.remind_at=v_at - interval '15 minutes');
        get diagnostics v_rows=row_count;v_count:=v_count+v_rows;
      end if;
    end loop;
  end loop;

  v_count:=v_count+public.create_cruise_return_reminders(p_cruise_day_id);
  return v_count;
end;
$$;

grant execute on function public.create_cruise_day_reminders(uuid) to authenticated;

create or replace function public.cruise_member_append_note(
  p_activity_id uuid,
  p_note text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip_id uuid;
begin
  select trip_id into v_trip_id from public.activities where id=p_activity_id;
  if v_trip_id is null or not app_private.is_trip_member(v_trip_id) then
    raise exception 'Trip access required.';
  end if;

  if trim(coalesce(p_note,''))='' then return true; end if;

  perform set_config('travelcrew.cruise_member_action','note',true);

  update public.activities
  set notes=concat_ws(E'\n',nullif(notes,''),'['||to_char(now(),'DD Mon HH24:MI')||'] '||trim(p_note))
  where id=p_activity_id;

  return true;
end;
$$;

grant execute on function public.cruise_member_append_note(uuid,text) to authenticated;

drop policy if exists cruise_activity_manager_insert on public.activities;
create policy cruise_activity_manager_insert on public.activities
for insert to authenticated
with check (
  cruise_port_day_id is not null
  and public.can_manage_cruise_day(trip_id)
);

drop policy if exists cruise_activity_manager_update on public.activities;
create policy cruise_activity_manager_update on public.activities
for update to authenticated
using (
  cruise_port_day_id is not null
  and public.can_manage_cruise_day(trip_id)
)
with check (
  cruise_port_day_id is not null
  and public.can_manage_cruise_day(trip_id)
);

drop policy if exists cruise_activity_manager_delete on public.activities;
create policy cruise_activity_manager_delete on public.activities
for delete to authenticated
using (
  cruise_port_day_id is not null
  and public.can_manage_cruise_day(trip_id)
);


create or replace function public.guard_cruise_activity_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip_id uuid;
  v_action text;
begin
  if tg_op='DELETE' then
    v_trip_id:=old.trip_id;

    if old.cruise_port_day_id is null then
      return old;
    end if;

    if public.can_manage_cruise_day(v_trip_id) then
      return old;
    end if;

    raise exception 'Owner/Admin/Organiser permission is required to delete Cruise Port Day activities.';
  end if;

  v_trip_id:=new.trip_id;

  if new.cruise_port_day_id is null then
    return new;
  end if;

  if public.can_manage_cruise_day(v_trip_id) then
    return new;
  end if;

  v_action:=current_setting('travelcrew.cruise_member_action',true);

  if tg_op='UPDATE' and v_action in ('visited','note') then
    return new;
  end if;

  raise exception 'Owner/Admin/Organiser permission is required to change Cruise Port Day activities.';
end;
$$;

drop trigger if exists guard_cruise_activity_changes on public.activities;
create trigger guard_cruise_activity_changes
before update or delete on public.activities
for each row execute function public.guard_cruise_activity_changes();

create or replace function public.attach_cruise_port_template(
  p_template_key text,
  p_trip_id uuid,
  p_cruise_ship text default null,
  p_cruise_line text default null,
  p_wharf_name text default null,
  p_wharf_address text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  tpl public.cruise_port_day_templates%rowtype;
  d jsonb;
  v_day_id uuid;
  a jsonb;
  item text;
  v_sort integer := 0;
begin
  if not public.can_manage_cruise_day(p_trip_id) then
    raise exception 'Owner/Admin/Organiser access required.';
  end if;

  select * into tpl
  from public.cruise_port_day_templates
  where template_key=p_template_key;

  if tpl.id is null then
    raise exception 'Template not found.';
  end if;

  d:=tpl.default_data;

  if exists(
    select 1 from public.cruise_port_days
    where trip_id=p_trip_id
      and port_name=tpl.port_name
      and port_date=(d->>'port_date')::date
  ) then
    raise exception 'This cruise port day already exists on the selected trip.';
  end if;

  insert into public.cruise_port_days(
    trip_id,created_by,port_name,region,country,port_date,timezone,
    cruise_ship,cruise_line,wharf_name,wharf_address,
    disembark_time,required_return_time,recommended_return_time,notes
  )
  values(
    p_trip_id,auth.uid(),tpl.port_name,tpl.region,tpl.country,
    (d->>'port_date')::date,tpl.timezone,
    nullif(trim(coalesce(p_cruise_ship,'')),''),
    nullif(trim(coalesce(p_cruise_line,'')),''),
    nullif(trim(coalesce(p_wharf_name,'')),''),
    nullif(trim(coalesce(p_wharf_address,'')),''),
    (d->>'disembark_time')::time,
    (d->>'required_return_time')::time,
    (d->>'recommended_return_time')::time,
    'Created from Travel Crew cruise port day template.'
  )
  returning id into v_day_id;

  for a in select * from jsonb_array_elements(d->'activities')
  loop
    v_sort:=v_sort+1;
    insert into public.activities(
      trip_id,cruise_port_day_id,created_by,title,activity_type,
      cruise_local_start_time,cruise_local_end_time,priority,address,
      notes,estimated_cost,currency,needs_confirmation,weather_dependent,
      bad_weather_alternative,visited,sort_order,status,timezone,time_storage_version
    )
    values(
      p_trip_id,v_day_id,auth.uid(),
      a->>'title',coalesce(a->>'category','Other'),
      nullif(a->>'start','')::time,nullif(a->>'end','')::time,
      coalesce(a->>'priority','Recommended'),
      nullif(a->>'address',''),
      nullif(a->>'notes',''),
      nullif(a->>'estimated_cost','')::numeric,
      'AUD',
      coalesce((a->>'needs_confirmation')::boolean,false),
      coalesce((a->>'weather_dependent')::boolean,false),
      nullif(a->>'bad_weather_alternative',''),
      false,v_sort,'planned',tpl.timezone,2
    );
  end loop;

  for item in select jsonb_array_elements_text(d->'shopping')
  loop
    insert into public.cruise_port_shopping_items(
      cruise_port_day_id,trip_id,item_name,currency
    )
    values(v_day_id,p_trip_id,item,'AUD');
  end loop;

  return v_day_id;
end;
$$;

grant execute on function public.attach_cruise_port_template(text,uuid,text,text,text,text) to authenticated;

commit;
