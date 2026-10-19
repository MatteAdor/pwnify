-- =====================================================================
-- Migration: 20261019000003_rate_limiting_and_anti_cheat.sql
-- Description:
-- 1. Atomic PostgreSQL rate limiting table and function (check_and_increment_rate_limit)
-- 2. Sensitive RPC rate-limiting (matchmaking, submit_answer, turn_credentials)
-- 3. Matchmaking cooldown on repeated forfeits (forfeit_history table)
-- 4. Strict auto-forfeit enforcement (auth.uid() is always the forfeiting loser)
-- 5. Opponent inactivity finalizer (finalize_abandoned_match on question deadline timeout)
-- 6. Anomaly soft-flag detection (>= 3 matches with 100% accuracy and avg time < 650ms)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. RPC RATE LIMITS TABLE
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rpc_rate_limits (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action_name TEXT NOT NULL,
    window_start TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
    request_count INT NOT NULL DEFAULT 1,
    PRIMARY KEY (user_id, action_name)
);

CREATE INDEX IF NOT EXISTS idx_rpc_rate_limits_window ON public.rpc_rate_limits(user_id, action_name, window_start);

ALTER TABLE public.rpc_rate_limits ENABLE ROW LEVEL SECURITY;
-- No direct client access
DROP POLICY IF EXISTS "rpc_rate_limits_deny_all" ON public.rpc_rate_limits;
CREATE POLICY "rpc_rate_limits_deny_all" ON public.rpc_rate_limits
    FOR ALL TO authenticated, anon
    USING (false);

-- ---------------------------------------------------------------------
-- 2. ATOMIC RATE LIMIT CHECKER FUNCTION (SECURITY DEFINER)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
    p_user_id UUID,
    p_action TEXT,
    p_max_requests INT,
    p_window_seconds INT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_now TIMESTAMPTZ := pg_catalog.clock_timestamp();
    v_record RECORD;
BEGIN
    SELECT * INTO v_record
    FROM public.rpc_rate_limits
    WHERE user_id = p_user_id AND action_name = p_action
    FOR UPDATE;

    IF v_record.user_id IS NULL THEN
        INSERT INTO public.rpc_rate_limits (user_id, action_name, window_start, request_count)
        VALUES (p_user_id, p_action, v_now, 1)
        ON CONFLICT (user_id, action_name) DO UPDATE
            SET window_start = v_now, request_count = 1;
        RETURN TRUE;
    END IF;

    -- Check if sliding window has elapsed
    IF (v_now - v_record.window_start) > (p_window_seconds * INTERVAL '1 second') THEN
        UPDATE public.rpc_rate_limits
        SET window_start = v_now, request_count = 1
        WHERE user_id = p_user_id AND action_name = p_action;
        RETURN TRUE;
    END IF;

    -- Within window: check quota
    IF v_record.request_count >= p_max_requests THEN
        RETURN FALSE;
    END IF;

    -- Increment counter
    UPDATE public.rpc_rate_limits
    SET request_count = request_count + 1
    WHERE user_id = p_user_id AND action_name = p_action;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- ---------------------------------------------------------------------
-- 3. FORFEIT HISTORY & COOLDOWN TRACKING
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.forfeit_history (
    id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    forfeited_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_forfeit_history_user ON public.forfeit_history(user_id, forfeited_at);

ALTER TABLE public.forfeit_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "forfeit_history_deny_client" ON public.forfeit_history;
CREATE POLICY "forfeit_history_deny_client" ON public.forfeit_history
    FOR ALL TO authenticated, anon
    USING (false);

-- Add matchmaking cooldown column to profiles if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'matchmaking_cooldown_until'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN matchmaking_cooldown_until TIMESTAMPTZ DEFAULT NULL;
    END IF;
END $$;

-- ---------------------------------------------------------------------
-- 4. REVISED FORFEIT MATCH (STRICT AUTO-FORFEIT ONLY)
-- auth.uid() is ALWAYS the loser. Loser: -25 ELO; Winner: +18 ELO.
-- Tracks repeated forfeits (>= 2 in 1 hour -> 15 min cooldown).
-- ---------------------------------------------------------------------
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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- ---------------------------------------------------------------------
-- 5. FINALIZE ABANDONED MATCH (OPPONENT INACTIVITY ON TIMEOUT)
-- If opponent stops answering and deadline + timeout (>= 18s) has passed,
-- the match can be finalized server-side based on submitted answers.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finalize_abandoned_match(p_match_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_match RECORD;
    v_now TIMESTAMPTZ := pg_catalog.clock_timestamp();
    v_elapsed_since_q_start INTERVAL;
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: authentication token required';
    END IF;

    SELECT * INTO v_match
    FROM public.matches
    WHERE id = p_match_id
    FOR UPDATE;

    IF v_match.id IS NULL THEN
        RAISE EXCEPTION 'Match not found: %', p_match_id;
    END IF;

    IF v_match.status != 'active' THEN
        RETURN pg_catalog.jsonb_build_object('status', 'already_completed');
    END IF;

    IF v_caller_id != v_match.p1_id AND v_caller_id != v_match.p2_id THEN
        RAISE EXCEPTION 'Access denied: not an authorized participant in match';
    END IF;

    v_elapsed_since_q_start := v_now - v_match.question_started_at;

    -- Require at least 18 seconds of inactivity on current question (15s + 3s grace)
    IF v_elapsed_since_q_start < INTERVAL '18 seconds' THEN
        RAISE EXCEPTION 'Inactivity timeout not yet reached (elapsed: %)', v_elapsed_since_q_start;
    END IF;

    -- Finalize match idempotently via internal logic
    RETURN public.finalize_match_internal(p_match_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- ---------------------------------------------------------------------
-- 6. ANOMALY DETECTION (SOFT FLAG FOR REVIEW, NO BAN)
-- Evaluates recent matches for 100% accuracy and avg response time < 650ms.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_operator_anomalies(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_recent_matches_count INT;
    v_perfect_matches_count INT;
    v_avg_response_ms NUMERIC;
BEGIN
    -- Check last 3 completed matches
    WITH user_recent_matches AS (
        SELECT m.id, m.created_at
        FROM public.matches m
        WHERE (m.p1_id = p_user_id OR m.p2_id = p_user_id)
          AND m.status = 'completed'
        ORDER BY m.created_at DESC
        LIMIT 3
    ),
    match_stats AS (
        SELECT
            ma.match_id,
            pg_catalog.count(*) AS total_answers,
            pg_catalog.count(*) FILTER (WHERE ma.is_correct = TRUE) AS correct_answers,
            pg_catalog.avg(ma.response_time_ms) AS avg_time
        FROM public.match_answers ma
        JOIN user_recent_matches urm ON urm.id = ma.match_id
        WHERE ma.user_id = p_user_id
        GROUP BY ma.match_id
    )
    SELECT
        pg_catalog.count(*),
        pg_catalog.count(*) FILTER (WHERE total_answers = 5 AND correct_answers = 5),
        pg_catalog.avg(avg_time)
    INTO
        v_recent_matches_count,
        v_perfect_matches_count,
        v_avg_response_ms
    FROM match_stats;

    -- Anomaly condition: >= 3 matches evaluated, all 100% accuracy, avg response time < 650ms
    IF v_recent_matches_count >= 3 AND v_perfect_matches_count = v_recent_matches_count AND v_avg_response_ms < 650 THEN
        UPDATE public.profiles
        SET flagged = TRUE
        WHERE id = p_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- ---------------------------------------------------------------------
-- 7. UPDATE SUBMIT_ANSWER: RATE LIMITING & ANOMALY TRIGGER
-- ---------------------------------------------------------------------
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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- ---------------------------------------------------------------------
-- 8. UPDATE FIND_OR_CREATE_MATCH: RATE LIMITING & COOLDOWN CHECK
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.find_or_create_match()
RETURNS JSONB AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_caller_elo INT;
    v_is_verified BOOLEAN;
    v_cooldown_until TIMESTAMPTZ;
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

    -- 4. Check if already matched
    SELECT q.matched_match_id INTO v_match_id
    FROM public.matchmaking_queue q
    WHERE q.user_id = v_caller_id AND q.matched_match_id IS NOT NULL;

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
    ORDER BY q.queued_at ASC
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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- ---------------------------------------------------------------------
-- 9. PERMISSIONS AUDIT FOR REVISED & NEW FUNCTIONS
-- ---------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.check_and_increment_rate_limit(UUID, TEXT, INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit(UUID, TEXT, INT, INT) TO service_role;

REVOKE ALL ON FUNCTION public.check_operator_anomalies(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_operator_anomalies(UUID) TO service_role;

REVOKE ALL ON FUNCTION public.finalize_abandoned_match(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalize_abandoned_match(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.forfeit_match(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.forfeit_match(UUID) TO authenticated;
