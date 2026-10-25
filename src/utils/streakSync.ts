/**
 * src/utils/streakSync.ts
 *
 * Client-Side Orchestrator for Authoritative Server Streak Validation.
 * Strictly implements Fail-Open semantics:
 * - If online & authenticated: dispatches to PostgreSQL RPC `record_user_streak_activity`.
 * - If offline, unauthenticated, or network timeout: falls open to local `recordLearningActivity`
 *   to ensure user progress is NEVER blocked or lost.
 */

import { supabase, isSupabaseConfigured } from '../config/supabase';
import { StreakState, recordLearningActivity } from './streakEngine';

export interface StreakSyncDisposition {
  streakDays: number;
  streakShieldCount: number;
  streakShieldActive: boolean;
  lastActiveDate: string;
  lastActiveTimestamp: number;
  source: 'server' | 'local';
  shieldEarned: boolean;
  shieldConsumed: boolean;
  tamperDetected: boolean;
  message: string;
}

/**
 * Fetches authoritative database time from Supabase RPC `get_server_time`.
 * Returns null if network fails or offline.
 */
export async function fetchAuthoritativeServerTime(): Promise<{
  timestampMs: number;
  serverDateUtc: string;
} | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const { data, error } = await supabase.rpc('get_server_time');
    if (!error && data && data.server_timestamp_ms) {
      return {
        timestampMs: Number(data.server_timestamp_ms),
        serverDateUtc: data.server_date_utc || new Date().toISOString().split('T')[0]
      };
    }
  } catch (err) {
    console.warn('[StreakSync] get_server_time unreachable, falling back to client clock:', err);
  }
  return null;
}

/**
 * Authoritatively syncs activity with PostgreSQL RPC with fail-open fallback.
 */
export async function syncAuthoritativeActivity(
  currentState: StreakState,
  options?: {
    verifiedPbqId?: string;
    isPro?: boolean;
    customClientTimestampMs?: number;
  }
): Promise<StreakSyncDisposition> {
  const clientNow = options?.customClientTimestampMs ?? Date.now();

  // 1. Try remote authoritative sync if configured and session active
  if (isSupabaseConfigured) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Attempt authoritative RPC
        const { data, error } = await supabase.rpc('record_user_streak_activity', {
          p_timezone: currentState.timezone || 'UTC',
          p_verified_pbq_completion_id: options?.verifiedPbqId || null
        });

        if (!error && data && typeof data.streak_days === 'number') {
          return {
            streakDays: data.streak_days,
            streakShieldCount: data.streak_shield_count ?? currentState.streakShieldCount,
            streakShieldActive: Boolean(options?.isPro || (data.streak_shield_count ?? 0) > 0),
            lastActiveDate: data.effective_date,
            lastActiveTimestamp: clientNow,
            source: 'server',
            shieldEarned: Boolean(data.shield_earned),
            shieldConsumed: Boolean(data.shield_consumed),
            tamperDetected: false,
            message: 'Streak validato dal server.'
          };
        }
      }
    } catch (rpcErr) {
      console.warn('[StreakSync] Authoritative RPC failed, executing fail-open local calculation:', rpcErr);
    }
  }

  // 2. Fail-Open Fallback: Pure Local Engine
  const localRes = recordLearningActivity(currentState, clientNow, {
    isPro: options?.isPro
  });

  return {
    streakDays: localRes.result.newStreak,
    streakShieldCount: localRes.updatedState.streakShieldCount,
    streakShieldActive: localRes.updatedState.streakShieldActive,
    lastActiveDate: localRes.updatedState.lastActiveDate || new Date().toISOString().split('T')[0],
    lastActiveTimestamp: localRes.updatedState.lastActiveTimestamp,
    source: 'local',
    shieldEarned: localRes.result.shieldEarned,
    shieldConsumed: localRes.result.shieldConsumed,
    tamperDetected: localRes.result.tamperDetected,
    message: localRes.result.message
  };
}

/**
 * Bridges user state with the server-authoritative streak engine.
 */
export function applyLearningActivity(
  prev: any,
  options?: { isPbqPerfect?: boolean; nowMs?: number }
): any {
  const streakState: StreakState = {
    streakDays: prev.streakDays || prev.dailyBreachStreak || 0,
    lastActiveDate: prev.lastActiveDate || prev.lastDailyBreachDate || null,
    lastActiveTimestamp: prev.lastActiveTimestamp || 0,
    streakShieldCount: prev.streakShieldCount || 0,
    streakShieldActive: Boolean(prev.streakShieldActive),
    freezeUntilDate: prev.freezeUntilDate || null,
    lastFreezeActivatedDate: prev.lastFreezeActivatedDate || null,
    inGracePeriod: Boolean(prev.inGracePeriod),
    graceExpiryTimestamp: prev.graceExpiryTimestamp || null,
    timezone: prev.userTimezone || (typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC'),
    lastShieldAwardedStreak: prev.lastShieldAwardedStreak || null
  };

  const { updatedState: nextStreak } = recordLearningActivity(
    streakState,
    options?.nowMs || Date.now(),
    {
      isPbqPerfect: options?.isPbqPerfect,
      isPro: prev.isPro
    }
  );

  return {
    ...prev,
    streakDays: nextStreak.streakDays,
    dailyBreachStreak: nextStreak.streakDays,
    lastActiveDate: nextStreak.lastActiveDate,
    lastActiveTimestamp: nextStreak.lastActiveTimestamp,
    lastDailyBreachDate: nextStreak.lastActiveDate || undefined,
    streakShieldCount: nextStreak.streakShieldCount,
    streakShieldActive: nextStreak.streakShieldActive,
    lastShieldAwardedStreak: nextStreak.lastShieldAwardedStreak
  };
}
