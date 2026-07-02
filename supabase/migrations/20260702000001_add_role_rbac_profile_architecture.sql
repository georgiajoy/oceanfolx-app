-- Add normalized role/RBAC/profile/forms/files architecture.
-- This migration is additive and non-destructive: it preserves existing users,
-- participants, and all participant_id-linked operational tables.

BEGIN;

-- ---------------------------------------------------------------------------
-- Role + RBAC catalog tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS access_levels (
  id text PRIMARY KEY CHECK (id IN ('participant', 'employee', 'admin')),
  description text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS business_roles (
  id text PRIMARY KEY CHECK (
    id IN (
      'participant',
      'remote_foreign_staff',
      'in_person_facilitator',
      'non_program_foreign_staff',
      'in_person_foreign_staff',
      'remote_volunteer',
      'local_leader',
      'intern',
      'admin'
    )
  ),
  description text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS role_access_levels (
  role_id text NOT NULL REFERENCES business_roles(id) ON DELETE CASCADE,
  access_level_id text NOT NULL REFERENCES access_levels(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  role_id text NOT NULL REFERENCES business_roles(id),
  is_active boolean NOT NULL DEFAULT true,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

-- ---------------------------------------------------------------------------
-- Shared profile table for all user types
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  preferred_name text,
  birthday date,
  marital_status text,
  number_of_children text,
  occupation text,
  bpjs_number text,
  village text,
  emergency_contact_name text,
  emergency_contact_phone text,
  allergies text,
  respiratory_issues text,
  diabetes text,
  neurological_conditions text,
  chronic_illnesses text,
  head_injuries text,
  hospitalizations text,
  medications text,
  medications_not_taking_during_program text,
  medical_dietary_requirements text,
  religious_personal_dietary_requirements text,
  swim_ability_calm text CHECK (swim_ability_calm IN ('none', 'poor', 'competent', 'advanced')),
  swim_ability_moving text CHECK (swim_ability_moving IN ('none', 'poor', 'competent', 'advanced')),
  surfing_experience text CHECK (surfing_experience IN ('none', 'poor', 'competent', 'advanced')),
  shoe_size text,
  clothing_size text,
  commitment_statement boolean NOT NULL DEFAULT false,
  indemnity_agreement boolean NOT NULL DEFAULT false,
  media_consent boolean NOT NULL DEFAULT false,
  hijab_photo_preference text CHECK (hijab_photo_preference IN ('with_or_without', 'only_with')),
  signature text,
  signature_date date,
  profile_photo_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Form requirement and submission tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS form_definitions (
  id text PRIMARY KEY,
  category text NOT NULL CHECK (category IN ('core_agreement', 'policy', 'training', 'staff')),
  label text NOT NULL,
  description text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS role_form_requirements (
  role_id text NOT NULL REFERENCES business_roles(id) ON DELETE CASCADE,
  form_id text NOT NULL REFERENCES form_definitions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, form_id)
);

CREATE TABLE IF NOT EXISTS user_form_submissions (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  form_id text NOT NULL REFERENCES form_definitions(id) ON DELETE CASCADE,
  accepted boolean NOT NULL DEFAULT false,
  signed_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, form_id)
);

CREATE INDEX IF NOT EXISTS idx_user_form_submissions_user ON user_form_submissions(user_id);

-- ---------------------------------------------------------------------------
-- File requirement and upload tracking tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS file_definitions (
  id text PRIMARY KEY,
  label text NOT NULL,
  description text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS role_file_requirements (
  role_id text NOT NULL REFERENCES business_roles(id) ON DELETE CASCADE,
  file_id text NOT NULL REFERENCES file_definitions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, file_id)
);

CREATE TABLE IF NOT EXISTS user_file_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_id text NOT NULL REFERENCES file_definitions(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_file_uploads_user ON user_file_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_user_file_uploads_user_file ON user_file_uploads(user_id, file_id);

-- ---------------------------------------------------------------------------
-- Seed RBAC catalogs
-- ---------------------------------------------------------------------------

INSERT INTO access_levels (id, description) VALUES
  ('participant', 'Participant-level access'),
  ('employee', 'Employee-level access (current local leader envelope)'),
  ('admin', 'Full admin-level access')
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_roles (id, description) VALUES
  ('participant', 'Program participant'),
  ('remote_foreign_staff', 'Remote foreign staff'),
  ('in_person_facilitator', 'In-person facilitator'),
  ('non_program_foreign_staff', 'Non-program foreign staff'),
  ('in_person_foreign_staff', 'In-person foreign staff'),
  ('remote_volunteer', 'Remote volunteer'),
  ('local_leader', 'Local leader'),
  ('intern', 'Intern'),
  ('admin', 'Administrator')
ON CONFLICT (id) DO NOTHING;

INSERT INTO role_access_levels (role_id, access_level_id) VALUES
  ('participant', 'participant'),
  ('remote_foreign_staff', 'employee'),
  ('in_person_facilitator', 'employee'),
  ('non_program_foreign_staff', 'employee'),
  ('in_person_foreign_staff', 'employee'),
  ('remote_volunteer', 'employee'),
  ('local_leader', 'employee'),
  ('intern', 'admin'),
  ('admin', 'admin')
ON CONFLICT (role_id) DO UPDATE SET access_level_id = EXCLUDED.access_level_id;

-- ---------------------------------------------------------------------------
-- Seed forms and role form requirements
-- ---------------------------------------------------------------------------

INSERT INTO form_definitions (id, category, label) VALUES
  ('commitment_statement', 'core_agreement', 'Commitment Statement'),
  ('indemnity_agreement', 'core_agreement', 'Indemnity Agreement'),
  ('media_consent', 'core_agreement', 'Media Consent'),
  ('hijab_photo_preference', 'core_agreement', 'Hijab Photo Preference'),
  ('code_of_conduct', 'policy', 'Code of Conduct'),
  ('safeguarding_policy', 'policy', 'Safeguarding Policy'),
  ('dei_training', 'training', 'DEI Training'),
  ('brand_press_guidelines', 'training', 'Brand and Press Guidelines'),
  ('staff_contract', 'staff', 'Staff Contract')
ON CONFLICT (id) DO NOTHING;

INSERT INTO role_form_requirements (role_id, form_id) VALUES
  -- Participant
  ('participant', 'commitment_statement'),
  ('participant', 'indemnity_agreement'),
  ('participant', 'media_consent'),
  ('participant', 'hijab_photo_preference'),

  -- Intern
  ('intern', 'commitment_statement'),
  ('intern', 'indemnity_agreement'),
  ('intern', 'media_consent'),
  ('intern', 'hijab_photo_preference'),
  ('intern', 'code_of_conduct'),
  ('intern', 'safeguarding_policy'),
  ('intern', 'dei_training'),
  ('intern', 'brand_press_guidelines'),

  -- Local Leader
  ('local_leader', 'commitment_statement'),
  ('local_leader', 'indemnity_agreement'),
  ('local_leader', 'media_consent'),
  ('local_leader', 'hijab_photo_preference'),
  ('local_leader', 'code_of_conduct'),
  ('local_leader', 'safeguarding_policy'),
  ('local_leader', 'staff_contract'),

  -- Remote Volunteer
  ('remote_volunteer', 'commitment_statement'),
  ('remote_volunteer', 'indemnity_agreement'),
  ('remote_volunteer', 'media_consent'),
  ('remote_volunteer', 'hijab_photo_preference'),
  ('remote_volunteer', 'code_of_conduct'),
  ('remote_volunteer', 'safeguarding_policy'),
  ('remote_volunteer', 'dei_training'),
  ('remote_volunteer', 'brand_press_guidelines'),

  -- In-person Foreign Staff
  ('in_person_foreign_staff', 'commitment_statement'),
  ('in_person_foreign_staff', 'indemnity_agreement'),
  ('in_person_foreign_staff', 'media_consent'),
  ('in_person_foreign_staff', 'hijab_photo_preference'),
  ('in_person_foreign_staff', 'code_of_conduct'),
  ('in_person_foreign_staff', 'safeguarding_policy'),
  ('in_person_foreign_staff', 'staff_contract'),

  -- In-person Facilitator
  ('in_person_facilitator', 'commitment_statement'),
  ('in_person_facilitator', 'indemnity_agreement'),
  ('in_person_facilitator', 'media_consent'),
  ('in_person_facilitator', 'hijab_photo_preference'),
  ('in_person_facilitator', 'code_of_conduct'),
  ('in_person_facilitator', 'safeguarding_policy'),
  ('in_person_facilitator', 'dei_training'),
  ('in_person_facilitator', 'brand_press_guidelines'),

  -- Remote Foreign Staff
  ('remote_foreign_staff', 'commitment_statement'),
  ('remote_foreign_staff', 'indemnity_agreement'),
  ('remote_foreign_staff', 'media_consent'),
  ('remote_foreign_staff', 'hijab_photo_preference'),
  ('remote_foreign_staff', 'code_of_conduct'),
  ('remote_foreign_staff', 'safeguarding_policy'),
  ('remote_foreign_staff', 'dei_training'),
  ('remote_foreign_staff', 'brand_press_guidelines'),

  -- Non-program Foreign Staff
  ('non_program_foreign_staff', 'commitment_statement'),
  ('non_program_foreign_staff', 'indemnity_agreement'),
  ('non_program_foreign_staff', 'media_consent'),
  ('non_program_foreign_staff', 'hijab_photo_preference'),
  ('non_program_foreign_staff', 'code_of_conduct'),
  ('non_program_foreign_staff', 'safeguarding_policy'),
  ('non_program_foreign_staff', 'dei_training'),
  ('non_program_foreign_staff', 'brand_press_guidelines')
ON CONFLICT (role_id, form_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Seed files and role file requirements
-- ---------------------------------------------------------------------------

INSERT INTO file_definitions (id, label) VALUES
  ('identity', 'Identity'),
  ('insurance', 'Insurance'),
  ('first_aid', 'First Aid'),
  ('background_check', 'Background Check'),
  ('contractor_service_location_declaration', 'Contractor Service Location Declaration'),
  ('tax_info', 'Tax Info'),
  ('payment_info', 'Payment Info'),
  ('invoices', 'Invoices')
ON CONFLICT (id) DO NOTHING;

INSERT INTO role_file_requirements (role_id, file_id) VALUES
  -- Intern
  ('intern', 'identity'),
  ('intern', 'insurance'),
  ('intern', 'first_aid'),
  ('intern', 'background_check'),
  ('intern', 'payment_info'),

  -- Local Leader
  ('local_leader', 'identity'),
  ('local_leader', 'background_check'),
  ('local_leader', 'contractor_service_location_declaration'),
  ('local_leader', 'payment_info'),

  -- In-person Foreign Staff
  ('in_person_foreign_staff', 'identity'),
  ('in_person_foreign_staff', 'insurance'),
  ('in_person_foreign_staff', 'first_aid'),
  ('in_person_foreign_staff', 'background_check'),
  ('in_person_foreign_staff', 'contractor_service_location_declaration'),
  ('in_person_foreign_staff', 'tax_info'),
  ('in_person_foreign_staff', 'payment_info'),
  ('in_person_foreign_staff', 'invoices'),

  -- Remote Foreign Staff
  ('remote_foreign_staff', 'contractor_service_location_declaration'),
  ('remote_foreign_staff', 'tax_info'),
  ('remote_foreign_staff', 'payment_info'),
  ('remote_foreign_staff', 'invoices'),

  -- Non-program Foreign Staff
  ('non_program_foreign_staff', 'identity'),
  ('non_program_foreign_staff', 'insurance'),
  ('non_program_foreign_staff', 'contractor_service_location_declaration'),
  ('non_program_foreign_staff', 'tax_info'),
  ('non_program_foreign_staff', 'payment_info'),
  ('non_program_foreign_staff', 'invoices')
ON CONFLICT (role_id, file_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Backfill from existing users/participants data
-- ---------------------------------------------------------------------------

INSERT INTO user_roles (user_id, role_id)
SELECT
  u.id,
  CASE u.role
    WHEN 'admin' THEN 'admin'
    WHEN 'intern' THEN 'intern'
    WHEN 'participant' THEN 'participant'
    WHEN 'local_leader' THEN 'local_leader'
    ELSE NULL
  END AS role_id
FROM users u
WHERE u.role IN ('admin', 'intern', 'participant', 'local_leader')
ON CONFLICT (user_id) DO UPDATE SET
  role_id = EXCLUDED.role_id,
  updated_at = now();

CREATE TABLE IF NOT EXISTS role_migration_issues (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  old_role text NOT NULL,
  issue text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO role_migration_issues (user_id, old_role, issue)
SELECT u.id, u.role, 'Legacy role requires manual mapping to new business role catalog'
FROM users u
WHERE u.role NOT IN ('admin', 'intern', 'participant', 'local_leader')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_profiles (
  user_id,
  preferred_name,
  birthday,
  number_of_children,
  bpjs_number,
  village,
  emergency_contact_name,
  emergency_contact_phone,
  allergies,
  respiratory_issues,
  diabetes,
  neurological_conditions,
  chronic_illnesses,
  head_injuries,
  hospitalizations,
  medications,
  medications_not_taking_during_program,
  medical_dietary_requirements,
  religious_personal_dietary_requirements,
  swim_ability_calm,
  swim_ability_moving,
  surfing_experience,
  shoe_size,
  clothing_size,
  commitment_statement,
  indemnity_agreement,
  media_consent,
  hijab_photo_preference,
  signature,
  signature_date,
  profile_photo_url,
  notes
)
SELECT
  u.id,
  u.preferred_name,
  u.birthday,
  COALESCE(p.number_of_children, u.number_of_children),
  u.bpjs_number,
  COALESCE(p.village, u.village),
  COALESCE(p.emergency_contact_name, u.emergency_contact_name),
  COALESCE(p.emergency_contact_phone, u.emergency_contact_phone),
  u.allergies,
  COALESCE(p.respiratory_issues, u.respiratory_issues),
  COALESCE(p.diabetes, u.diabetes),
  COALESCE(p.neurological_conditions, u.neurological_conditions),
  COALESCE(p.chronic_illnesses, u.chronic_illnesses),
  COALESCE(p.head_injuries, u.head_injuries),
  COALESCE(p.hospitalizations, u.hospitalizations),
  COALESCE(p.medications, u.medications),
  COALESCE(p.medications_not_taking_during_program, u.medications_not_taking_during_program),
  COALESCE(p.medical_dietary_requirements, u.medical_dietary_requirements),
  COALESCE(p.religious_personal_dietary_restrictions, u.religious_personal_dietary_restrictions),
  COALESCE(p.swim_ability_calm, u.swim_ability_calm),
  COALESCE(p.swim_ability_moving, u.swim_ability_moving),
  COALESCE(p.surfing_experience, u.surfing_experience),
  COALESCE(p.shoe_size, u.shoe_size),
  COALESCE(p.clothing_size, u.clothing_size),
  COALESCE(p.commitment_statement, u.commitment_statement, false),
  COALESCE(p.risks_release_indemnity_agreement, u.risks_release_indemnity_agreement, false),
  COALESCE(p.media_release_agreement, u.media_release_agreement, false),
  COALESCE(p.hijab_photo_preference, u.hijab_photo_preference),
  COALESCE(p.signature, u.signature),
  COALESCE(p.signature_date, u.signature_date),
  COALESCE(p.profile_photo_url, u.profile_photo_url),
  COALESCE(p.notes, u.notes)
FROM users u
LEFT JOIN participants p ON p.user_id = u.id
ON CONFLICT (user_id) DO UPDATE SET
  preferred_name = EXCLUDED.preferred_name,
  birthday = EXCLUDED.birthday,
  number_of_children = EXCLUDED.number_of_children,
  bpjs_number = EXCLUDED.bpjs_number,
  village = EXCLUDED.village,
  emergency_contact_name = EXCLUDED.emergency_contact_name,
  emergency_contact_phone = EXCLUDED.emergency_contact_phone,
  allergies = EXCLUDED.allergies,
  respiratory_issues = EXCLUDED.respiratory_issues,
  diabetes = EXCLUDED.diabetes,
  neurological_conditions = EXCLUDED.neurological_conditions,
  chronic_illnesses = EXCLUDED.chronic_illnesses,
  head_injuries = EXCLUDED.head_injuries,
  hospitalizations = EXCLUDED.hospitalizations,
  medications = EXCLUDED.medications,
  medications_not_taking_during_program = EXCLUDED.medications_not_taking_during_program,
  medical_dietary_requirements = EXCLUDED.medical_dietary_requirements,
  religious_personal_dietary_requirements = EXCLUDED.religious_personal_dietary_requirements,
  swim_ability_calm = EXCLUDED.swim_ability_calm,
  swim_ability_moving = EXCLUDED.swim_ability_moving,
  surfing_experience = EXCLUDED.surfing_experience,
  shoe_size = EXCLUDED.shoe_size,
  clothing_size = EXCLUDED.clothing_size,
  commitment_statement = EXCLUDED.commitment_statement,
  indemnity_agreement = EXCLUDED.indemnity_agreement,
  media_consent = EXCLUDED.media_consent,
  hijab_photo_preference = EXCLUDED.hijab_photo_preference,
  signature = EXCLUDED.signature,
  signature_date = EXCLUDED.signature_date,
  profile_photo_url = EXCLUDED.profile_photo_url,
  notes = EXCLUDED.notes,
  updated_at = now();

-- Backfill current core agreement submissions where possible.
INSERT INTO user_form_submissions (user_id, form_id, accepted, signed_at)
SELECT
  up.user_id,
  fd.id,
  CASE fd.id
    WHEN 'commitment_statement' THEN COALESCE(up.commitment_statement, false)
    WHEN 'indemnity_agreement' THEN COALESCE(up.indemnity_agreement, false)
    WHEN 'media_consent' THEN COALESCE(up.media_consent, false)
    WHEN 'hijab_photo_preference' THEN (up.hijab_photo_preference IS NOT NULL)
    ELSE false
  END,
  up.signature_date
FROM user_profiles up
JOIN form_definitions fd
  ON fd.id IN ('commitment_statement', 'indemnity_agreement', 'media_consent', 'hijab_photo_preference')
ON CONFLICT (user_id, form_id) DO UPDATE SET
  accepted = EXCLUDED.accepted,
  signed_at = EXCLUDED.signed_at,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Transitional helper functions for new RBAC checks
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_user_access_level(user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT ral.access_level_id
      FROM user_roles ur
      JOIN role_access_levels ral ON ral.role_id = ur.role_id
      WHERE ur.user_id = get_user_access_level.user_id
        AND ur.is_active = true
      LIMIT 1
    ),
    (
      SELECT CASE u.role
        WHEN 'participant' THEN 'participant'
        WHEN 'local_leader' THEN 'employee'
        WHEN 'admin' THEN 'admin'
        WHEN 'intern' THEN 'admin'
        ELSE NULL
      END
      FROM users u
      WHERE u.id = get_user_access_level.user_id
    )
  );
$$;

CREATE OR REPLACE FUNCTION is_participant_level(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT get_user_access_level(user_id) = 'participant';
$$;

CREATE OR REPLACE FUNCTION is_employee_level(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT get_user_access_level(user_id) = 'employee';
$$;

CREATE OR REPLACE FUNCTION is_admin_level(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT get_user_access_level(user_id) = 'admin';
$$;

COMMIT;
