-- ============================================================
-- TRAVEL CREW V2 - STAGE 7 PUSH CRON SETUP
-- Run AFTER deploying the `push-reminders` Supabase Edge Function.
--
-- 1. Replace the two placeholders below.
-- 2. Run this in Supabase SQL Editor.
-- 3. It schedules closed-app push reminder delivery every 15 minutes.
-- ============================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists supabase_vault;

-- Store your project URL and a long random cron secret securely in Vault.
-- Change these placeholder values before running.
select vault.create_secret(
  'https://YOUR_PROJECT_REF.supabase.co',
  'travel_crew_project_url'
);

select vault.create_secret(
  'REPLACE_WITH_THE_SAME_LONG_CRON_SECRET_USED_BY_THE_EDGE_FUNCTION',
  'travel_crew_push_cron_secret'
);

select cron.schedule(
  'travel-crew-push-reminders',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'travel_crew_project_url'
    ) || '/functions/v1/push-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'travel_crew_push_cron_secret'
      )
    ),
    body := '{}'::jsonb
  );
  $$
);
