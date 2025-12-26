'use server';

import { createClient } from '@supabase/supabase-js';
import { UserRole, Language } from '@/lib/supabase';

function phoneToEmail(phone: string): string {
  const cleanPhone = phone.replace(/[^0-9+]/g, '');
  return `p${cleanPhone}@gmail.com`;
}

export async function createUserAction(
  phone: string,
  password: string,
  role: UserRole,
  fullName: string,
  emergencyContactName?: string,
  emergencyContactPhone?: string,
  preferredLanguage: Language = 'en'
) {
  // Use service role key to bypass RLS
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY (service role key) is not set. Add it to your environment (e.g., in .env.local) as SUPABASE_SERVICE_ROLE_KEY and restart the dev server.');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const email = phoneToEmail(phone);

  try {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Failed to create auth user');

    // Insert into users table with service role (bypasses RLS)
    // Retry briefly if the auth user row isn't immediately visible due to race conditions
    let userError: any = null;
    const maxAttempts = 5;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const res = await supabase.from('users').insert({
        id: authData.user.id,
        role,
        preferred_language: preferredLanguage,
        phone,
        full_name: fullName,
      });
      userError = res.error;
      if (!userError) break;
      // If foreign key error, wait a short time and retry
      if (userError.code === '23503') {
        await new Promise((r) => setTimeout(r, 250));
        continue;
      }
      // Other errors should abort
      break;
    }

    if (userError) {
      // Cleanup: remove the auth user we created to avoid orphaned auth entries
      try {
        await supabase.auth.admin.deleteUser(authData.user.id);
      } catch (cleanupErr) {
        console.error('Failed to cleanup auth user after users insert failure:', cleanupErr);
      }
      throw userError;
    }

    // Create participant record if role is participant
    if (role === 'participant') {
      const { error: participantError } = await supabase.from('participants').insert({
        user_id: authData.user.id,
        emergency_contact_name: emergencyContactName || '',
        emergency_contact_phone: emergencyContactPhone || '',
      });

      if (participantError) throw participantError;
    }

    return { success: true, userId: authData.user.id };
  } catch (error: any) {
    console.error('Error creating user:', error);
    throw new Error(error.message || 'Failed to create user');
  }
}
