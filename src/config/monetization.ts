// Configuration file for ZeroDay Monetization Bridge
// Supports Stripe Payment Links, LemonSqueezy Checkouts, and Cryptographic License Verification

export interface MonetizationConfig {
  stripeAnnualUrl: string;
  stripeMonthlyUrl: string;
  starterPassUrl: string;
  enableRealRedirect: boolean;
  currency: string;
  pricing: {
    annualTotal: number;
    annualPerMonth: number;
    monthlyTotal: number;
    starterPass30Days: number;
  };
}

export const MONETIZATION_CONFIG: MonetizationConfig = {
  // URLs can be configured via environment variables (.env) or overridden here:
  stripeAnnualUrl: (import.meta.env?.VITE_STRIPE_ANNUAL_URL as string) || 'https://buy.stripe.com/test_annual_zeroday_pro',
  stripeMonthlyUrl: (import.meta.env?.VITE_STRIPE_MONTHLY_URL as string) || 'https://buy.stripe.com/test_monthly_zeroday_pro',
  starterPassUrl: (import.meta.env?.VITE_STRIPE_STARTER_URL as string) || 'https://buy.stripe.com/test_starter_pass_30d',

  // Set to true in production or via VITE_ENABLE_REAL_STRIPE_REDIRECT=true
  enableRealRedirect: import.meta.env?.VITE_ENABLE_REAL_STRIPE_REDIRECT === 'true',

  currency: '€',

  pricing: {
    annualTotal: 69.00,
    annualPerMonth: 5.75,
    monthlyTotal: 14.99,
    starterPass30Days: 4.99
  }
};
