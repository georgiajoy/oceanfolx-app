import { supabase, UserProfile, UserRole } from './supabase';

function phoneToEmail(phone: string): string {
  const cleanPhone = phone.replace(/[^0-9+]/g, '');
  return `${cleanPhone}@swimprogram.local`;
}

export async function signInWithPhone(phone: string, password: string) {
  const email = phoneToEmail(phone);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  // Ensure the session is set in the client
  if (data.session) {
    await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  }

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

export async function signUpWithPhone(
  phone: string,
  password: string,
  role: UserRole,
  preferredLanguage: 'en' | 'id' = 'en'
) {
  const email = phoneToEmail(phone);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;

  if (data.user) {
    const { error: profileError } = await supabase.from('users').insert({
      id: data.user.id,
      role,
      preferred_language: preferredLanguage,
      phone,
    });

    if (profileError) throw profileError;
  }

  return data;
}

export async function signUp(email: string, password: string, role: UserRole, preferredLanguage: 'en' | 'id' = 'en') {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;

  if (data.user) {
    const { error: profileError } = await supabase.from('users').insert({
      id: data.user.id,
      role,
      preferred_language: preferredLanguage,
    });

    if (profileError) throw profileError;
  }

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
  return data;
}

export function getRoleRedirectPath(role: UserRole): string {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'volunteer':
      return '/volunteer';
    case 'participant':
      return '/participant';
    default:
      return '/';
  }
}
