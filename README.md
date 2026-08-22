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


---

# Stage 2 Upgrade

No new SQL migration is required if you already ran the complete Travel Crew V2 Supabase installer.

Stage 2 adds:

- Full trip workspace navigation
- Plan My Trip
- Automatic itinerary-day generation from trip dates
- Activities with time, type, venue, address, cost and notes
- Bookings
- Travellers and pending invitation records
- Saved Places
- Updated trip overview counters

## Deploy Stage 2

Upload the contents of this ZIP over the existing files in your GitHub `travel-crew-v2` repository.

It is safe to overwrite files with the same names.

Commit to `main`. Vercel should automatically build and deploy the new version.

## Test after deployment

1. Open an existing trip.
2. Confirm the new tabs appear.
3. Open **Plan My Trip** and generate trip days.
4. Add an activity.
5. Refresh and confirm it remains.
6. Save a booking.
7. Add a traveller invitation.
8. Save a place.
9. Log out and back in.
10. Confirm the information is still present.

Chat, Photos and Documents remain visible as Stage 3 placeholders.


---

# Stage 3 Upgrade

Stage 3 adds the private collaboration layer to each trip.

## New features

### Realtime Trip Chat
- One live chat room per trip
- Supabase Realtime updates
- Current trip members appear by profile name
- Send messages
- Delete your own messages
- Messages persist in Supabase

### Trip Photos
- Upload private images to the existing `trip-photos` bucket
- Photo records saved in `public.photos`
- Signed URLs are used for private viewing
- Captions
- Delete your own photos
- 15 MB upload limit enforced by the app and bucket

### Trip Documents
- Upload PDFs/images/Word/Excel files to `trip-documents`
- Document category
- Booking reference
- Expiry date
- Notes
- Private signed URL opening
- Delete your own documents

### Dashboard
- Trip Chat and Photos quick cards are now live for the next upcoming trip

## Database / Supabase

No new SQL installer is required if the complete Travel Crew V2 SQL installer
was already run successfully.

Stage 3 uses existing tables:
- chat_rooms
- chat_members
- messages
- photos
- documents

And existing private Storage buckets:
- trip-photos
- trip-documents

The original SQL installer also added `messages` to the Supabase Realtime publication.

## Stage 3 deployment

Upload the contents of this ZIP over the existing GitHub `travel-crew-v2`
repository and commit to `main`.

Vercel should deploy automatically.

## Stage 3 test

1. Open a trip.
2. Open Chat.
3. Send a message.
4. Refresh and confirm it remains.
5. Open Photos and upload an image.
6. Refresh and confirm the image remains.
7. Open Documents and upload a PDF or image.
8. Open the document.
9. Log out and back in.
10. Confirm all three features persist.

For a true realtime chat test, sign in as a second trip member in another
browser/device after that user has been added to `trip_members`.


---

# Stage 4 Upgrade

Stage 4 adds real member onboarding and the main travel utility layer.

## IMPORTANT: Run the Stage 4 SQL migration first

Before deploying the Stage 4 code, run:

`supabase/stage4-migration.sql`

in:

Supabase -> SQL Editor -> New Query -> Run

This migration:
- adds secure invite lookup
- adds secure invite acceptance
- converts an accepted invite into a real `trip_members` record
- automatically adds that user to the trip chat if it exists
- creates a welcome notification
- enables Realtime for notifications

## New Stage 4 features

### Real Traveller Onboarding
The Travellers page now creates a secure 7-day invite link.

The invited person can:
1. open the link
2. sign in if they already have a Travel Crew account
3. or create a Supabase account from the invite page
4. accept the invitation
5. automatically become a trip member
6. automatically join the trip chat

The invite can only be accepted by the email address it was created for.

### Notification Centre
A live notification bell is now available across the protected app.

### Weather
- Open-Meteo location search
- destination coordinates saved back to Supabase
- current weather
- 14-day forecast
- temperature
- rain probability
- wind
- weather conditions

No weather API key is required.

### Travel Money
- Frankfurter currency conversion
- AUD and common travel currencies
- reference exchange rate display

No currency API key is required.

### Interactive Trip Map
- MapLibre
- OpenStreetMap raster tiles
- trip destination pins
- saved places with coordinates
- itinerary activities with coordinates
- map zoom/pan controls

For older trips, open the Weather tab once and choose the correct destination.
This saves the trip coordinates so the main destination appears on the map.

## Supabase Auth setting

For invited travellers to create their own account from the invite link,
Email sign-up must remain enabled in Supabase Authentication.

There is still no public "Create Account" button on the normal Travel Crew login page.

## No new Vercel environment variables

Stage 4 uses the environment variables already configured:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
- PEXELS_API_KEY

Open-Meteo, Frankfurter, MapLibre and OpenStreetMap do not require an API key
for this personal Stage 4 implementation.

## Stage 4 deployment order

1. Run `supabase/stage4-migration.sql` in Supabase.
2. Upload this Stage 4 project over your GitHub repository.
3. Commit to `main`.
4. Let Vercel deploy automatically.
5. Test the features below.

## Stage 4 tests

### Invite
1. Open a trip -> Travellers.
2. Add a test email.
3. Copy the invitation link.
4. Open it in a private/incognito browser.
5. Create/sign into the invited account.
6. Join Trip.
7. Confirm the trip appears for that account.
8. Confirm the person appears under Travellers.

### Chat
Open the trip in two browsers using two trip-member accounts.
Messages should appear live.

### Weather
1. Open trip -> Weather.
2. Search the destination.
3. Choose the correct city.
4. Confirm current weather and the 14-day forecast display.

### Map
After confirming the destination in Weather, open Map.
The destination pin should display.

### Money
Open trip -> Money or the main Travel Money page.
Convert AUD to another currency.

### Notifications
After an invited user joins, their notification bell should show a new trip notification.
