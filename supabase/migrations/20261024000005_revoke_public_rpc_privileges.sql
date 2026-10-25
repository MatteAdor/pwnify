-- =====================================================================
-- ZERODAY PROPOSAL: RPC LEAST-PRIVILEGE LOCKDOWN & EXPLICIT ROLE GRANTS
-- Migration: 20261024000005_revoke_public_rpc_privileges.sql
-- Status: PROPOSAL FILE ONLY (DO NOT APPLY DIRECTLY TO PRODUCTION)
-- =====================================================================
-- Ref: Supabase Docs -> Hardening Database Functions & Postgres Default Privileges.
-- In PostgreSQL, functions created in the public schema grant EXECUTE to PUBLIC by default.
-- Defense-in-depth requires explicit REVOKE EXECUTE FROM PUBLIC, anon, authenticated,
-- followed by explicit GRANT only to necessary roles.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. UTILITY & CONFIGURATION (ANON & AUTHENTICATED)
-- ---------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.get_remote_app_config() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_remote_app_config() TO anon, authenticated;

REVOKE ALL ON FUNCTION public.get_server_time() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_server_time() TO anon, authenticated;

REVOKE ALL ON FUNCTION public.assert_min_client_version() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assert_min_client_version() TO anon, authenticated;

REVOKE ALL ON FUNCTION public.get_tier_from_elo(INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_tier_from_elo(INT) TO anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. GAMEPLAY, ARENA & PROGRESSION (AUTHENTICATED ONLY)
-- ---------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.is_nick_available(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_nick_available(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.find_or_create_match() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_or_create_match() TO authenticated;

REVOKE ALL ON FUNCTION public.poll_matchmaking() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.poll_matchmaking() TO authenticated;

REVOKE ALL ON FUNCTION public.submit_answer(UUID, UUID, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_answer(UUID, UUID, INT) TO authenticated;

REVOKE ALL ON FUNCTION public.finalize_match(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_match(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.forfeit_match(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.forfeit_match(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.migrate_my_legacy_progress(JSONB, TEXT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.migrate_my_legacy_progress(JSONB, TEXT, INT) TO authenticated;

REVOKE ALL ON FUNCTION public.record_user_streak_activity(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_user_streak_activity(TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.claim_daily_flash_draw(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_daily_flash_draw(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.activate_license_key(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_license_key(TEXT) TO authenticated;

-- ---------------------------------------------------------------------
-- 3. PRO LICENSE & BILLING FULFILLMENT (SERVICE_ROLE ONLY)
-- ---------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.set_profile_pro_status FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_profile_pro_status TO service_role;
