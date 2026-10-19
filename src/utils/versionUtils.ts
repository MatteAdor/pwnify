/**
 * ZeroDay — Centralized Versioning & Semver / VersionCode Comparison Engine
 * Single Source of Truth: versionCode is the definitive criteria; versionName is for UI display.
 */

export interface AppVersionInfo {
  versionName: string;
  versionCode: number;
  platform: 'android' | 'ios' | 'web';
  flavor?: 'play' | 'direct';
}

export interface RemotePlatformConfig {
  latest_version: string;
  latest_version_code: number;
  min_supported_version: string;
  min_supported_version_code: number;
  force_message: Record<string, string>;
  store_url: string;
  apk_download_url?: string;
  apk_sha256?: string;
  rollout_percent: number;
  kill_switch: boolean;
  changelog?: Record<string, string[]>;
}

export interface RemoteAppConfig {
  android: RemotePlatformConfig;
  ios?: RemotePlatformConfig;
  web?: RemotePlatformConfig;
}

export type UpdateDisposition =
  | 'UP_TO_DATE'
  | 'FORCE_UPDATE_REQUIRED'
  | 'FLEXIBLE_UPDATE_AVAILABLE';

/**
 * Normalizes semver string e.g. "v1.2.1" -> [1, 2, 1]
 */
export function parseSemver(version: string): [number, number, number] {
  if (!version || typeof version !== 'string') return [0, 0, 0];
  const cleaned = version.trim().replace(/^v/i, '').split('-')[0].split('+')[0];
  const parts = cleaned.split('.').map((p) => {
    const num = parseInt(p, 10);
    return isNaN(num) ? 0 : num;
  });
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

/**
 * Compares two semver strings: returns -1 if a < b, 0 if a === b, 1 if a > b.
 */
export function compareSemver(a: string, b: string): number {
  const [aMaj, aMin, aPat] = parseSemver(a);
  const [bMaj, bMin, bPat] = parseSemver(b);

  if (aMaj !== bMaj) return aMaj > bMaj ? 1 : -1;
  if (aMin !== bMin) return aMin > bMin ? 1 : -1;
  if (aPat !== bPat) return aPat > bPat ? 1 : -1;
  return 0;
}

/**
 * Compares two numeric version codes: returns <0 if a < b, 0 if a === b, >0 if a > b.
 */
export function compareVersionCode(a: number, b: number): number {
  const codeA = Number(a) || 0;
  const codeB = Number(b) || 0;
  return codeA - codeB;
}

/**
 * Evaluates whether a client build is strictly below the minimum supported version.
 * If kill_switch is active on remote, force update is bypassed (returns false).
 */
export function isForceUpdateRequired(
  clientVersionCode: number,
  config: Pick<RemotePlatformConfig, 'min_supported_version_code' | 'kill_switch'>
): boolean {
  if (config.kill_switch) {
    return false; // Emergency kill-switch bypass
  }
  return compareVersionCode(clientVersionCode, config.min_supported_version_code) < 0;
}

/**
 * Computes deterministic 0-99 bucket for rollout percentage calculation.
 */
export function computeRolloutBucket(identifier: string): number {
  if (!identifier) return 0;
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = (hash << 5) - hash + identifier.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 100;
}

/**
 * Evaluates whether a flexible (non-blocking) update should be offered to this client.
 */
export function isFlexibleUpdateAvailable(
  clientVersionCode: number,
  config: Pick<RemotePlatformConfig, 'latest_version_code' | 'min_supported_version_code' | 'rollout_percent' | 'kill_switch'>,
  deviceId: string = 'client-default'
): boolean {
  // If force update is already required or client is already on/ahead latest
  if (compareVersionCode(clientVersionCode, config.latest_version_code) >= 0) {
    return false;
  }
  if (compareVersionCode(clientVersionCode, config.min_supported_version_code) < 0) {
    return false; // Force update takes precedence
  }

  // Rollout percent gating: 0-100
  const rolloutPercent = Math.max(0, Math.min(100, config.rollout_percent ?? 100));
  if (rolloutPercent >= 100) return true;
  if (rolloutPercent <= 0) return false;

  const bucket = computeRolloutBucket(deviceId);
  return bucket < rolloutPercent;
}

/**
 * Returns overall UpdateDisposition for the client.
 */
export function evaluateUpdateDisposition(
  clientVersionCode: number,
  config: RemotePlatformConfig,
  deviceId: string = 'client-default'
): UpdateDisposition {
  if (isForceUpdateRequired(clientVersionCode, config)) {
    return 'FORCE_UPDATE_REQUIRED';
  }
  if (isFlexibleUpdateAvailable(clientVersionCode, config, deviceId)) {
    return 'FLEXIBLE_UPDATE_AVAILABLE';
  }
  return 'UP_TO_DATE';
}

/**
 * Formats version and build string for UI display.
 */
export function formatVersionDisplay(versionName: string, versionCode: number | string): string {
  const cleanName = versionName.startsWith('v') ? versionName : `v${versionName}`;
  return `${cleanName} (build ${versionCode})`;
}
