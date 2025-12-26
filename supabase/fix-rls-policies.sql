-- Fix infinite recursion in RLS policies using SECURITY DEFINER functions
-- These functions bypass RLS because they execute with elevated privileges
-- Run this in your Supabase SQL Editor to apply the fixes

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
