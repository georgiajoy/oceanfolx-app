import { UserRole, supabase } from '@/lib/supabase';

export type BusinessRole = Exclude<UserRole, 'volunteer'>;

export interface RoleOption {
  value: BusinessRole;
  label: string;
}

export interface RequiredForm {
  id: string;
  label: string;
  category: string;
}

export interface RequiredFile {
  id: string;
  label: string;
  description?: string;
}

const FALLBACK_ROLE_FORMS: Record<BusinessRole, RequiredForm[]> = {
  participant: [
    { id: 'commitment_statement', label: 'Commitment Statement', category: 'core_agreement' },
    { id: 'indemnity_agreement', label: 'Indemnity Agreement', category: 'core_agreement' },
    { id: 'media_consent', label: 'Media Consent', category: 'core_agreement' },
    { id: 'hijab_photo_preference', label: 'Hijab Photo Preference', category: 'core_agreement' },
  ],
  remote_foreign_staff: [
    { id: 'commitment_statement', label: 'Commitment Statement', category: 'core_agreement' },
    { id: 'indemnity_agreement', label: 'Indemnity Agreement', category: 'core_agreement' },
    { id: 'media_consent', label: 'Media Consent', category: 'core_agreement' },
    { id: 'hijab_photo_preference', label: 'Hijab Photo Preference', category: 'core_agreement' },
    { id: 'code_of_conduct', label: 'Code of Conduct', category: 'policy' },
    { id: 'safeguarding_policy', label: 'Safeguarding Policy', category: 'policy' },
    { id: 'dei_training', label: 'DEI Training', category: 'training' },
    { id: 'brand_press_guidelines', label: 'Brand and Press Guidelines', category: 'training' },
  ],
  in_person_facilitator: [
    { id: 'commitment_statement', label: 'Commitment Statement', category: 'core_agreement' },
    { id: 'indemnity_agreement', label: 'Indemnity Agreement', category: 'core_agreement' },
    { id: 'media_consent', label: 'Media Consent', category: 'core_agreement' },
    { id: 'hijab_photo_preference', label: 'Hijab Photo Preference', category: 'core_agreement' },
    { id: 'code_of_conduct', label: 'Code of Conduct', category: 'policy' },
    { id: 'safeguarding_policy', label: 'Safeguarding Policy', category: 'policy' },
    { id: 'dei_training', label: 'DEI Training', category: 'training' },
    { id: 'brand_press_guidelines', label: 'Brand and Press Guidelines', category: 'training' },
  ],
  non_program_foreign_staff: [
    { id: 'commitment_statement', label: 'Commitment Statement', category: 'core_agreement' },
    { id: 'indemnity_agreement', label: 'Indemnity Agreement', category: 'core_agreement' },
    { id: 'media_consent', label: 'Media Consent', category: 'core_agreement' },
    { id: 'hijab_photo_preference', label: 'Hijab Photo Preference', category: 'core_agreement' },
    { id: 'code_of_conduct', label: 'Code of Conduct', category: 'policy' },
    { id: 'safeguarding_policy', label: 'Safeguarding Policy', category: 'policy' },
    { id: 'dei_training', label: 'DEI Training', category: 'training' },
    { id: 'brand_press_guidelines', label: 'Brand and Press Guidelines', category: 'training' },
  ],
  in_person_foreign_staff: [
    { id: 'commitment_statement', label: 'Commitment Statement', category: 'core_agreement' },
    { id: 'indemnity_agreement', label: 'Indemnity Agreement', category: 'core_agreement' },
    { id: 'media_consent', label: 'Media Consent', category: 'core_agreement' },
    { id: 'hijab_photo_preference', label: 'Hijab Photo Preference', category: 'core_agreement' },
    { id: 'code_of_conduct', label: 'Code of Conduct', category: 'policy' },
    { id: 'safeguarding_policy', label: 'Safeguarding Policy', category: 'policy' },
    { id: 'staff_contract', label: 'Staff Contract', category: 'staff' },
  ],
  remote_volunteer: [
    { id: 'commitment_statement', label: 'Commitment Statement', category: 'core_agreement' },
    { id: 'indemnity_agreement', label: 'Indemnity Agreement', category: 'core_agreement' },
    { id: 'media_consent', label: 'Media Consent', category: 'core_agreement' },
    { id: 'hijab_photo_preference', label: 'Hijab Photo Preference', category: 'core_agreement' },
    { id: 'code_of_conduct', label: 'Code of Conduct', category: 'policy' },
    { id: 'safeguarding_policy', label: 'Safeguarding Policy', category: 'policy' },
    { id: 'dei_training', label: 'DEI Training', category: 'training' },
    { id: 'brand_press_guidelines', label: 'Brand and Press Guidelines', category: 'training' },
  ],
  local_leader: [
    { id: 'commitment_statement', label: 'Commitment Statement', category: 'core_agreement' },
    { id: 'indemnity_agreement', label: 'Indemnity Agreement', category: 'core_agreement' },
    { id: 'media_consent', label: 'Media Consent', category: 'core_agreement' },
    { id: 'hijab_photo_preference', label: 'Hijab Photo Preference', category: 'core_agreement' },
    { id: 'code_of_conduct', label: 'Code of Conduct', category: 'policy' },
    { id: 'safeguarding_policy', label: 'Safeguarding Policy', category: 'policy' },
    { id: 'staff_contract', label: 'Staff Contract', category: 'staff' },
  ],
  intern: [
    { id: 'commitment_statement', label: 'Commitment Statement', category: 'core_agreement' },
    { id: 'indemnity_agreement', label: 'Indemnity Agreement', category: 'core_agreement' },
    { id: 'media_consent', label: 'Media Consent', category: 'core_agreement' },
    { id: 'hijab_photo_preference', label: 'Hijab Photo Preference', category: 'core_agreement' },
    { id: 'code_of_conduct', label: 'Code of Conduct', category: 'policy' },
    { id: 'safeguarding_policy', label: 'Safeguarding Policy', category: 'policy' },
    { id: 'dei_training', label: 'DEI Training', category: 'training' },
    { id: 'brand_press_guidelines', label: 'Brand and Press Guidelines', category: 'training' },
  ],
  admin: [
    { id: 'commitment_statement', label: 'Commitment Statement', category: 'core_agreement' },
    { id: 'indemnity_agreement', label: 'Indemnity Agreement', category: 'core_agreement' },
    { id: 'media_consent', label: 'Media Consent', category: 'core_agreement' },
    { id: 'hijab_photo_preference', label: 'Hijab Photo Preference', category: 'core_agreement' },
  ],
};

const FALLBACK_ROLE_FILES: Record<BusinessRole, RequiredFile[]> = {
  participant: [],
  remote_foreign_staff: [
    { id: 'contractor_service_location_declaration', label: 'Contractor Service Location Declaration' },
    { id: 'tax_info', label: 'Tax Info' },
    { id: 'payment_info', label: 'Payment Info' },
    { id: 'invoices', label: 'Invoices' },
  ],
  in_person_facilitator: [],
  non_program_foreign_staff: [
    { id: 'identity', label: 'Identity' },
    { id: 'insurance', label: 'Insurance' },
    { id: 'contractor_service_location_declaration', label: 'Contractor Service Location Declaration' },
    { id: 'tax_info', label: 'Tax Info' },
    { id: 'payment_info', label: 'Payment Info' },
    { id: 'invoices', label: 'Invoices' },
  ],
  in_person_foreign_staff: [
    { id: 'identity', label: 'Identity' },
    { id: 'insurance', label: 'Insurance' },
    { id: 'first_aid', label: 'First Aid' },
    { id: 'background_check', label: 'Background Check' },
    { id: 'contractor_service_location_declaration', label: 'Contractor Service Location Declaration' },
    { id: 'tax_info', label: 'Tax Info' },
    { id: 'payment_info', label: 'Payment Info' },
    { id: 'invoices', label: 'Invoices' },
  ],
  remote_volunteer: [],
  local_leader: [
    { id: 'identity', label: 'Identity' },
    { id: 'background_check', label: 'Background Check' },
    { id: 'contractor_service_location_declaration', label: 'Contractor Service Location Declaration' },
    { id: 'payment_info', label: 'Payment Info' },
  ],
  intern: [
    { id: 'identity', label: 'Identity' },
    { id: 'insurance', label: 'Insurance' },
    { id: 'first_aid', label: 'First Aid' },
    { id: 'background_check', label: 'Background Check' },
    { id: 'payment_info', label: 'Payment Info' },
  ],
  admin: [],
};

function isMissingRoleRequirementTableError(error: any): boolean {
  const message = String(error?.message || '');
  return error?.code === '42501' ||
    message.includes('permission denied for table role_form_requirements') ||
    message.includes('permission denied for table role_file_requirements') ||
    message.includes("Could not find the table 'public.role_form_requirements'") ||
    message.includes("Could not find the table 'public.role_file_requirements'") ||
    message.includes('schema cache');
}

export const ROLE_OPTIONS: RoleOption[] = [
  { value: 'participant', label: 'Participant' },
  { value: 'intern', label: 'Intern' },
  { value: 'remote_foreign_staff', label: 'Remote Foreign Staff' },
  { value: 'in_person_facilitator', label: 'In-Person Facilitator' },
  { value: 'non_program_foreign_staff', label: 'Non-Program Foreign Staff' },
  { value: 'in_person_foreign_staff', label: 'In-Person Foreign Staff' },
  { value: 'remote_volunteer', label: 'Remote Volunteer' },
  { value: 'local_leader', label: 'Local Leader' },
  { value: 'admin', label: 'Admin' },
];

export function normalizeBusinessRole(role: string): BusinessRole {
  if (role === 'volunteer') return 'remote_volunteer';
  return role as BusinessRole;
}

export function getRoleLabel(role: string): string {
  const found = ROLE_OPTIONS.find((option) => option.value === role);
  if (found) return found.label;
  return role.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function isParticipantRole(role: string): boolean {
  return role === 'participant';
}

export async function fetchRequiredForms(role: BusinessRole): Promise<RequiredForm[]> {
  try {
    const { data, error } = await supabase
      .from('role_form_requirements')
      .select('form_id, form:form_definitions(id, label, category)')
      .eq('role_id', role);

    if (error) throw error;

    return (data || [])
      .map((row: any) => row.form)
      .filter(Boolean)
      .map((form: any) => ({
        id: form.id as string,
        label: form.label as string,
        category: form.category as string,
      }));
  } catch (error) {
    if (isMissingRoleRequirementTableError(error)) {
      return FALLBACK_ROLE_FORMS[role] || [];
    }

    throw error;
  }
}

export async function fetchRequiredFiles(role: BusinessRole): Promise<RequiredFile[]> {
  try {
    const { data, error } = await supabase
      .from('role_file_requirements')
      .select('file_id, file:file_definitions(id, label, description)')
      .eq('role_id', role);

    if (error) throw error;

    return (data || [])
      .map((row: any) => row.file)
      .filter(Boolean)
      .map((file: any) => ({
        id: file.id as string,
        label: file.label as string,
        description: file.description as string,
      }));
  } catch (error) {
    if (isMissingRoleRequirementTableError(error)) {
      return FALLBACK_ROLE_FILES[role] || [];
    }

    throw error;
  }
}
