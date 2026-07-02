import { supabase, AccessLevel, UserProfile, UserRole } from './supabase';
import { phoneToEmail } from './phone';

export function mapRoleToAccessLevel(role: UserRole | null | undefined): AccessLevel | null {
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

export async function signInWithPhone(phone: string, password: string) {
  const email = phoneToEmail(phone);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('getUserProfile error:', error);
    throw new Error(`Database error querying schema: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  // Prefer business role from user_roles when available.
  try {
    const { data: userRoleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role_id, is_active')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (!roleError && userRoleData?.role_id) {
      return {
        ...data,
        role: userRoleData.role_id as UserRole,
      };
    }
  } catch (roleLookupError) {
    console.warn('getUserProfile user_roles lookup skipped:', roleLookupError);
  }

  return data;
}

export async function getUserAccessLevel(userId: string): Promise<AccessLevel | null> {
  try {
    const { data: rbacData, error } = await supabase.rpc('get_user_access_level', {
      user_id: userId,
    });

    if (!error && rbacData) {
      return rbacData as AccessLevel;
    }
  } catch (rpcError) {
    console.warn('getUserAccessLevel RPC fallback used:', rpcError);
  }

  const profile = await getUserProfile(userId);
  return mapRoleToAccessLevel(profile?.role);
}

export function getRoleRedirectPath(role: UserRole): string {
  const accessLevel = mapRoleToAccessLevel(role);

  if (accessLevel === 'admin') return '/admin';
  if (accessLevel === 'employee') return '/local_leader';
  if (accessLevel === 'participant') return '/participant';

  return '/';
}
