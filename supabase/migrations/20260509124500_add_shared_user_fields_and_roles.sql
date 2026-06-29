-- Add shared profile fields for all user roles and support new roles.
-- This migration also removes the absent option from session attendance status checks
-- and creates a lesson notes table for future lesson-specific notes.

BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS preferred_name text,
  ADD COLUMN IF NOT EXISTS birthday date,
  ADD COLUMN IF NOT EXISTS allergies text,
  ADD COLUMN IF NOT EXISTS bpjs_number text,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS shoe_size text,
  ADD COLUMN IF NOT EXISTS clothing_size text,
  ADD COLUMN IF NOT EXISTS profile_photo_url text,
  ADD COLUMN IF NOT EXISTS age text,
  ADD COLUMN IF NOT EXISTS village text,
  ADD COLUMN IF NOT EXISTS number_of_children text,
  ADD COLUMN IF NOT EXISTS respiratory_issues text,
  ADD COLUMN IF NOT EXISTS diabetes text,
  ADD COLUMN IF NOT EXISTS neurological_conditions text,
  ADD COLUMN IF NOT EXISTS chronic_illnesses text,
  ADD COLUMN IF NOT EXISTS head_injuries text,
  ADD COLUMN IF NOT EXISTS hospitalizations text,
  ADD COLUMN IF NOT EXISTS medications text,
  ADD COLUMN IF NOT EXISTS medications_not_taking_during_program text,
  ADD COLUMN IF NOT EXISTS medical_dietary_requirements text,
  ADD COLUMN IF NOT EXISTS religious_personal_dietary_restrictions text,
  ADD COLUMN IF NOT EXISTS swim_ability_calm text CHECK (swim_ability_calm IN ('none','poor','competent','advanced')),
  ADD COLUMN IF NOT EXISTS swim_ability_moving text CHECK (swim_ability_moving IN ('none','poor','competent','advanced')),
  ADD COLUMN IF NOT EXISTS surfing_experience text CHECK (surfing_experience IN ('none','poor','competent','advanced')),
  ADD COLUMN IF NOT EXISTS commitment_statement boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS risks_release_indemnity_agreement boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS media_release_agreement boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS hijab_photo_preference text CHECK (hijab_photo_preference IN ('with_or_without','only_with')),
  ADD COLUMN IF NOT EXISTS signature text,
  ADD COLUMN IF NOT EXISTS signature_date date,
  ADD COLUMN IF NOT EXISTS code_of_conduct_url text,
  ADD COLUMN IF NOT EXISTS safeguarding_policy_url text,
  ADD COLUMN IF NOT EXISTS indemnity_agreement_url text;

-- Drop old role constraint before renaming volunteer -> intern, then add new constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Replace volunteer with intern in existing data and type
UPDATE users SET role = 'intern' WHERE role = 'volunteer';

ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin','intern','participant','local_leader'));

ALTER TABLE session_participants DROP CONSTRAINT IF EXISTS session_participants_status_check;
ALTER TABLE session_participants ADD CONSTRAINT session_participants_status_check CHECK (status IN ('signed_up','present','self_reported')) NOT VALID;

CREATE TABLE IF NOT EXISTS lesson_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

COMMIT;
