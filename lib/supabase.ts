import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type UserRole = 'admin' | 'volunteer' | 'participant';
export type Language = 'en' | 'id';

export interface UserProfile {
  id: string;
  role: UserRole;
  preferred_language: Language;
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
  created_at: string;
}

export interface Session {
  id: string;
  date: string;
  time: string;
  type: string;
  created_at: string;
}

export interface Attendance {
  id: string;
  session_id: string;
  participant_id: string;
  status: 'present' | 'absent' | 'self_reported';
  validated_by_volunteer_id: string | null;
  created_at: string;
}

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

export interface ParticipantSkill {
  id: string;
  participant_id: string;
  skill_id: string;
  achieved_date: string | null;
  validated_by_volunteer_id: string | null;
  notes: string;
  created_at: string;
}

export interface ParticipantLevel {
  id: string;
  participant_id: string;
  level_id: string;
  achieved_date: string | null;
  validated_by_volunteer_id: string | null;
  notes: string;
  created_at: string;
}

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
