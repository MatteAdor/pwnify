import React, { useState } from 'react';

import { PaywallContext } from '../../types';

import { MONETIZATION_CONFIG } from '../../config/monetization';

import { PRICING_CONFIG } from '../../config/pricing.config';

import { sound } from '../../utils/soundEngine';

import { 

  X, Check, Sparkles, ArrowRight, Zap, AlertTriangle, 

  KeyRound, ShieldCheck 

} from 'lucide-react';

import confetti from 'canvas-confetti';

import { verifyLicenseKey } from '../../utils/licenseEngine';

import { isSafeRedirectUrl } from '../../utils/security';

import { supabase, isSupabaseConfigured } from '../../config/supabase';

import {

  isPlayDistribution,

  isFlavorResolving,

  isFlavorTimedOut,

  retryDistributionResolution,

  subscribeDistributionFlavor

} from '../../utils/platform';



interface PaywallModalProps {

  isOpen: boolean;

  onClose: () => void;

  context: PaywallContext;

  onUpgradeSuccess: () => void;

  onRestoreLicense?: (licenseKey: string) => void;

  winStreak?: number;

}



export const PaywallModal: React.FC<PaywallModalProps> = ({

  isOpen,

  onClose,

  context,

  onUpgradeSuccess,

  onRestoreLicense,

  winStreak = 3

}) => {

  const [billingCycle, setBillingCycle] = useState<'annual' | 'monthly' | 'starterPass'>('annual');

  const [isProcessing, setIsProcessing] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [flavorState, setFlavorState] = useState(() => ({

    isPlay: isPlayDistribution(),

    resolving: isFlavorResolving(),

    timedOut: isFlavorTimedOut(),

  }));



  React.useEffect(() => {

    return subscribeDistributionFlavor(() => {

      setFlavorState({

        isPlay: isPlayDistribution(),

        resolving: isFlavorResolving(),

        timedOut: isFlavorTimedOut(),

      });

    });

  }, []);



  const { isPlay, resolving, timedOut } = flavorState;



  // License Key Mode

  const [isRestoreView, setIsRestoreView] = useState(false);

  const [restoreInput, setRestoreInput] = useState('');

  const [restoreError, setRestoreError] = useState<string | null>(null);



  if (!isOpen) return null;



  // Restore License Handler with UX format check + server-authoritative Edge Function activation

  const handleVerifyAndRestore = async () => {

    if (isPlay) {

      setRestoreError('Riscatto licenza non disponibile in questa versione.');

      return;

    }

    sound.playTap();

    const cleanKey = restoreInput.trim().toUpperCase();

    if (!cleanKey) {

      setRestoreError('Please enter your license key.');

      return;

    }



    // 1. Immediate local UX check (prevents typo requests and validates key syntax)

    const isValidFormat = verifyLicenseKey(cleanKey);

    if (!isValidFormat) {

      sound.playPayloadBlocked();

      setRestoreError('Invalid license key format or checksum. Correct example: 0xPRO-8F9A-K2L1-77BC');

      return;

    }



    // 2. Server-Authoritative activation via Lemon Squeezy Edge Function

    if (isSupabaseConfigured) {

      setIsProcessing(true);

      setRestoreError(null);

      try {

        const { data, error } = await supabase.functions.invoke('validate_license', {

          body: { license_key: cleanKey }

        });



        if (error || !data?.valid || !data?.is_pro) {

          sound.playPayloadBlocked();

          setRestoreError(data?.error || error?.message || 'Server rejected license activation. Key may be invalid or at max activations.');

          setIsProcessing(false);

          return;

        }



        // Server confirmed active and updated profiles.is_pro

        sound.playVictoryFanfare();

        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });

        setRestoreError(null);

        if (onRestoreLicense) {

          onRestoreLicense(cleanKey);

        } else {

          onUpgradeSuccess();

        }

        setIsRestoreView(false);

        setIsProcessing(false);

        onClose();

        return;

      } catch (err: unknown) {

        sound.playPayloadBlocked();

        const msg = err instanceof Error ? err.message : 'Network error during license activation';

        setRestoreError(msg);

        setIsProcessing(false);

        return;

      }

    }



    // 3. Fallback for offline demo / local self-hosted mock

    sound.playVictoryFanfare();

    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });

    setRestoreError(null);

    if (onRestoreLicense) {

      onRestoreLicense(cleanKey);

    } else {

      onUpgradeSuccess();

    }

    setIsRestoreView(false);

    onClose();

  };



  // Honest Checkout Handler: Redirects to real payment gateway or prompts for license key

  const handleExecuteCheckout = (planType: 'annual' | 'monthly' | 'starterPass') => {

    sound.playTap();

    setErrorMessage(null);



    if (isPlay) {

      setErrorMessage('Acquisti non disponibili in questa versione.');

      return;

    }



    const checkoutUrl = planType === 'annual' 

      ? MONETIZATION_CONFIG.stripeAnnualUrl 

      : planType === 'monthly'

      ? MONETIZATION_CONFIG.stripeMonthlyUrl

      : MONETIZATION_CONFIG.starterPassUrl;



    const isConfiguredUrl = checkoutUrl && 

      checkoutUrl.startsWith('https://') && 

      !checkoutUrl.includes('test_');



    if (MONETIZATION_CONFIG.enableRealRedirect || isConfiguredUrl) {

      if (isSafeRedirectUrl(checkoutUrl)) {

        setIsProcessing(true);

        window.location.href = checkoutUrl;

        return;

      }

      setErrorMessage('Unauthorized payment redirect URL.');

      return;

    }



    // In local dev or self-hosted demo without checkout keys:

    // Do NOT simulate fake purchases. Open the authentic license key input instead.

    setIsRestoreView(true);

    setRestoreError(

      'Lemon Squeezy gateway not configured in this local environment. Enter a cryptographic license key to activate Pwnify PRO.'

    );

  };



  // Context-specific messaging: factual, technical, and without AI slop

  const getContextContent = () => {

    switch (context) {

      case 'win_streak_trap':

        return {

          badge: `ARENA TICKETS EXHAUSTED · CURRENT STREAK: ${winStreak}`,

          badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40',

          title: 'Keep Training in the 1v1 Arena',

          subtitle: 'Free daily Arena tickets have run out. Upgrade to Pwnify PRO for unlimited live battles.'

        };

      case 'blurred_breakdown':

        return {

          badge: 'TECHNICAL ANALYSIS & MITIGATION',

          badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',

          title: 'Complete Exploit Anatomy',

          subtitle: 'Inspect PoCs, memory forensics, and remediation code for every breach scenario.'

        };

      case 'weakness_drill':

        return {

          badge: 'TARGETED WEAKNESS DRILL',

          badgeColor: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40',

          title: 'Personalized Remediation Sessions',

          subtitle: 'Drill targeted weakness areas and mistake domains to eliminate exam blind spots.'

        };

      case 'xp_boost_shield':

        return {

          badge: '2X XP BOOST',

          badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40',

          title: 'Accelerated League Progression',

          subtitle: 'Double XP points earned from every lab and ranked challenge.'

        };

      case 'exam_simulator_lock':

        return {

          badge: 'OFFICIAL EXAM SIMULATORS',

          badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',

          title: 'CompTIA Security+, CCNA & CEH Simulators',

          subtitle: 'Practice on timed official question banks and hands-on PBQ scenario labs.'

        };

      case 'bounty_crate_lock':

        return {

          badge: 'PRO BOUNTY CRATES AVAILABLE',

          badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40',

          title: 'Decrypt Encrypted PRO Bounty Crates',

          subtitle: 'Complete daily contracts to decrypt massive bonus XP and arena ticket crates.'

        };

      case 'diagnostic_funnel':

      default:

        return {

          badge: 'FULL PWNIFY PRO ACCESS',

          badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',

          title: 'Level Up Your Preparation with Pwnify PRO',

          subtitle: 'Unlock all hands-on PBQ labs, official exam simulators, and unlimited Arena PvP access.'

        };

    }

  };



  const contextData = getContextContent();



  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 overflow-y-auto animate-fade-in font-sans">

      <div className="relative w-full max-w-lg my-auto rounded-2xl p-5 sm:p-6 shadow-xl bg-[#0D121D] border border-zinc-800 text-zinc-100">

        

        {/* Direct Dismiss Button */}

        <button

          onClick={() => {

            sound.playTap();

            onClose();

          }}

          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white transition-colors z-20 cursor-pointer"

          aria-label="Close Window"

        >

          <X className="w-5 h-5" />

        </button>



        {/* ------------------------------------------------------------- */}

        {/* LICENSE KEY VERIFICATION VIEW                                 */}

        {/* ------------------------------------------------------------- */}

        {isRestoreView ? (

          <div className="space-y-4 animate-fade-in text-zinc-100">

            <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">

              <KeyRound className="w-4 h-4 text-zinc-400" />

              <span>Pro License Key Activation</span>

            </div>



            <div>

              <h2 className="text-xl font-bold text-white">

                Activate or Restore PRO License

              </h2>

              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">

                Enter your cryptographic license key to unlock all PRO features locally or on any device.

              </p>

            </div>



            <div className="space-y-2">

              <label className="text-xs font-mono font-bold text-zinc-400 block">

                LICENSE CODE (FORMAT: 0xPRO-XXXX-XXXX-XXXX)

              </label>

              <input

                type="text"

                value={restoreInput}

                onChange={(e) => {

                  setRestoreInput(e.target.value.toUpperCase());

                  setRestoreError(null);

                }}

                placeholder="0xPRO-8F9A-K2L1-77BC"

                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 font-mono font-bold text-sm text-emerald-400 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors uppercase tracking-wider"

              />

              {restoreError && (

                <p className="text-xs text-amber-300 font-mono flex items-center gap-1.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">

                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />

                  <span>{restoreError}</span>

                </p>

              )}

            </div>



            <button

              onClick={handleVerifyAndRestore}

              className="w-full py-3 px-4 rounded-xl font-mono font-bold text-xs sm:text-sm text-zinc-950 bg-emerald-500 hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2 cursor-pointer"

            >

              <Check className="w-4 h-4" />

              <span>VERIFY & ACTIVATE PRO ACCESS</span>

            </button>



            <button

              onClick={() => {

                sound.playTap();

                setIsRestoreView(false);

                setRestoreError(null);

              }}

              className="w-full py-2 text-xs text-zinc-400 hover:text-white font-mono transition-colors cursor-pointer"

            >

              ← Return to Subscription Plans

            </button>

          </div>

        ) : (

          /* ------------------------------------------------------------- */

          /* STANDARD CLEAN PAYWALL VIEW                                   */

          /* ------------------------------------------------------------- */

          <div className="space-y-4 animate-fade-in text-zinc-100">

            {/* Header Badge */}

            <div>

              <div className="flex items-center gap-2 mb-1.5">

                <ShieldCheck className="w-4 h-4 text-zinc-400 shrink-0" />

                <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">

                  {contextData.badge}

                </span>

              </div>

              <h2 className="text-lg sm:text-xl font-bold text-white leading-tight">

                {contextData.title}

              </h2>

              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">

                {contextData.subtitle}

              </p>

            </div>



            {/* Trial Timeline */}

            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2.5">

              <div className="text-xs font-mono font-bold text-zinc-300 flex items-center gap-2">

                <span>7-DAY FREE TRIAL TIMELINE:</span>

              </div>



              <div className="relative pl-5 space-y-2.5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-800 text-xs">

                <div className="relative">

                  <div className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-emerald-400" />

                  <span className="font-mono font-bold text-white block">Day 0</span>

                  <span className="text-zinc-400 text-xs">

                    Full instant access to all simulators and PBQ labs. No upfront charges.

                  </span>

                </div>



                <div className="relative">

                  <div className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-zinc-400" />

                  <span className="font-mono font-bold text-white block">Day 5</span>

                  <span className="text-zinc-400 text-xs">

                    Trial expiration reminder sent.

                  </span>

                </div>



                <div className="relative">

                  <div className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-zinc-600" />

                  <span className="font-mono font-bold text-white block">Day 7</span>

                  <span className="text-zinc-400 text-xs">

                    Chosen plan begins. Cancel anytime with 1 click.

                  </span>

                </div>

              </div>

            </div>



            {/* Plan Switcher */}

            <div className="grid grid-cols-2 gap-3">

              {/* Annual Plan */}

              <div

                onClick={() => setBillingCycle('annual')}

                className={`relative p-3.5 rounded-xl border cursor-pointer transition-colors ${

                  billingCycle === 'annual'

                    ? 'bg-zinc-850 border-emerald-500'

                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'

                }`}

              >

                <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded bg-emerald-500 text-zinc-950 font-mono font-bold text-[9px] uppercase tracking-wider">

                  SAVE 42%

                </div>

                <div className="flex items-center justify-between mb-1">

                  <span className="font-mono font-bold text-xs text-zinc-200">ANNUAL</span>

                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${

                    billingCycle === 'annual' ? 'border-emerald-500 bg-emerald-500 text-zinc-950' : 'border-zinc-600'

                  }`}>

                    {billingCycle === 'annual' && <Check className="w-3 h-3 stroke-[3]" />}

                  </div>

                </div>

                <div className="flex items-baseline gap-1">

                  <span className="font-mono font-bold text-xl sm:text-2xl text-white">€{(PRICING_CONFIG.plans.annual.amount / 12).toFixed(2)}</span>

                  <span className="text-xs text-zinc-400">/mo</span>

                </div>

                <p className="text-[11px] text-zinc-400 font-mono mt-0.5">

                  Billed annually at €{PRICING_CONFIG.plans.annual.amount.toFixed(2)}/yr

                </p>

              </div>



              {/* Monthly Plan */}

              <div

                onClick={() => setBillingCycle('monthly')}

                className={`p-3.5 rounded-xl border cursor-pointer transition-colors ${

                  billingCycle === 'monthly'

                    ? 'bg-zinc-850 border-emerald-500'

                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'

                }`}

              >

                <div className="flex items-center justify-between mb-1">

                  <span className="font-mono font-bold text-xs text-zinc-200">MONTHLY</span>

                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${

                    billingCycle === 'monthly' ? 'border-emerald-500 bg-emerald-500 text-zinc-950' : 'border-zinc-600'

                  }`}>

                    {billingCycle === 'monthly' && <Check className="w-3 h-3 stroke-[3]" />}

                  </div>

                </div>

                <div className="flex items-baseline gap-1">

                  <span className="font-mono font-bold text-xl sm:text-2xl text-white">€{PRICING_CONFIG.plans.monthly.amount.toFixed(2)}</span>

                  <span className="text-xs text-zinc-400">/mo</span>

                </div>

                <p className="text-[11px] text-zinc-400 font-mono mt-0.5">

                  Billed monthly at €{PRICING_CONFIG.plans.monthly.amount.toFixed(2)}/mo

                </p>

              </div>

            </div>



            {/* Starter Pass Option */}

            <div

              onClick={() => setBillingCycle('starterPass')}

              className={`p-3 rounded-xl border cursor-pointer transition-colors flex items-center justify-between ${

                billingCycle === 'starterPass'

                  ? 'bg-zinc-850 border-emerald-500'

                  : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'

              }`}

            >

              <div>

                <div className="flex items-center gap-2">

                  <span className="font-mono font-bold text-xs text-white">STARTER PASS (90 GIORNI)</span>

                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">ONE-TIME</span>

                </div>

                <p className="text-[11px] text-zinc-400 mt-0.5">Accesso completo 90 giorni senza alcun rinnovo automatico</p>

              </div>

              <div className="flex items-center gap-2.5">

                <span className="font-mono font-bold text-sm text-emerald-400">€{PRICING_CONFIG.plans.starterPass.amount.toFixed(2)}</span>

                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${

                  billingCycle === 'starterPass' ? 'border-emerald-500 bg-emerald-500 text-zinc-950' : 'border-zinc-600'

                }`}>

                  {billingCycle === 'starterPass' && <Check className="w-3 h-3 stroke-[3]" />}

                </div>

              </div>

            </div>



            {/* Feature Highlights Grid */}

            <div className="grid grid-cols-2 gap-2 text-xs text-zinc-300">

              <div className="flex items-center gap-1.5">

                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />

                <span>Unlimited 1v1 Arena tickets</span>

              </div>

              <div className="flex items-center gap-1.5">

                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />

                <span>All PBQ labs & official simulators</span>

              </div>

              <div className="flex items-center gap-1.5">

                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />

                <span>PoC root cause analysis & code</span>

              </div>

              <div className="flex items-center gap-1.5">

                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />

                <span>Decrypted PRO Bounty Crates</span>

              </div>

            </div>



            {errorMessage && (

              <p className="text-xs text-amber-300 font-mono flex items-center gap-1.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">

                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />

                <span>{errorMessage}</span>

              </p>

            )}



            {/* Primary Action Button */}

            {isPlay ? (

              <div className="w-full min-h-[50px] py-3.5 px-4 rounded-xl font-mono font-bold text-xs sm:text-sm text-center text-zinc-400 bg-zinc-900 border border-zinc-800 flex items-center justify-center">

                Acquisti non disponibili in questa versione

              </div>

            ) : (

              <button

                onClick={() => handleExecuteCheckout(billingCycle)}

                disabled={isProcessing}

                className="w-full min-h-[52px] py-3.5 px-5 rounded-xl font-mono font-black text-sm text-zinc-950 bg-emerald-500 hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 shadow-md active:scale-98"

              >

                {isProcessing ? (

                  <span className="flex items-center gap-2 text-xs font-bold">

                    <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />

                    <span>Connecting to Lemon Squeezy...</span>

                  </span>

                ) : (

                  <>

                    <Zap className="w-4 h-4 fill-current" />

                    <span>START 7-DAY FREE TRIAL</span>

                    <ArrowRight className="w-4 h-4" />

                  </>

                )}

              </button>

            )}



            {/* Footer Options */}

            <div className="text-center space-y-2 pt-1">

              <button

                onClick={() => {

                  sound.playTap();

                  onClose();

                }}

                className="text-xs text-zinc-400 hover:text-white underline underline-offset-4 font-mono transition-colors cursor-pointer"

              >

                Continue with Free version

              </button>



              {!flavorState.isPlay && !flavorState.resolving && !flavorState.timedOut && (

                <div className="pt-2 border-t border-zinc-800">

                  <button

                    onClick={() => {

                      sound.playTap();

                      setIsRestoreView(true);

                    }}

                    className="text-xs text-emerald-400 hover:text-emerald-300 font-mono flex items-center justify-center gap-1.5 mx-auto transition-colors cursor-pointer"

                  >

                    <KeyRound className="w-3.5 h-3.5 text-emerald-400" />

                    <span>Already have a license? Enter activation key</span>

                  </button>

                </div>

              )}

            </div>

          </div>

        )}

      </div>

    </div>

  );

};
