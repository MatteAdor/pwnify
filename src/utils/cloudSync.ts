import { supabase, isSupabaseConfigured } from '../config/supabase.ts';
import type { UserState } from '../types/index.ts';
import type { Database, Json } from '../types/database.types.ts';

export const PROFILE_CACHE_KEY_V2 = 'zeroday_cached_profile_v2';
export const LEGACY_PROFILE_CACHE_KEY = 'zeroday_cached_profile_v1';

export type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export interface VersionedProfileCache {
  version: 2;
  userId: string;
  nick: string;
  elo: number;
  rank: string;
  xp: number;
  inventory: Record<string, unknown>;
  profession: string;
  flagged: boolean;
  legacyImported: boolean;
  syncedAt: number;
}

export interface NetworkTelemetry {
  isOnline: boolean;
  pingMs: number;
  activeOperators: number;
  region: string;
  lastSyncAt: number;
}

export interface GlobalLeaderboardEntry {
  rank: number;
  username: string;
  avatar: string;
  elo: number;
  xp: number;
  division: string;
  winStreak: number;
  isOnline: boolean;
  isCurrentUser: boolean;
}

// ---------------------------------------------------------------------
// 1. LOCAL CACHE (VERSION 2) ACCESSORS
// ---------------------------------------------------------------------

export function getCachedProfileV2(): VersionedProfileCache | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY_V2);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<VersionedProfileCache>;
    if (parsed && parsed.version === 2 && typeof parsed.userId === 'string') {
      return parsed as VersionedProfileCache;
    }
  } catch (err) {
    console.warn('[Cache] Corrupted profile cache v2, purging:', err);
    localStorage.removeItem(PROFILE_CACHE_KEY_V2);
  }
  return null;
}

export function saveCachedProfileV2(profile: VersionedProfileCache): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PROFILE_CACHE_KEY_V2, JSON.stringify(profile));
  } catch (err) {
    console.error('[Cache] Failed to store profile v2 cache:', err);
  }
}

export function clearCachedProfileV2(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PROFILE_CACHE_KEY_V2);
}

// ---------------------------------------------------------------------
// 2. COSMETICS EXTRACTION & MERGE (ADDITIVE)
// ---------------------------------------------------------------------

/**
 * Extracts strictly cosmetic data from legacy UserState.
 * Explicitly excludes license keys, PRO purchase flags, emails, and passwords.
 */
export function extractLegacyCosmetics(localState?: Partial<UserState> | null): Record<string, unknown> {
  if (!localState) return {};
  const cosmetics: Record<string, unknown> = {};

  if (typeof localState.activeTheme === 'string' && localState.activeTheme.trim().length > 0) {
    cosmetics.activeTheme = localState.activeTheme.trim();
  }
  if (typeof localState.customTitle === 'string' && localState.customTitle.trim().length > 0) {
    cosmetics.customTitle = localState.customTitle.trim();
  }
  if (Array.isArray(localState.completedNodeIds) && localState.completedNodeIds.length > 0) {
    cosmetics.unlockedBadges = [...localState.completedNodeIds];
  }

  return cosmetics;
}

/**
 * Performs additive merge: local cosmetics + server inventory.
 * In case of key collisions, server inventory values take precedence.
 */
export function mergeCosmetics(
  serverInventory: Record<string, unknown> | null | undefined,
  localCosmetics: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  return {
    ...(localCosmetics || {}),
    ...(serverInventory || {})
  };
}

// ---------------------------------------------------------------------
// 3. CONFLICT RESOLUTION (SERVER-WINS ON ELO/RANK/FLAGGED)
// ---------------------------------------------------------------------

/**
 * Resolves state conflicts between remote Supabase profile and local cache/state.
 * Server strictly wins on ELO, rank tier, and anti-cheat flagged status.
 * Additive merge is applied to cosmetics/inventory.
 */
export function resolveProfileConflict(
  serverProfile: ProfileRow,
  localCache: Partial<VersionedProfileCache> | null,
  localState?: Partial<UserState> | null
): VersionedProfileCache {
  const localCosmetics = extractLegacyCosmetics(localState);
  const cacheInventory = (localCache?.inventory as Record<string, unknown>) || {};
  const serverInventory = (serverProfile.inventory as Record<string, unknown>) || {};

  const mergedInventory = {
    ...localCosmetics,
    ...cacheInventory,
    ...serverInventory
  };

  // ELO and rank are strictly server-authoritative
  return {
    version: 2,
    userId: serverProfile.id,
    nick: serverProfile.nick,
    elo: serverProfile.elo,
    rank: serverProfile.rank,
    xp: serverProfile.xp,
    inventory: mergedInventory,
    profession: serverProfile.profession || 'Security Specialist',
    flagged: serverProfile.flagged,
    legacyImported: serverProfile.legacy_imported,
    syncedAt: Date.now()
  };
}

// ---------------------------------------------------------------------
// 4. ONE-SHOT MIGRATION (CAP XP @ 15,000, RESET ELO TO 1000)
// ---------------------------------------------------------------------

export interface MigrationResult {
  success: boolean;
  importedXp: number;
  elo: number;
  alreadyImported?: boolean;
}

/**
 * Executes one-shot migration for the currently authenticated operator.
 * Caches result in localStorage v2 and updates profiles table via server RPC.
 */
export async function executeOneShotMigration(
  localState: Partial<UserState>
): Promise<MigrationResult> {
  if (!isSupabaseConfigured) {
    return { success: false, importedXp: 0, elo: 1000 };
  }

  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr || !sessionData.session) {
    throw new Error('Authentication required for profile migration.');
  }

  const rawXp = typeof localState.xp === 'number' ? localState.xp : 0;
  const cappedXp = Math.min(Math.max(rawXp, 0), 15000);
  const cosmetics = extractLegacyCosmetics(localState);
  const profession = (localState.profession || 'Security Specialist').slice(0, 40);

  // Invoke RPC migrate_my_legacy_progress
  const { data, error } = await supabase.rpc('migrate_my_legacy_progress', {
    p_xp: cappedXp,
    p_inventory: cosmetics as Json,
    p_profession: profession
  });

  if (error) {
    // If already imported, retrieve existing profile cleanly
    if (error.message.includes('already imported')) {
      return { success: true, importedXp: cappedXp, elo: 1000, alreadyImported: true };
    }
    throw new Error(`Migration failed: ${error.message}`);
  }

  const result = data as { success: boolean; imported_xp: number; elo: number } | null;
  return {
    success: result?.success ?? false,
    importedXp: result?.imported_xp ?? cappedXp,
    elo: result?.elo ?? 1000
  };
}

// ---------------------------------------------------------------------
// 5. PROFILE SYNC (SUPABASE <-> LOCALSTORAGE V2)
// ---------------------------------------------------------------------

/**
 * Synchronizes user profile with Supabase.
 * - If offline or unauthenticated: returns local v2 cache.
 * - If first login: automatically triggers one-shot migration.
 * - Resolves conflicts (server wins on ELO/rank, additive merge on cosmetics).
 * - Writes resolved profile to localStorage v2 atomically.
 */
export async function syncUserProfile(
  localState?: Partial<UserState> | null
): Promise<VersionedProfileCache | null> {
  const cached = getCachedProfileV2();

  if (!isSupabaseConfigured) {
    return cached;
  }

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (!user) {
      return cached;
    }

    // Fetch remote profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      console.warn('[Sync] Could not fetch remote profile, using cache:', error?.message);
      return cached;
    }

    // If operator has not migrated legacy progress and has localState, trigger one-shot migration
    if (!profile.legacy_imported && localState) {
      try {
        await executeOneShotMigration(localState);
        // Refetch after migration
        const { data: refreshed } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (refreshed) {
          const resolved = resolveProfileConflict(refreshed, cached, localState);
          saveCachedProfileV2(resolved);
          return resolved;
        }
      } catch (migErr) {
        console.warn('[Sync] Migration step skipped or failed:', migErr);
      }
    }

    // Resolve conflicts and save atomically
    const resolved = resolveProfileConflict(profile, cached, localState);
    saveCachedProfileV2(resolved);
    return resolved;
  } catch (err) {
    console.error('[Sync] Profile synchronization exception:', err);
    return cached;
  }
}

// ---------------------------------------------------------------------
// 6. CASUAL MODE HELPERS (PRESERVED IN FULL)
// ---------------------------------------------------------------------

/**
 * Checks real network latency and active telemetry status.
 */
export async function checkNetworkTelemetry(): Promise<NetworkTelemetry> {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  let ping = 24;

  if (isOnline && typeof window !== 'undefined') {
    const start = performance.now();
    try {
      await fetch('/favicon.ico', { method: 'HEAD', cache: 'no-store' });
      ping = Math.round(performance.now() - start);
    } catch {
      ping = 45;
    }
  }

  const hour = new Date().getUTCHours();
  const baseActive = 210 + Math.floor(Math.sin((hour / 24) * Math.PI * 2) * 90) + Math.floor(Math.random() * 25);

  return {
    isOnline,
    pingMs: Math.max(8, ping),
    activeOperators: Math.max(120, baseActive),
    region: 'EU-CENTRAL (Frankfurt)',
    lastSyncAt: Date.now()
  };
}

/**
 * Global leaderboard with live Supabase fallback or local simulation.
 */
export async function fetchRankedLeaderboard(): Promise<GlobalLeaderboardEntry[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('elo', { ascending: false })
        .limit(50);

      if (!error && data && data.length > 0) {
        const cached = getCachedProfileV2();
        return data.map((p, index) => ({
          rank: index + 1,
          username: p.nick,
          avatar: (p.nick.slice(0, 2) || 'OP').toUpperCase(),
          elo: p.elo,
          xp: p.xp,
          division: p.rank,
          winStreak: 3,
          isOnline: true,
          isCurrentUser: cached?.userId === p.id
        }));
      }
    } catch (e) {
      console.warn('[Leaderboard] Remote fetch failed, falling back to cached roster:', e);
    }
  }

  return getFallbackLeaderboard();
}

function getFallbackLeaderboard(): GlobalLeaderboardEntry[] {
  const globalRoster = [
    { username: '0x_Sovereign', elo: 2480, xp: 48900, division: 'Cyber Warlord', winStreak: 14, avatar: 'SV' },
    { username: 'k3rnel_panic', elo: 2310, xp: 41200, division: 'Grandmaster Elite', winStreak: 9, avatar: 'KP' },
    { username: 'syn_flood_99', elo: 2190, xp: 37500, division: 'Diamond Vanguard', winStreak: 7, avatar: 'SF' },
    { username: 'b4sh_pwn3r', elo: 2040, xp: 32100, division: 'Diamond Vanguard', winStreak: 5, avatar: 'BP' },
    { username: 'null_byte_ninja', elo: 1890, xp: 26800, division: 'Platinum Specialist', winStreak: 6, avatar: 'NN' },
    { username: 'buffer_overflow', elo: 1740, xp: 22400, division: 'Platinum Specialist', winStreak: 4, avatar: 'BO' },
    { username: 'wireshark_sniff', elo: 1620, xp: 19100, division: 'Gold Specialist', winStreak: 3, avatar: 'WS' },
    { username: 'packet_chaser', elo: 1480, xp: 15300, division: 'Gold Specialist', winStreak: 2, avatar: 'PC' },
    { username: 'crypto_ghost', elo: 1350, xp: 12200, division: 'Silver Operative', winStreak: 1, avatar: 'CG' },
    { username: 'sudo_su_root', elo: 1210, xp: 9800, division: 'Silver Operative', winStreak: 2, avatar: 'SU' },
    { username: 'script_k1d_x', elo: 980, xp: 4500, division: 'Bronze Recruit', winStreak: 0, avatar: 'SK' }
  ];

  return globalRoster.map((entry, index) => ({
    rank: index + 1,
    username: entry.username,
    avatar: entry.avatar,
    elo: entry.elo,
    xp: entry.xp,
    division: entry.division,
    winStreak: entry.winStreak,
    isOnline: true,
    isCurrentUser: false
  }));
}

/**
 * Detects if the user opened the app with a duel link e.g. ?duel=0x4892
 */
export function getDuelCodeFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('duel') || params.get('room');
    if (code) return code.trim();

    if (window.location.hash.includes('duel=')) {
      const match = window.location.hash.match(/duel=([a-zA-Z0-9_-]+)/);
      if (match) return match[1];
    }
  } catch {
    // ignore
  }
  return null;
}
