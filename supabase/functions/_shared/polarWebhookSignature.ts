// Standard Webhooks signature verification (https://www.standardwebhooks.com/),
// as used by Polar. Dependency-free: relies only on Web Crypto (Deno, Node >= 20).
//
// Signed content: `${webhook-id}.${webhook-timestamp}.${rawBody}`, HMAC-SHA256,
// base64-encoded, sent as one or more space-separated `v1,<signature>` entries.
//
// Polar's own SDK uses the UTF-8 bytes of the dashboard secret as the HMAC key
// (it base64-encodes the secret before handing it to the standardwebhooks lib).
// A secret in the generic `whsec_<base64>` form is decoded per the spec instead.

export const DEFAULT_TOLERANCE_SECONDS = 5 * 60;

export interface WebhookHeaders {
  id: string;
  timestamp: string;
  signature: string;
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: "missing_headers" | "bad_timestamp" | "timestamp_out_of_tolerance" | "bad_signature" | "missing_secret" };

const encoder = new TextEncoder();

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

/** HMAC key bytes for a webhook secret (Polar dashboard secret or `whsec_` form). */
export function secretToKeyBytes(secret: string): Uint8Array {
  if (secret.startsWith("whsec_")) {
    return base64ToBytes(secret.slice("whsec_".length));
  }
  return encoder.encode(secret);
}

/** Copies bytes into a fresh ArrayBuffer (what Web Crypto expects in every runtime). */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  return copy.buffer as ArrayBuffer;
}

/** Constant-time comparison of two strings (length leak only). */
export function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Computes the base64 v1 signature for the given message parts. */
export async function computeSignature(secret: string, id: string, timestamp: string, rawBody: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(secretToKeyBytes(secret)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, toArrayBuffer(encoder.encode(`${id}.${timestamp}.${rawBody}`)));
  return bytesToBase64(new Uint8Array(mac));
}

/**
 * Verifies a Standard Webhooks delivery on the RAW request body.
 * Rejects missing headers, non-numeric timestamps, timestamps outside
 * ±toleranceSeconds of `nowSeconds` (replay protection) and bad signatures.
 */
export async function verifyStandardWebhook(
  rawBody: string,
  headers: WebhookHeaders,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
  toleranceSeconds: number = DEFAULT_TOLERANCE_SECONDS,
): Promise<VerifyResult> {
  if (!secret) return { ok: false, reason: "missing_secret" };
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature) return { ok: false, reason: "missing_headers" };
  if (!/^\d{1,12}$/.test(timestamp)) return { ok: false, reason: "bad_timestamp" };

  const ts = Number(timestamp);
  if (Math.abs(nowSeconds - ts) > toleranceSeconds) {
    return { ok: false, reason: "timestamp_out_of_tolerance" };
  }

  const expected = await computeSignature(secret, id, timestamp, rawBody);
  const candidates = signature
    .split(" ")
    .map((part) => part.trim())
    .filter((part) => part.startsWith("v1,"))
    .map((part) => part.slice(3));

  let matched = false;
  for (const candidate of candidates) {
    // Evaluate every candidate so timing does not reveal which one matched.
    if (timingSafeEqual(candidate, expected)) matched = true;
  }
  return matched ? { ok: true } : { ok: false, reason: "bad_signature" };
}
