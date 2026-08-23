# Travel Crew V2 — Stage 8 Hotfix 10
## Cruise Port Day Planner

This package adds a complete Cruise Port Day planning workflow to the existing
Travel Crew Supabase/Vercel application. It deliberately reuses the existing
Trips, Activities, Photos, Expenses, Notifications, Map, Weather, Auth and
membership infrastructure.

## Install order

### 1 — Ensure Hotfix 9 timezone repair is installed

Cruise Port Day includes its own local `time` fields, and the migration also
safely adds the Hotfix 9 timezone/version columns if they are missing.

### 2 — Run the Cruise Port Day database migration

Supabase -> SQL Editor -> New Query

Run:

`supabase/stage8-hotfix10-cruise-port-day.sql`

This:
- creates `cruise_port_days`
- creates `cruise_port_shopping_items`
- creates `cruise_port_day_templates`
- extends the existing `activities` table rather than replacing it
- links existing Photos and Expenses to a cruise port day/activity
- adds membership-aware RLS
- protects critical Cruise Port Day changes
- lets Members mark activities Visited and add Notes safely
- adds return-to-ship reminder generation
- adds Realtime for cruise-day and shopping records

No existing production data is deleted.

### 3 — Run the Eden template seed

Run:

`supabase/stage8-hotfix10-eden-template.sql`

The script first saves the Eden itinerary as a reusable Owner template.

It then checks the existing production trips. If exactly ONE trip can be
reliably identified as an Eden trip that includes 19 December 2026, it
automatically attaches the itinerary to that trip.

If zero or multiple matching trips are found, it DOES NOT guess and DOES NOT
create a duplicate trip. The template remains available on:

Trip -> Plan -> Cruise Port Day

for the Owner to attach manually.

### 4 — Upload the code patch to GitHub

Add/replace the files contained in the ZIP.

Append:

`app/globals-cruise-port-day-hotfix10.css`

to the bottom of the existing:

`app/globals.css`

Do not replace your current globals.css with only the snippet.

Commit suggestion:

`Add Cruise Port Day Planner`

Then allow Vercel to redeploy.

## Where it appears

Trip -> Plan

A new `+ Create Plan` panel shows:

- Day Plan
- Cruise Port Day

Cruise Port Day opens:

`/trips/<tripId>/cruise-days`

## Owner/Admin/Organiser

Can:
- create/delete Port Days
- edit ship/wharf/return times
- set timezone
- upload hero image
- create/edit/delete/reorder activities
- geocode missing map stops
- manage confirmation details
- create shopping items
- create return-to-ship push reminders
- use the Smart/AI draft builder

## Members

Can:
- view the complete port-day itinerary
- use return-to-ship countdown
- use directions and maps
- add activity notes
- add photos
- add expenses
- split an expense between travellers
- mark activities visited
- check shopping items as purchased

Members cannot delete the whole Cruise Port Day or change critical ship-return
information through the Cruise Port Day UI/database policies.

## Timezone safety

Cruise-day schedule fields use local `time` values plus the explicit
destination IANA timezone.

Eden:

`Australia/Sydney`

The Eden template stores:

- Disembark: 09:00
- Recommended Wharf Arrival: 14:45
- Required Return: 15:00

These values are displayed directly as Eden local time and do not pass through
Vercel's UTC server timezone.

Return-to-ship reminder timestamps are converted server-side using:

`(port_date + required_return_time) AT TIME ZONE timezone`

## Return-to-ship system

The sticky banner updates every 30 seconds.

Default warnings:

- Green: > 90 minutes
- Amber: <= 90 minutes
- Orange: <= 60 minutes
- Red: <= 30 minutes
- Critical: <= 15 minutes

Owner/Admin/Organiser can change the warning thresholds in Port Day Settings.

`RETURN TO SHIP` uses the existing Stage 8 route API. If current-location
permission is available and wharf coordinates have been mapped, it shows:
- estimated distance
- journey minutes
- remaining buffer
- OpenStreetMap directions link

## Weather

The Cruise Port Day weather route uses Open-Meteo, matching the existing
Travel Crew weather architecture. If a future port date is outside the
forecast window, the itinerary remains usable and the UI shows a non-blocking
weather message.

## Photos

Cruise photos reuse:
- existing `photos` table
- existing private `trip-photos` Supabase Storage bucket

Storage path:

`<trip_id>/cruise-days/<cruise_day_id>/<activity_id>/...`

Hero images reuse the existing `trip-covers` bucket.

## Expenses

Cruise expenses reuse:
- `expenses`
- `expense_splits`

The quick Expense action can split an expense equally across all travellers.
The complete Budget/Settle Up screens remain available for detailed editing.

## Maps

Cruise Port Day reuses the existing `TripMap` component.

`Map Missing Stops` uses OpenStreetMap Nominatim to geocode activities where
coordinates have not yet been entered.

## Eden template included

19 December 2026:
- Eden Cruise Wharf & Welcome Centre
- Travel to Eden Town Centre
- Eden Community Market
- Imlay Street Shopping
- Eden Killer Whale Museum
- Lunch
- Eden Lookout & Rotary Park
- Aslings Beach & Rock Pool
- Return to Snug Cove
- Snug Cove Waterfront & Final Shopping
- Return to Eden Cruise Wharf

Shopping:
- Old Tom / Killer Whale souvenir
- Eden Christmas ornament
- Handmade market item
- Local jewellery
- Twofold Bay artwork
- Sapphire Coast souvenir
- Local preserves or food product

## Test after deployment

1. Trip -> Plan -> Cruise Port Day.
2. Attach the Eden template if it was not auto-attached.
3. Open Eden Port Day.
4. Confirm:
   - 9:00 AM shows 9:00 AM
   - 2:45 PM shows 2:45 PM
   - 3:00 PM shows 3:00 PM
5. Test return countdown.
6. Change warning thresholds.
7. Click Map Missing Stops.
8. Add an activity.
9. Drag activities to reorder.
10. Add activity note as Member.
11. Mark Visited as Member.
12. Add photo as Member.
13. Add/split expense.
14. Check a shopping item.
15. Test Return to Ship with location enabled.
16. Generate return warnings.
17. Test with Owner/Admin and ordinary Member accounts.
