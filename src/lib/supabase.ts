import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

// Read from environment variables or custom runtime storage for preview configuration
const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if user has entered custom credentials via configuration panel during testing
const customUrl = typeof window !== 'undefined' ? localStorage.getItem('touchbizz_supabase_url') : null;
const customKey = typeof window !== 'undefined' ? localStorage.getItem('touchbizz_supabase_key') : null;

export const supabaseUrl = customUrl || envUrl || '';
export const supabaseAnonKey = customKey || envKey || '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('your-project') &&
    supabaseAnonKey.length > 10
  );
};

// Fallback dummy URL to prevent createClient crash if credentials are not yet entered
const effectiveUrl = isSupabaseConfigured() ? supabaseUrl : 'https://placeholder-touchbizz.supabase.co';
const effectiveKey = isSupabaseConfigured() ? supabaseAnonKey : 'placeholder-anon-key-touchbizz';

export const supabase: SupabaseClient<any> = createClient<any>(
  effectiveUrl,
  effectiveKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export function setCustomSupabaseConfig(url: string, key: string) {
  localStorage.setItem('touchbizz_supabase_url', url.trim());
  localStorage.setItem('touchbizz_supabase_key', key.trim());
  window.location.reload();
}

export function resetCustomSupabaseConfig() {
  localStorage.removeItem('touchbizz_supabase_url');
  localStorage.removeItem('touchbizz_supabase_key');
  window.location.reload();
}

/**
 * Checks whether a given Supabase error indicates that the PostgreSQL tables or schema
 * have not been migrated yet (e.g. PGRST205, 42P01 table not found).
 */
export function isSchemaMissingError(error: any): boolean {
  if (!error) return false;
  const code = error?.code;
  const msg = typeof error?.message === 'string' ? error.message : JSON.stringify(error || '');
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    msg.includes('schema cache') ||
    msg.includes('Could not find the table') ||
    (msg.includes('relation') && msg.includes('does not exist')) ||
    (msg.includes('table') && msg.includes('does not exist'))
  );
}

/**
 * Extracts the project reference ID from a Supabase URL, e.g.
 * https://sab7l5dwddxokd2xyhj3y3.supabase.co -> "sab7l5dwddxokd2xyhj3y3"
 */
export function extractSupabaseProjectRef(url: string): string | null {
  if (!url) return null;
  try {
    const cleanUrl = url.trim().toLowerCase();
    const parsed = new URL(cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`);
    const host = parsed.hostname;
    const parts = host.split('.');
    if (parts.length >= 3 && parts[1] === 'supabase' && parts[2] === 'co') {
      return parts[0];
    }
  } catch {
    // ignore
  }
  return null;
}

// Re-export UUID helpers for database safety
export { isValidUUID, generateUUID, isInvalidUUIDError } from './uuid';

