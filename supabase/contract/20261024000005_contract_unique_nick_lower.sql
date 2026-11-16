-- =====================================================================
-- ZERODAY CONTRACT: CASE-INSENSITIVE NICKNAME UNIQUE CONSTRAINT
-- Migration: 20261024000005_contract_unique_nick_lower.sql
-- Status: CONTRACT PHASE (PRE-FLIGHT DUPLICATE CHECK & UNIQUE INDEX)
-- =====================================================================

DO $$
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
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_nick_lower ON public.profiles(lower(nick));
