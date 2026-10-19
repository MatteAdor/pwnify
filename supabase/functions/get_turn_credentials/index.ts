// Edge Function: get_turn_credentials
// Ephemeral TURN credentials (TTL 1h) with provider support (Metered / coturn RFC 5766)
// Requires valid user JWT, applies atomic PostgreSQL rate limiting, and restricts CORS to app origin.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:4173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:4173",
  "https://zeroday.gg",
  "capacitor://localhost",
];

function getCorsHeaders(req: Request): { headers: Record<string, string>; allowed: boolean } {
  const origin = req.headers.get("origin") || "";
  const envOrigins = (Deno.env.get("ALLOWED_ORIGINS") || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  const allowedList = [...DEFAULT_ALLOWED_ORIGINS, ...envOrigins];
  const isAllowed = !origin || allowedList.includes(origin) || origin.endsWith(".zeroday.gg");

  return {
    allowed: isAllowed,
    headers: {
      "Access-Control-Allow-Origin": isAllowed ? (origin || "*") : allowedList[0],
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Vary": "Origin",
    },
  };
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

  try {
    // 2. Mandatory JWT Authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: valid JWT session required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "").trim();
    const { data: { user }, error: authError } = await userClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: invalid or expired session token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Atomic Rate Limiting via PostgreSQL RPC (10 requests / 5 minutes per user_id)
    if (supabaseServiceKey) {
      const adminClient = createClient(supabaseUrl, supabaseServiceKey);
      const { data: isAllowed, error: rateLimitError } = await adminClient.rpc(
        "check_and_increment_rate_limit",
        {
          p_user_id: user.id,
          p_action: "turn_credentials",
          p_max_requests: 10,
          p_window_seconds: 300,
        }
      );

      if (rateLimitError) {
        console.warn("[TURN RateLimit] DB check error:", rateLimitError.message);
      } else if (isAllowed === false) {
        return new Response(
          JSON.stringify({ error: "Too many requests: rate limit exceeded (10 requests per 5 minutes)" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 4. Build ICE Servers Array (Strictly STUN first -> TURN)
    const iceServers: Array<{ urls: string | string[]; username?: string; credential?: string }> = [
      {
        urls: [
          "stun:stun.l.google.com:19302",
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
        ],
      },
    ];

    const TTL_SECONDS = 3600;
    const meteredApiKey = Deno.env.get("METERED_API_KEY");
    const meteredAppName = Deno.env.get("METERED_APP_NAME");
    const turnSecret = Deno.env.get("TURN_SECRET");
    const turnUrls = Deno.env.get("TURN_URLS");

    let hasTurnConfigured = false;

    // Option A: Metered TURN API with expiring credentials
    if (meteredApiKey && meteredAppName) {
      try {
        const resp = await fetch(
          `https://${meteredAppName}.metered.ca/api/v1/turn/credentials?apiKey=${meteredApiKey}`
        );
        if (resp.ok) {
          const meteredServers = await resp.json();
          if (Array.isArray(meteredServers)) {
            for (const s of meteredServers) {
              if (s.urls && (s.urls.includes("turn:") || s.urls.includes("turns:"))) {
                iceServers.push(s);
                hasTurnConfigured = true;
              }
            }
          }
        } else {
          console.error("[TURN] Metered API error status:", resp.status);
        }
      } catch (mErr) {
        console.error("[TURN] Error fetching Metered credentials:", mErr);
      }
    }
    // Option B: Standard RFC 5766 HMAC-SHA1 Ephemeral TURN (coturn / Cloudflare)
    else if (turnSecret && turnUrls) {
      const expiry = Math.floor(Date.now() / 1000) + TTL_SECONDS;
      const username = `${expiry}:${user.id}`;

      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(turnSecret),
        { name: "HMAC", hash: "SHA-1" },
        false,
        ["sign"]
      );

      const signature = await crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode(username)
      );

      const credential = btoa(String.fromCharCode(...new Uint8Array(signature)));
      const urlList = turnUrls.split(",").map((u) => u.trim());

      iceServers.push({
        urls: urlList,
        username,
        credential,
      });
      hasTurnConfigured = true;
    }

    // Option C: Metered static TURN credentials
    else {
      const meteredUser = Deno.env.get("METERED_USERNAME") || "7bf81f9fc20f932f960bab5d";
      const meteredPass = Deno.env.get("METERED_PASSWORD") || "aV0BxRJmzyJy9b0Y";
      if (meteredUser && meteredPass) {
        iceServers.push(
          { urls: "stun:relay.metered.ca:80" },
          {
            urls: [
              "turn:relay.metered.ca:80",
              "turn:relay.metered.ca:443",
              "turn:relay.metered.ca:443?transport=tcp",
            ],
            username: meteredUser,
            credential: meteredPass,
          }
        );
        hasTurnConfigured = true;
      }
    }

    if (!hasTurnConfigured) {
      return new Response(
        JSON.stringify({
          error: "No TURN provider configured on server",
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        iceServers,
        ttl: TTL_SECONDS,
        userId: user.id,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "private, max-age=3600",
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
