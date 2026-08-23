-- ============================================================
-- TRAVEL CREW V2 - STAGE 8 HOTFIX 9
-- Activity timezone / UTC conversion repair
-- Run once in Supabase SQL Editor before deploying the code.
-- ============================================================

begin;

alter table public.activities
  add column if not exists timezone text,
  add column if not exists time_storage_version integer not null default 1;

-- Booking-generated activities were created from a real browser UTC instant,
-- so they must NOT be shifted by the one-time legacy repair.
update public.activities
set time_storage_version = 2
where time_storage_version = 1
  and lower(coalesce(notes,'')) like '%created from booking%';

commit;
