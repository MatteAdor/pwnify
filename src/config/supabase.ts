import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types.ts';

function getEnv(key: string): string | undefined {
  if (typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string> }).env) {
    return (import.meta as unknown as { env: Record<string, string> }).env[key];
  }
  if (typeof globalThis !== 'undefined' && 'process' in globalThis) {
    const p = (globalThis as unknown as { process?: { env?: Record<string, string> } }).process;
    return p?.env?.[key];
  }
  return undefined;
}

const DEFAULT_SUPABASE_URL = 'https://mhnalgbufdlnctwdxppb.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_GLGnIw2hOIbWs8OD5jWGuw_zlVtWMM5';

const supabaseUrl = getEnv('VITE_SUPABASE_URL') || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('placeholder')
);

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'zeroday_supabase_auth_token_v1'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});
