# Travel Crew V2 Stage 5 Hotfix 4

Adds live Trip Chat notifications.

When a trip member uses Share to Chat for an:
- activity
- saved place
- booking
- weather update
- Ask Travel Crew suggestion

every OTHER member of that trip receives:
- a realtime notification
- a visible New Trip Chat popup
- the shared text preview
- Click to review in Trip Chat
- an unread notification badge

The sender is not notified about their own shared message.

INSTALL ORDER:
1. Run `supabase/stage5-hotfix4-chat-notifications.sql` in Supabase SQL Editor.
2. Replace the application files from this patch.
3. Commit to GitHub/main.
4. Let Vercel redeploy.
5. Test with two signed-in trip-member accounts.

The receiving user must have Travel Crew open in a browser/app for the popup
to appear immediately. If they are not currently in the app, the notification
remains unread in the bell and appears when their account next loads.
