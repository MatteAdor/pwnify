-- =====================================================================
-- ZERODAY PROGRESS MIGRATION — STEP 2 MIGRATION (AUDITED & HARDENED)
-- Migration: 20261019000002_progress_migration.sql
-- Client-safe one-shot migration RPC strictly bound to auth.uid()
-- Server-side cosmetic whitelist, JSONB size enforcement, unknown key stripping
-- =====================================================================

CREATE OR REPLACE FUNCTION public.migrate_my_legacy_progress(
    p_xp INT,
    p_inventory JSONB,
    p_profession TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_clean_inventory JSONB := '{}'::jsonb;
    v_theme TEXT;
    v_title TEXT;
    v_badge_elem RECORD;
    v_clean_badges JSONB := '[]'::jsonb;
    v_badge_count INT := 0;
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: authentication token required';
    END IF;

    -- 1. JSONB size limit check (Max 4KB / 4096 bytes)
    IF p_inventory IS NOT NULL AND pg_catalog.octet_length(p_inventory::text) > 4096 THEN
        RAISE EXCEPTION 'Payload too large: cosmetic inventory exceeds 4KB limit';
    END IF;

    -- 2. Validate and whitelist cosmetic properties; discard all unknown keys
    IF p_inventory IS NOT NULL THEN
        -- Whitelist activeTheme
        v_theme := p_inventory->>'activeTheme';
        IF v_theme IS NOT NULL AND v_theme IN (
            'matrix-green', 'cyberpunk-neon', 'terminal-amber', 
            'stealth-gray', 'arctic-ice', 'solar-flare', 'blood-red'
        ) THEN
            v_clean_inventory := v_clean_inventory || pg_catalog.jsonb_build_object('activeTheme', v_theme);
        END IF;

        -- Whitelist customTitle (sanitized, max 40 chars, safe characters)
        v_title := pg_catalog.substr(TRIM(p_inventory->>'customTitle'), 1, 40);
        IF v_title IS NOT NULL AND v_title ~ '^[a-zA-Z0-9 _\-\[\]\(\)]+$' THEN
            v_clean_inventory := v_clean_inventory || pg_catalog.jsonb_build_object('customTitle', v_title);
        END IF;

        -- Whitelist unlockedBadges (array of valid string IDs)
        IF pg_catalog.jsonb_typeof(p_inventory->'unlockedBadges') = 'array' THEN
            FOR v_badge_elem IN 
                SELECT value::text AS badge_id
                FROM pg_catalog.jsonb_array_elements_text(p_inventory->'unlockedBadges')
            LOOP
                IF v_badge_count < 50 AND v_badge_elem.badge_id ~ '^[a-zA-Z0-9_\-]{2,40}$' THEN
                    v_clean_badges := v_clean_badges || pg_catalog.to_jsonb(v_badge_elem.badge_id);
                    v_badge_count := v_badge_count + 1;
                END IF;
            END LOOP;
            IF v_badge_count > 0 THEN
                v_clean_inventory := v_clean_inventory || pg_catalog.jsonb_build_object('unlockedBadges', v_clean_badges);
            END IF;
        END IF;
    END IF;

    -- Calls hardened internal function with cleaned inventory, strict 15,000 XP cap and one-shot enforcement
    RETURN public.import_legacy_progress(v_caller_id, p_xp, v_clean_inventory, p_profession);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- Permissions: Only authenticated users can call for their own profile
REVOKE ALL ON FUNCTION public.migrate_my_legacy_progress(INT, JSONB, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.migrate_my_legacy_progress(INT, JSONB, TEXT) TO authenticated;
