-- Gyms / Locations table
CREATE TABLE gyms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  maps_url text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Seed initial gyms
INSERT INTO gyms (name, address, maps_url, notes) VALUES
  ('Lifetime Fitness', NULL, NULL, NULL),
  ('Atlas Hoops', NULL, NULL, NULL);

-- Add gym_id to sessions
ALTER TABLE sessions ADD COLUMN gym_id uuid REFERENCES gyms(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE gyms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage gyms"
  ON gyms FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can read gyms"
  ON gyms FOR SELECT
  TO anon
  USING (true);
