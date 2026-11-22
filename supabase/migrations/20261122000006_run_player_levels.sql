-- Player levels (adult / high school / middle school), dropdown visibility, and stricter sign-ups
alter table run_players add column level text check (level in ('adult','hs','ms'));
update run_players set level = 'adult' where division = 'adult';
alter table run_players add column show_in_list boolean not null default true;

-- Admin can add players without a phone, and siblings sharing a parent's number.
-- Public sign-ups still can't reuse a registered number (checked in runs_request).
alter table run_players alter column phone drop not null;
alter table run_players drop constraint run_players_phone_division_key;
create index run_players_phone_idx on run_players (phone);

-- Unlimited members are paid the moment they join
update run_signups set paid = true where payment_method = 'member';

-- Dropdown names for a division, with whether they're already paid for a given run
drop function runs_player_names(text);
create function runs_player_names(p_division text default 'adult', p_run uuid default null)
returns table (id uuid, first_name text, last_name text, is_member boolean, level text, paid_for_run boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.first_name, p.last_name, p.is_member, p.level,
         coalesce((select s.paid from run_signups s where s.player_id = p.id and s.run_id = p_run), false)
  from run_players p
  where p.status = 'approved' and p.division = p_division and p.show_in_list
  order by p.first_name, p.last_name;
$$;

create or replace function runs_join(p_run uuid, p_player uuid, p_method text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_run    runs;
  v_player run_players;
  v_signup run_signups;
  v_going  int;
  v_token  uuid;
begin
  select * into v_run from runs where id = p_run;
  if not found or v_run.cancelled then raise exception 'This run isn''t available'; end if;
  if v_run.run_date < (now() at time zone 'America/Los_Angeles')::date then
    raise exception 'This run already happened';
  end if;

  select * into v_player from run_players where id = p_player and status = 'approved' and division = v_run.division;
  if not found then raise exception 'Player not found'; end if;
  if p_method = 'member' and not v_player.is_member then raise exception 'Your Unlimited membership isn''t active'; end if;

  select * into v_signup from run_signups where run_id = p_run and player_id = p_player;
  if found then
    if v_signup.paid then raise exception '% is already in and paid for this run', v_player.first_name; end if;
    update run_signups set payment_method = p_method, paid = (p_method = 'member') where id = v_signup.id;
    return v_signup.token;
  end if;

  if v_run.capacity is not null then
    select count(*) into v_going from run_signups s join run_players p on p.id = s.player_id
    where s.run_id = p_run and p.status <> 'denied';
    if v_going >= v_run.capacity then raise exception 'This run is full'; end if;
  end if;

  insert into run_signups (run_id, player_id, payment_method, paid)
  values (p_run, p_player, p_method, p_method = 'member')
  returning token into v_token;
  return v_token;
end;
$$;

-- New player request / invite sign-up. A number that's already registered can't sign up again.
drop function runs_request(text, text, text, uuid, uuid, text, boolean);
create function runs_request(
  p_first text, p_last text, p_phone text, p_run uuid default null, p_invite uuid default null,
  p_division text default 'adult', p_sms_opt_in boolean default false, p_level text default null
)
returns json
language plpgsql security definer set search_path = public as $$
declare
  v_phone    text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_invite   run_invites;
  v_division text := p_division;
  v_existing run_players;
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

  select * into v_existing from run_players where phone = v_phone order by (status = 'pending') limit 1;
  if found then
    if v_existing.status = 'pending' then raise exception 'You already requested to join. Hang tight, you''ll hear back soon.'; end if;
    raise exception 'That number is already registered. Pick your name from the list instead.';
  end if;

  insert into run_players (first_name, last_name, phone, status, division, sms_opt_in, level)
  values (trim(p_first), trim(p_last), v_phone, case when p_invite is not null then 'approved' else 'pending' end,
          v_division, p_sms_opt_in,
          case when v_division = 'adult' then 'adult' when p_level in ('hs','ms') then p_level end)
  returning * into v_player;

  if p_run is not null then
    insert into run_signups (run_id, player_id) values (p_run, v_player.id)
    returning token into v_token;
  end if;

  return json_build_object(
    'player_id', v_player.id, 'first_name', v_player.first_name, 'last_name', v_player.last_name,
    'status', v_player.status, 'is_member', v_player.is_member, 'token', v_token, 'division', v_player.division
  );
end;
$$;

grant execute on function runs_player_names(text, uuid) to anon, authenticated;
grant execute on function runs_request(text, text, text, uuid, uuid, text, boolean, text) to anon, authenticated;

-- Import Chase Gardner (HS) from the training app — plays youth and adult runs
insert into run_players (first_name, last_name, phone, status, division, level, sms_opt_in)
select a.first_name, a.last_name, nullif(right(regexp_replace(coalesce(a.parent_phone, ''), '\D', '', 'g'), 10), ''),
       'approved', d.division, d.level, false
from athletes a
cross join (values ('youth', 'hs'), ('adult', 'adult')) as d(division, level)
where a.first_name = 'Chase' and a.last_name = 'Gardner';
