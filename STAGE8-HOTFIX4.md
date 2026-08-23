# Stage 8 Hotfix 4 — Near Me Reliability

Fixes the Near Me message:

`Nearby search is temporarily unavailable.`

The problem was that Travel Crew depended on a single public Overpass server.

Hotfix 4 now:
- tries multiple Overpass servers automatically
- uses a shorter provider timeout
- falls back to the next provider if one server is overloaded
- returns up to 25 nearby results
- keeps the existing Restaurants / Cafes / Shopping / Medical / etc categories
- does not require a new API key
- does not require a Supabase migration

Replace:

`app/api/near-me/route.ts`

Then commit and redeploy Vercel.
