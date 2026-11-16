/**
 * src/utils/dailyFlash.ts
 *
 * Client interface for Server-Authoritative Daily Flash extraction.
 * Guarantees fail-open behavior: if server/network is unavailable,
 * falls back to standard daily breach (no flash bonus) without blocking the user.
 */

export interface DailyFlashResult {
  isFlash: boolean;
  xpBonus: number;
  drawDate: string;
  source: 'server_authoritative' | 'standard_fallback';
  message: string;
}

/**
 * Pure deterministic hash function for offline fallback simulation / test assertions.
 * (In production, the secret seed and draw are executed exclusively server-side in Postgres).
 */
export function simulateDeterministicDraw(
  userId: string,
  dateStr: string,
  secretSeed: string,
  flashProbabilityPct: number = 10
): { isFlash: boolean; xpBonus: number } {
  // Simple deterministic integer hash combining inputs
  let hash = 0;
  const combined = `${userId}:${dateStr}:${secretSeed}`;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }

  const normalized = Math.abs(hash) % 100;
  const isFlash = normalized < flashProbabilityPct;
  const xpBonus = isFlash ? 50 : 0;

  return { isFlash, xpBonus };
}

/**
 * Evaluates Daily Flash result from server response, or provides safe fallback.
 */
export function evaluateDailyFlashDraw(
  serverResponse: { is_flash?: boolean; xp_bonus?: number; draw_date?: string } | null,
  fallbackDateStr: string
): DailyFlashResult {
  if (serverResponse && typeof serverResponse.is_flash === 'boolean') {
    return {
      isFlash: serverResponse.is_flash,
      xpBonus: serverResponse.xp_bonus || 0,
      drawDate: serverResponse.draw_date || fallbackDateStr,
      source: 'server_authoritative',
      message: serverResponse.is_flash
        ? '⚡ Daily Flash Attivo! Bonus operativo raro +50 XP sbloccato per questo incidente.'
        : 'Daily standard assegnato.'
    };
  }

  // Fail-open: standard daily without flash bonus
  return {
    isFlash: false,
    xpBonus: 0,
    drawDate: fallbackDateStr,
    source: 'standard_fallback',
    message: 'Daily standard attivo (server offline o non configurato).'
  };
}
