import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { App } from '@capacitor/app';
import { analytics } from './analytics.ts';

export const APK_SIZE = '12.0 MB';

export type DistributionFlavor = 'play' | 'direct';

export interface DirectUpdatePlugin {
  getDistributionFlavor(): Promise<{ flavor: DistributionFlavor }>;
  canRequestPackageInstalls(): Promise<{ canInstall: boolean }>;
  openInstallPermissionSettings(): Promise<void>;
  downloadAndInstallApk(options: { url: string; expectedSha256: string; autoInstall?: boolean }): Promise<{ success: boolean; filePath: string; sha256: string }>;
  installLocalApk(options: { filePath: string; expectedSha256: string }): Promise<{ success: boolean }>;
  addListener(eventName: 'downloadProgress', listenerFunc: (progress: { progress: number; bytesDownloaded: number; totalBytes: number }) => void): Promise<PluginListenerHandle>;
}

export const DirectUpdate = registerPlugin<DirectUpdatePlugin>('DirectUpdate');

export interface RuntimeVersionInfo {
  versionName: string;
  versionCode: number;
  platform: 'android' | 'ios' | 'web';
  flavor: DistributionFlavor;
}

let cachedRuntimeInfo: RuntimeVersionInfo = {
  versionName: '1.2.6',
  versionCode: 6,
  platform: 'web',
  flavor: 'direct',
};
let isInitialized = false;
let isResolving = false;
let isTimedOut = false;
let mockIsNative: boolean | null = null;

type FlavorListener = () => void;
const flavorListeners = new Set<FlavorListener>();

function notifyFlavorListeners(): void {
  for (const listener of flavorListeners) {
    try {
      listener();
    } catch {}
  }
}

export function subscribeDistributionFlavor(listener: FlavorListener): () => void {
  flavorListeners.add(listener);
  return () => flavorListeners.delete(listener);
}

/**
 * Returns true if running inside the compiled native mobile application (Capacitor Android/iOS).
 */
export function isNativeApp(): boolean {
  if (mockIsNative !== null) {
    return mockIsNative;
  }
  try {
    if (typeof window === 'undefined') return false;
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * Returns true if the user is accessing the platform from a web browser.
 */
export function isBrowserEnvironment(): boolean {
  return !isNativeApp();
}

/**
 * Reads single source of truth version info directly from native runtime (Capacitor App info + DirectUpdate plugin).
 * Uses a strict 3000ms timeout race. If resolution fails or times out, remains fail-closed (locked purchases).
 */
export async function getRuntimeVersionInfo(forceRetry = false): Promise<RuntimeVersionInfo> {
  if (isInitialized && !forceRetry) {
    return cachedRuntimeInfo;
  }

  isResolving = true;
  isTimedOut = false;
  notifyFlavorListeners();

  const platform = Capacitor.getPlatform() as 'android' | 'ios' | 'web';
  let versionName = '1.2.1';
  let versionCode = 1;
  let flavor: DistributionFlavor = 'direct';

  if (isNativeApp()) {
    try {
      const info = await App.getInfo();
      if (info.version) versionName = info.version;
      if (info.build) {
        const parsed = parseInt(info.build, 10);
        if (!isNaN(parsed) && parsed > 0) {
          versionCode = parsed;
        }
      }
    } catch (err) {
      console.warn('[Platform] Could not read native App.getInfo():', err);
    }

    try {
      const timeoutPromise = new Promise<{ flavor: DistributionFlavor }>((_, reject) => {
        setTimeout(() => reject(new Error('Flavor resolution timed out after 3000ms')), 3000);
      });

      const flavorRes = await Promise.race([
        DirectUpdate.getDistributionFlavor(),
        timeoutPromise,
      ]);

      if (flavorRes?.flavor === 'play' || flavorRes?.flavor === 'direct') {
        flavor = flavorRes.flavor;
        isInitialized = true;
        isTimedOut = false;
      }
    } catch (err) {
      console.warn('[Platform] getDistributionFlavor failed or timed out (staying fail-closed):', err);
      isTimedOut = true;
      isInitialized = false; // Stays fail-closed
      flavor = 'play'; // Block purchases by default
      analytics.track('distribution_flavor_timeout', {
        platform,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  } else {
    isInitialized = true;
    isTimedOut = false;
  }

  isResolving = false;
  cachedRuntimeInfo = {
    versionName,
    versionCode,
    platform: platform === 'android' ? 'android' : platform === 'ios' ? 'ios' : 'web',
    flavor,
  };
  notifyFlavorListeners();

  return cachedRuntimeInfo;
}

/**
 * Synchronous cached version accessor for React render cycles.
 */
export function getCachedVersionInfo(): RuntimeVersionInfo {
  return cachedRuntimeInfo;
}

/**
 * On native mobile, returns true (purchases locked) until getDistributionFlavor resolves.
 * Once resolved, true only if compiled with flavor 'play'.
 * On web, always returns false (purchases and external checkout permitted).
 */
export function isPlayDistribution(): boolean {
  if (isNativeApp()) {
    if (!isInitialized) {
      return true; // Fail-closed until flavor is resolved
    }
    return cachedRuntimeInfo.flavor === 'play';
  }
  return false;
}

export function isDirectDistribution(): boolean {
  if (isNativeApp()) {
    if (!isInitialized) {
      return false;
    }
    return cachedRuntimeInfo.flavor === 'direct';
  }
  return true;
}

export function isFlavorResolving(): boolean {
  if (isNativeApp()) {
    return isResolving || (!isInitialized && !isTimedOut);
  }
  return false;
}

export function isFlavorTimedOut(): boolean {
  if (isNativeApp()) {
    return isTimedOut;
  }
  return false;
}

export function retryDistributionResolution(): Promise<RuntimeVersionInfo> {
  return getRuntimeVersionInfo(true);
}

/**
 * Testing helpers for simulating native, unresolved, and flavor states.
 */
export function setMockDistributionState(options: {
  isNative: boolean;
  resolved: boolean;
  timedOut?: boolean;
  flavor?: DistributionFlavor;
}): void {
  mockIsNative = options.isNative;
  isInitialized = options.resolved;
  isTimedOut = options.timedOut ?? false;
  isResolving = options.isNative && !options.resolved && !options.timedOut;
  if (options.flavor) {
    cachedRuntimeInfo = {
      ...cachedRuntimeInfo,
      platform: options.isNative ? 'android' : 'web',
      flavor: options.flavor,
    };
  }
  notifyFlavorListeners();
}

export function setMockDistributionFlavor(flavor: DistributionFlavor): void {
  setMockDistributionState({ isNative: true, resolved: true, flavor });
}

export function resetMockDistribution(): void {
  mockIsNative = null;
  isInitialized = false;
  isResolving = false;
  isTimedOut = false;
  cachedRuntimeInfo = {
    versionName: '1.2.1',
    versionCode: 1,
    platform: 'web',
    flavor: 'direct',
  };
  notifyFlavorListeners();
}

// Kick off eager initialization in background
if (typeof window !== 'undefined') {
  getRuntimeVersionInfo().catch(() => {});
}
