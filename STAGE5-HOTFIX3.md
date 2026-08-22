# Travel Crew V2 Stage 5 Hotfix 3

Fixes the exact UUID error shown when adding an activity:

  invalid input syntax for type uuid: ""

Cause:
The activity API correctly found/created an itinerary day, but the activity
count query still used the original empty day ID instead of the resolved UUID.

Fix:
The route now uses `day.id` after the real itinerary day has been resolved.

Also fixes Ask Travel Crew action UX:
- Add to Itinerary uses the repaired server activity route
- Save Place confirms success and avoids duplicate saved places
- Share to Chat confirms success
- buttons show Adding / Saving / Sharing states
- fixed confirmation toast is visible even when the user is lower on the page

No Supabase SQL is required.
