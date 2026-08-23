# Stage 8 Hotfix 7 — Near Me Server Fallback

Fixes `Nearby search is temporarily unavailable.`

The manual location lookup is already working. The failure occurs when the public nearby-search server is unavailable or times out.

Hotfix 7 automatically tries three public Overpass servers before showing an error:

1. overpass.kumi.systems
2. overpass-api.de
3. overpass.private.coffee

## Install

Replace `app/api/near-me/route.ts`, commit to GitHub, and allow Vercel to redeploy.

No Supabase SQL, environment-variable, or VAPID changes are required.
