-- ============================================================
-- TRAVEL CREW V2 - STAGE 6 MIGRATION
-- Run ONCE in Supabase -> SQL Editor.
-- Adds daily companion, checklists, packing, reminders,
-- polls, journal, richer chat metadata and photo timeline fields.
-- ============================================================

begin;

create table if not exists public.checklists (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  title text not null,
  category text not null default 'custom',
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.checklists(id) on delete cascade,
  trip_id uuid not null references public.trips(id) on delete cascade,
  title text not null,
  assigned_to uuid references auth.users(id) on delete set null,
  due_date date,
  completed boolean not null default false,
  completed_at timestamptz,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.packing_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  traveller_user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  category text not null default 'Other',
  quantity integer not null default 1 check (quantity > 0),
  packed boolean not null default false,
  shared boolean not null default false,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.trip_reminders (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text,
  remind_at timestamptz not null,
  target_url text,
  reminder_type text not null default 'custom',
  completed boolean not null default false,
  notified_at timestamptz,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  question text not null,
  poll_type text not null default 'choice',
  status text not null default 'open',
  closes_at timestamptz,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  label text not null,
  sort_order integer not null default 0
);

create table if not exists public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  option_id uuid not null references public.poll_options(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (poll_id, user_id)
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  itinerary_day_id uuid references public.itinerary_days(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  title text,
  notes text,
  highlight text,
  favourite_moment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trip_id, user_id, entry_date)
);

create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);

alter table public.messages
  add column if not exists reply_to_message_id uuid references public.messages(id) on delete set null,
  add column if not exists pinned_at timestamptz,
  add column if not exists pinned_by uuid references auth.users(id) on delete set null;

alter table public.photos
  add column if not exists itinerary_day_id uuid references public.itinerary_days(id) on delete set null,
  add column if not exists is_favourite boolean not null default false;

alter table public.documents
  add column if not exists traveller_user_id uuid references auth.users(id) on delete set null,
  add column if not exists needed_date date;

-- RLS
alter table public.checklists enable row level security;
alter table public.checklist_items enable row level security;
alter table public.packing_items enable row level security;
alter table public.trip_reminders enable row level security;
alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;
alter table public.journal_entries enable row level security;
alter table public.message_reactions enable row level security;

drop policy if exists stage6_checklists_all on public.checklists;
create policy stage6_checklists_all on public.checklists
for all to authenticated
using (app_private.is_trip_member(trip_id))
with check (app_private.is_trip_member(trip_id));

drop policy if exists stage6_checklist_items_all on public.checklist_items;
create policy stage6_checklist_items_all on public.checklist_items
for all to authenticated
using (app_private.is_trip_member(trip_id))
with check (app_private.is_trip_member(trip_id));

drop policy if exists stage6_packing_all on public.packing_items;
create policy stage6_packing_all on public.packing_items
for all to authenticated
using (app_private.is_trip_member(trip_id))
with check (app_private.is_trip_member(trip_id));

drop policy if exists stage6_reminders_all on public.trip_reminders;
create policy stage6_reminders_all on public.trip_reminders
for all to authenticated
using (app_private.is_trip_member(trip_id))
with check (app_private.is_trip_member(trip_id));

drop policy if exists stage6_polls_all on public.polls;
create policy stage6_polls_all on public.polls
for all to authenticated
using (app_private.is_trip_member(trip_id))
with check (app_private.is_trip_member(trip_id));

drop policy if exists stage6_poll_options_select on public.poll_options;
create policy stage6_poll_options_select on public.poll_options
for select to authenticated
using (
  exists (
    select 1 from public.polls p
    where p.id = poll_id
      and app_private.is_trip_member(p.trip_id)
  )
);

drop policy if exists stage6_poll_options_write on public.poll_options;
create policy stage6_poll_options_write on public.poll_options
for all to authenticated
using (
  exists (
    select 1 from public.polls p
    where p.id = poll_id
      and app_private.is_trip_member(p.trip_id)
  )
)
with check (
  exists (
    select 1 from public.polls p
    where p.id = poll_id
      and app_private.is_trip_member(p.trip_id)
  )
);

drop policy if exists stage6_votes_all on public.poll_votes;
create policy stage6_votes_all on public.poll_votes
for all to authenticated
using (
  exists (
    select 1 from public.polls p
    where p.id = poll_id
      and app_private.is_trip_member(p.trip_id)
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.polls p
    where p.id = poll_id
      and app_private.is_trip_member(p.trip_id)
  )
);

drop policy if exists stage6_journal_all on public.journal_entries;
create policy stage6_journal_all on public.journal_entries
for all to authenticated
using (app_private.is_trip_member(trip_id))
with check (app_private.is_trip_member(trip_id));

drop policy if exists stage6_reactions_all on public.message_reactions;
create policy stage6_reactions_all on public.message_reactions
for all to authenticated
using (
  exists (
    select 1
    from public.messages m
    join public.chat_rooms cr on cr.id = m.room_id
    where m.id = message_id
      and app_private.is_trip_member(cr.trip_id)
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.messages m
    join public.chat_rooms cr on cr.id = m.room_id
    where m.id = message_id
      and app_private.is_trip_member(cr.trip_id)
  )
);

-- Realtime polls / votes / reminders / checklist updates
do $$
declare
  t text;
begin
  foreach t in array array[
    'checklist_items','packing_items','trip_reminders',
    'polls','poll_options','poll_votes','journal_entries','message_reactions'
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

-- Sync trip lifecycle on demand.
create or replace function public.sync_trip_status(p_trip_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_start date;
  v_end date;
begin
  if not app_private.is_trip_member(p_trip_id) then
    raise exception 'You are not a member of this trip.';
  end if;

  select start_date, end_date, status
  into v_start, v_end, v_status
  from public.trips
  where id = p_trip_id;

  if v_start is not null and v_end is not null then
    if current_date > v_end then
      v_status := 'completed';
    elsif current_date >= v_start and current_date <= v_end then
      v_status := 'travelling';
    elsif current_date < v_start and v_status not in ('archived','cancelled') then
      v_status := case when current_date >= v_start - 14 then 'ready' else 'planning' end;
    end if;

    update public.trips set status = v_status where id = p_trip_id;
  end if;

  return v_status;
end;
$$;

grant execute on function public.sync_trip_status(uuid) to authenticated;


create table if not exists public.trip_important_info (
  trip_id uuid primary key references public.trips(id) on delete cascade,
  emergency_contact_name text,
  emergency_contact_phone text,
  insurer_name text,
  insurance_policy_number text,
  insurer_phone text,
  embassy_notes text,
  airline_contacts text,
  cruise_contacts text,
  hotel_contacts text,
  local_emergency_number text,
  private_notes text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.trip_important_info enable row level security;
drop policy if exists stage6_important_info_all on public.trip_important_info;
create policy stage6_important_info_all on public.trip_important_info
for all to authenticated
using (app_private.is_trip_member(trip_id))
with check (app_private.is_trip_member(trip_id));

commit;
