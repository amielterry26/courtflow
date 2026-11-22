-- Day-before reminder texts: each signup gets one
alter table run_signups add column reminded_at timestamptz;

-- Nightly at 01:00 UTC (5pm PST / 6pm PDT) ask runs-sms to remind tomorrow's rosters.
-- The function only acts in the evening Pacific window and never texts anyone twice.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'runs-day-before-reminders',
  '0 1 * * *',
  $$
  select net.http_post(
    url := 'https://hmqeakjpstjgsdhmtobe.supabase.co/functions/v1/runs-sms',
    body := '{"action":"reminders"}'::jsonb,
    headers := '{"Content-Type":"application/json"}'::jsonb
  );
  $$
);
