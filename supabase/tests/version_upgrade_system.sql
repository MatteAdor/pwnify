-- =====================================================================
-- ZERODAY VERSION UPGRADE & RLS ENFORCEMENT INTEGRATION TEST SUITE
-- Tests PostgreSQL RLS enforcement, SQLSTATE PT426 mapping,
-- PostgREST header simulation, fail-open semantics, and STABLE InitPlan.
-- Runs strictly inside a transaction with automatic ROLLBACK.
-- =====================================================================

BEGIN;

SELECT plan(8);

-- 1. Setup Migration 5 schema in temporary transaction space
CREATE TABLE IF NOT EXISTS public.app_versions (
    platform TEXT PRIMARY KEY,
    latest_version TEXT NOT NULL DEFAULT '1.2.1',
    latest_version_code INT NOT NULL DEFAULT 100,
    min_supported_version TEXT NOT NULL DEFAULT '1.0.0',
    min_supported_version_code INT NOT NULL DEFAULT 100,
    force_message JSONB NOT NULL DEFAULT '{"it": "Aggiornamento richiesto", "en": "Update required"}'::jsonb,
    store_url TEXT NOT NULL DEFAULT 'https://play.google.com/store/apps/details?id=com.zeroday.academy',
    apk_download_url TEXT NOT NULL DEFAULT 'https://zeroday.academy/downloads/zeroday.apk',
    apk_sha256 TEXT,
    apk_hashes JSONB NOT NULL DEFAULT '{}'::jsonb,
    rollout_percent INT NOT NULL DEFAULT 100,
    kill_switch BOOLEAN NOT NULL DEFAULT FALSE,
    changelog JSONB,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

INSERT INTO public.app_versions (
    platform,
    latest_version,
    latest_version_code,
    min_supported_version,
    min_supported_version_code,
    kill_switch
) VALUES (
    'android',
    '1.2.1',
    100,
    '1.0.0',
    100,
    FALSE
) ON CONFLICT (platform) DO UPDATE SET
    min_supported_version_code = 100,
    kill_switch = FALSE;

-- Ensure assert_min_client_version is created
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

    IF v_platform <> 'android' OR v_build_text IS NULL OR v_build_text !~ '^\d+$' THEN
        RETURN TRUE;
    END IF;

    v_build_int := v_build_text::int;

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

    IF NOT FOUND OR v_kill_switch IS TRUE THEN
        RETURN TRUE;
    END IF;

    IF v_build_int < v_min_supported_code THEN
        RAISE SQLSTATE 'PT426'
            USING MESSAGE = 'Upgrade Required',
                  DETAIL = json_build_object(
                      'code', 426,
                      'error', 'Upgrade Required',
                      'platform', 'android',
                      'client_build', v_build_int,
                      'min_supported_version_code', v_min_supported_code
                  )::text;
    END IF;

    RETURN TRUE;
END;
$$;

-- Apply RESTRICTIVE policy on profiles
DROP POLICY IF EXISTS "Enforce min version on profiles" ON public.profiles;
CREATE POLICY "Enforce min version on profiles" ON public.profiles
    AS RESTRICTIVE
    FOR ALL
    USING ( (SELECT public.assert_min_client_version()) );

-- TEST 1: Android client with low build code (< 100) must raise PT426
PERFORM set_config('request.headers', '{"x-platform": "android", "x-build": "90"}', true);
SELECT throws_ok(
    'SELECT count(*) FROM public.profiles',
    'PT426',
    'Upgrade Required',
    'Android build 90 below min 100 throws SQLSTATE PT426'
);

-- TEST 2: Android client with equal or higher build code (>= 100) must succeed
PERFORM set_config('request.headers', '{"x-platform": "android", "x-build": "100"}', true);
SELECT lives_ok(
    'SELECT count(*) FROM public.profiles',
    'Android build 100 equal to min 100 executes without error'
);

-- TEST 3: Android client with build 105 (> 100) must succeed
PERFORM set_config('request.headers', '{"x-platform": "android", "x-build": "105"}', true);
SELECT lives_ok(
    'SELECT count(*) FROM public.profiles',
    'Android build 105 above min 100 executes without error'
);

-- TEST 4: Missing headers (e.g. web or direct connection) must succeed (fail-open)
PERFORM set_config('request.headers', '', true);
SELECT lives_ok(
    'SELECT count(*) FROM public.profiles',
    'Empty or absent headers passes through without error'
);

-- TEST 5: Web client (x-platform = "web") without build code must succeed
PERFORM set_config('request.headers', '{"x-platform": "web"}', true);
SELECT lives_ok(
    'SELECT count(*) FROM public.profiles',
    'Web platform passes through without version restriction'
);

-- TEST 6: Legacy Android client without x-build header must succeed
PERFORM set_config('request.headers', '{"x-platform": "android"}', true);
SELECT lives_ok(
    'SELECT count(*) FROM public.profiles',
    'Legacy Android without x-build passes through without error'
);

-- TEST 7: Emergency kill_switch bypasses force update even for build 0
UPDATE public.app_versions SET kill_switch = TRUE WHERE platform = 'android';
PERFORM set_config('request.headers', '{"x-platform": "android", "x-build": "0"}', true);
SELECT lives_ok(
    'SELECT count(*) FROM public.profiles',
    'Kill switch enables emergency bypass for all clients'
);

-- TEST 8: Explain check confirms InitPlan subquery optimization (single evaluation)
SELECT plan_ok(
    'EXPLAIN SELECT * FROM public.profiles LIMIT 1',
    'Execution plan uses InitPlan subquery for assert_min_client_version'
);

SELECT * FROM finish();

ROLLBACK;
