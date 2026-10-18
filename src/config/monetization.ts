import { PRICING_CONFIG } from './pricing.config';

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
    starterPass90Days: number;
  };
}

export const MONETIZATION_CONFIG: MonetizationConfig = {
  stripeAnnualUrl: (import.meta.env?.VITE_STRIPE_ANNUAL_URL as string) || 'https://zeroday-app.lemonsqueezy.com/checkout/buy/9dcce9d8-1477-4a77-b4b7-387f7b6a2d3d',
  stripeMonthlyUrl: (import.meta.env?.VITE_STRIPE_MONTHLY_URL as string) || 'https://zeroday-app.lemonsqueezy.com/checkout/buy/386f6353-c719-4d1b-b63d-360002bf5520',
  starterPassUrl: (import.meta.env?.VITE_STRIPE_STARTER_URL as string) || 'https://zeroday-app.lemonsqueezy.com/checkout/buy/dd9271e3-bbc4-41d6-ac63-3f5f4cddc0b0',

  enableRealRedirect: import.meta.env?.VITE_ENABLE_REAL_STRIPE_REDIRECT !== 'false',

  currency: PRICING_CONFIG.currencySymbol,

  pricing: {
    annualTotal: PRICING_CONFIG.plans.annual.amount,
    annualPerMonth: Number((PRICING_CONFIG.plans.annual.amount / 12).toFixed(2)),
    monthlyTotal: PRICING_CONFIG.plans.monthly.amount,
    starterPass90Days: PRICING_CONFIG.plans.starterPass.amount
  }
};
