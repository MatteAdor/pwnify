-- =====================================================================
-- ZERODAY CONTRACT: BASE TABLE ANONYMOUS REVOKE & VERSION GATE ENFORCEMENT
-- Migration: 20261024000007_contract_version_gate.sql
-- Status: CONTRACT PHASE (MIGRATION TO PUBLIC_PROFILES & PT426 GATE)
-- =====================================================================

-- 1. Revoke direct SELECT on base profiles from anon (forces public_profiles view)
REVOKE SELECT ON public.profiles FROM anon;

-- 2. Restrict authenticated SELECT on base profiles strictly to own record
DROP POLICY IF EXISTS "profiles_read_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_read_own" ON public.profiles;

CREATE POLICY "profiles_read_own" ON public.profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

-- 3. Version Gate Restrictive Policy on public.profiles
DROP POLICY IF EXISTS "Enforce min version on profiles" ON public.profiles;
CREATE POLICY "Enforce min version on profiles" ON public.profiles
    AS RESTRICTIVE
    FOR ALL
    USING ( (SELECT public.assert_min_client_version()) );
