-- =====================================================================
-- ZERODAY RANKED SYSTEM — 5 TIERS ELO PROGRESSION (100 START)
-- Migration: 20261022000001_elo_5_tiers_100_start.sql
-- Exact 5 Tiers:
--   Script Kiddie  (0 - 1199 ELO)
--   Packet Sniffer (1200 - 1399 ELO)
--   Red Teamer     (1400 - 1599 ELO)
--   APT Operator   (1600 - 1899 ELO)
--   ZeroDay Hunter (1900+ ELO)
-- Starting ELO: 100
-- =====================================================================

-- 1. Update default values on public.profiles
ALTER TABLE public.profiles ALTER COLUMN elo SET DEFAULT 100;
ALTER TABLE public.profiles ALTER COLUMN rank SET DEFAULT 'Script Kiddie';

-- 2. Update get_tier_from_elo function with the exact 5 tiers
CREATE OR REPLACE FUNCTION public.get_tier_from_elo(p_elo INT)
RETURNS TEXT AS $$
BEGIN
    IF p_elo >= 1900 THEN RETURN 'ZeroDay Hunter';
    ELSIF p_elo >= 1600 THEN RETURN 'APT Operator';
    ELSIF p_elo >= 1400 THEN RETURN 'Red Teamer';
    ELSIF p_elo >= 1200 THEN RETURN 'Packet Sniffer';
    ELSE RETURN 'Script Kiddie';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE
SET search_path = '';

-- 3. Update handle_new_user trigger function to use 100 ELO and 'Script Kiddie'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_raw_nick TEXT;
    v_final_nick TEXT;
    v_counter INT := 1;
BEGIN
    v_raw_nick := COALESCE(
        NEW.raw_user_meta_data->>'nick',
        NEW.raw_user_meta_data->>'customUsername',
        pg_catalog.split_part(NEW.email, '@', 1)
    );
    v_raw_nick := pg_catalog.regexp_replace(v_raw_nick, '[^a-zA-Z0-9_]', '_', 'g');
    IF pg_catalog.length(v_raw_nick) < 3 THEN
        v_raw_nick := 'Operator_' || pg_catalog.substr(pg_catalog.md5(pg_catalog.random()::text), 1, 6);
    END IF;

    v_final_nick := v_raw_nick;
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE nick = v_final_nick) LOOP
        v_final_nick := v_raw_nick || '_' || v_counter;
        v_counter := v_counter + 1;
    END LOOP;

    INSERT INTO public.profiles (id, nick, elo, rank, xp, created_at, updated_at)
    VALUES (NEW.id, v_final_nick, 100, 'Script Kiddie', 0, pg_catalog.now(), pg_catalog.now());

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- 4. Backfill existing default/unranked accounts and refresh tier labels
UPDATE public.profiles 
SET elo = 100, rank = 'Script Kiddie' 
WHERE elo = 1000 AND xp = 0;

UPDATE public.profiles 
SET rank = public.get_tier_from_elo(elo);
