/**
 * ZeroDay — Centralized Versioning & Semver / VersionCode Comparison Engine
 * Single Source of Truth: versionCode is the definitive criteria; versionName is for UI display.
 */

import { isNativeApp } from './platform.ts';

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
  apk_hashes?: Record<string, string>; // mapping from versionCode to sha256
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

export const ALLOWED_APK_REPO = 'MatteAdor/zeroday_app';

export function isValidSha256(hash?: string | null): boolean {
  if (!hash) return false;
  return /^[a-fA-F0-9]{64}$/.test(hash.trim());
}

export function isAllowedDownloadUrl(urlStr: string): boolean {
  try {
    if (!urlStr || typeof urlStr !== 'string') return false;
    if (!urlStr.startsWith('https://')) return false;
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname;

    // ZeroDay Academy official domains
    if (host === 'zeroday.academy' || host.endsWith('.zeroday.academy')) {
      return pathname.startsWith('/downloads/');
    }
    if (host === 'zeroday-app.vercel.app') {
      return pathname.startsWith('/downloads/');
    }

    // GitHub official repository releases & raw assets (strictly restricted to owner/repo)
    if (host === 'github.com') {
      return pathname.startsWith(`/${ALLOWED_APK_REPO}/releases/download/`);
    }
    if (host === 'raw.githubusercontent.com') {
      return pathname.startsWith(`/${ALLOWED_APK_REPO}/`);
    }
    if (host === 'objects.githubusercontent.com') {
      // GitHub release asset CDN redirect host
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export function resolveApkSha256(config: RemotePlatformConfig, targetBuildCode?: number): string | null {
  const code = targetBuildCode ?? config.latest_version_code;
  if (config.apk_hashes && config.apk_hashes[String(code)]) {
    const hash = config.apk_hashes[String(code)];
    if (isValidSha256(hash)) return hash.toLowerCase();
  }
  if (config.apk_sha256 && isValidSha256(config.apk_sha256)) {
    return config.apk_sha256.toLowerCase();
  }
  return null;
}



export const DEFAULT_FALLBACK_APK_URL = 'https://zeroday.academy/#download';

/**
 * Sanitizes URLs pointing to legacy or dead endpoints.
 * In particular, redirects WordPress marketing portal paths (which 404)
 * to the actual APK hosting on Vercel.
 */
export function sanitizeApkUrl(url: string): string {
  if (!url || typeof url !== 'string') return url;
  if (url.includes('zeroday.academy/downloads/')) {
    return url.replace('zeroday.academy/downloads/', 'zeroday-app.vercel.app/downloads/');
  }
  return url;
}

/**
 * Resolves current APK download URL from remote config or cached configuration in storage,
 * with fail-safe fallback to official website download section.
 */
export function resolveApkDownloadUrl(config?: RemotePlatformConfig | null): string {
  // 1. If in browser context (web app visitor), default to direct hosted APK on Vercel
  if (typeof window !== 'undefined' && !isNativeApp()) {
    if (config?.apk_download_url && config.apk_download_url.trim()) {
      const sanitized = sanitizeApkUrl(config.apk_download_url.trim());
      if (isAllowedDownloadUrl(sanitized)) return sanitized;
    }
    return '/downloads/zeroday.apk';
  }

  if (config?.apk_download_url && config.apk_download_url.trim()) {
    return sanitizeApkUrl(config.apk_download_url.trim());
  }

  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem('zeroday_remote_app_config_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.config?.apk_download_url && typeof parsed.config.apk_download_url === 'string') {
          return sanitizeApkUrl(parsed.config.apk_download_url.trim());
        }
      }
    }
  } catch {}

  return DEFAULT_FALLBACK_APK_URL;
}
