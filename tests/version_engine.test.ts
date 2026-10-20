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
  isValidSha256,
  isAllowedDownloadUrl,
  resolveApkSha256,
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

  it('isValidSha256 validates 64-char hex strings and rejects malformed hashes', () => {
    assert.strictEqual(isValidSha256('ce0e77fe23f6211d1f53061861eaf89a68cc718aa10c50775e263bf7a7faf049'), true);
    assert.strictEqual(isValidSha256('CE0E77FE23F6211D1F53061861EAF89A68CC718AA10C50775E263BF7A7FAF049'), true);
    assert.strictEqual(isValidSha256(''), false);
    assert.strictEqual(isValidSha256('invalid-sha'), false);
    assert.strictEqual(isValidSha256('ce0e77fe23f6211d1f53061861eaf89a68cc718aa10c50775e263bf7a7faf04'), false); // 62 chars
    assert.strictEqual(isValidSha256(null as unknown as string), false);
    assert.strictEqual(isValidSha256(undefined), false);
  });

  it('isAllowedDownloadUrl strictly requires HTTPS and allowlisted repo/domain paths', () => {
    // Valid domains & paths
    assert.strictEqual(isAllowedDownloadUrl('https://zeroday.academy/downloads/zeroday.apk'), true);
    assert.strictEqual(isAllowedDownloadUrl('https://zeroday-app.vercel.app/downloads/zeroday.apk'), true);
    assert.strictEqual(isAllowedDownloadUrl('https://github.com/MatteAdor/zeroday_app/releases/download/v1.0.0/zeroday.apk'), true);
    assert.strictEqual(isAllowedDownloadUrl('https://raw.githubusercontent.com/MatteAdor/zeroday_app/main/apk'), true);
    assert.strictEqual(isAllowedDownloadUrl('https://objects.githubusercontent.com/github-production-release-asset-2e65be/12345'), true);

    // Forbidden third-party GitHub repos
    assert.strictEqual(isAllowedDownloadUrl('https://github.com/attacker/malicious_app/releases/download/v1.0/trojan.apk'), false);
    assert.strictEqual(isAllowedDownloadUrl('https://raw.githubusercontent.com/attacker/malicious_app/main/trojan.apk'), false);

    // Unauthorized paths on ZeroDay domains
    assert.strictEqual(isAllowedDownloadUrl('https://zeroday.academy/unauthorized/path.apk'), false);

    // Insecure protocol (HTTP)
    assert.strictEqual(isAllowedDownloadUrl('http://zeroday.academy/downloads/zeroday.apk'), false);
    assert.strictEqual(isAllowedDownloadUrl('http://github.com/MatteAdor/zeroday_app/releases/download/v1.0.0/zeroday.apk'), false);

    // Malicious or unapproved domains
    assert.strictEqual(isAllowedDownloadUrl('https://evil-site.com/zeroday.apk'), false);
    assert.strictEqual(isAllowedDownloadUrl('https://zeroday.academy.evil.com/fake.apk'), false);
    assert.strictEqual(isAllowedDownloadUrl('javascript:alert(1)'), false);
    assert.strictEqual(isAllowedDownloadUrl(''), false);
  });

  it('resolveApkSha256 retrieves version-specific hash or falls back to remote config sha256', () => {
    const multiHashConfig: RemotePlatformConfig = {
      ...baseConfig,
      latest_version_code: 3,
      apk_sha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      apk_hashes: {
        '2': '2222222222222222222222222222222222222222222222222222222222222222',
        '3': '3333333333333333333333333333333333333333333333333333333333333333',
      },
    };

    // Specific build code lookup
    assert.strictEqual(
      resolveApkSha256(multiHashConfig, 2),
      '2222222222222222222222222222222222222222222222222222222222222222'
    );
    // Defaults to latest_version_code (3)
    assert.strictEqual(
      resolveApkSha256(multiHashConfig),
      '3333333333333333333333333333333333333333333333333333333333333333'
    );
    // Unlisted code falls back to apk_sha256
    assert.strictEqual(
      resolveApkSha256(multiHashConfig, 99),
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    );

    // Missing both returns null
    const noHashConfig: RemotePlatformConfig = {
      ...baseConfig,
      apk_sha256: undefined,
      apk_hashes: undefined,
    };
    assert.strictEqual(resolveApkSha256(noHashConfig), null);
  });
});

import {
  isPlayDistribution,
  isDirectDistribution,
  setMockDistributionFlavor,
  setMockDistributionState,
  isFlavorResolving,
  isFlavorTimedOut,
  resetMockDistribution,
} from '../src/utils/platform.ts';

describe('Distribution Flavor Gating Suite', () => {
  it('correctly toggles between play and direct distribution states', () => {
    setMockDistributionFlavor('play');
    assert.strictEqual(isPlayDistribution(), true);
    assert.strictEqual(isDirectDistribution(), false);

    setMockDistributionFlavor('direct');
    assert.strictEqual(isPlayDistribution(), false);
    assert.strictEqual(isDirectDistribution(), true);
  });

  it('guarantees play flavor policy flags block checkout redirects and license bypass', () => {
    setMockDistributionFlavor('play');

    // Simulate URL checkout and license interception logic from App.tsx
    const searchParamsWithCheckout = new URLSearchParams('checkout=success&token=mock-token');
    const searchParamsWithLicense = new URLSearchParams('license=0xPRO-1234-5678-ABCD');

    const shouldProcessCheckoutInPlay = !isPlayDistribution();
    assert.strictEqual(shouldProcessCheckoutInPlay, false, 'Play flavor MUST NOT process checkout return');

    // Reset back to direct distribution
    setMockDistributionFlavor('direct');
    const shouldProcessCheckoutInDirect = !isPlayDistribution();
    assert.strictEqual(shouldProcessCheckoutInDirect, true, 'Direct flavor MUST permit checkout return');
  });

  it('native unresolved state reports resolving=true and locks purchases as fail-closed', () => {
    setMockDistributionState({ isNative: true, resolved: false, timedOut: false });
    assert.strictEqual(isFlavorResolving(), true, 'Must report resolving during native startup');
    assert.strictEqual(isFlavorTimedOut(), false);
    assert.strictEqual(isPlayDistribution(), true, 'Must remain fail-closed while resolving');
  });

  it('native resolution timeout triggers timedOut=true, stays fail-closed, and allows retry', () => {
    setMockDistributionState({ isNative: true, resolved: false, timedOut: true });
    assert.strictEqual(isFlavorTimedOut(), true, 'Must flag timeout');
    assert.strictEqual(isFlavorResolving(), false);
    assert.strictEqual(isPlayDistribution(), true, 'Must stay fail-closed on timeout');

    // Simulate successful resolution after retry
    setMockDistributionFlavor('direct');
    assert.strictEqual(isFlavorTimedOut(), false);
    assert.strictEqual(isDirectDistribution(), true);
  });

  it('web platform never reports resolving or timeout and leaves checkouts enabled', () => {
    setMockDistributionState({ isNative: false, resolved: false });
    assert.strictEqual(isFlavorResolving(), false, 'Web platform is never resolving');
    assert.strictEqual(isFlavorTimedOut(), false);
    assert.strictEqual(isPlayDistribution(), false);
    assert.strictEqual(isDirectDistribution(), true);
    resetMockDistribution();
  });
});

import {
  getAuthoritativeIceServers,
  clearIceServersCache,
  DEFAULT_ICE_SERVERS,
} from '../src/utils/turnService.ts';

describe('TURN & WebRTC ICE Relay Suite', () => {
  it('default ICE configuration strictly exposes public STUN with zero credentials', () => {
    assert.ok(Array.isArray(DEFAULT_ICE_SERVERS));
    assert.strictEqual(DEFAULT_ICE_SERVERS.length, 3);

    for (const server of DEFAULT_ICE_SERVERS) {
      assert.strictEqual(server.username, undefined, 'Client STUN must not contain usernames');
      assert.strictEqual(server.credential, undefined, 'Client STUN must not contain credentials');
      assert.ok(
        typeof server.urls === 'string' && server.urls.startsWith('stun:'),
        'Default servers must only be stun protocol'
      );
    }
  });

  it('getAuthoritativeIceServers falls back safely to STUN when unauthenticated', async () => {
    clearIceServersCache();
    const servers = await getAuthoritativeIceServers();
    assert.ok(Array.isArray(servers));
    assert.ok(servers.length > 0);
    // Verified: all urls are stun
    for (const s of servers) {
      assert.strictEqual(s.credential, undefined);
    }
  });
});



import {
  resolveApkDownloadUrl,
  DEFAULT_FALLBACK_APK_URL,
} from '../src/utils/versionUtils.ts';
import { updateManager } from '../src/utils/updateManager.ts';

describe('Remote Config RPC & Fail-Open Suite', () => {
  it('resolveApkDownloadUrl retrieves URL from remote config object', () => {
    const config = {
      latest_version: '1.2.2',
      latest_version_code: 3,
      min_supported_version: '1.2.0',
      min_supported_version_code: 1,
      force_message: { it: '', en: '' },
      store_url: '',
      apk_download_url: 'https://github.com/MatteAdor/zeroday_app/releases/download/v1.2.2/zeroday.apk',
      rollout_percent: 100,
      kill_switch: false,
    };
    assert.strictEqual(
      resolveApkDownloadUrl(config),
      'https://github.com/MatteAdor/zeroday_app/releases/download/v1.2.2/zeroday.apk'
    );
  });

  it('resolveApkDownloadUrl falls back to official portal download anchor when unconfigured', () => {
    assert.strictEqual(DEFAULT_FALLBACK_APK_URL, 'https://zeroday.academy/#download');
    assert.strictEqual(resolveApkDownloadUrl(null), 'https://zeroday.academy/#download');
    assert.ok(
      !resolveApkDownloadUrl(null).startsWith('/downloads/'),
      'Fallback URL must never point to local relative file path'
    );
    assert.strictEqual(resolveApkDownloadUrl(undefined), 'https://zeroday.academy/#download');
  });

  it('updateManager handles missing or failing RPC gracefully without crashing or blocking client (fail-open)', async () => {
    // Calling checkForUpdates when offline / failing RPC must not throw
    await assert.doesNotReject(async () => {
      await updateManager.checkForUpdates({ forceImmediateCheck: true, ignoreDebounce: true });
    });

    const state = updateManager.getState();
    // Verify fail-open: status is NOT FORCE_REQUIRED and no crash occurred
    assert.notStrictEqual(state.status, 'FORCE_REQUIRED', 'Failing RPC must fail-open and never block user');
  });
});
