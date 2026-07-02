-- Fixes for admin user detail persistence visibility and profile photo uploads.
-- 1) Allow authenticated users to read new user detail tables via table grants.
-- 2) Allow admin-level users to upload/update/delete profile photos for any user path.

BEGIN;

-- Table grants are required before RLS/SECURITY DEFINER checks are evaluated.
GRANT SELECT ON TABLE user_profiles TO authenticated;
GRANT SELECT ON TABLE user_form_submissions TO authenticated;
GRANT SELECT ON TABLE user_file_uploads TO authenticated;
GRANT SELECT ON TABLE user_roles TO authenticated;

-- Ensure admins can manage profile photos for any user folder (not only their own auth.uid folder).
DROP POLICY IF EXISTS "Admin-level can upload profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Admin-level can update profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Admin-level can delete profile photos" ON storage.objects;

CREATE POLICY "Admin-level can upload profile photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND is_admin_level(auth.uid())
  );

CREATE POLICY "Admin-level can update profile photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND is_admin_level(auth.uid())
  )
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND is_admin_level(auth.uid())
  );

CREATE POLICY "Admin-level can delete profile photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND is_admin_level(auth.uid())
  );

COMMIT;
