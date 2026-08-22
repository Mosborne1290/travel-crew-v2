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


---

# Stage 5 - Complete Smart Travel Rollout

Stage 5 combines all of the planned Stage 5 releases into one upgrade.

## IMPORTANT - run the Stage 5 migration

Before deploying the Stage 5 code, run:

`supabase/stage5-migration.sql`

in Supabase -> SQL Editor.

The migration adds:
- safe "share to trip chat" helper
- budget summary helper

It does not delete or replace existing trip data.

## Stage 5 features

### 5A - Budget, Expenses & Receipts
Trip -> Budget now includes:
- category budgets
- total planned / spent / remaining
- expenses in multiple currencies
- automatic conversion back to trip home currency
- paid-by traveller
- expense splitting between trip members
- owed / paid / settled status
- receipt upload to the existing private `receipts` bucket

### 5B - Detailed Bookings
Trip -> Bookings now has dedicated fields for:

Flight:
- airline
- flight number
- departure / arrival airports
- terminals
- seat
- cabin class

Hotel:
- property name
- address
- room type / room number
- phone / email / website

Cruise:
- cruise line
- ship
- embarkation / disembarkation ports
- cabin number / cabin type

Booking dates are also added to the matching itinerary day when that day exists.

### 5C - Upgraded Plan My Trip
Plan includes:
- Day view
- Calendar view
- Full Trip view
- edit activity
- move activity to another day
- duplicate
- delete
- drag to reorder within a day
- automatic coordinate search when an address/place is entered
- share activity to trip chat
- weather shown against itinerary dates when they are within Open-Meteo's 14-day forecast
- Generate Trip Days for new trips

### 5D - Explore, Saved Places & Map
Explore:
- nearby Things To Do
- restaurants
- cafes
- museums
- parks and gardens
- uses OpenStreetMap / Overpass discovery
- save result directly to Saved Places
- saved results already include coordinates
- share results to Chat

Saved Places:
- automatic location lookup
- Find Location / remap
- share to Chat

Map filters:
- All
- Today
- Hotels
- Food
- Attractions
- Saved

### 5E - Weather + Itinerary
Weather continues to provide current conditions and 14 days.
Plan My Trip displays matching forecast information on itinerary days.
Weather can be shared directly to the trip chat.

### 5F - PWA / Mobile
Travel Crew is now a Progressive Web App:
- manifest
- 192px and 512px app icons
- service worker
- offline fallback shell
- standalone display mode
- mobile bottom navigation
- floating quick-add control
- mobile More menu

Install from your phone browser using Add to Home Screen / Install App.

### 5G - Trip PDF
Trip -> Export Trip opens a print-ready trip book.

Two modes:
- Full Trip Book
- Simple Itinerary

Choose "Print / Save as PDF" and use your browser's PDF destination.

No PDF API or paid PDF service is required.

### 5H - Ask Travel Crew AI
Trip header -> "Ask Travel Crew"

The assistant can read:
- trip dates and destination
- itinerary
- bookings
- saved places
- currently available 14-day weather

Suggestions never change the trip automatically.
For each recommendation you can:
- Add to Itinerary
- Save Place
- Share to Chat

AI is OPTIONAL. Everything else in Stage 5 works without it.

## Optional OpenAI API environment variable

To activate Ask Travel Crew, add this in Vercel:

`OPENAI_API_KEY`

Apply it to Production and Preview, then redeploy.

Do NOT use `NEXT_PUBLIC_` in the variable name.

The Stage 5 implementation uses the OpenAI Responses API with
`gpt-5.6-luna` to keep personal trip-planning requests relatively cost-conscious.

Your ChatGPT subscription does not include OpenAI API usage; API usage is billed separately.

## No additional API keys required for

- Open-Meteo weather
- Frankfurter currency
- MapLibre
- OpenStreetMap map tiles
- OpenStreetMap / Overpass Explore

For a small private friends-and-family app these are used conservatively and requests are cached where appropriate.

## Deployment order

1. Run `supabase/stage5-migration.sql`.
2. Upload the Stage 5 project over the existing GitHub repository.
3. Commit to `main`.
4. Let Vercel deploy.
5. If using AI, add `OPENAI_API_KEY` in Vercel and redeploy.

## Recommended Stage 5 test

1. Open an existing trip.
2. Plan -> test Day / Calendar / Full Trip.
3. Edit and move an activity.
4. Drag activities to reorder them.
5. Add a flight with full details.
6. Confirm it also appears on the itinerary when the booking date matches a trip day.
7. Explore -> search nearby attractions.
8. Save one place and confirm it appears on Map.
9. Budget -> set a category budget.
10. Add an expense and split it between travellers.
11. Upload a receipt.
12. Weather -> share conditions to Chat.
13. Export Trip -> test Full Book and Simple Itinerary -> Save as PDF.
14. Install Travel Crew to a phone home screen.
15. If OPENAI_API_KEY is configured, test Ask Travel Crew.


---

# Stage 6 - Daily Trip Companion & Group Travel

Stage 6 builds on the working Stage 5 + live chat notifications release.

## IMPORTANT - run the Stage 6 migration first

Run:

`supabase/stage6-migration.sql`

in Supabase -> SQL Editor.

It adds:
- checklists + checklist items
- packing lists
- trip reminders
- group polls + voting
- journal entries
- message reactions
- reply metadata for chat messages
- photo timeline/favourite fields
- document traveller/date metadata
- private trip important-information record
- trip status sync helper
- realtime publication entries for the Stage 6 collaborative tables

It does not delete existing Stage 1-5 trip data.

## Stage 6 Features

### Today - Daily Trip Companion
Trip -> Today combines:
- current trip day
- next activity countdown
- activities in time order
- bookings starting today
- reminders due today
- outstanding checklist items
- shortcuts to Weather, Map, Money and Chat

### Checklists
Trip -> Checklists:
- multiple reusable checklists
- categories
- assigned traveller
- due date
- notes
- completed status

### Packing
The same Trip Prep screen includes:
- individual traveller items
- shared group items
- quantity
- packed status
- categories
- starter packing list suggestion

### Reminders
- reminder date/time
- traveller
- message
- Today shortcut
- browser notification while Travel Crew is open/backgrounded and browser notification permission is enabled

The app does not require a paid push-notification provider.

### Group Polls
Trip -> Polls:
- create a question
- multiple choices
- one live vote per traveller
- realtime-compatible poll tables
- close a poll
- save winning option to Saved Places

### Richer Trip Chat
Chat now supports:
- live messages
- typing indicator
- reply to message
- emoji reactions
- @name text mentions
- existing new-chat popup notifications
- delete your own message

### Photo Timeline
Photos now support:
- trip day association
- day-by-day groups
- favourites
- all/favourites view
- captions
- private Supabase storage

### Travel Journal
Trip -> Journal:
- daily notes
- day title
- highlight
- favourite moment
- journal timeline
- printable Memory Book

### Memory Book
Journal -> Memory Book:
- trip cover
- journal days
- highlights
- favourite moments
- photos/favourites
- browser Print / Save as PDF

### Important Information
Trip -> Important Info:
- emergency contact
- travel insurer
- policy number
- insurer phone
- local emergency number
- embassy / consulate notes
- airline contacts
- cruise contacts
- hotel contacts
- private trip-member notes

This information is protected by trip membership RLS.

### Trip Status Workflow
Travel Crew can sync trips into:
- planning
- ready
- travelling
- completed

Dashboard and trip overview trigger status synchronisation.

### Home Dashboard
The Stage 6 dashboard adds:
- Today activity count
- outstanding tasks
- unread alerts
- budget remaining
- Daily Companion shortcut
- Trip Prep shortcut

### Browser Alerts
The top toolbar can show:
`Enable Browser Alerts`

When enabled, due reminders can display browser notifications while the
Travel Crew web app/PWA is open or running in a background tab.

This free implementation does NOT claim to provide guaranteed remote web-push
delivery when the browser/PWA has been completely terminated.

### Offline Travel Mode
Trip Overview -> `Download Trip for Offline Use`

Downloads an offline snapshot containing:
- trip information
- itinerary
- booking summaries
- destinations
- reminders
- document metadata

The dedicated offline trip screen is cached locally.

For privacy and storage reasons, Stage 6 does not automatically download the
binary contents of passports, insurance files or other private documents into
the service-worker cache.

## Stage 6 Trip Menu

- Overview
- Today
- Plan
- Bookings
- Travellers
- Explore
- Saved Places
- Map
- Weather
- Chat
- Polls
- Photos
- Journal
- Checklists
- Documents
- Important Info
- Budget
- Money

The trip header still includes:
- Ask Travel Crew
- Export Trip

## Installation

1. Run `supabase/stage6-migration.sql` in Supabase SQL Editor.
2. Upload the complete Stage 6 project over the existing GitHub repository.
3. Commit to `main`.
4. Allow Vercel to redeploy.
5. Hard-refresh the browser once after deployment.
6. On mobile/PWA, reopen Travel Crew so the updated service worker loads.

No new Vercel API keys are required for Stage 6.

## Recommended Stage 6 Tests

### Today
1. Open a trip that has an activity today.
2. Open Today.
3. Confirm activities/bookings/tasks display.

### Checklists
1. Create a checklist.
2. Add a task.
3. assign it to a traveller.
4. Tick it complete.

### Packing
1. Select Suggest Starter List.
2. Add a custom item.
3. Mark it packed.

### Reminder
1. Enable Browser Alerts.
2. Create a reminder a few minutes ahead.
3. Keep Travel Crew open/backgrounded.
4. Confirm browser alert appears.

### Poll
1. Create a poll with 2-3 choices.
2. Vote from two Travel Crew member accounts.
3. Close the poll.
4. Save the winning option.

### Chat
1. Open the same trip in two member accounts.
2. Confirm typing indicator.
3. Reply to a message.
4. Add an emoji reaction.
5. Share an item to Chat and confirm the other user's popup notification.

### Photos
1. Upload a photo.
2. assign it to a trip day.
3. mark it favourite.
4. switch to Favourites view.

### Journal / Memory Book
1. Save a journal entry.
2. Add a highlight and favourite moment.
3. Open Memory Book.
4. Print / Save as PDF.

### Offline
1. Open Trip Overview while online.
2. click Download Trip for Offline Use.
3. open `/offline-trip/<trip id>` once.
4. disconnect the network.
5. reopen the cached offline trip page.

## Stage 6 Notes

True remote web push while the app is fully closed requires VAPID push
subscriptions and a server-side push-delivery mechanism. Stage 6 deliberately
keeps the app free and self-contained, using realtime/in-app popups plus
browser notifications while the PWA is active/backgrounded.

The next logical rollout is Stage 7: stronger offline sync, true opt-in web
push, location-aware "near me" tools, automatic itinerary conflict detection,
and a polished group trip activity feed.


---

# Stage 7 - On-the-Road Reliability

Stage 7 focuses on the parts of Travel Crew that matter most while you are
actually travelling.

## IMPORTANT - Stage 7 installation has three backend steps

### Step 1 - Run the Stage 7 database migration

Run:

`supabase/stage7-migration.sql`

in Supabase -> SQL Editor.

This adds:
- push subscription storage
- trip activity feed
- offline mutation queue
- automatic reminder rules
- expense settlements
- audit log
- automatic activity-feed triggers
- automatic reminder generator
- Stage 7 RLS and realtime configuration

It does not delete Stage 1-6 trip data.

### Step 2 - Configure true Web Push

Generate one VAPID key pair.

A convenient command after installing the project dependencies is:

`npx web-push generate-vapid-keys`

Keep the PRIVATE key secret.

Add to Vercel:

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

Example VAPID subject:

`mailto:your-email@example.com`

The private key is server-only. Never prefix it with `NEXT_PUBLIC_`.

Then redeploy Vercel.

In Supabase -> Edge Functions, deploy:

`supabase/functions/push-reminders`

Configure these Edge Function secrets using the SAME VAPID key pair:

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- `CRON_SECRET`

`CRON_SECRET` should be a new long random value.

Supabase Edge Functions already provide the Supabase URL and service-role
credentials in the hosted function environment.

### Step 3 - Schedule push reminders with Supabase Cron

After the Edge Function is deployed, open:

`supabase/stage7-push-cron-setup.sql`

Replace:
- `YOUR_PROJECT_REF`
- the placeholder cron secret

Use the SAME `CRON_SECRET` configured for the Edge Function.

Then run that SQL in Supabase.

The job checks reminders every 15 minutes.

Stage 7 intentionally does NOT use Vercel Cron for this. The Travel Crew
project is designed to remain compatible with Vercel Hobby/free hosting.

## Stage 7 Features

### True Web Push

Settings -> Push Notifications

Users can:
- enable push per device
- send a test push
- receive scheduled Travel Crew reminder notifications
- click a notification to open the relevant trip screen

Push subscriptions are private to the signed-in user.

### Automatic Reminder Generation

Trip -> Checklists now includes:

`Create Automatic Reminders`

Travel Crew creates reminders for:
- upcoming itinerary activities
- upcoming bookings

The reminder generator avoids recreating the same reminder repeatedly.

### Near Me

Main navigation -> Near Me

Uses device geolocation only after the traveller chooses to use it.

Categories include:
- Restaurants
- Cafes
- Pharmacies
- Supermarkets
- Hospitals
- Toilets
- Fuel
- Attractions

Results are sorted approximately by distance.

### Route Planning

Trip -> Map includes Route Between Stops.

Choose two mapped trip locations and Travel Crew shows:
- approximate driving distance
- approximate driving time

The Stage 7 personal-use implementation uses the public OSRM routing service.

### Itinerary Conflict Detection

Trip -> Plan -> Check My Trip

Travel Crew checks for:
- overlapping itinerary activities
- activity / booking clashes
- transfer gaps that look too short
- large itinerary gaps

These are planning warnings rather than guarantees of real travel time.

### Activity Feed

Trip -> Activity Feed

Automatically records major collaborative changes such as:
- itinerary activity added
- booking added
- saved place added
- photo added
- expense added
- checklist updated/completed
- poll created

The feed updates in realtime.

### Settle Up

Trip -> Settle Up

Shows:
- who owes whom
- net amount owing
- settlement history
- record bank/cash settlement

Existing expense splits feed the balance calculation.

### Stronger Offline Sync

Stage 7 adds an offline change queue for:
- checklist completion
- packing completion
- journal entries

When offline:
- the screen updates immediately
- the change is queued in the browser

When the connection returns:
- Travel Crew automatically sends queued changes to Supabase
- duplicate client mutations are protected by a unique mutation ID
- failed items remain queued for retry

A Sync / Offline indicator appears in the app toolbar.

This extends the Stage 6 read-only downloaded trip snapshot.

### Production Hardening

Stage 7 also adds:
- server-side validation on new Stage 7 APIs
- protected push subscriptions
- RLS for new collaborative tables
- secure Supabase Cron secret validation
- security response headers
- geolocation permission policy
- audit-log foundation
- stale push-subscription cleanup

## New navigation

The main navigation adds:

- Near Me

Trip navigation adds:

- Activity Feed
- Settle Up

The existing Today, Plan, Chat, Polls, Journal, Checklists and other Stage 6
screens remain.

## Recommended Stage 7 test

### Database
1. Run `stage7-migration.sql`.
2. Confirm success before deploying the code.

### Basic deploy
1. Upload Stage 7 to GitHub.
2. Commit to `main`.
3. Confirm Vercel deployment is Ready.

### Conflict checker
1. Create two overlapping itinerary activities.
2. Plan -> Check My Trip.
3. Confirm the overlap warning appears.

### Near Me
1. Open Near Me on your phone.
2. Allow location access.
3. Search Restaurants or Pharmacies.

### Route
1. Open a trip with mapped places.
2. Map -> Route Between Stops.
3. Select two locations.
4. Confirm distance/time display.

### Activity Feed
1. Add a saved place or expense.
2. Open Activity Feed.
3. Confirm the event appears.

### Settle Up
1. Add a split expense.
2. Open Settle Up.
3. Confirm who owes whom.
4. Record a settlement.

### Offline Sync
1. Open Travel Crew online.
2. disconnect the network.
3. tick a checklist item or packing item.
4. confirm the Sync indicator shows Offline/pending.
5. reconnect.
6. confirm the queued change syncs.

### Push
1. Configure VAPID keys in Vercel and Supabase Edge Functions.
2. Deploy `push-reminders`.
3. schedule it using `stage7-push-cron-setup.sql`.
4. Settings -> Enable Push.
5. Settings -> Send Test Push.
6. create an upcoming reminder.
7. confirm a closed/backgrounded PWA receives the notification where the
   operating system/browser supports Web Push.

## Free-hosting note

Travel Crew Stage 7 continues to use Vercel Hobby for the web application.
Scheduled reminder delivery uses Supabase Cron + Supabase Edge Functions
instead of frequent Vercel Cron jobs.

External public services used by Stage 7 include OpenStreetMap/Overpass and
the OSRM demo routing service. These are suitable for light personal use, but
should not be treated as an unlimited commercial routing/places backend.

## What remains after Stage 7

The next polish/finalisation release can focus on:
- richer route alternatives and walking mode
- background location suggestions
- full offline create/edit for bookings and itinerary activities
- document expiry automation
- automatic flight check-in reminders
- trip-wide search
- activity-feed filtering
- admin/user management and backup/export
- deeper testing and UX polish
