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
  stripeAnnualUrl: (import.meta.env?.VITE_STRIPE_ANNUAL_URL as string) || '',
  stripeMonthlyUrl: (import.meta.env?.VITE_STRIPE_MONTHLY_URL as string) || '',
  starterPassUrl: (import.meta.env?.VITE_STRIPE_STARTER_URL as string) || '',

  enableRealRedirect: import.meta.env?.VITE_ENABLE_REAL_STRIPE_REDIRECT === 'true',

  currency: PRICING_CONFIG.currencySymbol,

  pricing: {
    annualTotal: PRICING_CONFIG.plans.annual.amount,
    annualPerMonth: Number((PRICING_CONFIG.plans.annual.amount / 12).toFixed(2)),
    monthlyTotal: PRICING_CONFIG.plans.monthly.amount,
    starterPass90Days: PRICING_CONFIG.plans.starterPass.amount
  }
};
