-- =====================================================================
-- ZERODAY PROPOSAL: RPC LEAST-PRIVILEGE LOCKDOWN & EXPLICIT ROLE GRANTS
-- Migration: 20261024000005_revoke_public_rpc_privileges.sql
-- Status: PROPOSAL FILE ONLY (DO NOT APPLY DIRECTLY TO PRODUCTION)
-- =====================================================================
-- Replaces blanket function access with an explicit, role-by-role privilege matrix:
-- 1. PUBLIC/ANON access is restricted strictly to read-only app configuration,
--    server timestamp synchronization, and version enforcement checks.
-- 2. AUTHENTICATED access is granted strictly to gameplay, matchmaking, and streak RPCs.
-- 3. SERVICE_ROLE access is reserved exclusively for payment webhook fulfillment and license sync.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. UTILITY & CONFIGURATION (ANON & AUTHENTICATED)
-- ---------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.get_remote_app_config() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_remote_app_config() TO anon, authenticated;

REVOKE ALL ON FUNCTION public.get_server_time() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_server_time() TO anon, authenticated;

REVOKE ALL ON FUNCTION public.assert_min_client_version() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assert_min_client_version() TO anon, authenticated;

REVOKE ALL ON FUNCTION public.get_tier_from_elo(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_tier_from_elo(INT) TO anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. GAMEPLAY, ARENA & PROGRESSION (AUTHENTICATED ONLY)
-- ---------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.is_nick_available(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_nick_available(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.find_or_create_match() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_or_create_match() TO authenticated;

REVOKE ALL ON FUNCTION public.poll_matchmaking() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.poll_matchmaking() TO authenticated;

REVOKE ALL ON FUNCTION public.submit_answer(UUID, UUID, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_answer(UUID, UUID, INT) TO authenticated;

REVOKE ALL ON FUNCTION public.finalize_match(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalize_match(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.forfeit_match(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.forfeit_match(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.migrate_my_legacy_progress(JSONB, TEXT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.migrate_my_legacy_progress(JSONB, TEXT, INT) TO authenticated;

REVOKE ALL ON FUNCTION public.record_user_streak_activity(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_user_streak_activity(TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.claim_daily_flash_draw(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_daily_flash_draw(TEXT) TO authenticated;

-- ---------------------------------------------------------------------
-- 3. PRO LICENSE & BILLING FULFILLMENT (SERVICE_ROLE ONLY)
-- ---------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.set_profile_pro_status FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_profile_pro_status TO service_role;
