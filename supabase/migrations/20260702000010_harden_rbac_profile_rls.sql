-- Harden RBAC/profile/forms/files tables with explicit RLS and least-privilege grants.
-- This closes exposure where newer tables were created without RLS enabled.

BEGIN;

-- ---------------------------------------------------------------------------
-- Ensure RLS is enabled on all RBAC/profile/form/file tables
-- ---------------------------------------------------------------------------

ALTER TABLE access_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_access_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_form_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_file_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_file_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_migration_issues ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Restrict base table grants for authenticated users
-- ---------------------------------------------------------------------------

REVOKE ALL ON TABLE access_levels FROM authenticated;
REVOKE ALL ON TABLE business_roles FROM authenticated;
REVOKE ALL ON TABLE role_access_levels FROM authenticated;
REVOKE ALL ON TABLE user_roles FROM authenticated;
REVOKE ALL ON TABLE user_profiles FROM authenticated;
REVOKE ALL ON TABLE form_definitions FROM authenticated;
REVOKE ALL ON TABLE role_form_requirements FROM authenticated;
REVOKE ALL ON TABLE user_form_submissions FROM authenticated;
REVOKE ALL ON TABLE file_definitions FROM authenticated;
REVOKE ALL ON TABLE role_file_requirements FROM authenticated;
REVOKE ALL ON TABLE user_file_uploads FROM authenticated;
REVOKE ALL ON TABLE role_migration_issues FROM authenticated;

-- Read grants needed by existing app UI paths. Writes are intentionally not
-- granted to authenticated; server-side admin client handles writes.
GRANT SELECT ON TABLE access_levels TO authenticated;
GRANT SELECT ON TABLE business_roles TO authenticated;
GRANT SELECT ON TABLE role_access_levels TO authenticated;
GRANT SELECT ON TABLE user_roles TO authenticated;
GRANT SELECT ON TABLE user_profiles TO authenticated;
GRANT SELECT ON TABLE form_definitions TO authenticated;
GRANT SELECT ON TABLE role_form_requirements TO authenticated;
GRANT SELECT ON TABLE user_form_submissions TO authenticated;
GRANT SELECT ON TABLE file_definitions TO authenticated;
GRANT SELECT ON TABLE role_file_requirements TO authenticated;
GRANT SELECT ON TABLE user_file_uploads TO authenticated;

-- ---------------------------------------------------------------------------
-- Drop prior permissive policies where present
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated can read role form requirements" ON role_form_requirements;
DROP POLICY IF EXISTS "Authenticated can read role file requirements" ON role_file_requirements;
DROP POLICY IF EXISTS "Authenticated can read form definitions" ON form_definitions;
DROP POLICY IF EXISTS "Authenticated can read file definitions" ON file_definitions;

-- ---------------------------------------------------------------------------
-- Catalog tables
-- ---------------------------------------------------------------------------

CREATE POLICY "Authenticated can read access_levels"
  ON access_levels FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated can read business_roles"
  ON business_roles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated can read role_access_levels"
  ON role_access_levels FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated can read form_definitions"
  ON form_definitions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated can read file_definitions"
  ON file_definitions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated can read role_form_requirements"
  ON role_form_requirements FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated can read role_file_requirements"
  ON role_file_requirements FOR SELECT TO authenticated
  USING (true);

-- Admin-only catalog management
CREATE POLICY "Admin-level can manage access_levels"
  ON access_levels FOR ALL TO authenticated
  USING (is_admin_level(auth.uid()))
  WITH CHECK (is_admin_level(auth.uid()));

CREATE POLICY "Admin-level can manage business_roles"
  ON business_roles FOR ALL TO authenticated
  USING (is_admin_level(auth.uid()))
  WITH CHECK (is_admin_level(auth.uid()));

CREATE POLICY "Admin-level can manage role_access_levels"
  ON role_access_levels FOR ALL TO authenticated
  USING (is_admin_level(auth.uid()))
  WITH CHECK (is_admin_level(auth.uid()));

CREATE POLICY "Admin-level can manage form_definitions"
  ON form_definitions FOR ALL TO authenticated
  USING (is_admin_level(auth.uid()))
  WITH CHECK (is_admin_level(auth.uid()));

CREATE POLICY "Admin-level can manage file_definitions"
  ON file_definitions FOR ALL TO authenticated
  USING (is_admin_level(auth.uid()))
  WITH CHECK (is_admin_level(auth.uid()));

CREATE POLICY "Admin-level can manage role_form_requirements"
  ON role_form_requirements FOR ALL TO authenticated
  USING (is_admin_level(auth.uid()))
  WITH CHECK (is_admin_level(auth.uid()));

CREATE POLICY "Admin-level can manage role_file_requirements"
  ON role_file_requirements FOR ALL TO authenticated
  USING (is_admin_level(auth.uid()))
  WITH CHECK (is_admin_level(auth.uid()));

-- ---------------------------------------------------------------------------
-- user_roles: own-read + admin manage
-- ---------------------------------------------------------------------------

CREATE POLICY "Users can read own user_roles"
  ON user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admin-level can read all user_roles"
  ON user_roles FOR SELECT TO authenticated
  USING (is_admin_level(auth.uid()));

CREATE POLICY "Admin-level can manage user_roles"
  ON user_roles FOR ALL TO authenticated
  USING (is_admin_level(auth.uid()))
  WITH CHECK (is_admin_level(auth.uid()));

-- ---------------------------------------------------------------------------
-- user_profiles: own-read + admin manage
-- ---------------------------------------------------------------------------

CREATE POLICY "Users can read own user_profiles"
  ON user_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admin-level can read all user_profiles"
  ON user_profiles FOR SELECT TO authenticated
  USING (is_admin_level(auth.uid()));

CREATE POLICY "Admin-level can manage user_profiles"
  ON user_profiles FOR ALL TO authenticated
  USING (is_admin_level(auth.uid()))
  WITH CHECK (is_admin_level(auth.uid()));

-- ---------------------------------------------------------------------------
-- user_form_submissions: own-read + admin manage
-- ---------------------------------------------------------------------------

CREATE POLICY "Users can read own user_form_submissions"
  ON user_form_submissions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admin-level can read all user_form_submissions"
  ON user_form_submissions FOR SELECT TO authenticated
  USING (is_admin_level(auth.uid()));

CREATE POLICY "Admin-level can manage user_form_submissions"
  ON user_form_submissions FOR ALL TO authenticated
  USING (is_admin_level(auth.uid()))
  WITH CHECK (is_admin_level(auth.uid()));

-- ---------------------------------------------------------------------------
-- user_file_uploads: own-read + admin manage
-- ---------------------------------------------------------------------------

CREATE POLICY "Users can read own user_file_uploads"
  ON user_file_uploads FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admin-level can read all user_file_uploads"
  ON user_file_uploads FOR SELECT TO authenticated
  USING (is_admin_level(auth.uid()));

CREATE POLICY "Admin-level can manage user_file_uploads"
  ON user_file_uploads FOR ALL TO authenticated
  USING (is_admin_level(auth.uid()))
  WITH CHECK (is_admin_level(auth.uid()));

-- ---------------------------------------------------------------------------
-- role_migration_issues: admin-only
-- ---------------------------------------------------------------------------

CREATE POLICY "Admin-level can read role_migration_issues"
  ON role_migration_issues FOR SELECT TO authenticated
  USING (is_admin_level(auth.uid()));

CREATE POLICY "Admin-level can manage role_migration_issues"
  ON role_migration_issues FOR ALL TO authenticated
  USING (is_admin_level(auth.uid()))
  WITH CHECK (is_admin_level(auth.uid()));

COMMIT;
