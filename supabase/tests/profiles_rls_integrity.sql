-- =====================================================================
-- ZERODAY DATABASE TEST SUITE: PROFILES RLS & SECURITY AUDIT (pgTAP)
-- File: supabase/tests/profiles_rls_integrity.sql
-- Status: TEST SPECIFICATION ONLY (DO NOT RUN IN PRODUCTION WRITE MODE)
-- =====================================================================

BEGIN;
SELECT plan(22);

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
ON CONFLICT (id) DO UPDATE SET nick = EXCLUDED.nick, elo = EXCLUDED.elo, xp = EXCLUDED.xp;

-- ---------------------------------------------------------------------
-- 2. VERIFY ANON PERMISSIONS (Default Deny & RLS Lockdown)
-- ---------------------------------------------------------------------
SET ROLE anon;

-- Test 1: anon INSERT must raise error 42501
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

-- Test 3: anon EXECUTE on is_nick_available is denied (authenticated only)
SELECT throws_ok(
    $$SELECT public.is_nick_available('testnick')$$,
    '42501',
    NULL,
    'anon is denied EXECUTE on is_nick_available (requires authenticated role)'
);

-- Test 4: anon CAN execute public utilities (get_server_time)
SELECT lives_ok(
    'SELECT public.get_server_time()',
    'anon is permitted EXECUTE on get_server_time utility RPC'
);

-- ---------------------------------------------------------------------
-- 3. VERIFY AUTHENTICATED MUTATIONS (State Immutability: Rows Do Not Change)
-- ---------------------------------------------------------------------
SET ROLE authenticated;
SET request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

-- Test 5: direct INSERT by authenticated raises error (permission denied)
SELECT throws_ok(
    $$INSERT INTO public.profiles (id, nick) VALUES ('44444444-4444-4444-4444-444444444444', 'AttackerAlt')$$,
    '42501',
    NULL,
    'authenticated is strictly denied direct INSERT into public.profiles'
);

-- Test 6a: direct UPDATE by authenticated cannot elevate is_pro (strictly denied by table revoke 42501)
SELECT throws_ok(
    $$UPDATE public.profiles SET elo = 9999, is_pro = TRUE WHERE id = '22222222-2222-2222-2222-222222222222'$$,
    '42501',
    NULL,
    'authenticated direct UPDATE on public.profiles is strictly denied'
);
-- Test 6b: verify is_pro remains FALSE
SELECT is(
    (SELECT is_pro FROM public.profiles WHERE id = '22222222-2222-2222-2222-222222222222'),
    FALSE,
    'authenticated direct UPDATE cannot elevate is_pro (remains FALSE)'
);

-- Test 7: direct DELETE does not decrease row count
SELECT throws_ok(
    $$DELETE FROM public.profiles WHERE id = '22222222-2222-2222-2222-222222222222'$$,
    '42501',
    NULL,
    'authenticated direct DELETE on public.profiles is strictly denied'
);

-- ---------------------------------------------------------------------
-- 4. PRO LICENSE REDEMPTION & SERVICE_ROLE ISOLATION
-- ---------------------------------------------------------------------
-- Test 8: authenticated user cannot execute set_profile_pro_status directly
SELECT throws_ok(
    $$SELECT public.set_profile_pro_status('22222222-2222-2222-2222-222222222222'::UUID, TRUE)$$,
    '42501',
    NULL,
    'authenticated user cannot execute set_profile_pro_status directly'
);

-- Switch to service_role to simulate legitimate Edge Function webhook execution
SET ROLE service_role;

-- Test 9: valid key redemption updates is_pro to TRUE
SELECT public.set_profile_pro_status(
    '22222222-2222-2222-2222-222222222222'::UUID,
    TRUE,
    'valid_hash_abc123'
);
SELECT is(
    (SELECT is_pro FROM public.profiles WHERE id = '22222222-2222-2222-2222-222222222222'),
    TRUE,
    'service_role successfully updates is_pro = TRUE on valid license redemption'
);

-- Test 10: invalid/revoked key leaves or sets is_pro to FALSE
SELECT public.set_profile_pro_status(
    '22222222-2222-2222-2222-222222222222'::UUID,
    FALSE,
    'revoked_hash_abc123'
);
SELECT is(
    (SELECT is_pro FROM public.profiles WHERE id = '22222222-2222-2222-2222-222222222222'),
    FALSE,
    'service_role sets is_pro = FALSE upon invalid or revoked license status'
);

-- ---------------------------------------------------------------------
-- 5. TRIGGER trg_protect_profiles_is_pro CURRENT_USER SECURITY
-- ---------------------------------------------------------------------
-- Definer simulation: runs under definer role (postgres), validating trigger allows legitimate internal updates
RESET ROLE;

-- Test 11: finalize_match simulation does NOT alter is_pro and succeeds
UPDATE public.profiles 
SET elo = 1216, xp = xp + 50, updated_at = pg_catalog.now() 
WHERE id = '11111111-1111-1111-1111-111111111111';
SELECT is(
    (SELECT elo FROM public.profiles WHERE id = '11111111-1111-1111-1111-111111111111'),
    1216,
    'trg_protect_profiles_is_pro does NOT block finalize_match elo update'
);

-- Test 12: claim_daily_flash_draw simulation succeeds without touching is_pro
UPDATE public.profiles 
SET xp = xp + 50, updated_at = pg_catalog.now() 
WHERE id = '11111111-1111-1111-1111-111111111111';
SELECT is(
    (SELECT xp FROM public.profiles WHERE id = '11111111-1111-1111-1111-111111111111'),
    550,
    'trg_protect_profiles_is_pro does NOT block claim_daily_flash_draw xp update'
);

-- Test 13: trigger blocks is_pro elevation when authenticated has temporary UPDATE privilege
RESET ROLE;
GRANT UPDATE ON public.profiles TO authenticated;
CREATE POLICY "p_test_trg_update" ON public.profiles FOR UPDATE TO authenticated USING (true);

SET ROLE authenticated;
SET request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

SELECT throws_ok(
    $$UPDATE public.profiles SET is_pro = TRUE WHERE id = '22222222-2222-2222-2222-222222222222'$$,
    '42501',
    'Access denied: profiles.is_pro is server-authoritative and can only be modified by the service_role.',
    'trg_protect_profiles_is_pro explicitly blocks is_pro update when UPDATE privilege is granted'
);

RESET ROLE;
DROP POLICY IF EXISTS "p_test_trg_update" ON public.profiles;
REVOKE UPDATE ON public.profiles FROM authenticated;

-- ---------------------------------------------------------------------
-- 6. RESTRICTIVE POLICY VERSION ENFORCEMENT (SQLSTATE PT426)
-- ---------------------------------------------------------------------
-- Insert active android version requirement in app_versions as superuser
INSERT INTO public.app_versions (platform, min_supported_version_code, min_supported_version, latest_version, store_url, kill_switch)
VALUES ('android', 100, '2.0.0', '2.0.0', 'https://zeroday.gg', FALSE)
ON CONFLICT (platform) DO UPDATE SET min_supported_version_code = 100, kill_switch = FALSE;

SET ROLE authenticated;
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

-- Simulate outdated client headers (x-build: 50 < 100)
SELECT set_config('request.headers', '{"x-platform": "android", "x-build": "50"}', true);

-- Test 13: outdated android client query raises SQLSTATE PT426
SELECT throws_ok(
    $$SELECT * FROM public.profiles$$,
    'PT426',
    NULL,
    'query raises SQLSTATE PT426 (Upgrade Required) when client x-build is below minimum'
);

-- Reset headers for remaining tests
SELECT set_config('request.headers', '', true);

-- ---------------------------------------------------------------------
-- 7. PUBLIC_PROFILES PROJECTION & ALIAS INTEGRITY
-- ---------------------------------------------------------------------
SET ROLE anon;

-- Test 14: public_profiles exposes strictly the 7 declared columns
SELECT set_eq(
    $$SELECT column_name::text FROM information_schema.columns WHERE table_name = 'public_profiles'$$,
    ARRAY['id', 'nick', 'elo', 'rank', 'xp', 'profession', 'is_public_profile'],
    'public_profiles view exposes strictly the 7 declared public columns'
);

-- Test 15: created_at is strictly excluded from public_profiles
SELECT is_empty(
    $$SELECT column_name FROM information_schema.columns WHERE table_name = 'public_profiles' AND column_name = 'created_at'$$,
    'created_at is strictly excluded from public_profiles'
);

-- Test 16: non-opted-in user receives salted hash alias
SELECT is(
    (SELECT nick FROM public.public_profiles WHERE id = '11111111-1111-1111-1111-111111111111'),
    'Operatore-' || UPPER(SUBSTRING(md5('11111111-1111-1111-1111-111111111111zeroday_salt_lead_2026') FROM 1 FOR 6)),
    'non-opted-in user receives stable salted pseudonymous alias in public view'
);

-- Test 17: profession is masked as NULL for non-opted-in user
SELECT is(
    (SELECT profession FROM public.public_profiles WHERE id = '11111111-1111-1111-1111-111111111111'),
    NULL,
    'profession is masked as NULL when is_public_profile is false'
);

-- Test 18: authenticated user can query is_nick_available
SET ROLE authenticated;
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SELECT is(
    public.is_nick_available('ZeroVictim'),
    FALSE,
    'authenticated user can query is_nick_available (returns FALSE for taken nick)'
);

-- ---------------------------------------------------------------------
-- 8. FUNCTION PRIVILEGE PERIMETER AUDIT (has_function_privilege)
-- ---------------------------------------------------------------------
-- Test 21: anon core RPC execution permissions
SELECT set_eq(
    $$
    SELECT proname
    FROM (
        VALUES 
            ('claim_daily_flash_draw(text)'),
            ('find_or_create_match()'),
            ('submit_answer(uuid,uuid,integer)'),
            ('forfeit_match(uuid)'),
            ('migrate_my_legacy_progress(integer,jsonb,text)'),
            ('record_user_streak_activity(text,uuid)'),
            ('update_my_profile_preferences(text,text,boolean,boolean)'),
            ('update_my_inventory_cosmetics(jsonb)'),
            ('is_nick_available(text)'),
            ('set_profile_pro_status(uuid,boolean,text,text,text,text,text,timestamptz)'),
            ('get_server_time()')
    ) AS rpcs(proname)
    WHERE has_function_privilege('anon', 'public.' || proname, 'EXECUTE')
    $$,
    $$ VALUES ('get_server_time()') $$,
    'among core RPCs, anon has EXECUTE strictly on get_server_time'
);

-- Test 22: authenticated core RPC execution permissions
SELECT set_eq(
    $$
    SELECT proname
    FROM (
        VALUES 
            ('claim_daily_flash_draw(text)'),
            ('find_or_create_match()'),
            ('submit_answer(uuid,uuid,integer)'),
            ('forfeit_match(uuid)'),
            ('migrate_my_legacy_progress(integer,jsonb,text)'),
            ('record_user_streak_activity(text,uuid)'),
            ('update_my_profile_preferences(text,text,boolean,boolean)'),
            ('update_my_inventory_cosmetics(jsonb)'),
            ('is_nick_available(text)'),
            ('set_profile_pro_status(uuid,boolean,text,text,text,text,text,timestamptz)'),
            ('get_server_time()')
    ) AS rpcs(proname)
    WHERE has_function_privilege('authenticated', 'public.' || proname, 'EXECUTE')
    $$,
    $$ VALUES 
        ('claim_daily_flash_draw(text)'),
        ('find_or_create_match()'),
        ('submit_answer(uuid,uuid,integer)'),
        ('forfeit_match(uuid)'),
        ('migrate_my_legacy_progress(integer,jsonb,text)'),
        ('record_user_streak_activity(text,uuid)'),
        ('update_my_profile_preferences(text,text,boolean,boolean)'),
        ('update_my_inventory_cosmetics(jsonb)'),
        ('is_nick_available(text)'),
        ('get_server_time()')
    $$,
    'among core RPCs, authenticated has EXECUTE on all client RPCs except service_role set_profile_pro_status'
);

SELECT * FROM finish();
ROLLBACK;
