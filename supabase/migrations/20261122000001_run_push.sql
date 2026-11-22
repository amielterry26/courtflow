-- Phone push notifications for the runs admin (new join requests)
create table run_push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_id     uuid default auth.uid() references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

alter table run_push_subscriptions enable row level security;
create policy "Trainers manage run_push_subscriptions" on run_push_subscriptions
  for all to authenticated using (true) with check (true);

-- So each request only pings once
alter table run_players add column notified_at timestamptz;
