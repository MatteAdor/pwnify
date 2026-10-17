// ZeroDay Algorithmic License Key Engine (Zero-Backend Cryptographic Verification)
// License Key Format: 0xPRO-[4HEX]-[4ALNUM]-[CHECKSUM4]
// Example: 0xPRO-8F9A-K2L1-77BC

const SALT = 0x5a17e;

// Simple deterministic hash function for license verification
function computeChecksum(part1: string, part2: string): string {
  let hash = SALT;
  const combined = `${part1.toUpperCase()}-${part2.toUpperCase()}-0xDAY_SECRET`;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash + combined.charCodeAt(i)) & 0xffffffff;
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(4, '0');
  return hex.slice(0, 4);
}

/**
 * Generates a valid cryptographic license key for ZeroDay PRO
 */
export function generateLicenseKey(_seed?: string): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  
  // Part 1: 4 Hex chars
  let part1 = '';
  for (let i = 0; i < 4; i++) {
    part1 += Math.floor(Math.random() * 16).toString(16).toUpperCase();
  }

  // Part 2: 4 Alphanumeric chars
  let part2 = '';
  for (let i = 0; i < 4; i++) {
    part2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const checksum = computeChecksum(part1, part2);
  return `0xPRO-${part1}-${part2}-${checksum}`;
}

/**
 * Constant-time string comparison to prevent timing side-channel attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Validates a ZeroDay PRO license key format and algorithmic checksum
 */
export function verifyLicenseKey(rawKey: string): boolean {
  if (!rawKey || typeof rawKey !== 'string') return false;
  const cleanKey = rawKey.trim().toUpperCase();

  // Pattern: 0xPRO-XXXX-XXXX-XXXX
  const parts = cleanKey.split('-');
  if (parts.length !== 4) return false;
  if (parts[0] !== '0XPRO') return false;

  const part1 = parts[1];
  const part2 = parts[2];
  const checksum = parts[3];

  // Part 1 must be exactly 4 valid hex chars
  if (!/^[0-9A-F]{4}$/.test(part1)) return false;
  // Part 2 must be exactly 4 valid alphanumeric chars
  if (!/^[2-9A-HJ-NP-Z]{4}$/.test(part2)) return false;
  // Checksum must be exactly 4 valid hex chars
  if (!/^[0-9A-F]{4}$/.test(checksum)) return false;

  const expectedChecksum = computeChecksum(part1, part2);
  return timingSafeEqual(checksum, expectedChecksum);
}
