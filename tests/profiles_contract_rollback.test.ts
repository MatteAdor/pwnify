import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => fs.readFileSync(path.join(rootDir, rel), 'utf-8');
/** SQL statements without comments, whitespace-normalized. */
const code = (sql: string) => sql.replace(/--.*$/gm, '').replace(/\s+/g, ' ').trim();

describe('Rollback of 20261121000001_contract_profiles_privileged_columns', () => {
  const rollbackPath = 'supabase/contract/rollback/20261121000001_rollback_profiles_privileged_columns.sql';
  const rollback = code(read(rollbackPath));
  const forward = code(read('supabase/contract/20261121000001_contract_profiles_privileged_columns.sql'));

  test('is wrapped in a single transaction', () => {
    assert.ok(rollback.startsWith('BEGIN;'));
    assert.ok(rollback.endsWith('COMMIT;'));
  });

  test('undoes every change of the forward migration', () => {
    // forward: REVOKE INSERT, UPDATE, DELETE, TRUNCATE ... FROM PUBLIC, anon, authenticated
    assert.ok(forward.includes('REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.profiles FROM PUBLIC, anon, authenticated;'));
    assert.ok(rollback.includes('GRANT INSERT, UPDATE, DELETE, TRUNCATE ON public.profiles TO anon, authenticated;'));
    // forward: REVOKE SELECT ... FROM anon
    assert.ok(forward.includes('REVOKE SELECT ON public.profiles FROM anon;'));
    assert.ok(rollback.includes('GRANT SELECT ON public.profiles TO anon;'));
    // forward: drops profiles_read_all, creates profiles_read_own
    assert.ok(rollback.includes('DROP POLICY IF EXISTS "profiles_read_own" ON public.profiles;'));
    assert.ok(rollback.includes('CREATE POLICY "profiles_read_all" ON public.profiles FOR SELECT TO authenticated, anon USING (true);'));
    // forward: trigger + function
    assert.ok(rollback.includes('DROP TRIGGER IF EXISTS trg_protect_profiles_privileged_columns ON public.profiles;'));
    assert.ok(rollback.includes('DROP FUNCTION IF EXISTS public.guard_profiles_privileged_columns();'));
    assert.ok(
      rollback.indexOf('DROP TRIGGER') < rollback.indexOf('DROP FUNCTION'),
      'trigger must be dropped before its function',
    );
    // forward: CHECK constraint
    assert.ok(rollback.includes('ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_profession_len;'));
  });

  test('restores the policy exactly as the original migration defined it', () => {
    const original = code(read('supabase/migrations/20261019000001_ranked_system.sql'));
    assert.ok(original.includes('CREATE POLICY "profiles_read_all" ON public.profiles FOR SELECT TO authenticated, anon USING (true);'));
  });

  test('never touches is_pro protection or RLS', () => {
    assert.equal(/trg_protect_profiles_is_pro|DISABLE ROW LEVEL SECURITY|set_profile_pro_status/.test(rollback), false);
  });

  test('is outside the CI contract glob (never auto-applied)', () => {
    const ci = read('.github/workflows/ci.yml') + read('.github/workflows/db-tests.yml');
    assert.ok(ci.includes('supabase/contract/*.sql'));
    assert.equal(ci.includes('supabase/contract/rollback'), false);
    assert.ok(path.dirname(rollbackPath).endsWith('contract/rollback'));
  });
});

describe('Fix: update_my_profile_preferences keeps unspecified fields', () => {
  const fix = code(read('supabase/contract/20261123000001_contract_fix_profile_preferences_nulls.sql'));

  test('keeps the same signature and privileges', () => {
    assert.ok(fix.includes('CREATE OR REPLACE FUNCTION public.update_my_profile_preferences( p_nick TEXT, p_profession TEXT DEFAULT NULL::TEXT, p_is_public_profile BOOLEAN DEFAULT NULL::BOOLEAN, p_is_profession_public BOOLEAN DEFAULT NULL::BOOLEAN )'));
    assert.ok(fix.includes('REVOKE ALL ON FUNCTION public.update_my_profile_preferences(TEXT, TEXT, BOOLEAN, BOOLEAN) FROM PUBLIC, anon;'));
    assert.ok(fix.includes('GRANT EXECUTE ON FUNCTION public.update_my_profile_preferences(TEXT, TEXT, BOOLEAN, BOOLEAN) TO authenticated;'));
    assert.ok(fix.includes('SECURITY DEFINER'));
    assert.ok(fix.includes("SET search_path = ''"));
  });

  test('a missing profession / visibility parameter keeps the stored value', () => {
    assert.ok(fix.includes('profession = CASE WHEN p_profession IS NULL THEN p.profession ELSE v_clean_profession END'));
    assert.ok(fix.includes('is_public_profile = COALESCE(p_is_public_profile, p.is_public_profile)'));
    assert.ok(fix.includes('is_profession_public = COALESCE(p_is_profession_public, p.is_profession_public)'));
    assert.equal(/profession = p_profession/.test(fix), false, 'the buggy unconditional assignment is gone');
    assert.equal(/coalesce\(p_is_public_profile, false\)/i.test(fix), false);
  });

  test('keeps the nick rules (format, reserved names, prefix, 7-day cooldown, uniqueness)', () => {
    for (const rule of [
      "'^[a-zA-Z0-9_\\-]+$'",
      "('admin', 'root', 'support', 'staff', 'mod', 'moderator', 'zeroday', 'official')",
      "LIKE 'operatore-%'",
      "INTERVAL '7 days'",
      "USING ERRCODE = '23505'",
    ]) {
      assert.ok(fix.includes(rule), `missing rule ${rule}`);
    }
  });

  test('bounds profession to 60 characters and lets a blank value clear it', () => {
    assert.ok(fix.includes("NULLIF(pg_catalog.btrim(p_profession), '')"));
    assert.ok(fix.includes('pg_catalog.char_length(v_clean_profession) > 60'));
  });
});
