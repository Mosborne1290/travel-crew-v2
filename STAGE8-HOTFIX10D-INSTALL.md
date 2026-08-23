# Travel Crew V2 — Stage 8 Hotfix 10D
## Cruise Port Day UX Redesign

This is a front-end UX redesign only.

It does NOT:
- change Supabase tables
- change RLS
- change Cruise Port Day timezone handling
- change Eden template data
- change VAPID keys
- add new environment variables
- create duplicate trips

It assumes the Cruise Port Day Hotfix 10 database installation and the
Hotfix 10C activity-type fix are already installed.

## What changes

### Template screen
- premium Eden template presentation
- guided 2-step cruise/wharf setup
- strong `Attach Eden Plan to This Trip` CTA
- 11-stop / shopping / museum / beach / lookout summary
- clear "What happens next?" explanation
- manual Cruise Port Day form collapsed by default

### Live Cruise Port Day
- larger destination hero
- sticky section navigation
- quick summary cards for stops, visited, shopping, spend and photos
- stronger Return to Ship presentation
- modern timeline styling
- larger phone-friendly activity actions
- shopping purchase progress bar
- upgraded budget / photo / notes cards
- cleaner map section
- Owner/Admin tools moved below the live traveller screen

### Settings
- Port / Ship / Wharf / Times / Warnings / Notes groups
- critical return fields visually separated
- sticky Save button
- Delete moved into a separate Danger Zone

### Cover photo
- compact `Edit Cover Photo` workflow
- preview
- replace/remove controls

### AI builder
- step 1 Interests
- step 2 Pace
- step 3 Build Draft
- clearer reminder that suggestions are not saved automatically

## Install

1. Unzip this patch.
2. Upload/replace the included files in the GitHub Travel Crew repository,
   preserving the folder paths.
3. Commit to `main`.

Suggested commit:

`Redesign Cruise Port Day UX`

4. Vercel should automatically redeploy.
5. Wait until the deployment status is `Ready`.

## No SQL required

Do NOT run another SQL migration for Hotfix 10D.

## Important CSS

The included `app/globals.css` is a consolidated stylesheet containing the
existing Travel Crew styles plus the Cruise Port Day Hotfix 10 and UX 10D
styles. Replace the existing `app/globals.css` with the included file.

## First test

Open:

Trip -> Plan -> Cruise Port Day

Check the Eden template screen.

Then attach/open Eden and confirm:

- 9:00 AM disembark
- 2:45 PM recommended wharf arrival
- 3:00 PM required return

The UX update does not alter those timezone-safe values.

## Mobile test

Also open the Cruise Port Day on your phone and check:

- hero does not overflow
- section tabs scroll horizontally
- summary cards scroll cleanly
- Return to Ship banner stays readable
- activity buttons are easy to tap
- no horizontal page overflow
