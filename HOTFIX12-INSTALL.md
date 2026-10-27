# Travel Crew V2 — Hotfix 12
## Simplified Trip Menu + Near Me Repair

No Supabase SQL is required.

## What changes

### Trip navigation
The long scrolling row of trip tabs is replaced with:

- Overview
- Itinerary
- Today
- Plan
- Map
- More

`More` opens a grouped menu containing:

Plan & People
- Bookings
- Travellers
- Checklists

Explore
- Explore
- Near Me
- Saved Places
- Weather

Memories & Chat
- Chat
- Photos
- Journal
- Documents

Money & Trip Tools
- Budget
- Settle Up
- Travel Money
- Important Info
- Search Trip
- Activity Feed
- Offline Tools

Polls is no longer shown anywhere in the trip navigation.
Existing Poll data/tables are not deleted.

### Trip header
The header is simplified to:

- Trip name / destination / dates
- trip status
- Itinerary
- Trip Actions

Trip Actions contains:
- Ask Travel Crew
- Export Trip
- Backup Trip

### Near Me
Near Me is redesigned to reduce clutter.

Primary categories:
- Food
- Coffee
- Things to Do
- Shopping
- Pharmacy
- Supermarket
- Transport

Less common categories are under `More categories`.

Nearby search now:
1. tries the existing OpenStreetMap Overpass servers;
2. automatically falls back to Photon/OpenStreetMap search if Overpass is unavailable;
3. shows a calmer useful error if both providers are temporarily unavailable.

No paid map service or API key is added.

## GitHub install

Upload/replace these files at the repository root:

components/trip-workspace-nav.tsx
components/trip-workspace-header.tsx
components/trip-workspace.module.css
components/near-me.tsx
app/api/near-me/route.ts

Commit suggestion:

Simplify trip navigation and repair Near Me

Let Vercel redeploy automatically.

## Tests

Desktop:
- only six trip navigation controls are visible
- More menu opens cleanly
- no horizontal navigation scrollbar
- Polls is not visible
- Trip Actions opens under the header
- Near Me searches current location
- Near Me manual location works
- Near Me returns results if Overpass is unavailable and Photon has matching data

Tablet/mobile:
- primary navigation becomes a simple 3 x 2 grid
- More menu remains usable and scrollable
- no page overflow
- Near Me categories wrap cleanly
- results display one column on phones

## Important

This patch does not:
- delete Poll data
- change Supabase schema
- change RLS
- add paid APIs
- remove any existing Trip tools
