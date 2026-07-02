BEGIN;

DROP POLICY IF EXISTS "Employees and admins can insert own staff attendance" ON session_staff_attendance;

CREATE POLICY "Employees and admins can insert eligible staff attendance"
  ON session_staff_attendance FOR INSERT TO authenticated
  WITH CHECK (
    (is_employee_level(auth.uid()) OR is_admin_level(auth.uid()))
    AND get_user_access_level(user_id) IN ('employee', 'admin')
  );

CREATE POLICY "Employees and admins can read all user_roles"
  ON user_roles FOR SELECT TO authenticated
  USING (is_employee_level(auth.uid()) OR is_admin_level(auth.uid()));

COMMIT;