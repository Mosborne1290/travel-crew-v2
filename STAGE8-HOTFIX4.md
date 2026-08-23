# Stage 8 Hotfix 4 — Preferred Names + Trip Hero Uploads

## Preferred names

Travel Crew now treats `profiles.display_name` as the user's nickname / preferred name.

Users can change their own preferred name from:

Settings -> Profile -> Nickname / preferred name

Saving also updates Supabase Auth user metadata (`display_name`, `name`, `full_name`, `first_name`).
That allows the Supabase Authentication Users screen to populate its Display name after the user next uses Travel Crew.

Owners can also set a member's preferred name from:

Owner Admin -> User Management -> Nickname / first name -> Save Name

If the Owner changes another user's preferred name, Travel Crew uses it immediately. The user's Supabase Auth metadata is synchronised automatically when that user next opens an authenticated Travel Crew page.

## Trip hero images

Trip Overview now includes `Trip Hero Image`.

Editable trip members can:
- upload JPG / PNG / WebP
- preview it
- replace the current cover
- remove the current cover

New Trip also includes `Or upload your own trip hero image`.

Uploaded covers use a dedicated `trip-covers` Storage bucket. It is public only for decorative trip cover images; passports, documents, receipts and normal trip photos remain in their existing private buckets.

## Install

1. Run `supabase/stage8-hotfix4-profile-hero.sql` in Supabase SQL Editor.
2. Upload the code files from this patch to GitHub.
3. Commit to `main`.
4. Let Vercel redeploy.
5. Each existing user should open Settings and save their preferred name once, or the Owner can set it in Owner Admin.

No VAPID changes are required.
