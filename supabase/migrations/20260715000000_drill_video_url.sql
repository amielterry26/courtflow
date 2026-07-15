-- Add video_url column to drills table
-- This was missing from the original drill_videos_storage migration,
-- which only created the storage bucket but not the column.
ALTER TABLE drills ADD COLUMN IF NOT EXISTS video_url text;
