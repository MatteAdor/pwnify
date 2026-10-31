-- =====================================================================
-- ZERODAY SERVER-SIDE DAILY FLASH EXTRACTION & IDEMPOTENT DRAWS
-- Migration: 20261024000003_daily_flash_draws.sql
-- Status: PROPOSAL FILE ONLY (DO NOT APPLY DIRECTLY TO PRODUCTION)
-- =====================================================================
-- 1. Creates `public.daily_flash_draws` with UNIQUE constraint (user_id, draw_date).
-- 2. Implements `claim_daily_flash_draw(p_timezone TEXT)` RPC using internal server seed.
-- 3. Idempotently computes 10% draw probability without exposing secret or RNG to client.
-- 4. Server awards bonus XP atomically; client cannot manipulate or redraw.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.daily_flash_draws (
    id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    draw_date DATE NOT NULL,
    is_flash BOOLEAN NOT NULL DEFAULT FALSE,
    xp_bonus INT NOT NULL DEFAULT 0 CHECK (xp_bonus >= 0),
    incident_cve TEXT,
    claimed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    CONSTRAINT unique_user_daily_flash UNIQUE (user_id, draw_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_flash_user_date ON public.daily_flash_draws(user_id, draw_date);

-- ---------------------------------------------------------------------
-- RPC: CLAIM DAILY FLASH DRAW (SERVER-AUTHORITATIVE)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_daily_flash_draw(
    p_timezone TEXT DEFAULT 'UTC'
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_server_now TIMESTAMPTZ;
    v_today DATE;
    v_existing RECORD;
    v_seed_bytes BYTEA;
    v_hash_bytes BYTEA;
    v_hash_int BIGINT;
    v_is_flash BOOLEAN;
    v_xp_bonus INT := 0;
    v_server_secret TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    v_server_now := pg_catalog.now();
    v_today := (v_server_now AT TIME ZONE COALESCE(p_timezone, 'UTC'))::DATE;

    -- Check if draw already exists for today (idempotency)
    SELECT * INTO v_existing FROM public.daily_flash_draws 
    WHERE user_id = v_user_id AND draw_date = v_today;

    IF FOUND THEN
        RETURN json_build_object(
            'is_flash', v_existing.is_flash,
            'xp_bonus', v_existing.xp_bonus,
            'draw_date', v_existing.draw_date,
            'already_drawn', TRUE
        );
    END IF;

    -- Server-side secret seed (never revealed or passed by client)
    -- In production, retrieved strictly from Supabase Vault (vault.decrypted_secrets)
    BEGIN
        SELECT decrypted_secret INTO v_server_secret
        FROM vault.decrypted_secrets
        WHERE name = 'daily_flash_secret'
        LIMIT 1;
    EXCEPTION WHEN undefined_table OR invalid_schema_name OR OTHERS THEN
        v_server_secret := NULL;
    END;

    IF v_server_secret IS NULL OR pg_catalog.length(v_server_secret) < 16 THEN
        RAISE EXCEPTION 'Daily flash secret configuration is missing or invalid in Supabase Vault'
            USING ERRCODE = '55000';
    END IF;

    -- Compute deterministic HMAC-SHA256 of (user_id || draw_date)
    v_seed_bytes := pg_catalog.convert_to(v_user_id::text || ':' || v_today::text, 'UTF8');
    BEGIN
        v_hash_bytes := extensions.hmac(v_seed_bytes, pg_catalog.convert_to(v_server_secret, 'UTF8'), 'sha256');
    EXCEPTION WHEN undefined_function THEN
        v_hash_bytes := public.hmac(v_seed_bytes, pg_catalog.convert_to(v_server_secret, 'UTF8'), 'sha256');
    END;

    -- Take first 4 bytes as integer for mod 100
    v_hash_int := ('x' || substr(encode(v_hash_bytes, 'hex'), 1, 8))::bit(32)::bigint;

    -- 10% probability threshold
    IF (abs(v_hash_int) % 100) < 10 THEN
        v_is_flash := TRUE;
        v_xp_bonus := 50; -- Controlled, non-monetized surprise reward
    ELSE
        v_is_flash := FALSE;
        v_xp_bonus := 0;
    END IF;

    -- Insert record atomically
    INSERT INTO public.daily_flash_draws (
        user_id, draw_date, is_flash, xp_bonus, claimed_at
    ) VALUES (
        v_user_id, v_today, v_is_flash, v_xp_bonus, v_server_now
    );

    -- If flash won, atomically increment profile XP on the server
    IF v_is_flash AND v_xp_bonus > 0 THEN
        UPDATE public.profiles
        SET xp = xp + v_xp_bonus
        WHERE id = v_user_id;
    END IF;

    RETURN json_build_object(
        'is_flash', v_is_flash,
        'xp_bonus', v_xp_bonus,
        'draw_date', v_today,
        'already_drawn', FALSE
    );
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- RLS POLICIES FOR daily_flash_draws
-- ---------------------------------------------------------------------
ALTER TABLE public.daily_flash_draws ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_flash_read_own" ON public.daily_flash_draws;
CREATE POLICY "daily_flash_read_own" ON public.daily_flash_draws
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

REVOKE ALL ON public.daily_flash_draws FROM anon;
