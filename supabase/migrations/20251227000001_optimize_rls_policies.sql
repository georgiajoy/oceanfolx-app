-- Optimize RLS policies for better performance
-- This migration addresses Supabase linter warnings:
-- 1. Wraps auth.uid() calls in SELECT to prevent re-evaluation per row
-- 2. Consolidates multiple permissive policies where appropriate

BEGIN;

-- ============================================================================
-- DROP EXISTING POLICIES (to be recreated with optimizations)
-- ============================================================================

-- Users table policies (drop both old and new names)
DROP POLICY IF EXISTS "Users can read own user record" ON users;
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Volunteers can read all users" ON users;
DROP POLICY IF EXISTS "Users can read records" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;
DROP POLICY IF EXISTS "Users can update own preferred_language" ON users;
DROP POLICY IF EXISTS "Users can update records" ON users;

-- Participants table policies (drop both old and new names)
DROP POLICY IF EXISTS "Participants can read own participant record" ON participants;
DROP POLICY IF EXISTS "Admins can read all participants" ON participants;
DROP POLICY IF EXISTS "Volunteers can read all participants" ON participants;
DROP POLICY IF EXISTS "Users can read participants" ON participants;
DROP POLICY IF EXISTS "Admins can insert participants" ON participants;
DROP POLICY IF EXISTS "Admins can update participants" ON participants;
DROP POLICY IF EXISTS "Volunteers can update participants" ON participants;
DROP POLICY IF EXISTS "Participants can update own profile photo" ON participants;
DROP POLICY IF EXISTS "Users can update participants" ON participants;
DROP POLICY IF EXISTS "Admins can delete participants" ON participants;

-- Sessions table policies
DROP POLICY IF EXISTS "Admins can insert sessions" ON sessions;
DROP POLICY IF EXISTS "Admins can update sessions" ON sessions;
DROP POLICY IF EXISTS "Admins can delete sessions" ON sessions;

-- Session_participants table policies (drop both old and new names)
DROP POLICY IF EXISTS "Participants can read own session_participants" ON session_participants;
DROP POLICY IF EXISTS "Admins can read all session_participants" ON session_participants;
DROP POLICY IF EXISTS "Volunteers can read all session_participants" ON session_participants;
DROP POLICY IF EXISTS "Users can read session_participants" ON session_participants;
DROP POLICY IF EXISTS "Participants can sign up for sessions" ON session_participants;
DROP POLICY IF EXISTS "Participants can update own session_participants" ON session_participants;
DROP POLICY IF EXISTS "Admins can insert session_participants" ON session_participants;
DROP POLICY IF EXISTS "Volunteers can insert session_participants" ON session_participants;
DROP POLICY IF EXISTS "Users can insert session_participants" ON session_participants;
DROP POLICY IF EXISTS "Admins can update session_participants" ON session_participants;
DROP POLICY IF EXISTS "Volunteers can update session_participants" ON session_participants;
DROP POLICY IF EXISTS "Users can update session_participants" ON session_participants;
DROP POLICY IF EXISTS "Participants can cancel own signups" ON session_participants;
DROP POLICY IF EXISTS "Admins can delete session_participants" ON session_participants;
DROP POLICY IF EXISTS "Volunteers can delete session_participants" ON session_participants;
DROP POLICY IF EXISTS "Users can delete session_participants" ON session_participants;

-- Levels table policies (drop both old and new names)
DROP POLICY IF EXISTS "Authenticated users can read levels" ON levels;
DROP POLICY IF EXISTS "Users can read levels" ON levels;
DROP POLICY IF EXISTS "Admins can manage levels" ON levels;
DROP POLICY IF EXISTS "Admins can update levels" ON levels;
DROP POLICY IF EXISTS "Admins can delete levels" ON levels;

-- Skills table policies (drop both old and new names)
DROP POLICY IF EXISTS "Authenticated users can read skills" ON skills;
DROP POLICY IF EXISTS "Users can read skills" ON skills;
DROP POLICY IF EXISTS "Admins can manage skills" ON skills;
DROP POLICY IF EXISTS "Admins can update skills" ON skills;
DROP POLICY IF EXISTS "Admins can delete skills" ON skills;

-- Participant_progress table policies
DROP POLICY IF EXISTS "participant_progress_select" ON participant_progress;
DROP POLICY IF EXISTS "participant_progress_insert" ON participant_progress;
DROP POLICY IF EXISTS "participant_progress_update" ON participant_progress;
DROP POLICY IF EXISTS "participant_progress_delete" ON participant_progress;

-- Gear_types table policies (drop both old and new names)
DROP POLICY IF EXISTS "Authenticated users can read gear_types" ON gear_types;
DROP POLICY IF EXISTS "Users can read gear_types" ON gear_types;
DROP POLICY IF EXISTS "Admins can manage gear_types" ON gear_types;
DROP POLICY IF EXISTS "Admins can insert gear_types" ON gear_types;
DROP POLICY IF EXISTS "Admins can update gear_types" ON gear_types;
DROP POLICY IF EXISTS "Admins can delete gear_types" ON gear_types;

-- Gear_inventory table policies (drop both old and new names)
DROP POLICY IF EXISTS "Authenticated users can read gear_inventory" ON gear_inventory;
DROP POLICY IF EXISTS "Users can read gear_inventory" ON gear_inventory;
DROP POLICY IF EXISTS "Admins can manage gear_inventory" ON gear_inventory;
DROP POLICY IF EXISTS "Admins can insert gear_inventory" ON gear_inventory;
DROP POLICY IF EXISTS "Admins can update gear_inventory" ON gear_inventory;
DROP POLICY IF EXISTS "Admins can delete gear_inventory" ON gear_inventory;

-- Gear_assignments table policies (drop both old and new names)
DROP POLICY IF EXISTS "Admins can manage gear_assignments" ON gear_assignments;
DROP POLICY IF EXISTS "Admins can insert gear_assignments" ON gear_assignments;
DROP POLICY IF EXISTS "Admins can read gear_assignments" ON gear_assignments;
DROP POLICY IF EXISTS "Admins can update gear_assignments" ON gear_assignments;
DROP POLICY IF EXISTS "Admins can delete gear_assignments" ON gear_assignments;

-- Storage policies
DROP POLICY IF EXISTS "Users can upload own profile photo" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own profile photo" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own profile photo" ON storage.objects;

-- ============================================================================
-- RECREATE USERS TABLE POLICIES (OPTIMIZED)
-- Consolidated multiple SELECT policies into one
-- ============================================================================

CREATE POLICY "Users can read records"
  ON users FOR SELECT TO authenticated
  USING (
    id = (SELECT auth.uid()) OR
    is_admin((SELECT auth.uid())) OR
    is_volunteer((SELECT auth.uid()))
  );

CREATE POLICY "Admins can insert users"
  ON users FOR INSERT TO authenticated
  WITH CHECK (is_admin((SELECT auth.uid())));

CREATE POLICY "Users can update records"
  ON users FOR UPDATE TO authenticated
  USING (
    id = (SELECT auth.uid()) OR
    is_admin((SELECT auth.uid()))
  )
  WITH CHECK (
    -- Only admins can update other users' records
    -- Users can only update their own preferred_language
    CASE
      WHEN id = (SELECT auth.uid()) THEN true
      WHEN is_admin((SELECT auth.uid())) THEN true
      ELSE false
    END
  );

-- ============================================================================
-- RECREATE PARTICIPANTS TABLE POLICIES (OPTIMIZED)
-- Consolidated multiple policies per operation
-- ============================================================================

CREATE POLICY "Users can read participants"
  ON participants FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid()) OR
    is_admin((SELECT auth.uid())) OR
    is_volunteer((SELECT auth.uid()))
  );

CREATE POLICY "Admins can insert participants"
  ON participants FOR INSERT TO authenticated
  WITH CHECK (is_admin((SELECT auth.uid())));

CREATE POLICY "Users can update participants"
  ON participants FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid()) OR
    is_admin((SELECT auth.uid())) OR
    is_volunteer((SELECT auth.uid()))
  )
  WITH CHECK (
    user_id = (SELECT auth.uid()) OR
    is_admin((SELECT auth.uid())) OR
    is_volunteer((SELECT auth.uid()))
  );

CREATE POLICY "Admins can delete participants"
  ON participants FOR DELETE TO authenticated
  USING (is_admin((SELECT auth.uid())));

-- ============================================================================
-- RECREATE SESSIONS TABLE POLICIES (OPTIMIZED)
-- ============================================================================

CREATE POLICY "Admins can insert sessions"
  ON sessions FOR INSERT TO authenticated
  WITH CHECK (is_admin((SELECT auth.uid())));

CREATE POLICY "Admins can update sessions"
  ON sessions FOR UPDATE TO authenticated
  USING (is_admin((SELECT auth.uid())))
  WITH CHECK (is_admin((SELECT auth.uid())));

CREATE POLICY "Admins can delete sessions"
  ON sessions FOR DELETE TO authenticated
  USING (is_admin((SELECT auth.uid())));

-- ============================================================================
-- RECREATE SESSION_PARTICIPANTS TABLE POLICIES (OPTIMIZED)
-- Consolidated multiple policies per operation
-- ============================================================================

CREATE POLICY "Users can read session_participants"
  ON session_participants FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM participants p 
      WHERE p.id = session_participants.participant_id 
      AND p.user_id = (SELECT auth.uid())
    ) OR
    is_admin((SELECT auth.uid())) OR
    is_volunteer((SELECT auth.uid()))
  );

CREATE POLICY "Users can insert session_participants"
  ON session_participants FOR INSERT TO authenticated
  WITH CHECK (
    (
      is_participant_of((SELECT auth.uid()), participant_id)
      AND status = 'signed_up'
    ) OR
    is_admin((SELECT auth.uid())) OR
    is_volunteer((SELECT auth.uid()))
  );

CREATE POLICY "Users can update session_participants"
  ON session_participants FOR UPDATE TO authenticated
  USING (
    is_participant_of((SELECT auth.uid()), participant_id) OR
    is_admin((SELECT auth.uid())) OR
    is_volunteer((SELECT auth.uid()))
  )
  WITH CHECK (
    CASE
      WHEN is_admin((SELECT auth.uid())) OR is_volunteer((SELECT auth.uid())) THEN true
      WHEN is_participant_of((SELECT auth.uid()), participant_id) THEN status IN ('self_reported','signed_up')
      ELSE false
    END
  );

CREATE POLICY "Users can delete session_participants"
  ON session_participants FOR DELETE TO authenticated
  USING (
    (
      EXISTS (
        SELECT 1 FROM participants p 
        WHERE p.id = session_participants.participant_id 
        AND p.user_id = (SELECT auth.uid())
      )
      AND status = 'signed_up'
    ) OR
    is_admin((SELECT auth.uid())) OR
    is_volunteer((SELECT auth.uid()))
  );

-- ============================================================================
-- RECREATE LEVELS TABLE POLICIES (OPTIMIZED)
-- Consolidated read and manage policies
-- ============================================================================

CREATE POLICY "Users can read levels"
  ON levels FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can insert levels"
  ON levels FOR INSERT TO authenticated
  WITH CHECK (is_admin((SELECT auth.uid())));

CREATE POLICY "Admins can update levels"
  ON levels FOR UPDATE TO authenticated
  USING (is_admin((SELECT auth.uid())))
  WITH CHECK (is_admin((SELECT auth.uid())));

CREATE POLICY "Admins can delete levels"
  ON levels FOR DELETE TO authenticated
  USING (is_admin((SELECT auth.uid())));

-- ============================================================================
-- RECREATE SKILLS TABLE POLICIES (OPTIMIZED)
-- Consolidated read and manage policies
-- ============================================================================

CREATE POLICY "Users can read skills"
  ON skills FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can insert skills"
  ON skills FOR INSERT TO authenticated
  WITH CHECK (is_admin((SELECT auth.uid())));

CREATE POLICY "Admins can update skills"
  ON skills FOR UPDATE TO authenticated
  USING (is_admin((SELECT auth.uid())))
  WITH CHECK (is_admin((SELECT auth.uid())));

CREATE POLICY "Admins can delete skills"
  ON skills FOR DELETE TO authenticated
  USING (is_admin((SELECT auth.uid())));

-- ============================================================================
-- RECREATE PARTICIPANT_PROGRESS TABLE POLICIES (OPTIMIZED)
-- ============================================================================

CREATE POLICY "participant_progress_select"
  ON participant_progress FOR SELECT TO authenticated
  USING (
    is_admin((SELECT auth.uid())) OR
    is_volunteer((SELECT auth.uid())) OR
    EXISTS (
      SELECT 1 FROM participants 
      WHERE participants.id = participant_progress.participant_id 
      AND participants.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "participant_progress_insert"
  ON participant_progress FOR INSERT TO authenticated
  WITH CHECK (
    is_admin((SELECT auth.uid())) OR
    is_volunteer((SELECT auth.uid())) OR
    EXISTS (
      SELECT 1 FROM participants 
      WHERE participants.id = participant_progress.participant_id 
      AND participants.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "participant_progress_update"
  ON participant_progress FOR UPDATE TO authenticated
  USING (
    is_admin((SELECT auth.uid())) OR 
    is_volunteer((SELECT auth.uid()))
  )
  WITH CHECK (
    is_admin((SELECT auth.uid())) OR 
    is_volunteer((SELECT auth.uid()))
  );

CREATE POLICY "participant_progress_delete"
  ON participant_progress FOR DELETE TO authenticated
  USING (
    is_admin((SELECT auth.uid())) OR 
    is_volunteer((SELECT auth.uid()))
  );

-- ============================================================================
-- RECREATE GEAR_TYPES TABLE POLICIES (OPTIMIZED)
-- Consolidated read and manage policies
-- ============================================================================

CREATE POLICY "Users can read gear_types"
  ON gear_types FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can insert gear_types"
  ON gear_types FOR INSERT TO authenticated
  WITH CHECK (is_admin((SELECT auth.uid())));

CREATE POLICY "Admins can update gear_types"
  ON gear_types FOR UPDATE TO authenticated
  USING (is_admin((SELECT auth.uid())))
  WITH CHECK (is_admin((SELECT auth.uid())));

CREATE POLICY "Admins can delete gear_types"
  ON gear_types FOR DELETE TO authenticated
  USING (is_admin((SELECT auth.uid())));

-- ============================================================================
-- RECREATE GEAR_INVENTORY TABLE POLICIES (OPTIMIZED)
-- Consolidated read and manage policies
-- ============================================================================

CREATE POLICY "Users can read gear_inventory"
  ON gear_inventory FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can insert gear_inventory"
  ON gear_inventory FOR INSERT TO authenticated
  WITH CHECK (is_admin((SELECT auth.uid())));

CREATE POLICY "Admins can update gear_inventory"
  ON gear_inventory FOR UPDATE TO authenticated
  USING (is_admin((SELECT auth.uid())))
  WITH CHECK (is_admin((SELECT auth.uid())));

CREATE POLICY "Admins can delete gear_inventory"
  ON gear_inventory FOR DELETE TO authenticated
  USING (is_admin((SELECT auth.uid())));

-- ============================================================================
-- RECREATE GEAR_ASSIGNMENTS TABLE POLICIES (OPTIMIZED)
-- ============================================================================

CREATE POLICY "Admins can insert gear_assignments"
  ON gear_assignments FOR INSERT TO authenticated
  WITH CHECK (is_admin((SELECT auth.uid())));

CREATE POLICY "Admins can read gear_assignments"
  ON gear_assignments FOR SELECT TO authenticated
  USING (is_admin((SELECT auth.uid())));

CREATE POLICY "Admins can update gear_assignments"
  ON gear_assignments FOR UPDATE TO authenticated
  USING (is_admin((SELECT auth.uid())))
  WITH CHECK (is_admin((SELECT auth.uid())));

CREATE POLICY "Admins can delete gear_assignments"
  ON gear_assignments FOR DELETE TO authenticated
  USING (is_admin((SELECT auth.uid())));

-- ============================================================================
-- RECREATE STORAGE OBJECT POLICIES (OPTIMIZED)
-- ============================================================================

CREATE POLICY "Users can upload own profile photo"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'profile-photos' AND
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

CREATE POLICY "Users can update own profile photo"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'profile-photos' AND
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

CREATE POLICY "Users can delete own profile photo"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'profile-photos' AND
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

COMMIT;
