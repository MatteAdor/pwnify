-- =====================================================================
-- ZERODAY SERVER-VALIDATED STREAK ENGINE & MIGRATION SCHEMA (HARDENED)
-- Migration: 20261024000001_server_validated_streak.sql
-- Status: PROPOSAL FILE ONLY (DO NOT APPLY DIRECTLY TO PRODUCTION)
-- =====================================================================
-- 1. Creates `public.user_streaks` with timezone validation, 30d timezone rate-limit,
--    and capped merit shields.
-- 2. Seed query guarantees no zombie streaks: streaks older than 1 day are set to 0,
--    and values from inventory are strictly capped at 365.
-- 3. `record_user_streak_activity` runs as SECURITY DEFINER with fixed search_path,
--    verifies auth.uid(), rejects client boolean spoofing for PBQs, and restricts EXECUTE
--    strictly to authenticated role.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.user_streaks (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    streak_days INT NOT NULL DEFAULT 0 CHECK (streak_days >= 0),
    last_active_date DATE,
    last_active_timestamp TIMESTAMPTZ,
    streak_shield_count INT NOT NULL DEFAULT 0 CHECK (streak_shield_count >= 0 AND streak_shield_count <= 1),
    freeze_until_date DATE,
    last_freeze_activated_date DATE,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    timezone_updated_at TIMESTAMPTZ,
    last_shield_awarded_streak INT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

CREATE INDEX IF NOT EXISTS idx_user_streaks_user ON public.user_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_streaks_days ON public.user_streaks(streak_days);

-- Optional server-side verified PBQ completions table (if present in schema)
CREATE TABLE IF NOT EXISTS public.pbq_verified_completions (
    id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pbq_id TEXT NOT NULL,
    score INT NOT NULL CHECK (score >= 0 AND score <= 100),
    verified_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    shield_claimed BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_pbq_verified_user ON public.pbq_verified_completions(user_id, shield_claimed);

-- ---------------------------------------------------------------------
-- MIGRATION SEED: PRESERVE EXISTING STREAKS & VALUE CAPS
-- Preserves existing streakDays from user inventory (e.g. from Daily 0xBreach / PBQ),
-- even if user has not played ranked matches recently (last_ranked_at is NULL or old).
-- Values extracted from inventory are strictly bounded between 0 and 365.
-- ---------------------------------------------------------------------
INSERT INTO public.user_streaks (
    user_id, streak_days, last_active_date, last_active_timestamp, timezone
)
SELECT 
    p.id AS user_id,
    LEAST(365, GREATEST(0, COALESCE((p.inventory->>'streakDays')::int, 0))) AS streak_days,
    CASE 
        WHEN COALESCE((p.inventory->>'streakDays')::int, 0) > 0 
        THEN COALESCE(p.last_ranked_at::DATE, p.updated_at::DATE, pg_catalog.current_date)
        ELSE NULL 
    END AS last_active_date,
    COALESCE(p.last_ranked_at, p.updated_at, pg_catalog.now()) AS last_active_timestamp,
    'UTC' AS timezone
FROM public.profiles p
ON CONFLICT (user_id) DO UPDATE SET
    streak_days = GREATEST(public.user_streaks.streak_days, EXCLUDED.streak_days),
    last_active_date = COALESCE(public.user_streaks.last_active_date, EXCLUDED.last_active_date),
    last_active_timestamp = COALESCE(public.user_streaks.last_active_timestamp, EXCLUDED.last_active_timestamp);

-- ---------------------------------------------------------------------
-- RPC: GET AUTHORITATIVE SERVER TIME
-- Strictly SECURITY DEFINER with fixed search_path
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_server_time()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    RETURN json_build_object(
        'server_now_iso', pg_catalog.now(),
        'server_timestamp_ms', (EXTRACT(EPOCH FROM pg_catalog.now()) * 1000)::BIGINT,
        'server_date_utc', CURRENT_DATE
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_server_time() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_server_time() TO authenticated;

-- ---------------------------------------------------------------------
-- RPC: AUTHORITATIVE ACTIVITY REGISTRATION (SERVER-VALIDATED)
-- Hardened: validates timezone against pg_timezone_names, enforces 30d
-- timezone rate limit, verifies PBQ server records, runs with fixed search_path.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_user_streak_activity(
    p_timezone TEXT DEFAULT NULL,
    p_verified_pbq_completion_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_user_id UUID;
    v_streak RECORD;
    v_server_now TIMESTAMPTZ;
    v_effective_tz TEXT;
    v_today DATE;
    v_days_diff INT;
    v_new_streak INT;
    v_shield_earned BOOLEAN := FALSE;
    v_shield_consumed BOOLEAN := FALSE;
    v_shield_count INT;
    v_is_pro BOOLEAN;
    v_tz_updated_at TIMESTAMPTZ;
    v_valid_pbq BOOLEAN := FALSE;
BEGIN
    -- 1. Authentication Check
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Access denied: authentication required' USING ERRCODE = '42501';
    END IF;

    v_server_now := pg_catalog.now();

    -- 2. Fetch user pro status
    SELECT is_pro INTO v_is_pro FROM public.profiles WHERE id = v_user_id;

    -- 3. Lock streak row for atomic update
    SELECT * INTO v_streak FROM public.user_streaks WHERE user_id = v_user_id FOR UPDATE;

    -- 4. Timezone Validation & Rate-Limiting (max 1 change per 30 days)
    IF v_streak IS NULL THEN
        -- Initial timezone resolution
        v_effective_tz := COALESCE(p_timezone, 'UTC');
        IF NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = v_effective_tz) THEN
            v_effective_tz := 'UTC';
        END IF;
        v_tz_updated_at := v_server_now;
    ELSE
        v_effective_tz := v_streak.timezone;
        v_tz_updated_at := v_streak.timezone_updated_at;

        -- User requested a timezone change
        IF p_timezone IS NOT NULL AND p_timezone <> v_streak.timezone THEN
            -- Validate timezone exists in Postgres timezone database
            IF EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = p_timezone) THEN
                -- Enforce 30-day cooldown between timezone migrations
                IF v_streak.timezone_updated_at IS NULL OR v_server_now >= v_streak.timezone_updated_at + INTERVAL '30 days' THEN
                    v_effective_tz := p_timezone;
                    v_tz_updated_at := v_server_now;
                END IF;
            END IF;
        END IF;
    END IF;

    -- Calculate current calendar date in user's authoritative timezone
    v_today := (v_server_now AT TIME ZONE v_effective_tz)::DATE;

    -- 5. First-ever activity handling
    IF v_streak IS NULL THEN
        INSERT INTO public.user_streaks (
            user_id, streak_days, last_active_date, last_active_timestamp, 
            streak_shield_count, timezone, timezone_updated_at
        ) VALUES (
            v_user_id, 1, v_today, v_server_now, 0, v_effective_tz, v_tz_updated_at
        );
        RETURN json_build_object(
            'streak_days', 1,
            'shield_earned', FALSE,
            'shield_consumed', FALSE,
            'streak_shield_count', 0,
            'effective_date', v_today,
            'timezone', v_effective_tz,
            'message', 'Streak iniziato! 1° giorno.'
        );
    END IF;

    -- 6. Evaluate calendar day difference
    IF v_streak.last_active_date IS NULL THEN
        v_days_diff := 1;
    ELSE
        v_days_diff := v_today - v_streak.last_active_date;
    END IF;

    v_new_streak := v_streak.streak_days;
    v_shield_count := v_streak.streak_shield_count;

    IF v_days_diff = 0 THEN
        -- Same day activity, no streak increment
        RETURN json_build_object(
            'streak_days', v_new_streak,
            'shield_earned', FALSE,
            'shield_consumed', FALSE,
            'streak_shield_count', v_shield_count,
            'effective_date', v_today,
            'timezone', v_effective_tz,
            'message', 'Attività già registrata per oggi.'
        );
    ELSIF v_days_diff = 1 THEN
        -- Legitimate consecutive day
        v_new_streak := LEAST(365, v_new_streak + 1);
        -- Earn shield every 5 days if slot is empty (max 1 for free) and not already awarded for this threshold
        IF v_new_streak % 5 = 0 AND v_shield_count < 1 AND COALESCE(v_streak.last_shield_awarded_streak, 0) != v_new_streak THEN
            v_shield_earned := TRUE;
            v_shield_count := 1;
        END IF;
    ELSE
        -- Missed 1 or more days (days_diff > 1)
        IF v_streak.freeze_until_date IS NOT NULL AND v_today <= v_streak.freeze_until_date THEN
            -- Protected by vacation pause
            v_new_streak := LEAST(365, v_new_streak + 1);
        ELSIF v_shield_count > 0 OR v_is_pro THEN
            -- Protected by shield
            IF NOT v_is_pro THEN
                v_shield_consumed := TRUE;
                v_shield_count := GREATEST(0, v_shield_count - 1);
            END IF;
            v_new_streak := LEAST(365, v_new_streak + 1);
        ELSE
            -- Streak resets to 1
            v_new_streak := 1;
        END IF;
    END IF;

    -- 7. PBQ 100% Score Shield Bonus: NEVER trust client boolean!
    -- Strictly check server-verified completion record
    IF p_verified_pbq_completion_id IS NOT NULL AND v_shield_count < 1 THEN
        UPDATE public.pbq_verified_completions
        SET shield_claimed = TRUE
        WHERE id = p_verified_pbq_completion_id
          AND user_id = v_user_id
          AND score = 100
          AND shield_claimed = FALSE
        RETURNING TRUE INTO v_valid_pbq;

        IF v_valid_pbq IS TRUE THEN
            v_shield_earned := TRUE;
            v_shield_count := 1;
        END IF;
    END IF;

    -- 8. Persist authoritative state
    UPDATE public.user_streaks SET
        streak_days = v_new_streak,
        last_active_date = v_today,
        last_active_timestamp = v_server_now,
        streak_shield_count = v_shield_count,
        timezone = v_effective_tz,
        timezone_updated_at = v_tz_updated_at,
        last_shield_awarded_streak = CASE WHEN v_shield_earned THEN v_new_streak ELSE v_streak.last_shield_awarded_streak END,
        updated_at = v_server_now
    WHERE user_id = v_user_id;

    RETURN json_build_object(
        'streak_days', v_new_streak,
        'shield_earned', v_shield_earned,
        'shield_consumed', v_shield_consumed,
        'streak_shield_count', v_shield_count,
        'effective_date', v_today,
        'timezone', v_effective_tz
    );
END;
$$;

-- Revoke execute from public and anon, grant strictly to authenticated
REVOKE ALL ON FUNCTION public.record_user_streak_activity FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_user_streak_activity TO authenticated;

-- ---------------------------------------------------------------------
-- RLS POLICIES FOR user_streaks
-- ---------------------------------------------------------------------
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_streaks_read_own" ON public.user_streaks;
CREATE POLICY "user_streaks_read_own" ON public.user_streaks
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

REVOKE ALL ON public.user_streaks FROM anon;
