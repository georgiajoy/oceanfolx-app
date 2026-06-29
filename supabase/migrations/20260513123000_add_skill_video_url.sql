-- Add video_url support to skills for external demo links
ALTER TABLE skills
ADD COLUMN IF NOT EXISTS video_url text NOT NULL DEFAULT '';
