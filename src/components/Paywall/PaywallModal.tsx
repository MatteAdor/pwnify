import React, { useState } from 'react';
import { PaywallContext } from '../../types';
import { MONETIZATION_CONFIG } from '../../config/monetization';
import { sound } from '../../utils/soundEngine';
import { 
  X, Check, Sparkles, ArrowRight, Zap, AlertTriangle, 
  KeyRound, ShieldCheck 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { verifyLicenseKey } from '../../utils/licenseEngine';
import { isSafeRedirectUrl } from '../../utils/security';

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
  const [billingCycle, setBillingCycle] = useState<'annual' | 'monthly'>('annual');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // License Key Mode
  const [isRestoreView, setIsRestoreView] = useState(false);
  const [restoreInput, setRestoreInput] = useState('');
  const [restoreError, setRestoreError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Restore License Handler with genuine cryptographic verification
  const handleVerifyAndRestore = () => {
    sound.playTap();
    const cleanKey = restoreInput.trim().toUpperCase();
    if (!cleanKey) {
      setRestoreError('Please enter your license key.');
      return;
    }

    const isValid = verifyLicenseKey(cleanKey);
    if (isValid) {
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
    } else {
      sound.playPayloadBlocked();
      setRestoreError('Invalid license key format or checksum. Correct example: 0xPRO-8F9A-K2L1-77BC');
    }
  };

  // Honest Checkout Handler: Redirects to real payment gateway or prompts for license key
  const handleExecuteCheckout = (planType: 'annual' | 'monthly') => {
    sound.playTap();
    setErrorMessage(null);

    const checkoutUrl = planType === 'annual' 
      ? MONETIZATION_CONFIG.stripeAnnualUrl 
      : MONETIZATION_CONFIG.stripeMonthlyUrl;

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

    // In local dev or self-hosted demo without Stripe keys:
    // Do NOT simulate fake purchases. Open the authentic license key input instead.
    setIsRestoreView(true);
    setRestoreError(
      'Stripe gateway not configured in this local environment. Enter a cryptographic license key to activate ZeroDay PRO.'
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
          subtitle: 'Free daily Arena tickets have run out. Upgrade to ZeroDay PRO for unlimited live battles.'
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
          badge: '2X XP & LEAGUE DEMOTION SHIELD',
          badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
          title: 'Accelerated League Progression',
          subtitle: 'Double XP points earned from every lab and protect yourself against weekly demotion.'
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
          badge: 'FULL ZERODAY PRO ACCESS',
          badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
          title: 'Level Up Your Preparation with ZeroDay PRO',
          subtitle: 'Unlock all hands-on PBQ labs, official exam simulators, and unlimited Arena PvP access.'
        };
    }
  };

  const contextData = getContextContent();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-lg my-auto rounded-3xl p-5 sm:p-6 shadow-2xl bg-[#131B2E] border border-white/10 shadow-cyber-glass">
        
        {/* Direct Dismiss Button */}
        <button
          onClick={() => {
            sound.playTap();
            onClose();
          }}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/5 transition-colors z-20"
          aria-label="Close Window"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ------------------------------------------------------------- */}
        {/* LICENSE KEY VERIFICATION VIEW                                 */}
        {/* ------------------------------------------------------------- */}
        {isRestoreView ? (
          <div className="space-y-4 animate-fade-in text-slate-100">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold w-fit">
              <KeyRound className="w-4 h-4 text-emerald-400" />
              <span>PRO LICENSE KEY ACTIVATION</span>
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                Activate or Restore PRO License
              </h2>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Enter your cryptographic license key to unlock all PRO features locally or on any device.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-mono font-bold text-slate-300 block">
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
                className="w-full bg-[#090D16] border border-white/20 rounded-xl px-4 py-3 font-mono font-bold text-sm text-emerald-300 placeholder:text-slate-600 focus:outline-none focus:border-emerald-400 transition-colors uppercase tracking-wider"
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
              className="w-full py-3.5 px-4 rounded-xl font-mono font-extrabold text-sm text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-400 to-indigo-400 hover:from-emerald-300 hover:to-indigo-300 transition-all shadow-neon-emerald flex items-center justify-center gap-2"
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
              className="w-full py-2 text-xs text-slate-400 hover:text-white font-mono transition-colors"
            >
              ← Return to Subscription Plans
            </button>
          </div>
        ) : (
          /* ------------------------------------------------------------- */
          /* STANDARD CLEAN PAYWALL VIEW                                   */
          /* ------------------------------------------------------------- */
          <div className="space-y-4 animate-fade-in text-slate-100">
            {/* Header Badge */}
            <div>
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border mb-2.5 ${contextData.badgeColor}`}>
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>{contextData.badge}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-tight">
                {contextData.title}
              </h2>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {contextData.subtitle}
              </p>
            </div>

            {/* Trial Timeline */}
            <div className="p-3.5 rounded-2xl bg-[#090D16] border border-white/10 space-y-2.5">
              <div className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>7-DAY FREE TRIAL TIMELINE:</span>
              </div>

              <div className="relative pl-5 space-y-2.5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/15 text-xs">
                <div className="relative">
                  <div className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="font-mono font-bold text-white block">Day 0</span>
                  <span className="text-slate-400 text-[11px]">
                    Full instant access to all simulators and PBQ labs. No upfront charges.
                  </span>
                </div>

                <div className="relative">
                  <div className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-indigo-400" />
                  <span className="font-mono font-bold text-white block">Day 5</span>
                  <span className="text-slate-400 text-[11px]">
                    Trial expiration reminder sent.
                  </span>
                </div>

                <div className="relative">
                  <div className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-slate-500" />
                  <span className="font-mono font-bold text-white block">Day 7</span>
                  <span className="text-slate-400 text-[11px]">
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
                className={`relative p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  billingCycle === 'annual'
                    ? 'bg-gradient-to-b from-emerald-500/20 to-surface border-emerald-400 ring-2 ring-emerald-400/30 shadow-neon-emerald'
                    : 'bg-[#090D16] border-white/10 hover:border-white/20'
                }`}
              >
                <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950 font-mono font-bold text-[9px] uppercase tracking-wider">
                  MOST POPULAR
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold text-xs text-slate-200">ANNUAL</span>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    billingCycle === 'annual' ? 'border-emerald-400 bg-emerald-400 text-slate-950' : 'border-slate-500'
                  }`}>
                    {billingCycle === 'annual' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-mono font-extrabold text-xl sm:text-2xl text-white">€5.75</span>
                  <span className="text-[10px] text-slate-400">/mo</span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Billed annually at €69/yr
                </p>
              </div>

              {/* Monthly Plan */}
              <div
                onClick={() => setBillingCycle('monthly')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-gradient-to-b from-indigo-500/20 to-surface border-indigo-400 ring-2 ring-indigo-400/30 shadow-neon-indigo'
                    : 'bg-[#090D16] border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold text-xs text-slate-200">MONTHLY</span>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    billingCycle === 'monthly' ? 'border-indigo-400 bg-indigo-500 text-slate-950' : 'border-slate-500'
                  }`}>
                    {billingCycle === 'monthly' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-mono font-extrabold text-xl sm:text-2xl text-white">€14.99</span>
                  <span className="text-[10px] text-slate-400">/mo</span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Billed monthly at €14.99/mo
                </p>
              </div>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
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
            <button
              onClick={() => handleExecuteCheckout(billingCycle)}
              disabled={isProcessing}
              className="w-full py-3.5 px-4 rounded-xl font-mono font-extrabold text-sm sm:text-base text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 hover:from-emerald-300 hover:to-teal-400 transition-all shadow-neon-emerald flex items-center justify-center gap-2 transform active:scale-98 disabled:opacity-75"
            >
              {isProcessing ? (
                <span className="flex items-center gap-2 text-xs font-bold">
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Connecting to Stripe...</span>
                </span>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-slate-950" />
                  <span>START 7-DAY FREE TRIAL</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Footer Options */}
            <div className="text-center space-y-2 pt-1">
              <button
                onClick={() => {
                  sound.playTap();
                  onClose();
                }}
                className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-4 font-mono transition-colors"
              >
                Continue with Free version
              </button>

              <div className="pt-2 border-t border-white/5">
                <button
                  onClick={() => {
                    sound.playTap();
                    setIsRestoreView(true);
                  }}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-mono flex items-center justify-center gap-1.5 mx-auto transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Already have a license? Enter activation key</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
