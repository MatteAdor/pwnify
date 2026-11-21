// Edge Function: polar_webhook
// Receives Polar webhook deliveries (Standard Webhooks), verifies the signature on the
// RAW body with a timing-safe comparison and timestamp tolerance, deduplicates on the
// `webhook-id` header, and updates profiles.is_pro ONLY through the service_role RPC
// set_profile_pro_status.
//
// Out-of-order protection: for subscription-related events the subscription is
// re-read from the Polar API and the decision is made on its CURRENT state (a delayed
// `subscription.active` cannot undo a later revocation). A live state older than the
// last one applied for that subscription (ledger: subscription_modified_at) is ignored.
// If the re-read fails, the function answers 5xx so Polar retries.
//
// Deploy with JWT verification disabled (Polar does not send a Supabase JWT):
// the signature is the authentication. See supabase/config.toml.
//
// Secrets: POLAR_WEBHOOK_SECRET, POLAR_ACCESS_TOKEN (scope subscriptions:read),
// POLAR_PRODUCT_ID (comma-separated allowed), POLAR_SERVER, optional
// POLAR_ORGANIZATION_ID. Logs never contain personal data.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { verifyStandardWebhook } from "../_shared/polarWebhookSignature.ts";
import {
  classifyPolarEvent,
  createSubscriptionFetcher,
  decideLedgerOutcome,
  parseIdList,
  polarApiBase,
  resolvePolarEntitlement,
  subscriptionIdOf,
} from "../_shared/polarBilling.ts";

const reply = (body: Record<string, unknown>, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return reply({ error: "Method not allowed. POST required." }, 405);

  const webhookSecret = Deno.env.get("POLAR_WEBHOOK_SECRET") || "";
  const polarToken = Deno.env.get("POLAR_ACCESS_TOKEN") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!webhookSecret || !polarToken || !supabaseUrl || !serviceKey) {
    console.error("[polar_webhook] Missing server configuration");
    return reply({ error: "Server configuration error" }, 500);
  }

  // 1. Verify the signature on the exact raw bytes BEFORE parsing anything.
  const rawBody = await req.text();
  const webhookId = req.headers.get("webhook-id") || "";
  const verification = await verifyStandardWebhook(rawBody, {
    id: webhookId,
    timestamp: req.headers.get("webhook-timestamp") || "",
    signature: req.headers.get("webhook-signature") || "",
  }, webhookSecret);

  if (!verification.ok) {
    console.warn(`[polar_webhook] Rejected delivery: ${verification.reason}`);
    return reply({ received: false }, 403);
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return reply({ error: "Malformed JSON payload" }, 400);
  }
  const eventType = typeof event.type === "string" ? event.type : "unknown";

  const config = {
    productIds: parseIdList(Deno.env.get("POLAR_PRODUCT_ID")),
    organizationId: Deno.env.get("POLAR_ORGANIZATION_ID") || null,
  };

  // 2. Cheap payload filters first (foreign products/orgs, unknown events, unmapped customers).
  const prefilter = classifyPolarEvent(event, config);
  if (prefilter.action === "ignore") {
    console.log(`[polar_webhook] ${eventType} ignored (${prefilter.reason})`);
    return reply({ received: true, ignored: prefilter.reason }, 202);
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // 3. Idempotency on the delivery id (reused by Polar on retries).
  const { error: ledgerError } = await admin
    .from("polar_webhook_events")
    .insert({ webhook_id: webhookId, event_type: eventType });

  let existing: { status?: string | null; received_at?: string | null } | null = null;
  if (ledgerError?.code === "23505") {
    const { data } = await admin
      .from("polar_webhook_events")
      .select("status, received_at")
      .eq("webhook_id", webhookId)
      .maybeSingle();
    existing = data;
  }

  const outcome = decideLedgerOutcome(ledgerError?.code ?? null, existing);
  if (outcome === "duplicate") return reply({ received: true, duplicate: true }, 200);
  if (outcome === "in_progress") return reply({ received: false, in_progress: true }, 409);
  if (outcome === "error") {
    console.error(`[polar_webhook] Ledger insert failed (${ledgerError?.code ?? "unknown"})`);
    return reply({ error: "Database error" }, 500);
  }
  const ledgerAvailable = outcome === "process";
  if (!ledgerAvailable) {
    // Contract migration not applied yet. Fail open on deduplication: decisions are
    // still made on the live Polar state, so replays cannot regress the entitlement.
    console.warn("[polar_webhook] Idempotency ledger missing; processing without deduplication");
  }

  const releaseLedger = async () => {
    if (ledgerAvailable) {
      await admin.from("polar_webhook_events").delete().eq("webhook_id", webhookId).eq("status", "processing");
    }
  };
  const markProcessed = async (extra: Record<string, unknown> = {}) => {
    if (ledgerAvailable) {
      await admin
        .from("polar_webhook_events")
        .update({ status: "processed", processed_at: new Date().toISOString(), ...extra })
        .eq("webhook_id", webhookId);
    }
  };

  // 4. Last subscription state already applied (ordering guard).
  const subscriptionId = subscriptionIdOf(event);
  let lastAppliedModifiedAt: string | null = null;
  if (subscriptionId && ledgerAvailable) {
    const { data: last, error: lastError } = await admin
      .from("polar_webhook_events")
      .select("subscription_modified_at")
      .eq("subscription_id", subscriptionId)
      .eq("status", "processed")
      .not("subscription_modified_at", "is", null)
      .order("subscription_modified_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastError) {
      await releaseLedger();
      console.error("[polar_webhook] Ordering lookup failed");
      return reply({ error: "Database error" }, 500);
    }
    lastAppliedModifiedAt = last?.subscription_modified_at ?? null;
  }

  // 5. Decide on the LIVE subscription state re-read from Polar.
  const resolution = await resolvePolarEntitlement({
    event,
    config,
    fetchSubscription: createSubscriptionFetcher(polarApiBase(Deno.env.get("POLAR_SERVER")), polarToken),
    lastAppliedModifiedAt,
  });

  if (resolution.kind === "retry") {
    await releaseLedger();
    console.error(`[polar_webhook] ${eventType}: ${resolution.reason}; asking Polar to retry`);
    return reply({ error: "Could not confirm subscription state" }, 503);
  }
  if (resolution.kind === "ignore") {
    await markProcessed();
    console.log(`[polar_webhook] ${eventType} ignored (${resolution.reason})`);
    return reply({ received: true, ignored: resolution.reason }, 202);
  }

  const { decision } = resolution;

  // 6. Only act on users that exist; an unknown user must not make Polar retry forever.
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id")
    .eq("id", decision.userId)
    .maybeSingle();

  if (profileError) {
    await releaseLedger();
    console.error("[polar_webhook] Profile lookup failed");
    return reply({ error: "Database error" }, 500);
  }

  if (profile?.id) {
    const isPro = decision.action === "activate";
    const ref = decision.subscriptionId
      ? `polar_sub_${decision.subscriptionId}`
      : `polar_order_${decision.orderId ?? webhookId}`;

    const { error: rpcError } = await admin.rpc("set_profile_pro_status", {
      p_user_id: profile.id,
      p_is_pro: isPro,
      p_license_key_hash: ref,
      p_lemon_order_id: decision.orderId ?? null, // legacy column names: store Polar ids
      p_lemon_sub_id: decision.subscriptionId ?? null,
      p_lemon_cust_id: decision.customerId ?? null,
      p_instance_id: "polar",
      p_expires_at: isPro ? (decision.expiresAt ?? null) : null,
    });

    if (rpcError) {
      await releaseLedger();
      console.error(`[polar_webhook] set_profile_pro_status failed for ${eventType}`);
      return reply({ error: "Database error" }, 500);
    }
    console.log(`[polar_webhook] ${eventType}: PRO ${isPro ? "granted" : "revoked"} (${decision.reason})`);
  } else {
    console.warn(`[polar_webhook] ${eventType}: external customer has no profile; acknowledged`);
  }

  await markProcessed({
    subscription_id: resolution.subscriptionId,
    subscription_modified_at: resolution.modifiedAt,
  });

  return reply({ received: true }, 202);
});
