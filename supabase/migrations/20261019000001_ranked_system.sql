-- =====================================================================
-- ZERODAY RANKED SYSTEM — DATABASE MIGRATION (AUDITED)
-- Migration: 20261019000001_ranked_system.sql
-- Server-authoritative 1v1 PvP, RLS Isolation, Search-Path Hardening
-- =====================================================================

-- Enable cryptographic extensions in public or extensions schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. PROFILES TABLE
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nick TEXT NOT NULL UNIQUE,
    elo INT NOT NULL DEFAULT 1000 CHECK (elo >= 100 AND elo <= 3500),
    rank TEXT NOT NULL DEFAULT 'Bronze Recruit',
    xp INT NOT NULL DEFAULT 0 CHECK (xp >= 0),
    inventory JSONB NOT NULL DEFAULT '{}'::jsonb,
    profession TEXT DEFAULT 'Cyber Warfare Operator',
    flagged BOOLEAN NOT NULL DEFAULT FALSE,
    legacy_imported BOOLEAN NOT NULL DEFAULT FALSE,
    last_ranked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_elo ON public.profiles(elo);
CREATE INDEX IF NOT EXISTS idx_profiles_flagged ON public.profiles(flagged);

-- ---------------------------------------------------------------------
-- 2. QUESTIONS TABLE (SERVER-SIDE ONLY)
-- Strict zero-knowledge: correct_index is never accessible via PostgREST SELECT
-- Seeded externally via admin import script (not in versioned migration repo)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
    category TEXT NOT NULL,
    question TEXT NOT NULL,
    code_snippet TEXT,
    options JSONB NOT NULL, -- Array of 4 text options
    correct_index INT NOT NULL CHECK (correct_index >= 0 AND correct_index <= 3),
    difficulty TEXT NOT NULL DEFAULT 'medium',
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

CREATE INDEX IF NOT EXISTS idx_questions_category ON public.questions(category);

-- ---------------------------------------------------------------------
-- 3. MATCHES TABLE
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
    p1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    p2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'forfeited')),
    question_ids JSONB NOT NULL, -- 5 question UUIDs
    current_question_index INT NOT NULL DEFAULT 0 CHECK (current_question_index >= 0 AND current_question_index <= 5),
    question_started_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
    p1_score INT NOT NULL DEFAULT 0 CHECK (p1_score >= 0 AND p1_score <= 5),
    p2_score INT NOT NULL DEFAULT 0 CHECK (p2_score >= 0 AND p2_score <= 5),
    winner_id UUID REFERENCES public.profiles(id),
    elo_delta_p1 INT,
    elo_delta_p2 INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_matches_participants ON public.matches(p1_id, p2_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);

-- ---------------------------------------------------------------------
-- 4. MATCH_ANSWERS TABLE (APPEND-ONLY AUDIT LOG)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.match_answers (
    id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    answer_index INT NOT NULL CHECK (answer_index >= 0 AND answer_index <= 3),
    is_correct BOOLEAN NOT NULL,
    response_time_ms INT NOT NULL CHECK (response_time_ms >= 0),
    server_ts TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
    CONSTRAINT uq_match_user_question UNIQUE (match_id, user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_match_answers_match ON public.match_answers(match_id);

-- ---------------------------------------------------------------------
-- 5. MATCHMAKING_QUEUE TABLE
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.matchmaking_queue (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    elo INT NOT NULL,
    queued_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
    matched_match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_elo ON public.matchmaking_queue(elo);

-- =====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matchmaking_queue ENABLE ROW LEVEL SECURITY;

-- 1. Profiles RLS: Public read, no client write
DROP POLICY IF EXISTS "profiles_read_all" ON public.profiles;
CREATE POLICY "profiles_read_all" ON public.profiles
    FOR SELECT TO authenticated, anon
    USING (true);

-- 2. Questions RLS: ZERO POLICIES for anon or authenticated
-- PostgREST SELECT is denied outright by default RLS deny-all rule.
-- Data access occurs exclusively through get_match_questions() RPC.

-- 3. Matches RLS: Only participants can select
DROP POLICY IF EXISTS "matches_read_participants" ON public.matches;
CREATE POLICY "matches_read_participants" ON public.matches
    FOR SELECT TO authenticated
    USING (auth.uid() = p1_id OR auth.uid() = p2_id);

-- 4. Match Answers RLS: Append-only read for participants, zero client write
DROP POLICY IF EXISTS "answers_read_participants" ON public.match_answers;
CREATE POLICY "answers_read_participants" ON public.match_answers
    FOR SELECT TO authenticated
    USING (auth.uid() IN (
        SELECT m.p1_id FROM public.matches m WHERE m.id = match_id
        UNION
        SELECT m.p2_id FROM public.matches m WHERE m.id = match_id
    ));

-- 5. Matchmaking Queue RLS: Only self
DROP POLICY IF EXISTS "queue_read_self" ON public.matchmaking_queue;
CREATE POLICY "queue_read_self" ON public.matchmaking_queue
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "queue_delete_self" ON public.matchmaking_queue;
CREATE POLICY "queue_delete_self" ON public.matchmaking_queue
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- =====================================================================
-- FUNCTIONS & RPCs (AUDITED: SET search_path = '')
-- All object and function calls are strictly fully qualified
-- =====================================================================

-- Helper: Rank tier calculation
CREATE OR REPLACE FUNCTION public.get_tier_from_elo(p_elo INT)
RETURNS TEXT AS $$
BEGIN
    IF p_elo >= 2400 THEN RETURN 'Cyber Warlord';
    ELSIF p_elo >= 2200 THEN RETURN 'Grandmaster Elite';
    ELSIF p_elo >= 2000 THEN RETURN 'Diamond Vanguard';
    ELSIF p_elo >= 1800 THEN RETURN 'Platinum Specialist';
    ELSIF p_elo >= 1500 THEN RETURN 'Gold Specialist';
    ELSIF p_elo >= 1200 THEN RETURN 'Silver Operative';
    ELSE RETURN 'Bronze Recruit';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE
SET search_path = '';

-- Trigger: provision profile on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_raw_nick TEXT;
    v_final_nick TEXT;
    v_counter INT := 1;
BEGIN
    v_raw_nick := COALESCE(
        NEW.raw_user_meta_data->>'nick',
        NEW.raw_user_meta_data->>'customUsername',
        pg_catalog.split_part(NEW.email, '@', 1)
    );
    v_raw_nick := pg_catalog.regexp_replace(v_raw_nick, '[^a-zA-Z0-9_]', '_', 'g');
    IF pg_catalog.length(v_raw_nick) < 3 THEN
        v_raw_nick := 'Operator_' || pg_catalog.substr(pg_catalog.md5(pg_catalog.random()::text), 1, 6);
    END IF;

    v_final_nick := v_raw_nick;
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE nick = v_final_nick) LOOP
        v_final_nick := v_raw_nick || '_' || v_counter;
        v_counter := v_counter + 1;
    END LOOP;

    INSERT INTO public.profiles (id, nick, elo, rank, xp, created_at, updated_at)
    VALUES (NEW.id, v_final_nick, 1000, 'Bronze Recruit', 0, pg_catalog.now(), pg_catalog.now());

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------
-- RPC 1: GET MATCH QUESTIONS (Zero-Knowledge)
-- Returns 5 questions without ever revealing correct_index
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_match_questions(p_match_id UUID)
RETURNS TABLE (
    id UUID,
    category TEXT,
    question TEXT,
    code_snippet TEXT,
    options JSONB,
    question_order INT
) AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_question_ids JSONB;
BEGIN
    SELECT m.question_ids INTO v_question_ids
    FROM public.matches m
    WHERE m.id = p_match_id AND (m.p1_id = v_caller_id OR m.p2_id = v_caller_id);

    IF v_question_ids IS NULL THEN
        RAISE EXCEPTION 'Access denied: not an authorized participant in match %', p_match_id;
    END IF;

    RETURN QUERY
    WITH ord AS (
        SELECT value::text::uuid AS qid, ordinality::int AS q_order
        FROM pg_catalog.jsonb_array_elements_text(v_question_ids) WITH ORDINALITY
    )
    SELECT q.id, q.category, q.question, q.code_snippet, q.options, ord.q_order
    FROM public.questions q
    JOIN ord ON ord.qid = q.id
    ORDER BY ord.q_order ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- ---------------------------------------------------------------------
-- RPC 2: MATCHMAKING (FOR UPDATE SKIP LOCKED)
-- Requires verified email; enforces anti-farming and question rotation
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.find_or_create_match()
RETURNS JSONB AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_caller_elo INT;
    v_is_verified BOOLEAN;
    v_opponent RECORD;
    v_match_id UUID;
    v_q_ids JSONB;
    v_recent_duels_count INT;
    v_window INT := 100;
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: authentication token required';
    END IF;

    SELECT (u.email_confirmed_at IS NOT NULL) INTO v_is_verified
    FROM auth.users u
    WHERE u.id = v_caller_id;

    IF v_is_verified IS NOT TRUE THEN
        RAISE EXCEPTION 'Verification Required: Ranked duels require a confirmed email address.';
    END IF;

    SELECT p.elo INTO v_caller_elo
    FROM public.profiles p
    WHERE p.id = v_caller_id;

    IF v_caller_elo IS NULL THEN
        RAISE EXCEPTION 'Profile not initialized for operator';
    END IF;

    -- Check if already matched
    SELECT q.matched_match_id INTO v_match_id
    FROM public.matchmaking_queue q
    WHERE q.user_id = v_caller_id AND q.matched_match_id IS NOT NULL;

    IF v_match_id IS NOT NULL THEN
        DELETE FROM public.matchmaking_queue WHERE user_id = v_caller_id;
        RETURN pg_catalog.jsonb_build_object('status', 'matched', 'match_id', v_match_id);
    END IF;

    -- Search opponent with FOR UPDATE SKIP LOCKED
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
-- RPC 3: POLL MATCHMAKING QUEUE
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.poll_matchmaking()
RETURNS JSONB AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_matched_id UUID;
BEGIN
    SELECT q.matched_match_id INTO v_matched_id
    FROM public.matchmaking_queue q
    WHERE q.user_id = v_caller_id;

    IF v_matched_id IS NOT NULL THEN
        DELETE FROM public.matchmaking_queue WHERE user_id = v_caller_id;
        RETURN pg_catalog.jsonb_build_object('status', 'matched', 'match_id', v_matched_id);
    END IF;

    RETURN pg_catalog.jsonb_build_object('status', 'waiting');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- ---------------------------------------------------------------------
-- RPC 4: SUBMIT ANSWER (SERVER-AUTHORITATIVE TIMING & SCORING)
-- Deadline = question_started_at + 15s + 2.5s grace. Soft flag < 350ms.
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
BEGIN
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
-- INTERNAL HELPER: FINALIZE MATCH (IDEMPOTENT WITH ROW LOCK)
-- Handles Normal Outcome, Ties, and Double-Timeout (0-0 AFK)
-- Not exposed to client roles.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finalize_match_internal(p_match_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_match RECORD;
    v_p1_elo INT;
    v_p2_elo INT;
    v_k CONSTANT NUMERIC := 32.0;
    v_e1 NUMERIC;
    v_e2 NUMERIC;
    v_s1 NUMERIC;
    v_s2 NUMERIC;
    v_delta1 INT := 0;
    v_delta2 INT := 0;
    v_xp1 INT := 0;
    v_xp2 INT := 0;
    v_winner UUID := NULL;
    v_p1_final_score INT;
    v_p2_final_score INT;
BEGIN
    SELECT * INTO v_match
    FROM public.matches
    WHERE id = p_match_id
    FOR UPDATE;

    IF v_match.id IS NULL THEN
        RAISE EXCEPTION 'Match not found: %', p_match_id;
    END IF;

    -- Idempotency check: if match is already completed, return immediately
    IF v_match.status = 'completed' THEN
        RETURN pg_catalog.jsonb_build_object(
            'status', 'already_completed',
            'winner_id', v_match.winner_id,
            'p1_delta', v_match.elo_delta_p1,
            'p2_delta', v_match.elo_delta_p2
        );
    END IF;

    -- Compute scores strictly from append-only match_answers
    SELECT pg_catalog.count(*) INTO v_p1_final_score
    FROM public.match_answers
    WHERE match_id = p_match_id AND user_id = v_match.p1_id AND is_correct = TRUE;

    SELECT pg_catalog.count(*) INTO v_p2_final_score
    FROM public.match_answers
    WHERE match_id = p_match_id AND user_id = v_match.p2_id AND is_correct = TRUE;

    -- Fetch current ELOs
    SELECT p.elo INTO v_p1_elo FROM public.profiles p WHERE p.id = v_match.p1_id FOR UPDATE;
    SELECT p.elo INTO v_p2_elo FROM public.profiles p WHERE p.id = v_match.p2_id FOR UPDATE;

    -- Case 1: Double Timeout / Double Inactivity (0 - 0)
    IF v_p1_final_score = 0 AND v_p2_final_score = 0 THEN
        v_winner := NULL;
        v_delta1 := 0;
        v_delta2 := 0;
        v_xp1 := 0;
        v_xp2 := 0;
    -- Case 2: P1 Wins
    ELSIF v_p1_final_score > v_p2_final_score THEN
        v_winner := v_match.p1_id;
        v_s1 := 1.0;
        v_s2 := 0.0;
        v_e1 := 1.0 / (1.0 + pg_catalog.power(10.0, (v_p2_elo - v_p1_elo)::NUMERIC / 400.0));
        v_e2 := 1.0 / (1.0 + pg_catalog.power(10.0, (v_p1_elo - v_p2_elo)::NUMERIC / 400.0));
        v_delta1 := pg_catalog.round(v_k * (v_s1 - v_e1))::INT;
        v_delta2 := pg_catalog.round(v_k * (v_s2 - v_e2))::INT;
        v_xp1 := (v_p1_final_score * 40) + 100;
        v_xp2 := (v_p2_final_score * 40) + 20;
    -- Case 3: P2 Wins
    ELSIF v_p2_final_score > v_p1_final_score THEN
        v_winner := v_match.p2_id;
        v_s1 := 0.0;
        v_s2 := 1.0;
        v_e1 := 1.0 / (1.0 + pg_catalog.power(10.0, (v_p2_elo - v_p1_elo)::NUMERIC / 400.0));
        v_e2 := 1.0 / (1.0 + pg_catalog.power(10.0, (v_p1_elo - v_p2_elo)::NUMERIC / 400.0));
        v_delta1 := pg_catalog.round(v_k * (v_s1 - v_e1))::INT;
        v_delta2 := pg_catalog.round(v_k * (v_s2 - v_e2))::INT;
        v_xp1 := (v_p1_final_score * 40) + 20;
        v_xp2 := (v_p2_final_score * 40) + 100;
    -- Case 4: Tie with points scored (> 0)
    ELSE
        v_winner := NULL;
        v_s1 := 0.5;
        v_s2 := 0.5;
        v_e1 := 1.0 / (1.0 + pg_catalog.power(10.0, (v_p2_elo - v_p1_elo)::NUMERIC / 400.0));
        v_e2 := 1.0 / (1.0 + pg_catalog.power(10.0, (v_p1_elo - v_p2_elo)::NUMERIC / 400.0));
        v_delta1 := pg_catalog.round(v_k * (v_s1 - v_e1))::INT;
        v_delta2 := pg_catalog.round(v_k * (v_s2 - v_e2))::INT;
        v_xp1 := (v_p1_final_score * 40) + 40;
        v_xp2 := (v_p2_final_score * 40) + 40;
    END IF;

    -- Apply atomic profile updates (min ELO clamped to 100)
    UPDATE public.profiles
    SET elo = GREATEST(100, elo + v_delta1),
        rank = public.get_tier_from_elo(GREATEST(100, elo + v_delta1)),
        xp = xp + v_xp1,
        last_ranked_at = pg_catalog.clock_timestamp(),
        updated_at = pg_catalog.clock_timestamp()
    WHERE id = v_match.p1_id;

    UPDATE public.profiles
    SET elo = GREATEST(100, elo + v_delta2),
        rank = public.get_tier_from_elo(GREATEST(100, elo + v_delta2)),
        xp = xp + v_xp2,
        last_ranked_at = pg_catalog.clock_timestamp(),
        updated_at = pg_catalog.clock_timestamp()
    WHERE id = v_match.p2_id;

    -- Mark match completed
    UPDATE public.matches
    SET status = 'completed',
        p1_score = v_p1_final_score,
        p2_score = v_p2_final_score,
        winner_id = v_winner,
        elo_delta_p1 = v_delta1,
        elo_delta_p2 = v_delta2,
        ended_at = pg_catalog.clock_timestamp()
    WHERE id = p_match_id;

    RETURN pg_catalog.jsonb_build_object(
        'status', 'completed',
        'winner_id', v_winner,
        'p1_score', v_p1_final_score,
        'p2_score', v_p2_final_score,
        'p1_delta', v_delta1,
        'p2_delta', v_delta2
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- ---------------------------------------------------------------------
-- RPC 5: FINALIZE MATCH (AUTHENTICATED PARTICIPANT WRAPPER)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finalize_match(p_match_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_match RECORD;
BEGIN
    SELECT m.p1_id, m.p2_id INTO v_match
    FROM public.matches m
    WHERE m.id = p_match_id;

    IF v_match.p1_id IS NULL THEN
        RAISE EXCEPTION 'Match not found';
    END IF;

    IF v_caller_id != v_match.p1_id AND v_caller_id != v_match.p2_id THEN
        RAISE EXCEPTION 'Access denied: not an authorized participant in match';
    END IF;

    RETURN public.finalize_match_internal(p_match_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- ---------------------------------------------------------------------
-- RPC 6: FORFEIT MATCH (PENALTY -25 ELO)
-- Only callable by participating operator
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.forfeit_match(p_match_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_match RECORD;
    v_winner_id UUID;
    v_loser_delta CONSTANT INT := -25;
    v_winner_delta CONSTANT INT := 18;
BEGIN
    SELECT * INTO v_match
    FROM public.matches
    WHERE id = p_match_id
    FOR UPDATE;

    IF v_match.id IS NULL OR v_match.status != 'active' THEN
        RETURN pg_catalog.jsonb_build_object('status', 'already_ended');
    END IF;

    IF v_caller_id != v_match.p1_id AND v_caller_id != v_match.p2_id THEN
        RAISE EXCEPTION 'Access denied: not an authorized participant in match';
    END IF;

    v_winner_id := CASE WHEN v_caller_id = v_match.p1_id THEN v_match.p2_id ELSE v_match.p1_id END;

    -- Apply fixed forfeit penalty to leaver, award winner
    UPDATE public.profiles
    SET elo = GREATEST(100, elo + v_loser_delta),
        rank = public.get_tier_from_elo(GREATEST(100, elo + v_loser_delta)),
        last_ranked_at = pg_catalog.clock_timestamp(),
        updated_at = pg_catalog.clock_timestamp()
    WHERE id = v_caller_id;

    UPDATE public.profiles
    SET elo = elo + v_winner_delta,
        rank = public.get_tier_from_elo(elo + v_winner_delta),
        last_ranked_at = pg_catalog.clock_timestamp(),
        updated_at = pg_catalog.clock_timestamp()
    WHERE id = v_winner_id;

    UPDATE public.matches
    SET status = 'forfeited',
        winner_id = v_winner_id,
        elo_delta_p1 = CASE WHEN v_caller_id = v_match.p1_id THEN v_loser_delta ELSE v_winner_delta END,
        elo_delta_p2 = CASE WHEN v_caller_id = v_match.p2_id THEN v_loser_delta ELSE v_winner_delta END,
        ended_at = pg_catalog.clock_timestamp()
    WHERE id = p_match_id;

    RETURN pg_catalog.jsonb_build_object('status', 'forfeited', 'winner_id', v_winner_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- ---------------------------------------------------------------------
-- RPC 7: IMPORT LEGACY PROGRESS (ONE-SHOT MIGRATION, XP CAPPED AT 15K)
-- Restricted execution: REVOKED from client, called exclusively by backend migration worker
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.import_legacy_progress(
    p_user_id UUID,
    p_xp INT,
    p_inventory JSONB,
    p_profession TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_capped_xp INT;
    v_clean_profession TEXT;
    v_already_imported BOOLEAN;
BEGIN
    SELECT p.legacy_imported INTO v_already_imported
    FROM public.profiles p
    WHERE p.id = p_user_id;

    IF v_already_imported IS TRUE THEN
        RAISE EXCEPTION 'Legacy progress already imported for operator %', p_user_id;
    END IF;

    -- Hard cap XP to max 15,000 XP; no license or ELO imported
    v_capped_xp := LEAST(GREATEST(COALESCE(p_xp, 0), 0), 15000);
    v_clean_profession := pg_catalog.substr(COALESCE(p_profession, 'Cyber Warfare Operator'), 1, 40);

    UPDATE public.profiles
    SET xp = GREATEST(xp, v_capped_xp),
        inventory = COALESCE(inventory, '{}'::jsonb) || COALESCE(p_inventory, '{}'::jsonb),
        profession = v_clean_profession,
        legacy_imported = TRUE,
        updated_at = pg_catalog.clock_timestamp()
    WHERE id = p_user_id;

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'imported_xp', v_capped_xp,
        'elo', 1000
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- ---------------------------------------------------------------------
-- RPC 8: ELO DECAY MAINTENANCE (CRON ONLY)
-- Inactive operators > 14 days decay by 15 ELO per week down to 1200 floor
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_elo_decay()
RETURNS INT AS $$
DECLARE
    v_count INT := 0;
BEGIN
    WITH decayed AS (
        UPDATE public.profiles
        SET elo = GREATEST(1200, elo - 15),
            rank = public.get_tier_from_elo(GREATEST(1200, elo - 15)),
            last_ranked_at = pg_catalog.clock_timestamp()
        WHERE elo > 1200
          AND (last_ranked_at IS NULL OR last_ranked_at < (pg_catalog.now() - INTERVAL '14 days'))
        RETURNING id
    )
    SELECT pg_catalog.count(*) INTO v_count FROM decayed;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- =====================================================================
-- PERMISSIONS AUDIT & PRIVILEGE ENFORCEMENT
-- =====================================================================

-- 1. Revoke ALL permissions on all functions from PUBLIC, anon, authenticated
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;

-- 2. Revoke table SELECT on questions from client roles (enforces zero-knowledge)
REVOKE SELECT ON public.questions FROM PUBLIC, anon, authenticated;

-- 3. Grant EXECUTE on client-facing RPCs strictly to authenticated users
GRANT EXECUTE ON FUNCTION public.find_or_create_match() TO authenticated;
GRANT EXECUTE ON FUNCTION public.poll_matchmaking() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_match_questions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_answer(UUID, UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_match(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.forfeit_match(UUID) TO authenticated;

-- 4. Explicitly guarantee internal functions remain revoked from client roles
REVOKE EXECUTE ON FUNCTION public.finalize_match_internal(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.import_legacy_progress(UUID, INT, JSONB, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_elo_decay() FROM PUBLIC, anon, authenticated;
