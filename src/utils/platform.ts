import { Capacitor } from '@capacitor/core';

export const APK_DOWNLOAD_URL = '/downloads/zeroday.apk';
export const APK_VERSION = 'v1.2.1';
export const APK_SIZE = '33.4 MB';
export const APK_SHA256 = '83e4bfc34cec122b969ffee5fca7b9b67628c7bef04019255e7b6713e1c64c73';

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
