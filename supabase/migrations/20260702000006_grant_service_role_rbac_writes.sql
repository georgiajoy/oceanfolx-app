-- Ensure server-side admin workflows can write/read new RBAC/profile tables.
-- Service role bypasses RLS, but still requires table-level grants.

BEGIN;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE user_roles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE user_profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE user_form_submissions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE user_file_uploads TO service_role;

COMMIT;
