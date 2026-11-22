-- So each "I'm paying" only pings the trainers once
alter table run_signups add column payment_notified_at timestamptz;
