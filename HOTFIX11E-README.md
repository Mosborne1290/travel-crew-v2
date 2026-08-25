# Travel Crew V2 — Hotfix 11E
## Vercel Build Repair — GitHub Root Paths

The build error happened because the previous COMPLETE deployment package was
uploaded into GitHub with a top-level `vercel-github/` folder.

That is not the correct repository structure.

## BEFORE uploading this patch

In your GitHub repository, DELETE the entire top-level folder:

`vercel-github`

Do not leave it in the repository.

The files in this Hotfix 11E ZIP belong directly at the repository root.

For example, GitHub should contain:

app/
components/
lib/
public/
supabase/
package.json
...

It should NOT contain:

vercel-github/app/
vercel-github/components/

## Upload this patch

Upload/replace these files at the repository root:

- `app/globals.css`
- `app/(app)/trips/[tripId]/page.tsx`
- `app/(app)/trips/[tripId]/itinerary/page.tsx`
- `components/visual-itinerary.tsx`
- `components/trip-workspace-nav.tsx`
- `components/trip-workspace-header.tsx`

## Why this fixes all three errors

1. `@/components/visual-itinerary` resolves correctly because
   `components/visual-itinerary.tsx` is now at the real app root.

2. `TripWorkspaceNav` includes `"itinerary"` in its `active` union type.

3. `TripWorkspaceHeader` includes `"itinerary"` in its `active` union type.

## No Supabase SQL required

This is a Vercel/GitHub path and TypeScript repair only.

## Commit

Suggested commit:

`Fix Visual Itinerary Vercel paths`

Then let Vercel redeploy and wait for `Ready`.
