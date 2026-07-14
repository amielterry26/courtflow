-- Player Rules table
CREATE TABLE IF NOT EXISTS player_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  rule text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE player_rules ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Auth users manage player rules" ON player_rules
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
