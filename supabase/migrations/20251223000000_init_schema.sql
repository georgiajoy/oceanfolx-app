-- OceanFolx Swim & Ocean Safety Program — Baseline Schema
-- This file defines the canonical tables, indexes, and row-level security
-- policies used by the application.

BEGIN;

-- Ensure pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- users
-- Canonical user records linked to Supabase auth. Stores account-level
-- information including role and preferred language. `full_name` is the
-- canonical display name for the account.
-- Columns:
--  - id: uuid (primary, references auth.users)
--  - role: text (admin, volunteer, participant)
--  - preferred_language: text (en, id)
--  - phone: contact number (optional)
--  - full_name: display name (optional)
--  - created_at: timestamp
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin','volunteer','participant')),
  preferred_language text NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en','id')),
  phone text,
  full_name text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- participants
-- Participant profiles that contain participant-specific information and
-- preferences. A participant is linked to a `users` account via `user_id`.
-- Columns:
--  - id: uuid (primary)
--  - user_id: uuid (references users)
--  - emergency_contact_name / emergency_contact_phone
--  - shoe_size / clothing_size: optional sizing for gear
--  - profile_photo_url: optional
--  - created_at: timestamp
-- ============================================================================
CREATE TABLE IF NOT EXISTS participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emergency_contact_name text NOT NULL,
  emergency_contact_phone text NOT NULL,
  shoe_size text,
  clothing_size text,
  profile_photo_url text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- sessions
-- Scheduled swim lessons or events. Each session has a date/time and a
-- `type` indicating the session category.
-- Columns: id, date, time, type, created_at
-- ============================================================================
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  time time NOT NULL,
  type text NOT NULL DEFAULT 'swim_lesson',
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- session_participants
-- Tracks the relationship between participants and sessions. Records
-- represent signups and attendance states for a participant on a session.
-- Columns:
--  - session_id, participant_id: foreign keys
--  - status: signed_up | present | absent | self_reported
--  - signed_up_at, marked_at: timestamps for lifecycle events
--  - validated_by_volunteer_id: volunteer who validated attendance
--  - notes: optional text
--  - created_at, updated_at
--  - unique constraint on (session_id, participant_id)
-- ============================================================================
CREATE TABLE IF NOT EXISTS session_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'signed_up' CHECK (status IN ('signed_up','present','absent','self_reported')),
  signed_up_at timestamptz DEFAULT now(),
  marked_at timestamptz,
  validated_by_volunteer_id uuid REFERENCES users(id),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(session_id, participant_id)
);

-- ============================================================================
-- levels
-- Swim proficiency levels; bilingual fields for labels and descriptions.
-- Columns: id, name_en, name_id, description_en, description_id, order_number
-- ============================================================================
CREATE TABLE IF NOT EXISTS levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en text NOT NULL,
  name_id text NOT NULL,
  description_en text NOT NULL DEFAULT '',
  description_id text NOT NULL DEFAULT '',
  order_number integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- skills
-- Skills represent discrete capabilities within a level. Each skill
-- references a `levels` row and includes bilingual labels and ordering.
-- Columns: id, level_id, name_en, name_id, description_en, description_id, order_number
-- ============================================================================
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

-- ============================================================================
-- participant_progress
-- Unified table capturing both skill achievements and level completions.
-- A row may reference either a `skill_id` or a `level_id` (or both/none).
-- Columns: participant_id, skill_id (nullable), level_id (nullable), achieved_date, validated_by_volunteer_id, notes
-- ============================================================================
CREATE TABLE IF NOT EXISTS participant_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  skill_id uuid NULL REFERENCES skills(id) ON DELETE SET NULL,
  level_id uuid NULL REFERENCES levels(id) ON DELETE SET NULL,
  achieved_date date NULL,
  validated_by_volunteer_id uuid NULL REFERENCES users(id) ON DELETE SET NULL,
  notes text DEFAULT ''::text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- gear_types, gear_inventory, gear_assignments
-- Gear-related tables: types of gear, inventory items with sizes/quantities,
-- and assignments linking items to participants.
-- ============================================================================
CREATE TABLE IF NOT EXISTS gear_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sponsor_name text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

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
CREATE INDEX IF NOT EXISTS idx_session_participants_session_id ON session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_participant_id ON session_participants(participant_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_status ON session_participants(status);
CREATE INDEX IF NOT EXISTS idx_session_participants_volunteer ON session_participants(validated_by_volunteer_id);
CREATE INDEX IF NOT EXISTS idx_skills_level_id ON skills(level_id);
CREATE INDEX IF NOT EXISTS idx_participant_progress_participant_id ON participant_progress(participant_id);
CREATE INDEX IF NOT EXISTS idx_participant_progress_skill_id ON participant_progress(skill_id);
CREATE INDEX IF NOT EXISTS idx_participant_progress_level_id ON participant_progress(level_id);
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
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE gear_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE gear_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE gear_assignments ENABLE ROW LEVEL SECURITY;
-- ============================================================================
-- DROP OLD POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;
DROP POLICY IF EXISTS "Users can read own user record" ON users;
DROP POLICY IF EXISTS "Users can update own preferred_language" ON users;
DROP POLICY IF EXISTS "Admins can read all participants" ON participants;
DROP POLICY IF EXISTS "Volunteers can read all participants" ON participants;
DROP POLICY IF EXISTS "Participants can read own participant record" ON participants;
DROP POLICY IF EXISTS "Admins can insert participants" ON participants;
DROP POLICY IF EXISTS "Admins can update participants" ON participants;
DROP POLICY IF EXISTS "Participants can update own profile photo" ON participants;
DROP POLICY IF EXISTS "Admins can delete participants" ON participants;
DROP POLICY IF EXISTS "Admins can insert sessions" ON sessions;
DROP POLICY IF EXISTS "Admins can update sessions" ON sessions;
DROP POLICY IF EXISTS "Admins can delete sessions" ON sessions;
DROP POLICY IF EXISTS "Authenticated users can read sessions" ON sessions;
DROP POLICY IF EXISTS "Admins can read all session_participants" ON session_participants;
DROP POLICY IF EXISTS "Volunteers can read all session_participants" ON session_participants;
DROP POLICY IF EXISTS "Participants can read own session_participants" ON session_participants;
DROP POLICY IF EXISTS "Admins can insert session_participants" ON session_participants;
DROP POLICY IF EXISTS "Volunteers can insert session_participants" ON session_participants;
DROP POLICY IF EXISTS "Participants can sign up for sessions" ON session_participants;
DROP POLICY IF EXISTS "Admins can update session_participants" ON session_participants;
DROP POLICY IF EXISTS "Volunteers can update session_participants" ON session_participants;
DROP POLICY IF EXISTS "Admins can delete session_participants" ON session_participants;
DROP POLICY IF EXISTS "Volunteers can delete session_participants" ON session_participants;
DROP POLICY IF EXISTS "Participants can cancel own signups" ON session_participants;
DROP POLICY IF EXISTS "Admins can manage levels" ON levels;
DROP POLICY IF EXISTS "Authenticated users can read levels" ON levels;
DROP POLICY IF EXISTS "Admins can manage skills" ON skills;
DROP POLICY IF EXISTS "Authenticated users can read skills" ON skills;
DROP POLICY IF EXISTS "participant_progress_select" ON participant_progress;
DROP POLICY IF EXISTS "participant_progress_insert" ON participant_progress;
DROP POLICY IF EXISTS "participant_progress_update" ON participant_progress;
DROP POLICY IF EXISTS "participant_progress_delete" ON participant_progress;
DROP POLICY IF EXISTS "Admins can manage gear_types" ON gear_types;
DROP POLICY IF EXISTS "Authenticated users can read gear_types" ON gear_types;
DROP POLICY IF EXISTS "Admins can manage gear_inventory" ON gear_inventory;
DROP POLICY IF EXISTS "Authenticated users can read gear_inventory" ON gear_inventory;
DROP POLICY IF EXISTS "Admins can manage gear_assignments" ON gear_assignments;

-- ============================================================================
-- CREATE SECURITY DEFINER HELPER FUNCTIONS
-- These bypass RLS to avoid infinite recursion
-- ============================================================================

DROP FUNCTION IF EXISTS is_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS is_volunteer(uuid) CASCADE;

CREATE FUNCTION is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE((SELECT role = 'admin' FROM users WHERE id = user_id), false);
$$;

CREATE FUNCTION is_volunteer(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE((SELECT role = 'volunteer' FROM users WHERE id = user_id), false);
$$;

-- ============================================================================
-- RECREATE USERS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Users can read own user record"
  ON users FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins can read all users"
  ON users FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert users"
  ON users FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update users"
  ON users FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can update own preferred_language"
  ON users FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================================
-- RECREATE PARTICIPANTS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Participants can read own participant record"
  ON participants FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all participants"
  ON participants FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Volunteers can read all participants"
  ON participants FOR SELECT TO authenticated
  USING (is_volunteer(auth.uid()));

CREATE POLICY "Admins can insert participants"
  ON participants FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update participants"
  ON participants FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Participants can update own profile photo"
  ON participants FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can delete participants"
  ON participants FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

-- ============================================================================
-- RECREATE SESSIONS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Authenticated users can read sessions"
  ON sessions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can insert sessions"
  ON sessions FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update sessions"
  ON sessions FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete sessions"
  ON sessions FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

-- ============================================================================
-- RECREATE SESSION_PARTICIPANTS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Participants can read own session_participants"
  ON session_participants FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM participants p WHERE p.id = session_participants.participant_id AND p.user_id = auth.uid()));

CREATE POLICY "Admins can read all session_participants"
  ON session_participants FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Volunteers can read all session_participants"
  ON session_participants FOR SELECT TO authenticated
  USING (is_volunteer(auth.uid()));

CREATE POLICY "Participants can sign up for sessions"
  ON session_participants FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM participants p WHERE p.id = session_participants.participant_id AND p.user_id = auth.uid())
    AND status = 'signed_up'
  );

CREATE POLICY "Participants can insert self-reported attendance"
  ON session_participants FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM participants p WHERE p.id = session_participants.participant_id AND p.user_id = auth.uid())
    AND status = 'self_reported'
  );

CREATE POLICY "Participants can update own session_participants"
  ON session_participants FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM participants p WHERE p.id = session_participants.participant_id AND p.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM participants p WHERE p.id = session_participants.participant_id AND p.user_id = auth.uid())
    AND status IN ('self_reported','signed_up')
  );

CREATE POLICY "Admins can insert session_participants"
  ON session_participants FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Volunteers can insert session_participants"
  ON session_participants FOR INSERT TO authenticated
  WITH CHECK (is_volunteer(auth.uid()));

CREATE POLICY "Admins can update session_participants"
  ON session_participants FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Volunteers can update session_participants"
  ON session_participants FOR UPDATE TO authenticated
  USING (is_volunteer(auth.uid()))
  WITH CHECK (is_volunteer(auth.uid()));

CREATE POLICY "Participants can cancel own signups"
  ON session_participants FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM participants p WHERE p.id = session_participants.participant_id AND p.user_id = auth.uid())
    AND status = 'signed_up'
  );

CREATE POLICY "Admins can delete session_participants"
  ON session_participants FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Volunteers can delete session_participants"
  ON session_participants FOR DELETE TO authenticated
  USING (is_volunteer(auth.uid()));

-- ============================================================================
-- RECREATE LEVELS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Authenticated users can read levels"
  ON levels FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage levels"
  ON levels FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- ============================================================================
-- RECREATE SKILLS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Authenticated users can read skills"
  ON skills FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage skills"
  ON skills FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- ============================================================================
-- RECREATE PARTICIPANT_PROGRESS TABLE POLICIES
-- ============================================================================

CREATE POLICY "participant_progress_select"
  ON participant_progress FOR SELECT TO authenticated
  USING (
    is_admin(auth.uid()) OR
    is_volunteer(auth.uid()) OR
    EXISTS (SELECT 1 FROM participants WHERE participants.id = participant_progress.participant_id AND participants.user_id = auth.uid())
  );

CREATE POLICY "participant_progress_insert"
  ON participant_progress FOR INSERT TO authenticated
  WITH CHECK (
    is_admin(auth.uid()) OR
    is_volunteer(auth.uid()) OR
    EXISTS (SELECT 1 FROM participants WHERE participants.id = participant_progress.participant_id AND participants.user_id = auth.uid())
  );

CREATE POLICY "participant_progress_update"
  ON participant_progress FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()) OR is_volunteer(auth.uid()))
  WITH CHECK (is_admin(auth.uid()) OR is_volunteer(auth.uid()));

CREATE POLICY "participant_progress_delete"
  ON participant_progress FOR DELETE TO authenticated
  USING (is_admin(auth.uid()) OR is_volunteer(auth.uid()));

-- ============================================================================
-- RECREATE GEAR_TYPES TABLE POLICIES
-- ============================================================================

CREATE POLICY "Authenticated users can read gear_types"
  ON gear_types FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage gear_types"
  ON gear_types FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- ============================================================================
-- RECREATE GEAR_INVENTORY TABLE POLICIES
-- ============================================================================

CREATE POLICY "Authenticated users can read gear_inventory"
  ON gear_inventory FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage gear_inventory"
  ON gear_inventory FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- ============================================================================
-- RECREATE GEAR_ASSIGNMENTS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Admins can manage gear_assignments"
  ON gear_assignments FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

COMMIT;
