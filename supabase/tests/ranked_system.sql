-- =====================================================================
-- ZERODAY RANKED SYSTEM — PGTAP REGRESSION & SECURITY TEST SUITE (EXTENDED)
-- Tests RLS isolation, timing deadline, duplicate prevention,
-- matchmaking concurrency, idempotency, forfeits, ELO math, soft-flags,
-- anti-farming, question rotation, and cosmetic whitelist validation
-- =====================================================================

BEGIN;

SELECT plan(44);

-- ---------------------------------------------------------------------
-- FIXTURE SETUP
-- ---------------------------------------------------------------------

-- Create test users in auth.users (triggers profile creation)
INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'operator_alpha@zeroday.local', pg_catalog.now(), '{"nick": "AlphaOperative"}'::jsonb),
    ('22222222-2222-2222-2222-222222222222', 'operator_bravo@zeroday.local', pg_catalog.now(), '{"nick": "BravoOperative"}'::jsonb),
    ('33333333-3333-3333-3333-333333333333', 'intruder@zeroday.local', pg_catalog.now(), '{"nick": "IntruderX"}'::jsonb),
    ('44444444-4444-4444-4444-444444444444', 'unverified@zeroday.local', NULL, '{"nick": "UnverifiedUser"}'::jsonb),
    ('55555555-5555-5555-5555-555555555555', 'charlie@zeroday.local', pg_catalog.now(), '{"nick": "CharlieOp"}'::jsonb),
    ('66666666-6666-6666-6666-666666666666', 'delta@zeroday.local', pg_catalog.now(), '{"nick": "DeltaOp"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Seed 5 test questions with known correct indices
INSERT INTO public.questions (id, category, question, code_snippet, options, correct_index, difficulty)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Reverse Engineering', 'What instruction restores stack frame in x86?', 'leave\nret', '["leave", "pop eax", "nop", "int 3"]'::jsonb, 0, 'easy'),
    ('a0000000-0000-0000-0000-000000000002', 'Binary Exploitation', 'Which mitigation randomizes stack and heap layout?', NULL, '["DEP", "ASLR", "CFI", "SafeSEH"]'::jsonb, 1, 'easy'),
    ('a0000000-0000-0000-0000-000000000003', 'Kernel Internals', 'What privilege level does ring 0 represent on x86_64?', NULL, '["User Mode", "Hypervisor", "Kernel Mode", "SMM"]'::jsonb, 2, 'medium'),
    ('a0000000-0000-0000-0000-000000000004', 'Cryptography', 'Which AES block mode requires an unpredictable IV?', NULL, '["ECB", "CTR", "GCM", "CBC"]'::jsonb, 3, 'medium'),
    ('a0000000-0000-0000-0000-000000000005', 'Network Security', 'What protocol header field protects against replay in IPsec?', NULL, '["Sequence Number", "TTL", "Flow Label", "Checksum"]'::jsonb, 0, 'hard')
ON CONFLICT (id) DO NOTHING;

-- Ensure profiles are unflagged and clean
UPDATE public.profiles SET flagged = false WHERE id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    '55555555-5555-5555-5555-555555555555',
    '66666666-6666-6666-6666-666666666666'
);

-- =====================================================================
-- TEST 1 & 2: RLS ZERO-KNOWLEDGE ON QUESTIONS
-- =====================================================================

-- Test 1: anon cannot SELECT from questions
SELECT throws_ok(
    'SET ROLE anon; SELECT correct_index FROM public.questions;',
    '42501',
    NULL,
    'RLS/Privilege denies direct SELECT on questions for anon'
);

RESET ROLE;

-- Test 2: authenticated cannot SELECT from questions
SELECT throws_ok(
    'SET ROLE authenticated; SELECT correct_index FROM public.questions;',
    '42501',
    NULL,
    'RLS/Privilege denies direct SELECT on questions for authenticated'
);

RESET ROLE;

-- =====================================================================
-- TEST 3 TO 8: RESTRICTED INTERNAL FUNCTIONS & PRIVILEGE AUDIT
-- =====================================================================

-- Test 3: authenticated cannot invoke finalize_match_internal
SELECT throws_ok(
    'SET ROLE authenticated; SELECT public.finalize_match_internal(''11111111-1111-1111-1111-111111111111''::uuid);',
    '42501',
    NULL,
    'Revoke audit: authenticated cannot execute finalize_match_internal'
);

RESET ROLE;

-- Test 4: authenticated cannot invoke import_legacy_progress directly
SELECT throws_ok(
    'SET ROLE authenticated; SELECT public.import_legacy_progress(''11111111-1111-1111-1111-111111111111''::uuid, 100, ''{}''::jsonb, ''Operator'');',
    '42501',
    NULL,
    'Revoke audit: authenticated cannot execute import_legacy_progress'
);

RESET ROLE;

-- Test 5: authenticated cannot invoke check_and_increment_rate_limit (service_role only)
SELECT throws_ok(
    'SET ROLE authenticated; SELECT public.check_and_increment_rate_limit(''11111111-1111-1111-1111-111111111111''::uuid, ''test'', 1, 60);',
    '42501',
    NULL,
    'Revoke audit: authenticated cannot execute check_and_increment_rate_limit'
);

RESET ROLE;

-- Test 6: anon cannot invoke check_and_increment_rate_limit (service_role only)
SELECT throws_ok(
    'SET ROLE anon; SELECT public.check_and_increment_rate_limit(''11111111-1111-1111-1111-111111111111''::uuid, ''test'', 1, 60);',
    '42501',
    NULL,
    'Revoke audit: anon cannot execute check_and_increment_rate_limit'
);

RESET ROLE;

-- Test 7: anon cannot invoke finalize_abandoned_match (authenticated only)
SELECT throws_ok(
    'SET ROLE anon; SELECT public.finalize_abandoned_match(''11111111-1111-1111-1111-111111111111''::uuid);',
    '42501',
    NULL,
    'Revoke audit: anon cannot execute finalize_abandoned_match'
);

RESET ROLE;

-- Test 8: authenticated has EXECUTE privilege on finalize_abandoned_match
SELECT ok(
    pg_catalog.has_function_privilege('authenticated', 'public.finalize_abandoned_match(uuid)', 'execute'),
    'Privilege audit: authenticated possesses EXECUTE privilege on finalize_abandoned_match'
);

RESET ROLE;

-- =====================================================================
-- TEST 5: UNVERIFIED USER REJECTED FROM MATCHMAKING
-- =====================================================================

SET request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
SET request.jwt.claim.role = 'authenticated';
SET ROLE authenticated;

SELECT throws_ok(
    'SELECT public.find_or_create_match();',
    'P0001',
    'Verification Required: Ranked duels require a confirmed email address.',
    'Matchmaking blocks users without confirmed email'
);

RESET ROLE;

-- =====================================================================
-- TEST 6, 7, 8: MATCHMAKING QUEUE & MATCH CREATION
-- =====================================================================

-- Operator Alpha joins queue
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claim.role = 'authenticated';
SET ROLE authenticated;

SELECT is(
    (public.find_or_create_match()->>'status')::text,
    'queued',
    'Operator Alpha is queued when alone in matchmaking bracket'
);

RESET ROLE;

-- Operator Bravo joins queue -> pairs with Alpha
SET request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
SET request.jwt.claim.role = 'authenticated';
SET ROLE authenticated;

SELECT is(
    (public.find_or_create_match()->>'status')::text,
    'matched',
    'Operator Bravo instantly matches with Operator Alpha'
);

RESET ROLE;

-- Operator Alpha polls queue -> status is matched
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claim.role = 'authenticated';
SET ROLE authenticated;

SELECT is(
    (public.poll_matchmaking()->>'status')::text,
    'matched',
    'Operator Alpha polling detects match and drains from queue'
);

RESET ROLE;

-- =====================================================================
-- TEST 9 & 10: GET_MATCH_QUESTIONS (ZERO-KNOWLEDGE & PARTICIPANT ONLY)
-- =====================================================================

CREATE TEMP TABLE test_state AS
SELECT id AS match_id FROM public.matches 
WHERE (p1_id = '11111111-1111-1111-1111-111111111111' OR p2_id = '11111111-1111-1111-1111-111111111111')
ORDER BY created_at DESC LIMIT 1;

GRANT ALL ON test_state TO authenticated;

-- Test 9: Intruder cannot fetch match questions
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SET request.jwt.claim.role = 'authenticated';
SET ROLE authenticated;

SELECT throws_ok(
    'SELECT * FROM public.get_match_questions((SELECT match_id FROM test_state));',
    'P0001',
    NULL,
    'get_match_questions throws Access Denied for unauthorized third party'
);

RESET ROLE;

-- Test 10: Participant receives 5 questions with correct_index masked
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claim.role = 'authenticated';
SET ROLE authenticated;

SELECT is(
    (SELECT count(*)::int FROM public.get_match_questions((SELECT match_id FROM test_state))),
    5,
    'get_match_questions returns exactly 5 questions to authorized participant'
);

RESET ROLE;

-- =====================================================================
-- TEST 11, 12, 13: SUBMIT ANSWER (SECURITY, DUPLICATES, DEADLINE)
-- =====================================================================

-- Test 11: Intruder cannot submit answer to Alpha/Bravo match
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SET request.jwt.claim.role = 'authenticated';
SET ROLE authenticated;

SELECT throws_ok(
    'SELECT public.submit_answer((SELECT match_id FROM test_state), ''a0000000-0000-0000-0000-000000000001''::uuid, 0);',
    'P0001',
    'Access denied: not an authorized participant in match',
    'submit_answer rejects submission from non-participant'
);

RESET ROLE;

-- Test 12: Alpha submits correct answer within deadline -> accepted
-- Force question_started_at to 1 second ago so it is not soft-flagged (<350ms)
UPDATE public.matches 
SET question_started_at = pg_catalog.clock_timestamp() - INTERVAL '1 second'
WHERE id = (SELECT match_id FROM test_state);

SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claim.role = 'authenticated';
SET ROLE authenticated;

SELECT is(
    (public.submit_answer((SELECT match_id FROM test_state), 'a0000000-0000-0000-0000-000000000001'::uuid, 0)->>'is_correct')::boolean,
    true,
    'Alpha submits correct answer within deadline and is credited'
);

-- Test 13: Alpha tries to submit again for the same question -> rejected
SELECT throws_ok(
    'SELECT public.submit_answer((SELECT match_id FROM test_state), ''a0000000-0000-0000-0000-000000000001''::uuid, 0);',
    'P0001',
    NULL,
    'submit_answer rejects duplicate submission for same question'
);

RESET ROLE;

-- Test 14: Timeout deadline enforcement
UPDATE public.matches 
SET question_started_at = pg_catalog.clock_timestamp() - INTERVAL '25 seconds'
WHERE id = (SELECT match_id FROM test_state);

SET request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
SET request.jwt.claim.role = 'authenticated';
SET ROLE authenticated;

SELECT is(
    (public.submit_answer((SELECT match_id FROM test_state), 'a0000000-0000-0000-0000-000000000001'::uuid, 0)->>'is_correct')::boolean,
    false,
    'Bravo answer submitted past deadline is rejected (is_correct: false)'
);

RESET ROLE;

-- =====================================================================
-- TEST 15 & 16: FINALIZE MATCH & IDEMPOTENCY
-- =====================================================================

-- First finalization: Alpha won 1-0
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claim.role = 'authenticated';
SET ROLE authenticated;

SELECT is(
    (public.finalize_match((SELECT match_id FROM test_state))->>'status')::text,
    'completed',
    'finalize_match completes active match and awards victory'
);

-- Second finalization call (Idempotency): returns already_completed without touching ELO
SELECT is(
    (public.finalize_match((SELECT match_id FROM test_state))->>'status')::text,
    'already_completed',
    'finalize_match is strictly idempotent on repeated calls'
);

RESET ROLE;

-- =====================================================================
-- TEST 17 & 18: EXACT ELO DELTA VERIFICATION (K=32, 1000 VS 1000)
-- =====================================================================

SELECT is(
    (SELECT elo_delta_p1 FROM public.matches WHERE id = (SELECT match_id FROM test_state)),
    16,
    'ELO delta for winner (P1 in this match) is exactly +16'
);

SELECT is(
    (SELECT elo_delta_p2 FROM public.matches WHERE id = (SELECT match_id FROM test_state)),
    -16,
    'ELO delta for loser (P2 in this match) is exactly -16'
);

-- =====================================================================
-- TEST 19: SOFT FLAG ON SUB-HUMAN RESPONSE TIME (< 350MS)
-- =====================================================================

-- Create temporary duel for sub-350ms test
INSERT INTO public.matches (id, p1_id, p2_id, question_ids, question_started_at, status)
VALUES ('dddddddd-dddd-dddd-dddd-dddddddddddd', '55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666666', '["a0000000-0000-0000-0000-000000000002"]'::jsonb, pg_catalog.clock_timestamp(), 'active')
ON CONFLICT (id) DO NOTHING;

-- Charlie answers immediately (< 350ms from start)
SET request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';
SET request.jwt.claim.role = 'authenticated';
SET ROLE authenticated;

SELECT is(
    (public.submit_answer('dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, 'a0000000-0000-0000-0000-000000000002'::uuid, 1)->>'is_correct')::boolean,
    true,
    'Sub-350ms answer is evaluated'
);

RESET ROLE;

-- Verify Charlie profile is now soft-flagged
SELECT is(
    (SELECT flagged FROM public.profiles WHERE id = '55555555-5555-5555-5555-555555555555'),
    true,
    'Anti-cheat soft-flag: response under 350ms automatically sets profiles.flagged = true'
);

-- =====================================================================
-- TEST 21: ANTI-FARMING (MAX 3 DUELS PER PAIR IN 24 HOURS)
-- =====================================================================

-- Insert 3 recent matches between Charlie and Delta within 24h
INSERT INTO public.matches (p1_id, p2_id, question_ids, status, created_at)
VALUES 
    ('55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666666', '[]'::jsonb, 'completed', pg_catalog.now() - INTERVAL '1 hour'),
    ('55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666666', '[]'::jsonb, 'completed', pg_catalog.now() - INTERVAL '2 hours'),
    ('66666666-6666-6666-6666-666666666666', '55555555-5555-5555-5555-555555555555', '[]'::jsonb, 'completed', pg_catalog.now() - INTERVAL '3 hours');

-- Clean queue
DELETE FROM public.matchmaking_queue;

-- Charlie queues
SET request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';
SET request.jwt.claim.role = 'authenticated';
SET ROLE authenticated;
SELECT is((public.find_or_create_match()->>'status')::text, 'queued', 'Charlie queues');
RESET ROLE;

-- Delta queues -> anti-farming must prevent pairing with Charlie (>= 3 in 24h)
SET request.jwt.claim.sub = '66666666-6666-6666-6666-666666666666';
SET request.jwt.claim.role = 'authenticated';
SET ROLE authenticated;

SELECT is(
    (public.find_or_create_match()->>'message')::text,
    'Anti-farming active: pairing skipped with recent opponent',
    'Anti-farming: Delta and Charlie pairing blocked after 3 matches in 24 hours'
);

RESET ROLE;

-- =====================================================================
-- TEST 23: QUESTION ROTATION
-- =====================================================================

-- Question selection excludes seen questions from recent matches
SELECT ok(
    (SELECT count(DISTINCT qid) FROM (
        SELECT jsonb_array_elements_text(question_ids) AS qid 
        FROM public.matches 
        WHERE id = (SELECT match_id FROM test_state)
    ) s) = 5,
    'Question rotation selects 5 unique questions per duel'
);

-- =====================================================================
-- TEST 24: FORFEIT MATCH & PENALTY
-- =====================================================================

INSERT INTO public.matches (id, p1_id, p2_id, question_ids, status)
VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '[]'::jsonb, 'active')
ON CONFLICT (id) DO NOTHING;

SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claim.role = 'authenticated';
SET ROLE authenticated;

SELECT is(
    (public.forfeit_match('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid)->>'status')::text,
    'forfeited',
    'forfeit_match terminates match and applies forfeit penalty'
);

RESET ROLE;

-- =====================================================================
-- TEST 25: DOUBLE TIMEOUT (0-0 AFK) TIE HANDLING
-- =====================================================================

INSERT INTO public.matches (id, p1_id, p2_id, question_ids, status)
VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '[]'::jsonb, 'active')
ON CONFLICT (id) DO NOTHING;

SELECT is(
    (public.finalize_match_internal('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid)->>'p1_delta')::int,
    0,
    'Double timeout (0-0 AFK) produces zero ELO delta for both players'
);

-- =====================================================================
-- TEST 26 & 27: MIGRATE_MY_LEGACY_PROGRESS WHITELIST & SANITIZATION
-- =====================================================================

-- Reset legacy_imported on Delta
UPDATE public.profiles SET legacy_imported = false, inventory = '{}'::jsonb WHERE id = '66666666-6666-6666-6666-666666666666';

SET request.jwt.claim.sub = '66666666-6666-6666-6666-666666666666';
SET request.jwt.claim.role = 'authenticated';
SET ROLE authenticated;

-- Test 26: Unknown keys (isPro, licenseKey) stripped; valid theme & title whitelisted
SELECT is(
    (public.migrate_my_legacy_progress(
        50000,
        '{"isPro": true, "licenseKey": "EVIL-KEY", "activeTheme": "matrix-green", "customTitle": "Kernel Hacker", "unknownGarbage": 123}'::jsonb,
        'Security Researcher'
    )->>'imported_xp')::int,
    15000,
    'migrate_my_legacy_progress caps XP strictly at 15000'
);

RESET ROLE;

-- Verify inventory on Delta only contains whitelisted keys
SELECT ok(
    (SELECT inventory FROM public.profiles WHERE id = '66666666-6666-6666-6666-666666666666') = '{"activeTheme": "matrix-green", "customTitle": "Kernel Hacker"}'::jsonb,
    'Cosmetic whitelist strictly stripped isPro, licenseKey, and unknown keys'
);

-- Test 28: Oversized JSONB rejected (> 4KB)
-- Reset legacy_imported for intruder to test oversized payload
UPDATE public.profiles SET legacy_imported = false WHERE id = '33333333-3333-3333-3333-333333333333';
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SET request.jwt.claim.role = 'authenticated';
SET ROLE authenticated;

SELECT throws_ok(
    'SELECT public.migrate_my_legacy_progress(1000, (''{"customTitle": "'' || pg_catalog.repeat(''A'', 4500) || ''"}'')::jsonb, ''Operator'');',
    'P0001',
    'Payload too large: cosmetic inventory exceeds 4KB limit',
    'migrate_my_legacy_progress rejects oversized inventory payload (> 4KB)'
);

RESET ROLE;

-- =====================================================================
-- TEST 29: ATOMIC RATE LIMIT FUNCTION (CHECK_AND_INCREMENT_RATE_LIMIT)
-- =====================================================================

-- 2 requests allowed, 3rd blocked
SELECT is(
    public.check_and_increment_rate_limit('11111111-1111-1111-1111-111111111111'::UUID, 'test_action'::TEXT, 2, 60),
    true,
    'check_and_increment_rate_limit allows 1st request within quota'
);

SELECT is(
    (SELECT public.check_and_increment_rate_limit('11111111-1111-1111-1111-111111111111'::UUID, 'test_action'::TEXT, 2, 60)),
    true,
    'check_and_increment_rate_limit allows 2nd request within quota'
);

-- Note: The two above consumed quota (2 of 2). Next call must be blocked (false).
SELECT is(
    public.check_and_increment_rate_limit('11111111-1111-1111-1111-111111111111'::UUID, 'test_action'::TEXT, 2, 60),
    false,
    'check_and_increment_rate_limit blocks 3rd request when quota exceeded (2/2)'
);

-- =====================================================================
-- TEST 30 & 31: STRICT AUTO-FORFEIT & MATCHMAKING COOLDOWN
-- =====================================================================

-- Reset ELOs and create match for forfeit test
UPDATE public.profiles SET elo = 1000, rank = 'Bronze Recruit', matchmaking_cooldown_until = NULL WHERE id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');

INSERT INTO public.matches (id, p1_id, p2_id, question_ids, question_started_at, status)
VALUES (
    'd0000000-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '["a0000000-0000-0000-0000-000000000001"]'::jsonb,
    pg_catalog.clock_timestamp(),
    'active'
);

SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claim.role = 'authenticated';
SET ROLE authenticated;

-- Test 30: Calling forfeit_match forfeits for the caller (-25 ELO for caller, +18 ELO for opponent)
SELECT is(
    (public.forfeit_match('d0000000-0000-0000-0000-000000000001')->>'winner_id')::text,
    '22222222-2222-2222-2222-222222222222',
    'forfeit_match strictly enforces caller as loser and opponent as winner'
);

RESET ROLE;

-- Verify caller lost 25 ELO (1000 -> 975)
SELECT is(
    (SELECT elo FROM public.profiles WHERE id = '11111111-1111-1111-1111-111111111111'),
    975,
    'Caller received exact -25 ELO forfeit penalty'
);

-- Test 31: Second forfeit within 1h triggers matchmaking cooldown
INSERT INTO public.matches (id, p1_id, p2_id, question_ids, question_started_at, status)
VALUES (
    'd0000000-0000-0000-0000-000000000002',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '["a0000000-0000-0000-0000-000000000001"]'::jsonb,
    pg_catalog.clock_timestamp(),
    'active'
);

SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claim.role = 'authenticated';
SET ROLE authenticated;

SELECT is(
    (public.forfeit_match('d0000000-0000-0000-0000-000000000002')->>'cooldown_active')::boolean,
    true,
    'Second forfeit within 1h activates matchmaking cooldown'
);

-- Test 32: find_or_create_match blocks caller when cooldown is active
SELECT throws_ok(
    'SELECT public.find_or_create_match();',
    'P0001',
    NULL,
    'find_or_create_match throws exception when operator has active matchmaking cooldown'
);

RESET ROLE;

-- =====================================================================
-- TEST 40, 41, 42, 43: FINALIZE_ABANDONED_MATCH (INACTIVITY TIMEOUT & FORFEIT PENALTY)
-- =====================================================================

-- Reset baseline ELO for Charlie and Delta
UPDATE public.profiles SET elo = 1000, rank = 'Bronze Recruit' 
WHERE id IN ('55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666666');

INSERT INTO public.matches (id, p1_id, p2_id, question_ids, question_started_at, status)
VALUES (
    'd0000000-0000-0000-0000-000000000003',
    '55555555-5555-5555-5555-555555555555',
    '66666666-6666-6666-6666-666666666666',
    '["a0000000-0000-0000-0000-000000000001"]'::jsonb,
    pg_catalog.clock_timestamp() - INTERVAL '25 seconds', -- Inactive > 18s
    'active'
);

-- Charlie submitted answer, Delta is inactive
INSERT INTO public.match_answers (match_id, user_id, question_id, answer_index, is_correct, response_time_ms, server_ts)
VALUES ('d0000000-0000-0000-0000-000000000003', '55555555-5555-5555-5555-555555555555', 'a0000000-0000-0000-0000-000000000001', 0, true, 3000, pg_catalog.clock_timestamp() - INTERVAL '24 seconds');

SET request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';
SET request.jwt.claim.role = 'authenticated';
SET ROLE authenticated;

SELECT is(
    (public.finalize_abandoned_match('d0000000-0000-0000-0000-000000000003')->>'winner_id')::text,
    '55555555-5555-5555-5555-555555555555',
    'finalize_abandoned_match finalizes match on inactivity timeout awarding active participant'
);

RESET ROLE;

-- Verify Delta (leaver) received -25 ELO forfeit penalty
SELECT is(
    (SELECT elo FROM public.profiles WHERE id = '66666666-6666-6666-6666-666666666666'),
    975,
    'Abandoning opponent Delta received exact -25 ELO forfeit penalty'
);

-- Verify Charlie (active caller) received +18 ELO award
SELECT is(
    (SELECT elo FROM public.profiles WHERE id = '55555555-5555-5555-5555-555555555555'),
    1018,
    'Active caller Charlie awarded +18 ELO'
);

-- Verify Delta abandonment recorded in forfeit_history
SELECT ok(
    EXISTS (SELECT 1 FROM public.forfeit_history WHERE user_id = '66666666-6666-6666-6666-666666666666' AND match_id = 'd0000000-0000-0000-0000-000000000003'),
    'Abandonment logged in forfeit_history for leaver Delta'
);

-- =====================================================================
-- TEST 34: ANOMALY SOFT-FLAG DETECTION
-- =====================================================================

-- Charlie has 1 completed match from above. Add 2 more perfect ultra-fast matches
INSERT INTO public.matches (id, p1_id, p2_id, question_ids, status, created_at, ended_at)
VALUES 
    ('e0000000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666666', '["a0000000-0000-0000-0000-000000000001"]'::jsonb, 'completed', pg_catalog.now() - INTERVAL '10 minutes', pg_catalog.now() - INTERVAL '9 minutes'),
    ('e0000000-0000-0000-0000-000000000002', '55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666666', '["a0000000-0000-0000-0000-000000000001"]'::jsonb, 'completed', pg_catalog.now() - INTERVAL '5 minutes', pg_catalog.now() - INTERVAL '4 minutes');

-- Populate 5 correct answers with 400ms reaction time for each match
INSERT INTO public.match_answers (match_id, user_id, question_id, answer_index, is_correct, response_time_ms)
SELECT 'e0000000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', id, 0, true, 400
FROM public.questions LIMIT 5;

INSERT INTO public.match_answers (match_id, user_id, question_id, answer_index, is_correct, response_time_ms)
SELECT 'e0000000-0000-0000-0000-000000000002', '55555555-5555-5555-5555-555555555555', id, 0, true, 420
FROM public.questions LIMIT 5;

-- Ensure match 3 has 5 answers
INSERT INTO public.match_answers (match_id, user_id, question_id, answer_index, is_correct, response_time_ms)
SELECT 'd0000000-0000-0000-0000-000000000003', '55555555-5555-5555-5555-555555555555', id, 0, true, 450
FROM public.questions WHERE id != 'a0000000-0000-0000-0000-000000000001' LIMIT 4;

-- Trigger anomaly checker
SELECT public.check_operator_anomalies('55555555-5555-5555-5555-555555555555');

SELECT is(
    (SELECT flagged FROM public.profiles WHERE id = '55555555-5555-5555-5555-555555555555'),
    true,
    'check_operator_anomalies sets flagged = true on 100% accuracy and avg time < 650ms over 3 matches'
);

SELECT * FROM finish();
ROLLBACK;

