/*
  # Simplify RLS Policies

  ## Changes
  - Replace function calls with direct JWT checks
  - Ensure policies work with authenticated users
  - Fix any issues with policy evaluation
  
  ## Security
  - Same security model, more reliable implementation
*/

-- Drop all existing admin/volunteer policies that use functions
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;

DROP POLICY IF EXISTS "Admins can read all participants" ON participants;
DROP POLICY IF EXISTS "Admins can insert participants" ON participants;
DROP POLICY IF EXISTS "Admins can update participants" ON participants;
DROP POLICY IF EXISTS "Admins can delete participants" ON participants;

DROP POLICY IF EXISTS "Volunteers can read all participants" ON participants;

DROP POLICY IF EXISTS "Admins can insert sessions" ON sessions;
DROP POLICY IF EXISTS "Admins can update sessions" ON sessions;
DROP POLICY IF EXISTS "Admins can delete sessions" ON sessions;

DROP POLICY IF EXISTS "Admins can read all attendance" ON attendance;
DROP POLICY IF EXISTS "Admins can insert attendance" ON attendance;
DROP POLICY IF EXISTS "Admins can update attendance" ON attendance;

DROP POLICY IF EXISTS "Volunteers can read all attendance" ON attendance;
DROP POLICY IF EXISTS "Volunteers can insert attendance" ON attendance;
DROP POLICY IF EXISTS "Volunteers can update attendance" ON attendance;

DROP POLICY IF EXISTS "Admins can insert levels" ON levels;
DROP POLICY IF EXISTS "Admins can update levels" ON levels;
DROP POLICY IF EXISTS "Admins can delete levels" ON levels;

DROP POLICY IF EXISTS "Admins can insert skills" ON skills;
DROP POLICY IF EXISTS "Admins can update skills" ON skills;
DROP POLICY IF EXISTS "Admins can delete skills" ON skills;

DROP POLICY IF EXISTS "Admins can read all participant_skills" ON participant_skills;
DROP POLICY IF EXISTS "Admins can insert participant_skills" ON participant_skills;
DROP POLICY IF EXISTS "Admins can update participant_skills" ON participant_skills;

DROP POLICY IF EXISTS "Volunteers can read all participant_skills" ON participant_skills;
DROP POLICY IF EXISTS "Volunteers can insert participant_skills" ON participant_skills;
DROP POLICY IF EXISTS "Volunteers can update participant_skills" ON participant_skills;

-- Users table policies
CREATE POLICY "Admins can read all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Admins can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Admins can update users"
  ON users FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Participants table policies
CREATE POLICY "Admins can read all participants"
  ON participants FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Volunteers can read all participants"
  ON participants FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'volunteer'
  );

CREATE POLICY "Admins can insert participants"
  ON participants FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Admins can update participants"
  ON participants FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can delete participants"
  ON participants FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Sessions table policies
CREATE POLICY "Admins can insert sessions"
  ON sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Admins can update sessions"
  ON sessions FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can delete sessions"
  ON sessions FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Attendance table policies
CREATE POLICY "Admins can read all attendance"
  ON attendance FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Volunteers can read all attendance"
  ON attendance FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'volunteer'
  );

CREATE POLICY "Admins can insert attendance"
  ON attendance FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Volunteers can insert attendance"
  ON attendance FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'volunteer'
  );

CREATE POLICY "Admins can update attendance"
  ON attendance FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Volunteers can update attendance"
  ON attendance FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'volunteer')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'volunteer');

-- Levels table policies
CREATE POLICY "Admins can insert levels"
  ON levels FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Admins can update levels"
  ON levels FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can delete levels"
  ON levels FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Skills table policies
CREATE POLICY "Admins can insert skills"
  ON skills FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Admins can update skills"
  ON skills FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can delete skills"
  ON skills FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Participant skills table policies
CREATE POLICY "Admins can read all participant_skills"
  ON participant_skills FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Volunteers can read all participant_skills"
  ON participant_skills FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'volunteer'
  );

CREATE POLICY "Admins can insert participant_skills"
  ON participant_skills FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Volunteers can insert participant_skills"
  ON participant_skills FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'volunteer'
  );

CREATE POLICY "Admins can update participant_skills"
  ON participant_skills FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Volunteers can update participant_skills"
  ON participant_skills FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'volunteer')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'volunteer');
