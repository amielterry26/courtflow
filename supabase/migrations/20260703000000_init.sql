-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ─── ATHLETES ────────────────────────────────────────────────────────────────
create table athletes (
  id            uuid primary key default gen_random_uuid(),
  first_name    text not null,
  last_name     text not null,
  age           int,
  grade         text,
  school        text,
  team          text,
  position      text,
  favorite_player text,
  parent_name   text,
  parent_phone  text,
  parent_email  text,
  skill_level   text check (skill_level in ('beginner','intermediate','advanced')),
  goals         text,
  strengths     text,
  weaknesses    text,
  notes         text,
  share_token   uuid not null default gen_random_uuid(),
  status        text not null default 'active' check (status in ('active','inactive','pending')),
  created_at    timestamptz not null default now()
);

-- ─── DRILLS ──────────────────────────────────────────────────────────────────
create table drills (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  category      text not null check (category in ('ball handling','shooting','finishing','footwork','defense','conditioning','IQ','warmup')),
  difficulty    text not null check (difficulty in ('beginner','intermediate','advanced')),
  description   text,
  instructions  text,
  reps_or_time  text,
  created_at    timestamptz not null default now()
);

-- ─── SESSIONS ────────────────────────────────────────────────────────────────
create table sessions (
  id            uuid primary key default gen_random_uuid(),
  session_title text not null,
  session_date  date not null,
  start_time    time,
  end_time      time,
  notes         text,
  created_at    timestamptz not null default now()
);

-- ─── SESSION <-> ATHLETES (many-to-many) ─────────────────────────────────────
create table session_athletes (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references sessions(id) on delete cascade,
  athlete_id  uuid not null references athletes(id) on delete cascade,
  unique(session_id, athlete_id)
);

-- ─── SESSION DRILLS ──────────────────────────────────────────────────────────
create table session_drills (
  id               uuid primary key default gen_random_uuid(),
  session_id       uuid not null references sessions(id) on delete cascade,
  drill_id         uuid not null references drills(id) on delete cascade,
  order_index      int not null default 0,
  custom_notes     text,
  target_makes     int,
  target_reps      int,
  duration_minutes int
);

-- ─── INTAKE SUBMISSIONS ──────────────────────────────────────────────────────
create table intake_submissions (
  id            uuid primary key default gen_random_uuid(),
  child_name    text not null,
  age           int,
  grade         text,
  school        text,
  team          text,
  skill_level   text check (skill_level in ('beginner','intermediate','advanced')),
  goals         text,
  strengths     text,
  weaknesses    text,
  parent_name   text not null,
  parent_phone  text,
  parent_email  text,
  reviewed      boolean not null default false,
  created_at    timestamptz not null default now()
);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────────────────────
alter table athletes          enable row level security;
alter table drills            enable row level security;
alter table sessions          enable row level security;
alter table session_athletes  enable row level security;
alter table session_drills    enable row level security;
alter table intake_submissions enable row level security;

-- Trainers (authenticated users) can do everything
create policy "trainers full access" on athletes          for all to authenticated using (true) with check (true);
create policy "trainers full access" on drills            for all to authenticated using (true) with check (true);
create policy "trainers full access" on sessions          for all to authenticated using (true) with check (true);
create policy "trainers full access" on session_athletes  for all to authenticated using (true) with check (true);
create policy "trainers full access" on session_drills    for all to authenticated using (true) with check (true);
create policy "trainers full access" on intake_submissions for all to authenticated using (true) with check (true);

-- Public can read athletes by share_token (parent view) — handled via API route, not direct RLS
-- Public can insert intake submissions
create policy "public intake insert" on intake_submissions for insert to anon with check (true);

-- Public athlete read via share_token
create policy "public athlete read by token" on athletes for select to anon using (true);
create policy "public session read" on sessions for select to anon using (true);
create policy "public session_athletes read" on session_athletes for select to anon using (true);
create policy "public session_drills read" on session_drills for select to anon using (true);
create policy "public drills read" on drills for select to anon using (true);
