-- =====================================================================
-- ZERODAY DATABASE TEST SUITE: PROFILES RLS & SECURITY AUDIT (pgTAP)
-- File: supabase/tests/profiles_rls_integrity.sql
-- Status: TEST SPECIFICATION ONLY (DO NOT RUN IN PRODUCTION WRITE MODE)
-- =====================================================================

BEGIN;
SELECT plan(15);

-- ---------------------------------------------------------------------
-- 1. SETUP MOCK USERS & PROFILES
-- ---------------------------------------------------------------------
INSERT INTO auth.users (id, email) VALUES 
    ('11111111-1111-1111-1111-111111111111', 'victim@zeroday.local'),
    ('22222222-2222-2222-2222-222222222222', 'attacker@zeroday.local')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, nick, elo, rank, xp, is_pro, flagged, is_profession_public, profession) VALUES
    ('11111111-1111-1111-1111-111111111111', 'ZeroVictim', 1200, 'Operative', 450, TRUE, FALSE, FALSE, 'SecOps Analyst'),
    ('22222222-2222-2222-2222-222222222222', 'ZeroAttacker', 100, 'Script Kiddie', 0, FALSE, FALSE, FALSE, NULL)
ON CONFLICT (id) DO UPDATE SET nick = EXCLUDED.nick, elo = EXCLUDED.elo;

-- ---------------------------------------------------------------------
-- 2. VERIFY ANON PERMISSIONS (Default Deny & RLS Lockdown)
-- ---------------------------------------------------------------------
SET ROLE anon;

-- Test 1: anon INSERT must raise error (permission denied)
SELECT throws_ok(
    $$INSERT INTO public.profiles (id, nick) VALUES ('33333333-3333-3333-3333-333333333333', 'HackerAnon')$$,
    '42501',
    NULL,
    'anon is strictly denied INSERT into public.profiles (error 42501)'
);

-- Test 2: anon SELECT on base table is denied
SELECT throws_ok(
    'SELECT * FROM public.profiles',
    '42501',
    NULL,
    'anon is strictly denied SELECT on base public.profiles'
);

-- ---------------------------------------------------------------------
-- 3. VERIFY AUTHENTICATED MUTATIONS (State Immutability: Rows Do Not Change)
-- ---------------------------------------------------------------------
SET ROLE authenticated;
SET request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

-- Test 3: direct INSERT by authenticated raises error (permission denied)
SELECT throws_ok(
    $$INSERT INTO public.profiles (id, nick) VALUES ('44444444-4444-4444-4444-444444444444', 'AttackerAlt')$$,
    '42501',
    NULL,
    'authenticated is strictly denied direct INSERT into public.profiles'
);

-- Execute direct UPDATE on victim row (should not modify anything)
UPDATE public.profiles SET elo = 9999, is_pro = TRUE WHERE id = '11111111-1111-1111-1111-111111111111';

-- Test 4: victim ELO remains unchanged at 1200
SELECT is(
    (SELECT elo FROM public.profiles WHERE id = '11111111-1111-1111-1111-111111111111'),
    1200,
    'direct client UPDATE on another user profile does NOT change ELO'
);

-- Execute direct UPDATE on own row attempting to elevate elo/is_pro
UPDATE public.profiles SET elo = 9999, is_pro = TRUE WHERE id = '22222222-2222-2222-2222-222222222222';

-- Test 5: own ELO remains unchanged at 100 (client cannot write elo/is_pro)
SELECT is(
    (SELECT elo FROM public.profiles WHERE id = '22222222-2222-2222-2222-222222222222'),
    100,
    'direct client UPDATE on own profile does NOT change ELO'
);

-- Test 6: own is_pro remains FALSE (client cannot elevate PRO status)
SELECT is(
    (SELECT is_pro FROM public.profiles WHERE id = '22222222-2222-2222-2222-222222222222'),
    FALSE,
    'direct client UPDATE on own profile does NOT change is_pro'
);

-- Execute direct DELETE attempt
DELETE FROM public.profiles WHERE id = '11111111-1111-1111-1111-111111111111';
DELETE FROM public.profiles WHERE id = '22222222-2222-2222-2222-222222222222';

-- Test 7: rows count in profiles is not decreased by client DELETE
SELECT is(
    (SELECT count(*)::INT FROM public.profiles WHERE id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')),
    2,
    'direct client DELETE does NOT delete rows from public.profiles'
);

-- ---------------------------------------------------------------------
-- 4. VERIFY TRIGGER trg_protect_profiles_is_pro ON LEGITIMATE RPCS
-- ---------------------------------------------------------------------
-- Test 8: finalize_match simulation (updates elo/xp/rank, is_pro unchanged -> trigger succeeds)
UPDATE public.profiles 
SET elo = 1216, xp = xp + 50, updated_at = pg_catalog.now() 
WHERE id = '11111111-1111-1111-1111-111111111111';
SELECT is(
    (SELECT elo FROM public.profiles WHERE id = '11111111-1111-1111-1111-111111111111'),
    1216,
    'trg_protect_profiles_is_pro does NOT block finalize_match elo update'
);

-- Test 9: claim_daily_flash_draw simulation (updates xp, is_pro unchanged -> trigger succeeds)
UPDATE public.profiles 
SET xp = xp + 50, updated_at = pg_catalog.now() 
WHERE id = '11111111-1111-1111-1111-111111111111';
SELECT is(
    (SELECT xp FROM public.profiles WHERE id = '11111111-1111-1111-1111-111111111111'),
    550,
    'trg_protect_profiles_is_pro does NOT block claim_daily_flash_draw xp update'
);

-- Test 10: migrate_my_legacy_progress simulation (updates inventory/xp, is_pro unchanged -> trigger succeeds)
UPDATE public.profiles 
SET inventory = jsonb_build_object('streak_days', 5), updated_at = pg_catalog.now() 
WHERE id = '11111111-1111-1111-1111-111111111111';
SELECT is(
    (SELECT (inventory->>'streak_days')::INT FROM public.profiles WHERE id = '11111111-1111-1111-1111-111111111111'),
    5,
    'trg_protect_profiles_is_pro does NOT block migrate_my_legacy_progress inventory update'
);

-- ---------------------------------------------------------------------
-- 5. VERIFY PUBLIC_PROFILES VIEW PROJECTION & COLUMNS
-- ---------------------------------------------------------------------
SET ROLE anon;

-- Test 11: verify exact columns exposed by public_profiles view
SELECT set_eq(
    $$SELECT column_name::text FROM information_schema.columns WHERE table_name = 'public_profiles'$$,
    ARRAY['id', 'nick', 'elo', 'rank', 'xp', 'profession', 'is_public_profile'],
    'public_profiles view exposes strictly the 7 declared public columns'
);

-- Test 12: verify created_at is NOT in public_profiles
SELECT is_empty(
    $$SELECT column_name FROM information_schema.columns WHERE table_name = 'public_profiles' AND column_name = 'created_at'$$,
    'created_at is strictly excluded from public_profiles'
);

-- Test 13: verify non-opted-in user receives pseudonymous alias
SELECT is(
    (SELECT nick FROM public.public_profiles WHERE id = '11111111-1111-1111-1111-111111111111'),
    'Operatore-' || UPPER(SUBSTRING(md5('11111111-1111-1111-1111-111111111111zeroday_salt_lead_2026') FROM 1 FOR 6)),
    'non-opted-in user receives non-reversible salted pseudonymous alias in public view'
);

-- Test 14: verify profession is masked as NULL for non-opted-in user
SELECT is(
    (SELECT profession FROM public.public_profiles WHERE id = '11111111-1111-1111-1111-111111111111'),
    NULL,
    'profession is masked as NULL when is_public_profile is false'
);

-- Test 15: is_nick_available RPC checks availability without exposing rows
SELECT is(
    public.is_nick_available('ZeroVictim'),
    FALSE,
    'is_nick_available correctly returns FALSE for existing nick'
);

SELECT * FROM finish();
ROLLBACK;
