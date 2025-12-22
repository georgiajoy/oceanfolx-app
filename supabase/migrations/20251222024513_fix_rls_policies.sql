/*
  # Fix RLS Policies for Users Table

  ## Changes
  - Remove circular dependency in users table policies
  - Store role in auth.users metadata for policy checks
  - Update policies to use auth metadata instead of querying users table
  
  ## Security
  - Maintains same security model but avoids recursive queries
  - Users can still only access their own data
  - Admins have full access based on metadata
*/

-- First, drop the problematic policies
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;

DROP POLICY IF EXISTS "Admins can read all participants" ON participants;
DROP POLICY IF EXISTS "Admins can insert participants" ON participants;
DROP POLICY IF EXISTS "Admins can update participants" ON participants;
DROP POLICY IF EXISTS "Admins can delete participants" ON participants;

DROP POLICY IF EXISTS "Admins can insert sessions" ON sessions;
DROP POLICY IF EXISTS "Admins can update sessions" ON sessions;
DROP POLICY IF EXISTS "Admins can delete sessions" ON sessions;

DROP POLICY IF EXISTS "Admins can read all attendance" ON attendance;
DROP POLICY IF EXISTS "Admins can insert attendance" ON attendance;
DROP POLICY IF EXISTS "Admins can update attendance" ON attendance;

DROP POLICY IF EXISTS "Admins can insert levels" ON levels;
DROP POLICY IF EXISTS "Admins can update levels" ON levels;
DROP POLICY IF EXISTS "Admins can delete levels" ON levels;

DROP POLICY IF EXISTS "Admins can insert skills" ON skills;
DROP POLICY IF EXISTS "Admins can update skills" ON skills;
DROP POLICY IF EXISTS "Admins can delete skills" ON skills;

DROP POLICY IF EXISTS "Admins can read all participant_skills" ON participant_skills;
DROP POLICY IF EXISTS "Admins can insert participant_skills" ON participant_skills;
DROP POLICY IF EXISTS "Admins can update participant_skills" ON participant_skills;

-- Update auth.users to include role in raw_app_meta_data
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{role}',
  to_jsonb(u.role)
)
FROM users u
WHERE auth.users.id = u.id;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user is volunteer
CREATE OR REPLACE FUNCTION is_volunteer()
RETURNS boolean AS $$
BEGIN
  RETURN COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'volunteer',
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate users policies without circular dependency
CREATE POLICY "Admins can read all users"
  ON users FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update users"
  ON users FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Recreate participants policies
CREATE POLICY "Admins can read all participants"
  ON participants FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert participants"
  ON participants FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update participants"
  ON participants FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete participants"
  ON participants FOR DELETE
  TO authenticated
  USING (is_admin());

-- Recreate sessions policies
CREATE POLICY "Admins can insert sessions"
  ON sessions FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update sessions"
  ON sessions FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete sessions"
  ON sessions FOR DELETE
  TO authenticated
  USING (is_admin());

-- Recreate attendance policies
CREATE POLICY "Admins can read all attendance"
  ON attendance FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert attendance"
  ON attendance FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update attendance"
  ON attendance FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Recreate levels policies
CREATE POLICY "Admins can insert levels"
  ON levels FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update levels"
  ON levels FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete levels"
  ON levels FOR DELETE
  TO authenticated
  USING (is_admin());

-- Recreate skills policies
CREATE POLICY "Admins can insert skills"
  ON skills FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update skills"
  ON skills FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete skills"
  ON skills FOR DELETE
  TO authenticated
  USING (is_admin());

-- Recreate participant_skills policies
CREATE POLICY "Admins can read all participant_skills"
  ON participant_skills FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert participant_skills"
  ON participant_skills FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update participant_skills"
  ON participant_skills FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Update volunteer policies to use function
DROP POLICY IF EXISTS "Volunteers can read all participants" ON participants;
CREATE POLICY "Volunteers can read all participants"
  ON participants FOR SELECT
  TO authenticated
  USING (is_volunteer());

DROP POLICY IF EXISTS "Volunteers can read all attendance" ON attendance;
CREATE POLICY "Volunteers can read all attendance"
  ON attendance FOR SELECT
  TO authenticated
  USING (is_volunteer());

DROP POLICY IF EXISTS "Volunteers can insert attendance" ON attendance;
CREATE POLICY "Volunteers can insert attendance"
  ON attendance FOR INSERT
  TO authenticated
  WITH CHECK (is_volunteer());

DROP POLICY IF EXISTS "Volunteers can update attendance" ON attendance;
CREATE POLICY "Volunteers can update attendance"
  ON attendance FOR UPDATE
  TO authenticated
  USING (is_volunteer())
  WITH CHECK (is_volunteer());

DROP POLICY IF EXISTS "Volunteers can read all participant_skills" ON participant_skills;
CREATE POLICY "Volunteers can read all participant_skills"
  ON participant_skills FOR SELECT
  TO authenticated
  USING (is_volunteer());

DROP POLICY IF EXISTS "Volunteers can insert participant_skills" ON participant_skills;
CREATE POLICY "Volunteers can insert participant_skills"
  ON participant_skills FOR INSERT
  TO authenticated
  WITH CHECK (is_volunteer());

DROP POLICY IF EXISTS "Volunteers can update participant_skills" ON participant_skills;
CREATE POLICY "Volunteers can update participant_skills"
  ON participant_skills FOR UPDATE
  TO authenticated
  USING (is_volunteer())
  WITH CHECK (is_volunteer());

-- Create trigger to sync role changes to auth.users metadata
CREATE OR REPLACE FUNCTION sync_user_role_to_auth()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{role}',
    to_jsonb(NEW.role)
  )
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS sync_user_role_trigger ON users;
CREATE TRIGGER sync_user_role_trigger
AFTER INSERT OR UPDATE OF role ON users
FOR EACH ROW
EXECUTE FUNCTION sync_user_role_to_auth();
