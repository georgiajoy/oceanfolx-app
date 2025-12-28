'use server';

import { UserRole, Language } from '@/lib/supabase';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerClientSupabase } from '@/lib/supabase/server';
import { normalizePhoneToDigits, phoneToEmail } from '@/lib/phone';

/**
 * Authorization guard: ensures the caller is an authenticated admin
 * Throws error if not authenticated or not an admin
 */
async function assertCallerIsAdmin(): Promise<string> {
  const supabase = createServerClientSupabase();
  
  // Check if user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    throw new Error('Not authenticated');
  }
  
  // Check if user has admin role in public.users table
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  
  if (userError || !userData) {
    throw new Error('User profile not found');
  }
  
  if (userData.role !== 'admin') {
    throw new Error('Not authorized. Admin access required.');
  }
  
  return user.id;
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
  // Verify caller is admin
  await assertCallerIsAdmin();
  
  // Normalize phone number to digits
  const normalizedPhone = normalizePhoneToDigits(phone);
  const email = phoneToEmail(phone);
  
  const supabase = createAdminClient();

  try {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Failed to create auth user');

    // Insert into users table with normalized phone (bypasses RLS via service role)
    const { error: userError } = await supabase.from('users').insert({
      id: authData.user.id,
      role,
      preferred_language: preferredLanguage,
      phone: normalizedPhone,
      full_name: fullName,
    });

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
        emergency_contact_name: emergencyContactName || null,
        emergency_contact_phone: emergencyContactPhone || null,
      });

      if (participantError) {
        // Rollback: delete both users record and auth user
        try {
          await supabase.from('users').delete().eq('id', authData.user.id);
          await supabase.auth.admin.deleteUser(authData.user.id);
        } catch (rollbackErr) {
          console.error('Failed to rollback after participants insert failure:', rollbackErr);
        }
        throw participantError;
      }
    }

    return { success: true, userId: authData.user.id };
  } catch (error: any) {
    console.error('Error creating user:', error);
    throw new Error(error.message || 'Failed to create user');
  }
}

/**
 * Delete a user (admin only)
 * Prevents deleting own account
 */
export async function deleteUserAction(userId: string) {
  // Verify caller is admin and get their ID
  const callerId = await assertCallerIsAdmin();
  
  // Prevent deleting own account
  if (callerId === userId) {
    throw new Error('Cannot delete your own account');
  }
  
  const supabase = createAdminClient();
  
  try {
    // Delete auth user (this will cascade to users table via foreign key)
    const { error } = await supabase.auth.admin.deleteUser(userId);
    
    if (error) throw error;
    
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting user:', error);
    throw new Error(error.message || 'Failed to delete user');
  }
}
