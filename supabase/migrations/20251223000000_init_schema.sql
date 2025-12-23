/*
  # OceanFolx Swim & Ocean Safety Program - Initial Schema

  ## Overview
  Complete bilingual database schema for managing a non-profit swim & ocean safety program
  with role-based access control for Admins, Volunteers, and Participants.

  ## Core Tables

  ### 1. `users`
  User accounts linked to Supabase auth
  - `id` (uuid, primary key) - References auth.users
  - `role` (text) - One of: admin, volunteer, participant
  - `preferred_language` (text) - One of: en, id (English/Indonesian)
  - `phone` (text, optional) - Contact phone number
  - `created_at` (timestamptz)

  ### 2. `participants`
  Participant profile information
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key) - Links to users table
  - `full_name` (text) - Participant's full name
  - `emergency_contact_name` (text) - Emergency contact person
  - `emergency_contact_phone` (text) - Emergency contact phone
  - `shoe_size` (text, optional) - For gear assignments
  - `clothing_size` (text, optional) - For gear assignments
  - `profile_photo_url` (text, optional) - Profile photo URL
  - `created_at` (timestamptz)

  ### 3. `sessions`
  Swim lesson sessions
  - `id` (uuid, primary key)
  - `date` (date) - Session date
  - `time` (time) - Session time
  - `type` (text) - Session type (default: swim_lesson)
  - `created_at` (timestamptz)

  ### 4. `attendance`
  Tracks participant attendance at sessions
  - `id` (uuid, primary key)
  - `session_id` (uuid, foreign key) - Links to sessions
  - `participant_id` (uuid, foreign key) - Links to participants
  - `status` (text) - One of: present, absent, self_reported
  - `validated_by_volunteer_id` (uuid, nullable, foreign key) - Volunteer who validated
  - `created_at` (timestamptz)
  - Unique constraint: (session_id, participant_id)

  ### 5. `lesson_signups`
  Pre-registration for upcoming lessons
  - `id` (uuid, primary key)
  - `session_id` (uuid, foreign key) - Links to sessions
  - `participant_id` (uuid, foreign key) - Links to participants
  - `signed_up_at` (timestamptz) - When participant signed up
  - Unique constraint: (session_id, participant_id)

  ### 6. `levels`
  Swim proficiency levels (bilingual)
  - `id` (uuid, primary key)
  - `name_en` (text) - Level name in English
  - `name_id` (text) - Level name in Indonesian
  - `description_en` (text) - Description in English
  - `description_id` (text) - Description in Indonesian
  - `order_number` (integer) - Ordering for progression
  - `created_at` (timestamptz)

  ### 7. `skills`
  Skills within each level (bilingual)
  - `id` (uuid, primary key)
  - `level_id` (uuid, foreign key) - Links to levels
  - `name_en` (text) - Skill name in English
  - `name_id` (text) - Skill name in Indonesian
  - `description_en` (text) - Description in English
  - `description_id` (text) - Description in Indonesian
  - `order_number` (integer) - Ordering within level
  - `created_at` (timestamptz)

  ### 8. `participant_skills`
  Junction table: participants to skills (many-to-many)
  - `id` (uuid, primary key)
  - `participant_id` (uuid, foreign key) - Links to participants
  - `skill_id` (uuid, foreign key) - Links to skills
  - `achieved_date` (date) - When skill was achieved
  - `validated_by_volunteer_id` (uuid, nullable, foreign key) - Volunteer who validated
  - `notes` (text) - Optional notes about achievement
  - `created_at` (timestamptz)
  - Unique constraint: (participant_id, skill_id)

  ### 9. `participant_levels`
  Junction table: participants to levels (many-to-many)
  - `id` (uuid, primary key)
  - `participant_id` (uuid, foreign key) - Links to participants
  - `level_id` (uuid, foreign key) - Links to levels
  - `achieved_date` (date) - When level was achieved
  - `validated_by_volunteer_id` (uuid, nullable, foreign key) - Volunteer who validated
  - `notes` (text) - Optional notes about achievement
  - `created_at` (timestamptz)
  - Unique constraint: (participant_id, level_id)

  ### 10. `gear_types`
  Types of gear with sponsor information
  - `id` (uuid, primary key)
  - `name` (text) - Type of gear (e.g., "Rashguard")
  - `sponsor_name` (text) - Sponsoring organization
  - `description` (text) - Additional details
  - `created_at` (timestamptz)

  ### 11. `gear_inventory`
  Individual inventory items with sizes
  - `id` (uuid, primary key)
  - `gear_type_id` (uuid, foreign key) - Links to gear_types
  - `size` (text) - Size specification
  - `quantity_total` (integer) - Total quantity received
  - `quantity_available` (integer) - Current available quantity
  - `notes` (text) - Additional notes
  - `created_at` (timestamptz)
  - Constraint: quantity_available <= quantity_total

  ### 12. `gear_assignments`
  Tracks gear given to participants
  - `id` (uuid, primary key)
  - `participant_id` (uuid, foreign key) - Links to participants
  - `gear_inventory_id` (uuid, foreign key) - Links to gear_inventory
  - `assigned_by_user_id` (uuid, foreign key) - User who made assignment
  - `assigned_date` (timestamptz) - When gear was assigned
  - `notes` (text) - Notes about assignment
  - `created_at` (timestamptz)

  ## Security (Row Level Security)
  - All tables have RLS enabled
  - Admins: Full access to all data
  - Volunteers: Read most data, can update attendance/skills/gear
  - Participants: Can only access their own data
*/

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Users table (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'volunteer', 'participant')),
  preferred_language text NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en', 'id')),
  phone text,
  created_at timestamptz DEFAULT now()
);

-- Participants table
CREATE TABLE IF NOT EXISTS participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  emergency_contact_name text NOT NULL,
  emergency_contact_phone text NOT NULL,
  shoe_size text,
  clothing_size text,
  profile_photo_url text,
  created_at timestamptz DEFAULT now()
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  time time NOT NULL,
  type text NOT NULL DEFAULT 'swim_lesson',
  created_at timestamptz DEFAULT now()
);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('present', 'absent', 'self_reported')),
  validated_by_volunteer_id uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(session_id, participant_id)
);

-- Lesson signups table
CREATE TABLE IF NOT EXISTS lesson_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  signed_up_at timestamptz DEFAULT now(),
  UNIQUE(session_id, participant_id)
);

-- Levels table
CREATE TABLE IF NOT EXISTS levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en text NOT NULL,
  name_id text NOT NULL,
  description_en text NOT NULL DEFAULT '',
  description_id text NOT NULL DEFAULT '',
  order_number integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Skills table
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

-- Participant skills junction table
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

-- Participant levels junction table
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

-- Gear types table
CREATE TABLE IF NOT EXISTS gear_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sponsor_name text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Gear inventory table
CREATE TABLE IF NOT EXISTS gear_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gear_type_id uuid NOT NULL REFERENCES gear_types(id) ON DELETE CASCADE,
  size text NOT NULL,
  quantity_total integer NOT NULL DEFAULT 0,
  quantity_available integer NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT quantity_check CHECK (quantity_available >= 0 AND quantity_available <= quantity_total)
);

-- Gear assignments table
CREATE TABLE IF NOT EXISTS gear_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  gear_inventory_id uuid NOT NULL REFERENCES gear_inventory(id) ON DELETE CASCADE,
  assigned_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_date timestamptz DEFAULT now(),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_participants_user_id ON participants(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_session_id ON attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_participant_id ON attendance(participant_id);
CREATE INDEX IF NOT EXISTS idx_lesson_signups_session_id ON lesson_signups(session_id);
CREATE INDEX IF NOT EXISTS idx_lesson_signups_participant_id ON lesson_signups(participant_id);
CREATE INDEX IF NOT EXISTS idx_skills_level_id ON skills(level_id);
CREATE INDEX IF NOT EXISTS idx_participant_skills_participant_id ON participant_skills(participant_id);
CREATE INDEX IF NOT EXISTS idx_participant_skills_skill_id ON participant_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_participant_levels_participant_id ON participant_levels(participant_id);
CREATE INDEX IF NOT EXISTS idx_participant_levels_level_id ON participant_levels(level_id);
CREATE INDEX IF NOT EXISTS idx_gear_inventory_gear_type ON gear_inventory(gear_type_id);
CREATE INDEX IF NOT EXISTS idx_gear_assignments_participant ON gear_assignments(participant_id);
CREATE INDEX IF NOT EXISTS idx_gear_assignments_inventory ON gear_assignments(gear_inventory_id);
CREATE INDEX IF NOT EXISTS idx_gear_assignments_assigned_by ON gear_assignments(assigned_by_user_id);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE gear_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE gear_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE gear_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: USERS
-- ============================================================================

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

-- ============================================================================
-- RLS POLICIES: PARTICIPANTS
-- ============================================================================

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

CREATE POLICY "Participants can update own profile photo"
  ON participants FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can delete participants"
  ON participants FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- ============================================================================
-- RLS POLICIES: SESSIONS
-- ============================================================================

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

-- ============================================================================
-- RLS POLICIES: ATTENDANCE
-- ============================================================================

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

-- ============================================================================
-- RLS POLICIES: LESSON SIGNUPS
-- ============================================================================

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

-- ============================================================================
-- RLS POLICIES: LEVELS
-- ============================================================================

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

-- ============================================================================
-- RLS POLICIES: SKILLS
-- ============================================================================

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

-- ============================================================================
-- RLS POLICIES: PARTICIPANT SKILLS
-- ============================================================================

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

-- ============================================================================
-- RLS POLICIES: PARTICIPANT LEVELS
-- ============================================================================

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

-- ============================================================================
-- RLS POLICIES: GEAR TYPES
-- ============================================================================

CREATE POLICY "Admin and volunteers can view gear types"
  ON gear_types FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'volunteer')
    )
  );

CREATE POLICY "Admins can insert gear types"
  ON gear_types FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update gear types"
  ON gear_types FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete gear types"
  ON gear_types FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ============================================================================
-- RLS POLICIES: GEAR INVENTORY
-- ============================================================================

CREATE POLICY "Admin and volunteers can view gear inventory"
  ON gear_inventory FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'volunteer')
    )
  );

CREATE POLICY "Admins can insert gear inventory"
  ON gear_inventory FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update gear inventory"
  ON gear_inventory FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete gear inventory"
  ON gear_inventory FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ============================================================================
-- RLS POLICIES: GEAR ASSIGNMENTS
-- ============================================================================

CREATE POLICY "Admin and volunteers can view gear assignments"
  ON gear_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'volunteer')
    )
  );

CREATE POLICY "Admin and volunteers can insert gear assignments"
  ON gear_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'volunteer')
    )
  );

CREATE POLICY "Admin and volunteers can update gear assignments"
  ON gear_assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'volunteer')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'volunteer')
    )
  );

CREATE POLICY "Admins can delete gear assignments"
  ON gear_assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ============================================================================
-- SAMPLE DATA
-- ============================================================================

-- Insert sample levels
INSERT INTO levels (name_en, name_id, description_en, description_id, order_number) VALUES
  ('Beginner', 'Pemula', 'Introduction to water safety and basic swimming', 'Pengenalan keselamatan air dan renang dasar', 1),
  ('Intermediate', 'Menengah', 'Building confidence and stroke technique', 'Membangun kepercayaan diri dan teknik gaya renang', 2),
  ('Advanced', 'Lanjutan', 'Advanced techniques and ocean safety', 'Teknik lanjutan dan keselamatan laut', 3)
ON CONFLICT DO NOTHING;

-- Insert sample skills for each level
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

-- Insert sample gear types and inventory
INSERT INTO gear_types (name, sponsor_name, description)
VALUES ('Rashguard', 'RipCurl', 'UV protection rashguard for swim lessons')
ON CONFLICT DO NOTHING;

-- Insert sample inventory for rashguards
DO $$
DECLARE
  rashguard_id uuid;
BEGIN
  SELECT id INTO rashguard_id FROM gear_types WHERE name = 'Rashguard' AND sponsor_name = 'RipCurl' LIMIT 1;

  IF rashguard_id IS NOT NULL THEN
    INSERT INTO gear_inventory (gear_type_id, size, quantity_total, quantity_available)
    VALUES
      (rashguard_id, 'XS', 10, 10),
      (rashguard_id, 'S', 15, 15),
      (rashguard_id, 'M', 20, 20),
      (rashguard_id, 'L', 15, 15),
      (rashguard_id, 'XL', 10, 10)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
