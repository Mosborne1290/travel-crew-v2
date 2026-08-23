# Stage 8 Hotfix 6 — Near Me Location Repair

Fixes the generic `Location permission is required` error.

What changes:
- identifies permission denied / location unavailable / timeout separately
- checks browser geolocation permission when supported
- uses lower-power location first for more reliable desktop/browser results
- adds a manual city/suburb/postcode/destination fallback
- manual locations are geocoded through OpenStreetMap Nominatim
- category buttons reuse the chosen device/manual location
- no Supabase SQL or environment variables required

Install:
1. Replace `components/near-me.tsx`
2. Add `app/api/near-me/geocode/route.ts`
3. Append the contents of `app/globals-near-me-hotfix6.css` to your existing `app/globals.css`
4. Commit to GitHub and let Vercel redeploy

If location was previously denied:
- click the padlock/site controls beside the browser address
- open Site settings / Permissions
- set Location to Allow
- return to Travel Crew and click Try My Location Again

Manual location works even if GPS/location permission remains blocked.
