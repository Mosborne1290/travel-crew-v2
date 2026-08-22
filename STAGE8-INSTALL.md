# Travel Crew V2 — Stage 8 Installation

Stage 8 is the final major feature release.

## 1. Run the Stage 8 database migration first

In Supabase:
SQL Editor -> New Query

Run:

`supabase/stage8-migration.sql`

This adds:
- account disable / last-seen profile controls
- document expiry automation fields
- smarter flight fields
- owner-only user-control RPC functions
- document expiry reminder generator
- flight reminder generator
- search indexes and owner RLS access

It does not delete Stage 1-7 trip data.

## 2. Upload Stage 8 to GitHub

Upload the Stage 8 files over the existing Travel Crew repository.

Commit suggestion:

`Travel Crew V2 Stage 8`

Vercel should redeploy automatically.

Stage 8 carries forward the Stage 7 Vercel hotfix:
`supabase/functions/**` is excluded from the Next.js TypeScript build.

## 3. No new paid API key is required

Stage 8 continues to use:
- Supabase
- Vercel
- OpenStreetMap / Overpass
- public OpenStreetMap routing instances
- existing Pexels key
- existing VAPID keys
- optional OpenAI API key

## 4. First tests

Trip Search:
Trip -> Search -> search for a booking, passport, place, expense or chat phrase.

Documents:
Trip -> Documents -> add an expiry date, traveller and alert period.
Click Create Expiry Reminders.

Flights:
Trip -> Bookings -> add check-in time, boarding time, gate, baggage and timezones.
Click Create Flight Reminders.

Near Me:
Trip -> Near Me -> allow location.
Save a nearby place or add it directly to Today.

Routes:
Trip -> Map -> choose Walk / Drive / Cycle.

Offline:
Trip -> Offline Tools.
Disconnect internet and add an activity, place, expense or reminder.
Reconnect and confirm the Sync indicator returns to Synced.

Owner:
Main menu -> Owner Admin.
Test roles and disable controls using a non-owner test account.

Backup:
Open any trip -> Backup Trip.
Keep the downloaded JSON somewhere safe.

Production:
Main menu -> Production Check.
Review all checks before relying on Travel Crew overseas.
