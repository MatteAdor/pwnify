-- =====================================================================
-- PWNIFY CONTRACT (PROPOSAL, NOT APPLIED): update_my_profile_preferences keeps
-- unspecified fields instead of overwriting them
-- File: supabase/contract/20261123000001_contract_fix_profile_preferences_nulls.sql
-- Status: review only. Do NOT `supabase db push` automatically; apply manually
--         (staging first). CI applies supabase/contract/*.sql to an ephemeral local
--         Postgres only, where the pgTAP suites exercise it.
--
-- Bug (migrations/20261024000002_public_profiles_view.sql:127,134): every call wrote
--   profession = p_profession, is_public_profile = coalesce(p_is_public_profile, false),
--   is_profession_public = coalesce(p_is_profession_public, false).
-- The app calls the RPC with p_nick only (AuthPage callsign selection), so every nick
-- change reset profession to NULL and turned a public profile private.
--
-- Fix: same signature (text, text, boolean, boolean) and same nick rules, but
--   * NULL parameters keep the stored value (defaults become NULL);
--   * p_profession = '' (empty/blank) explicitly clears it;
--   * profession is trimmed and limited to 60 characters (matches the proposed
--     CHECK profiles_profession_len in 20261121000001);
--   * search_path hardened to '' (all relations schema-qualified);
--   * the JSON result reports the values actually stored.
-- CREATE OR REPLACE keeps the existing EXECUTE grants; they are re-asserted below.
-- =====================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.update_my_profile_preferences(
    p_nick TEXT,
    p_profession TEXT DEFAULT NULL::TEXT,
    p_is_public_profile BOOLEAN DEFAULT NULL::BOOLEAN,
    p_is_profession_public BOOLEAN DEFAULT NULL::BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_clean_nick TEXT;
    v_clean_profession TEXT;
    v_current RECORD;
    v_result RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    v_clean_nick := pg_catalog.btrim(p_nick);
    IF v_clean_nick IS NULL
       OR pg_catalog.length(v_clean_nick) < 3
       OR pg_catalog.length(v_clean_nick) > 24
       OR v_clean_nick !~ '^[a-zA-Z0-9_\-]+$' THEN
        RAISE EXCEPTION 'Invalid nickname format: must be 3-24 characters, alphanumeric with underscores/hyphens'
            USING ERRCODE = '22023';
    END IF;

    IF pg_catalog.lower(v_clean_nick) IN ('admin', 'root', 'support', 'staff', 'mod', 'moderator', 'zeroday', 'official') THEN
        RAISE EXCEPTION 'Nickname is reserved by system'
            USING ERRCODE = '22023';
    END IF;

    IF pg_catalog.lower(v_clean_nick) LIKE 'operatore-%' THEN
        RAISE EXCEPTION 'Nickname cannot use reserved system prefix "Operatore-"'
            USING ERRCODE = '22023';
    END IF;

    -- Profession: NULL = keep, blank = clear, otherwise trimmed and at most 60 chars
    IF p_profession IS NOT NULL THEN
        v_clean_profession := NULLIF(pg_catalog.btrim(p_profession), '');
        IF v_clean_profession IS NOT NULL AND pg_catalog.char_length(v_clean_profession) > 60 THEN
            RAISE EXCEPTION 'Profession must be at most 60 characters'
                USING ERRCODE = '22023';
        END IF;
    END IF;

    SELECT p.nick, p.nick_updated_at INTO v_current
    FROM public.profiles p
    WHERE p.id = v_user_id;

    IF v_current.nick IS DISTINCT FROM v_clean_nick THEN
        IF v_current.nick_updated_at IS NOT NULL
           AND v_current.nick_updated_at > pg_catalog.now() - INTERVAL '7 days' THEN
            RAISE EXCEPTION 'Nickname can only be changed once every 7 days'
                USING ERRCODE = '22023';
        END IF;

        IF EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE pg_catalog.lower(p.nick) = pg_catalog.lower(v_clean_nick) AND p.id <> v_user_id
        ) THEN
            RAISE EXCEPTION 'Nickname is already taken'
                USING ERRCODE = '23505';
        END IF;
    END IF;

    UPDATE public.profiles p
    SET nick = v_clean_nick,
        nick_updated_at = CASE
            WHEN v_current.nick IS DISTINCT FROM v_clean_nick THEN pg_catalog.now()
            ELSE p.nick_updated_at
        END,
        profession = CASE WHEN p_profession IS NULL THEN p.profession ELSE v_clean_profession END,
        is_public_profile = COALESCE(p_is_public_profile, p.is_public_profile),
        is_profession_public = COALESCE(p_is_profession_public, p.is_profession_public),
        updated_at = pg_catalog.now()
    WHERE p.id = v_user_id
    RETURNING p.nick, p.profession, p.is_public_profile, p.is_profession_public
    INTO v_result;

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'nick', COALESCE(v_result.nick, v_clean_nick),
        'profession', v_result.profession,
        'is_public_profile', v_result.is_public_profile,
        'is_profession_public', v_result.is_profession_public
    );
END;
$$;

-- Same privileges as before: authenticated only.
REVOKE ALL ON FUNCTION public.update_my_profile_preferences(TEXT, TEXT, BOOLEAN, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_my_profile_preferences(TEXT, TEXT, BOOLEAN, BOOLEAN) TO authenticated;

COMMIT;
