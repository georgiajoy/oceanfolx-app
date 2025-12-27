-- ============================================================================
-- FIX USERS TABLE FOREIGN KEY CONSTRAINT
-- ============================================================================
-- This migration fixes a race condition issue when creating users via the
-- Auth API. The original foreign key constraint checked immediately, but
-- auth.users records created via the Auth API aren't always immediately
-- visible to the database connection that inserts into public.users.
--
-- By making the constraint DEFERRABLE INITIALLY DEFERRED, PostgreSQL checks
-- the foreign key at the END of the transaction rather than immediately,
-- giving the auth.users insert time to complete and become visible.
-- ============================================================================

-- Drop the existing foreign key constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Re-create it as deferrable
ALTER TABLE users 
  ADD CONSTRAINT users_id_fkey 
  FOREIGN KEY (id) REFERENCES auth.users(id) 
  ON DELETE CASCADE 
  DEFERRABLE INITIALLY DEFERRED;
