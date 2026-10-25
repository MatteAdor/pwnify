-- =====================================================================
-- ZERODAY EXPAND: PUBLIC PROFILES VIEW & PROFILE PREFERENCES
-- Migration: 20261024000002_public_profiles_view.sql
-- Status: EXPAND PHASE (COMPATIBLE WITH LEGACY CLIENTS & APK 1.2.1)
-- =====================================================================

-- 1. Add opt-in and cosmetic preference columns to base profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_public_profile BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_profession_public BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS profession TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS nick_updated_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Create Hardened Public View (Owner / Definer security model)
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

-- 3. Grants on View for both anon and authenticated
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 4. RPC: is_nick_available (Authenticated only, safe availability probe)
CREATE OR REPLACE FUNCTION public.is_nick_available(
    p_nick TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_clean_nick TEXT;
    v_caller_id UUID;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    v_clean_nick := lower(trim(p_nick));
    IF v_clean_nick IS NULL 
       OR length(v_clean_nick) < 3 
       OR length(v_clean_nick) > 24 
       OR v_clean_nick !~ '^[a-z0-9_\-]+$'
       OR v_clean_nick LIKE 'operatore-%'
       OR v_clean_nick IN ('admin', 'root', 'support', 'staff', 'mod', 'moderator', 'zeroday', 'official') THEN
        RETURN FALSE;
    END IF;

    RETURN NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE lower(nick) = v_clean_nick
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_catalog;

GRANT EXECUTE ON FUNCTION public.is_nick_available(TEXT) TO authenticated;

-- 5. RPC: update_my_profile_preferences
CREATE OR REPLACE FUNCTION public.update_my_profile_preferences(
    p_nick TEXT,
    p_profession TEXT DEFAULT NULL,
    p_is_public_profile BOOLEAN DEFAULT FALSE,
    p_is_profession_public BOOLEAN DEFAULT FALSE
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_clean_nick TEXT;
    v_current_record RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    v_clean_nick := trim(p_nick);
    IF v_clean_nick IS NULL 
       OR length(v_clean_nick) < 3 
       OR length(v_clean_nick) > 24 
       OR v_clean_nick !~ '^[a-zA-Z0-9_\-]+$' THEN
        RAISE EXCEPTION 'Invalid nickname format: must be 3-24 characters, alphanumeric with underscores/hyphens'
            USING ERRCODE = '22023';
    END IF;

    IF lower(v_clean_nick) IN ('admin', 'root', 'support', 'staff', 'mod', 'moderator', 'zeroday', 'official') THEN
        RAISE EXCEPTION 'Nickname is reserved by system'
            USING ERRCODE = '22023';
    END IF;

    IF lower(v_clean_nick) LIKE 'operatore-%' THEN
        RAISE EXCEPTION 'Nickname cannot use reserved system prefix "Operatore-"'
            USING ERRCODE = '22023';
    END IF;

    SELECT nick, nick_updated_at INTO v_current_record
    FROM public.profiles
    WHERE id = v_user_id;

    IF v_current_record.nick IS DISTINCT FROM v_clean_nick THEN
        IF v_current_record.nick_updated_at IS NOT NULL 
           AND v_current_record.nick_updated_at > pg_catalog.now() - INTERVAL '7 days' THEN
            RAISE EXCEPTION 'Nickname can only be changed once every 7 days'
                USING ERRCODE = '22023';
        END IF;

        IF EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE lower(nick) = lower(v_clean_nick) AND id <> v_user_id
        ) THEN
            RAISE EXCEPTION 'Nickname is already taken'
                USING ERRCODE = '23505';
        END IF;

        UPDATE public.profiles
        SET nick = v_clean_nick,
            nick_updated_at = pg_catalog.now(),
            profession = p_profession,
            is_public_profile = coalesce(p_is_public_profile, false),
            is_profession_public = coalesce(p_is_profession_public, false),
            updated_at = pg_catalog.now()
        WHERE id = v_user_id;
    ELSE
        UPDATE public.profiles
        SET profession = p_profession,
            is_public_profile = coalesce(p_is_public_profile, false),
            is_profession_public = coalesce(p_is_profession_public, false),
            updated_at = pg_catalog.now()
        WHERE id = v_user_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'nick', v_clean_nick,
        'profession', p_profession,
        'is_public_profile', p_is_public_profile,
        'is_profession_public', p_is_profession_public
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

GRANT EXECUTE ON FUNCTION public.update_my_profile_preferences(TEXT, TEXT, BOOLEAN, BOOLEAN) TO authenticated;

-- 6. RPC: update_my_inventory_cosmetics
CREATE OR REPLACE FUNCTION public.update_my_inventory_cosmetics(
    p_cosmetics JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_key TEXT;
    v_val TEXT;
    v_current_inventory JSONB;
    v_new_inventory JSONB;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    IF jsonb_typeof(p_cosmetics) <> 'object' THEN
        RAISE EXCEPTION 'Invalid cosmetics format: must be JSON object'
            USING ERRCODE = '22023';
    END IF;

    FOR v_key IN SELECT jsonb_object_keys(p_cosmetics) LOOP
        IF v_key NOT IN ('hacker_card_frame', 'theme', 'selected_title') THEN
            RAISE EXCEPTION 'Modification of non-cosmetic inventory attribute "%" is strictly forbidden', v_key
                USING ERRCODE = '42501';
        END IF;

        v_val := p_cosmetics->>v_key;
        IF v_val IS NOT NULL AND length(v_val) > 32 THEN
            RAISE EXCEPTION 'Cosmetic value for "%" exceeds max length of 32 characters', v_key
                USING ERRCODE = '22023';
        END IF;
    END LOOP;

    SELECT coalesce(inventory, '{}'::jsonb) INTO v_current_inventory
    FROM public.profiles
    WHERE id = v_user_id;

    v_new_inventory := v_current_inventory || p_cosmetics;

    UPDATE public.profiles
    SET inventory = v_new_inventory,
        updated_at = pg_catalog.now()
    WHERE id = v_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'inventory', v_new_inventory
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

GRANT EXECUTE ON FUNCTION public.update_my_inventory_cosmetics(JSONB) TO authenticated;
