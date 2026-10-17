// Configuration file for ZeroDay Monetization Bridge
// Supports Stripe Payment Links, LemonSqueezy Checkouts, and Custom Webhooks

export interface MonetizationConfig {
  stripeAnnualUrl: string;
  stripeMonthlyUrl: string;
  stripeDownsellUrl: string;
  starterPassUrl: string;
  enableRealRedirect: boolean;
  currency: string;
  pricing: {
    annualTotal: number;
    annualPerMonth: number;
    monthlyTotal: number;
    downsellAnnualTotal: number;
    downsellPerMonth: number;
    starterPass30Days: number;
  };
}

export const MONETIZATION_CONFIG: MonetizationConfig = {
  // Replace these URLs with your real Stripe Payment Links or LemonSqueezy Checkout links:
  stripeAnnualUrl: 'https://buy.stripe.com/test_annual_zeroday_pro',
  stripeMonthlyUrl: 'https://buy.stripe.com/test_monthly_zeroday_pro',
  stripeDownsellUrl: 'https://buy.stripe.com/test_downsell_override_pro',
  starterPassUrl: 'https://buy.stripe.com/test_starter_pass_30d',

  // Set to true in production to redirect directly to Stripe checkout page.
  // When false, ZeroDay runs a high-converting Cyber Simulation Checkout with automatic instant unlock.
  enableRealRedirect: false,

  currency: '€',

  pricing: {
    annualTotal: 69.00,
    annualPerMonth: 5.75,
    monthlyTotal: 14.99,
    downsellAnnualTotal: 39.99,
    downsellPerMonth: 3.33,
    starterPass30Days: 4.99
  }
};
