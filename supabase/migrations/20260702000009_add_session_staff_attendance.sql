BEGIN;

CREATE TABLE IF NOT EXISTS session_staff_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'signed_up' CHECK (status IN ('signed_up', 'present')),
  signed_up_at timestamptz NOT NULL DEFAULT now(),
  marked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, user_id)
);

ALTER TABLE session_staff_attendance ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE session_staff_attendance TO authenticated;

DROP POLICY IF EXISTS "Employees and admins can read staff attendance" ON session_staff_attendance;
DROP POLICY IF EXISTS "Employees and admins can insert own staff attendance" ON session_staff_attendance;
DROP POLICY IF EXISTS "Employees and admins can update own staff attendance" ON session_staff_attendance;
DROP POLICY IF EXISTS "Employees and admins can delete own staff attendance" ON session_staff_attendance;

CREATE POLICY "Employees and admins can read staff attendance"
  ON session_staff_attendance FOR SELECT TO authenticated
  USING (is_employee_level(auth.uid()) OR is_admin_level(auth.uid()) OR user_id = auth.uid());

CREATE POLICY "Employees and admins can insert own staff attendance"
  ON session_staff_attendance FOR INSERT TO authenticated
  WITH CHECK ((is_employee_level(auth.uid()) OR is_admin_level(auth.uid())) AND user_id = auth.uid());

CREATE POLICY "Employees and admins can update own staff attendance"
  ON session_staff_attendance FOR UPDATE TO authenticated
  USING ((is_employee_level(auth.uid()) OR is_admin_level(auth.uid())) AND user_id = auth.uid())
  WITH CHECK ((is_employee_level(auth.uid()) OR is_admin_level(auth.uid())) AND user_id = auth.uid());

CREATE POLICY "Employees and admins can delete own staff attendance"
  ON session_staff_attendance FOR DELETE TO authenticated
  USING ((is_employee_level(auth.uid()) OR is_admin_level(auth.uid())) AND user_id = auth.uid());

COMMIT;