-- Fix employee/local leader access gaps:
-- 1) Allow employee-level users to remove session participants (attendance undo/remove)
-- 2) Allow employee-level users to read participant progress (levels/skills visibility)

BEGIN;

CREATE POLICY "Employee-level can delete session_participants"
  ON session_participants FOR DELETE TO authenticated
  USING (is_employee_level(auth.uid()));

CREATE POLICY "Employee-level can read participant_progress"
  ON participant_progress FOR SELECT TO authenticated
  USING (is_employee_level(auth.uid()));

COMMIT;
