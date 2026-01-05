import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'admin' | 'volunteer' | 'participant';
export type Language = 'en' | 'id';

export interface UserProfile {
  id: string;
  role: UserRole;
  preferred_language: Language;
  full_name?: string | null;
  phone: string | null;
  created_at: string;
}

export interface Participant {
  id: string;
  user_id: string;
  full_name: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  shoe_size: string | null;
  clothing_size: string | null;
  notes: string | null;
  profile_photo_url: string | null;
  // New participant information fields
  age: string | null;
  village: string | null;
  number_of_children: string | null;
  respiratory_issues: string | null;
  diabetes: string | null;
  neurological_conditions: string | null;
  chronic_illnesses: string | null;
  head_injuries: string | null;
  hospitalizations: string | null;
  medications: string | null;
  medications_not_taking_during_program: string | null;
  medical_dietary_requirements: string | null;
  religious_personal_dietary_restrictions: string | null;
  // Swimming ability fields (none, poor, competent, advanced)
  swim_ability_calm: 'none' | 'poor' | 'competent' | 'advanced' | null;
  swim_ability_moving: 'none' | 'poor' | 'competent' | 'advanced' | null;
  surfing_experience: 'none' | 'poor' | 'competent' | 'advanced' | null;
  // Acknowledgment and agreement fields
  commitment_statement: boolean | null;
  risks_release_indemnity_agreement: boolean | null;
  media_release_agreement: boolean | null;
  hijab_photo_preference: 'with_or_without' | 'only_with' | null;
  signature: string | null;
  signature_date: string | null;
  created_at: string;
}

export interface Session {
  id: string;
  date: string;
  time: string;
  type: string;
  created_at: string;
}

export interface SessionParticipant {
  id: string;
  session_id: string;
  participant_id: string;
  status: 'signed_up' | 'present' | 'absent' | 'self_reported';
  signed_up_at: string;
  marked_at: string | null;
  validated_by_volunteer_id: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

// Backward compatibility alias
export type Attendance = SessionParticipant;

export interface Level {
  id: string;
  name_en: string;
  name_id: string;
  description_en: string;
  description_id: string;
  order_number: number;
  created_at: string;
}

export interface Skill {
  id: string;
  level_id: string;
  name_en: string;
  name_id: string;
  description_en: string;
  description_id: string;
  order_number: number;
  created_at: string;
}

export interface ParticipantProgress {
  id: string;
  participant_id: string;
  skill_id?: string | null;
  level_id?: string | null;
  achieved_date?: string | null;
  validated_by_volunteer_id?: string | null;
  notes?: string;
  created_at?: string;
}

// Backward-compatible aliases
export type ParticipantSkill = ParticipantProgress;
export type ParticipantLevel = ParticipantProgress;

export interface GearType {
  id: string;
  name: string;
  sponsor_name: string;
  description: string;
  created_at: string;
}

export interface GearInventory {
  id: string;
  gear_type_id: string;
  size: string;
  quantity_total: number;
  quantity_available: number;
  notes: string;
  created_at: string;
}

export interface GearAssignment {
  id: string;
  participant_id: string;
  gear_inventory_id: string;
  assigned_by_user_id: string;
  assigned_date: string;
  notes: string;
  created_at: string;
}
