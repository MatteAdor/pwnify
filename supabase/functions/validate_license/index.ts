// Edge Function: validate_license
// Authoritative Lemon Squeezy License Key Activation and Validation
// Tied cryptographically to auth.uid() via Lemon Squeezy instance_name.
// Updates public.profiles.is_pro strictly via Supabase Service Role.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { isLicenseFromOurStore, parseIdList } from "../_shared/lemonLicense.ts";

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

export function getCorsHeaders(req: Request): { headers: Record<string, string>; allowed: boolean } {
  const origin = req.headers.get("origin") || "";
  const envOrigins = (Deno.env.get("ALLOWED_ORIGINS") || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  const isAllowed = !origin || isOriginAllowed(origin, envOrigins);

  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };

  if (origin && isAllowed) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return {
    allowed: isAllowed,
    headers,
  };
}

async function sha256Hex(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req: Request) => {
  const { headers: corsHeaders, allowed: originAllowed } = getCorsHeaders(req);

  // 1. CORS Preflight
  if (req.method === "OPTIONS") {
    if (!originAllowed) {
      return new Response("CORS origin forbidden", { status: 403, headers: corsHeaders });
    }
    return new Response("ok", { headers: corsHeaders });
  }

  if (!originAllowed) {
    return new Response(
      JSON.stringify({ error: "Forbidden: Origin not permitted" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. POST required." }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // 2. Mandatory JWT Authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing Bearer token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    // The License API accepts keys from ANY Lemon Squeezy store: bind to ours (fail closed).
    const expectedStoreId = (Deno.env.get("LEMONSQUEEZY_STORE_ID") || "").trim();
    const allowedProductIds = parseIdList(Deno.env.get("LEMONSQUEEZY_PRODUCT_IDS"));

    if (!supabaseUrl || !supabaseServiceKey || !expectedStoreId) {
      return new Response(
        JSON.stringify({ error: "Server configuration error: missing Supabase or Lemon Squeezy store configuration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user JWT
    const clientSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await clientSupabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Parse and sanitize request body
    const body = await req.json().catch(() => ({}));
    const rawLicenseKey = typeof body.license_key === "string" ? body.license_key.trim() : "";

    if (!rawLicenseKey || rawLicenseKey.length < 8 || rawLicenseKey.length > 128) {
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid license key format." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });
    const keyHash = await sha256Hex(rawLicenseKey);

    // Instance binding: bind this activation strictly to the caller's auth.uid()
    const instanceName = user.id;

    const rejectLicense = () =>
      new Response(
        JSON.stringify({
          valid: false,
          is_pro: false,
          error: "License verification failed or license is not active.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    // 4. Contact Lemon Squeezy License API
    // Attempt license activation first
    const activateRes = await fetch("https://api.lemonsqueezy.com/v1/licenses/activate", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        license_key: rawLicenseKey,
        instance_name: instanceName,
      }),
    });

    const activateData = await activateRes.json().catch(() => ({}));
    let isValid = false;
    let licenseStatus = "inactive";
    let instanceId = "";
    let orderId: string | null = null;
    let customerId: string | null = null;
    let expiresAt: string | null = null;

    if (activateData.activated === true) {
      instanceId = activateData.instance?.id || "";

      if (!isLicenseFromOurStore(activateData.meta, expectedStoreId, allowedProductIds)) {
        // Foreign store/product: release the activation we just consumed (best effort) and reject.
        if (instanceId) {
          await fetch("https://api.lemonsqueezy.com/v1/licenses/deactivate", {
            method: "POST",
            headers: {
              "Accept": "application/json",
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({ license_key: rawLicenseKey, instance_id: instanceId }),
          }).catch(() => {});
        }
        console.warn("[validate_license] Rejected license from another store/product");
        return rejectLicense();
      }

      isValid = true;
      licenseStatus = activateData.license_key?.status || "active";
      orderId = activateData.meta?.order_id ? String(activateData.meta.order_id) : null;
      customerId = activateData.meta?.customer_id ? String(activateData.meta.customer_id) : null;
      expiresAt = activateData.license_key?.expires_at || null;
    } else {
      // Activation failed (e.g. activation limit reached). Re-validate ONLY an instance this
      // same user activated before: Lemon Squeezy expects the instance ID returned by
      // `activate`, which set_profile_pro_status stored in user_licenses.
      const { data: existingLicense } = await adminSupabase
        .from("user_licenses")
        .select("instance_id")
        .eq("user_id", user.id)
        .eq("license_key_hash", keyHash)
        .not("instance_id", "is", null)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const storedInstanceId = typeof existingLicense?.instance_id === "string" ? existingLicense.instance_id : "";

      if (storedInstanceId) {
        const validateRes = await fetch("https://api.lemonsqueezy.com/v1/licenses/validate", {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            license_key: rawLicenseKey,
            instance_id: storedInstanceId,
          }),
        });

        const validateData = await validateRes.json().catch(() => ({}));
        if (
          validateData.valid === true &&
          validateData.instance?.id === storedInstanceId &&
          isLicenseFromOurStore(validateData.meta, expectedStoreId, allowedProductIds)
        ) {
          isValid = true;
          licenseStatus = validateData.license_key?.status || "active";
          instanceId = storedInstanceId;
          orderId = validateData.meta?.order_id ? String(validateData.meta.order_id) : null;
          customerId = validateData.meta?.customer_id ? String(validateData.meta.customer_id) : null;
          expiresAt = validateData.license_key?.expires_at || null;
        }
      }
    }

    if (!isValid || licenseStatus !== "active") {
      return rejectLicense();
    }

    // 5. Authoritatively update public.profiles.is_pro and record license via Service Role
    const { error: rpcError } = await adminSupabase.rpc("set_profile_pro_status", {
      p_user_id: user.id,
      p_is_pro: true,
      p_license_key_hash: keyHash,
      p_lemon_order_id: orderId,
      p_lemon_sub_id: null,
      p_lemon_cust_id: customerId,
      p_instance_id: instanceId,
      p_expires_at: expiresAt,
    });

    if (rpcError) {
      console.error("[validate_license] RPC error:", rpcError);
      return new Response(
        JSON.stringify({ error: "Failed to persist PRO status to database." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        valid: true,
        is_pro: true,
        status: "active",
        message: "ZeroDay PRO successfully activated and bound to your account.",
        instance_id: instanceId,
        expires_at: expiresAt,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[validate_license] Unexpected exception:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
