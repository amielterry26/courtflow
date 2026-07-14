-- Expand category constraint to include 'live action'
ALTER TABLE drills DROP CONSTRAINT IF EXISTS drills_category_check;
ALTER TABLE drills ADD CONSTRAINT drills_category_check
  CHECK (category IN ('ball handling','shooting','finishing','footwork','defense','strength & conditioning','IQ','warmup','recovery','live action'));

-- Add drills (skip duplicates by title)
INSERT INTO drills (title, category, difficulty)
SELECT title, category, 'intermediate' FROM (VALUES
  -- Warm-Up
  ('High Knees', 'warmup'),
  ('Karaoke', 'warmup'),
  ('Sumos', 'warmup'),
  ('Lunge and Twist', 'warmup'),
  ('Butt Kicks', 'warmup'),
  ('Scoops', 'warmup'),
  ('Skips', 'warmup'),
  ('Toe-Tap Alternates', 'warmup'),
  ('LCL/Meniscus Mobility', 'warmup'),
  ('Offensive Burnout', 'warmup'),
  ('Defensive Burnout', 'warmup'),
  ('Ankle Mobility', 'warmup'),
  ('Bear Crawl', 'warmup'),
  ('Rapid Feet → Hip Turn → Lateral Step', 'warmup'),

  -- Recovery
  ('Hip Mobility', 'recovery'),
  ('Scorpions', 'recovery'),
  ('Wall Arm/Chest Opener', 'recovery'),
  ('Toe Touch', 'recovery'),
  ('Hamstring Lunge', 'recovery'),
  ('Hip Openers', 'recovery'),
  ('Sit on Toes', 'recovery'),
  ('Floor Mobility Series', 'recovery'),
  ('Sphinx Pose', 'recovery'),

  -- Strength & Conditioning
  ('Farmer Carries', 'strength & conditioning'),
  ('Slow-Eccentric Push-Ups with Explosive Finish', 'strength & conditioning'),
  ('Push-Up Hold', 'strength & conditioning'),
  ('Body Hangs', 'strength & conditioning'),
  ('Pull-Ups', 'strength & conditioning'),
  ('Plank', 'strength & conditioning'),
  ('Dead Hangs', 'strength & conditioning'),
  ('Resistance Work', 'strength & conditioning'),
  ('Sled Push', 'strength & conditioning'),
  ('Sled Pull', 'strength & conditioning'),
  ('Leg Raises', 'strength & conditioning'),
  ('Sumo Squats', 'strength & conditioning'),
  ('Core Work', 'strength & conditioning'),
  ('Assisted Jumps', 'strength & conditioning'),
  ('Split-Squat Holds — 30 Seconds', 'strength & conditioning'),
  ('Pool Workout', 'strength & conditioning'),
  ('Band Pull-Aparts', 'strength & conditioning'),
  ('Upper-Back and Shoulder Posture Work', 'strength & conditioning'),
  ('Stair Bounds', 'strength & conditioning'),
  ('Explosive Step-Ups', 'strength & conditioning'),
  ('Russian Twists', 'strength & conditioning'),
  ('Flutter Kicks', 'strength & conditioning'),
  ('Medicine-Ball Slam', 'strength & conditioning'),
  ('Lateral Band Jumps — Up and Over', 'strength & conditioning'),
  ('Weighted Jump Rope', 'strength & conditioning'),
  ('Single-Leg Balance', 'strength & conditioning'),
  ('Single-Leg Hops', 'strength & conditioning'),

  -- Defense
  ('Basic Defensive Slides', 'defense'),
  ('Green-Band Resistance Slides — 1, 2, 3, Quick Explode', 'defense'),
  ('Defensive Slides with Towel Behind Back', 'defense'),
  ('One-on-One Defense', 'defense'),
  ('Help-Side Defense', 'defense'),
  ('Help and Recover', 'defense'),
  ('Slide → Sprint', 'defense'),
  ('Help → Recover → Take Charge', 'defense'),
  ('Help → Recover → Closeout → Box Out → Rebound', 'defense'),
  ('Rebound → Opposite Wing → Finish High', 'defense'),
  ('Hip Turn → Shuffle → Sprint → Stop on a Dime', 'defense'),

  -- Footwork
  ('Speed Ladder', 'footwork'),
  ('Ickey Shuffle', 'footwork'),
  ('In-In/Out-Out Ladder', 'footwork'),
  ('Pivot Series — 45 Seconds Each Foot', 'footwork'),
  ('Head-Fake Footwork — 45 Seconds', 'footwork'),
  ('Head-Fake Variation — 45 Seconds', 'footwork'),
  ('Single-Leg Balance into Step-Back', 'footwork'),
  ('Medicine-Ball Slam → Jump Slide/Slide', 'footwork'),
  ('Single-Leg Side-Step Shot — Left and Right', 'footwork'),
  ('Pound Pick-Up to High Point — One-Two Step', 'footwork'),
  ('Pound Hop-Step Shot', 'footwork'),
  ('Catch Float — Two Steps', 'footwork'),
  ('Catch Euro Float', 'footwork'),
  ('Spin-Out One-Dribble Shot', 'footwork'),
  ('Two-Foot and One-Foot Counter Stops', 'footwork'),
  ('Scissor/Meet-the-Ball Shot', 'footwork'),
  ('Drift Shot', 'footwork'),
  ('Drift One-Dribble Shot', 'footwork'),

  -- Finishing
  ('Pound Hop-Step Finish', 'finishing'),
  ('Single-Leg Hop Finish', 'finishing'),
  ('Transition Finish', 'finishing'),
  ('Rip-Attack Finish', 'finishing'),
  ('One-on-One Finishing', 'finishing'),
  ('Three-Dribbles-or-Less Attack', 'finishing'),

  -- Shooting
  ('Form Shooting/Ground-Ups', 'shooting'),
  ('Balance Shooting — No Dribble', 'shooting'),
  ('Slow Balance and Pick-Up Point', 'shooting'),
  ('180-Degree Shot', 'shooting'),
  ('Two-Hand Pound Shot', 'shooting'),
  ('One-Hand Pound Shot — Left and Right', 'shooting'),
  ('Seven-Spot Shooting', 'shooting'),
  ('Elbow-to-Elbow Shooting', 'shooting'),
  ('Wing/Baseline Counter Shooting', 'shooting'),
  ('Trail Threes — Catch / One Dribble Left / One Dribble Right', 'shooting'),
  ('Counter Shot — Two-Foot Stop / One-Foot Stop', 'shooting'),
  ('Catch-and-Shoot from Top Pass', 'shooting'),
  ('Catch Jab Shot', 'shooting'),
  ('Catch Double-Jab Shot', 'shooting'),
  ('Transition Pull-Ups', 'shooting'),
  ('Rip Pull-Ups', 'shooting'),
  ('Transition Threes', 'shooting'),

  -- Ball Handling
  ('Two-Hand Pound into Shot', 'ball handling'),
  ('One-Hand Pound into Shot — Left and Right', 'ball handling'),
  ('Pound Pick-Up to High Point', 'ball handling'),
  ('Three-Second Decision Drill', 'ball handling'),
  ('Tennis-Ball Reaction Drill', 'ball handling'),
  ('Rip Pull-Up', 'ball handling'),

  -- Live Action
  ('Three-Dribbles-or-Less Live Play', 'live action'),
  ('Wing/Baseline Reaction Shooting', 'live action'),
  ('Trail Three Decision Series', 'live action'),
  ('Catch/Jab Decision Series', 'live action')
) AS v(title, category)
WHERE NOT EXISTS (
  SELECT 1 FROM drills d WHERE d.title = v.title
);

-- Chase's player rules (only if Chase exists as an athlete)
DO $$
DECLARE
  chase_id uuid;
BEGIN
  SELECT id INTO chase_id FROM athletes WHERE first_name = 'Chase' LIMIT 1;
  IF chase_id IS NOT NULL THEN
    INSERT INTO player_rules (athlete_id, rule, order_index) VALUES
      (chase_id, 'Three dribbles or fewer', 0),
      (chase_id, 'Make a decision within three seconds; otherwise kick it out', 1),
      (chase_id, 'Keep your chest toward the basket when shooting', 2),
      (chase_id, 'Operate from approximately 14–15 feet and in', 3),
      (chase_id, 'Do not hold the ball at the three-point line', 4),
      (chase_id, 'Move across from and opposite the ball', 5);
  END IF;
END $$;
