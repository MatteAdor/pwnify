-- =====================================================================
-- ZERODAY APPLICATION VERSIONING & FORCE UPDATE (HTTP 426)
-- Migration: 20261019000005_app_versions_and_upgrade_required.sql
-- Enforces server-side minimum version validation via PostgreSQL RLS & RPC
-- using PostgREST SQLSTATE 'PT426' custom HTTP status mapping.
-- =====================================================================

-- 1. APP_VERSIONS TABLE (Remote Configuration)
CREATE TABLE IF NOT EXISTS public.app_versions (
    platform TEXT PRIMARY KEY, -- 'android', 'ios', 'web'
    latest_version TEXT NOT NULL DEFAULT '1.2.1',
    latest_version_code INT NOT NULL DEFAULT 1,
    min_supported_version TEXT NOT NULL DEFAULT '0.0.0',
    min_supported_version_code INT NOT NULL DEFAULT 0,
    force_message JSONB NOT NULL DEFAULT '{"it": "Aggiornamento di sicurezza critico richiesto per accedere a ZeroDay.", "en": "Critical security and protocol update required to access ZeroDay."}'::jsonb,
    store_url TEXT NOT NULL DEFAULT 'https://play.google.com/store/apps/details?id=com.zeroday.academy',
    apk_download_url TEXT NOT NULL DEFAULT 'https://zeroday.academy/downloads/zeroday.apk',
    apk_sha256 TEXT,
    apk_hashes JSONB NOT NULL DEFAULT '{}'::jsonb,
    rollout_percent INT NOT NULL DEFAULT 100 CHECK (rollout_percent >= 0 AND rollout_percent <= 100),
    kill_switch BOOLEAN NOT NULL DEFAULT FALSE,
    changelog JSONB DEFAULT '{"it": ["Nuovo sistema di aggiornamento in-app", "Supporto PvP a bassa latenza Metered TURN", "Protezione anti-cheat rafforzata"], "en": ["New in-app update mechanism", "Low-latency Metered TURN PvP support", "Hardened anti-cheat engine"]}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

-- Seed initial android row (min_supported_version_code = 0 for backward compatibility with live clients)
INSERT INTO public.app_versions (
    platform,
    latest_version,
    latest_version_code,
    min_supported_version,
    min_supported_version_code,
    store_url,
    apk_download_url,
    apk_sha256,
    apk_hashes,
    rollout_percent,
    kill_switch
) VALUES (
    'android',
    '1.2.1',
    1,
    '0.0.0',
    0,
    'https://play.google.com/store/apps/details?id=com.zeroday.academy',
    'https://zeroday.academy/downloads/zeroday.apk',
    NULL,
    '{}'::jsonb,
    100,
    FALSE
) ON CONFLICT (platform) DO UPDATE SET
    latest_version = EXCLUDED.latest_version,
    latest_version_code = EXCLUDED.latest_version_code,
    min_supported_version = EXCLUDED.min_supported_version,
    min_supported_version_code = EXCLUDED.min_supported_version_code,
    store_url = EXCLUDED.store_url,
    apk_download_url = EXCLUDED.apk_download_url,
    apk_hashes = EXCLUDED.apk_hashes,
    updated_at = pg_catalog.now();

-- Enable RLS on app_versions
ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read of app_versions" ON public.app_versions;
CREATE POLICY "Allow public read of app_versions" ON public.app_versions
    FOR SELECT
    USING (true);

-- Explicitly enforce that only service_role can modify version configurations
REVOKE INSERT, UPDATE, DELETE ON public.app_versions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.app_versions TO service_role;

-- 2. CENTRAL VERSION ASSERTION FUNCTION
-- Declared STABLE: evaluated once per query statement when wrapped in (SELECT ...) in RLS.
-- Reads PostgREST request headers GUC: X-Platform, X-Build (versionCode).
-- Enforces only when platform is 'android' AND X-Build is supplied.
-- If headers are absent, platform is web/ios, or X-Build is omitted -> returns TRUE (fail-open / backward compatible).
CREATE OR REPLACE FUNCTION public.assert_min_client_version()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_headers JSONB;
    v_platform TEXT;
    v_build_text TEXT;
    v_build_int INT;
    v_min_supported_code INT;
    v_min_supported_version TEXT;
    v_latest_version TEXT;
    v_store_url TEXT;
    v_kill_switch BOOLEAN;
BEGIN
    -- Safely extract headers (NULL during local psql, admin scripts, cron, or direct connections)
    BEGIN
        v_headers := NULLIF(current_setting('request.headers', true), '')::jsonb;
    EXCEPTION WHEN OTHERS THEN
        RETURN TRUE;
    END;

    IF v_headers IS NULL THEN
        RETURN TRUE;
    END IF;

    v_platform := lower(coalesce(v_headers->>'x-platform', ''));
    v_build_text := v_headers->>'x-build';

    -- Non-Android clients (web, iOS) or existing Android builds that do not send X-Build are admitted
    IF v_platform <> 'android' OR v_build_text IS NULL OR v_build_text !~ '^\d+$' THEN
        RETURN TRUE;
    END IF;

    v_build_int := v_build_text::int;

    -- Lookup current version thresholds for android
    SELECT 
        min_supported_version_code, 
        min_supported_version, 
        latest_version, 
        store_url, 
        kill_switch
    INTO 
        v_min_supported_code,
        v_min_supported_version,
        v_latest_version,
        v_store_url,
        v_kill_switch
    FROM public.app_versions
    WHERE platform = 'android';

    -- Fail-open if no config row exists or kill_switch is active
    IF NOT FOUND OR v_kill_switch IS TRUE THEN
        RETURN TRUE;
    END IF;

    -- If client build is strictly below minimum required version code, reject with HTTP 426
    IF v_build_int < v_min_supported_code THEN
        RAISE SQLSTATE 'PT426'
            USING MESSAGE = 'Upgrade Required',
                  DETAIL = json_build_object(
                      'code', 426,
                      'error', 'Upgrade Required',
                      'platform', 'android',
                      'client_build', v_build_int,
                      'min_supported_version_code', v_min_supported_code,
                      'min_supported_version', v_min_supported_version,
                      'latest_version', v_latest_version,
                      'store_url', v_store_url
                  )::text,
                  HINT = 'Please update ZeroDay to continue using network services.';
    END IF;

    RETURN TRUE;
END;
$$;

-- 3. RESTRICTIVE RLS POLICIES ON SENSITIVE TABLES
-- (SELECT public.assert_min_client_version()) is wrapped in a subselect and declared STABLE:
-- PostgreSQL executes the check once per statement (InitPlan) rather than once per row.

DROP POLICY IF EXISTS "Enforce min version on profiles" ON public.profiles;
CREATE POLICY "Enforce min version on profiles" ON public.profiles
    AS RESTRICTIVE
    FOR ALL
    USING ( (SELECT public.assert_min_client_version()) );

DROP POLICY IF EXISTS "Enforce min version on matches" ON public.matches;
CREATE POLICY "Enforce min version on matches" ON public.matches
    AS RESTRICTIVE
    FOR ALL
    USING ( (SELECT public.assert_min_client_version()) );

DROP POLICY IF EXISTS "Enforce min version on matchmaking_queue" ON public.matchmaking_queue;
CREATE POLICY "Enforce min version on matchmaking_queue" ON public.matchmaking_queue
    AS RESTRICTIVE
    FOR ALL
    USING ( (SELECT public.assert_min_client_version()) );

DROP POLICY IF EXISTS "Enforce min version on user_licenses" ON public.user_licenses;
CREATE POLICY "Enforce min version on user_licenses" ON public.user_licenses
    AS RESTRICTIVE
    FOR ALL
    USING ( (SELECT public.assert_min_client_version()) );

-- 4. PUBLIC RPC: GET REMOTE APP CONFIG
CREATE OR REPLACE FUNCTION public.get_remote_app_config(p_platform TEXT DEFAULT 'android')
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_row public.app_versions%ROWTYPE;
BEGIN
    SELECT * INTO v_row
    FROM public.app_versions
    WHERE platform = lower(p_platform);

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    RETURN jsonb_build_object(
        'platform', v_row.platform,
        'latest_version', v_row.latest_version,
        'latest_version_code', v_row.latest_version_code,
        'min_supported_version', v_row.min_supported_version,
        'min_supported_version_code', v_row.min_supported_version_code,
        'force_message', v_row.force_message,
        'store_url', v_row.store_url,
        'apk_download_url', v_row.apk_download_url,
        'apk_sha256', v_row.apk_sha256,
        'apk_hashes', v_row.apk_hashes,
        'rollout_percent', v_row.rollout_percent,
        'kill_switch', v_row.kill_switch,
        'changelog', v_row.changelog,
        'updated_at', v_row.updated_at
    );
END;
$$;

GRANT SELECT ON public.app_versions TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assert_min_client_version() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_remote_app_config(TEXT) TO anon, authenticated;
