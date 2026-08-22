# Stage 8 Hotfix 3 — Member Push Repair

Fixes/diagnoses the member error:

`Registration failed - could not connect to push server`

Changes:
- adds `Repair Push`
- checks secure connection, Notification support, service worker support and PushManager support
- shows current notification permission
- shows whether a service worker is active
- shows whether the browser has a device push subscription
- clears stale subscriptions and re-registers the service worker
- returns clearer browser/network guidance instead of the generic registration error

No Supabase SQL changes are required.
No VAPID key changes are required if the owner account can already receive push.

Install:
1. Replace `components/push-settings.tsx`
2. Replace `app/globals.css`
3. Commit to `main`
4. Redeploy Vercel
5. On the affected member account, hard refresh and click `Repair Push`
