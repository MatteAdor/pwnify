/**
 * ZeroDay Unified Streak & Readiness Engine (B0 Hardened)
 *
 * Principles:
 * - Single source of truth for streak progression across all activities.
 * - Timezone-aware date calculations via IANA timeZone (Intl.DateTimeFormat).
 * - Client clock anti-tampering guards (monotonic validation & forward/backward drift checks).
 * - Well-being safeguards: Pause/Freeze mode (up to 7 days, 1 per 30 days) & 24h grace period.
 * - Earnable Streak Shield (earned by 5-day consistency or 100% PBQ, max 1 slot).
 */

export interface StreakState {
  streakDays: number;
  lastActiveDate: string | null; // YYYY-MM-DD in user's timezone
  lastActiveTimestamp: number;   // UNIX epoch ms (validated)
  streakShieldCount: number;     // 0 or 1 for free users (earn-based)
  streakShieldActive: boolean;   // true if PRO (infinite) or shield slot loaded
  freezeUntilDate: string | null;// YYYY-MM-DD (up to 7 days paused)
  lastFreezeActivatedDate: string | null; // Enforces max 1 freeze every 30 days
  inGracePeriod: boolean;        // true if missed 1 day and can recover within 24h
  graceExpiryTimestamp: number | null;
  timezone: string;
}

export interface ActivityResult {
  previousStreak: number;
  newStreak: number;
  streakIncremented: boolean;
  shieldConsumed: boolean;
  shieldEarned: boolean;
  recoveredFromGrace: boolean;
  tamperDetected: boolean;
  message: string;
}

/**
 * Returns the calendar date string (YYYY-MM-DD) for a given UTC timestamp and IANA timezone.
 * Handles DST transitions seamlessly.
 */
export function getCalendarDateInTimezone(timestampMs: number, timeZone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(new Date(timestampMs));
  } catch {
    // Fallback to UTC if timezone is invalid
    return new Date(timestampMs).toISOString().split('T')[0];
  }
}

/**
 * Calculates calendar day difference between two YYYY-MM-DD strings.
 */
export function getCalendarDaysDiff(dateA: string, dateB: string): number {
  const [y1, m1, d1] = dateA.split('-').map(Number);
  const [y2, m2, d2] = dateB.split('-').map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

/**
 * Detects if a client clock has been tampered with compared to a trusted reference.
 */
export function validateClientTimestamp(
  clientTimestampMs: number,
  lastKnownServerTimestampMs: number | null,
  trustedServerTimestampMs?: number | null
): { isValid: boolean; effectiveTimestampMs: number; isTampered: boolean } {
  // If trusted server timestamp is available, it is authoritative
  if (typeof trustedServerTimestampMs === 'number' && trustedServerTimestampMs > 0) {
    const drift = Math.abs(clientTimestampMs - trustedServerTimestampMs);
    // Drift > 15 minutes is treated as client clock skew/tampering
    const isTampered = drift > 15 * 60 * 1000;
    return {
      isValid: true,
      effectiveTimestampMs: trustedServerTimestampMs,
      isTampered
    };
  }

  // Without live server timestamp, check monotonicity against last known valid timestamp
  if (lastKnownServerTimestampMs && clientTimestampMs < lastKnownServerTimestampMs - 5 * 60 * 1000) {
    // Clock moved backwards by > 5 minutes
    return {
      isValid: false,
      effectiveTimestampMs: lastKnownServerTimestampMs,
      isTampered: true
    };
  }

  return {
    isValid: true,
    effectiveTimestampMs: clientTimestampMs,
    isTampered: false
  };
}

/**
 * Core Streak State Transition Engine.
 * Evaluates legitimate learning activity and transitions the user's streak safely.
 */
export function recordLearningActivity(
  currentState: StreakState,
  clientTimestampMs: number,
  options?: {
    trustedServerTimestampMs?: number | null;
    isPbqPerfect?: boolean;
    isPro?: boolean;
  }
): { updatedState: StreakState; result: ActivityResult } {
  const timeZone = currentState.timezone || 'UTC';
  const { effectiveTimestampMs, isTampered } = validateClientTimestamp(
    clientTimestampMs,
    currentState.lastActiveTimestamp,
    options?.trustedServerTimestampMs
  );

  const todayStr = getCalendarDateInTimezone(effectiveTimestampMs, timeZone);
  const prevDate = currentState.lastActiveDate;

  let newStreak = currentState.streakDays;
  let streakIncremented = false;
  let shieldConsumed = false;
  let shieldEarned = false;
  let recoveredFromGrace = false;
  let message = 'Attività registrata.';

  // If clock was moved backwards to a date prior to last recorded date, ignore date advance
  if (prevDate && todayStr < prevDate) {
    return {
      updatedState: {
        ...currentState,
        lastActiveTimestamp: Math.max(currentState.lastActiveTimestamp, effectiveTimestampMs)
      },
      result: {
        previousStreak: currentState.streakDays,
        newStreak: currentState.streakDays,
        streakIncremented: false,
        shieldConsumed: false,
        shieldEarned: false,
        recoveredFromGrace: false,
        tamperDetected: true,
        message: 'Discrepanza orologio rilevata: timestamp non valido.'
      }
    };
  }

  // Check if first-ever activity
  if (!prevDate) {
    newStreak = 1;
    streakIncremented = true;
    message = 'Streak iniziato! 1° giorno.';
  } else {
    const daysDiff = getCalendarDaysDiff(prevDate, todayStr);

    if (daysDiff === 0) {
      // Activity already recorded for today in this timezone
      message = 'Hai già avanzato lo streak oggi. Continua così!';
    } else if (daysDiff === 1) {
      // Consecutive calendar day: legitimate streak increment
      newStreak = currentState.streakDays + 1;
      streakIncremented = true;
      message = `Streak continuato! Giorno ${newStreak}.`;

      // Merit-based shield earn: every 5 consecutive days, earn 1 shield (max 1 for free)
      if (newStreak % 5 === 0 && currentState.streakShieldCount < 1) {
        shieldEarned = true;
      }
    } else {
      // Missed one or more days (daysDiff > 1)
      // Check if paused / frozen
      const isFrozen = currentState.freezeUntilDate && todayStr <= currentState.freezeUntilDate;

      if (isFrozen) {
        // Protected by vacation freeze: streak does not break!
        newStreak = currentState.streakDays + 1;
        streakIncremented = true;
        message = `Bentornato dalla pausa! Streak protetto al giorno ${newStreak}.`;
      } else if (currentState.streakShieldCount > 0 || currentState.streakShieldActive || options?.isPro) {
        // Protected by Streak Shield
        shieldConsumed = !options?.isPro; // Free user consumes shield; PRO has infinite
        newStreak = currentState.streakDays + 1;
        streakIncremented = true;
        message = 'Streak salvato dal tuo Scudo Protettivo! Continui senza perdite.';
      } else if (daysDiff === 2 && currentState.inGracePeriod) {
        // Recovered within 24h grace window via makeup activity
        recoveredFromGrace = true;
        newStreak = currentState.streakDays + 1;
        streakIncremented = true;
        message = 'Recupero completato! Il tuo streak è stato ripristinato.';
      } else {
        // Streak reset to 1
        newStreak = 1;
        streakIncremented = true;
        message = 'Nuovo inizio: streak reimpostato a 1. Nessun problema, ripartiamo!';
      }
    }
  }

  // Check PBQ 100% score bonus: grants 1 shield if slot empty
  if (options?.isPbqPerfect && currentState.streakShieldCount < 1) {
    shieldEarned = true;
  }

  const updatedShieldCount = shieldEarned
    ? 1
    : shieldConsumed
    ? Math.max(0, currentState.streakShieldCount - 1)
    : currentState.streakShieldCount;

  const updatedState: StreakState = {
    ...currentState,
    streakDays: newStreak,
    lastActiveDate: todayStr,
    lastActiveTimestamp: effectiveTimestampMs,
    streakShieldCount: updatedShieldCount,
    streakShieldActive: Boolean(options?.isPro || updatedShieldCount > 0),
    inGracePeriod: false,
    graceExpiryTimestamp: null
  };

  return {
    updatedState,
    result: {
      previousStreak: currentState.streakDays,
      newStreak,
      streakIncremented,
      shieldConsumed,
      shieldEarned,
      recoveredFromGrace,
      tamperDetected: isTampered,
      message
    }
  };
}

/**
 * Activates Vacation / Pause mode for up to 7 days.
 * Safeguard: Enforces max 1 pause every 30 days.
 */
export function activateStreakFreeze(
  currentState: StreakState,
  durationDays: number,
  clientTimestampMs: number
): { success: boolean; updatedState?: StreakState; error?: string } {
  const safeDays = Math.min(7, Math.max(1, durationDays));
  const timeZone = currentState.timezone || 'UTC';
  const todayStr = getCalendarDateInTimezone(clientTimestampMs, timeZone);

  // Check 30 days cooldown since last freeze
  if (currentState.lastFreezeActivatedDate) {
    const diff = getCalendarDaysDiff(currentState.lastFreezeActivatedDate, todayStr);
    if (diff < 30) {
      const waitDays = 30 - diff;
      return {
        success: false,
        error: `Puoi attivare la modalità pausa una volta ogni 30 giorni. Riprova tra ${waitDays} giorni.`
      };
    }
  }

  // Calculate freeze expiry date
  const [y, m, d] = todayStr.split('-').map(Number);
  const expiryUtc = new Date(Date.UTC(y, m - 1, d + safeDays));
  const freezeUntilStr = expiryUtc.toISOString().split('T')[0];

  return {
    success: true,
    updatedState: {
      ...currentState,
      freezeUntilDate: freezeUntilStr,
      lastFreezeActivatedDate: todayStr
    }
  };
}

/**
 * Resolves permanent earned titles based on verified streak thresholds:
 * 7d -> "Apprentice Defender"
 * 21d -> "Threat Analyst"
 * 42d -> "Incident Responder"
 * 100d -> "ZeroDay Centurion"
 */
export function getStreakThresholdTitle(streakDays: number): {
  title: string;
  badgeId: string;
  daysRequired: number;
} | null {
  if (streakDays >= 100) {
    return { title: 'ZeroDay Centurion', badgeId: 'badge_streak_100', daysRequired: 100 };
  }
  if (streakDays >= 42) {
    return { title: 'Incident Responder', badgeId: 'badge_streak_42', daysRequired: 42 };
  }
  if (streakDays >= 21) {
    return { title: 'Threat Analyst', badgeId: 'badge_streak_21', daysRequired: 21 };
  }
  if (streakDays >= 7) {
    return { title: 'Apprentice Defender', badgeId: 'badge_streak_7', daysRequired: 7 };
  }
  return null;
}
