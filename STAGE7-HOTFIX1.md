# Travel Crew V2 - Stage 7 Hotfix 1

Fixes the Vercel build errors caused by Vercel/Next.js trying to type-check the
Supabase Deno Edge Function.

Errors fixed include:

- Cannot find module 'npm:web-push@3.6.7'
- Cannot find module 'npm:@supabase/supabase-js'
- Cannot find name 'Deno'
- Edge Function request parameter type errors

## Why this happened

`supabase/functions/push-reminders/index.ts` belongs to the Supabase Edge
Functions / Deno runtime. It should NOT be compiled by the Next.js app on
Vercel.

## Fix

`tsconfig.json` now explicitly excludes:

- `supabase/functions`
- `supabase/functions/**/*`

A dedicated `supabase/functions/deno.json` has also been added for the
Supabase function runtime.

No Supabase SQL changes are required.

After applying this hotfix, commit to `main` and let Vercel redeploy.
