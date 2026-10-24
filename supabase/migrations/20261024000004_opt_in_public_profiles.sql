-- =====================================================================
-- ZERODAY PROPOSAL: FULL OPT-IN PUBLIC PROFILES & LEAGUE PSEUDONYMIZATION
-- Migration: 20261024000004_opt_in_public_profiles.sql
-- Status: PROPOSAL FILE ONLY (DO NOT APPLY DIRECTLY TO PRODUCTION)
-- =====================================================================
-- 1. Adds `is_public_profile BOOLEAN NOT NULL DEFAULT FALSE` to public.profiles.
-- 2. Modifies `public.public_profiles` view:
--    - Uses a non-reversible salted hash for users without opt-in:
--      'Operatore-' || UPPER(SUBSTRING(md5(p.id::TEXT || 'zeroday_salt_lead_2026') FROM 1 FOR 6))
--    - The real `profiles.nick` is NEVER updated or altered.
--    - For users with `is_public_profile = TRUE`: shows real `nick` and opted-in `profession`.
--    - For users with `is_public_profile = FALSE`: shows pseudonymous alias, and NULL profession.
--    - Strictly excludes `created_at`, `flagged`, `inventory`, `is_pro`.
-- 3. Security Model:
--    - Operates with owner permissions (security definer mode, without security_invoker)
--      so that anon/authenticated can read public leaderboard projections without
--      having direct SELECT permissions on base `public.profiles`.
-- 4. RPC `is_nick_available(p_nick TEXT)`:
--    - SECURITY DEFINER, search_path = public, pg_catalog.
--    - Validates availability directly against base `public.profiles` without leaking table rows.
-- =====================================================================

-- 1. Add opt-in column for public identity
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_public_profile BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Replace view with pseudonymized projection
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
    p.id,
    CASE 
        WHEN p.is_public_profile IS TRUE THEN p.nick 
        ELSE 'Operatore-' || UPPER(SUBSTRING(md5(p.id::TEXT || 'zeroday_salt_lead_2026') FROM 1 FOR 6))
    END AS nick,
    p.elo,
    p.rank,
    p.xp,
    CASE 
        WHEN p.is_public_profile IS TRUE AND p.is_profession_public IS TRUE THEN p.profession 
        ELSE NULL 
    END AS profession,
    p.is_public_profile
FROM public.profiles p;

-- Explicit metadata documentation on view security model
COMMENT ON VIEW public.public_profiles IS 
'Security Model: Owner / Definer (without security_invoker). Proietta le sole colonne: id, nick (pseudonimizzato in modo stabile e non reversibile se non opt-in), elo, rank, xp, profession (opt-in), is_public_profile. Non espone created_at, flagged, inventory, is_pro.
Testo Avviso Privacy Utenti:
"Per tutelare la tua privacy, la presenza nelle classifiche e nelle leghe competitive è impostata su Riservata. Gli altri giocatori vedranno un identificativo anonimo (es. Operatore-A1B2C3). Puoi rendere visibile il tuo nickname reale in qualsiasi momento abilitando ''Profilo Pubblico'' nel tuo dossier Operatore."';

-- 3. Grants on View
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 4. RPC: IS_NICK_AVAILABLE (Server-Authoritative Check)
CREATE OR REPLACE FUNCTION public.is_nick_available(
    p_nick TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_clean_nick TEXT;
BEGIN
    v_clean_nick := lower(trim(p_nick));
    
    -- Format validation
    IF v_clean_nick IS NULL OR length(v_clean_nick) < 3 OR length(v_clean_nick) > 24 THEN
        RETURN FALSE;
    END IF;

    -- Return strictly boolean existence against base profiles table
    RETURN NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE lower(nick) = v_clean_nick
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_catalog;

REVOKE ALL ON FUNCTION public.is_nick_available(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_nick_available(TEXT) TO anon, authenticated;
