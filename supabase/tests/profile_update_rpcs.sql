-- =====================================================================
-- ZERODAY DATABASE TEST SUITE: PROFILE & COSMETICS RPCS (pgTAP)
-- File: supabase/tests/profile_update_rpcs.sql
-- Status: TEST SPECIFICATION ONLY (DO NOT RUN IN PRODUCTION WRITE MODE)
-- =====================================================================

BEGIN;
SELECT plan(8);

-- Setup test user
INSERT INTO auth.users (id, email) VALUES ('55555555-5555-5555-5555-555555555555', 'nicktest@zeroday.local')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, nick, elo, rank, xp, inventory) VALUES
    ('55555555-5555-5555-5555-555555555555', 'OriginalNick', 100, 'Script Kiddie', 0, '{"streak_days": 3}'::jsonb)
ON CONFLICT (id) DO UPDATE SET nick = 'OriginalNick', inventory = '{"streak_days": 3}'::jsonb;

SET ROLE authenticated;
SET request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';
SELECT set_config('request.jwt.claims', '{"sub": "55555555-5555-5555-5555-555555555555", "role": "authenticated"}', true);

-- Test 1: update_my_profile_preferences rejects reserved prefix "Operatore-"
SELECT throws_ok(
    $$SELECT public.update_my_profile_preferences('Operatore-Fake')$$,
    '22023',
    NULL,
    'update_my_profile_preferences rejects prefix "Operatore-"'
);

-- Test 2: update_my_profile_preferences rejects reserved system handle "admin"
SELECT throws_ok(
    $$SELECT public.update_my_profile_preferences('admin')$$,
    '22023',
    NULL,
    'update_my_profile_preferences rejects reserved name "admin"'
);

-- Test 3: update_my_profile_preferences succeeds with valid clean nickname
SELECT lives_ok(
    $$SELECT public.update_my_profile_preferences('CyberHunter_99', 'SecOps', TRUE, FALSE)$$,
    'update_my_profile_preferences succeeds for valid alphanumeric nick'
);

-- Test 4: update_my_profile_preferences rejects immediate second nick change within 7 days
SELECT throws_ok(
    $$SELECT public.update_my_profile_preferences('CyberHunter_100')$$,
    '22023',
    NULL,
    'update_my_profile_preferences enforces 7-day cooldown on nickname modification'
);

-- Test 5: update_my_inventory_cosmetics rejects disallowed key (e.g. attempting to tamper streak_days)
SELECT throws_ok(
    $$SELECT public.update_my_inventory_cosmetics('{"streak_days": 99}'::jsonb)$$,
    '42501',
    NULL,
    'update_my_inventory_cosmetics strictly rejects non-allowlisted key streak_days'
);

-- Test 6: update_my_inventory_cosmetics rejects oversized cosmetic string (> 32 chars)
SELECT throws_ok(
    $$SELECT public.update_my_inventory_cosmetics('{"hacker_card_frame": "frame_exceeding_the_thirty_two_char_limit_12345"}'::jsonb)$$,
    '22023',
    NULL,
    'update_my_inventory_cosmetics rejects cosmetic string exceeding max length'
);

-- Test 7: update_my_inventory_cosmetics succeeds with valid allowlisted keys
SELECT lives_ok(
    $$SELECT public.update_my_inventory_cosmetics('{"hacker_card_frame": "frame_neon_matrix", "theme": "cyber_dark"}'::jsonb)$$,
    'update_my_inventory_cosmetics succeeds with valid allowlisted cosmetics'
);

-- Test 8: verify inventory merge preserves server-managed streak_days
RESET ROLE;
SELECT is(
    (SELECT (inventory->>'streak_days')::INT FROM public.profiles WHERE id = '55555555-5555-5555-5555-555555555555'),
    3,
    'inventory cosmetics update preserves preexisting server-managed streak_days'
);

SELECT * FROM finish();
ROLLBACK;
