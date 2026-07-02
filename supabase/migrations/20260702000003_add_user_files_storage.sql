-- Add storage bucket and policies for role-based required user files.

BEGIN;

INSERT INTO storage.buckets (id, name, public)
VALUES ('user-files', 'user-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admin-level can upload user files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'user-files'
    AND is_admin_level(auth.uid())
  );

CREATE POLICY "Admin-level can update user files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'user-files'
    AND is_admin_level(auth.uid())
  )
  WITH CHECK (
    bucket_id = 'user-files'
    AND is_admin_level(auth.uid())
  );

CREATE POLICY "Admin-level can delete user files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'user-files'
    AND is_admin_level(auth.uid())
  );

CREATE POLICY "Authenticated can view user files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'user-files');

COMMIT;
