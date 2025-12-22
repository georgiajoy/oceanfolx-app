/*
  # Fix Test Users Passwords

  1. Updates
    - Recreate volunteer and participant test users with properly hashed passwords
    - Ensure they can authenticate correctly
  
  2. Test Credentials
    - Volunteer: phone "0822222222", password "password123"
    - Participant: phone "0833333333", password "password123"
*/

-- Delete existing volunteer and participant auth users
DELETE FROM auth.users WHERE id IN (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003'
);

-- Recreate volunteer user
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000002',
  'authenticated',
  'authenticated',
  '0822222222@swimprogram.local',
  crypt('password123', gen_salt('bf')),
  NOW(),
  '{"role": "volunteer", "provider": "email", "providers": ["email"]}'::jsonb,
  '{}'::jsonb,
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- Recreate participant user
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000003',
  'authenticated',
  'authenticated',
  '0833333333@swimprogram.local',
  crypt('password123', gen_salt('bf')),
  NOW(),
  '{"role": "participant", "provider": "email", "providers": ["email"]}'::jsonb,
  '{}'::jsonb,
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- Ensure the users table records exist (they should already exist, but let's be safe)
INSERT INTO users (id, role, phone, preferred_language)
VALUES 
  ('00000000-0000-0000-0000-000000000002', 'volunteer', '0822222222', 'en'),
  ('00000000-0000-0000-0000-000000000003', 'participant', '0833333333', 'en')
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  phone = EXCLUDED.phone;
