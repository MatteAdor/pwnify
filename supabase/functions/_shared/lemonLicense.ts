// Shared, dependency-free helpers for Lemon Squeezy license & webhook checks.
// Pure functions only (no Deno/Node APIs) so they can be unit-tested from Node.

/** Subset of the `meta` object returned by the Lemon Squeezy License API. */
export interface LemonLicenseMeta {
  store_id?: number | string | null;
  product_id?: number | string | null;
  variant_id?: number | string | null;
}

/** Parses a comma-separated env value ("123, 456") into trimmed, non-empty IDs. */
export function parseIdList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function idOf(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string") return value.trim();
  return "";
}

/**
 * The License API is public and accepts keys from ANY Lemon Squeezy store, so a
 * key is only acceptable if it belongs to our store and (when an allowlist is
 * configured) to one of our products. Fails closed when the store ID is unset.
 */
export function isLicenseFromOurStore(
  meta: LemonLicenseMeta | null | undefined,
  expectedStoreId: string | null | undefined,
  allowedProductIds: string[] = [],
): boolean {
  const expected = idOf(expectedStoreId);
  if (!expected || !meta) return false;
  if (idOf(meta.store_id) !== expected) return false;
  if (allowedProductIds.length > 0 && !allowedProductIds.includes(idOf(meta.product_id))) {
    return false;
  }
  return true;
}

/** Webhook events that grant PRO. */
export const PRO_ACTIVATION_EVENTS = [
  "order_created",
  "subscription_created",
  "subscription_resumed",
  "subscription_unpaused",
] as const;

/** Webhook events that revoke PRO. */
export const PRO_REVOCATION_EVENTS = [
  "subscription_cancelled",
  "subscription_expired",
  "order_refunded",
] as const;

/**
 * Decides what a verified webhook event means for PRO status.
 * - order_created grants only when the order is actually paid.
 * - Revocation events keep the existing behaviour (subscription_cancelled
 *   revokes immediately).
 * - Events for another store (when configured) or for products outside the
 *   allowlist are ignored.
 */
export function classifyWebhookEvent(
  eventName: string | null | undefined,
  attributes: Record<string, unknown> | null | undefined,
  expectedStoreId: string | null | undefined,
  allowedProductIds: string[] = [],
): "activate" | "revoke" | "ignore" {
  const attrs = attributes || {};
  const name = eventName || "";

  const expected = idOf(expectedStoreId);
  if (expected && idOf(attrs.store_id) !== expected) return "ignore";

  if (allowedProductIds.length > 0) {
    const firstItem = (attrs.first_order_item || {}) as Record<string, unknown>;
    const productId = idOf(attrs.product_id) || idOf(firstItem.product_id);
    if (productId && !allowedProductIds.includes(productId)) return "ignore";
  }

  if ((PRO_REVOCATION_EVENTS as readonly string[]).includes(name)) return "revoke";

  if ((PRO_ACTIVATION_EVENTS as readonly string[]).includes(name)) {
    if (name === "order_created" && attrs.status !== "paid") return "ignore";
    return "activate";
  }

  return "ignore";
}

/** Strict RFC 4122 UUID (v1-v5) check for custom_data.user_id. */
export function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim())
  );
}
