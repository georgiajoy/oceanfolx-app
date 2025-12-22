/*
  # Swim & Ocean Safety Program Database Schema

  ## Overview
  Creates a complete bilingual database for managing a non-profit swim & ocean safety program
  with role-based access control for Admins, Volunteers, and Participants.

  ## New Tables
  
  ### `users`
  - `id` (uuid, primary key) - References auth.users
  - `role` (text) - One of: admin, volunteer, participant
  - `preferred_language` (text) - One of: en, id
  - `phone` (text, optional) - Contact phone number
  - `created_at` (timestamptz) - Record creation timestamp
  
  ### `participants`
  - `id` (uuid, primary key)
  - `user_id` (uuid) - Foreign key to users table
  - `full_name` (text) - Participant's full name
  - `emergency_contact_name` (text) - Emergency contact person
  - `emergency_contact_phone` (text) - Emergency contact phone
  - `created_at` (timestamptz)
  
  ### `sessions`
  - `id` (uuid, primary key)
  - `date` (date) - Session date
  - `time` (time) - Session time
  - `type` (text) - Session type (e.g., swim_lesson)
  - `created_at` (timestamptz)
  
  ### `attendance`
  - `id` (uuid, primary key)
  - `session_id` (uuid) - Foreign key to sessions
  - `participant_id` (uuid) - Foreign key to participants
  - `status` (text) - One of: present, absent, self_reported
  - `validated_by_volunteer_id` (uuid, nullable) - Foreign key to users (volunteer)
  - `created_at` (timestamptz)
  
  ### `levels`
  - `id` (uuid, primary key)
  - `name_en` (text) - Level name in English
  - `name_id` (text) - Level name in Indonesian
  - `description_en` (text) - Level description in English
  - `description_id` (text) - Level description in Indonesian
  - `order_number` (integer) - Ordering for progression
  - `created_at` (timestamptz)
  
  ### `skills`
  - `id` (uuid, primary key)
  - `level_id` (uuid) - Foreign key to levels
  - `name_en` (text) - Skill name in English
  - `name_id` (text) - Skill name in Indonesian
  - `description_en` (text) - Skill description in English
  - `description_id` (text) - Skill description in Indonesian
  - `order_number` (integer) - Ordering within level
  - `created_at` (timestamptz)
  
  ### `participant_skills`
  - `id` (uuid, primary key)
  - `participant_id` (uuid) - Foreign key to participants
  - `skill_id` (uuid) - Foreign key to skills
  - `status` (text) - One of: not_started, achieved
  - `achieved_date` (date, nullable) - Date skill was achieved
  - `validated_by_volunteer_id` (uuid, nullable) - Foreign key to users (volunteer)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Admins have full access to all data
  - Volunteers can read most data and update attendance/skills
  - Participants can only access their own data
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'volunteer', 'participant')),
  preferred_language text NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en', 'id')),
  phone text,
  created_at timestamptz DEFAULT now()
);

-- Create participants table
CREATE TABLE IF NOT EXISTS participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  emergency_contact_name text NOT NULL,
  emergency_contact_phone text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  time time NOT NULL,
  type text NOT NULL DEFAULT 'swim_lesson',
  created_at timestamptz DEFAULT now()
);

-- Create attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('present', 'absent', 'self_reported')),
  validated_by_volunteer_id uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(session_id, participant_id)
);

-- Create levels table
CREATE TABLE IF NOT EXISTS levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en text NOT NULL,
  name_id text NOT NULL,
  description_en text NOT NULL DEFAULT '',
  description_id text NOT NULL DEFAULT '',
  order_number integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create skills table
CREATE TABLE IF NOT EXISTS skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id uuid NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
  name_en text NOT NULL,
  name_id text NOT NULL,
  description_en text NOT NULL DEFAULT '',
  description_id text NOT NULL DEFAULT '',
  order_number integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create participant_skills table
CREATE TABLE IF NOT EXISTS participant_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'achieved')),
  achieved_date date,
  validated_by_volunteer_id uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(participant_id, skill_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_participants_user_id ON participants(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_session_id ON attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_participant_id ON attendance(participant_id);
CREATE INDEX IF NOT EXISTS idx_skills_level_id ON skills(level_id);
CREATE INDEX IF NOT EXISTS idx_participant_skills_participant_id ON participant_skills(participant_id);
CREATE INDEX IF NOT EXISTS idx_participant_skills_skill_id ON participant_skills(skill_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_skills ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Admins can read all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Users can read own user record"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Admins can update users"
  ON users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Users can update own preferred_language"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- RLS Policies for participants table
CREATE POLICY "Admins can read all participants"
  ON participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Volunteers can read all participants"
  ON participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'volunteer'
    )
  );

CREATE POLICY "Participants can read own participant record"
  ON participants FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can insert participants"
  ON participants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Admins can update participants"
  ON participants FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete participants"
  ON participants FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- RLS Policies for sessions table
CREATE POLICY "Authenticated users can read sessions"
  ON sessions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert sessions"
  ON sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Admins can update sessions"
  ON sessions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete sessions"
  ON sessions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- RLS Policies for attendance table
CREATE POLICY "Admins can read all attendance"
  ON attendance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Volunteers can read all attendance"
  ON attendance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'volunteer'
    )
  );

CREATE POLICY "Participants can read own attendance"
  ON attendance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM participants p
      WHERE p.id = attendance.participant_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert attendance"
  ON attendance FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Volunteers can insert attendance"
  ON attendance FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'volunteer'
    )
  );

CREATE POLICY "Participants can self-report attendance"
  ON attendance FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM participants p
      WHERE p.id = attendance.participant_id AND p.user_id = auth.uid()
    )
    AND status = 'self_reported'
  );

CREATE POLICY "Admins can update attendance"
  ON attendance FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Volunteers can update attendance"
  ON attendance FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'volunteer'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'volunteer'
    )
  );

-- RLS Policies for levels table
CREATE POLICY "Authenticated users can read levels"
  ON levels FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert levels"
  ON levels FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Admins can update levels"
  ON levels FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete levels"
  ON levels FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- RLS Policies for skills table
CREATE POLICY "Authenticated users can read skills"
  ON skills FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert skills"
  ON skills FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Admins can update skills"
  ON skills FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete skills"
  ON skills FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- RLS Policies for participant_skills table
CREATE POLICY "Admins can read all participant_skills"
  ON participant_skills FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Volunteers can read all participant_skills"
  ON participant_skills FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'volunteer'
    )
  );

CREATE POLICY "Participants can read own participant_skills"
  ON participant_skills FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM participants p
      WHERE p.id = participant_skills.participant_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert participant_skills"
  ON participant_skills FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Volunteers can insert participant_skills"
  ON participant_skills FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'volunteer'
    )
  );

CREATE POLICY "Admins can update participant_skills"
  ON participant_skills FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Volunteers can update participant_skills"
  ON participant_skills FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'volunteer'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'volunteer'
    )
  );

-- Insert some sample data for levels and skills
INSERT INTO levels (name_en, name_id, description_en, description_id, order_number) VALUES
  ('Beginner', 'Pemula', 'Introduction to water safety and basic swimming', 'Pengenalan keselamatan air dan renang dasar', 1),
  ('Intermediate', 'Menengah', 'Building confidence and stroke technique', 'Membangun kepercayaan diri dan teknik gaya renang', 2),
  ('Advanced', 'Lanjutan', 'Advanced techniques and ocean safety', 'Teknik lanjutan dan keselamatan laut', 3)
ON CONFLICT DO NOTHING;

INSERT INTO skills (level_id, name_en, name_id, description_en, description_id, order_number)
SELECT 
  l.id,
  'Water Comfort',
  'Kenyamanan di Air',
  'Can enter water safely and feel comfortable',
  'Dapat masuk ke air dengan aman dan merasa nyaman',
  1
FROM levels l WHERE l.order_number = 1
ON CONFLICT DO NOTHING;

INSERT INTO skills (level_id, name_en, name_id, description_en, description_id, order_number)
SELECT 
  l.id,
  'Floating',
  'Mengapung',
  'Can float on back for 30 seconds',
  'Dapat mengapung telentang selama 30 detik',
  2
FROM levels l WHERE l.order_number = 1
ON CONFLICT DO NOTHING;

INSERT INTO skills (level_id, name_en, name_id, description_en, description_id, order_number)
SELECT 
  l.id,
  'Basic Strokes',
  'Gaya Renang Dasar',
  'Can perform basic freestyle stroke',
  'Dapat melakukan gaya bebas dasar',
  3
FROM levels l WHERE l.order_number = 1
ON CONFLICT DO NOTHING;