# Stage 8 Hotfix 8 — All Trips Access

Adds a new Owner Administration section:

**Regular Travellers — All Trips Access**

Use this for people who normally travel on every trip, for example Robert.

## What it does

### Existing Travel Crew user
Choose the existing user, confirm their preferred name and click:

`Add / Invite to ALL Trips`

Travel Crew immediately:
- adds them to every existing trip
- uses their preferred name/nickname on trips
- optionally marks them to be added automatically to future trips

### New user
Enter their preferred name + email and click the same button.

Travel Crew creates ONE secure link:

`/all-trips-invite/<token>`

When the traveller creates/signs into their account and accepts:
- they are added to every existing trip
- their preferred name is saved
- if selected, they are automatically added to future trips too

## Owner controls

The All Trips list shows:
- preferred name
- email
- Organiser / Member / Guest role
- Active / Invite Pending / Expired
- Existing + Future Trips status
- Copy Link for pending invites
- Remove access

When removing:
- Owner can remove them from ALL existing trips too
- or keep current memberships and only stop automatic future access

## Installation

1. Run `supabase/stage8-hotfix8-all-trips-access.sql`
2. Add `components/owner-all-trips-access.tsx`
3. Replace `app/(app)/admin/users/page.tsx`
4. Add `app/all-trips-invite/[token]/page.tsx`
5. Replace `app/globals.css` with the included consolidated file
6. Commit to GitHub and allow Vercel to redeploy

No VAPID/environment variable changes are required.
