# Travel Crew V2 — Stage 8 Hotfix 11
## Visual Itinerary View

This release adds a polished traveller-facing itinerary while keeping the
existing Plan/Edit workflow intact.

## Install order

### 1. Supabase

Open:

Supabase -> SQL Editor -> New Query

Run:

`supabase/stage8-hotfix11-visual-itinerary.sql`

This migration only adds safe lookup indexes for the Visual Itinerary.
It does not create a second itinerary database and does not modify trip data.

### 2. GitHub / Vercel

Upload/replace the files from this patch, preserving the exact folder paths.

Commit suggestion:

`Add Visual Itinerary View`

Vercel should redeploy automatically.

Wait until the production deployment status is:

`Ready`

## New route

Every trip now has:

`/trips/<tripId>/itinerary`

The main trip navigation includes:

`✨ Itinerary`

The trip header also includes:

`✨ View Itinerary`

## What the new view includes

- visual trip hero
- Plan | Itinerary | Map mode switch
- horizontal trip-day selector
- Day X of Y
- destination-local daily weather
- Happening Now / Up Next
- visual activity timeline
- flight cards
- hotel cards
- cruise cards
- priority and confirmation badges
- directions
- website links
- photo links
- budget links
- weather alternatives
- visited state for Cruise Port Day activities
- Cruise Return-to-Ship safety card
- daily shopping progress
- daily spending
- daily photo strip
- previous / next day controls
- mobile-first styling

## Important

The existing Plan page is not removed.

Use:

Plan = create/edit the holiday
Itinerary = follow/enjoy the holiday

## Timezone protection

Cruise Port Day local times still use the existing Cruise Port Day local-time
fields and destination timezone.

Eden must continue to show:

- Disembark: 9:00 AM
- Recommended wharf arrival: 2:45 PM
- Required return: 3:00 PM

## Sharing

Hotfix 11 includes a safe `Share with Trip Member` action that copies the
signed-in itinerary URL.

It does NOT expose the itinerary publicly and does not expose:
- passports
- private documents
- admin controls
- private chat
- personal expense settlements

A separate public read-only sharing system can be added later if required.

## First test

1. Open a trip.
2. Click `✨ Itinerary`.
3. Move through several days using the date strip.
4. Confirm activities appear on the correct day.
5. Confirm flights / hotels / cruises display where available.
6. Open an Eden Cruise Port Day date.
7. Confirm the Return-to-Ship card appears.
8. Confirm Eden local times remain correct.
9. Test on mobile.
10. Confirm Plan/Edit pages still work normally.
