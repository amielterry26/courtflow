-- Add session pack tracking to athletes
alter table athletes add column if not exists sessions_purchased int;
alter table athletes add column if not exists sessions_used int;
