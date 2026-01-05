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

/**
 * Authorization guard: ensures the caller is an authenticated admin or volunteer
 * Returns both the user ID and role
 */
async function assertCallerIsAdminOrVolunteer(): Promise<{ userId: string; role: UserRole }> {
  const supabase = createServerClientSupabase();
  
  // Check if user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    throw new Error('Not authenticated');
  }
  
  // Check if user has admin or volunteer role in public.users table
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  
  if (userError || !userData) {
    throw new Error('User profile not found');
  }
  
  if (userData.role !== 'admin' && userData.role !== 'volunteer') {
    throw new Error('Not authorized. Admin or Volunteer access required.');
  }
  
  return { userId: user.id, role: userData.role as UserRole };
}

export async function createUserAction(
  phone: string,
  password: string,
  role: UserRole,
  fullName: string,
  emergencyContactName?: string,
  emergencyContactPhone?: string,
  preferredLanguage: Language = 'en',
  // New participant fields
  shoeSize?: string,
  clothingSize?: string,
  age?: string,
  village?: string,
  numberOfChildren?: string,
  respiratoryIssues?: string,
  diabetes?: string,
  neurologicalConditions?: string,
  chronicIllnesses?: string,
  headInjuries?: string,
  hospitalizations?: string,
  medications?: string,
  medicationsNotTakingDuringProgram?: string,
  medicalDietaryRequirements?: string,
  religiousPersonalDietaryRestrictions?: string,
  swimAbilityCalm?: 'none' | 'poor' | 'competent' | 'advanced',
  swimAbilityMoving?: 'none' | 'poor' | 'competent' | 'advanced',
  surfingExperience?: 'none' | 'poor' | 'competent' | 'advanced',
  // Acknowledgment and agreement fields
  commitmentStatement?: boolean,
  acknowledgmentAgreementAuthorization?: boolean,
  risksReleaseIndemnityAgreement?: boolean,
  mediaReleaseAgreement?: boolean,
  signature?: string,
  signatureDate?: string
) {
  // Verify caller is admin or volunteer
  const { role: callerRole } = await assertCallerIsAdminOrVolunteer();
  
  // Volunteers can only create participants
  if (callerRole === 'volunteer' && role !== 'participant') {
    throw new Error('Volunteers can only create participant users');
  }
  
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
        shoe_size: shoeSize || null,
        clothing_size: clothingSize || null,
        age: age || null,
        village: village || null,
        number_of_children: numberOfChildren || null,
        respiratory_issues: respiratoryIssues || null,
        diabetes: diabetes || null,
        neurological_conditions: neurologicalConditions || null,
        chronic_illnesses: chronicIllnesses || null,
        head_injuries: headInjuries || null,
        hospitalizations: hospitalizations || null,
        medications: medications || null,
        medications_not_taking_during_program: medicationsNotTakingDuringProgram || null,
        medical_dietary_requirements: medicalDietaryRequirements || null,
        religious_personal_dietary_restrictions: religiousPersonalDietaryRestrictions || null,
        swim_ability_calm: swimAbilityCalm || null,
        swim_ability_moving: swimAbilityMoving || null,
        surfing_experience: surfingExperience || null,
        commitment_statement: commitmentStatement || false,
        acknowledgment_agreement_authorization: acknowledgmentAgreementAuthorization || false,
        risks_release_indemnity_agreement: risksReleaseIndemnityAgreement || false,
        media_release_agreement: mediaReleaseAgreement || false,
        signature: signature || null,
        signature_date: signatureDate || null,
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
 * Delete a user (admin and volunteer)
 * Volunteers can only delete participants
 * Prevents deleting own account
 */
export async function deleteUserAction(userId: string) {
  // Verify caller is admin or volunteer and get their ID and role
  const { userId: callerId, role: callerRole } = await assertCallerIsAdminOrVolunteer();
  
  // Prevent deleting own account
  if (callerId === userId) {
    throw new Error('Cannot delete your own account');
  }
  
  const supabase = createAdminClient();
  
  // If caller is volunteer, verify they are only deleting a participant
  if (callerRole === 'volunteer') {
    const { data: targetUser, error: fetchError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    
    if (fetchError) throw fetchError;
    if (!targetUser) throw new Error('User not found');
    
    if (targetUser.role !== 'participant') {
      throw new Error('Volunteers can only delete participant users');
    }
  }
  
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
