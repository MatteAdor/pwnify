// Pure, dependency-free Polar billing helpers shared by the edge functions and
// unit-tested from Node. No Deno/Node APIs here.

export type PolarServer = "sandbox" | "production";

/** API base URL for the configured Polar environment (defaults to sandbox: fail safe). */
export function polarApiBase(server: string | null | undefined): string {
  return (server || "").trim().toLowerCase() === "production"
    ? "https://api.polar.sh"
    : "https://sandbox-api.polar.sh";
}

/** Parses a comma-separated env value ("a, b,,c") into trimmed, non-empty IDs. */
export function parseIdList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw.split(",").map((v) => v.trim()).filter(Boolean);
}

/** Strict RFC 4122 UUID (v1-v5): the format of Supabase auth user ids. */
export function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim())
  );
}

/** Webhook event types this integration acts on (subscribe the endpoint to these only). */
export const HANDLED_POLAR_EVENTS = [
  "order.paid",
  "subscription.active",
  "subscription.updated",
  "subscription.canceled",
  "subscription.revoked",
] as const;

export interface PolarBillingConfig {
  /** Our product id(s): events for any other product are ignored. Required (fail closed). */
  productIds: string[];
  /** Our organization id: when set, events from another organization are ignored. */
  organizationId?: string | null;
}

export interface PolarDecision {
  action: "activate" | "revoke" | "ignore";
  /** Short machine reason, safe to log (no personal data). */
  reason: string;
  userId?: string;
  expiresAt?: string | null;
  subscriptionId?: string | null;
  orderId?: string | null;
  customerId?: string | null;
}

type Obj = Record<string, unknown>;
const asObj = (v: unknown): Obj => (v && typeof v === "object" ? (v as Obj) : {});
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

function toMs(iso: unknown): number | null {
  const s = str(iso);
  if (!s) return null;
  const ms = Date.parse(s);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Maps a verified Polar webhook event to a PRO entitlement decision.
 *
 * - The user is identified ONLY by `customer.external_id`, which create_checkout
 *   sets server-side from the caller's JWT (never by email or nick).
 * - order.paid grants when the order is paid.
 * - subscription.active/updated/canceled grant while status is active/trialing,
 *   including cancel_at_period_end until current_period_end; they revoke once a
 *   canceled/unpaid/expired subscription has ended.
 * - subscription.revoked always revokes.
 * - Foreign products/organizations and unknown events are ignored.
 */
export function classifyPolarEvent(
  event: unknown,
  config: PolarBillingConfig,
  nowMs: number = Date.now(),
): PolarDecision {
  const ev = asObj(event);
  const type = str(ev.type);
  const data = asObj(ev.data);

  if (!(HANDLED_POLAR_EVENTS as readonly string[]).includes(type)) {
    return { action: "ignore", reason: "unhandled_event" };
  }
  if (config.productIds.length === 0) {
    return { action: "ignore", reason: "product_not_configured" };
  }

  const product = asObj(data.product);
  const customer = asObj(data.customer);

  const productId = str(data.product_id) || str(product.id);
  if (!productId || !config.productIds.includes(productId)) {
    return { action: "ignore", reason: "foreign_product" };
  }

  const expectedOrg = str(config.organizationId);
  if (expectedOrg) {
    const org = str(product.organization_id) || str(customer.organization_id);
    if (org && org !== expectedOrg) {
      return { action: "ignore", reason: "foreign_organization" };
    }
  }

  const userId = str(customer.external_id);
  if (!isUuid(userId)) {
    return { action: "ignore", reason: "no_external_customer_id" };
  }

  const customerId = str(data.customer_id) || str(customer.id) || null;
  const base = { userId, customerId };

  if (type === "order.paid") {
    const paid = str(data.status) === "paid" || data.paid === true;
    if (!paid) return { action: "ignore", reason: "order_not_paid", ...base };
    return {
      action: "activate",
      reason: "order_paid",
      ...base,
      orderId: str(data.id) || null,
      subscriptionId: str(data.subscription_id) || null,
      expiresAt: null,
    };
  }

  const subscriptionId = str(data.id) || null;
  const periodEnd = str(data.current_period_end) || null;
  const periodEndMs = toMs(periodEnd);
  const endedAtMs = toMs(data.ended_at);
  const subBase = { ...base, subscriptionId, orderId: null };

  if (type === "subscription.revoked") {
    return { action: "revoke", reason: "subscription_revoked", ...subBase, expiresAt: null };
  }

  const status = str(data.status);

  if (status === "active" || status === "trialing") {
    // Still paid up. With cancel_at_period_end the access lasts until period end.
    if (data.cancel_at_period_end === true && periodEndMs !== null && periodEndMs <= nowMs) {
      return { action: "revoke", reason: "period_ended", ...subBase, expiresAt: null };
    }
    return { action: "activate", reason: `subscription_${status}`, ...subBase, expiresAt: periodEnd };
  }

  if (status === "canceled" || status === "unpaid" || status === "incomplete_expired") {
    const endMs = endedAtMs ?? periodEndMs;
    if (endMs === null || endMs <= nowMs) {
      return { action: "revoke", reason: `subscription_${status}_ended`, ...subBase, expiresAt: null };
    }
    // Canceled but the paid period has not ended yet: keep access until then.
    return { action: "activate", reason: `subscription_${status}_until_period_end`, ...subBase, expiresAt: periodEnd };
  }

  // past_due, incomplete, ...: leave the current entitlement unchanged;
  // Polar sends subscription.revoked if access must be removed.
  return { action: "ignore", reason: `status_${status || "unknown"}`, ...subBase };
}

/** How long a 'processing' ledger row may block retries before it is considered stale. */
export const STALE_PROCESSING_MS = 2 * 60 * 1000;

export type LedgerOutcome =
  /** First delivery (or stale/crashed attempt): process the event. */
  | "process"
  /** Ledger table missing (contract not applied): process without deduplication. */
  | "process_without_ledger"
  /** Already processed: acknowledge with 2xx, do nothing. */
  | "duplicate"
  /** Another invocation is processing it right now: ask Polar to retry later (409). */
  | "in_progress"
  /** Unexpected database error: fail (5xx) so Polar retries. */
  | "error";

/**
 * Idempotency decision for a delivery, keyed on the Standard Webhooks `webhook-id`
 * (unique per delivery, reused on retries), after trying to INSERT it into
 * polar_webhook_events.
 */
export function decideLedgerOutcome(
  insertErrorCode: string | null | undefined,
  existing: { status?: string | null; received_at?: string | null } | null | undefined,
  nowMs: number = Date.now(),
): LedgerOutcome {
  if (!insertErrorCode) return "process";
  if (insertErrorCode === "42P01") return "process_without_ledger";
  if (insertErrorCode !== "23505") return "error";
  if (existing?.status === "processed") return "duplicate";
  const startedMs = existing?.received_at ? Date.parse(existing.received_at) : NaN;
  if (Number.isFinite(startedMs) && nowMs - startedMs < STALE_PROCESSING_MS) return "in_progress";
  return "process";
}
