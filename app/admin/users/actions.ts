'use server';

import { UserRole, Language } from '@/lib/supabase';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerClientSupabase } from '@/lib/supabase/server';
import { normalizePhoneToDigits, phoneToEmail } from '@/lib/phone';

type LegacyUsersRole = 'admin' | 'intern' | 'participant' | 'local_leader';
type BusinessRole =
  | 'participant'
  | 'remote_foreign_staff'
  | 'in_person_facilitator'
  | 'non_program_foreign_staff'
  | 'in_person_foreign_staff'
  | 'remote_volunteer'
  | 'local_leader'
  | 'intern'
  | 'admin';

function normalizeBusinessRole(role: UserRole): BusinessRole {
  if (role === 'volunteer') return 'remote_volunteer';
  return role as BusinessRole;
}

function mapBusinessRoleToLegacyUsersRole(role: BusinessRole): LegacyUsersRole {
  if (role === 'participant') return 'participant';
  if (role === 'admin' || role === 'intern') return role;
  return 'local_leader';
}

function mapRoleToAccessLevel(role: UserRole | null | undefined): 'participant' | 'employee' | 'admin' | null {
  if (!role) return null;
  if (role === 'participant') return 'participant';
  if (role === 'admin' || role === 'intern') return 'admin';
  if (
    role === 'local_leader' ||
    role === 'remote_foreign_staff' ||
    role === 'in_person_facilitator' ||
    role === 'non_program_foreign_staff' ||
    role === 'in_person_foreign_staff' ||
    role === 'remote_volunteer' ||
    role === 'volunteer'
  ) {
    return 'employee';
  }
  return null;
}

async function getCallerRoleAndAccessLevel(supabase: ReturnType<typeof createServerClientSupabase>, userId: string) {
  let role: UserRole | null = null;

  // Prefer new role architecture when available
  try {
    const { data: userRoleData, error: userRoleError } = await supabase
      .from('user_roles')
      .select('role_id, is_active')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (!userRoleError && userRoleData?.role_id) {
      role = userRoleData.role_id as UserRole;
      return { role, accessLevel: mapRoleToAccessLevel(role) };
    }
  } catch {
    // Ignore and use legacy fallback below.
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (userError || !userData) {
    throw new Error('User profile not found');
  }

  role = userData.role as UserRole;
  return { role, accessLevel: mapRoleToAccessLevel(role) };
}

function parseMissingUsersColumn(error: any): string | null {
  const message = error?.message || '';
  const match = message.match(/Could not find the '([^']+)' column of 'users'/i);
  return match?.[1] || null;
}

function parseMissingTableColumn(error: any, tableName: string): string | null {
  const message = error?.message || '';
  const regex = new RegExp(`Could not find the '([^']+)' column of '${tableName}'`, 'i');
  const match = message.match(regex);
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

async function upsertUserRoleWithCompatibility(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  roleId: BusinessRole
) {
  const payload: Record<string, any> = {
    user_id: userId,
    role_id: roleId,
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  let attempts = 0;
  while (attempts < 10) {
    attempts += 1;
    const { error } = await supabase.from('user_roles').upsert(payload, { onConflict: 'user_id' });

    if (!error) {
      return { error: null };
    }

    const missingColumn = parseMissingTableColumn(error, 'user_roles');
    if (!missingColumn || !(missingColumn in payload)) {
      return { error };
    }

    delete payload[missingColumn];
  }

  return { error: new Error('Exceeded compatibility retries for user_roles upsert') };
}

async function upsertUserProfileWithCompatibility(
  supabase: ReturnType<typeof createAdminClient>,
  payload: Record<string, any>
) {
  const workingPayload = { ...payload };
  let attempts = 0;

  while (attempts < 40) {
    attempts += 1;
    const { error } = await supabase.from('user_profiles').upsert(workingPayload, { onConflict: 'user_id' });

    if (!error) {
      return { error: null };
    }

    const missingColumn = parseMissingTableColumn(error, 'user_profiles');
    if (!missingColumn || !(missingColumn in workingPayload)) {
      return { error };
    }

    delete workingPayload[missingColumn];
  }

  return { error: new Error('Exceeded compatibility retries for user_profiles upsert') };
}

async function upsertCoreFormSubmissionsWithCompatibility(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  commitmentStatement?: boolean,
  risksReleaseIndemnityAgreement?: boolean,
  mediaReleaseAgreement?: boolean,
  hijabPhotoPreference?: 'with_or_without' | 'only_with',
  signatureDate?: string
) {
  const signedAt = signatureDate || null;
  const baseRows = [
    { user_id: userId, form_id: 'commitment_statement', accepted: Boolean(commitmentStatement), signed_at: signedAt },
    { user_id: userId, form_id: 'indemnity_agreement', accepted: Boolean(risksReleaseIndemnityAgreement), signed_at: signedAt },
    { user_id: userId, form_id: 'media_consent', accepted: Boolean(mediaReleaseAgreement), signed_at: signedAt },
    { user_id: userId, form_id: 'hijab_photo_preference', accepted: Boolean(hijabPhotoPreference), signed_at: signedAt },
  ];

  const rows = baseRows.map((row) => ({ ...row }));
  let attempts = 0;

  while (attempts < 15) {
    attempts += 1;
    const { error } = await supabase
      .from('user_form_submissions')
      .upsert(rows as any, { onConflict: 'user_id,form_id' });

    if (!error) {
      return { error: null };
    }

    const missingColumn = parseMissingTableColumn(error, 'user_form_submissions');
    if (!missingColumn) {
      return { error };
    }

    let removed = false;
    rows.forEach((row) => {
      if (missingColumn in row) {
        delete (row as Record<string, any>)[missingColumn];
        removed = true;
      }
    });

    if (!removed) {
      return { error };
    }
  }

  return { error: new Error('Exceeded compatibility retries for user_form_submissions upsert') };
}

/**
 * Get hardcoded policy URLs based on user role
 */
function getPolicyUrlsForRole(role: UserRole) {
  const businessRole = normalizeBusinessRole(role);

  if (
    businessRole === 'local_leader' ||
    businessRole === 'remote_foreign_staff' ||
    businessRole === 'in_person_facilitator' ||
    businessRole === 'non_program_foreign_staff' ||
    businessRole === 'in_person_foreign_staff' ||
    businessRole === 'remote_volunteer'
  ) {
    return {
      code_of_conduct_url: 'https://docs.google.com/document/d/1yoosDEv4FWcuuPkQAyGOjmuv35mJpVAL',
      safeguarding_policy_url: 'https://docs.google.com/document/d/1bJEFsidVXBV7r-69Z9MtCkwCITKsMLEq',
      indemnity_agreement_url: 'https://docs.google.com/document/d/14bXajnXp_FwSqob-v81_sdGbylUYh6r9',
    };
  } else if (businessRole === 'admin' || businessRole === 'intern') {
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
  
  const { accessLevel } = await getCallerRoleAndAccessLevel(supabase, user.id);

  if (accessLevel !== 'admin') {
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
  
  const { role, accessLevel } = await getCallerRoleAndAccessLevel(supabase, user.id);

  if (!role) {
    throw new Error('User profile not found');
  }

  if (accessLevel !== 'admin') {
    throw new Error('Not authorized. Admin-level access required.');
  }
  
  return { userId: user.id, role };
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
  await assertCallerIsAdminOrIntern();

  const businessRole = normalizeBusinessRole(role);
  const legacyUsersRole = mapBusinessRoleToLegacyUsersRole(businessRole);
  
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
      role: legacyUsersRole,
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

    const { error: userRoleError } = await upsertUserRoleWithCompatibility(supabase, authData.user.id, businessRole);
    if (userRoleError) throw userRoleError;

    const { error: userProfileError } = await upsertUserProfileWithCompatibility(supabase, {
      user_id: authData.user.id,
      preferred_name: preferredName || null,
      birthday: birthday || null,
      number_of_children: numberOfChildren || null,
      occupation: null,
      bpjs_number: bpjsNumber || null,
      village: village || null,
      emergency_contact_name: emergencyContactName || null,
      emergency_contact_phone: emergencyContactPhone || null,
      allergies: allergies || null,
      respiratory_issues: respiratoryIssues || null,
      diabetes: diabetes || null,
      neurological_conditions: neurologicalConditions || null,
      chronic_illnesses: chronicIllnesses || null,
      head_injuries: headInjuries || null,
      hospitalizations: hospitalizations || null,
      medications: medications || null,
      medications_not_taking_during_program: medicationsNotTakingDuringProgram || null,
      medical_dietary_requirements: medicalDietaryRequirements || null,
      religious_personal_dietary_requirements: religiousPersonalDietaryRestrictions || null,
      swim_ability_calm: swimAbilityCalm || null,
      swim_ability_moving: swimAbilityMoving || null,
      surfing_experience: surfingExperience || null,
      shoe_size: shoeSize || null,
      clothing_size: clothingSize || null,
      commitment_statement: commitmentStatement || false,
      indemnity_agreement: risksReleaseIndemnityAgreement || false,
      media_consent: mediaReleaseAgreement || false,
      hijab_photo_preference: hijabPhotoPreference || null,
      signature: signature || null,
      signature_date: signatureDate || null,
      profile_photo_url: profilePhotoUrl || null,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    });
    if (userProfileError) throw userProfileError;

    const { error: userFormsError } = await upsertCoreFormSubmissionsWithCompatibility(
      supabase,
      authData.user.id,
      commitmentStatement,
      risksReleaseIndemnityAgreement,
      mediaReleaseAgreement,
      hijabPhotoPreference,
      signatureDate
    );
    if (userFormsError) throw userFormsError;

    // Create participant record if role is participant
    if (businessRole === 'participant') {
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
  await assertCallerIsAdminOrIntern();

  const businessRole = normalizeBusinessRole(role);
  const legacyUsersRole = mapBusinessRoleToLegacyUsersRole(businessRole);

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
      role: legacyUsersRole,
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

    const { error: userRoleError } = await upsertUserRoleWithCompatibility(supabase, userId, businessRole);
    if (userRoleError) throw userRoleError;

    const { error: userProfileError } = await upsertUserProfileWithCompatibility(supabase, {
      user_id: userId,
      preferred_name: preferredName || null,
      birthday: birthday || null,
      number_of_children: numberOfChildren || null,
      occupation: null,
      bpjs_number: bpjsNumber || null,
      village: village || null,
      emergency_contact_name: emergencyContactName || null,
      emergency_contact_phone: emergencyContactPhone || null,
      allergies: allergies || null,
      respiratory_issues: respiratoryIssues || null,
      diabetes: diabetes || null,
      neurological_conditions: neurologicalConditions || null,
      chronic_illnesses: chronicIllnesses || null,
      head_injuries: headInjuries || null,
      hospitalizations: hospitalizations || null,
      medications: medications || null,
      medications_not_taking_during_program: medicationsNotTakingDuringProgram || null,
      medical_dietary_requirements: medicalDietaryRequirements || null,
      religious_personal_dietary_requirements: religiousPersonalDietaryRestrictions || null,
      swim_ability_calm: swimAbilityCalm || null,
      swim_ability_moving: swimAbilityMoving || null,
      surfing_experience: surfingExperience || null,
      shoe_size: shoeSize || null,
      clothing_size: clothingSize || null,
      commitment_statement: commitmentStatement || false,
      indemnity_agreement: risksReleaseIndemnityAgreement || false,
      media_consent: mediaReleaseAgreement || false,
      hijab_photo_preference: hijabPhotoPreference || null,
      signature: signature || null,
      signature_date: signatureDate || null,
      profile_photo_url: profilePhotoUrl || null,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    });
    if (userProfileError) throw userProfileError;

    const { error: userFormsError } = await upsertCoreFormSubmissionsWithCompatibility(
      supabase,
      userId,
      commitmentStatement,
      risksReleaseIndemnityAgreement,
      mediaReleaseAgreement,
      hijabPhotoPreference,
      signatureDate
    );
    if (userFormsError) throw userFormsError;

    if (businessRole === 'participant') {
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
  const { userId: callerId } = await assertCallerIsAdminOrIntern();
  
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

export interface UserFormSubmissionInput {
  form_id: string;
  accepted: boolean;
  signed_at?: string | null;
}

export interface UserFileUploadInput {
  file_id: string;
  file_url: string;
  notes?: string | null;
}

export async function saveUserFormSubmissionsAction(userId: string, submissions: UserFormSubmissionInput[]) {
  await assertCallerIsAdminOrIntern();

  if (!userId) {
    throw new Error('User ID is required');
  }

  const supabase = createAdminClient();

  const rows = submissions.map((submission) => ({
    user_id: userId,
    form_id: submission.form_id,
    accepted: submission.accepted,
    signed_at: submission.signed_at || null,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('user_form_submissions')
    .upsert(rows, { onConflict: 'user_id,form_id' });

  if (error) {
    throw new Error(error.message || 'Failed to save form submissions');
  }

  return { success: true };
}

export async function saveUserFileUploadsAction(userId: string, uploads: UserFileUploadInput[]) {
  await assertCallerIsAdminOrIntern();

  if (!userId) {
    throw new Error('User ID is required');
  }

  const supabase = createAdminClient();

  const fileIds = uploads.map((upload) => upload.file_id);
  if (fileIds.length > 0) {
    const { error: deleteError } = await supabase
      .from('user_file_uploads')
      .delete()
      .eq('user_id', userId)
      .in('file_id', fileIds);

    if (deleteError) {
      throw new Error(deleteError.message || 'Failed to clear previous file records');
    }
  }

  const validUploads = uploads
    .filter((upload) => upload.file_url && upload.file_url.trim().length > 0)
    .map((upload) => ({
      user_id: userId,
      file_id: upload.file_id,
      file_url: upload.file_url.trim(),
      notes: upload.notes || null,
    }));

  if (validUploads.length === 0) {
    return { success: true };
  }

  const { error } = await supabase
    .from('user_file_uploads')
    .insert(validUploads);

  if (error) {
    throw new Error(error.message || 'Failed to save file uploads');
  }

  return { success: true };
}

export async function updateUserProfilePhotoAction(userId: string, profilePhotoUrl: string) {
  await assertCallerIsAdminOrIntern();

  if (!userId) {
    throw new Error('User ID is required');
  }

  const supabase = createAdminClient();

  const { error: userUpdateError } = await updateUserWithCompatibleColumns(supabase, userId, {
    profile_photo_url: profilePhotoUrl,
  });

  if (userUpdateError) {
    throw new Error(userUpdateError.message || 'Failed to update user profile photo');
  }

  const { error: profileError } = await upsertUserProfileWithCompatibility(supabase, {
    user_id: userId,
    profile_photo_url: profilePhotoUrl,
    updated_at: new Date().toISOString(),
  });

  if (profileError) {
    throw new Error(profileError.message || 'Failed to update user profile photo metadata');
  }

  const { data: participantData, error: participantError } = await supabase
    .from('participants')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!participantError && participantData?.id) {
    await supabase
      .from('participants')
      .update({ profile_photo_url: profilePhotoUrl })
      .eq('id', participantData.id);
  }

  return { success: true };
}
