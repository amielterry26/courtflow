-- Links a player to their Stripe customer so subscription changes update Unlimited automatically
alter table run_players add column stripe_customer_id text;
create index run_players_stripe_customer_idx on run_players (stripe_customer_id);
