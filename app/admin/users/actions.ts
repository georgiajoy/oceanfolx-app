'use server';

import { UserRole, Language } from '@/lib/supabase';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerClientSupabase } from '@/lib/supabase/server';
import { normalizePhoneToDigits, phoneToEmail } from '@/lib/phone';

function parseMissingUsersColumn(error: any): string | null {
  const message = error?.message || '';
  const match = message.match(/Could not find the '([^']+)' column of 'users'/i);
  return match?.[1] || null;
}

async function insertUserWithCompatibleColumns(
  supabase: ReturnType<typeof createAdminClient>,
  payload: Record<string, any>
) {
  const workingPayload = { ...payload };
  let attempts = 0;

  while (attempts < 30) {
    attempts += 1;
    const { error } = await supabase.from('users').insert(workingPayload);

    if (!error) {
      return { error: null };
    }

    const missingColumn = parseMissingUsersColumn(error);
    if (!missingColumn || !(missingColumn in workingPayload)) {
      return { error };
    }

    delete workingPayload[missingColumn];
  }

  return { error: new Error('Exceeded compatibility retries for users insert') };
}

async function updateUserWithCompatibleColumns(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  payload: Record<string, any>
) {
  const workingPayload = { ...payload };
  let attempts = 0;

  while (attempts < 30) {
    attempts += 1;
    const { error } = await supabase
      .from('users')
      .update(workingPayload)
      .eq('id', userId);

    if (!error) {
      return { error: null };
    }

    const missingColumn = parseMissingUsersColumn(error);
    if (!missingColumn || !(missingColumn in workingPayload)) {
      return { error };
    }

    delete workingPayload[missingColumn];
  }

  return { error: new Error('Exceeded compatibility retries for users update') };
}

/**
 * Get hardcoded policy URLs based on user role
 */
function getPolicyUrlsForRole(role: UserRole) {
  if (role === 'local_leader') {
    return {
      code_of_conduct_url: 'https://docs.google.com/document/d/1yoosDEv4FWcuuPkQAyGOjmuv35mJpVAL',
      safeguarding_policy_url: 'https://docs.google.com/document/d/1bJEFsidVXBV7r-69Z9MtCkwCITKsMLEq',
      indemnity_agreement_url: 'https://docs.google.com/document/d/14bXajnXp_FwSqob-v81_sdGbylUYh6r9',
    };
  } else if (role === 'admin' || role === 'intern') {
    return {
      code_of_conduct_url: 'https://docs.google.com/document/d/131Px2JzGfkSwPalBCs8L-',
      safeguarding_policy_url: 'https://docs.google.com/document/d/1bGdLmOJsBYk2OKpYUrMYIheRooHCKyeO',
      indemnity_agreement_url: null,
    };
  }
  return {
    code_of_conduct_url: null,
    safeguarding_policy_url: null,
    indemnity_agreement_url: null,
  };
}

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
 * Authorization guard: ensures the caller is an authenticated admin or intern
 * Returns both the user ID and role
 */
async function assertCallerIsAdminOrIntern(): Promise<{ userId: string; role: UserRole }> {
  const supabase = createServerClientSupabase();
  
  // Check if user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    throw new Error('Not authenticated');
  }
  
  // Check if user has admin or intern role in public.users table
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  
  if (userError || !userData) {
    throw new Error('User profile not found');
  }
  
  if (userData.role !== 'admin' && userData.role !== 'intern') {
    throw new Error('Not authorized. Admin or Intern access required.');
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
  preferredName?: string,
  birthday?: string,
  allergies?: string,
  bpjsNumber?: string,
  profilePhotoUrl?: string,
  notes?: string,
  _codeOfConductUrl?: string,  // ignored - will use hardcoded value
  _safeguardingPolicyUrl?: string,  // ignored - will use hardcoded value
  _indemnityAgreementUrl?: string,  // ignored - will use hardcoded value
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
  risksReleaseIndemnityAgreement?: boolean,
  mediaReleaseAgreement?: boolean,
  hijabPhotoPreference?: 'with_or_without' | 'only_with',
  signature?: string,
  signatureDate?: string
) {
  // Verify caller is admin or intern
  const { role: callerRole } = await assertCallerIsAdminOrIntern();
  
  // Interns can only create participants
  if (callerRole === 'intern' && role !== 'participant') {
    throw new Error('Interns can only create participant users');
  }
  
  // Get hardcoded policy URLs based on role
  const { 
    code_of_conduct_url: codeOfConductUrl, 
    safeguarding_policy_url: safeguardingPolicyUrl, 
    indemnity_agreement_url: indemnityAgreementUrl 
  } = getPolicyUrlsForRole(role);
  
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
    // and gracefully drop fields if remote schema cache is missing newer columns.
    const userInsertPayload = {
      id: authData.user.id,
      role,
      preferred_language: preferredLanguage,
      phone: normalizedPhone,
      full_name: fullName,
      preferred_name: preferredName || null,
      birthday: birthday || null,
      allergies: allergies || null,
      bpjs_number: bpjsNumber || null,
      emergency_contact_name: emergencyContactName || null,
      emergency_contact_phone: emergencyContactPhone || null,
      shoe_size: shoeSize || null,
      clothing_size: clothingSize || null,
      profile_photo_url: profilePhotoUrl || null,
      notes: notes || null,
      code_of_conduct_url: codeOfConductUrl || null,
      safeguarding_policy_url: safeguardingPolicyUrl || null,
      indemnity_agreement_url: indemnityAgreementUrl || null,
    };

    const { error: userError } = await insertUserWithCompatibleColumns(supabase, userInsertPayload);

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
        profile_photo_url: profilePhotoUrl || null,
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
        risks_release_indemnity_agreement: risksReleaseIndemnityAgreement || false,
        media_release_agreement: mediaReleaseAgreement || false,
        hijab_photo_preference: hijabPhotoPreference || null,
        signature: signature || null,
        signature_date: signatureDate || null,
        notes: notes || null,
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

export async function updateUserAction(
  userId: string,
  phone: string,
  role: UserRole,
  fullName: string,
  emergencyContactName?: string,
  emergencyContactPhone?: string,
  preferredLanguage: Language = 'en',
  preferredName?: string,
  birthday?: string,
  allergies?: string,
  bpjsNumber?: string,
  profilePhotoUrl?: string,
  notes?: string,
  _codeOfConductUrl?: string,  // ignored - will use hardcoded value
  _safeguardingPolicyUrl?: string,  // ignored - will use hardcoded value
  _indemnityAgreementUrl?: string,  // ignored - will use hardcoded value
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
  commitmentStatement?: boolean,
  risksReleaseIndemnityAgreement?: boolean,
  mediaReleaseAgreement?: boolean,
  hijabPhotoPreference?: 'with_or_without' | 'only_with',
  signature?: string,
  signatureDate?: string
) {
  const { role: callerRole } = await assertCallerIsAdminOrIntern();
  if (callerRole === 'intern' && role !== 'participant') {
    throw new Error('Interns can only manage participant users');
  }

  // Get hardcoded policy URLs based on role
  const { 
    code_of_conduct_url: codeOfConductUrl, 
    safeguarding_policy_url: safeguardingPolicyUrl, 
    indemnity_agreement_url: indemnityAgreementUrl 
  } = getPolicyUrlsForRole(role);

  const normalizedPhone = normalizePhoneToDigits(phone);
  const supabase = createAdminClient();

  try {
    const userUpdatePayload = {
        role,
        preferred_language: preferredLanguage,
        phone: normalizedPhone,
        full_name: fullName,
        preferred_name: preferredName || null,
        birthday: birthday || null,
        allergies: allergies || null,
        bpjs_number: bpjsNumber || null,
        emergency_contact_name: emergencyContactName || null,
        emergency_contact_phone: emergencyContactPhone || null,
        shoe_size: shoeSize || null,
        clothing_size: clothingSize || null,
        profile_photo_url: profilePhotoUrl || null,
        notes: notes || null,
        code_of_conduct_url: codeOfConductUrl || null,
        safeguarding_policy_url: safeguardingPolicyUrl || null,
        indemnity_agreement_url: indemnityAgreementUrl || null,
      };

    const { error: updateError } = await updateUserWithCompatibleColumns(supabase, userId, userUpdatePayload);

    if (updateError) throw updateError;

    if (role === 'participant') {
      const { data: participantData, error: fetchParticipantError } = await supabase
        .from('participants')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (fetchParticipantError) throw fetchParticipantError;

      const participantPayload = {
        emergency_contact_name: emergencyContactName || null,
        emergency_contact_phone: emergencyContactPhone || null,
        shoe_size: shoeSize || null,
        clothing_size: clothingSize || null,
        profile_photo_url: profilePhotoUrl || null,
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
        risks_release_indemnity_agreement: risksReleaseIndemnityAgreement || false,
        media_release_agreement: mediaReleaseAgreement || false,
        hijab_photo_preference: hijabPhotoPreference || null,
        signature: signature || null,
        signature_date: signatureDate || null,
        notes: notes || null,
      };

      if (participantData) {
        const { error: updateParticipantError } = await supabase
          .from('participants')
          .update(participantPayload)
          .eq('id', participantData.id);

        if (updateParticipantError) throw updateParticipantError;
      } else {
        const { error: insertParticipantError } = await supabase
          .from('participants')
          .insert({
            user_id: userId,
            ...participantPayload,
          });

        if (insertParticipantError) throw insertParticipantError;
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error updating user:', error);
    throw new Error(error.message || 'Failed to update user');
  }
}

/**
 * Delete a user (admin and volunteer)
 * Volunteers can only delete participants
 * Prevents deleting own account
 */
export async function deleteUserAction(userId: string) {
  // Verify caller is admin or intern and get their ID and role
  const { userId: callerId, role: callerRole } = await assertCallerIsAdminOrIntern();
  
  // Prevent deleting own account
  if (callerId === userId) {
    throw new Error('Cannot delete your own account');
  }
  
  const supabase = createAdminClient();
  
  // If caller is intern, verify they are only deleting a participant
  if (callerRole === 'intern') {
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
