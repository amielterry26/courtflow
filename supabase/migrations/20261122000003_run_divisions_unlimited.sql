-- ─── Adult vs youth (HS/MS) runs + Unlimited membership ─────────────────────
-- Each division has its own runs, players, invites and settings. Locations are shared.

alter table runs        add column division text not null default 'adult' check (division in ('adult','youth'));
alter table run_players add column division text not null default 'adult' check (division in ('adult','youth'));
alter table run_invites add column division text not null default 'adult' check (division in ('adult','youth'));

-- Same phone can be on both lists (e.g. a parent's number for a kid)
alter table run_players drop constraint run_players_phone_key;
alter table run_players add constraint run_players_phone_division_key unique (phone, division);

-- One settings row per division
alter table run_settings drop constraint run_settings_id_check;
alter table run_settings add column division text not null default 'adult' unique check (division in ('adult','youth'));
alter table run_settings alter column member_runs_per_month drop not null;

-- Membership is now Unlimited (no monthly cap)
update run_settings set member_price = 22, member_runs_per_month = null where division = 'adult';
insert into run_settings (id, division, pay_name, cashapp_tag, zelle, apple_cash_phone, default_price, member_price, member_runs_per_month, notify_email)
select 2, 'youth', pay_name, cashapp_tag, zelle, apple_cash_phone, default_price, 24, null, notify_email
from run_settings where division = 'adult';

-- ─── Public functions, now division-aware ───────────────────────────────────
drop function runs_calendar(date, date);
create function runs_calendar(p_from date, p_to date, p_division text default 'adult')
returns table (
  id uuid, run_date date, start_time time, end_time time, price numeric, capacity int,
  notes text, cancelled boolean, gym_name text, gym_address text, gym_maps_url text, going int, division text
)
language sql stable security definer set search_path = public as $$
  select r.id, r.run_date, r.start_time, r.end_time, r.price, r.capacity, r.notes, r.cancelled,
         g.name, g.address, g.maps_url,
         (select count(*)::int from run_signups s join run_players p on p.id = s.player_id
           where s.run_id = r.id and p.status <> 'denied'),
         r.division
  from runs r
  left join gyms g on g.id = r.gym_id
  where r.run_date between p_from and p_to and r.division = p_division
  order by r.run_date, r.start_time;
$$;

drop function runs_player_names();
create function runs_player_names(p_division text default 'adult')
returns table (id uuid, first_name text, last_name text, is_member boolean)
language sql stable security definer set search_path = public as $$
  select id, first_name, last_name, is_member
  from run_players
  where status = 'approved' and division = p_division
  order by first_name, last_name;
$$;

create or replace function runs_join(p_run uuid, p_player uuid, p_method text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_run    runs;
  v_player run_players;
  v_limit  int;
  v_token  uuid;
  v_going  int;
begin
  select * into v_run from runs where id = p_run;
  if not found or v_run.cancelled then raise exception 'This run isn''t available'; end if;
  if v_run.run_date < (now() at time zone 'America/Los_Angeles')::date then
    raise exception 'This run already happened';
  end if;

  select * into v_player from run_players where id = p_player and status = 'approved' and division = v_run.division;
  if not found then raise exception 'Player not found'; end if;

  if p_method = 'member' then
    if not v_player.is_member then raise exception 'Your membership isn''t active yet'; end if;
    select member_runs_per_month into v_limit from run_settings where division = v_run.division;
    if v_limit is not null and (select count(*) from run_signups s join runs r on r.id = s.run_id
        where s.player_id = p_player and s.payment_method = 'member' and s.run_id <> p_run
          and date_trunc('month', r.run_date) = date_trunc('month', v_run.run_date)) >= v_limit then
      raise exception 'You''ve used all your member runs this month';
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

drop function runs_request(text, text, text, uuid, uuid);
create function runs_request(
  p_first text, p_last text, p_phone text, p_run uuid default null, p_invite uuid default null, p_division text default 'adult'
)
returns json
language plpgsql security definer set search_path = public as $$
declare
  v_phone    text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_invite   run_invites;
  v_division text := p_division;
  v_player   run_players;
  v_token    uuid;
begin
  if length(v_phone) = 11 and left(v_phone, 1) = '1' then v_phone := substr(v_phone, 2); end if;
  if length(v_phone) <> 10 then raise exception 'Enter a valid phone number'; end if;
  if coalesce(trim(p_first), '') = '' or coalesce(trim(p_last), '') = '' then
    raise exception 'Enter your first and last name';
  end if;
  if p_invite is not null then
    select * into v_invite from run_invites where token = p_invite;
    if not found then raise exception 'This invite link is no longer valid'; end if;
    v_division := v_invite.division;
  end if;
  if p_run is not null then
    select division into v_division from runs where id = p_run;
  end if;

  select * into v_player from run_players where phone = v_phone and division = v_division;
  if not found then
    insert into run_players (first_name, last_name, phone, status, division)
    values (trim(p_first), trim(p_last), v_phone, case when p_invite is not null then 'approved' else 'pending' end, v_division)
    returning * into v_player;
  elsif p_invite is not null and v_player.status = 'pending' then
    update run_players set status = 'approved' where id = v_player.id returning * into v_player;
  end if;

  if p_run is not null and v_player.status <> 'denied' then
    insert into run_signups (run_id, player_id) values (p_run, v_player.id)
    on conflict (run_id, player_id) do nothing;
    select token into v_token from run_signups where run_id = p_run and player_id = v_player.id;
  end if;

  return json_build_object(
    'player_id', v_player.id, 'first_name', v_player.first_name, 'last_name', v_player.last_name,
    'status', v_player.status, 'is_member', v_player.is_member, 'token', v_token, 'division', v_player.division
  );
end;
$$;

-- Returns the invite's division, or null if the link is dead
drop function runs_check_invite(uuid);
create function runs_check_invite(p_token uuid)
returns text
language sql stable security definer set search_path = public as $$
  select division from run_invites where token = p_token;
$$;

grant execute on function runs_calendar(date, date, text)                   to anon, authenticated;
grant execute on function runs_player_names(text)                           to anon, authenticated;
grant execute on function runs_request(text, text, text, uuid, uuid, text)  to anon, authenticated;
grant execute on function runs_check_invite(uuid)                           to anon, authenticated;
