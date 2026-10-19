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

import { getCachedVersionInfo, isNativeApp } from '../utils/platform.ts';

const versionAwareFetch: typeof fetch = async (input, init) => {
  const versionInfo = getCachedVersionInfo();
  const headers = new Headers(init?.headers || {});

  // Inject client protocol headers into all Supabase requests
  headers.set('X-App-Version', versionInfo.versionName);
  headers.set('X-Build', String(versionInfo.versionCode));
  headers.set('X-Platform', isNativeApp() ? 'android' : 'web');

  const modifiedInit = {
    ...init,
    headers,
  };

  const response = await fetch(input, modifiedInit);

  // Global 426 Upgrade Required interception
  if (response.status === 426) {
    try {
      const clone = response.clone();
      const body = await clone.json().catch(() => ({}));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('zeroday_upgrade_required', { detail: body }));
      }
    } catch {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('zeroday_upgrade_required', { detail: {} }));
      }
    }
  }

  return response;
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'zeroday_supabase_auth_token_v1'
  },
  global: {
    fetch: versionAwareFetch,
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});
