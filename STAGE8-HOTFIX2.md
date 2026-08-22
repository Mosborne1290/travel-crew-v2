# Stage 8 Hotfix 2 — Owner Invitation Links

Adds central invitation management to:

Owner Administration

The Owner can:
- choose a trip
- enter traveller email
- choose Organiser / Member / Guest
- choose 1 / 3 / 7 / 14 / 30-day validity
- generate a secure invitation link
- copy the new link
- see existing pending / accepted / expired invitations
- copy existing pending links
- revoke pending links

## Install order

1. Run `supabase/stage8-hotfix2-owner-invites.sql`.
2. Upload the Hotfix 2 code files to GitHub.
3. Commit to `main`.
4. Allow Vercel to redeploy.

No VAPID or other environment-variable changes are required.
