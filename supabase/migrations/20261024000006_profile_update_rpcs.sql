-- =====================================================================
-- ZERODAY PROPOSAL: HARDENED PROFILE & COSMETICS MUTATION RPCS
-- Migration: 20261024000006_profile_update_rpcs.sql
-- Status: PROPOSAL FILE ONLY (DO NOT APPLY DIRECTLY TO PRODUCTION)
-- =====================================================================
-- 1. Adds `nick_updated_at TIMESTAMPTZ DEFAULT NULL` to public.profiles.
-- 2. Adds UNIQUE index on `lower(nick)` to prevent case-insensitive collisions.
-- 3. RPC: `update_my_profile_preferences`
--    - Server-side charset/length validation: ^[a-zA-Z0-9_\-]{3,24}$
--    - Rejects reserved names: admin, root, support, zeroday, staff, moderator
--    - Rejects 'operatore-' prefix (prevents alias impersonation)
--    - Enforces 7-day cooldown on nickname modification
--    - Updates only: nick, profession, is_public_profile, is_profession_public
-- 4. RPC: `update_my_inventory_cosmetics`
--    - Strict allowlist: hacker_card_frame (max 32 chars), theme (max 32 chars), selected_title (max 48 chars)
--    - Strictly rejects any other keys (streak_days, licenses, elo, etc.)
-- =====================================================================

-- 1. Add cooldown tracking column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS nick_updated_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Unique index on lower(nick) with pre-flight duplicate check
DO 
DECLARE
    v_dup_count INT;
    v_dup_sample TEXT;
BEGIN
    SELECT count(*), string_agg(lower_nick, ', ')
    INTO v_dup_count, v_dup_sample
    FROM (
        SELECT lower(nick) AS lower_nick
        FROM public.profiles
        WHERE nick IS NOT NULL
        GROUP BY lower(nick)
        HAVING count(*) > 1
        LIMIT 5
    ) sub;

    IF v_dup_count > 0 THEN
        RAISE EXCEPTION 'Migration aborted: found duplicate case-insensitive nicknames in public.profiles: % (colliding groups: %). Please resolve duplicates manually before creating idx_profiles_nick_lower.',
            v_dup_sample, v_dup_count
            USING ERRCODE = '23505';
    END IF;
END ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_nick_lower ON public.profiles(lower(nick));

-- 3. RPC: UPDATE MY PROFILE PREFERENCES
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
    v_now TIMESTAMPTZ := pg_catalog.now();
    v_nick_changed BOOLEAN := FALSE;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    SELECT nick, nick_updated_at INTO v_current_record 
    FROM public.profiles WHERE id = v_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile not found' USING ERRCODE = 'P0002';
    END IF;

    v_clean_nick := trim(p_nick);

    -- Format validation: 3-24 characters, alphanumeric, underscore or hyphen
    IF v_clean_nick IS NULL OR length(v_clean_nick) < 3 OR length(v_clean_nick) > 24 
       OR v_clean_nick !~ '^[a-zA-Z0-9_\-]+$' THEN
        RAISE EXCEPTION 'Invalid nickname format (3-24 alphanumeric characters, underscores or hyphens)'
            USING ERRCODE = '22023';
    END IF;

    -- Disallow reserved pseudonymous prefix
    IF lower(v_clean_nick) LIKE 'operatore-%' THEN
        RAISE EXCEPTION 'Nickname cannot start with reserved prefix "Operatore-"'
            USING ERRCODE = '22023';
    END IF;

    -- Disallow reserved system handles
    IF lower(v_clean_nick) IN ('admin', 'root', 'support', 'staff', 'mod', 'moderator', 'zeroday', 'official') THEN
        RAISE EXCEPTION 'Nickname is reserved by platform administration'
            USING ERRCODE = '22023';
    END IF;

    -- Cooldown & Uniqueness if nick is changing
    IF lower(v_clean_nick) <> lower(v_current_record.nick) THEN
        v_nick_changed := TRUE;
        IF v_current_record.nick_updated_at IS NOT NULL 
           AND v_current_record.nick_updated_at >= (v_now - INTERVAL '7 days') THEN
            RAISE EXCEPTION 'Nickname can only be changed once every 7 days'
                USING ERRCODE = '22023';
        END IF;

        IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(nick) = lower(v_clean_nick) AND id <> v_user_id) THEN
            RAISE EXCEPTION 'Nickname is already in use by another operator'
                USING ERRCODE = '23505';
        END IF;
    END IF;

    -- Update row authoritatively
    UPDATE public.profiles
    SET 
        nick = CASE WHEN v_nick_changed THEN v_clean_nick ELSE nick END,
        nick_updated_at = CASE WHEN v_nick_changed THEN v_now ELSE nick_updated_at END,
        profession = CASE WHEN p_profession IS NOT NULL THEN substring(trim(p_profession) from 1 for 64) ELSE profession END,
        is_public_profile = COALESCE(p_is_public_profile, is_public_profile),
        is_profession_public = COALESCE(p_is_profession_public, is_profession_public),
        updated_at = v_now
    WHERE id = v_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'nick', CASE WHEN v_nick_changed THEN v_clean_nick ELSE v_current_record.nick END,
        'is_public_profile', p_is_public_profile
    );
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_catalog;

REVOKE ALL ON FUNCTION public.update_my_profile_preferences FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_my_profile_preferences TO authenticated;

-- 4. RPC: UPDATE MY INVENTORY COSMETICS (STRICT ALLOWLIST)
CREATE OR REPLACE FUNCTION public.update_my_inventory_cosmetics(
    p_cosmetics JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_key TEXT;
    v_val TEXT;
    v_clean_cosmetics JSONB := '{}'::jsonb;
    v_allowed_keys TEXT[] := ARRAY['hacker_card_frame', 'theme', 'selected_title'];
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    IF jsonb_typeof(p_cosmetics) <> 'object' THEN
        RAISE EXCEPTION 'Cosmetics payload must be a JSON object' USING ERRCODE = '22023';
    END IF;

    -- Validate against strict allowlist and max lengths
    FOR v_key IN SELECT jsonb_object_keys(p_cosmetics) LOOP
        IF NOT (v_key = ANY(v_allowed_keys)) THEN
            RAISE EXCEPTION 'Disallowed inventory key: %', v_key USING ERRCODE = '42501';
        END IF;

        v_val := p_cosmetics->>v_key;
        IF v_val IS NOT NULL THEN
            IF v_key IN ('hacker_card_frame', 'theme') AND length(v_val) > 32 THEN
                RAISE EXCEPTION 'Cosmetic value for % exceeds 32 characters', v_key USING ERRCODE = '22023';
            ELSIF v_key = 'selected_title' AND length(v_val) > 48 THEN
                RAISE EXCEPTION 'Cosmetic value for % exceeds 48 characters', v_key USING ERRCODE = '22023';
            END IF;
            v_clean_cosmetics := v_clean_cosmetics || jsonb_build_object(v_key, v_val);
        END IF;
    END LOOP;

    -- Merge clean cosmetics into existing inventory, preserving streak_days and other server-managed fields
    UPDATE public.profiles
    SET 
        inventory = COALESCE(inventory, '{}'::jsonb) || v_clean_cosmetics,
        updated_at = pg_catalog.now()
    WHERE id = v_user_id;

    RETURN jsonb_build_object('success', true, 'updated_keys', v_clean_cosmetics);
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_catalog;

REVOKE ALL ON FUNCTION public.update_my_inventory_cosmetics FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_my_inventory_cosmetics TO authenticated;
