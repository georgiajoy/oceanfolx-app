-- Remove acknowledgment_agreement_authorization field
ALTER TABLE participants DROP COLUMN IF EXISTS acknowledgment_agreement_authorization;

-- Add hijab photo preference field
ALTER TABLE participants
  ADD COLUMN hijab_photo_preference text CHECK (hijab_photo_preference IN ('with_or_without', 'only_with'));
