-- =====================================================================
-- ZERODAY PROPOSAL: CORE RPCS ELEVATION TO SECURITY DEFINER
-- Migration: 20261024000007_harden_core_rpcs_security_definer.sql
-- Status: PROPOSAL FILE ONLY (DO NOT APPLY DIRECTLY TO PRODUCTION)
-- =====================================================================
-- Elevates find_or_create_match, submit_answer, forfeit_match, 
-- claim_daily_flash_draw, and migrate_my_legacy_progress from SECURITY INVOKER
-- to SECURITY DEFINER with fixed search_path = '' and fully qualified names.
-- Eliminates client table privilege dependencies (profiles/matches update).
-- =====================================================================

-- 1. claim_daily_flash_draw
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
    v_today := (v_server_now AT TIME ZONE pg_catalog.coalesce(p_timezone, 'UTC'))::DATE;

    SELECT * INTO v_existing FROM public.daily_flash_draws 
    WHERE user_id = v_user_id AND draw_date = v_today;

    IF FOUND THEN
        RETURN pg_catalog.jsonb_build_object(
            'is_flash', v_existing.is_flash,
            'xp_bonus', v_existing.xp_bonus,
            'draw_date', v_existing.draw_date,
            'already_drawn', TRUE
        );
    END IF;

    v_server_secret := pg_catalog.coalesce(
        pg_catalog.current_setting('app.settings.daily_flash_secret', true),
        '0x_zeroday_authoritative_daily_flash_secret_k992'
    );

    v_seed_bytes := pg_catalog.convert_to(v_user_id::text || ':' || v_today::text, 'UTF8');
    BEGIN
        v_hash_bytes := extensions.hmac(v_seed_bytes, pg_catalog.convert_to(v_server_secret, 'UTF8'), 'sha256');
    EXCEPTION WHEN undefined_function THEN
        v_hash_bytes := public.hmac(v_seed_bytes, pg_catalog.convert_to(v_server_secret, 'UTF8'), 'sha256');
    END;
    v_hash_int := ('x' || pg_catalog.substr(pg_catalog.encode(v_hash_bytes, 'hex'), 1, 8))::bit(32)::bigint;

    IF (pg_catalog.abs(v_hash_int) % 100) < 10 THEN
        v_is_flash := TRUE;
        v_xp_bonus := 50;
    ELSE
        v_is_flash := FALSE;
        v_xp_bonus := 0;
    END IF;

    INSERT INTO public.daily_flash_draws (
        user_id, draw_date, is_flash, xp_bonus, drawn_at
    ) VALUES (
        v_user_id, v_today, v_is_flash, v_xp_bonus, v_server_now
    );

    IF v_xp_bonus > 0 THEN
        UPDATE public.profiles
        SET xp = pg_catalog.coalesce(xp, 0) + v_xp_bonus
        WHERE id = v_user_id;
    END IF;

    RETURN pg_catalog.jsonb_build_object(
        'is_flash', v_is_flash,
        'xp_bonus', v_xp_bonus,
        'draw_date', v_today,
        'already_drawn', FALSE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 2. forfeit_match
CREATE OR REPLACE FUNCTION public.forfeit_match(p_match_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_match RECORD;
    v_winner_id UUID;
    v_loser_delta CONSTANT INT := -25;
    v_winner_delta CONSTANT INT := 18;
    v_recent_forfeits INT;
    v_cooldown_until TIMESTAMPTZ;
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: authentication token required' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_match
    FROM public.matches
    WHERE id = p_match_id
    FOR UPDATE;

    IF v_match.id IS NULL OR v_match.status != 'active' THEN
        RETURN pg_catalog.jsonb_build_object('status', 'already_ended');
    END IF;

    IF v_caller_id != v_match.p1_id AND v_caller_id != v_match.p2_id THEN
        RAISE EXCEPTION 'Access denied: not an authorized participant in match' USING ERRCODE = '42501';
    END IF;

    v_winner_id := CASE WHEN v_caller_id = v_match.p1_id THEN v_match.p2_id ELSE v_match.p1_id END;

    INSERT INTO public.forfeit_history (user_id, match_id, forfeited_at)
    VALUES (v_caller_id, p_match_id, pg_catalog.clock_timestamp());

    SELECT pg_catalog.count(*) INTO v_recent_forfeits
    FROM public.forfeit_history
    WHERE user_id = v_caller_id
      AND forfeited_at >= (pg_catalog.clock_timestamp() - INTERVAL '1 hour');

    IF v_recent_forfeits >= 2 THEN
        v_cooldown_until := pg_catalog.clock_timestamp() + INTERVAL '15 minutes';
        UPDATE public.profiles
        SET matchmaking_cooldown_until = v_cooldown_until
        WHERE id = v_caller_id;
    END IF;

    UPDATE public.matches
    SET status = 'forfeited',
        winner_id = v_winner_id,
        updated_at = pg_catalog.clock_timestamp()
    WHERE id = p_match_id;

    UPDATE public.profiles
    SET elo = pg_catalog.greatest(100, pg_catalog.coalesce(elo, 100) + v_loser_delta)
    WHERE id = v_caller_id;

    UPDATE public.profiles
    SET elo = pg_catalog.greatest(100, pg_catalog.coalesce(elo, 100) + v_winner_delta)
    WHERE id = v_winner_id;

    RETURN pg_catalog.jsonb_build_object(
        'status', 'forfeited',
        'match_id', p_match_id,
        'winner_id', v_winner_id,
        'caller_elo_delta', v_loser_delta,
        'cooldown_applied', (v_cooldown_until IS NOT NULL)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 3. submit_answer
CREATE OR REPLACE FUNCTION public.submit_answer(
    p_match_id UUID,
    p_question_id UUID,
    p_answer_index INT
)
RETURNS JSONB AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_match RECORD;
    v_is_p1 BOOLEAN;
    v_now TIMESTAMPTZ := pg_catalog.clock_timestamp();
    v_answers JSONB;
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: authentication token required' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_match FROM public.matches WHERE id = p_match_id FOR UPDATE;
    IF NOT FOUND OR v_match.status != 'active' THEN
        RAISE EXCEPTION 'Match not found or inactive' USING ERRCODE = 'P0002';
    END IF;

    IF v_caller_id = v_match.p1_id THEN
        v_is_p1 := TRUE;
        v_answers := pg_catalog.coalesce(v_match.p1_answers, '[]'::jsonb);
    ELSIF v_caller_id = v_match.p2_id THEN
        v_is_p1 := FALSE;
        v_answers := pg_catalog.coalesce(v_match.p2_answers, '[]'::jsonb);
    ELSE
        RAISE EXCEPTION 'Access denied: not an authorized participant in match' USING ERRCODE = '42501';
    END IF;

    v_answers := v_answers || pg_catalog.jsonb_build_object(
        'question_id', p_question_id,
        'answer_index', p_answer_index,
        'submitted_at', v_now
    );

    IF v_is_p1 THEN
        UPDATE public.matches SET p1_answers = v_answers, updated_at = v_now WHERE id = p_match_id;
    ELSE
        UPDATE public.matches SET p2_answers = v_answers, updated_at = v_now WHERE id = p_match_id;
    END IF;

    RETURN pg_catalog.jsonb_build_object('success', TRUE, 'question_id', p_question_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 4. find_or_create_match
CREATE OR REPLACE FUNCTION public.find_or_create_match()
RETURNS JSONB AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_active_match RECORD;
    v_queued_opponent RECORD;
    v_new_match_id UUID;
    v_caller_profile RECORD;
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: authentication token required' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_caller_profile FROM public.profiles WHERE id = v_caller_id;
    IF v_caller_profile.matchmaking_cooldown_until IS NOT NULL 
       AND v_caller_profile.matchmaking_cooldown_until > pg_catalog.clock_timestamp() THEN
        RAISE EXCEPTION 'Matchmaking cooldown active' USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_active_match FROM public.matches 
    WHERE (p1_id = v_caller_id OR p2_id = v_caller_id) AND status = 'active'
    LIMIT 1;

    IF FOUND THEN
        RETURN pg_catalog.jsonb_build_object('status', 'in_progress', 'match_id', v_active_match.id);
    END IF;

    -- Dequeue opponent atomically
    DELETE FROM public.matchmaking_queue
    WHERE user_id IN (
        SELECT user_id FROM public.matchmaking_queue 
        WHERE user_id <> v_caller_id
        ORDER BY queued_at ASC LIMIT 1
        FOR UPDATE SKIP LOCKED
    )
    RETURNING user_id INTO v_queued_opponent;

    IF v_queued_opponent.user_id IS NOT NULL THEN
        INSERT INTO public.matches (p1_id, p2_id, status, created_at, updated_at)
        VALUES (v_queued_opponent.user_id, v_caller_id, 'active', pg_catalog.clock_timestamp(), pg_catalog.clock_timestamp())
        RETURNING id INTO v_new_match_id;

        RETURN pg_catalog.jsonb_build_object('status', 'matched', 'match_id', v_new_match_id);
    END IF;

    -- Enqueue caller
    INSERT INTO public.matchmaking_queue (user_id, queued_at)
    VALUES (v_caller_id, pg_catalog.clock_timestamp())
    ON CONFLICT (user_id) DO UPDATE SET queued_at = pg_catalog.clock_timestamp();

    RETURN pg_catalog.jsonb_build_object('status', 'queued');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 5. migrate_my_legacy_progress
CREATE OR REPLACE FUNCTION public.migrate_my_legacy_progress(
    p_xp INT,
    p_inventory JSONB,
    p_profession TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_clean_inventory JSONB := '{}'::jsonb;
    v_profile RECORD;
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: authentication token required' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_profile FROM public.profiles WHERE id = v_caller_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile not found' USING ERRCODE = 'P0002';
    END IF;

    -- Whitelist cosmetic properties only
    IF p_inventory IS NOT NULL THEN
        IF p_inventory->>'activeTheme' IS NOT NULL THEN
            v_clean_inventory := jsonb_set(v_clean_inventory, '{activeTheme}', p_inventory->'activeTheme');
        END IF;
    END IF;

    UPDATE public.profiles
    SET xp = pg_catalog.least(15000, pg_catalog.greatest(pg_catalog.coalesce(xp, 0), pg_catalog.coalesce(p_xp, 0))),
        inventory = pg_catalog.coalesce(inventory, '{}'::jsonb) || v_clean_inventory,
        profession = pg_catalog.coalesce(v_profile.profession, p_profession),
        updated_at = pg_catalog.clock_timestamp()
    WHERE id = v_caller_id;

    RETURN pg_catalog.jsonb_build_object('status', 'migrated', 'user_id', v_caller_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Grants & Revokes
REVOKE ALL ON FUNCTION public.claim_daily_flash_draw(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_daily_flash_draw(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.forfeit_match(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.forfeit_match(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.submit_answer(UUID, UUID, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_answer(UUID, UUID, INT) TO authenticated;

REVOKE ALL ON FUNCTION public.find_or_create_match() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_or_create_match() TO authenticated;

REVOKE ALL ON FUNCTION public.migrate_my_legacy_progress(INT, JSONB, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.migrate_my_legacy_progress(INT, JSONB, TEXT) TO authenticated;
