-- Add access-level based RLS policies to support new RBAC architecture.
-- Additive and compatibility-safe: this does not remove legacy role policies yet.

BEGIN;

-- ---------------------------------------------------------------------------
-- Access-level helper functions (idempotent)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION is_participant_level(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT get_user_access_level(user_id) = 'participant';
$$;

CREATE OR REPLACE FUNCTION is_employee_level(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT get_user_access_level(user_id) = 'employee';
$$;

CREATE OR REPLACE FUNCTION is_admin_level(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT get_user_access_level(user_id) = 'admin';
$$;

-- ---------------------------------------------------------------------------
-- USERS table policies
-- ---------------------------------------------------------------------------

CREATE POLICY "Admin-level can read all users"
  ON users FOR SELECT TO authenticated
  USING (is_admin_level(auth.uid()));

CREATE POLICY "Employee-level can read all users"
  ON users FOR SELECT TO authenticated
  USING (is_employee_level(auth.uid()));

CREATE POLICY "Admin-level can insert users"
  ON users FOR INSERT TO authenticated
  WITH CHECK (is_admin_level(auth.uid()));

CREATE POLICY "Admin-level can update users"
  ON users FOR UPDATE TO authenticated
  USING (is_admin_level(auth.uid()))
  WITH CHECK (is_admin_level(auth.uid()));

-- ---------------------------------------------------------------------------
-- PARTICIPANTS table policies
-- ---------------------------------------------------------------------------

CREATE POLICY "Admin-level can read all participants"
  ON participants FOR SELECT TO authenticated
  USING (is_admin_level(auth.uid()));

CREATE POLICY "Employee-level can read all participants"
  ON participants FOR SELECT TO authenticated
  USING (is_employee_level(auth.uid()));

CREATE POLICY "Admin-level can insert participants"
  ON participants FOR INSERT TO authenticated
  WITH CHECK (is_admin_level(auth.uid()));

CREATE POLICY "Admin-level can update participants"
  ON participants FOR UPDATE TO authenticated
  USING (is_admin_level(auth.uid()))
  WITH CHECK (is_admin_level(auth.uid()));

CREATE POLICY "Admin-level can delete participants"
  ON participants FOR DELETE TO authenticated
  USING (is_admin_level(auth.uid()));

-- ---------------------------------------------------------------------------
-- SESSION_PARTICIPANTS table policies
-- ---------------------------------------------------------------------------

CREATE POLICY "Admin-level can read all session_participants"
  ON session_participants FOR SELECT TO authenticated
  USING (is_admin_level(auth.uid()));

CREATE POLICY "Employee-level can read all session_participants"
  ON session_participants FOR SELECT TO authenticated
  USING (is_employee_level(auth.uid()));

CREATE POLICY "Admin-level can insert session_participants"
  ON session_participants FOR INSERT TO authenticated
  WITH CHECK (is_admin_level(auth.uid()));

CREATE POLICY "Employee-level can insert session_participants"
  ON session_participants FOR INSERT TO authenticated
  WITH CHECK (is_employee_level(auth.uid()));

CREATE POLICY "Admin-level can update session_participants"
  ON session_participants FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (is_admin_level(auth.uid()));

CREATE POLICY "Employee-level can update self_reported session_participants"
  ON session_participants FOR UPDATE TO authenticated
  USING (is_employee_level(auth.uid()))
  WITH CHECK (is_employee_level(auth.uid()) AND status = 'self_reported');

CREATE POLICY "Admin-level can delete session_participants"
  ON session_participants FOR DELETE TO authenticated
  USING (is_admin_level(auth.uid()));

-- ---------------------------------------------------------------------------
-- Core admin-managed tables
-- ---------------------------------------------------------------------------

CREATE POLICY "Admin-level can insert sessions"
  ON sessions FOR INSERT TO authenticated
  WITH CHECK (is_admin_level(auth.uid()));

CREATE POLICY "Admin-level can update sessions"
  ON sessions FOR UPDATE TO authenticated
  USING (is_admin_level(auth.uid()))
  WITH CHECK (is_admin_level(auth.uid()));

CREATE POLICY "Admin-level can delete sessions"
  ON sessions FOR DELETE TO authenticated
  USING (is_admin_level(auth.uid()));

CREATE POLICY "Admin-level can manage levels"
  ON levels FOR ALL TO authenticated
  USING (is_admin_level(auth.uid()))
  WITH CHECK (is_admin_level(auth.uid()));

CREATE POLICY "Admin-level can manage skills"
  ON skills FOR ALL TO authenticated
  USING (is_admin_level(auth.uid()))
  WITH CHECK (is_admin_level(auth.uid()));

CREATE POLICY "Admin-level can manage participant_progress"
  ON participant_progress FOR ALL TO authenticated
  USING (is_admin_level(auth.uid()))
  WITH CHECK (is_admin_level(auth.uid()));

CREATE POLICY "Admin-level can manage gear_types"
  ON gear_types FOR ALL TO authenticated
  USING (is_admin_level(auth.uid()))
  WITH CHECK (is_admin_level(auth.uid()));

CREATE POLICY "Admin-level can manage gear_inventory"
  ON gear_inventory FOR ALL TO authenticated
  USING (is_admin_level(auth.uid()))
  WITH CHECK (is_admin_level(auth.uid()));

CREATE POLICY "Admin-level can manage gear_assignments"
  ON gear_assignments FOR ALL TO authenticated
  USING (is_admin_level(auth.uid()))
  WITH CHECK (is_admin_level(auth.uid()));

-- ---------------------------------------------------------------------------
-- Lesson notes alignment
-- ---------------------------------------------------------------------------

CREATE POLICY "Admin-level can read all lesson_notes"
  ON lesson_notes FOR SELECT TO authenticated
  USING (is_admin_level(auth.uid()));

CREATE POLICY "Employee-level can read lesson_notes"
  ON lesson_notes FOR SELECT TO authenticated
  USING (is_employee_level(auth.uid()));

CREATE POLICY "Admin-level can insert lesson_notes"
  ON lesson_notes FOR INSERT TO authenticated
  WITH CHECK (is_admin_level(auth.uid()) AND author_user_id = auth.uid());

CREATE POLICY "Employee-level can insert lesson_notes"
  ON lesson_notes FOR INSERT TO authenticated
  WITH CHECK (is_employee_level(auth.uid()) AND author_user_id = auth.uid());

CREATE POLICY "Admin-level can delete lesson_notes"
  ON lesson_notes FOR DELETE TO authenticated
  USING (is_admin_level(auth.uid()));

COMMIT;
