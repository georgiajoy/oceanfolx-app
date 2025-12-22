/*
  # Add Lesson Signups Table

  ## Overview
  Creates a table to track which participants have signed up for upcoming lessons,
  enabling participants to register for lessons in advance and volunteers to see
  who plans to attend.

  ## New Tables
  
  ### `lesson_signups`
  - `id` (uuid, primary key)
  - `session_id` (uuid) - Foreign key to sessions table
  - `participant_id` (uuid) - Foreign key to participants table
  - `signed_up_at` (timestamptz) - When the participant signed up
  - Unique constraint on (session_id, participant_id) to prevent duplicate signups

  ## Security
  - Enable RLS on lesson_signups table
  - Participants can sign themselves up for lessons
  - Participants can view their own signups
  - Volunteers and admins can view all signups
  - Volunteers and admins can manage signups

  ## Important Notes
  - This table is separate from attendance table
  - Signups indicate intent to attend, attendance tracks actual presence
  - Participants can sign up for future lessons
  - On lesson day, participants can self check-in which creates an attendance record
*/

-- Create lesson_signups table
CREATE TABLE IF NOT EXISTS lesson_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  signed_up_at timestamptz DEFAULT now(),
  UNIQUE(session_id, participant_id)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_lesson_signups_session_id ON lesson_signups(session_id);
CREATE INDEX IF NOT EXISTS idx_lesson_signups_participant_id ON lesson_signups(participant_id);

-- Enable Row Level Security
ALTER TABLE lesson_signups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lesson_signups table
CREATE POLICY "Admins can read all lesson signups"
  ON lesson_signups FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Volunteers can read all lesson signups"
  ON lesson_signups FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'volunteer'
    )
  );

CREATE POLICY "Participants can read own lesson signups"
  ON lesson_signups FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM participants p
      WHERE p.id = lesson_signups.participant_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can sign up for lessons"
  ON lesson_signups FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM participants p
      WHERE p.id = lesson_signups.participant_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert lesson signups"
  ON lesson_signups FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Volunteers can insert lesson signups"
  ON lesson_signups FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'volunteer'
    )
  );

CREATE POLICY "Participants can cancel own lesson signups"
  ON lesson_signups FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM participants p
      WHERE p.id = lesson_signups.participant_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete lesson signups"
  ON lesson_signups FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Volunteers can delete lesson signups"
  ON lesson_signups FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'volunteer'
    )
  );