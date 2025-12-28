/**
 * Phone number utilities for OceanFolx
 * Maps phone numbers to deterministic pseudo-emails for Supabase auth
 */

/**
 * Normalize a phone number to digits only
 * Rules:
 * - Strip all non-digits
 * - If starts with "0", assume Indonesia and replace with "62"
 * - Validate length 8-15 digits
 * - Return digits-only string (no "+")
 */
export function normalizePhoneToDigits(phone: string): string {
  // Strip all non-digits
  let digits = phone.replace(/\D/g, '');
  
  // If starts with "0", assume Indonesia and replace with country code "62"
  if (digits.startsWith('0')) {
    digits = '62' + digits.slice(1);
  }
  
  // Validate length
  if (digits.length < 8 || digits.length > 15) {
    throw new Error('Phone number must be between 8 and 15 digits after normalization');
  }
  
  return digits;
}

/**
 * Convert phone number to pseudo-email for Supabase auth
 * Uses @oceanfolx.org domain
 * Prefix with "p" to satisfy email validators that require letters
 */
export function phoneToEmail(phone: string): string {
  const digits = normalizePhoneToDigits(phone);
  return `p${digits}@oceanfolx.org`;
}
