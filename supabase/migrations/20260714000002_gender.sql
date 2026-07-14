-- Add gender column to athletes and intake_submissions
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('Male', 'Female'));
ALTER TABLE intake_submissions ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('Male', 'Female'));

-- Seed existing athletes: Victoria and Isabel = Female, everyone else = Male
UPDATE athletes SET gender = 'Female' WHERE LOWER(first_name) IN ('victoria', 'isabel');
UPDATE athletes SET gender = 'Male' WHERE gender IS NULL;
