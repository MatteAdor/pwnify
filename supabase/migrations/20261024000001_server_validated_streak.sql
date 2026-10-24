-- =====================================================================
-- ZERODAY SERVER-VALIDATED STREAK ENGINE & MIGRATION SCHEMA
-- Migration: 20261024000001_server_validated_streak.sql
-- Status: PROPOSAL FILE ONLY (DO NOT APPLY DIRECTLY TO PRODUCTION)
-- =====================================================================
-- 1. Creates `public.user_streaks` with timezone awareness & shield caps.
-- 2. Migrates existing client/profile streaks additively without zeroing out.
-- 3. Provides `public.get_server_time()` and `public.record_user_streak_activity()`.
-- 4. Strictly denies direct client writes; enforces RLS read own only.
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
    last_shield_awarded_streak INT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

CREATE INDEX IF NOT EXISTS idx_user_streaks_user ON public.user_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_streaks_days ON public.user_streaks(streak_days);

-- ---------------------------------------------------------------------
-- MIGRATION: SEED FROM EXISTING PROFILES WITHOUT RESETTING
-- Preserves highest recorded streak (from profiles.inventory or baseline)
-- ---------------------------------------------------------------------
INSERT INTO public.user_streaks (user_id, streak_days, last_active_date, timezone)
SELECT 
    p.id AS user_id,
    GREATEST(
        0, 
        COALESCE((p.inventory->>'streakDays')::int, 0),
        COALESCE((p.inventory->>'dailyBreachStreak')::int, 0)
    ) AS streak_days,
    CURRENT_DATE AS last_active_date,
    'UTC' AS timezone
FROM public.profiles p
ON CONFLICT (user_id) DO UPDATE SET
    streak_days = GREATEST(public.user_streaks.streak_days, EXCLUDED.streak_days);

-- ---------------------------------------------------------------------
-- RPC: GET AUTHORITATIVE SERVER TIME
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_server_time()
RETURNS JSONB AS $$
BEGIN
    RETURN json_build_object(
        'server_now_iso', pg_catalog.now(),
        'server_timestamp_ms', (EXTRACT(EPOCH FROM pg_catalog.now()) * 1000)::BIGINT,
        'server_date_utc', CURRENT_DATE
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- RPC: AUTHORITATIVE ACTIVITY REGISTRATION (SERVER-VALIDATED)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_user_streak_activity(
    p_timezone TEXT DEFAULT 'UTC',
    p_is_pbq_perfect BOOLEAN DEFAULT FALSE
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_streak RECORD;
    v_server_now TIMESTAMPTZ;
    v_today DATE;
    v_days_diff INT;
    v_new_streak INT;
    v_shield_earned BOOLEAN := FALSE;
    v_shield_consumed BOOLEAN := FALSE;
    v_shield_count INT;
    v_is_pro BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    -- Fetch user pro status
    SELECT is_pro INTO v_is_pro FROM public.profiles WHERE id = v_user_id;

    -- Calculate current calendar date in user's specified timezone
    v_server_now := pg_catalog.now();
    v_today := (v_server_now AT TIME ZONE COALESCE(p_timezone, 'UTC'))::DATE;

    -- Lock streak row for atomic update
    SELECT * INTO v_streak FROM public.user_streaks WHERE user_id = v_user_id FOR UPDATE;

    IF NOT FOUND THEN
        -- First recorded activity
        INSERT INTO public.user_streaks (
            user_id, streak_days, last_active_date, last_active_timestamp, 
            streak_shield_count, timezone
        ) VALUES (
            v_user_id, 1, v_today, v_server_now, 0, COALESCE(p_timezone, 'UTC')
        );
        RETURN json_build_object(
            'streak_days', 1,
            'shield_earned', FALSE,
            'shield_consumed', FALSE,
            'message', 'Streak iniziato! 1° giorno.'
        );
    END IF;

    -- Evaluate calendar day difference
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
            'message', 'Attività già registrata per oggi.'
        );
    ELSIF v_days_diff = 1 THEN
        -- Legitimate consecutive day
        v_new_streak := v_new_streak + 1;
        -- Earn shield every 5 days if slot is empty (max 1) and not already awarded
        IF v_new_streak % 5 = 0 AND v_shield_count < 1 AND COALESCE(v_streak.last_shield_awarded_streak, 0) != v_new_streak THEN
            v_shield_earned := TRUE;
            v_shield_count := 1;
        END IF;
    ELSE
        -- Missed 1 or more days (days_diff > 1)
        IF v_streak.freeze_until_date IS NOT NULL AND v_today <= v_streak.freeze_until_date THEN
            -- Protected by vacation pause
            v_new_streak := v_new_streak + 1;
        ELSIF v_shield_count > 0 OR v_is_pro THEN
            -- Protected by shield
            IF NOT v_is_pro THEN
                v_shield_consumed := TRUE;
                v_shield_count := GREATEST(0, v_shield_count - 1);
            END IF;
            v_new_streak := v_new_streak + 1;
        ELSE
            -- Streak resets to 1
            v_new_streak := 1;
        END IF;
    END IF;

    -- PBQ 100% bonus check
    IF p_is_pbq_perfect AND v_shield_count < 1 THEN
        v_shield_earned := TRUE;
        v_shield_count := 1;
    END IF;

    -- Persist authoritative state
    UPDATE public.user_streaks SET
        streak_days = v_new_streak,
        last_active_date = v_today,
        last_active_timestamp = v_server_now,
        streak_shield_count = v_shield_count,
        timezone = COALESCE(p_timezone, v_streak.timezone),
        last_shield_awarded_streak = CASE WHEN v_shield_earned THEN v_new_streak ELSE v_streak.last_shield_awarded_streak END,
        updated_at = v_server_now
    WHERE user_id = v_user_id;

    RETURN json_build_object(
        'streak_days', v_new_streak,
        'shield_earned', v_shield_earned,
        'shield_consumed', v_shield_consumed,
        'streak_shield_count', v_shield_count,
        'effective_date', v_today
    );
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- RLS POLICIES FOR user_streaks
-- ---------------------------------------------------------------------
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_streaks_read_own" ON public.user_streaks;
CREATE POLICY "user_streaks_read_own" ON public.user_streaks
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Explicitly revoke public/anon access
REVOKE ALL ON public.user_streaks FROM anon;
