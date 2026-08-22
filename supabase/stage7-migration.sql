-- ============================================================
-- TRAVEL CREW V2 - STAGE 7 MIGRATION
-- Run ONCE in Supabase -> SQL Editor.
-- Adds web push subscriptions, activity feed, offline mutations,
-- automatic reminder rules, expense settlements and audit logging.
-- ============================================================

begin;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth_key text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create table if not exists public.trip_activity_feed (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  title text not null,
  detail text,
  target_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.offline_mutations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_mutation_id text not null,
  mutation_type text not null,
  payload jsonb not null,
  applied_at timestamptz,
  error_text text,
  created_at timestamptz not null default now(),
  unique (user_id, client_mutation_id)
);

create table if not exists public.auto_reminder_rules (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  rule_type text not null,
  lead_minutes integer not null default 60,
  enabled boolean not null default true,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (trip_id, rule_type)
);

create table if not exists public.expense_settlements (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  from_user_id uuid not null references auth.users(id) on delete cascade,
  to_user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'AUD',
  note text,
  settled_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  trip_id uuid references public.trips(id) on delete cascade,
  action text not null,
  entity_type text,
  entity_id uuid,
  detail jsonb,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;
alter table public.trip_activity_feed enable row level security;
alter table public.offline_mutations enable row level security;
alter table public.auto_reminder_rules enable row level security;
alter table public.expense_settlements enable row level security;
alter table public.audit_log enable row level security;

drop policy if exists stage7_push_subscriptions on public.push_subscriptions;
create policy stage7_push_subscriptions on public.push_subscriptions
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists stage7_feed_select on public.trip_activity_feed;
create policy stage7_feed_select on public.trip_activity_feed
for select to authenticated
using (app_private.is_trip_member(trip_id));

drop policy if exists stage7_feed_insert on public.trip_activity_feed;
create policy stage7_feed_insert on public.trip_activity_feed
for insert to authenticated
with check (app_private.is_trip_member(trip_id));

drop policy if exists stage7_offline_mutations on public.offline_mutations;
create policy stage7_offline_mutations on public.offline_mutations
for all to authenticated
using (user_id = auth.uid() and app_private.is_trip_member(trip_id))
with check (user_id = auth.uid() and app_private.is_trip_member(trip_id));

drop policy if exists stage7_auto_rules on public.auto_reminder_rules;
create policy stage7_auto_rules on public.auto_reminder_rules
for all to authenticated
using (app_private.is_trip_member(trip_id))
with check (app_private.is_trip_member(trip_id));

drop policy if exists stage7_settlements on public.expense_settlements;
create policy stage7_settlements on public.expense_settlements
for all to authenticated
using (app_private.is_trip_member(trip_id))
with check (app_private.is_trip_member(trip_id));

drop policy if exists stage7_audit_select on public.audit_log;
create policy stage7_audit_select on public.audit_log
for select to authenticated
using (trip_id is null or app_private.is_trip_member(trip_id));

drop policy if exists stage7_audit_insert on public.audit_log;
create policy stage7_audit_insert on public.audit_log
for insert to authenticated
with check (user_id = auth.uid());

do $$
declare
  t text;
begin
  foreach t in array array[
    'trip_activity_feed','offline_mutations','expense_settlements'
  ]
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname='supabase_realtime'
        and schemaname='public'
        and tablename=t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

create or replace function public.log_trip_event(
  p_trip_id uuid,
  p_event_type text,
  p_title text,
  p_detail text default null,
  p_target_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not app_private.is_trip_member(p_trip_id) then
    raise exception 'Not a member of this trip.';
  end if;

  insert into public.trip_activity_feed (
    trip_id, user_id, event_type, title, detail, target_url
  )
  values (
    p_trip_id, auth.uid(), p_event_type, p_title, p_detail, p_target_url
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.log_trip_event(uuid,text,text,text,text) to authenticated;

create or replace function public.create_automatic_trip_reminders(p_trip_id uuid)
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

  -- Activities
  for r in
    select a.id, a.title, a.start_datetime, tm.user_id
    from public.activities a
    join public.trip_members tm on tm.trip_id = a.trip_id
    where a.trip_id = p_trip_id
      and a.start_datetime is not null
      and a.start_datetime > now()
      and a.start_datetime < now() + interval '14 days'
  loop
    insert into public.trip_reminders (
      trip_id,user_id,title,message,remind_at,target_url,reminder_type,created_by
    )
    select
      p_trip_id,
      r.user_id,
      'Upcoming activity',
      r.title,
      r.start_datetime - interval '60 minutes',
      '/trips/' || p_trip_id::text || '/today',
      'activity',
      auth.uid()
    where not exists (
      select 1 from public.trip_reminders x
      where x.trip_id=p_trip_id
        and x.user_id=r.user_id
        and x.reminder_type='activity'
        and x.title='Upcoming activity'
        and x.message=r.title
        and x.remind_at = r.start_datetime - interval '60 minutes'
    );
    get diagnostics v_rows = row_count;
    v_count := v_count + v_rows;
  end loop;

  -- Bookings
  for r in
    select b.id, b.booking_type, b.provider, b.start_datetime, tm.user_id
    from public.bookings b
    join public.trip_members tm on tm.trip_id = b.trip_id
    where b.trip_id = p_trip_id
      and b.start_datetime is not null
      and b.start_datetime > now()
      and b.start_datetime < now() + interval '30 days'
  loop
    insert into public.trip_reminders (
      trip_id,user_id,title,message,remind_at,target_url,reminder_type,created_by
    )
    select
      p_trip_id,
      r.user_id,
      'Upcoming ' || initcap(r.booking_type),
      coalesce(r.provider, r.booking_type),
      r.start_datetime - interval '24 hours',
      '/trips/' || p_trip_id::text || '/bookings',
      'booking',
      auth.uid()
    where not exists (
      select 1 from public.trip_reminders x
      where x.trip_id=p_trip_id
        and x.user_id=r.user_id
        and x.reminder_type='booking'
        and x.message=coalesce(r.provider, r.booking_type)
        and x.remind_at = r.start_datetime - interval '24 hours'
    );
    get diagnostics v_rows = row_count;
    v_count := v_count + v_rows;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.create_automatic_trip_reminders(uuid) to authenticated;


create or replace function public.stage7_feed_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip_id uuid;
  v_title text;
  v_type text;
  v_detail text;
  v_target text;
begin
  v_trip_id := coalesce(
    case when tg_table_name in ('activities','bookings','saved_places','photos','expenses','checklist_items','polls') then new.trip_id else null end,
    null
  );

  if v_trip_id is null then
    return new;
  end if;

  if tg_table_name='activities' then
    v_type:='activity'; v_title:='Itinerary updated'; v_detail:=new.title; v_target:='/trips/'||v_trip_id||'/plan';
  elsif tg_table_name='bookings' then
    v_type:='booking'; v_title:='Booking added'; v_detail:=coalesce(new.provider,new.booking_type); v_target:='/trips/'||v_trip_id||'/bookings';
  elsif tg_table_name='saved_places' then
    v_type:='place'; v_title:='Place saved'; v_detail:=new.name; v_target:='/trips/'||v_trip_id||'/places';
  elsif tg_table_name='photos' then
    v_type:='photo'; v_title:='Photo added'; v_detail:=coalesce(new.caption,'Trip photo'); v_target:='/trips/'||v_trip_id||'/photos';
  elsif tg_table_name='expenses' then
    v_type:='expense'; v_title:='Expense added'; v_detail:=new.description; v_target:='/trips/'||v_trip_id||'/budget';
  elsif tg_table_name='checklist_items' then
    v_type:='checklist';
    if tg_op='UPDATE' and new.completed and not old.completed then v_title:='Task completed'; else v_title:='Checklist updated'; end if;
    v_detail:=new.title; v_target:='/trips/'||v_trip_id||'/checklists';
  elsif tg_table_name='polls' then
    v_type:='poll'; v_title:='Poll created'; v_detail:=new.question; v_target:='/trips/'||v_trip_id||'/polls';
  else
    return new;
  end if;

  insert into public.trip_activity_feed(trip_id,user_id,event_type,title,detail,target_url)
  values(v_trip_id,auth.uid(),v_type,v_title,v_detail,v_target);

  return new;
end;
$$;

drop trigger if exists stage7_feed_activities on public.activities;
create trigger stage7_feed_activities after insert on public.activities for each row execute function public.stage7_feed_trigger();
drop trigger if exists stage7_feed_bookings on public.bookings;
create trigger stage7_feed_bookings after insert on public.bookings for each row execute function public.stage7_feed_trigger();
drop trigger if exists stage7_feed_places on public.saved_places;
create trigger stage7_feed_places after insert on public.saved_places for each row execute function public.stage7_feed_trigger();
drop trigger if exists stage7_feed_photos on public.photos;
create trigger stage7_feed_photos after insert on public.photos for each row execute function public.stage7_feed_trigger();
drop trigger if exists stage7_feed_expenses on public.expenses;
create trigger stage7_feed_expenses after insert on public.expenses for each row execute function public.stage7_feed_trigger();
drop trigger if exists stage7_feed_checklists on public.checklist_items;
create trigger stage7_feed_checklists after insert or update on public.checklist_items for each row execute function public.stage7_feed_trigger();
drop trigger if exists stage7_feed_polls on public.polls;
create trigger stage7_feed_polls after insert on public.polls for each row execute function public.stage7_feed_trigger();

commit;
