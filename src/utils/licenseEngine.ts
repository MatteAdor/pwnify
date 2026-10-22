// ZeroDay Algorithmic License Key Engine (Hardened Client Verification)
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
 * Standard pure-JS synchronous SHA-256 implementation to hash strings without exposing plaintext PII.
 */
function sha256Hex(asciiInput: string): string {
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let i = 0, j = 0;
  let result = '';

  const words: number[] = [];
  const asciiBitLength = asciiInput.length * 8;
  
  let hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;

  const isComposite: Record<number, boolean> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = true;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  let ascii = asciiInput + '\x80';
  while ((ascii.length % 64) - 56) ascii += '\x00';
  for (i = 0; i < ascii.length; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return ''; // non-ascii
    words[i >> 2] |= j << (((3 - i) % 4) * 8);
  }
  words.push((asciiBitLength / maxWord) | 0);
  words.push(asciiBitLength);

  for (j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash;
    hash = hash.slice(0, 8);

    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      const s0 = ((w15 >>> 7) | (w15 << 25)) ^ ((w15 >>> 18) | (w15 << 14)) ^ (w15 >>> 3);
      const s1 = ((w2 >>> 17) | (w2 << 15)) ^ ((w2 >>> 19) | (w2 << 13)) ^ (w2 >>> 10);
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const temp1 =
        hash[7] +
        (((hash[4] >>> 6) | (hash[4] << 26)) ^
          ((hash[4] >>> 11) | (hash[4] << 21)) ^
          ((hash[4] >>> 25) | (hash[4] << 7))) +
        ch +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] + s0 + w[i - 7] + s1) | 0);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp2 =
        (((hash[0] >>> 2) | (hash[0] << 30)) ^
          ((hash[0] >>> 13) | (hash[0] << 19)) ^
          ((hash[0] >>> 22) | (hash[0] << 10))) +
        maj;

      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
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
 * Precomputed SHA-256 Hashes of Whitelisted Contributors (Protects PII in client bundles)
 */
export const CONTRIBUTOR_HASHES = new Set([
  '47c8b997f1beaf2f38a9ef276d8bd93f00948cd785dacfdccd339b0ca4386645', // a12matteo2009@gmail.com
  '9b5ad0c3de66343d28809e49e9d9535d5004d0427fb1d2c543ac7a69d69f23c3', // fortunatigiacomo14@gmail.com
  'faaef21b8cd0b4c5156b60fd0d141a2ae04b2a9d92c6d54a770adc895d3cdd13', // matteador
  'e68d3c6084b1566b90acb34e660d4d772377b985109efd292e917b804352b6ad', // darkmatteo
  'f1236bdd0e9f07e1adfaea412b0676d2684f63be0b39f626921cad567340a2fc', // giacomo fortunati
  '6a69c164e416cc1db041b84ffab6595483f3861993de25a1bcdbcf703c4bc92b', // giacomofortunati
  'a9a7128b6550457d5b7f482942c508e7dda749b45b51b184fbfc09e9b5be31a4', // giacomo_fortunati
  'e3c2c58ea07bb274ae6016272d785cef485a4c2cb9b7804955e1d3356278694a', // fortunatigiacomo14
]);

/**
 * Precomputed SHA-256 Hashes of Dev Bypass Keys
 */
export const CONTRIBUTOR_DEV_KEY_HASHES = new Set([
  '3e9093d43034ff1925c6c4ad637ef6d689dda6e7045a32d3bbf5f32b494b8c4c', // 0XPRO-DEV-MATTEO
  'bb8d7c041c36dcba7dd79bec7fb522a5037718db1406eab1f61ffc8ace4724cb', // 0XPRO-DEV-GIACOMO
  '872fcf1339ea1117f5dfb3ba88480a331a4b81ba54a8dcf5ab32696bac427854', // 0XPRO-CONTRIBUTOR-LIFETIME
  '95c28a359db102cbb762e6b161ba8cb02e94135c6d1d134381c5506191e01279', // 0XPRO-DEV-CORE
]);

/**
 * Checks if an email, username, or callsign belongs to the core project contributors
 * without exposing raw PII in client bundles.
 */
export function isContributor(emailOrUsername?: string | null): boolean {
  if (!emailOrUsername) return false;
  const clean = emailOrUsername.trim().toLowerCase();
  const digest = sha256Hex(clean);
  return CONTRIBUTOR_HASHES.has(digest);
}

/**
 * Validates a ZeroDay PRO license key format and algorithmic checksum
 */
export function verifyLicenseKey(rawKey: string): boolean {
  if (!rawKey || typeof rawKey !== 'string') return false;
  const cleanKey = rawKey.trim().toUpperCase();

  // Instant developer bypass via SHA-256 digest match
  const keyDigest = sha256Hex(cleanKey.toLowerCase());
  if (CONTRIBUTOR_DEV_KEY_HASHES.has(keyDigest)) {
    return true;
  }

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
