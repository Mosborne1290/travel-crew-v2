-- ============================================================
-- TRAVEL CREW V2 - STAGE 4 MIGRATION
-- Adds secure invitation acceptance helper and invite lookup RPC.
-- Run ONCE in Supabase -> SQL Editor.
-- ============================================================

begin;

-- Allow a signed-in user to inspect a valid invitation by token
-- without exposing all invitation rows.
create or replace function public.get_trip_invite(p_token uuid)
returns table (
  invite_id uuid,
  trip_id uuid,
  trip_name text,
  email text,
  role text,
  expires_at timestamptz,
  accepted_at timestamptz
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    i.id,
    i.trip_id,
    t.name,
    i.email,
    i.role,
    i.expires_at,
    i.accepted_at
  from public.trip_invites i
  join public.trips t on t.id = i.trip_id
  where i.invite_token = p_token
    and i.expires_at > now()
  limit 1;
$$;

grant execute on function public.get_trip_invite(uuid) to anon, authenticated;

-- A signed-in user may accept only an invitation addressed to their
-- authenticated email address.
create or replace function public.accept_trip_invite(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_email text;
  v_invite public.trip_invites%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'You must be signed in to accept an invitation.';
  end if;

  select lower(email)
  into v_email
  from auth.users
  where id = v_user_id;

  select *
  into v_invite
  from public.trip_invites
  where invite_token = p_token
    and expires_at > now()
  for update;

  if not found then
    raise exception 'Invitation is invalid or has expired.';
  end if;

  if lower(v_invite.email) <> v_email then
    raise exception 'This invitation was issued to a different email address.';
  end if;

  insert into public.trip_members (trip_id, user_id, role)
  values (v_invite.trip_id, v_user_id, v_invite.role)
  on conflict (trip_id, user_id)
  do update set role = excluded.role;

  update public.trip_invites
  set accepted_at = coalesce(accepted_at, now())
  where id = v_invite.id;

  -- Add user to an existing trip chat room if one already exists.
  insert into public.chat_members (room_id, user_id)
  select cr.id, v_user_id
  from public.chat_rooms cr
  where cr.trip_id = v_invite.trip_id
    and cr.room_type = 'trip'
  on conflict (room_id, user_id) do nothing;

  insert into public.notifications (
    user_id, trip_id, notification_type, title, message, target_url
  )
  values (
    v_user_id,
    v_invite.trip_id,
    'trip_joined',
    'Trip added to Travel Crew',
    'You have joined ' || (select name from public.trips where id = v_invite.trip_id),
    '/trips/' || v_invite.trip_id::text
  );

  return v_invite.trip_id;
end;
$$;

grant execute on function public.accept_trip_invite(uuid) to authenticated;

-- Let trip organisers create a simple in-app notification for a trip member.
create or replace function public.create_trip_notification(
  p_trip_id uuid,
  p_user_id uuid,
  p_title text,
  p_message text,
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
  if not app_private.can_manage_trip(p_trip_id) then
    raise exception 'You do not have permission to create trip notifications.';
  end if;

  if not exists (
    select 1 from public.trip_members
    where trip_id = p_trip_id and user_id = p_user_id
  ) then
    raise exception 'User is not a member of this trip.';
  end if;

  insert into public.notifications (
    user_id, trip_id, notification_type, title, message, target_url
  )
  values (
    p_user_id, p_trip_id, 'trip', p_title, p_message, p_target_url
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.create_trip_notification(uuid, uuid, text, text, text) to authenticated;


-- Enable realtime delivery for in-app notifications.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

commit;
