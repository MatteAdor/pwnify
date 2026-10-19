-- =====================================================================
-- ZERODAY RANKED SYSTEM — DATABASE MIGRATION
-- Migration: 20261019000001_ranked_system.sql
-- Server-authoritative 1v1 PvP, RLS Isolation, Anti-Cheat, Timing, ELO (K=32)
-- =====================================================================

-- Enable cryptographic UUID extension
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
    last_ranked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_elo ON public.profiles(elo);
CREATE INDEX IF NOT EXISTS idx_profiles_flagged ON public.profiles(flagged);

-- ---------------------------------------------------------------------
-- 2. QUESTIONS TABLE (SERVER-SIDE AUTHORITATIVE ONLY)
-- Strict zero-knowledge: correct_index is never queried directly by client
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    question TEXT NOT NULL,
    code_snippet TEXT,
    options JSONB NOT NULL, -- Array of 4 text options
    correct_index INT NOT NULL CHECK (correct_index >= 0 AND correct_index <= 3),
    difficulty TEXT NOT NULL DEFAULT 'medium',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_questions_category ON public.questions(category);

-- ---------------------------------------------------------------------
-- 3. MATCHES TABLE
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    p1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    p2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'forfeited')),
    question_ids JSONB NOT NULL, -- 5 question UUIDs
    current_question_index INT NOT NULL DEFAULT 0 CHECK (current_question_index >= 0 AND current_question_index <= 5),
    question_started_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    p1_score INT NOT NULL DEFAULT 0 CHECK (p1_score >= 0 AND p1_score <= 5),
    p2_score INT NOT NULL DEFAULT 0 CHECK (p2_score >= 0 AND p2_score <= 5),
    winner_id UUID REFERENCES public.profiles(id),
    elo_delta_p1 INT,
    elo_delta_p2 INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_matches_participants ON public.matches(p1_id, p2_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);

-- ---------------------------------------------------------------------
-- 4. MATCH_ANSWERS TABLE (APPEND-ONLY AUDIT LOG)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.match_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    answer_index INT NOT NULL CHECK (answer_index >= 0 AND answer_index <= 3),
    is_correct BOOLEAN NOT NULL,
    response_time_ms INT NOT NULL CHECK (response_time_ms >= 0),
    server_ts TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_match_user_question UNIQUE (match_id, user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_match_answers_match ON public.match_answers(match_id);

-- ---------------------------------------------------------------------
-- 5. MATCHMAKING_QUEUE TABLE
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.matchmaking_queue (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    elo INT NOT NULL,
    queued_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    matched_match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_elo ON public.matchmaking_queue(elo);

-- =====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =================================--------------------------------====

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matchmaking_queue ENABLE ROW LEVEL SECURITY;

-- 1. Profiles RLS
CREATE POLICY "profiles_read_all" ON public.profiles
    FOR SELECT TO authenticated, anon
    USING (true);

-- No INSERT/UPDATE/DELETE policies for authenticated: writes are mediated via SECURITY DEFINER triggers and RPCs

-- 2. Questions RLS
-- ZERO access for authenticated/anon clients directly. Inaccessible via PostgREST SELECT
-- Exposed only through RPC get_match_questions() which explicitly omits correct_index.

-- 3. Matches RLS
CREATE POLICY "matches_read_participants" ON public.matches
    FOR SELECT TO authenticated
    USING (auth.uid() = p1_id OR auth.uid() = p2_id);

-- 4. Match Answers RLS (Append-only)
-- Read allowed only to match participants
CREATE POLICY "answers_read_participants" ON public.match_answers
    FOR SELECT TO authenticated
    USING (auth.uid() IN (SELECT p1_id FROM public.matches WHERE id = match_id UNION SELECT p2_id FROM public.matches WHERE id = match_id));

-- STRICT APPEND-ONLY: No INSERT, UPDATE or DELETE policies for authenticated or anon!
-- Insertion is executed exclusively via submit_answer() RPC.

-- 5. Matchmaking Queue RLS
CREATE POLICY "queue_read_self" ON public.matchmaking_queue
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "queue_delete_self" ON public.matchmaking_queue
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- =====================================================================
-- DATABASE FUNCTIONS & RPCs (SECURITY DEFINER)
-- =====================================================================

-- Helper: Compute Rank Tier from ELO
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
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger: Automatically provision profile on new auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_raw_nick TEXT;
    v_final_nick TEXT;
    v_counter INT := 1;
BEGIN
    v_raw_nick := COALESCE(NEW.raw_user_meta_data->>'nick', NEW.raw_user_meta_data->>'customUsername', split_part(NEW.email, '@', 1));
    v_raw_nick := regexp_replace(v_raw_nick, '[^a-zA-Z0-9_]', '_', 'g');
    IF length(v_raw_nick) < 3 THEN
        v_raw_nick := 'Operator_' || substr(md5(random()::text), 1, 6);
    END IF;

    v_final_nick := v_raw_nick;
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE nick = v_final_nick) LOOP
        v_final_nick := v_raw_nick || '_' || v_counter;
        v_counter := v_counter + 1;
    END LOOP;

    INSERT INTO public.profiles (id, nick, elo, rank, xp, created_at, updated_at)
    VALUES (NEW.id, v_final_nick, 1000, 'Bronze Recruit', 0, now(), now());

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
    -- Verify participant authorization
    SELECT question_ids INTO v_question_ids
    FROM public.matches
    WHERE matches.id = p_match_id AND (p1_id = v_caller_id OR p2_id = v_caller_id);

    IF v_question_ids IS NULL THEN
        RAISE EXCEPTION 'Access denied: not a participant in match %', p_match_id;
    END IF;

    RETURN QUERY
    WITH ord AS (
        SELECT value::text::uuid AS qid, ordinality::int AS q_order
        FROM jsonb_array_elements_text(v_question_ids) WITH ORDINALITY
    )
    SELECT q.id, q.category, q.question, q.code_snippet, q.options, ord.q_order
    FROM public.questions q
    JOIN ord ON ord.qid = q.id
    ORDER BY ord.q_order ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- RPC 2: MATCHMAKING (FOR UPDATE SKIP LOCKED)
-- Requires verified email; enforces anti-farming limit (max 3 matches/pair in 24h)
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
    v_window INT := 100; -- Initial ±100 ELO tolerance window
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: authentication token required';
    END IF;

    -- Constraint: Ranked only with email verified
    SELECT (email_confirmed_at IS NOT NULL) INTO v_is_verified
    FROM auth.users
    WHERE auth.users.id = v_caller_id;

    IF v_is_verified IS NOT TRUE THEN
        RAISE EXCEPTION 'Verification Required: Ranked duels require a confirmed email address.';
    END IF;

    SELECT elo INTO v_caller_elo
    FROM public.profiles
    WHERE id = v_caller_id;

    IF v_caller_elo IS NULL THEN
        RAISE EXCEPTION 'Profile not initialized for operator';
    END IF;

    -- Check if caller already matched in queue
    SELECT matched_match_id INTO v_match_id
    FROM public.matchmaking_queue
    WHERE user_id = v_caller_id AND matched_match_id IS NOT NULL;

    IF v_match_id IS NOT NULL THEN
        DELETE FROM public.matchmaking_queue WHERE user_id = v_caller_id;
        RETURN jsonb_build_object('status', 'matched', 'match_id', v_match_id);
    END IF;

    -- Atomic matchmaking selection with FOR UPDATE SKIP LOCKED
    SELECT q.user_id, q.elo INTO v_opponent
    FROM public.matchmaking_queue q
    WHERE q.user_id != v_caller_id 
      AND q.matched_match_id IS NULL
      AND abs(q.elo - v_caller_elo) <= v_window
    ORDER BY q.queued_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_opponent.user_id IS NOT NULL THEN
        -- Anti-Farming check: Limit repeated matches between same pair to 3 per 24 hours
        SELECT count(*) INTO v_recent_duels_count
        FROM public.matches
        WHERE ((p1_id = v_caller_id AND p2_id = v_opponent.user_id) OR (p1_id = v_opponent.user_id AND p2_id = v_caller_id))
          AND created_at > now() - interval '24 hours';

        IF v_recent_duels_count >= 3 THEN
            -- Pair locked to prevent collusive farming; keep searching
            INSERT INTO public.matchmaking_queue (user_id, elo, queued_at)
            VALUES (v_caller_id, v_caller_elo, clock_timestamp())
            ON CONFLICT (user_id) DO UPDATE SET elo = v_caller_elo, queued_at = clock_timestamp();

            RETURN jsonb_build_object('status', 'queued', 'message', 'Anti-farming active: pairing skipped with recent opponent');
        END IF;

        -- Select 5 distinct random question IDs from server questions pool
        SELECT jsonb_agg(id) INTO v_q_ids
        FROM (
            SELECT id FROM public.questions ORDER BY random() LIMIT 5
        ) sel;

        -- Create match
        INSERT INTO public.matches (p1_id, p2_id, question_ids, question_started_at, status)
        VALUES (v_opponent.user_id, v_caller_id, v_q_ids, clock_timestamp(), 'active')
        RETURNING id INTO v_match_id;

        -- Mark opponent in queue with match_id
        UPDATE public.matchmaking_queue
        SET matched_match_id = v_match_id
        WHERE user_id = v_opponent.user_id;

        -- Remove caller from queue
        DELETE FROM public.matchmaking_queue WHERE user_id = v_caller_id;

        RETURN jsonb_build_object('status', 'matched', 'match_id', v_match_id);
    ELSE
        -- No opponent in immediate window: insert/update caller into queue
        INSERT INTO public.matchmaking_queue (user_id, elo, queued_at)
        VALUES (v_caller_id, v_caller_elo, clock_timestamp())
        ON CONFLICT (user_id) DO UPDATE SET elo = v_caller_elo, queued_at = clock_timestamp();

        RETURN jsonb_build_object('status', 'queued', 'message', 'Searching opponent in ELO bracket...');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- RPC 3: POLL MATCHMAKING QUEUE
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.poll_matchmaking()
RETURNS JSONB AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_matched_id UUID;
BEGIN
    SELECT matched_match_id INTO v_matched_id
    FROM public.matchmaking_queue
    WHERE user_id = v_caller_id;

    IF v_matched_id IS NOT NULL THEN
        DELETE FROM public.matchmaking_queue WHERE user_id = v_caller_id;
        RETURN jsonb_build_object('status', 'matched', 'match_id', v_matched_id);
    END IF;

    RETURN jsonb_build_object('status', 'waiting');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
    v_now TIMESTAMPTZ := clock_timestamp();
    v_elapsed_ms INT;
    v_is_correct BOOLEAN := FALSE;
    v_answers_count INT;
    v_both_answered BOOLEAN := FALSE;
    v_deadline_ms INT := 17500; -- 15s question time + 2.5s transit grace
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

    -- 2. Prevent duplicate answer for this question
    IF EXISTS (
        SELECT 1 FROM public.match_answers
        WHERE match_id = p_match_id AND user_id = v_caller_id AND question_id = p_question_id
    ) THEN
        RAISE EXCEPTION 'Answer already submitted for question %', p_question_id;
    END IF;

    -- 3. Calculate authoritative elapsed time
    v_elapsed_ms := GREATEST(0, (EXTRACT(EPOCH FROM (v_now - v_match.question_started_at)) * 1000)::INT);

    -- 4. Anti-Cheat: Soft flag sub-human reaction (< 350ms)
    IF v_elapsed_ms < 350 THEN
        UPDATE public.profiles
        SET flagged = TRUE
        WHERE id = v_caller_id;
    END IF;

    -- 5. Validate answer against hidden server table
    SELECT correct_index INTO v_correct_idx
    FROM public.questions
    WHERE id = p_question_id;

    IF v_correct_idx IS NULL THEN
        RAISE EXCEPTION 'Question % not found in database', p_question_id;
    END IF;

    -- Answer is correct ONLY if submitted within server deadline window
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
    SELECT count(*) INTO v_answers_count
    FROM public.match_answers
    WHERE match_id = p_match_id AND question_id = p_question_id;

    IF v_answers_count >= 2 THEN
        v_both_answered := TRUE;
        IF v_match.current_question_index + 1 < 5 THEN
            UPDATE public.matches
            SET current_question_index = current_question_index + 1,
                question_started_at = clock_timestamp()
            WHERE id = p_match_id;
        ELSE
            -- 5 questions completed: trigger authoritative finalize
            PERFORM public.finalize_match_internal(p_match_id);
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'is_correct', v_is_correct,
        'elapsed_ms', v_elapsed_ms,
        'both_answered', v_both_answered,
        'question_index', v_match.current_question_index
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- INTERNAL HELPER: FINALIZE MATCH (IDEMPOTENT WITH ROW LOCK)
-- Formula standard ELO K=32, updates profiles atomically
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
    v_delta1 INT;
    v_delta2 INT;
    v_winner UUID := NULL;
    v_p1_final_score INT;
    v_p2_final_score INT;
BEGIN
    -- Idempotent row lock
    SELECT * INTO v_match
    FROM public.matches
    WHERE id = p_match_id
    FOR UPDATE;

    IF v_match.id IS NULL THEN
        RAISE EXCEPTION 'Match not found: %', p_match_id;
    END IF;

    -- Idempotency check: if already completed, exit cleanly
    IF v_match.status = 'completed' THEN
        RETURN jsonb_build_object(
            'status', 'already_completed',
            'winner_id', v_match.winner_id,
            'p1_delta', v_match.elo_delta_p1,
            'p2_delta', v_match.elo_delta_p2
        );
    END IF;

    -- Re-compute official scores from append-only match_answers
    SELECT count(*) INTO v_p1_final_score
    FROM public.match_answers
    WHERE match_id = p_match_id AND user_id = v_match.p1_id AND is_correct = TRUE;

    SELECT count(*) INTO v_p2_final_score
    FROM public.match_answers
    WHERE match_id = p_match_id AND user_id = v_match.p2_id AND is_correct = TRUE;

    -- Determine winner
    IF v_p1_final_score > v_p2_final_score THEN
        v_winner := v_match.p1_id;
        v_s1 := 1.0;
        v_s2 := 0.0;
    ELSIF v_p2_final_score > v_p1_final_score THEN
        v_winner := v_match.p2_id;
        v_s1 := 0.0;
        v_s2 := 1.0;
    ELSE
        v_winner := NULL; -- Draw
        v_s1 := 0.5;
        v_s2 := 0.5;
    END IF;

    -- Fetch current ELOs
    SELECT elo INTO v_p1_elo FROM public.profiles WHERE id = v_match.p1_id FOR UPDATE;
    SELECT elo INTO v_p2_elo FROM public.profiles WHERE id = v_match.p2_id FOR UPDATE;

    -- Standard ELO formula calculation
    v_e1 := 1.0 / (1.0 + power(10.0, (v_p2_elo - v_p1_elo)::NUMERIC / 400.0));
    v_e2 := 1.0 / (1.0 + power(10.0, (v_p1_elo - v_p2_elo)::NUMERIC / 400.0));

    v_delta1 := round(v_k * (v_s1 - v_e1))::INT;
    v_delta2 := round(v_k * (v_s2 - v_e2))::INT;

    -- Update profiles with bounded clamp (min 100)
    UPDATE public.profiles
    SET elo = GREATEST(100, elo + v_delta1),
        rank = public.get_tier_from_elo(GREATEST(100, elo + v_delta1)),
        xp = xp + (v_p1_final_score * 40) + (CASE WHEN v_winner = v_match.p1_id THEN 100 ELSE 25 END),
        last_ranked_at = clock_timestamp(),
        updated_at = clock_timestamp()
    WHERE id = v_match.p1_id;

    UPDATE public.profiles
    SET elo = GREATEST(100, elo + v_delta2),
        rank = public.get_tier_from_elo(GREATEST(100, elo + v_delta2)),
        xp = xp + (v_p2_final_score * 40) + (CASE WHEN v_winner = v_match.p2_id THEN 100 ELSE 25 END),
        last_ranked_at = clock_timestamp(),
        updated_at = clock_timestamp()
    WHERE id = v_match.p2_id;

    -- Update match record
    UPDATE public.matches
    SET status = 'completed',
        p1_score = v_p1_final_score,
        p2_score = v_p2_final_score,
        winner_id = v_winner,
        elo_delta_p1 = v_delta1,
        elo_delta_p2 = v_delta2,
        ended_at = clock_timestamp()
    WHERE id = p_match_id;

    RETURN jsonb_build_object(
        'status', 'completed',
        'winner_id', v_winner,
        'p1_score', v_p1_final_score,
        'p2_score', v_p2_final_score,
        'p1_delta', v_delta1,
        'p2_delta', v_delta2
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- RPC 5: FINALIZE MATCH (PUBLIC CALLABLE WRAPPER)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finalize_match(p_match_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_match RECORD;
BEGIN
    SELECT * INTO v_match
    FROM public.matches
    WHERE id = p_match_id;

    IF v_match.id IS NULL THEN
        RAISE EXCEPTION 'Match not found';
    END IF;

    IF v_caller_id != v_match.p1_id AND v_caller_id != v_match.p2_id THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    RETURN public.finalize_match_internal(p_match_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- RPC 6: FORFEIT MATCH (PENALTY -25 ELO)
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
        RETURN jsonb_build_object('status', 'already_ended');
    END IF;

    IF v_caller_id != v_match.p1_id AND v_caller_id != v_match.p2_id THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    v_winner_id := CASE WHEN v_caller_id = v_match.p1_id THEN v_match.p2_id ELSE v_match.p1_id END;

    -- Apply fixed forfeit penalty to leaver, award winner
    UPDATE public.profiles
    SET elo = GREATEST(100, elo + v_loser_delta),
        rank = public.get_tier_from_elo(GREATEST(100, elo + v_loser_delta)),
        last_ranked_at = clock_timestamp(),
        updated_at = clock_timestamp()
    WHERE id = v_caller_id;

    UPDATE public.profiles
    SET elo = elo + v_winner_delta,
        rank = public.get_tier_from_elo(elo + v_winner_delta),
        last_ranked_at = clock_timestamp(),
        updated_at = clock_timestamp()
    WHERE id = v_winner_id;

    UPDATE public.matches
    SET status = 'forfeited',
        winner_id = v_winner_id,
        elo_delta_p1 = CASE WHEN v_caller_id = v_match.p1_id THEN v_loser_delta ELSE v_winner_delta END,
        elo_delta_p2 = CASE WHEN v_caller_id = v_match.p2_id THEN v_loser_delta ELSE v_winner_delta END,
        ended_at = clock_timestamp()
    WHERE id = p_match_id;

    RETURN jsonb_build_object('status', 'forfeited', 'winner_id', v_winner_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- RPC 7: IMPORT LEGACY PROGRESS (ONE-SHOT MIGRATION WITH CAP)
-- Zero trust: licenses/passwords not imported. ELO starts strictly at 1000.
-- XP is strictly capped to 15,000 max.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.import_legacy_progress(
    p_xp INT,
    p_inventory JSONB,
    p_profession TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_capped_xp INT;
    v_clean_profession TEXT;
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Hard cap XP to max 15,000 XP to prevent client-side falsifications
    v_capped_xp := LEAST(GREATEST(COALESCE(p_xp, 0), 0), 15000);
    v_clean_profession := substring(COALESCE(p_profession, 'Cyber Warfare Operator'), 1, 40);

    UPDATE public.profiles
    SET xp = GREATEST(xp, v_capped_xp),
        inventory = COALESCE(inventory, '{}'::jsonb) || COALESCE(p_inventory, '{}'::jsonb),
        profession = v_clean_profession,
        updated_at = clock_timestamp()
    WHERE id = v_caller_id;

    RETURN jsonb_build_object(
        'success', true,
        'imported_xp', v_capped_xp,
        'elo', 1000
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- RPC 8: ELO DECAY CRON / MAINTENANCE
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
            last_ranked_at = clock_timestamp()
        WHERE elo > 1200
          AND (last_ranked_at IS NULL OR last_ranked_at < now() - interval '14 days')
        RETURNING id
    )
    SELECT count(*) INTO v_count FROM decayed;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- 6. SEED: FRESH SERVER-ONLY RANKED QUESTIONS
-- No overlap with client bundle pvpChallenges.ts
-- =====================================================================
INSERT INTO public.questions (category, question, code_snippet, options, correct_index, difficulty) VALUES
(
    'AppSec',
    'Quale vulnerabilità è presente nel seguente handler di autenticazione basato su JWT in Node.js?',
    'const decoded = jwt.verify(token, secret, { algorithms: ["HS256", "none"] });',
    '["Algoritmo deprecato RSA", "Algorithmic confusion / Algorithm none bypass", "Iniezione SQL nei claim", "Timing attack sul padding"]'::jsonb,
    1,
    'hard'
),
(
    'Linux Internals',
    'Un attaccante sfrutta un binario con permessi SUID per evadere da un container. Quale flag di montaggio impedisce categoricamente l''esecuzione SUID sul filesystem montato?',
    'mount -t ext4 -o <FLAG> /dev/sdb1 /mnt/data',
    '["noexec", "nosuid", "nodev", "ro"]'::jsonb,
    1,
    'medium'
),
(
    'Network Defense',
    'Esaminando questo log Snort/Suricata, quale tecnica di scansione stealth viene intercettata?',
    'TCP [SYN, FIN] Seq=0 Ack=0 Win=1024 Len=0',
    '["TCP Connect Scan", "FIN Scan", "SYN-FIN Malformed/Evasion Scan", "XMAS Scan"]'::jsonb,
    2,
    'hard'
),
(
    'Cryptography',
    'Nel padding scheme PKCS#7 con block size di 16 byte, se il messaggio in chiaro termina con 12 byte nell''ultimo blocco, quale sequenza di byte di padding viene aggiunta?',
    'plaintext: [0xAA, ..., 0xAA] (12 bytes) + padding (4 bytes)',
    '["0x00 0x00 0x00 0x04", "0x04 0x04 0x04 0x04", "0x0C 0x0C 0x0C 0x0C", "0x10 0x10 0x10 0x10"]'::jsonb,
    1,
    'medium'
),
(
    'Web Security',
    'Quale header HTTP moderno impedisce categoricamente gli attacchi di tipo Cross-Site Script Inclusion (XSSI) e Side-Channel Leakage isolando il browsing context del documento?',
    'Header: Cross-Origin-Opener-Policy: same-origin',
    '["Cross-Origin-Embedder-Policy", "Cross-Origin-Opener-Policy (COOP)", "X-Content-Type-Options", "Strict-Transport-Security"]'::jsonb,
    1,
    'medium'
),
(
    'Reverse Engineering',
    'In architettura x86-64 Linux System V ABI, in quali registri vengono passati i primi 3 argomenti interi di una funzione?',
    'void target_fn(int a, int b, int c);',
    '["RAX, RBX, RCX", "RDI, RSI, RDX", "RCX, RDX, R8", "RSI, RDI, RBP"]'::jsonb,
    1,
    'hard'
),
(
    'Incident Response',
    'Durante l''analisi di memoria con Volatility 3, quale plugin identifica i processi nascosti attraverso la tecnica del Direct Kernel Object Manipulation (DKOM) confrontando active process links con thread scans?',
    'vol -f dump.mem <plugin>',
    '["windows.pstree", "windows.pslist", "windows.psscan", "windows.malfind"]'::jsonb,
    2,
    'hard'
),
(
    'Cloud Security',
    'Su un''istanza AWS EC2, quale contromisura mitiga l''estrazione di token IAM tramite Server-Side Request Forgery (SSRF) richiedendo un token di sessione PUT preliminare?',
    'curl http://169.254.169.254/latest/meta-data/',
    '["IAM Boundary Policy", "AWS Shield Advanced", "IMDSv2 (Instance Metadata Service v2)", "VPC Flow Logs"]'::jsonb,
    2,
    'medium'
),
(
    'Binary Exploitation',
    'Quale protezione di sicurezza attiva sul binario impedisce la sovrascrittura della Global Offset Table (GOT) rendendo il segmento `.got.plt` read-only dopo la risoluzione dei simboli al caricamento?',
    'checksec --file=target_binary',
    '["Stack Canary", "ASLR", "Full RELRO", "NX / DEP"]'::jsonb,
    2,
    'medium'
),
(
    'Threat Hunting',
    'Nel framework MITRE ATT&CK, a quale tecnica corrisponde l''iniezione di payload residenti in processi legittimi tramite `QueueUserAPC` prima dell''avvio del thread primario?',
    'QueueUserAPC((PAPCFUNC)pShellcode, hThread, NULL);',
    '["Process Hollowing", "Early Bird APC Injection (T1055.004)", "DLL Side-Loading", "Reflective DLL Loading"]'::jsonb,
    1,
    'hard'
)
ON CONFLICT DO NOTHING;
