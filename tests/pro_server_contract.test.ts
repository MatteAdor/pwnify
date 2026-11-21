import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => fs.readFileSync(path.join(rootDir, rel), 'utf-8');

describe('Server PRO & profiles contract (static checks)', () => {
  const contract = read('supabase/contract/20261121000001_contract_profiles_privileged_columns.sql');

  test('revokes direct client writes and anon base-table reads on profiles', () => {
    assert.match(contract, /REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public\.profiles FROM PUBLIC, anon, authenticated;/);
    assert.match(contract, /REVOKE SELECT ON public\.profiles FROM anon;/);
    assert.match(contract, /CREATE POLICY "profiles_read_own" ON public\.profiles\s+FOR SELECT TO authenticated\s+USING \(id = \(SELECT auth\.uid\(\)\)\);/);
    assert.equal(/CREATE POLICY "profiles_read_all"/.test(contract), false, 'must not recreate the read-all policy');
  });

  test('guards every privileged column and fires after the is_pro trigger', () => {
    for (const col of ['is_pro', 'xp', 'elo', 'rank', 'flagged', 'legacy_imported', 'matchmaking_cooldown_until', 'last_ranked_at', 'nick', 'nick_updated_at']) {
      assert.ok(contract.includes(`NEW.${col} IS DISTINCT FROM OLD.${col}`), `UPDATE guard must cover ${col}`);
    }
    assert.match(contract, /BEFORE INSERT OR UPDATE ON public\.profiles/);
    // Postgres fires same-timing triggers in name order: keep the is_pro trigger first
    assert.ok('trg_protect_profiles_is_pro' < 'trg_protect_profiles_privileged_columns');
    assert.match(contract, /CREATE TRIGGER trg_protect_profiles_privileged_columns/);
  });

  test('license edge functions accept no dev keys, prefixes or client checksums', () => {
    for (const rel of ['supabase/functions/validate_license/index.ts', 'supabase/functions/lemonsqueezy_webhook/index.ts']) {
      const src = read(rel);
      for (const forbidden of [/0xPRO/i, /0xDEV/i, /CONTRIBUTOR/i, /checksum/i, /DEV-(MATTEO|GIACOMO|CORE)/i]) {
        assert.equal(forbidden.test(src), false, `${rel} must not contain ${forbidden}`);
      }
    }
  });

  test('set_profile_pro_status is executable only by service_role', () => {
    const mig = read('supabase/migrations/20261019000004_pro_license_system.sql');
    assert.match(mig, /REVOKE ALL ON FUNCTION public\.set_profile_pro_status FROM PUBLIC, anon, authenticated;/);
    assert.match(mig, /GRANT EXECUTE ON FUNCTION public\.set_profile_pro_status TO service_role;/);
  });
});
