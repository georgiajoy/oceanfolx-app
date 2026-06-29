-- Add RLS policies for intern and local_leader roles
-- Also add policies for lesson_notes table

BEGIN;

-- ============================================================================
-- Add helper functions for new roles
-- ============================================================================

CREATE FUNCTION is_intern(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE((SELECT role = 'intern' FROM users WHERE id = user_id), false);
$$;

CREATE FUNCTION is_local_leader(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE((SELECT role = 'local_leader' FROM users WHERE id = user_id), false);
$$;

CREATE FUNCTION is_admin_or_intern(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE((SELECT role IN ('admin', 'intern') FROM users WHERE id = user_id), false);
$$;

-- ============================================================================
-- Update existing RLS policies to include interns
-- ============================================================================

-- Users table: Interns can read all users (like volunteers)
CREATE POLICY "Interns can read all users"
  ON users FOR SELECT TO authenticated
  USING (is_intern(auth.uid()));

-- Participants table: Interns can read all participants (like volunteers)
CREATE POLICY "Interns can read all participants"
  ON participants FOR SELECT TO authenticated
  USING (is_intern(auth.uid()));

-- Participants table: Interns can insert participants (like admins)
CREATE POLICY "Interns can insert participants"
  ON participants FOR INSERT TO authenticated
  WITH CHECK (is_intern(auth.uid()));

-- Participants table: Interns can update participants (like admins/volunteers)
CREATE POLICY "Interns can update participants"
  ON participants FOR UPDATE TO authenticated
  USING (is_intern(auth.uid()))
  WITH CHECK (is_intern(auth.uid()));

-- Session_participants table: Interns can read all session_participants (like volunteers)
CREATE POLICY "Interns can read all session_participants"
  ON session_participants FOR SELECT TO authenticated
  USING (is_intern(auth.uid()));

-- Session_participants table: Interns can insert session_participants (like volunteers/admins)
CREATE POLICY "Interns can insert session_participants"
  ON session_participants FOR INSERT TO authenticated
  WITH CHECK (is_intern(auth.uid()));

-- Session_participants table: Interns can update session_participants (like admins)
CREATE POLICY "Interns can update session_participants"
  ON session_participants FOR UPDATE TO authenticated
  USING (is_intern(auth.uid()))
  WITH CHECK (is_intern(auth.uid()));

-- ============================================================================
-- Add RLS policies for local_leader role
-- Local leaders have similar read permissions to interns/volunteers
-- but more limited write permissions
-- ============================================================================

-- Users table: Local leaders can read all users
CREATE POLICY "Local leaders can read all users"
  ON users FOR SELECT TO authenticated
  USING (is_local_leader(auth.uid()));

-- Participants table: Local leaders can read all participants
CREATE POLICY "Local leaders can read all participants"
  ON participants FOR SELECT TO authenticated
  USING (is_local_leader(auth.uid()));

-- Session_participants table: Local leaders can read all session_participants
CREATE POLICY "Local leaders can read all session_participants"
  ON session_participants FOR SELECT TO authenticated
  USING (is_local_leader(auth.uid()));

-- Session_participants table: Local leaders can insert session_participants (self-check-in only)
CREATE POLICY "Local leaders can insert session_participants"
  ON session_participants FOR INSERT TO authenticated
  WITH CHECK (is_local_leader(auth.uid()));

-- Session_participants table: Local leaders can update session_participants (limited - only self_reported)
CREATE POLICY "Local leaders can update session_participants"
  ON session_participants FOR UPDATE TO authenticated
  USING (is_local_leader(auth.uid()))
  WITH CHECK (status = 'self_reported');

-- ============================================================================
-- CREATE LESSON_NOTES TABLE POLICIES
-- ============================================================================

ALTER TABLE lesson_notes ENABLE ROW LEVEL SECURITY;

-- Admins can read all lesson notes
CREATE POLICY "Admins can read all lesson_notes"
  ON lesson_notes FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

-- Interns can read all lesson notes
CREATE POLICY "Interns can read all lesson_notes"
  ON lesson_notes FOR SELECT TO authenticated
  USING (is_intern(auth.uid()));

-- Local leaders can read lesson notes for their sessions
CREATE POLICY "Local leaders can read lesson_notes for their sessions"
  ON lesson_notes FOR SELECT TO authenticated
  USING (
    is_local_leader(auth.uid())
    AND EXISTS (
      SELECT 1 FROM session_participants sp
      WHERE sp.session_id = lesson_notes.session_id
      AND sp.participant_id IN (
        SELECT id FROM participants WHERE user_id = auth.uid()
      )
    )
  );

-- Note authors can read their own notes
CREATE POLICY "Note authors can read own lesson_notes"
  ON lesson_notes FOR SELECT TO authenticated
  USING (author_user_id = auth.uid());

-- Admins can insert lesson notes
CREATE POLICY "Admins can insert lesson_notes"
  ON lesson_notes FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()) AND author_user_id = auth.uid());

-- Interns can insert lesson notes
CREATE POLICY "Interns can insert lesson_notes"
  ON lesson_notes FOR INSERT TO authenticated
  WITH CHECK (is_intern(auth.uid()) AND author_user_id = auth.uid());

-- Local leaders can insert lesson notes
CREATE POLICY "Local leaders can insert lesson_notes"
  ON lesson_notes FOR INSERT TO authenticated
  WITH CHECK (is_local_leader(auth.uid()) AND author_user_id = auth.uid());

-- Note authors can update their own notes
CREATE POLICY "Authors can update own lesson_notes"
  ON lesson_notes FOR UPDATE TO authenticated
  USING (author_user_id = auth.uid())
  WITH CHECK (author_user_id = auth.uid());

-- Admins can delete lesson notes
CREATE POLICY "Admins can delete lesson_notes"
  ON lesson_notes FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

-- Note authors can delete their own notes
CREATE POLICY "Authors can delete own lesson_notes"
  ON lesson_notes FOR DELETE TO authenticated
  USING (author_user_id = auth.uid());

COMMIT;
