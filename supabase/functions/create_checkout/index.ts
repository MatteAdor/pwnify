// Edge Function: create_checkout
// Creates a Polar (Merchant of Record) checkout session server-side for the
// authenticated caller and returns the hosted checkout URL.
//
// The Polar customer is bound to the caller via external_customer_id = auth user id,
// taken from the verified JWT (never from the request body). polar_webhook relies on
// that binding to grant PRO through set_profile_pro_status.
//
// Secrets: POLAR_ACCESS_TOKEN, POLAR_PRODUCT_ID, POLAR_SERVER (sandbox|production),
// optional POLAR_SUCCESS_URL / POLAR_RETURN_URL / ALLOWED_ORIGINS.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { polarApiBase } from "../_shared/polarBilling.ts";

export const DEFAULT_ALLOWED_ORIGINS = [
  "https://pwnify.xyz",
  "https://www.pwnify.xyz",
  "https://zeroday-app.vercel.app",
  "https://localhost",
  "capacitor://localhost",
  "http://localhost:5173",
  "http://localhost:4173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:4173",
];

const DEFAULT_SUCCESS_URL = "https://pwnify.xyz/?checkout=success&checkout_id={CHECKOUT_ID}";
const DEFAULT_RETURN_URL = "https://pwnify.xyz/";

export function isOriginAllowed(origin: string, envOrigins: string[] = []): boolean {
  if (!origin) return false;
  const allowedList = [...DEFAULT_ALLOWED_ORIGINS, ...envOrigins];
  if (allowedList.includes(origin)) return true;
  // Vercel preview deployment URLs requiring team suffix (-zero-day-app.vercel.app)
  if (/^https:\/\/(zeroday-app|pwnify)(-git-[a-z0-9-]+|-[a-z0-9]+)-zero-day-app\.vercel\.app$/i.test(origin)) {
    return true;
  }
  return false;
}

function getCorsHeaders(req: Request): { headers: Record<string, string>; allowed: boolean } {
  const origin = req.headers.get("origin") || "";
  const envOrigins = (Deno.env.get("ALLOWED_ORIGINS") || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  const allowed = !origin || isOriginAllowed(origin, envOrigins);
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
  if (origin && allowed) headers["Access-Control-Allow-Origin"] = origin;
  return { headers, allowed };
}

/** Only hand back hosted Polar checkout pages. */
function isPolarCheckoutUrl(raw: unknown): raw is string {
  if (typeof raw !== "string") return false;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && (u.hostname === "polar.sh" || u.hostname.endsWith(".polar.sh"));
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  const { headers: corsHeaders, allowed } = getCorsHeaders(req);
  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  if (req.method === "OPTIONS") {
    return allowed ? new Response("ok", { headers: corsHeaders }) : new Response("CORS origin forbidden", { status: 403 });
  }
  if (!allowed) return json({ error: "CORS origin forbidden" }, 403);
  if (req.method !== "POST") return json({ error: "Method not allowed. POST required." }, 405);

  try {
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return json({ error: "Unauthorized: Missing Bearer token" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const polarToken = Deno.env.get("POLAR_ACCESS_TOKEN") || "";
    const productId = (Deno.env.get("POLAR_PRODUCT_ID") || "").trim();
    const apiBase = polarApiBase(Deno.env.get("POLAR_SERVER"));

    if (!supabaseUrl || !supabaseAnonKey || !polarToken || !productId) {
      return json({ error: "Server configuration error: billing is not configured" }, 500);
    }

    // 1. Authenticate the caller from the JWT. The user id NEVER comes from the body.
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return json({ error: "Unauthorized: Invalid or expired token" }, 401);
    }

    // 2. Create the checkout session on Polar
    const polarRes = await fetch(`${apiBase}/v1/checkouts/`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${polarToken}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        products: [productId],
        external_customer_id: user.id,
        customer_email: user.email || undefined,
        metadata: { supabase_user_id: user.id },
        success_url: Deno.env.get("POLAR_SUCCESS_URL") || DEFAULT_SUCCESS_URL,
        return_url: Deno.env.get("POLAR_RETURN_URL") || DEFAULT_RETURN_URL,
      }),
    });

    const checkout = await polarRes.json().catch(() => ({}));
    if (!polarRes.ok || !isPolarCheckoutUrl(checkout?.url)) {
      // Status only: no tokens, emails or payloads in logs.
      console.error(`[create_checkout] Polar checkout creation failed (HTTP ${polarRes.status})`);
      return json({ error: "Could not start checkout. Please try again later." }, 502);
    }

    return json({ url: checkout.url }, 200);
  } catch (_err) {
    console.error("[create_checkout] Unexpected exception");
    return json({ error: "Internal server error" }, 500);
  }
});
