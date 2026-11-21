// Edge Function: polar_webhook
// Receives Polar webhook deliveries (Standard Webhooks), verifies the signature on the
// RAW body with a timing-safe comparison and timestamp tolerance, deduplicates on the
// `webhook-id` header, and updates profiles.is_pro ONLY through the service_role RPC
// set_profile_pro_status.
//
// Deploy with JWT verification disabled (Polar does not send a Supabase JWT):
// the signature is the authentication. See supabase/config.toml.
//
// Secrets: POLAR_WEBHOOK_SECRET, POLAR_PRODUCT_ID (comma-separated allowed),
// optional POLAR_ORGANIZATION_ID. Logs never contain personal data.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { verifyStandardWebhook } from "../_shared/polarWebhookSignature.ts";
import { classifyPolarEvent, decideLedgerOutcome, parseIdList } from "../_shared/polarBilling.ts";

const reply = (body: Record<string, unknown>, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return reply({ error: "Method not allowed. POST required." }, 405);

  const webhookSecret = Deno.env.get("POLAR_WEBHOOK_SECRET") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!webhookSecret || !supabaseUrl || !serviceKey) {
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

  // 2. Decide (foreign products/orgs, unknown events and unmapped customers are ignored).
  const decision = classifyPolarEvent(event, {
    productIds: parseIdList(Deno.env.get("POLAR_PRODUCT_ID")),
    organizationId: Deno.env.get("POLAR_ORGANIZATION_ID") || null,
  });

  if (decision.action === "ignore" || !decision.userId) {
    console.log(`[polar_webhook] ${eventType} ignored (${decision.reason})`);
    return reply({ received: true, ignored: decision.reason }, 202);
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
    // Contract migration not applied yet. Fail open: set_profile_pro_status is idempotent
    // and replays are bounded by the signature timestamp tolerance.
    console.warn("[polar_webhook] Idempotency ledger missing; processing without deduplication");
  }

  const releaseLedger = async () => {
    if (ledgerAvailable) {
      await admin.from("polar_webhook_events").delete().eq("webhook_id", webhookId).eq("status", "processing");
    }
  };

  // 4. Only act on users that exist; an unknown user must not make Polar retry forever.
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

  if (ledgerAvailable) {
    await admin
      .from("polar_webhook_events")
      .update({ status: "processed", processed_at: new Date().toISOString() })
      .eq("webhook_id", webhookId);
  }

  return reply({ received: true }, 202);
});
