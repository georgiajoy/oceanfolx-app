-- Allow authenticated users to access lesson_notes table so RLS policies can apply.

BEGIN;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE lesson_notes TO authenticated;

COMMIT;
