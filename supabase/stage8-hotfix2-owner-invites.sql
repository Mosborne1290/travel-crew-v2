-- ============================================================
-- TRAVEL CREW V2 - STAGE 8 HOTFIX 2
-- Owner Administration: central invitation link management
-- Run ONCE in Supabase -> SQL Editor before deploying the code.
-- ============================================================

begin;

-- Let the Owner administration page see all trips and invitation records.
drop policy if exists stage8_owner_trips_select on public.trips;
create policy stage8_owner_trips_select on public.trips
for select to authenticated
using (public.stage8_is_owner());

drop policy if exists stage8_owner_invites_select on public.trip_invites;
create policy stage8_owner_invites_select on public.trip_invites
for select to authenticated
using (public.stage8_is_owner());

-- Owner-only secure invite creator. This avoids relying on client-side
-- INSERT permissions and keeps token generation inside Postgres.
create or replace function public.owner_create_trip_invite(
  p_trip_id uuid,
  p_email text,
  p_role text default 'member',
  p_valid_days integer default 7
)
returns table (
  invite_id uuid,
  trip_id uuid,
  email text,
  role text,
  invite_token uuid,
  expires_at timestamptz,
  accepted_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_days integer;
begin
  if not public.stage8_is_owner() then
    raise exception 'Owner access required.';
  end if;

  v_email := lower(trim(coalesce(p_email,'')));
  if v_email = '' or position('@' in v_email) = 0 then
    raise exception 'Enter a valid email address.';
  end if;

  if p_role not in ('organiser','member','guest') then
    raise exception 'Invalid trip role.';
  end if;

  if not exists (select 1 from public.trips t where t.id=p_trip_id) then
    raise exception 'Trip not found.';
  end if;

  v_days := greatest(1, least(coalesce(p_valid_days,7), 30));

  -- Remove an older unused invitation for the same email/trip so the
  -- Owner always has one current link to share.
  delete from public.trip_invites i
  where i.trip_id=p_trip_id
    and lower(i.email)=v_email
    and i.accepted_at is null;

  return query
  insert into public.trip_invites(
    trip_id,
    email,
    role,
    invite_token,
    expires_at,
    created_by
  )
  values(
    p_trip_id,
    v_email,
    p_role,
    gen_random_uuid(),
    now() + make_interval(days=>v_days),
    auth.uid()
  )
  returning
    id,
    public.trip_invites.trip_id,
    public.trip_invites.email,
    public.trip_invites.role,
    public.trip_invites.invite_token,
    public.trip_invites.expires_at,
    public.trip_invites.accepted_at;

  insert into public.audit_log(user_id,trip_id,action,entity_type,detail)
  values(
    auth.uid(),
    p_trip_id,
    'owner_trip_invite_created',
    'trip_invite',
    jsonb_build_object('email',v_email,'role',p_role,'valid_days',v_days)
  );
end;
$$;

grant execute on function public.owner_create_trip_invite(uuid,text,text,integer) to authenticated;

create or replace function public.owner_revoke_trip_invite(p_invite_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip_id uuid;
  v_email text;
begin
  if not public.stage8_is_owner() then
    raise exception 'Owner access required.';
  end if;

  select trip_id,email into v_trip_id,v_email
  from public.trip_invites
  where id=p_invite_id and accepted_at is null;

  if v_trip_id is null then
    raise exception 'Pending invitation not found.';
  end if;

  delete from public.trip_invites
  where id=p_invite_id and accepted_at is null;

  insert into public.audit_log(user_id,trip_id,action,entity_type,entity_id,detail)
  values(
    auth.uid(),v_trip_id,'owner_trip_invite_revoked','trip_invite',
    p_invite_id,jsonb_build_object('email',v_email)
  );

  return true;
end;
$$;

grant execute on function public.owner_revoke_trip_invite(uuid) to authenticated;

commit;
