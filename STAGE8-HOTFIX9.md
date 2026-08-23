# Stage 8 Hotfix 9 — Activity Timezone Repair

Fixes the issue where an activity entered as 4:00 PM could display as 3:00 AM.

Cause:
The Vercel server runs in UTC. The old activity API parsed a local `HH:mm`
value on the server with `new Date(...).toISOString()`, so it treated the
entered wall-clock time as UTC before the browser converted it again.

Fix:
- local activity time is now converted using the trip/activity IANA timezone
- geocoded activity locations can supply their own timezone
- each activity stores its timezone
- planner displays and edits using the activity timezone, not browser timezone
- new/corrected records are tagged time_storage_version=2
- booking-created activities are excluded from the legacy repair
- Planner includes a one-time `Repair Existing Times` button

Install:
1. Run `supabase/stage8-hotfix9-timezone.sql`
2. Replace/add the four code files
3. Commit to GitHub and redeploy Vercel
4. Open Trip -> Plan
5. Click `Repair Existing Times` once for trips containing times saved before this fix

No VAPID or environment-variable changes are required.
