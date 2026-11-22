-- Optional extra address for "new run request" emails (cc on the Web3Forms email)
alter table run_settings add column notify_email text;
