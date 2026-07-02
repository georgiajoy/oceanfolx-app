-- Allow authenticated users to read the role requirement catalogs used by the admin UI.

BEGIN;

CREATE POLICY "Authenticated can read role form requirements"
  ON role_form_requirements FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated can read role file requirements"
  ON role_file_requirements FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated can read form definitions"
  ON form_definitions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated can read file definitions"
  ON file_definitions FOR SELECT TO authenticated
  USING (true);

COMMIT;