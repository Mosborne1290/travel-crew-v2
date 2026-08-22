# Travel Crew V2 Stage 5 Hotfix 1

Fixes:

1. Add Activity / Edit Activity
   - activity saves now go through a server-side authenticated route
   - geocoding is optional and can no longer block the save
   - exact Supabase errors are returned to the screen
   - validates selected trip day and start/end time

2. Ask Travel Crew
   - clearer invalid-key and billing/quota messages
   - tries gpt-5.6-luna first
   - automatically falls back to gpt-5.6 when the preferred model is not available
   - supports optional OPENAI_MODEL override

No additional Supabase SQL is required for this hotfix.
