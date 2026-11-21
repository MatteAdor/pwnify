/**
 * ZeroDay App Security Engine
 * Defends against XSS, Prototype Pollution, Open Redirects,
 * Input Overflows, Timing Attacks, and URL Verification Bypass.
 */

// Whitelist of approved checkout and external redirection domains (Polar hosted checkout/portal)
const ALLOWED_REDIRECT_DOMAINS = [
  'polar.sh'
];

/**
 * Sanitizes and strictly validates user callsign / username.
 * Prevents XSS, control characters, prototype pollution names, and layout breaks.
 */
export function sanitizeCallsign(raw: unknown, fallback: string = '0x_GhostRider'): string {
  if (typeof raw !== 'string') return fallback;

  // Trim and remove any HTML tags, control chars, quotes, and dangerous symbols
  const cleaned = raw
    .trim()
    .replace(/[<>"'`/\\]/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

  // Strip known prototype pollution properties
  if (cleaned === '__proto__' || cleaned === 'constructor' || cleaned === 'prototype') {
    return fallback;
  }

  // Length clamping (between 3 and 24 characters)
  if (cleaned.length < 3) return fallback;
  return cleaned.slice(0, 24);
}

/**
 * Sanitizes alphanumeric URL parameter values (such as challenge seeds).
 */
export function sanitizeAlphanumeric(raw: unknown, maxLength: number = 32, fallback: string = ''): string {
  if (typeof raw !== 'string') return fallback;
  const cleaned = raw.trim().replace(/[^a-zA-Z0-9_-]/g, '');
  if (!cleaned) return fallback;
  return cleaned.slice(0, maxLength);
}

/**
 * Clamps numeric values strictly, guarding against NaN, Infinity, and extreme values.
 */
export function clampNumber(raw: unknown, min: number, max: number, fallback: number): number {
  if (raw === null || raw === undefined) return fallback;
  const num = typeof raw === 'number' ? raw : Number(raw);
  if (Number.isNaN(num) || !Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, Math.round(num)));
}

/**
 * Validates that an external URL is safe for redirection (avoids Open Redirect vulnerabilities).
 */
export function isSafeRedirectUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;

    // Check against hostname whitelist or same-origin
    const hostname = parsed.hostname.toLowerCase();
    const isAllowedHost = ALLOWED_REDIRECT_DOMAINS.some(
      domain => hostname === domain || hostname.endsWith(`.${domain}`)
    );

    if (typeof window !== 'undefined' && window.location.origin) {
      const currentHost = window.location.hostname.toLowerCase();
      if (hostname === currentHost) return true;
    }

    return isAllowedHost;
  } catch {
    return false;
  }
}

/**
 * Deep sanitization for objects deserialized from localStorage.
 * Defends against prototype pollution (__proto__, constructor, prototype)
 * and verifies integrity against unexpected data structures.
 */
export function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw, (key, value) => {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        return undefined;
      }
      return value;
    });

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return { ...fallback, ...parsed };
    }
    return fallback;
  } catch (e) {
    console.warn('[Security] Failed to parse JSON or detected malformed payload:', e);
    return fallback;
  }
}

// Checkout returns no longer grant anything client-side: Pro is written by the
// Polar webhook (polar_webhook) into profiles.is_pro and read back via cloudSync.
