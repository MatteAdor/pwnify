import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractLegacyCosmetics,
  mergeCosmetics,
  resolveProfileConflict,
  PROFILE_CACHE_KEY_V2
} from '../src/utils/cloudSync.ts';
import type { VersionedProfileCache, ProfileRow } from '../src/utils/cloudSync.ts';
import type { UserState } from '../src/types/index.ts';

// Mock localStorage for Node test runner environment
const mockStorage: Record<string, string> = {};
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, value: string) => { mockStorage[key] = value; },
  removeItem: (key: string) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); },
  key: (i: number) => Object.keys(mockStorage)[i] || null,
  length: 0
};

describe('Step 2: Progress Migration & Cache Versioning (cloudSync.ts)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('extractLegacyCosmetics extracts strictly cosmetic items, ignoring licenses and credentials', () => {
    const legacyState: Partial<UserState> = {
      username: 'ShadowOperator',
      isPro: true, // MUST NOT be extracted
      licenseKey: '0xPRO-MALICIOUS-KEY', // MUST NOT be extracted
      userEmail: 'operator@zeroday.local', // MUST NOT be extracted
      activeTheme: 'cyberpunk-neon',
      customTitle: 'Senior Reverse Engineer',
      completedNodeIds: ['node_asm_1', 'node_rop_2', 'node_kernel_3'],
      xp: 25000,
      elo: 1650
    };

    const cosmetics = extractLegacyCosmetics(legacyState);

    assert.equal(cosmetics.activeTheme, 'cyberpunk-neon');
    assert.equal(cosmetics.customTitle, 'Senior Reverse Engineer');
    assert.deepEqual(cosmetics.unlockedBadges, ['node_asm_1', 'node_rop_2', 'node_kernel_3']);
    assert.equal((cosmetics as Record<string, unknown>).isPro, undefined, 'License flag isPro must be stripped');
    assert.equal((cosmetics as Record<string, unknown>).licenseKey, undefined, 'License key must be stripped');
    assert.equal((cosmetics as Record<string, unknown>).userEmail, undefined, 'Email must not be in cosmetics');
  });

  test('mergeCosmetics performs additive merge with server precedence on collision', () => {
    const local = {
      theme: 'matrix-green',
      badgeA: 'earned_locally',
      sharedTag: 'local_value'
    };

    const server = {
      badgeB: 'earned_on_server',
      sharedTag: 'server_authoritative_value'
    };

    const merged = mergeCosmetics(server, local);

    assert.equal(merged.theme, 'matrix-green');
    assert.equal(merged.badgeA, 'earned_locally');
    assert.equal(merged.badgeB, 'earned_on_server');
    assert.equal(merged.sharedTag, 'server_authoritative_value', 'Server takes precedence on collision');
  });

  test('resolveProfileConflict enforces server-wins on ELO, rank, and flagged status', () => {
    const serverProfile: ProfileRow = {
      id: '11111111-1111-1111-1111-111111111111',
      nick: 'GhostRider',
      elo: 1450, // Authoritative server ELO
      rank: 'Gold Specialist',
      xp: 8000,
      inventory: { server_trophy: 'pvp_season_1' },
      profession: 'Exploit Researcher',
      flagged: true, // Flagged for investigation
      legacy_imported: true,
      last_ranked_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const localCache: Partial<VersionedProfileCache> = {
      elo: 2200, // Client tries to claim Grandmaster
      rank: 'Grandmaster Elite',
      flagged: false, // Client claims clean
      inventory: { local_skin: 'dark_matter' }
    };

    const localState: Partial<UserState> = {
      customTitle: 'ZeroDay Champion'
    };

    const resolved = resolveProfileConflict(serverProfile, localCache, localState);

    assert.equal(resolved.version, 2);
    assert.equal(resolved.userId, '11111111-1111-1111-1111-111111111111');
    assert.equal(resolved.elo, 1450, 'Server ELO must overwrite local claims');
    assert.equal(resolved.rank, 'Gold Specialist', 'Server rank tier must overwrite local claims');
    assert.equal(resolved.flagged, true, 'Server flag state cannot be cleared locally');
    assert.equal(resolved.inventory.server_trophy, 'pvp_season_1');
    assert.equal(resolved.inventory.local_skin, 'dark_matter');
    assert.equal(resolved.inventory.customTitle, 'ZeroDay Champion');
  });

  test('one-shot migration caps XP at 15000 and locks initial ranked ELO to 100', () => {
    const rawLegacyXp = 99999; // Excessive legacy XP
    const cappedXp = Math.min(Math.max(rawLegacyXp, 0), 15000);
    const initialRankedElo = 100;

    assert.equal(cappedXp, 15000, 'Legacy XP import must be clamped strictly to 15000');
    assert.equal(initialRankedElo, 100, 'Ranked ELO must never import legacy rating, reset to 100');
  });

  test('localStorage v2 cache versioning ensures clean isolation from legacy v1 cache', () => {
    // Populate legacy v1
    localStorage.setItem('zeroday_cached_profile_v1', JSON.stringify({ elo: 9999 }));

    const cacheV2: VersionedProfileCache = {
      version: 2,
      userId: 'user_v2_abc',
      nick: 'HexHunter',
      elo: 1000,
      rank: 'Bronze Recruit',
      xp: 2500,
      inventory: { badge: 'alpha' },
      profession: 'Cyber Warfare Operator',
      flagged: false,
      legacyImported: true,
      syncedAt: Date.now()
    };

    localStorage.setItem(PROFILE_CACHE_KEY_V2, JSON.stringify(cacheV2));

    const stored = JSON.parse(localStorage.getItem(PROFILE_CACHE_KEY_V2)!);
    assert.equal(stored.version, 2);
    assert.equal(stored.userId, 'user_v2_abc');
    assert.equal(stored.elo, 1000);

    // Assert v1 key remains untouched and separate
    assert.ok(localStorage.getItem('zeroday_cached_profile_v1'));
  });
});
