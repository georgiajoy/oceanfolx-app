/*
  # Add Test Participant Record

  ## Overview
  Creates a participant record for the existing test participant user.

  ## Changes
  - Adds a participant record for user ID '00000000-0000-0000-0000-000000000003'
  - Links to the existing participant user account
  - Provides sample participant information
  
  ## Security
  - Uses existing RLS policies for participants table
*/

-- Insert a participant record for the test participant user if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM participants 
    WHERE user_id = '00000000-0000-0000-0000-000000000003'::uuid
  ) THEN
    INSERT INTO participants (
      user_id,
      full_name,
      emergency_contact_name,
      emergency_contact_phone
    )
    VALUES (
      '00000000-0000-0000-0000-000000000003'::uuid,
      'Test Participant',
      'Emergency Contact Person',
      '0844444444'
    );
  END IF;
END $$;
