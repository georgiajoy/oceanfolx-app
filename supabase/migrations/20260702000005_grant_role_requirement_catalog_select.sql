-- Grant authenticated users access to the role requirement catalog tables.
-- RLS policies alone are not enough; PostgreSQL also needs table-level privileges.

BEGIN;

GRANT SELECT ON role_form_requirements TO authenticated;
GRANT SELECT ON role_file_requirements TO authenticated;
GRANT SELECT ON form_definitions TO authenticated;
GRANT SELECT ON file_definitions TO authenticated;

COMMIT;
