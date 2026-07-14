-- Create drill-videos storage bucket (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('drill-videos', 'drill-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Authenticated trainers can upload, update, delete
DO $$ BEGIN
  CREATE POLICY "trainers can upload drill videos" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'drill-videos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "trainers can update drill videos" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'drill-videos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "trainers can delete drill videos" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'drill-videos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Public can read (parents, athletes)
DO $$ BEGIN
  CREATE POLICY "public can read drill videos" ON storage.objects
    FOR SELECT TO anon
    USING (bucket_id = 'drill-videos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
