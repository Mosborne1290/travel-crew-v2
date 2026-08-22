# Travel Crew Stage 5 Hotfix 2

Fixes two remaining problems.

## Add Activity
- adds an explicit Date field
- Add button no longer depends on a selected/generated itinerary day
- server finds or creates the itinerary day automatically
- activity mapping is still optional
- button displays Adding… while saving
- after save, the matching day becomes selected

## Ask Travel Crew
- OpenAI API billing/quota is no longer required for the feature to work
- if OpenAI has no API key or returns quota/billing errors, Travel Crew automatically uses Free Smart Planner mode
- Free Smart Planner uses the trip's existing itinerary, saved places and available weather
- paid OpenAI remains optional and is used automatically when available

No new Supabase SQL is required.
