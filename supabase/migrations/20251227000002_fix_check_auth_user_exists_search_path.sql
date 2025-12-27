-- Fix search_path security issue for check_auth_user_exists function
-- This migration addresses the Supabase security warning about mutable search_path

BEGIN;

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS public.check_auth_user_exists(uuid);

-- Recreate the function with a secure search_path
-- This function checks if a user exists in the auth.users table
CREATE OR REPLACE FUNCTION public.check_auth_user_exists(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
-- Set explicit search_path to prevent schema injection attacks
-- Only trust pg_catalog (built-in functions) and public schema
SET search_path = pg_catalog, public
AS $$
  -- Use fully qualified table names to avoid any ambiguity
  SELECT EXISTS(
    SELECT 1 
    FROM auth.users 
    WHERE id = p_user_id
  );
$$;

-- Grant execute permission to authenticated users only
REVOKE ALL ON FUNCTION public.check_auth_user_exists(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_auth_user_exists(uuid) TO authenticated;

-- Add a comment explaining the function's purpose and security measures
COMMENT ON FUNCTION public.check_auth_user_exists(uuid) IS 
'Securely checks if a user exists in auth.users. Uses SECURITY DEFINER with restricted search_path to prevent injection attacks.';

COMMIT;
