/**
 * Pure helper for peer cohort percentile ranking.
 * Strict privacy & statistical threshold:
 * Percentile is only displayed if the active operator cohort has at least 50 accounts.
 * Under threshold (< 50) or invalid position, returns null (renders nothing).
 */
export function computeCohortPercentile(userPosition: number, totalOperators: number): number | null {
  if (totalOperators < 50 || userPosition <= 0) return null;
  return Math.max(1, Math.round((userPosition / totalOperators) * 100));
}
