-- ============================================================
-- TRAVEL CREW V2 - STAGE 5 MIGRATION
-- Run ONCE in Supabase -> SQL Editor.
-- Adds helper functions used by advanced trip planning,
-- budget summaries and safe trip-chat sharing.
-- ============================================================

begin;

-- Create/reuse a trip chat room and share an item to it.
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
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'You must be signed in.';
  end if;

  if not app_private.is_trip_member(p_trip_id) then
    raise exception 'You are not a member of this trip.';
  end if;

  select id into v_room_id
  from public.chat_rooms
  where trip_id = p_trip_id
    and room_type = 'trip'
  limit 1;

  if v_room_id is null then
    insert into public.chat_rooms (trip_id, name, room_type, created_by)
    values (
      p_trip_id,
      (select name || ' Chat' from public.trips where id = p_trip_id),
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

  return v_message_id;
end;
$$;

grant execute on function public.share_trip_item_to_chat(uuid, text, text)
to authenticated;

-- Return a compact trip budget summary.
create or replace function public.get_trip_budget_summary(p_trip_id uuid)
returns table (
  planned numeric,
  expenses numeric,
  bookings numeric,
  paid_bookings numeric,
  remaining numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((select sum(planned_amount) from public.budgets where trip_id = p_trip_id), 0)::numeric as planned,
    coalesce((select sum(coalesce(converted_amount, amount)) from public.expenses where trip_id = p_trip_id), 0)::numeric as expenses,
    coalesce((select sum(total_amount) from public.bookings where trip_id = p_trip_id), 0)::numeric as bookings,
    coalesce((select sum(total_amount) from public.bookings where trip_id = p_trip_id and payment_status = 'paid'), 0)::numeric as paid_bookings,
    (
      coalesce((select sum(planned_amount) from public.budgets where trip_id = p_trip_id), 0)
      -
      coalesce((select sum(coalesce(converted_amount, amount)) from public.expenses where trip_id = p_trip_id), 0)
    )::numeric as remaining
  where app_private.is_trip_member(p_trip_id);
$$;

grant execute on function public.get_trip_budget_summary(uuid) to authenticated;

commit;
