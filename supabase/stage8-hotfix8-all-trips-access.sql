-- ============================================================
-- TRAVEL CREW V2 - STAGE 8 HOTFIX 8
-- ALL TRIPS ACCESS / REGULAR TRAVEL COMPANIONS
-- Safe additive migration.
-- Run in Supabase -> SQL Editor before deploying the code.
-- ============================================================

begin;

create table if not exists public.all_trip_travellers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  preferred_name text not null,
  trip_role text not null default 'member'
    check (trip_role in ('organiser','member','guest')),
  include_future_trips boolean not null default true,
  invite_token uuid not null default gen_random_uuid() unique,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists all_trip_travellers_email_unique
  on public.all_trip_travellers (lower(email));

alter table public.all_trip_travellers enable row level security;

drop policy if exists all_trip_travellers_owner_select on public.all_trip_travellers;
create policy all_trip_travellers_owner_select
on public.all_trip_travellers
for select to authenticated
using (public.stage8_is_owner() or user_id=auth.uid());

-- Public-safe invite lookup. Only returns the data needed by the invitation page.
create or replace function public.get_all_trips_invite(p_token uuid)
returns table (
  invite_id uuid,
  email text,
  preferred_name text,
  trip_role text,
  include_future_trips boolean,
  expires_at timestamptz,
  accepted_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    a.id,
    a.email,
    a.preferred_name,
    a.trip_role,
    a.include_future_trips,
    a.expires_at,
    a.accepted_at
  from public.all_trip_travellers a
  where a.invite_token=p_token
    and (a.accepted_at is not null or a.expires_at > now())
  limit 1;
$$;

grant execute on function public.get_all_trips_invite(uuid) to anon, authenticated;

-- Owner creates one all-trips access record.
-- Existing registered users are attached immediately.
-- New users receive one token/link.
create or replace function public.owner_create_all_trips_access(
  p_email text,
  p_preferred_name text,
  p_trip_role text default 'member',
  p_include_future boolean default true,
  p_valid_days integer default 7
)
returns table (
  access_id uuid,
  status text,
  invite_token uuid,
  user_id uuid,
  trips_added integer,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_name text;
  v_days integer;
  v_user_id uuid;
  v_access_id uuid;
  v_token uuid;
  v_expiry timestamptz;
  v_count integer := 0;
begin
  if not public.stage8_is_owner() then
    raise exception 'Owner access required.';
  end if;

  v_email := lower(trim(coalesce(p_email,'')));
  v_name := trim(coalesce(p_preferred_name,''));
  v_days := greatest(1,least(coalesce(p_valid_days,7),30));

  if v_email='' or position('@' in v_email)=0 then
    raise exception 'Enter a valid email address.';
  end if;

  if v_name='' then
    raise exception 'Enter the traveller preferred name.';
  end if;

  if p_trip_role not in ('organiser','member','guest') then
    raise exception 'Invalid trip role.';
  end if;

  select p.id into v_user_id
  from public.profiles p
  where lower(coalesce(p.email,''))=v_email
  limit 1;

  if v_user_id is null then
    select u.id into v_user_id
    from auth.users u
    where lower(coalesce(u.email,''))=v_email
    limit 1;
  end if;

  -- Keep one current all-trips record per email.
  insert into public.all_trip_travellers(
    user_id,email,preferred_name,trip_role,include_future_trips,
    invite_token,expires_at,accepted_at,created_by
  )
  values(
    v_user_id,v_email,v_name,p_trip_role,coalesce(p_include_future,true),
    gen_random_uuid(),now()+make_interval(days=>v_days),
    case when v_user_id is not null then now() else null end,
    auth.uid()
  )
  on conflict ((lower(email))) do update set
    user_id=coalesce(excluded.user_id,public.all_trip_travellers.user_id),
    preferred_name=excluded.preferred_name,
    trip_role=excluded.trip_role,
    include_future_trips=excluded.include_future_trips,
    invite_token=gen_random_uuid(),
    expires_at=excluded.expires_at,
    accepted_at=case
      when coalesce(excluded.user_id,public.all_trip_travellers.user_id) is not null
        then coalesce(public.all_trip_travellers.accepted_at,now())
      else null
    end,
    created_by=auth.uid()
  returning
    id,
    public.all_trip_travellers.invite_token,
    public.all_trip_travellers.expires_at,
    public.all_trip_travellers.user_id
  into v_access_id,v_token,v_expiry,v_user_id;

  if v_user_id is not null then
    insert into public.profiles(id,display_name,first_name,email)
    values(v_user_id,v_name,v_name,v_email)
    on conflict (id) do update set
      display_name=excluded.display_name,
      first_name=excluded.first_name,
      email=coalesce(public.profiles.email,excluded.email);

    insert into public.trip_members(trip_id,user_id,role)
    select t.id,v_user_id,p_trip_role
    from public.trips t
    on conflict (trip_id,user_id) do update
      set role=excluded.role;

    get diagnostics v_count=row_count;

    insert into public.user_roles(user_id,role)
    values(v_user_id,'member')
    on conflict (user_id) do nothing;

    insert into public.audit_log(
      user_id,action,entity_type,entity_id,metadata
    )
    values(
      auth.uid(),'owner_all_trips_access_added','all_trip_traveller',
      v_access_id,
      jsonb_build_object(
        'email',v_email,
        'preferred_name',v_name,
        'trip_role',p_trip_role,
        'include_future',p_include_future,
        'trips_added',v_count
      )
    );

    return query
    select v_access_id,'added'::text,v_token,v_user_id,v_count,v_expiry;
  else
    insert into public.audit_log(
      user_id,action,entity_type,entity_id,metadata
    )
    values(
      auth.uid(),'owner_all_trips_invite_created','all_trip_traveller',
      v_access_id,
      jsonb_build_object(
        'email',v_email,
        'preferred_name',v_name,
        'trip_role',p_trip_role,
        'include_future',p_include_future
      )
    );

    return query
    select v_access_id,'invite'::text,v_token,null::uuid,0,v_expiry;
  end if;
end;
$$;

grant execute on function public.owner_create_all_trips_access(text,text,text,boolean,integer)
to authenticated;

-- Accept one all-trips invitation.
create or replace function public.accept_all_trips_invite(p_token uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_access public.all_trip_travellers%rowtype;
  v_user_id uuid;
  v_auth_email text;
  v_count integer := 0;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'You must sign in first.';
  end if;

  select lower(coalesce(auth.jwt()->>'email','')) into v_auth_email;

  select * into v_access
  from public.all_trip_travellers
  where invite_token=p_token
  limit 1;

  if v_access.id is null then
    raise exception 'Invitation not found.';
  end if;

  if v_access.accepted_at is null and v_access.expires_at <= now() then
    raise exception 'This invitation has expired.';
  end if;

  if lower(v_access.email) <> v_auth_email then
    raise exception 'Sign in using the email address this invitation was sent to.';
  end if;

  insert into public.profiles(id,display_name,first_name,email)
  values(v_user_id,v_access.preferred_name,v_access.preferred_name,v_access.email)
  on conflict (id) do update set
    display_name=excluded.display_name,
    first_name=excluded.first_name,
    email=excluded.email;

  insert into public.user_roles(user_id,role)
  values(v_user_id,'member')
  on conflict (user_id) do nothing;

  insert into public.trip_members(trip_id,user_id,role)
  select t.id,v_user_id,v_access.trip_role
  from public.trips t
  on conflict (trip_id,user_id) do update
    set role=excluded.role;

  get diagnostics v_count=row_count;

  update public.all_trip_travellers
  set
    user_id=v_user_id,
    accepted_at=coalesce(accepted_at,now())
  where id=v_access.id;

  insert into public.audit_log(
    user_id,action,entity_type,entity_id,metadata
  )
  values(
    v_user_id,'all_trips_invite_accepted','all_trip_traveller',
    v_access.id,
    jsonb_build_object(
      'email',v_access.email,
      'preferred_name',v_access.preferred_name,
      'trips_added',v_count
    )
  );

  return v_count;
end;
$$;

grant execute on function public.accept_all_trips_invite(uuid) to authenticated;

-- Owner can remove the person's all-trip designation.
-- Existing trip memberships can optionally be removed as well.
create or replace function public.owner_remove_all_trips_access(
  p_access_id uuid,
  p_remove_existing boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_access public.all_trip_travellers%rowtype;
begin
  if not public.stage8_is_owner() then
    raise exception 'Owner access required.';
  end if;

  select * into v_access
  from public.all_trip_travellers
  where id=p_access_id;

  if v_access.id is null then
    raise exception 'All-trips traveller not found.';
  end if;

  if coalesce(p_remove_existing,false) and v_access.user_id is not null then
    delete from public.trip_members
    where user_id=v_access.user_id;
  end if;

  delete from public.all_trip_travellers
  where id=p_access_id;

  insert into public.audit_log(
    user_id,action,entity_type,entity_id,metadata
  )
  values(
    auth.uid(),'owner_all_trips_access_removed','all_trip_traveller',
    p_access_id,
    jsonb_build_object(
      'email',v_access.email,
      'removed_existing_trip_memberships',p_remove_existing
    )
  );

  return true;
end;
$$;

grant execute on function public.owner_remove_all_trips_access(uuid,boolean)
to authenticated;

-- Accepted regular travellers are automatically added to every future trip.
create or replace function public.add_regular_travellers_to_new_trip()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.trip_members(trip_id,user_id,role)
  select
    new.id,
    a.user_id,
    a.trip_role
  from public.all_trip_travellers a
  where a.accepted_at is not null
    and a.user_id is not null
    and a.include_future_trips=true
  on conflict (trip_id,user_id) do update
    set role=excluded.role;

  return new;
end;
$$;

drop trigger if exists add_regular_travellers_to_new_trip on public.trips;
create trigger add_regular_travellers_to_new_trip
after insert on public.trips
for each row execute function public.add_regular_travellers_to_new_trip();

commit;
