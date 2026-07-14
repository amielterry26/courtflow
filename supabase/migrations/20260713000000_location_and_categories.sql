-- Add location to sessions
alter table sessions add column if not exists location text;

-- Update existing drills: rename 'conditioning' → 'strength & conditioning'
update drills set category = 'strength & conditioning' where category = 'conditioning';

-- Drop old category check and add updated one (includes 'strength & conditioning' and 'recovery')
alter table drills drop constraint if exists drills_category_check;
alter table drills add constraint drills_category_check
  check (category in ('ball handling','shooting','finishing','footwork','defense','strength & conditioning','IQ','warmup','recovery'));
