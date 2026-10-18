import { Capacitor } from '@capacitor/core';

export const APK_DOWNLOAD_URL = '/downloads/zeroday.apk';
export const APK_VERSION = 'v1.2.0';
export const APK_SIZE = '20.8 MB';
export const APK_SHA256 = 'ea8c55f0c7563905ae58a58b33cf84222d03dbb19862c731c9410497811171b7';

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
