/*
  # Add Size Fields to Participants

  1. Changes
    - Add `shoe_size` column to participants table (text)
    - Add `clothing_size` column to participants table (text)
  
  2. Notes
    - Using text type to allow flexibility (e.g., "7", "7.5", "S", "M", "L", "XL")
    - Fields are nullable as not all participants may have this information
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participants' AND column_name = 'shoe_size'
  ) THEN
    ALTER TABLE participants ADD COLUMN shoe_size text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participants' AND column_name = 'clothing_size'
  ) THEN
    ALTER TABLE participants ADD COLUMN clothing_size text;
  END IF;
END $$;
