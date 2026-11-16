// Single source of truth for ZeroDay pricing, plans, and Stripe lookup keys
// All UI components and backend Stripe synchronization must validate against this configuration.

export interface PricingPlan {
  lookupKey: string;
  name: string;
  type: 'recurring' | 'one_time';
  interval?: 'month' | 'year';
  amount: number; // in EUR (decimal)
  amountCents: number; // in cents for Stripe API
  currency: string;
  durationDays?: number; // for one_time passes
  trialDays: number;
  features: string[];
}

export interface PricingConfig {
  currency: string;
  currencySymbol: string;
  collectPaymentMethodAtTrialStart: boolean;
  plans: {
    monthly: PricingPlan;
    annual: PricingPlan;
    starterPass: PricingPlan;
  };
}

export const PRICING_CONFIG: PricingConfig = {
  currency: 'eur',
  currencySymbol: '€',
  collectPaymentMethodAtTrialStart: true, // Configurable: requires payment method up-front for 7-day trial

  plans: {
    monthly: {
      lookupKey: 'zeroday_pro_monthly',
      name: 'Pwnify PRO Monthly',
      type: 'recurring',
      interval: 'month',
      amount: 9.99,
      amountCents: 999,
      currency: 'eur',
      trialDays: 7,
      features: [
        'Unlimited 1v1 Arena tickets',
        'All official PBQ labs & simulators',
        'Exploit anatomy & root cause analysis',
        'Targeted weakness remediation drills',
        '2X XP boost permanente'
      ]
    },
    annual: {
      lookupKey: 'zeroday_pro_annual',
      name: 'Pwnify PRO Annual',
      type: 'recurring',
      interval: 'year',
      amount: 69.00,
      amountCents: 6900,
      currency: 'eur',
      trialDays: 7,
      features: [
        'Everything in Monthly (Save 42% vs €9.99/mo)',
        'Unlimited 1v1 Arena tickets',
        'All official PBQ labs & simulators',
        'Exploit anatomy & root cause analysis',
        'Priority access to new CVE drills'
      ]
    },
    starterPass: {
      lookupKey: 'zeroday_starter_90d',
      name: 'Pwnify Starter Pass (90 Days)',
      type: 'one_time',
      amount: 19.99,
      amountCents: 1999,
      currency: 'eur',
      durationDays: 90,
      trialDays: 0,
      features: [
        '90-day full PRO access (one-time payment)',
        'No recurring subscription or auto-renewal',
        'All PBQ exam simulators and labs',
        'Unlimited 1v1 Arena tickets'
      ]
    }
  }
};
