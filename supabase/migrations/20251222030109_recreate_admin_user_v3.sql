/*
  # Recreate Admin User (v3)
  
  1. Changes
    - Recreates the admin user with proper auth setup
    - Includes provider_id in identity
    
  2. Security
    - Password is hashed using crypt
    - User role is set in app_metadata
*/

-- Insert into auth.users first with properly hashed password
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  aud,
  role
)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  '0811111111@swimprogram.local',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  '{"role": "admin", "provider": "email", "providers": ["email"]}'::jsonb,
  '{}'::jsonb,
  NOW(),
  NOW(),
  '',
  '',
  '',
  '',
  'authenticated',
  'authenticated'
);

-- Create an identity for the user
INSERT INTO auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000001'::text,
  '00000000-0000-0000-0000-000000000001'::uuid,
  format('{"sub":"%s","email":"%s"}', '00000000-0000-0000-0000-000000000001'::text, '0811111111@swimprogram.local')::jsonb,
  'email',
  NOW(),
  NOW(),
  NOW()
);

-- Now insert into public.users
INSERT INTO public.users (id, role, preferred_language, phone)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'admin',
  'en',
  '0811111111'
);
