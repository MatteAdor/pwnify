-- =====================================================================
-- ZERODAY PROPOSAL: RPC LEAST-PRIVILEGE LOCKDOWN & EXECUTE REVOCATION
-- Migration: 20261024000005_revoke_public_rpc_privileges.sql
-- Status: PROPOSAL FILE ONLY (DO NOT APPLY DIRECTLY TO PRODUCTION)
-- =====================================================================
-- Ensures that all state-mutating PostgreSQL RPCs have EXECUTE revoked
-- from PUBLIC and anon, granting execution strictly to authenticated or service_role.
-- =====================================================================

-- 1. Matchmaking & Ranked System Functions
REVOKE ALL ON FUNCTION public.finalize_match(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalize_match(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.forfeit_match(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.forfeit_match(UUID) TO authenticated;

-- 2. Legacy Migration Functions
REVOKE ALL ON FUNCTION public.migrate_my_legacy_progress(JSONB, TEXT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.migrate_my_legacy_progress(JSONB, TEXT, INT) TO authenticated;

-- 3. Streak & Daily Flash Functions
REVOKE ALL ON FUNCTION public.record_user_streak_activity(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_user_streak_activity(TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.claim_daily_flash_draw(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_daily_flash_draw(TEXT) TO authenticated;

-- 4. Utility Checks (Nick Availability is read-only, safe for anon/authenticated)
GRANT EXECUTE ON FUNCTION public.is_nick_available(TEXT) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.is_nick_available(TEXT) FROM PUBLIC;

-- 5. Pro Status Modification (Strictly service_role)
REVOKE ALL ON FUNCTION public.set_profile_pro_status FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_profile_pro_status TO service_role;
