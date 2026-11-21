-- =====================================================================
-- PWNIFY CONTRACT (PROPOSAL, NOT APPLIED): PROFILES PRIVILEGED COLUMNS & PHASE C READ SCOPE
-- File: supabase/contract/20261121000001_contract_profiles_privileged_columns.sql
-- Status: CONTRACT PHASE, review only. Do NOT run `supabase db push` / apply
--         automatically. Apply manually after verifying on staging, and only once
--         all supported clients read other users exclusively through
--         public.public_profiles (true for the current web/APK code).
--         Note: CI (ci.yml, db-tests.yml) applies every supabase/contract/*.sql to an
--         ephemeral local Postgres only, so the pgTAP suites exercise it; that is not
--         an apply to the remote project.
--
-- Goals:
--   1. Clients (anon / authenticated via PostgREST) can never INSERT, UPDATE or
--      DELETE rows of public.profiles directly, not even their own.
--   2. Privileged columns (is_pro, xp, elo, rank, flagged, legacy_imported,
--      matchmaking_cooldown_until, last_ranked_at, nick, nick_updated_at, id)
--      can change only via service_role or SECURITY DEFINER RPCs that carry their
--      own checks (current_user is then the function owner, not anon/authenticated).
--   3. Phase C: anon can no longer SELECT the base table; authenticated users read
--      only their own row. Everyone else's data goes through public.public_profiles
--      (pseudonymised nick, opt-in profession).
--   4. Bound the free-text profession written by update_my_profile_preferences.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Table-level privileges: no direct client writes on profiles
--    (Supabase grants ALL on public tables to anon/authenticated by default;
--     today only the absence of permissive write policies blocks writes.)
-- ---------------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.profiles FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Defense in depth: guard privileged columns on INSERT and UPDATE
--    current_user is 'anon'/'authenticated' only for direct PostgREST calls;
--    inside SECURITY DEFINER functions it is the function owner, so the vetted
--    RPCs (submit_answer, finalize_match*, claim_daily_flash_draw,
--    import_legacy_progress, update_my_profile_preferences, set_profile_pro_status, ...)
--    keep working.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_profiles_privileged_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    IF current_user NOT IN ('anon', 'authenticated') THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        -- Profiles are created by the handle_new_user() trigger; a direct client
        -- insert may only create its own row with server defaults.
        IF NEW.id IS DISTINCT FROM auth.uid() THEN
            RAISE EXCEPTION 'Access denied: cannot create a profile for another user' USING ERRCODE = '42501';
        END IF;
        NEW.is_pro := FALSE;
        NEW.xp := 0;
        NEW.elo := 100;
        NEW.rank := 'Script Kiddie';
        NEW.flagged := FALSE;
        NEW.legacy_imported := FALSE;
        NEW.matchmaking_cooldown_until := NULL;
        NEW.last_ranked_at := NULL;
        RETURN NEW;
    END IF;

    -- UPDATE
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.is_pro IS DISTINCT FROM OLD.is_pro
       OR NEW.xp IS DISTINCT FROM OLD.xp
       OR NEW.elo IS DISTINCT FROM OLD.elo
       OR NEW.rank IS DISTINCT FROM OLD.rank
       OR NEW.flagged IS DISTINCT FROM OLD.flagged
       OR NEW.legacy_imported IS DISTINCT FROM OLD.legacy_imported
       OR NEW.matchmaking_cooldown_until IS DISTINCT FROM OLD.matchmaking_cooldown_until
       OR NEW.last_ranked_at IS DISTINCT FROM OLD.last_ranked_at
       OR NEW.nick IS DISTINCT FROM OLD.nick
       OR NEW.nick_updated_at IS DISTINCT FROM OLD.nick_updated_at
    THEN
        RAISE EXCEPTION 'Access denied: privileged profile columns are server-authoritative' USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_profiles_privileged_columns() FROM PUBLIC, anon, authenticated;

-- Name sorts after trg_protect_profiles_is_pro, so for is_pro changes the
-- existing trigger fires first and keeps its error message (pgTAP relies on it).
DROP TRIGGER IF EXISTS trg_protect_profiles_privileged_columns ON public.profiles;
CREATE TRIGGER trg_protect_profiles_privileged_columns
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.guard_profiles_privileged_columns();

-- Keep the existing is_pro trigger (auth.role() based): it also blocks is_pro
-- changes from SECURITY DEFINER RPCs invoked by end users. Only service_role
-- (Edge Functions) and postgres can toggle is_pro via set_profile_pro_status.

-- ---------------------------------------------------------------------
-- 3. Phase C: restrict base-table reads
-- ---------------------------------------------------------------------
REVOKE SELECT ON public.profiles FROM anon;

DROP POLICY IF EXISTS "profiles_read_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_read_own" ON public.profiles;
CREATE POLICY "profiles_read_own" ON public.profiles
    FOR SELECT TO authenticated
    USING (id = (SELECT auth.uid()));

-- public.public_profiles keeps working for anon/authenticated: it is a
-- non-security_invoker view owned by postgres and exposes only
-- id, pseudonymised nick, elo, rank, xp, opt-in profession, is_public_profile.
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. Bound free-text profession (update_my_profile_preferences writes it unchecked)
--    NOT VALID: does not fail on legacy rows; run VALIDATE CONSTRAINT after cleanup.
-- ---------------------------------------------------------------------
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_profession_len;
ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_profession_len
    CHECK (profession IS NULL OR pg_catalog.char_length(profession) <= 60) NOT VALID;

COMMIT;
