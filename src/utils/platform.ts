import { Capacitor } from '@capacitor/core';

export const APK_DOWNLOAD_URL = '/downloads/zeroday.apk';
export const APK_VERSION = 'v1.2.1';
export const APK_SIZE = '46.6 MB';
export const APK_SHA256 = 'ce0e77fe23f6211d1f53061861eaf89a68cc718aa10c50775e263bf7a7faf049';

/**
 * Returns true if running inside the compiled native mobile application (Capacitor Android/iOS).
 * Returns false if running inside a standard desktop or mobile web browser.
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
