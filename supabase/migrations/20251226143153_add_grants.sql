-- ============================================================================
-- GRANT TABLE PERMISSIONS TO AUTHENTICATED ROLE
-- ============================================================================
-- This migration grants base table permissions to the authenticated role.
-- Without these grants, Row Level Security (RLS) policies cannot function
-- because PostgreSQL requires table-level permissions before evaluating
-- row-level policies.
--
-- The 'authenticated' role is assigned to all logged-in users. These grants
-- allow authenticated users to attempt SELECT, INSERT, UPDATE, and DELETE
-- operations on the tables. The actual row-level access is then controlled
-- by the RLS policies defined in 000001_init_schema.sql.
--
-- Why this is needed:
-- - PostgreSQL permission model has two layers: table-level and row-level
-- - Table-level: GRANT statements (this file) - "Can you access the table?"
-- - Row-level: RLS policies - "Which rows can you see/modify?"
-- - Both layers must pass for a query to succeed
-- ============================================================================

GRANT ALL ON users TO authenticated;
GRANT ALL ON participants TO authenticated;
GRANT ALL ON sessions TO authenticated;
GRANT ALL ON session_participants TO authenticated;
GRANT ALL ON levels TO authenticated;
GRANT ALL ON skills TO authenticated;
GRANT ALL ON participant_progress TO authenticated;
GRANT ALL ON gear_types TO authenticated;
GRANT ALL ON gear_inventory TO authenticated;
GRANT ALL ON gear_assignments TO authenticated;