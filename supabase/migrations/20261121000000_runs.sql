-- ─── runs.courtflow.app — open gym pickup runs ──────────────────────────────
-- Locations reuse the existing gyms table.

create table run_players (
  id          uuid primary key default gen_random_uuid(),
  first_name  text not null,
  last_name   text not null,
  phone       text not null unique,          -- 10 digits, no formatting
  status      text not null default 'pending' check (status in ('pending','approved','denied')),
  is_member   boolean not null default false,
  notes       text,
  created_at  timestamptz not null default now()
);

create table runs (
  id          uuid primary key default gen_random_uuid(),
  run_date    date not null,
  start_time  time not null,
  end_time    time,
  gym_id      uuid references gyms(id) on delete set null,
  price       numeric(6,2) not null default 12,
  capacity    int,
  notes       text,
  cancelled   boolean not null default false,
  created_at  timestamptz not null default now()
);

create table run_signups (
  id              uuid primary key default gen_random_uuid(),
  run_id          uuid not null references runs(id) on delete cascade,
  player_id       uuid not null references run_players(id) on delete cascade,
  payment_method  text check (payment_method in ('apple_cash','zelle','cash_app','cash','member')),
  paid            boolean not null default false,
  token           uuid not null unique default gen_random_uuid(),  -- lets the player's device check status/roster
  created_at      timestamptz not null default now(),
  unique (run_id, player_id)
);

create table run_invites (
  token       uuid primary key default gen_random_uuid(),
  label       text,
  created_at  timestamptz not null default now()
);

-- ─── RLS: trainers manage everything; the public page only uses the functions below
alter table run_players enable row level security;
alter table runs        enable row level security;
alter table run_signups enable row level security;
alter table run_invites enable row level security;

create policy "Trainers manage run_players" on run_players for all to authenticated using (true) with check (true);
create policy "Trainers manage runs"        on runs        for all to authenticated using (true) with check (true);
create policy "Trainers manage run_signups" on run_signups for all to authenticated using (true) with check (true);
create policy "Trainers manage run_invites" on run_invites for all to authenticated using (true) with check (true);

-- ─── Public functions (security definer so anon never reads phone numbers) ──

-- Runs in a date range, with location + headcount
create or replace function runs_calendar(p_from date, p_to date)
returns table (
  id uuid, run_date date, start_time time, end_time time, price numeric, capacity int,
  notes text, cancelled boolean, gym_name text, gym_address text, gym_maps_url text, going int
)
language sql stable security definer set search_path = public as $$
  select r.id, r.run_date, r.start_time, r.end_time, r.price, r.capacity, r.notes, r.cancelled,
         g.name, g.address, g.maps_url,
         (select count(*)::int from run_signups s join run_players p on p.id = s.player_id
           where s.run_id = r.id and p.status <> 'denied')
  from runs r
  left join gyms g on g.id = r.gym_id
  where r.run_date between p_from and p_to
  order by r.run_date, r.start_time;
$$;

-- Names for the "who's playing" dropdown
create or replace function runs_player_names()
returns table (id uuid, first_name text, last_name text, is_member boolean)
language sql stable security definer set search_path = public as $$
  select id, first_name, last_name, is_member
  from run_players
  where status = 'approved'
  order by first_name, last_name;
$$;

-- Returning player joins a run. Returns the signup token.
create or replace function runs_join(p_run uuid, p_player uuid, p_method text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_run    runs;
  v_player run_players;
  v_token  uuid;
  v_going  int;
begin
  select * into v_run from runs where id = p_run;
  if not found or v_run.cancelled then raise exception 'This run isn''t available'; end if;
  if v_run.run_date < (now() at time zone 'America/Los_Angeles')::date then
    raise exception 'This run already happened';
  end if;

  select * into v_player from run_players where id = p_player and status = 'approved';
  if not found then raise exception 'Player not found'; end if;

  if p_method = 'member' then
    if not v_player.is_member then raise exception 'Your membership isn''t active yet'; end if;
    if (select count(*) from run_signups s join runs r on r.id = s.run_id
        where s.player_id = p_player and s.payment_method = 'member' and s.run_id <> p_run
          and date_trunc('month', r.run_date) = date_trunc('month', v_run.run_date)) >= 2 then
      raise exception 'You''ve used both member runs this month';
    end if;
  end if;

  -- Already signed up: just update how they're paying
  select token into v_token from run_signups where run_id = p_run and player_id = p_player;
  if found then
    update run_signups set payment_method = p_method
    where run_id = p_run and player_id = p_player and not paid;
    return v_token;
  end if;

  if v_run.capacity is not null then
    select count(*) into v_going from run_signups s join run_players p on p.id = s.player_id
    where s.run_id = p_run and p.status <> 'denied';
    if v_going >= v_run.capacity then raise exception 'This run is full'; end if;
  end if;

  insert into run_signups (run_id, player_id, payment_method)
  values (p_run, p_player, p_method)
  returning token into v_token;
  return v_token;
end;
$$;

-- New player: request to join (pending) or sign up from an invite link (approved).
-- Optionally attaches them to a run.
create or replace function runs_request(
  p_first text, p_last text, p_phone text, p_run uuid default null, p_invite uuid default null
)
returns json
language plpgsql security definer set search_path = public as $$
declare
  v_phone   text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_invited boolean := p_invite is not null and exists (select 1 from run_invites where token = p_invite);
  v_player  run_players;
  v_token   uuid;
begin
  if length(v_phone) = 11 and left(v_phone, 1) = '1' then v_phone := substr(v_phone, 2); end if;
  if length(v_phone) <> 10 then raise exception 'Enter a valid phone number'; end if;
  if coalesce(trim(p_first), '') = '' or coalesce(trim(p_last), '') = '' then
    raise exception 'Enter your first and last name';
  end if;
  if p_invite is not null and not v_invited then raise exception 'This invite link is no longer valid'; end if;

  select * into v_player from run_players where phone = v_phone;
  if not found then
    insert into run_players (first_name, last_name, phone, status)
    values (trim(p_first), trim(p_last), v_phone, case when v_invited then 'approved' else 'pending' end)
    returning * into v_player;
  elsif v_invited and v_player.status = 'pending' then
    update run_players set status = 'approved' where id = v_player.id returning * into v_player;
  end if;

  if p_run is not null and v_player.status <> 'denied' then
    insert into run_signups (run_id, player_id) values (p_run, v_player.id)
    on conflict (run_id, player_id) do nothing;
    select token into v_token from run_signups where run_id = p_run and player_id = v_player.id;
  end if;

  return json_build_object(
    'player_id', v_player.id, 'first_name', v_player.first_name, 'last_name', v_player.last_name,
    'status', v_player.status, 'is_member', v_player.is_member, 'token', v_token
  );
end;
$$;

-- Signup status for a device's token. Roster only comes back once that signup is paid.
create or replace function runs_roster(p_token uuid)
returns json
language plpgsql stable security definer set search_path = public as $$
declare
  v_signup run_signups;
begin
  select * into v_signup from run_signups where token = p_token;
  if not found then return null; end if;
  return json_build_object(
    'run_id', v_signup.run_id,
    'paid', v_signup.paid,
    'payment_method', v_signup.payment_method,
    'roster', case when v_signup.paid then (
      select coalesce(json_agg(json_build_object('first_name', p.first_name, 'last_initial', left(p.last_name, 1))
                               order by s.created_at), '[]'::json)
      from run_signups s join run_players p on p.id = s.player_id
      where s.run_id = v_signup.run_id and p.status = 'approved'
    ) end
  );
end;
$$;

create or replace function runs_check_invite(p_token uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from run_invites where token = p_token);
$$;

grant execute on function runs_calendar(date, date)                    to anon, authenticated;
grant execute on function runs_player_names()                          to anon, authenticated;
grant execute on function runs_join(uuid, uuid, text)                  to anon, authenticated;
grant execute on function runs_request(text, text, text, uuid, uuid)   to anon, authenticated;
grant execute on function runs_roster(uuid)                            to anon, authenticated;
grant execute on function runs_check_invite(uuid)                      to anon, authenticated;
