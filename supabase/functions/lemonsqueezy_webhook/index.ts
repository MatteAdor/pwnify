// Edge Function: lemonsqueezy_webhook
// Cryptographically verified webhook listener for Lemon Squeezy payment & subscription lifecycle.
// Validates HMAC-SHA256 on the RAW request body with timing-safe comparison.
// Updates public.profiles.is_pro strictly via Supabase Service Role.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { classifyWebhookEvent, isUuid, parseIdList } from "../_shared/lemonLicense.ts";

/**
 * Constant-time string equality comparison to defend against timing attacks.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") {
    return false;
  }
  if (a.length !== b.length) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Computes the HMAC-SHA256 hex digest of a raw payload string using a secret.
 */
export async function computeHmacSha256Hex(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req: Request) => {
  // CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "x-signature, content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. POST required." }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const webhookSecret = Deno.env.get("LEMONSQUEEZY_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("[lemonsqueezy_webhook] Missing LEMONSQUEEZY_WEBHOOK_SECRET configuration");
      return new Response(
        JSON.stringify({ error: "Server configuration error: webhook secret not set" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const signatureHeader = req.headers.get("x-signature") || "";
    if (!signatureHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing x-signature header" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // 1. Read the RAW body text BEFORE any JSON parsing
    const rawBody = await req.text();

    // 2. Compute HMAC-SHA256 on the exact raw string
    const computedSignature = await computeHmacSha256Hex(webhookSecret, rawBody);

    // 3. Timing-safe comparison to prevent timing leaks
    if (!timingSafeEqual(computedSignature.toLowerCase(), signatureHeader.toLowerCase())) {
      console.warn("[lemonsqueezy_webhook] Signature mismatch rejected");
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid webhook signature" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Safely parse verified JSON payload
    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return new Response(
        JSON.stringify({ error: "Bad Request: Malformed JSON payload" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const eventName = event.meta?.event_name;
    const customData = event.meta?.custom_data || {};
    const attributes = event.data?.attributes || {};
    const customerEmail = String(attributes.user_email || attributes.customer_email || "").trim().toLowerCase();

    // No PII in logs: event name and Lemon Squeezy object id only.
    console.log(`[lemonsqueezy_webhook] Verified event: ${eventName} (object: ${event.data?.id ?? "n/a"})`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    // Defense in depth on top of the HMAC: only act on events for our store/products.
    const expectedStoreId = (Deno.env.get("LEMONSQUEEZY_STORE_ID") || "").trim();
    const allowedProductIds = parseIdList(Deno.env.get("LEMONSQUEEZY_PRODUCT_IDS"));

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[lemonsqueezy_webhook] Missing Supabase database credentials");
      return new Response(
        JSON.stringify({ error: "Server configuration error: missing Supabase credentials" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Decide what the event means before touching the database
    const action = classifyWebhookEvent(eventName, attributes, expectedStoreId, allowedProductIds);
    if (action === "ignore") {
      return new Response(
        JSON.stringify({ received: true, event: eventName, ignored: true }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // 6. Resolve target user UUID: priority to custom_data.user_id, fallback to the buyer's email
    //    in auth.users (never to profiles.nick).
    let targetUserId: string | null = null;
    const candidateUserId = isUuid(customData.user_id) ? String(customData.user_id).trim() : null;

    if (candidateUserId) {
      const { data: profileCheck } = await adminSupabase
        .from("profiles")
        .select("id")
        .eq("id", candidateUserId)
        .maybeSingle();

      if (profileCheck?.id) {
        targetUserId = profileCheck.id;
      }
    }

    if (!targetUserId && customerEmail) {
      // Page through auth.users instead of only reading the first 1000 accounts.
      const PER_PAGE = 1000;
      const MAX_PAGES = 100;
      for (let page = 1; page <= MAX_PAGES && !targetUserId; page++) {
        const { data: authList, error: listError } = await adminSupabase.auth.admin.listUsers({ page, perPage: PER_PAGE });
        if (listError) {
          console.error("[lemonsqueezy_webhook] listUsers error:", listError.message);
          break;
        }
        const users = authList?.users || [];
        const matched = users.find((u) => (u.email || "").toLowerCase() === customerEmail);
        if (matched?.id) {
          targetUserId = matched.id;
        }
        if (users.length < PER_PAGE) break;
      }
    }

    if (!targetUserId) {
      console.warn(`[lemonsqueezy_webhook] No matching user for event ${eventName} (object: ${event.data?.id ?? "n/a"})`);
      // Acknowledge receipt to Lemon Squeezy to avoid infinite webhook retry
      return new Response(
        JSON.stringify({ received: true, warning: "User not identified in database" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const orderId = attributes.order_id ? String(attributes.order_id) : (event.data?.id ? String(event.data.id) : null);
    const subscriptionId = attributes.subscription_id ? String(attributes.subscription_id) : null;
    const customerId = attributes.customer_id ? String(attributes.customer_id) : null;
    const expiresAt = attributes.ends_at || attributes.renews_at || null;

    if (action === "activate") {
      const { error: rpcError } = await adminSupabase.rpc("set_profile_pro_status", {
        p_user_id: targetUserId,
        p_is_pro: true,
        p_license_key_hash: attributes.first_order_item?.id ? `lemon_${attributes.first_order_item.id}` : `order_${orderId}`,
        p_lemon_order_id: orderId,
        p_lemon_sub_id: subscriptionId,
        p_lemon_cust_id: customerId,
        p_instance_id: `webhook_${eventName}`,
        p_expires_at: expiresAt,
      });

      if (rpcError) {
        console.error("[lemonsqueezy_webhook] Activation RPC error:", rpcError);
        return new Response(JSON.stringify({ error: "Database error during activation" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      console.log(`[lemonsqueezy_webhook] PRO activated via ${eventName}`);
    } else if (action === "revoke") {
      const { error: rpcError } = await adminSupabase.rpc("set_profile_pro_status", {
        p_user_id: targetUserId,
        p_is_pro: false,
        p_license_key_hash: null,
        p_lemon_order_id: orderId,
        p_lemon_sub_id: subscriptionId,
        p_lemon_cust_id: customerId,
        p_instance_id: null,
        p_expires_at: null,
      });

      if (rpcError) {
        console.error("[lemonsqueezy_webhook] Revocation RPC error:", rpcError);
        return new Response(JSON.stringify({ error: "Database error during revocation" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      console.log(`[lemonsqueezy_webhook] PRO revoked via ${eventName}`);
    }

    return new Response(
      JSON.stringify({ received: true, event: eventName, user_id: targetUserId }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[lemonsqueezy_webhook] Unhandled exception:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
