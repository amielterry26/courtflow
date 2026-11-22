-- Players only get texts if they checked the SMS consent box (carrier A2P requirement)
alter table run_players add column sms_opt_in boolean not null default false;

drop function runs_request(text, text, text, uuid, uuid, text);
create function runs_request(
  p_first text, p_last text, p_phone text, p_run uuid default null, p_invite uuid default null,
  p_division text default 'adult', p_sms_opt_in boolean default false
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
    insert into run_players (first_name, last_name, phone, status, division, sms_opt_in)
    values (trim(p_first), trim(p_last), v_phone, case when p_invite is not null then 'approved' else 'pending' end,
            v_division, p_sms_opt_in)
    returning * into v_player;
  else
    update run_players
    set status = case when p_invite is not null and status = 'pending' then 'approved' else status end,
        sms_opt_in = sms_opt_in or p_sms_opt_in
    where id = v_player.id
    returning * into v_player;
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

grant execute on function runs_request(text, text, text, uuid, uuid, text, boolean) to anon, authenticated;
