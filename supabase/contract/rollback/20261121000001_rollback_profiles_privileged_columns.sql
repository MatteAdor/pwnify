-- =====================================================================
-- PWNIFY ROLLBACK: 20261121000001_contract_profiles_privileged_columns.sql
-- File: supabase/contract/rollback/20261121000001_rollback_profiles_privileged_columns.sql
--
-- USE ONLY IF the contract migration 20261121000001 was applied and must be undone
-- (e.g. legacy APK 1.2.1-1.2.6 lose the Arena opponent profile, or an unexpected
-- client/tool breaks). It restores exactly the state that migration changed:
--   1. table privileges: INSERT, UPDATE, DELETE, TRUNCATE on public.profiles for
--      anon and authenticated (Supabase default grants that the migration revoked);
--   2. anon SELECT on public.profiles;
--   3. policy "profiles_read_all" (SELECT for authenticated, anon USING true) in place
--      of "profiles_read_own";
--   4. trigger trg_protect_profiles_privileged_columns and its function
--      public.guard_profiles_privileged_columns() are dropped;
--   5. CHECK constraint profiles_profession_len is dropped.
-- Not touched: the GRANT SELECT on public.public_profiles (it already existed before
-- the migration), the trg_protect_profiles_is_pro trigger, RLS itself (stays enabled,
-- so direct client writes remain denied by the absence of write policies).
--
-- How to run (manually, staging first, then production):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
--     -f supabase/contract/rollback/20261121000001_rollback_profiles_privileged_columns.sql
--   or paste it into the Supabase Dashboard SQL Editor (runs as postgres).
-- Then verify:
--   SELECT has_table_privilege('anon', 'public.profiles', 'SELECT');           -- true
--   SELECT polname FROM pg_policy WHERE polrelid = 'public.profiles'::regclass; -- profiles_read_all, "Enforce min version on profiles"
--   SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.profiles'::regclass AND NOT tgisinternal;
--
-- Caveats:
--   * If contract 20261024000006 (REVOKE UPDATE, DELETE from anon/authenticated) or
--     20261024000007 (anon SELECT revoke + profiles_read_own) had been applied BEFORE
--     20261121000001, this script also undoes those parts. Re-run the relevant
--     statements of 06/07 afterwards if they must stay in force.
--   * This file lives in supabase/contract/rollback/: CI only applies
--     supabase/contract/*.sql (top level), so it is never applied automatically.
-- =====================================================================

BEGIN;

-- 4. Drop the privileged-columns guard (trigger first, then its function)
DROP TRIGGER IF EXISTS trg_protect_profiles_privileged_columns ON public.profiles;
DROP FUNCTION IF EXISTS public.guard_profiles_privileged_columns();

-- 5. Drop the profession length constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_profession_len;

-- 3. Restore the base-table read policy
DROP POLICY IF EXISTS "profiles_read_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_read_all" ON public.profiles;
CREATE POLICY "profiles_read_all" ON public.profiles
    FOR SELECT TO authenticated, anon
    USING (true);

-- 2. Restore anon SELECT on the base table
GRANT SELECT ON public.profiles TO anon;

-- 1. Restore the table write privileges revoked by the migration
GRANT INSERT, UPDATE, DELETE, TRUNCATE ON public.profiles TO anon, authenticated;

COMMIT;
