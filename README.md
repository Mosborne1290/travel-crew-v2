# Travel Crew V2

A private friends-and-family travel planner built with Next.js, Vercel, Supabase and Pexels.

## Included in this starter

- Supabase email/password login
- Cookie-based Supabase SSR authentication
- Protected Travel Crew pages
- Owner/member role display
- Dashboard
- My Trips
- Create New Trip
- Pexels destination image search (server-side)
- Trip detail page
- Supabase persistence
- Responsive desktop/mobile layout
- Vercel-ready environment variable setup

## Already expected in Supabase

Run the Travel Crew V2 Supabase SQL installer before using this project.

The starter expects these tables at minimum:

- profiles
- user_roles
- trips
- trip_members
- destinations
- destination_images

It is compatible with the complete Travel Crew V2 schema installer supplied separately.

## Required Vercel environment variables

Add these in:

Vercel -> Travel Crew V2 -> Settings -> Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
PEXELS_API_KEY=...
```

Apply them to Production and Preview.

Never rename the Pexels variable to `NEXT_PUBLIC_PEXELS_API_KEY`.

## GitHub setup

### Easiest method

1. Download/extract this project.
2. Open your `travel-crew-v2` GitHub repository.
3. Upload the project files to the root of the repository.
4. Commit to `main`.
5. Vercel will detect the commit and deploy automatically if the repo is already connected.

Your repository root should contain:

```text
app/
components/
lib/
.env.example
.gitignore
next.config.ts
package.json
proxy.ts
tsconfig.json
README.md
```

Do NOT upload `.env.local` or any real API keys to GitHub.

## Supabase Auth URL configuration

After Vercel gives you the live production URL, open:

Supabase -> Authentication -> URL Configuration

Set:

```text
Site URL:
https://YOUR-TRAVEL-CREW-VERCEL-URL
```

Add redirect URLs:

```text
https://YOUR-TRAVEL-CREW-VERCEL-URL/**
http://localhost:3000/**
```

For password/email callback support, this starter includes:

```text
/auth/callback
```

## Owner account

Make sure your intended Owner account exists under:

Supabase -> Authentication -> Users

Then make it `owner` in `public.user_roles`.

Verify with:

```sql
select
  u.email,
  r.role
from auth.users u
join public.user_roles r on r.user_id = u.id;
```

## First production test

After Vercel deploys:

1. Open the Travel Crew URL.
2. You should be redirected to `/login`.
3. Sign in with the Owner Supabase account.
4. Confirm Dashboard loads.
5. Go to New Trip.
6. Enter a trip name and destination.
7. Click **Find free photos**.
8. Select a Pexels image.
9. Create the trip.
10. Confirm the Trip page loads.
11. Log out.
12. Log back in.
13. Confirm the trip is still visible under My Trips.

## Local development (optional)

Create `.env.local` using `.env.example`, then:

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Next build stages

Once the first production test works, add:

1. Full day-by-day itinerary planner
2. Bookings (flights, hotels, cruises)
3. Realtime Travel Crew chat
4. Photo albums and uploads
5. Documents
6. Budget and expenses
7. Open-Meteo 14-day weather
8. MapLibre maps
9. Currency conversion
10. PWA / Add to Home Screen
11. AI Travel Assistant
12. PDF itinerary export
