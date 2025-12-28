-- Make emergency contact fields optional in participants table
ALTER TABLE participants 
  ALTER COLUMN emergency_contact_name DROP NOT NULL,
  ALTER COLUMN emergency_contact_phone DROP NOT NULL;
