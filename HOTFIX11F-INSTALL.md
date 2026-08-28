# Travel Crew V2 — Hotfix 11F
## Dashboard Cleanup + Responsive Safe-Area Repair

This is a GitHub/Vercel-only patch.

No Supabase SQL is required.

## What this patch fixes

- Removes visible `Stage 6 Companion` wording from the dashboard.
- Replaces it with `Trip Essentials`.
- Removes visible Stage 7/8 wording from the Owner Production Check labels.
- Keeps Notifications, Browser Alerts and Offline Trip Copies.
- Fixes top utility controls so they no longer use a negative margin.
- Prevents page headers and actions from overlapping.
- Adds safer wrapping for long trip names.
- Prevents Planning badges from colliding with trip titles.
- Improves tablet and mobile dashboard stacking.
- Adds iOS safe-area support for the app content.
- Adds safe-area spacing for the fixed mobile bottom navigation.
- Repositions the mobile + button so it stays clear of the bottom navigation.
- Prevents horizontal page overflow.

## Upload to GitHub

Upload/replace these exact files at the repository ROOT:

- `app/globals.css`
- `app/(app)/dashboard/page.tsx`
- `app/(app)/admin/health/page.tsx`

Do NOT place these files inside a `vercel-github/` wrapper folder.

Your repository should continue to have:

app/
components/
lib/
public/
package.json

## Commit

Suggested commit:

`Clean dashboard and fix responsive overlap`

Vercel should redeploy automatically.

Wait until the deployment status is `Ready`.

## Test

### Desktop
- Dashboard title and top-right tools do not overlap.
- Trips and Trip Essentials display side by side.
- Long trip names wrap correctly.
- Planning badges remain aligned.

### Tablet
- Header actions wrap onto their own row.
- Trips and Trip Essentials stack cleanly.
- No content extends beyond the screen.

### Mobile / iPhone
- Content begins below the device status/safe area.
- Trip title does not collide with the iOS clock/status area.
- Trip names wrap naturally.
- Planning badges stay inside the card.
- Trip Essentials appears below the Trips list.
- Bottom navigation does not cover page content.
- Floating + button remains above the bottom navigation.
- No horizontal scrolling.

## Important

The underlying functionality is not removed:
- notifications
- browser alerts
- offline trip copies
- PWA
- mobile navigation
- owner permissions
- Production Check
- trips
- Plan
- Itinerary
- Cruise Port Day
