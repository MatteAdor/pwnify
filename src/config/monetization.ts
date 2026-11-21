// Pwnify billing configuration (client side).
//
// Payments run on Polar (Merchant of Record). The client never builds checkout URLs
// itself: it calls the `create_checkout` Edge Function, which creates the session
// server-side and binds it to the authenticated user. PRO status is granted only by
// the `polar_webhook` Edge Function and read back from profiles.is_pro.

export interface MonetizationConfig {
  /** Master switch for the external (Polar) checkout. */
  enableCheckout: boolean;
  /** Polar customer portal (manage / cancel subscription, invoices). */
  customerPortalUrl: string;
}

const DEFAULT_PORTAL_URL = 'https://polar.sh/pwnify/portal';

export const MONETIZATION_CONFIG: MonetizationConfig = {
  enableCheckout: import.meta.env?.VITE_ENABLE_REAL_CHECKOUT_REDIRECT !== 'false',
  customerPortalUrl: (import.meta.env?.VITE_POLAR_PORTAL_URL as string) || DEFAULT_PORTAL_URL,
};
