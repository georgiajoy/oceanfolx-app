-- Add new fields to participants table
-- Text fields for participant information
ALTER TABLE participants
  ADD COLUMN age text,
  ADD COLUMN village text,
  ADD COLUMN number_of_children text,
  ADD COLUMN respiratory_issues text,
  ADD COLUMN diabetes text,
  ADD COLUMN neurological_conditions text,
  ADD COLUMN chronic_illnesses text,
  ADD COLUMN head_injuries text,
  ADD COLUMN hospitalizations text,
  ADD COLUMN medications text,
  ADD COLUMN medications_not_taking_during_program text,
  ADD COLUMN medical_dietary_requirements text,
  ADD COLUMN religious_personal_dietary_restrictions text;

-- Dropdown fields with specific options (none, poor, competent, advanced)
ALTER TABLE participants
  ADD COLUMN swim_ability_calm text CHECK (swim_ability_calm IN ('none', 'poor', 'competent', 'advanced')),
  ADD COLUMN swim_ability_moving text CHECK (swim_ability_moving IN ('none', 'poor', 'competent', 'advanced')),
  ADD COLUMN surfing_experience text CHECK (surfing_experience IN ('none', 'poor', 'competent', 'advanced'));

-- Acknowledgment and agreement checkbox fields
ALTER TABLE participants
  ADD COLUMN commitment_statement boolean DEFAULT false,
  ADD COLUMN acknowledgment_agreement_authorization boolean DEFAULT false,
  ADD COLUMN risks_release_indemnity_agreement boolean DEFAULT false,
  ADD COLUMN media_release_agreement boolean DEFAULT false,
  ADD COLUMN signature text,
  ADD COLUMN signature_date date;
