/*
  # Refactor Skills and Levels to Many-to-Many

  ## Overview
  Changes the skill and level tracking system to support multiple skills and levels per participant.
  Skills and levels are predefined by admins, and volunteers/admins can assign them to participants.

  ## Changes Made
  
  ### 1. New Junction Tables
  - `participant_skills` - Links participants to multiple skills they have achieved
  - `participant_levels` - Links participants to multiple levels they have achieved
  
  ### 2. Table Modifications
  - Keeps existing `skills` and `levels` tables as master lists (admin-editable)
  - Removes single skill/level tracking from participants table in favor of junction tables
  
  ### 3. Additional Fields
  - Both junction tables include:
    - `achieved_date` - When the skill/level was achieved
    - `validated_by_volunteer_id` - Which volunteer validated it
    - `notes` - Optional notes about achievement
  
  ## Security
  - Enable RLS on all new tables
  - Admins can manage everything
  - Volunteers can view and assign skills/levels to participants
  - Participants can view their own assigned skills/levels
*/

-- Create participant_skills junction table
CREATE TABLE IF NOT EXISTS participant_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  achieved_date date DEFAULT CURRENT_DATE,
  validated_by_volunteer_id uuid REFERENCES users(id),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(participant_id, skill_id)
);

-- Create participant_levels junction table
CREATE TABLE IF NOT EXISTS participant_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  level_id uuid NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
  achieved_date date DEFAULT CURRENT_DATE,
  validated_by_volunteer_id uuid REFERENCES users(id),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(participant_id, level_id)
);

-- Enable RLS
ALTER TABLE participant_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_levels ENABLE ROW LEVEL SECURITY;

-- RLS Policies for participant_skills

-- Admins can do everything
CREATE POLICY "Admins can manage all participant skills"
  ON participant_skills FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Volunteers can view all participant skills
CREATE POLICY "Volunteers can view all participant skills"
  ON participant_skills FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'volunteer'
    )
  );

-- Volunteers can assign skills to participants
CREATE POLICY "Volunteers can assign skills to participants"
  ON participant_skills FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'volunteer'
    )
  );

-- Volunteers can update participant skills
CREATE POLICY "Volunteers can update participant skills"
  ON participant_skills FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'volunteer'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'volunteer'
    )
  );

-- Volunteers can remove skills from participants
CREATE POLICY "Volunteers can remove skills from participants"
  ON participant_skills FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'volunteer'
    )
  );

-- Participants can view their own skills
CREATE POLICY "Participants can view their own skills"
  ON participant_skills FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM participants 
      WHERE participants.id = participant_skills.participant_id 
      AND participants.user_id = auth.uid()
    )
  );

-- RLS Policies for participant_levels

-- Admins can do everything
CREATE POLICY "Admins can manage all participant levels"
  ON participant_levels FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Volunteers can view all participant levels
CREATE POLICY "Volunteers can view all participant levels"
  ON participant_levels FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'volunteer'
    )
  );

-- Volunteers can assign levels to participants
CREATE POLICY "Volunteers can assign levels to participants"
  ON participant_levels FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'volunteer'
    )
  );

-- Volunteers can update participant levels
CREATE POLICY "Volunteers can update participant levels"
  ON participant_levels FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'volunteer'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'volunteer'
    )
  );

-- Volunteers can remove levels from participants
CREATE POLICY "Volunteers can remove levels from participants"
  ON participant_levels FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'volunteer'
    )
  );

-- Participants can view their own levels
CREATE POLICY "Participants can view their own levels"
  ON participant_levels FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM participants 
      WHERE participants.id = participant_levels.participant_id 
      AND participants.user_id = auth.uid()
    )
  );

-- Migrate existing data if any
-- Copy current_skill_id to participant_skills
INSERT INTO participant_skills (participant_id, skill_id, validated_by_volunteer_id, achieved_date)
SELECT 
  id,
  current_skill_id,
  validated_by_volunteer_id,
  COALESCE(last_skill_achieved_date, CURRENT_DATE)
FROM participants
WHERE current_skill_id IS NOT NULL
ON CONFLICT (participant_id, skill_id) DO NOTHING;

-- Copy current_level_id to participant_levels
INSERT INTO participant_levels (participant_id, level_id, achieved_date)
SELECT 
  id,
  current_level_id,
  CURRENT_DATE
FROM participants
WHERE current_level_id IS NOT NULL
ON CONFLICT (participant_id, level_id) DO NOTHING;

-- Drop old columns from participants table (we're moving to the many-to-many approach)
ALTER TABLE participants 
  DROP COLUMN IF EXISTS current_skill_id,
  DROP COLUMN IF EXISTS current_level_id,
  DROP COLUMN IF EXISTS last_skill_achieved_date,
  DROP COLUMN IF EXISTS validated_by_volunteer_id;
