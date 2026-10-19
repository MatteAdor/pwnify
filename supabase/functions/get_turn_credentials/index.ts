// Edge Function: get_turn_credentials
// Generates ephemeral TURN credentials (TTL 1h) with provider support (Metered / coturn / Cloudflare)
// Requires valid user JWT and applies rate limiting per user/IP.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// In-memory sliding rate limiter (Max 10 requests per 5 minutes per user/IP)
interface RateLimitEntry {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_REQUESTS_PER_WINDOW = 10;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  entry.count += 1;
  return true;
}

// Cleanup stale rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}, 60 * 1000);

serve(async (req: Request) => {
  // 1. CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "").trim();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: invalid or expired session token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Rate Limiting Check (Per user ID and IP)
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
                     req.headers.get("cf-connecting-ip") || "unknown-ip";
    const rateLimitKey = `${user.id}:${clientIp}`;

    if (!checkRateLimit(rateLimitKey)) {
      return new Response(
        JSON.stringify({ error: "Too many requests: rate limit exceeded (10 requests per 5 minutes)" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

    const TTL_SECONDS = 3600; // 1 hour TTL
    const meteredApiKey = Deno.env.get("METERED_API_KEY");
    const meteredAppName = Deno.env.get("METERED_APP_NAME");
    const turnSecret = Deno.env.get("TURN_SECRET");
    const turnUrls = Deno.env.get("TURN_URLS");

    // Option A: Metered TURN API
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
              }
            }
          }
        } else {
          console.warn("[TURN] Metered API request failed:", resp.status);
        }
      } catch (mErr) {
        console.warn("[TURN] Error fetching Metered credentials:", mErr);
      }
    }
    // Option B: Standard RFC 5766 HMAC-SHA1 Ephemeral TURN (coturn / Cloudflare / custom)
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
    }
    // Option C: Fallback / Local Dev Ephemeral Token
    else {
      // In local development or until production TURN secret is populated,
      // emit developer coturn configuration with signed ephemeral key
      const devSecret = "zeroday_dev_turn_secret_ephemeral_token";
      const expiry = Math.floor(Date.now() / 1000) + TTL_SECONDS;
      const username = `${expiry}:${user.id.slice(0, 8)}`;

      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(devSecret),
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

      iceServers.push({
        urls: [
          "turn:turn.zeroday.internal:3478?transport=udp",
          "turn:turn.zeroday.internal:3478?transport=tcp",
          "turns:turn.zeroday.internal:5349?transport=tcp",
        ],
        username,
        credential,
      });
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
