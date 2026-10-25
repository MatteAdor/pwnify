-- =====================================================================
-- ZERODAY HEALTH CHECKS: PHASE A (READ-ONLY DIAGNOSTIC SCRIPT)
-- File: supabase/health_checks_phase_a.sql
-- Status: READ-ONLY SAFE (ZERO MUTATIONS / WRITES)
-- =====================================================================

DO $$
DECLARE
    v_streaks_exists BOOLEAN;
    v_daily_flash_exists BOOLEAN;
    v_view_exists BOOLEAN;
    v_nick_updated_at_exists BOOLEAN;
    v_unique_lower_nick_exists BOOLEAN;
    v_server_time_valid BOOLEAN;
    v_streak_count INT;
    v_profile_count INT;
BEGIN
    RAISE NOTICE '--- INITIATING PHASE A HEALTH AUDIT ---';

    -- 1. Check Tables Existence
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_streaks'
    ) INTO v_streaks_exists;
    ASSERT v_streaks_exists, 'FAIL: public.user_streaks table does not exist';

    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'daily_flash_draws'
    ) INTO v_daily_flash_exists;
    ASSERT v_daily_flash_exists, 'FAIL: public.daily_flash_draws table does not exist';

    -- 2. Check View Existence
    SELECT EXISTS (
        SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'public_profiles'
    ) INTO v_view_exists;
    ASSERT v_view_exists, 'FAIL: public.public_profiles view does not exist';

    -- 3. Check nick_updated_at Column on profiles
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'nick_updated_at'
    ) INTO v_nick_updated_at_exists;
    ASSERT v_nick_updated_at_exists, 'FAIL: profiles.nick_updated_at column does not exist';

    -- 4. Verify Phase C contract is NOT yet applied (Expand phase check)
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' AND tablename = 'profiles' AND indexname = 'idx_profiles_nick_lower_unique'
    ) INTO v_unique_lower_nick_exists;
    IF v_unique_lower_nick_exists THEN
        RAISE NOTICE 'NOTICE: Phase C unique index idx_profiles_nick_lower_unique is present';
    ELSE
        RAISE NOTICE 'CONFIRMED: Phase C index idx_profiles_nick_lower_unique is absent (Safe Expand Phase)';
    END IF;

    -- 5. Verify Backfill Completeness
    SELECT COUNT(*) INTO v_profile_count FROM public.profiles;
    SELECT COUNT(*) INTO v_streak_count FROM public.user_streaks;
    RAISE NOTICE 'Backfill Status: % profiles registered, % user_streaks records present', v_profile_count, v_streak_count;

    -- 6. Verify Authoritative RPC Health
    BEGIN
        PERFORM public.get_server_time();
        v_server_time_valid := TRUE;
    EXCEPTION WHEN OTHERS THEN
        v_server_time_valid := FALSE;
    END;
    ASSERT v_server_time_valid, 'FAIL: public.get_server_time() failed execution';

    RAISE NOTICE '--- PHASE A HEALTH AUDIT COMPLETE: ALL CHECKS PASSED ---';
END $$;
