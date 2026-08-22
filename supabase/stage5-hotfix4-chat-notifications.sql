-- ============================================================
-- TRAVEL CREW V2 - STAGE 5 HOTFIX 4
-- NEW TRIP CHAT NOTIFICATIONS
-- Run ONCE in Supabase -> SQL Editor.
-- ============================================================

begin;

create or replace function public.share_trip_item_to_chat(
  p_trip_id uuid,
  p_message_text text,
  p_message_type text default 'text'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_id uuid;
  v_message_id uuid;
  v_user_id uuid;
  v_trip_name text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'You must be signed in.';
  end if;

  if not app_private.is_trip_member(p_trip_id) then
    raise exception 'You are not a member of this trip.';
  end if;

  select name into v_trip_name
  from public.trips
  where id = p_trip_id;

  select id into v_room_id
  from public.chat_rooms
  where trip_id = p_trip_id
    and room_type = 'trip'
  limit 1;

  if v_room_id is null then
    insert into public.chat_rooms (trip_id, name, room_type, created_by)
    values (
      p_trip_id,
      coalesce(v_trip_name, 'Trip') || ' Chat',
      'trip',
      v_user_id
    )
    returning id into v_room_id;

    insert into public.chat_members (room_id, user_id)
    select v_room_id, tm.user_id
    from public.trip_members tm
    where tm.trip_id = p_trip_id
    on conflict (room_id, user_id) do nothing;
  end if;

  insert into public.chat_members (room_id, user_id)
  values (v_room_id, v_user_id)
  on conflict (room_id, user_id) do nothing;

  insert into public.messages (
    room_id, user_id, message_text, message_type
  )
  values (
    v_room_id,
    v_user_id,
    p_message_text,
    case
      when p_message_type in ('text','image','document','place','activity','booking','location','system')
      then p_message_type
      else 'text'
    end
  )
  returning id into v_message_id;

  -- Notify every OTHER member of the trip.
  insert into public.notifications (
    user_id,
    trip_id,
    notification_type,
    title,
    message,
    target_url
  )
  select
    tm.user_id,
    p_trip_id,
    'chat',
    'New Trip Chat',
    left(coalesce(p_message_text, 'A new item was shared to chat.'), 240),
    '/trips/' || p_trip_id::text || '/chat'
  from public.trip_members tm
  where tm.trip_id = p_trip_id
    and tm.user_id <> v_user_id;

  return v_message_id;
end;
$$;

grant execute on function public.share_trip_item_to_chat(uuid, text, text)
to authenticated;

commit;
