-- =====================================================================
-- ZERODAY PROPOSAL: CORE RPCS ELEVATION TO SECURITY DEFINER
-- Migration: 20261024000007_harden_core_rpcs_security_definer.sql
-- Status: PROPOSAL FILE ONLY (DO NOT APPLY DIRECTLY TO PRODUCTION)
-- =====================================================================
-- Elevates find_or_create_match, submit_answer, forfeit_match, 
-- claim_daily_flash_draw, and migrate_my_legacy_progress to full production
-- SECURITY DEFINER with fixed search_path = '' and fully qualified names.
-- Preserves all ELO matchmaking, question rotation, anti-cheat, and rate limits.
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

    -- Check if draw already exists for today (idempotency)
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

    -- Server-side secret seed (never revealed or passed by client)
    -- In production, retrieved from Supabase Vault or app.settings GUC; strictly fails if unconfigured
    BEGIN
        SELECT decrypted_secret INTO v_server_secret
        FROM vault.decrypted_secrets
        WHERE name = 'daily_flash_secret'
        LIMIT 1;
    EXCEPTION WHEN undefined_table OR invalid_schema_name OR OTHERS THEN
        v_server_secret := NULL;
    END;

    IF v_server_secret IS NULL THEN
        v_server_secret := pg_catalog.nullif(pg_catalog.current_setting('app.settings.daily_flash_secret', true), '');
    END IF;

    IF v_server_secret IS NULL OR pg_catalog.length(v_server_secret) < 16 THEN
        RAISE EXCEPTION 'Daily flash secret configuration is missing or invalid'
            USING ERRCODE = '55000';
    END IF;

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
        user_id, draw_date, is_flash, xp_bonus, claimed_at
    ) VALUES (
        v_user_id, v_today, v_is_flash, v_xp_bonus, v_server_now
    );

    IF v_is_flash AND v_xp_bonus > 0 THEN
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
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '';

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
        RAISE EXCEPTION 'Unauthorized: authentication token required';
    END IF;

    SELECT * INTO v_match
    FROM public.matches
    WHERE id = p_match_id
    FOR UPDATE;

    IF v_match.id IS NULL OR v_match.status != 'active' THEN
        RETURN pg_catalog.jsonb_build_object('status', 'already_ended');
    END IF;

    -- Strict check: caller must be a participant
    IF v_caller_id != v_match.p1_id AND v_caller_id != v_match.p2_id THEN
        RAISE EXCEPTION 'Access denied: not an authorized participant in match';
    END IF;

    -- Strict auto-forfeit: Caller is ALWAYS the loser
    v_winner_id := CASE WHEN v_caller_id = v_match.p1_id THEN v_match.p2_id ELSE v_match.p1_id END;

    -- Log forfeit in history
    INSERT INTO public.forfeit_history (user_id, match_id, forfeited_at)
    VALUES (v_caller_id, p_match_id, pg_catalog.clock_timestamp());

    -- Check for repeated forfeits: >= 2 in last 1 hour
    SELECT pg_catalog.count(*) INTO v_recent_forfeits
    FROM public.forfeit_history
    WHERE user_id = v_caller_id
      AND forfeited_at > (pg_catalog.clock_timestamp() - INTERVAL '1 hour');

    IF v_recent_forfeits >= 2 THEN
        v_cooldown_until := pg_catalog.clock_timestamp() + INTERVAL '15 minutes';
    END IF;

    -- Apply penalty to forfeiting caller
    UPDATE public.profiles
    SET elo = GREATEST(100, elo + v_loser_delta),
        rank = public.get_tier_from_elo(GREATEST(100, elo + v_loser_delta)),
        last_ranked_at = pg_catalog.clock_timestamp(),
        matchmaking_cooldown_until = COALESCE(v_cooldown_until, matchmaking_cooldown_until),
        updated_at = pg_catalog.clock_timestamp()
    WHERE id = v_caller_id;

    -- Award winner
    UPDATE public.profiles
    SET elo = elo + v_winner_delta,
        rank = public.get_tier_from_elo(elo + v_winner_delta),
        last_ranked_at = pg_catalog.clock_timestamp(),
        updated_at = pg_catalog.clock_timestamp()
    WHERE id = v_winner_id;

    -- Mark match as forfeited
    UPDATE public.matches
    SET status = 'forfeited',
        winner_id = v_winner_id,
        elo_delta_p1 = CASE WHEN v_caller_id = v_match.p1_id THEN v_loser_delta ELSE v_winner_delta END,
        elo_delta_p2 = CASE WHEN v_caller_id = v_match.p2_id THEN v_loser_delta ELSE v_winner_delta END,
        ended_at = pg_catalog.clock_timestamp()
    WHERE id = p_match_id;

    RETURN pg_catalog.jsonb_build_object(
        'status', 'forfeited',
        'winner_id', v_winner_id,
        'loser_id', v_caller_id,
        'cooldown_active', (v_cooldown_until IS NOT NULL)
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
    v_correct_idx INT;
    v_now TIMESTAMPTZ := pg_catalog.clock_timestamp();
    v_elapsed_ms INT;
    v_is_correct BOOLEAN := FALSE;
    v_answers_count INT;
    v_both_answered BOOLEAN := FALSE;
    v_deadline_ms INT := 17500; -- 15,000ms + 2,500ms network transit grace
    v_rate_allowed BOOLEAN;
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: authentication token required';
    END IF;

    -- Rate Limit: Max 20 submit_answer requests per 1 minute (60s)
    v_rate_allowed := public.check_and_increment_rate_limit(v_caller_id, 'submit_answer', 20, 60);
    IF NOT v_rate_allowed THEN
        RAISE EXCEPTION 'Rate limit exceeded: too many answer submissions. Slow down.';
    END IF;

    -- 1. Lock and validate match row
    SELECT * INTO v_match
    FROM public.matches
    WHERE id = p_match_id
    FOR UPDATE;

    IF v_match.id IS NULL THEN
        RAISE EXCEPTION 'Match not found: %', p_match_id;
    END IF;

    IF v_match.status != 'active' THEN
        RAISE EXCEPTION 'Match is no longer active (status: %)', v_match.status;
    END IF;

    IF v_caller_id != v_match.p1_id AND v_caller_id != v_match.p2_id THEN
        RAISE EXCEPTION 'Access denied: not an authorized participant in match';
    END IF;

    -- 2. Reject duplicate answer for this question
    IF EXISTS (
        SELECT 1 FROM public.match_answers
        WHERE match_id = p_match_id AND user_id = v_caller_id AND question_id = p_question_id
    ) THEN
        RAISE EXCEPTION 'Answer already submitted for question % in match %', p_question_id, p_match_id;
    END IF;

    -- 3. Calculate authoritative elapsed time
    v_elapsed_ms := GREATEST(0, (pg_catalog.date_part('epoch', (v_now - v_match.question_started_at)) * 1000)::INT);

    -- 4. Anti-Cheat: Soft flag sub-human reaction (< 350ms)
    IF v_elapsed_ms < 350 THEN
        UPDATE public.profiles
        SET flagged = TRUE
        WHERE id = v_caller_id;
    END IF;

    -- 5. Validate answer against hidden server table
    SELECT q.correct_index INTO v_correct_idx
    FROM public.questions q
    WHERE q.id = p_question_id;

    IF v_correct_idx IS NULL THEN
        RAISE EXCEPTION 'Question % not found in database', p_question_id;
    END IF;

    -- Correct ONLY if submitted within deadline
    IF v_elapsed_ms <= v_deadline_ms AND p_answer_index = v_correct_idx THEN
        v_is_correct := TRUE;
    END IF;

    -- 6. Insert audit record (Append-only)
    INSERT INTO public.match_answers (
        match_id, user_id, question_id, answer_index, is_correct, response_time_ms, server_ts
    ) VALUES (
        p_match_id, v_caller_id, p_question_id, p_answer_index, v_is_correct, v_elapsed_ms, v_now
    );

    -- 7. Update match score
    IF v_is_correct THEN
        IF v_caller_id = v_match.p1_id THEN
            UPDATE public.matches SET p1_score = p1_score + 1 WHERE id = p_match_id;
        ELSE
            UPDATE public.matches SET p2_score = p2_score + 1 WHERE id = p_match_id;
        END IF;
    END IF;

    -- 8. Check if both participants answered current question
    SELECT pg_catalog.count(*) INTO v_answers_count
    FROM public.match_answers
    WHERE match_id = p_match_id AND question_id = p_question_id;

    IF v_answers_count >= 2 THEN
        v_both_answered := TRUE;
        IF v_match.current_question_index + 1 < 5 THEN
            UPDATE public.matches
            SET current_question_index = current_question_index + 1,
                question_started_at = pg_catalog.clock_timestamp()
            WHERE id = p_match_id;
        ELSE
            PERFORM public.finalize_match_internal(p_match_id);
            PERFORM public.check_operator_anomalies(v_match.p1_id);
            PERFORM public.check_operator_anomalies(v_match.p2_id);
        END IF;
    END IF;

    RETURN pg_catalog.jsonb_build_object(
        'is_correct', v_is_correct,
        'elapsed_ms', v_elapsed_ms,
        'both_answered', v_both_answered,
        'question_index', v_match.current_question_index
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 4. find_or_create_match
CREATE OR REPLACE FUNCTION public.find_or_create_match()
RETURNS JSONB AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_caller_elo INT;
    v_is_verified BOOLEAN;
    v_cooldown_until TIMESTAMPTZ;
    v_my_queued_at TIMESTAMPTZ;
    v_opponent RECORD;
    v_match_id UUID;
    v_q_ids JSONB;
    v_recent_duels_count INT;
    v_window INT := 100;
    v_rate_allowed BOOLEAN;
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: authentication token required';
    END IF;

    -- 1. Rate Limit: Max 12 matchmaking requests per 1 minute (60s)
    v_rate_allowed := public.check_and_increment_rate_limit(v_caller_id, 'matchmaking', 12, 60);
    IF NOT v_rate_allowed THEN
        RAISE EXCEPTION 'Rate limit exceeded: too many matchmaking requests. Please wait a moment.';
    END IF;

    -- 2. Verified email check
    SELECT (u.email_confirmed_at IS NOT NULL) INTO v_is_verified
    FROM auth.users u
    WHERE u.id = v_caller_id;

    IF v_is_verified IS NOT TRUE THEN
        RAISE EXCEPTION 'Verification Required: Ranked duels require a confirmed email address.';
    END IF;

    -- 3. Matchmaking Cooldown Check
    SELECT p.elo, p.matchmaking_cooldown_until INTO v_caller_elo, v_cooldown_until
    FROM public.profiles p
    WHERE p.id = v_caller_id;

    IF v_caller_elo IS NULL THEN
        RAISE EXCEPTION 'Profile not initialized for operator';
    END IF;

    IF v_cooldown_until IS NOT NULL AND v_cooldown_until > pg_catalog.clock_timestamp() THEN
        RAISE EXCEPTION 'Matchmaking Cooldown Active: Operator cooldown until % due to repeated forfeits.', v_cooldown_until;
    END IF;

    -- 4. Check if already queued or matched
    SELECT q.matched_match_id, q.queued_at INTO v_match_id, v_my_queued_at
    FROM public.matchmaking_queue q
    WHERE q.user_id = v_caller_id;

    IF v_match_id IS NOT NULL THEN
        DELETE FROM public.matchmaking_queue WHERE user_id = v_caller_id;
        RETURN pg_catalog.jsonb_build_object('status', 'matched', 'match_id', v_match_id);
    END IF;

    -- 5. Search opponent with FOR UPDATE SKIP LOCKED
    SELECT q.user_id, q.elo INTO v_opponent
    FROM public.matchmaking_queue q
    WHERE q.user_id != v_caller_id 
      AND q.matched_match_id IS NULL
      AND pg_catalog.abs(q.elo - v_caller_elo) <= v_window
      AND (
          v_my_queued_at IS NULL 
          OR q.queued_at < v_my_queued_at 
          OR (q.queued_at = v_my_queued_at AND q.user_id < v_caller_id)
      )
    ORDER BY q.queued_at ASC, q.user_id ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_opponent.user_id IS NOT NULL THEN
        -- Anti-Farming check: Max 3 matches between same pair in 24 hours
        SELECT pg_catalog.count(*) INTO v_recent_duels_count
        FROM public.matches m
        WHERE ((m.p1_id = v_caller_id AND m.p2_id = v_opponent.user_id) OR (m.p1_id = v_opponent.user_id AND m.p2_id = v_caller_id))
          AND m.created_at > (pg_catalog.now() - INTERVAL '24 hours');

        IF v_recent_duels_count >= 3 THEN
            INSERT INTO public.matchmaking_queue (user_id, elo, queued_at)
            VALUES (v_caller_id, v_caller_elo, pg_catalog.clock_timestamp())
            ON CONFLICT (user_id) DO UPDATE SET elo = v_caller_elo, queued_at = pg_catalog.clock_timestamp();

            RETURN pg_catalog.jsonb_build_object('status', 'queued', 'message', 'Anti-farming active: pairing skipped with recent opponent');
        END IF;

        -- Question Rotation: Select 5 questions avoiding questions seen by either player in their last 5 matches
        WITH recent_matches AS (
            SELECT rm.question_ids
            FROM public.matches rm
            WHERE (rm.p1_id IN (v_opponent.user_id, v_caller_id) OR rm.p2_id IN (v_opponent.user_id, v_caller_id))
            ORDER BY rm.created_at DESC
            LIMIT 5
        ),
        seen_questions AS (
            SELECT DISTINCT (pg_catalog.jsonb_array_elements_text(rm.question_ids))::UUID AS qid
            FROM recent_matches rm
        ),
        unseen_pool AS (
            SELECT q.id
            FROM public.questions q
            WHERE q.id NOT IN (SELECT sq.qid FROM seen_questions sq)
            ORDER BY pg_catalog.random()
            LIMIT 5
        ),
        fallback_pool AS (
            SELECT qf.id
            FROM public.questions qf
            WHERE qf.id NOT IN (SELECT up.id FROM unseen_pool up)
            ORDER BY pg_catalog.random()
            LIMIT 5
        ),
        final_selection AS (
            SELECT id FROM unseen_pool
            UNION ALL
            SELECT id FROM fallback_pool
            LIMIT 5
        )
        SELECT pg_catalog.jsonb_agg(fs.id) INTO v_q_ids
        FROM final_selection fs;

        -- Create match
        INSERT INTO public.matches (p1_id, p2_id, question_ids, question_started_at, status)
        VALUES (v_opponent.user_id, v_caller_id, v_q_ids, pg_catalog.clock_timestamp(), 'active')
        RETURNING id INTO v_match_id;

        -- Mark opponent in queue
        UPDATE public.matchmaking_queue
        SET matched_match_id = v_match_id
        WHERE user_id = v_opponent.user_id;

        -- Remove caller from queue
        DELETE FROM public.matchmaking_queue WHERE user_id = v_caller_id;

        RETURN pg_catalog.jsonb_build_object('status', 'matched', 'match_id', v_match_id);
    ELSE
        INSERT INTO public.matchmaking_queue (user_id, elo, queued_at)
        VALUES (v_caller_id, v_caller_elo, pg_catalog.clock_timestamp())
        ON CONFLICT (user_id) DO UPDATE SET elo = v_caller_elo, queued_at = pg_catalog.clock_timestamp();

        RETURN pg_catalog.jsonb_build_object('status', 'queued', 'message', 'Searching opponent in ELO bracket...');
    END IF;
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
    v_theme TEXT;
    v_title TEXT;
    v_badge_elem RECORD;
    v_clean_badges JSONB := '[]'::jsonb;
    v_badge_count INT := 0;
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: authentication token required';
    END IF;

    -- 1. JSONB size limit check (Max 4KB / 4096 bytes)
    IF p_inventory IS NOT NULL AND pg_catalog.octet_length(p_inventory::text) > 4096 THEN
        RAISE EXCEPTION 'Payload too large: cosmetic inventory exceeds 4KB limit';
    END IF;

    -- 2. Validate and whitelist cosmetic properties; discard all unknown keys
    IF p_inventory IS NOT NULL THEN
        -- Whitelist activeTheme
        v_theme := p_inventory->>'activeTheme';
        IF v_theme IS NOT NULL AND v_theme IN (
            'matrix-green', 'cyberpunk-neon', 'terminal-amber', 
            'stealth-gray', 'arctic-ice', 'solar-flare', 'blood-red'
        ) THEN
            v_clean_inventory := v_clean_inventory || pg_catalog.jsonb_build_object('activeTheme', v_theme);
        END IF;

        -- Whitelist customTitle (sanitized, max 40 chars, safe characters)
        v_title := pg_catalog.substr(TRIM(p_inventory->>'customTitle'), 1, 40);
        IF v_title IS NOT NULL AND v_title ~ '^[a-zA-Z0-9 _\-\[\]\(\)]+$' THEN
            v_clean_inventory := v_clean_inventory || pg_catalog.jsonb_build_object('customTitle', v_title);
        END IF;

        -- Whitelist unlockedBadges (array of valid string IDs)
        IF pg_catalog.jsonb_typeof(p_inventory->'unlockedBadges') = 'array' THEN
            FOR v_badge_elem IN 
                SELECT value::text AS badge_id
                FROM pg_catalog.jsonb_array_elements_text(p_inventory->'unlockedBadges')
            LOOP
                IF v_badge_count < 50 AND v_badge_elem.badge_id ~ '^[a-zA-Z0-9_\-]{2,40}$' THEN
                    v_clean_badges := v_clean_badges || pg_catalog.to_jsonb(v_badge_elem.badge_id);
                    v_badge_count := v_badge_count + 1;
                END IF;
            END LOOP;
            IF v_badge_count > 0 THEN
                v_clean_inventory := v_clean_inventory || pg_catalog.jsonb_build_object('unlockedBadges', v_clean_badges);
            END IF;
        END IF;
    END IF;

    -- Calls hardened internal function with cleaned inventory, strict 15,000 XP cap and one-shot enforcement
    RETURN public.import_legacy_progress(v_caller_id, p_xp, v_clean_inventory, p_profession);
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
