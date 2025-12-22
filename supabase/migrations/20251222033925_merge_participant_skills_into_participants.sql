/*
  # Merge Participant Skills Into Participants Table

  ## Overview
  Simplifies the data model by moving skill tracking directly into the participants table.
  Instead of a separate junction table for participant_skills, participants now track
  their current level and progress notes directly.

  ## Changes
  
  ### Modified Tables
  - `participants`
    - Added `current_level_id` (uuid, nullable) - References current level in program
    - Added `current_skill_id` (uuid, nullable) - References current skill working on
    - Added `notes` (text) - General notes about participant progress
    - Added `last_skill_achieved_date` (date, nullable) - Date of most recent achievement
    - Added `validated_by_volunteer_id` (uuid, nullable) - Last volunteer who validated progress
  
  ### Removed Tables
  - `participant_skills` - No longer needed with simplified model
  
  ## Security
  - Maintain existing RLS policies for participants table
  - Remove policies for deleted participant_skills table
*/

-- Add new columns to participants table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participants' AND column_name = 'current_level_id'
  ) THEN
    ALTER TABLE participants ADD COLUMN current_level_id uuid REFERENCES levels(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participants' AND column_name = 'current_skill_id'
  ) THEN
    ALTER TABLE participants ADD COLUMN current_skill_id uuid REFERENCES skills(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participants' AND column_name = 'notes'
  ) THEN
    ALTER TABLE participants ADD COLUMN notes text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participants' AND column_name = 'last_skill_achieved_date'
  ) THEN
    ALTER TABLE participants ADD COLUMN last_skill_achieved_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participants' AND column_name = 'validated_by_volunteer_id'
  ) THEN
    ALTER TABLE participants ADD COLUMN validated_by_volunteer_id uuid REFERENCES users(id);
  END IF;
END $$;

-- Drop RLS policies for participant_skills table
DROP POLICY IF EXISTS "Admins can read all participant_skills" ON participant_skills;
DROP POLICY IF EXISTS "Volunteers can read all participant_skills" ON participant_skills;
DROP POLICY IF EXISTS "Participants can read own participant_skills" ON participant_skills;
DROP POLICY IF EXISTS "Admins can insert participant_skills" ON participant_skills;
DROP POLICY IF EXISTS "Volunteers can insert participant_skills" ON participant_skills;
DROP POLICY IF EXISTS "Admins can update participant_skills" ON participant_skills;
DROP POLICY IF EXISTS "Volunteers can update participant_skills" ON participant_skills;

-- Drop the participant_skills table
DROP TABLE IF EXISTS participant_skills;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_participants_current_level ON participants(current_level_id);
CREATE INDEX IF NOT EXISTS idx_participants_current_skill ON participants(current_skill_id);
