-- =====================================================================
-- ZERODAY PRO LICENSE SYSTEM — pgTAP TEST SUITE
-- File: supabase/tests/pro_license_system.sql
-- =====================================================================
BEGIN;
SELECT plan(11);

-- Setup mock users in auth.users
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'user1@zeroday.gg', '{"callsign": "hacker1"}'::jsonb),
    ('22222222-2222-2222-2222-222222222222', 'user2@zeroday.gg', '{"callsign": "hacker2"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Ensure profiles exist
INSERT INTO public.profiles (id, nick, elo, is_pro)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'hacker1', 1000, FALSE),
    ('22222222-2222-2222-2222-222222222222', 'hacker2', 1000, FALSE)
ON CONFLICT (id) DO UPDATE SET is_pro = FALSE;

-- Test 1: Verify is_pro column exists on public.profiles
SELECT has_column('public', 'profiles', 'is_pro', 'Column profiles.is_pro exists');

-- Test 2: Verify default value of is_pro is false
SELECT is(
    (SELECT is_pro FROM public.profiles WHERE id = '11111111-1111-1111-1111-111111111111'),
    FALSE,
    'Profile is_pro defaults to FALSE'
);

-- Test 3: Authenticated user cannot update profiles via default RLS (0 rows updated)
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

SELECT throws_ok(
    $$ UPDATE public.profiles SET is_pro = TRUE WHERE id = '11111111-1111-1111-1111-111111111111' $$,
    '42501',
    NULL,
    'Authenticated user update blocked on profiles (permission denied)'
);

SELECT is(
    (SELECT is_pro FROM public.profiles WHERE id = '11111111-1111-1111-1111-111111111111'),
    FALSE,
    'Authenticated user update blocked by default RLS (is_pro remains FALSE)'
);

-- Test 4: Trigger protect_profiles_is_pro explicitly rejects is_pro update even if an UPDATE policy exists
RESET ROLE;
GRANT UPDATE ON public.profiles TO authenticated;
CREATE POLICY "test_profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

SELECT throws_ok(
    $$ UPDATE public.profiles SET is_pro = TRUE WHERE id = '11111111-1111-1111-1111-111111111111' $$,
    '42501',
    'Access denied: profiles.is_pro is server-authoritative and can only be modified by the service_role.',
    'Trigger protect_profiles_is_pro explicitly blocks authenticated user from modifying is_pro'
);

RESET ROLE;
DROP POLICY IF EXISTS "test_profiles_update_own" ON public.profiles;
REVOKE UPDATE ON public.profiles FROM authenticated;

-- Test 5: Authenticated user CANNOT execute set_profile_pro_status RPC
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

SELECT throws_ok(
    $$ SELECT public.set_profile_pro_status('11111111-1111-1111-1111-111111111111'::uuid, TRUE) $$,
    '42501',
    NULL,
    'Authenticated user cannot execute set_profile_pro_status'
);

-- Test 6: Anon user CANNOT execute set_profile_pro_status RPC
SET LOCAL ROLE anon;
SET LOCAL "request.jwt.claims" = '{"role": "anon"}';

SELECT throws_ok(
    $$ SELECT public.set_profile_pro_status('11111111-1111-1111-1111-111111111111'::uuid, TRUE) $$,
    '42501',
    NULL,
    'Anon user cannot execute set_profile_pro_status'
);

-- Test 7: service_role CAN execute set_profile_pro_status and successfully activate PRO
SET LOCAL ROLE service_role;
SET LOCAL "request.jwt.claims" = '{"role": "service_role"}';

SELECT lives_ok(
    $$ SELECT public.set_profile_pro_status(
        '11111111-1111-1111-1111-111111111111'::uuid, 
        TRUE, 
        'hash_abc123', 
        'ord_999', 
        'sub_888', 
        'cust_777', 
        'inst_user1'
    ) $$,
    'service_role can execute set_profile_pro_status successfully'
);

-- Test 8: Verify profile is now TRUE
SELECT is(
    (SELECT is_pro FROM public.profiles WHERE id = '11111111-1111-1111-1111-111111111111'),
    TRUE,
    'Profile is_pro is now TRUE after service_role update'
);

-- Test 9: Verify user_licenses record was upserted
SELECT is(
    (SELECT status FROM public.user_licenses WHERE user_id = '11111111-1111-1111-1111-111111111111' AND license_key_hash = 'hash_abc123'),
    'active',
    'User license was upserted with active status'
);

-- Test 10: User 2 CANNOT read User 1 licenses via RLS
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

SELECT is(
    (SELECT count(*)::int FROM public.user_licenses WHERE user_id = '11111111-1111-1111-1111-111111111111'),
    0,
    'User 2 cannot see User 1 licenses through RLS'
);

SELECT * FROM finish();
ROLLBACK;
