import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  parseSemver,
  compareSemver,
  compareVersionCode,
  isForceUpdateRequired,
  isFlexibleUpdateAvailable,
  evaluateUpdateDisposition,
  computeRolloutBucket,
  type RemotePlatformConfig,
} from '../src/utils/versionUtils.ts';

describe('Version Engine & Comparison Suite', () => {
  it('parseSemver parses standard and prefixed versions', () => {
    assert.deepStrictEqual(parseSemver('1.2.1'), [1, 2, 1]);
    assert.deepStrictEqual(parseSemver('v1.2.1'), [1, 2, 1]);
    assert.deepStrictEqual(parseSemver('2.0.0-rc1'), [2, 0, 0]);
    assert.deepStrictEqual(parseSemver(''), [0, 0, 0]);
  });

  it('compareSemver accurately compares major, minor, patch and numbers > 9', () => {
    assert.strictEqual(compareSemver('1.2.0', '1.2.1'), -1);
    assert.strictEqual(compareSemver('1.2.1', '1.2.1'), 0);
    assert.strictEqual(compareSemver('1.3.0', '1.2.9'), 1);
    assert.strictEqual(compareSemver('1.10.0', '1.9.0'), 1); // numeric, not lexical
    assert.strictEqual(compareSemver('2.0.0', '1.99.99'), 1);
  });

  it('compareVersionCode handles numeric build comparisons', () => {
    assert.strictEqual(compareVersionCode(1, 2), -1);
    assert.strictEqual(compareVersionCode(2, 2), 0);
    assert.strictEqual(compareVersionCode(5, 2), 3);
  });

  const baseConfig: RemotePlatformConfig = {
    latest_version: '1.2.2',
    latest_version_code: 3,
    min_supported_version: '1.2.0',
    min_supported_version_code: 2,
    force_message: { it: 'Aggiornamento obbligatorio', en: 'Force update required' },
    store_url: 'https://play.google.com/store/apps/details?id=com.zeroday.academy',
    rollout_percent: 100,
    kill_switch: false,
  };

  it('isForceUpdateRequired flags client builds below min_supported_version_code', () => {
    // Client build 1 < min 2 -> TRUE
    assert.strictEqual(isForceUpdateRequired(1, baseConfig), true);

    // Client build 2 === min 2 -> FALSE
    assert.strictEqual(isForceUpdateRequired(2, baseConfig), false);

    // Client build 3 > min 2 -> FALSE
    assert.strictEqual(isForceUpdateRequired(3, baseConfig), false);
  });

  it('kill_switch bypasses force update in emergency scenarios', () => {
    const emergencyConfig = { ...baseConfig, kill_switch: true };
    // Even if client build is 1 < 2, kill_switch bypasses force update
    assert.strictEqual(isForceUpdateRequired(1, emergencyConfig), false);
  });

  it('isFlexibleUpdateAvailable gates updates based on rollout percentage', () => {
    // Client build 2 < latest 3 and >= min 2 -> Candidate for flexible
    assert.strictEqual(isFlexibleUpdateAvailable(2, baseConfig), true);

    // If already on latest build 3 -> FALSE
    assert.strictEqual(isFlexibleUpdateAvailable(3, baseConfig), false);

    // If rollout is 0% -> never offered
    const zeroRollout = { ...baseConfig, rollout_percent: 0 };
    assert.strictEqual(isFlexibleUpdateAvailable(2, zeroRollout), false);

    // Rollout bucketing is deterministic per deviceId
    const bucket = computeRolloutBucket('device-alpha-123');
    assert.ok(bucket >= 0 && bucket < 100);
  });

  it('evaluateUpdateDisposition returns correct lifecycle states', () => {
    // Build 1: below min (2) -> FORCE_UPDATE_REQUIRED
    assert.strictEqual(evaluateUpdateDisposition(1, baseConfig), 'FORCE_UPDATE_REQUIRED');

    // Build 2: equal to min (2), but below latest (3) -> FLEXIBLE_UPDATE_AVAILABLE
    assert.strictEqual(evaluateUpdateDisposition(2, baseConfig), 'FLEXIBLE_UPDATE_AVAILABLE');

    // Build 3: on latest (3) -> UP_TO_DATE
    assert.strictEqual(evaluateUpdateDisposition(3, baseConfig), 'UP_TO_DATE');

    // Build 4: ahead of latest -> UP_TO_DATE
    assert.strictEqual(evaluateUpdateDisposition(4, baseConfig), 'UP_TO_DATE');
  });
});
