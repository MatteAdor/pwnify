-- =====================================================================
-- ZERODAY CONTRACT: LEAST-PRIVILEGE ROLE ENFORCEMENT & TRIGGER HARDENING
-- Migration: 20261024000006_contract_revoke_privileges.sql
-- Status: CONTRACT PHASE (PERIMETER REVOKES & ROLE AUDIT)
-- =====================================================================

-- 1. Hardened Trigger on profiles.is_pro checking current_user
CREATE OR REPLACE FUNCTION public.protect_profiles_is_pro()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_pro IS DISTINCT FROM OLD.is_pro THEN
        IF current_user IN ('anon', 'authenticated') THEN
            RAISE EXCEPTION 'Access denied: profiles.is_pro is server-authoritative and can only be modified by the service_role.'
                USING ERRCODE = '42501';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = '';

DROP TRIGGER IF EXISTS trg_protect_profiles_is_pro ON public.profiles;
CREATE TRIGGER trg_protect_profiles_is_pro
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profiles_is_pro();

-- 2. Revoke table update and delete from untrusted client roles
REVOKE DELETE, UPDATE ON public.profiles FROM anon, authenticated;

-- 3. Revoke execute on sensitive RPCs from PUBLIC and anon
REVOKE EXECUTE ON FUNCTION public.claim_daily_flash_draw(TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.find_or_create_match() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.submit_answer(UUID, UUID, INT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.forfeit_match(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.migrate_my_legacy_progress(INT, JSONB, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.record_user_streak_activity(TEXT, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_my_profile_preferences(TEXT, TEXT, BOOLEAN, BOOLEAN) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_my_inventory_cosmetics(JSONB) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_nick_available(TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_profile_pro_status(UUID, BOOLEAN, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;

-- 4. Explicit least-privilege grants
GRANT EXECUTE ON FUNCTION public.claim_daily_flash_draw(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_or_create_match() TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_answer(UUID, UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.forfeit_match(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.migrate_my_legacy_progress(INT, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_user_streak_activity(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_my_profile_preferences(TEXT, TEXT, BOOLEAN, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_my_inventory_cosmetics(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_nick_available(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_server_time() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_profile_pro_status(UUID, BOOLEAN, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) TO service_role;
