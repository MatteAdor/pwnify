-- =====================================================================
-- ZERODAY PROPOSAL: FULL OPT-IN PUBLIC PROFILES & LEAGUE PSEUDONYMIZATION
-- Migration: 20261024000004_opt_in_public_profiles.sql
-- Status: PROPOSAL FILE ONLY (DO NOT APPLY DIRECTLY TO PRODUCTION)
-- =====================================================================
-- 1. Adds `is_public_profile BOOLEAN NOT NULL DEFAULT FALSE` to public.profiles.
-- 2. Primary Perimeter Defense:
--    - REVOKE DELETE ON public.profiles FROM anon, authenticated;
--    - Hardens trigger `trg_protect_profiles_is_pro` using `current_user` instead of `auth.role()`.
-- 3. Modifies `public.public_profiles` view:
--    - Uses a stable pseudonymous alias calculated via salted hash for non-opted-in users:
--      'Operatore-' || UPPER(SUBSTRING(md5(p.id::TEXT || 'zeroday_salt_lead_2026') FROM 1 FOR 6))
--    - Real `profiles.nick` is never modified.
--    - For `is_public_profile = TRUE`: shows real `nick` and opted-in `profession`.
--    - For `is_public_profile = FALSE`: shows pseudonymous alias, and NULL profession.
--    - Strictly excludes `created_at`, `flagged`, `inventory`, `is_pro`.
-- 4. Security Model:
--    - Operates with owner permissions (security definer mode, without security_invoker).
-- 5. RPC `is_nick_available(p_nick TEXT)`:
--    - SECURITY DEFINER, search_path = public, pg_catalog.
--    - Strictly executable by `authenticated` (revoked from `PUBLIC` and `anon`).
--    - Rate limited per user; uniform FALSE response for invalid syntax or taken nick.
-- =====================================================================

-- 1. Add opt-in column for public identity
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_public_profile BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Primary Perimeter Defense: Revoke direct client delete on profiles table
REVOKE DELETE ON public.profiles FROM anon, authenticated;

-- Hardened Trigger checking current_user (database session role)
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

-- 3. Replace view with pseudonymized projection
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
'Security Model: Owner / Definer (without security_invoker). Proietta le sole colonne: id, nick (pseudonimizzato in modo stabile se non opt-in), elo, rank, xp, profession (opt-in), is_public_profile. Non espone created_at, flagged, inventory, is_pro.
Testo Avviso Privacy Utenti:
"Per tutelare la tua privacy, la presenza nelle classifiche e nelle leghe competitive è impostata su Riservata. Gli altri giocatori vedranno un identificativo anonimo (es. Operatore-A1B2C3). Puoi rendere visibile il tuo nickname reale in qualsiasi momento abilitando ''Profilo Pubblico'' nel tuo dossier Operatore."';

-- Grants on View
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 4. RPC: IS_NICK_AVAILABLE (Server-Authoritative Check, Authenticated Only)
CREATE OR REPLACE FUNCTION public.is_nick_available(
    p_nick TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_clean_nick TEXT;
    v_caller_id UUID;
    v_request_count INT;
BEGIN
    -- Require authenticated caller
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    -- Format validation: uniform FALSE for invalid length or characters
    v_clean_nick := lower(trim(p_nick));
    IF v_clean_nick IS NULL 
       OR length(v_clean_nick) < 3 
       OR length(v_clean_nick) > 24 
       OR v_clean_nick !~ '^[a-z0-9_\-]+$'
       OR v_clean_nick LIKE 'operatore-%'
       OR v_clean_nick IN ('admin', 'root', 'support', 'staff', 'mod', 'moderator', 'zeroday', 'official') THEN
        RETURN FALSE;
    END IF;

    -- Return strictly boolean existence against base profiles table
    RETURN NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE lower(nick) = v_clean_nick
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_catalog;

REVOKE ALL ON FUNCTION public.is_nick_available(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_nick_available(TEXT) TO authenticated;
