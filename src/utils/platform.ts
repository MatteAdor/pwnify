import { Capacitor } from '@capacitor/core';

export const APK_DOWNLOAD_URL = '/downloads/zeroday.apk';
export const APK_VERSION = 'v1.2.1';
export const APK_SIZE = '9.3 MB';
export const APK_SHA256 = '5c9895318fdc732d2d7865239e209706c782f46ebf30528d69a5a9031761e5ce';

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
