-- ============================================================
-- TRAVEL CREW V2 — STAGE 8 HOTFIX 11
-- VISUAL ITINERARY SUPPORT / PERFORMANCE
--
-- Safe additive migration.
-- The Visual Itinerary reuses existing Travel Crew tables.
-- No duplicate itinerary tables are created.
-- No existing trip/activity data is modified.
-- ============================================================

begin;

-- Itinerary day lookups
create index if not exists itinerary_days_trip_date_idx
  on public.itinerary_days(trip_id, date);

-- Activities used by normal itinerary days
create index if not exists activities_trip_itinerary_day_idx
  on public.activities(trip_id, itinerary_day_id, sort_order);

-- Cruise Port Day activities, when the Cruise Port Day feature is installed.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema='public'
      and table_name='activities'
      and column_name='cruise_port_day_id'
  ) then
    execute '
      create index if not exists activities_trip_cruise_day_idx
      on public.activities(trip_id, cruise_port_day_id, sort_order)
    ';
  end if;
end $$;

-- Booking lookup for day cards
create index if not exists bookings_trip_start_idx
  on public.bookings(trip_id, start_datetime);

-- Destination lookup
create index if not exists destinations_trip_sort_idx
  on public.destinations(trip_id, sort_order);

-- Daily expense lookup
create index if not exists expenses_trip_date_idx
  on public.expenses(trip_id, expense_date);

-- Photo lookup by itinerary day
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public'
      and table_name='photos'
      and column_name='itinerary_day_id'
  ) then
    execute '
      create index if not exists photos_trip_itinerary_day_idx
      on public.photos(trip_id, itinerary_day_id)
    ';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema='public'
      and table_name='photos'
      and column_name='cruise_port_day_id'
  ) then
    execute '
      create index if not exists photos_trip_cruise_day_idx
      on public.photos(trip_id, cruise_port_day_id)
    ';
  end if;
end $$;

-- Cruise shopping lookup, if installed.
do $$
begin
  if to_regclass('public.cruise_port_shopping_items') is not null then
    execute '
      create index if not exists cruise_port_shopping_trip_day_idx
      on public.cruise_port_shopping_items(trip_id, cruise_port_day_id)
    ';
  end if;
end $$;

commit;
