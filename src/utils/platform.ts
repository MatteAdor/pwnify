import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { App } from '@capacitor/app';

export const APK_DOWNLOAD_URL = '/downloads/zeroday.apk';
export const APK_SIZE = '60.2 MB';
export const APK_SHA256 = '131872a8fb3127c80c6c64d790a76e833715b70c7c09e8b44328fe8e121f53d0';

export type DistributionFlavor = 'play' | 'direct';

export interface DirectUpdatePlugin {
  getDistributionFlavor(): Promise<{ flavor: DistributionFlavor }>;
  canRequestPackageInstalls(): Promise<{ canInstall: boolean }>;
  openInstallPermissionSettings(): Promise<void>;
  downloadAndInstallApk(options: { url: string; expectedSha256?: string }): Promise<{ success: boolean; filePath: string; sha256: string }>;
  installLocalApk(options: { filePath: string; expectedSha256?: string }): Promise<{ success: boolean }>;
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
  versionName: '1.2.1',
  versionCode: 1,
  platform: 'web',
  flavor: 'direct',
};
let isInitialized = false;

/**
 * Returns true if running inside the compiled native mobile application (Capacitor Android/iOS).
 */
export function isNativeApp(): boolean {
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
 */
export async function getRuntimeVersionInfo(): Promise<RuntimeVersionInfo> {
  if (isInitialized) {
    return cachedRuntimeInfo;
  }

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
      const flavorRes = await DirectUpdate.getDistributionFlavor();
      if (flavorRes?.flavor === 'play' || flavorRes?.flavor === 'direct') {
        flavor = flavorRes.flavor;
      }
    } catch {
      // DirectUpdate not available or not Android
      flavor = 'direct';
    }
  }

  cachedRuntimeInfo = {
    versionName,
    versionCode,
    platform: platform === 'android' ? 'android' : platform === 'ios' ? 'ios' : 'web',
    flavor,
  };
  isInitialized = true;

  return cachedRuntimeInfo;
}

/**
 * Synchronous cached version accessor for React render cycles.
 */
export function getCachedVersionInfo(): RuntimeVersionInfo {
  return cachedRuntimeInfo;
}

// Kick off eager initialization in background
if (typeof window !== 'undefined') {
  getRuntimeVersionInfo().catch(() => {});
}
