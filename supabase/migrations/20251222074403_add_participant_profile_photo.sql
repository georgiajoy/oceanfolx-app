/*
  # Add Profile Photo Support for Participants

  1. Changes
    - Add `profile_photo_url` column to `participants` table
      - Stores URL to participant's profile photo
      - Optional field (can be null)
  
  2. Notes
    - Profile photos can be edited by participants, admins, or volunteers
    - Uses text field to store photo URL (can be external URL or Supabase storage URL)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participants' AND column_name = 'profile_photo_url'
  ) THEN
    ALTER TABLE participants ADD COLUMN profile_photo_url text;
  END IF;
END $$;