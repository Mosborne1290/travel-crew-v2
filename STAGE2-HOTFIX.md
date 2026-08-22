# Travel Crew V2 Stage 2 Hotfix

This fixes a shared client-form bug in:

- Plan My Trip / Add Activity
- Bookings / Save Booking
- Travellers / Add Invitation
- Saved Places / Save Place

The previous Stage 2 code referenced `event.currentTarget` after awaiting a
Supabase request. The form reference can become unavailable after the async
boundary, stopping the refresh logic before the new record is shown.

The hotfix captures the form element before the first `await` and uses that
stable reference when resetting the form.

## Install

Upload these four files to the same paths in GitHub and overwrite the existing
versions:

- components/trip-planner.tsx
- components/trip-bookings.tsx
- components/trip-travellers.tsx
- components/saved-places.tsx

Or upload the complete hotfix project over the existing repository.

Commit to `main`; Vercel will deploy automatically.
