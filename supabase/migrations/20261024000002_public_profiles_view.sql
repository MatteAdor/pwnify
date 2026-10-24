-- =====================================================================
-- ZERODAY HARDENED PUBLIC PROFILES VIEW & PRIVACY LOCKDOWN
-- Migration: 20261024000002_public_profiles_view.sql
-- Status: PROPOSAL FILE ONLY (DO NOT APPLY DIRECTLY TO PRODUCTION)
-- =====================================================================
-- 1. Creates `public.public_profiles` view exposing only safe columns:
--    (id, nick, elo, tier, custom_title).
-- 2. Revokes SELECT on base `public.profiles` table from `anon`.
-- 3. Locks base `public.profiles` SELECT to authenticated users for OWN record only.
-- 4. Eliminates anonymous exposure of sensitive columns:
--    - flagged (anti-cheat detection status)
--    - matchmaking_cooldown_until (punitive status)
--    - inventory (private assets & items)
--    - is_pro (billing status)
--    - legacy_imported & timestamps (account activity profiling)
-- =====================================================================

-- 1. Create Public View
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
    p.id,
    p.nick,
    p.elo,
    p.rank AS tier,
    p.profession AS custom_title
FROM public.profiles p;

-- 2. Grant permissions on view
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 3. Lockdown Base Profiles Table
-- Revoke anon SELECT from base table
REVOKE SELECT ON public.profiles FROM anon;

-- Update authenticated policy: user can ONLY read their own profile row
DROP POLICY IF EXISTS "profiles_read_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_read_own" ON public.profiles;

CREATE POLICY "profiles_read_own" ON public.profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

-- Comment for PostgREST documentation
COMMENT ON VIEW public.public_profiles IS 
'Public leaderboard and matchmaking identity view. Strictly excludes anti-cheat flags, inventory JSON, and billing indicators.';
