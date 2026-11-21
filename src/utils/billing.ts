// Client-side billing actions (Polar).
//
// The client only asks the `create_checkout` Edge Function for a hosted checkout URL
// and opens it. It never grants PRO: entitlement is written by `polar_webhook` into
// profiles.is_pro and read back with the profile sync.

import { MONETIZATION_CONFIG } from '../config/monetization';
import { isSafeRedirectUrl } from './security';
import { isNativeApp } from './platform';

export type BillingResult = { ok: true } | { ok: false; error: string };

/**
 * Opens an external billing page. On Android (Capacitor) it uses the in-app browser
 * and calls `onClosed` when the user comes back, so the caller can re-read is_pro.
 */
export async function openBillingUrl(url: string, onClosed?: () => void): Promise<void> {
  if (isNativeApp()) {
    const { Browser } = await import('@capacitor/browser');
    if (onClosed) {
      const handle = await Browser.addListener('browserFinished', () => {
        void handle.remove();
        onClosed();
      });
    }
    await Browser.open({ url });
    return;
  }
  window.location.href = url;
}

/** Creates a Polar checkout session for the signed-in user and opens it. */
export async function startProCheckout(onClosed?: () => void): Promise<BillingResult> {
  if (!MONETIZATION_CONFIG.enableCheckout) {
    return { ok: false, error: 'Checkout is disabled in this build.' };
  }

  const { supabase, isSupabaseConfigured } = await import('../config/supabase');
  if (!isSupabaseConfigured) {
    return { ok: false, error: 'Checkout requires a connection to the Pwnify server.' };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session) {
    return { ok: false, error: 'Sign in with Google or GitHub to upgrade to PRO.' };
  }

  const { data, error } = await supabase.functions.invoke('create_checkout', { body: {} });
  const url = (data as { url?: unknown } | null)?.url;
  if (error || typeof url !== 'string' || !isSafeRedirectUrl(url)) {
    return { ok: false, error: 'Could not start checkout. Please try again later.' };
  }

  await openBillingUrl(url, onClosed);
  return { ok: true };
}

/** Opens the Polar customer portal (manage or cancel the subscription). */
export async function openCustomerPortal(onClosed?: () => void): Promise<void> {
  await openBillingUrl(MONETIZATION_CONFIG.customerPortalUrl, onClosed);
}
