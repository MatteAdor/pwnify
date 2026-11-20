-- =====================================================================
-- ZERODAY SCHEMA MIGRATION: CASE-INSENSITIVE UNIQUE CONSTRAINT ON USERNAME
-- Migration: 20261120000001_unique_lower_nick.sql
-- Status: PENDING / DRY-RUN (DO NOT APPLY REMOTELY WITHOUT STAGING VERIFICATION)
-- =====================================================================

-- Enforce case-insensitive uniqueness on public.profiles.nick so that e.g. 'Alice' and 'alice' cannot collide.
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_lower_nick
ON public.profiles (LOWER(nick));

-- Comment on index documenting client and server invariant
COMMENT ON INDEX public.idx_profiles_lower_nick IS
'Enforces case-insensitive uniqueness on operator usernames/callsigns. Catches collisions via standard PostgreSQL error code 23505.';
