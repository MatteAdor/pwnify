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

// ---------------------------------------------------------------------------
// Out-of-order protection: decide on the LIVE subscription state, not on the
// (possibly delayed or retried) event payload, and never apply a state older
// than the last one already applied for the same subscription.
// ---------------------------------------------------------------------------

export type FetchSubscriptionResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; notFound: boolean; status?: number };

export type SubscriptionFetcher = (subscriptionId: string) => Promise<FetchSubscriptionResult>;

/** GET /v1/subscriptions/{id} with the organization token (scope subscriptions:read). */
export function createSubscriptionFetcher(
  apiBase: string,
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): SubscriptionFetcher {
  return async (subscriptionId: string) => {
    try {
      const res = await fetchImpl(`${apiBase}/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
      });
      if (res.status === 404) return { ok: false, notFound: true, status: 404 };
      if (!res.ok) return { ok: false, notFound: false, status: res.status };
      const data = await res.json().catch(() => null);
      if (!data || typeof data !== "object") return { ok: false, notFound: false, status: res.status };
      return { ok: true, data: data as Record<string, unknown> };
    } catch {
      return { ok: false, notFound: false };
    }
  };
}

/** True when `candidate` is strictly older than the last applied timestamp (both ISO). */
export function isOlderThanLastApplied(
  lastAppliedIso: string | null | undefined,
  candidateIso: string | null | undefined,
): boolean {
  const last = toMs(lastAppliedIso);
  const cand = toMs(candidateIso);
  if (last === null || cand === null) return false;
  return cand < last;
}

/** Subscription id an event refers to (subscription events: data.id; orders: data.subscription_id). */
export function subscriptionIdOf(event: unknown): string | null {
  const ev = asObj(event);
  const data = asObj(ev.data);
  const type = str(ev.type);
  if (type.startsWith("subscription.")) return str(data.id) || null;
  if (type === "order.paid") return str(data.subscription_id) || null;
  return null;
}

export type EntitlementResolution =
  /** Apply this decision (set_profile_pro_status). */
  | { kind: "apply"; decision: PolarDecision; subscriptionId: string | null; modifiedAt: string | null }
  /** Acknowledge (2xx) without changing anything. */
  | { kind: "ignore"; reason: string }
  /** Could not confirm the live state: respond 5xx so Polar retries. */
  | { kind: "retry"; reason: string };

/**
 * Resolves the entitlement for a verified event using the live subscription state.
 *
 * - Subscription events and order.paid for a subscription: the subscription is
 *   re-read from Polar and the decision is made on THAT state (so a delayed
 *   `subscription.active` arriving after `subscription.revoked` cannot re-grant).
 * - If the live state is older than the last one applied for that subscription
 *   (`lastAppliedModifiedAt`), it is ignored.
 * - One-time order.paid (no subscription) is final and decided on the payload.
 * - Re-read failure -> "retry" (5xx); 404 -> "ignore" (not ours / deleted).
 */
export async function resolvePolarEntitlement(params: {
  event: unknown;
  config: PolarBillingConfig;
  fetchSubscription: SubscriptionFetcher;
  lastAppliedModifiedAt?: string | null;
  nowMs?: number;
}): Promise<EntitlementResolution> {
  const { event, config, fetchSubscription, lastAppliedModifiedAt = null, nowMs = Date.now() } = params;

  // Filters (event type, product, organization, external customer) on the payload first.
  const fromPayload = classifyPolarEvent(event, config, nowMs);
  if (fromPayload.action === "ignore") return { kind: "ignore", reason: fromPayload.reason };

  const subscriptionId = subscriptionIdOf(event);
  if (!subscriptionId) {
    // One-time purchase: order.paid is final.
    return { kind: "apply", decision: fromPayload, subscriptionId: null, modifiedAt: null };
  }

  const live = await fetchSubscription(subscriptionId);
  if (!live.ok) {
    return live.notFound
      ? { kind: "ignore", reason: "subscription_not_found" }
      : { kind: "retry", reason: `subscription_reread_failed${live.status ? `_${live.status}` : ""}` };
  }

  const liveData = live.data;
  if (str(liveData.id) && str(liveData.id) !== subscriptionId) {
    return { kind: "retry", reason: "subscription_id_mismatch" };
  }

  // Decide on the live state, independent of which event type delivered it.
  const decision = classifyPolarEvent({ type: "subscription.updated", data: liveData }, config, nowMs);
  if (decision.action === "ignore") return { kind: "ignore", reason: `live_${decision.reason}` };

  // The live customer must be the same user the event was about.
  if (decision.userId !== fromPayload.userId) {
    return { kind: "ignore", reason: "live_customer_mismatch" };
  }

  const modifiedAt = str(liveData.modified_at) || str(liveData.created_at) || null;
  if (isOlderThanLastApplied(lastAppliedModifiedAt, modifiedAt)) {
    return { kind: "ignore", reason: "stale_subscription_state" };
  }

  return {
    kind: "apply",
    decision: { ...decision, orderId: fromPayload.orderId ?? null },
    subscriptionId,
    modifiedAt,
  };
}
