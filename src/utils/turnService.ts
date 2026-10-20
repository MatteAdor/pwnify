import { supabase, isSupabaseConfigured } from '../config/supabase.ts';

export interface RTCIceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface TurnCredentialsResponse {
  iceServers: RTCIceServerConfig[];
  ttl: number;
  userId?: string;
}

export const DEFAULT_ICE_SERVERS: RTCIceServerConfig[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

let cachedIceServers: RTCIceServerConfig[] | null = null;
let cacheExpiresAt = 0;

/**
 * Retrieves ordered ICE servers (STUN -> TURN) with ephemeral credentials.
 * If authenticated with Supabase, calls the get_turn_credentials Edge Function.
 * Falls back to public STUN servers on failure or in unauthenticated/casual sessions.
 */
export async function getAuthoritativeIceServers(): Promise<RTCIceServerConfig[]> {
  const now = Date.now();
  if (cachedIceServers && now < cacheExpiresAt) {
    return cachedIceServers;
  }

  if (!isSupabaseConfigured) {
    return DEFAULT_ICE_SERVERS;
  }

  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    if (sessionError || !token) {
      return DEFAULT_ICE_SERVERS;
    }

    const timeoutPromise = new Promise<{ data: null; error: Error }>((_, reject) => {
      setTimeout(() => reject(new Error('TURN credentials request timed out')), 5000);
    });

    const invokePromise = supabase.functions.invoke<TurnCredentialsResponse>(
      'get_turn_credentials',
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const { data, error } = await Promise.race([invokePromise, timeoutPromise]);

    if (error || !data || !Array.isArray(data.iceServers) || data.iceServers.length === 0) {
      console.warn('[TURN Service] Edge function returned empty or error, falling back to STUN:', error);
      return DEFAULT_ICE_SERVERS;
    }

    // Cache credentials (TTL - 5 minute buffer)
    const ttlMs = ((data.ttl || 3600) - 300) * 1000;
    cachedIceServers = data.iceServers;
    cacheExpiresAt = now + Math.max(60000, ttlMs);

    return data.iceServers;
  } catch (err) {
    console.warn('[TURN Service] Exception while fetching TURN credentials:', err);
    return DEFAULT_ICE_SERVERS;
  }
}

/**
 * Resets the in-memory ICE servers cache (e.g. on logout or disconnect).
 */
export function clearIceServersCache(): void {
  cachedIceServers = null;
  cacheExpiresAt = 0;
}
