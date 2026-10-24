-- =====================================================================
-- ZERODAY HARDENED PUBLIC PROFILES VIEW & PRIVACY LOCKDOWN
-- Migration: 20261024000002_public_profiles_view.sql
-- Status: PROPOSAL FILE ONLY (DO NOT APPLY DIRECTLY TO PRODUCTION)
-- =====================================================================
-- 1. Adds `is_profession_public BOOLEAN NOT NULL DEFAULT FALSE` to public.profiles.
-- 2. Creates `public.public_profiles` view with strictly necessary public columns:
--    - id (participant binding)
--    - nick (display name)
--    - elo (matchmaking rating)
--    - rank (tier classification)
--    - xp (weekly league standings)
--    - profession (OPT-IN ONLY: null if is_profession_public is false)
-- 3. Revokes SELECT on base `public.profiles` from anon.
-- 4. Limits authenticated SELECT on base `public.profiles` strictly to own record (auth.uid() = id).
-- =====================================================================

-- 1. Add opt-in column to base table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_profession_public BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Create Hardened Public View
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
    p.id,
    p.nick,
    p.elo,
    p.rank,
    p.xp,
    CASE 
        WHEN p.is_profession_public IS TRUE THEN p.profession 
        ELSE NULL 
    END AS profession
FROM public.profiles p;

-- 3. Grants on View
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 4. Base Table Lockdown
REVOKE SELECT ON public.profiles FROM anon;

DROP POLICY IF EXISTS "profiles_read_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_read_own" ON public.profiles;

CREATE POLICY "profiles_read_own" ON public.profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

COMMENT ON VIEW public.public_profiles IS 
'Public matchmaking and leaderboard projection. Strictly excludes anti-cheat flags, inventory JSON, billing markers, and gates profession behind explicit user opt-in.';
