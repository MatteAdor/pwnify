import React, { useState } from 'react';
import { PaywallContext } from '../../types';
import { sound } from '../../utils/soundEngine';
import { X, Check, Sparkles, ArrowRight, Zap, AlertTriangle, ShieldCheck, ArrowLeft, ExternalLink } from 'lucide-react';
import { useLanguage } from '../../utils/language';
import { startProCheckout, openCustomerPortal } from '../../utils/billing';
import {
  isPlayDistribution,
  isFlavorResolving,
  isFlavorTimedOut,
  subscribeDistributionFlavor
} from '../../utils/platform';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: PaywallContext;
  /** Called when the user returns from the external checkout/portal (Android): re-read is_pro. */
  onBillingReturn?: () => void;
  winStreak?: number;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({
  isOpen,
  onClose,
  context,
  onBillingReturn,
  winStreak = 3
}) => {
  const { lang } = useLanguage();
  const isEn = lang === 'en';
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

  // NOTE: the Google Play flavor must not offer an external checkout (Play payments
  // policy). Google Play Billing will be integrated separately; until then the Play
  // build only shows that purchases are unavailable. While the flavor is still being
  // resolved (or resolution timed out) we also fail closed and hide the checkout.
  const checkoutHidden = flavorState.isPlay || flavorState.resolving || flavorState.timedOut;

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    sound.playTap();
    setErrorMessage(null);
    if (checkoutHidden) {
      setErrorMessage(isEn ? 'Purchases are not available in this version.' : 'Acquisti non disponibili in questa versione.');
      return;
    }
    setIsProcessing(true);
    const result = await startProCheckout(() => onBillingReturn?.());
    if (!result.ok) {
      sound.playPayloadBlocked();
      setErrorMessage(result.error);
    }
    setIsProcessing(false);
  };

  const handleManageSubscription = () => {
    sound.playTap();
    void openCustomerPortal(() => onBillingReturn?.());
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
    <div className="fixed inset-0 z-50 bg-[#090D16] flex flex-col w-full h-full overflow-y-auto animate-fade-in font-sans text-zinc-100 select-none">
      <header className="sticky top-0 z-20 bg-[#090D16]/95 backdrop-blur-md border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => { sound.playTap(); onClose(); }}
          className="flex items-center gap-1.5 p-1.5 -ml-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors cursor-pointer"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-xs font-mono font-bold">{isEn ? 'Back' : 'Indietro'}</span>
        </button>
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-400 fill-current" />
          <span className="font-mono font-black text-xs sm:text-sm text-white">PWNIFY PRO</span>
        </div>
        <button
          onClick={() => { sound.playTap(); onClose(); }}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors cursor-pointer"
          aria-label="Close Window"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-5 pb-28 text-zinc-100 animate-fade-in">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <ShieldCheck className="w-4 h-4 text-zinc-400 shrink-0" />
            <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">{contextData.badge}</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white leading-tight">{contextData.title}</h2>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{contextData.subtitle}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-zinc-300">
          {[
            isEn ? 'Unlimited 1v1 Arena tickets' : 'Ticket Arena 1v1 illimitati',
            isEn ? 'All PBQ labs & exam simulators' : 'Tutti i lab PBQ e i simulatori',
            isEn ? 'PoC root cause analysis & code' : 'Analisi PoC e codice',
            isEn ? 'PRO Bounty Crates' : 'Bounty Crate PRO',
          ].map((label) => (
            <div key={label} className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{label}</span>
            </div>
          ))}
        </div>

        {errorMessage && (
          <p className="text-xs text-amber-300 font-mono flex items-center gap-1.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{errorMessage}</span>
          </p>
        )}

        {checkoutHidden ? (
          <div className="w-full min-h-[50px] py-3.5 px-4 rounded-xl font-mono font-bold text-xs sm:text-sm text-center text-zinc-400 bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            {flavorState.resolving
              ? (isEn ? 'Checking store availability…' : 'Verifica disponibilità acquisti…')
              : (isEn ? 'Purchases are not available in this version' : 'Acquisti non disponibili in questa versione')}
          </div>
        ) : (
          <>
            <button
              onClick={handleUpgrade}
              disabled={isProcessing}
              className="w-full min-h-[52px] py-3.5 px-5 rounded-xl font-mono font-black text-sm text-zinc-950 bg-emerald-500 hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
            >
              {isProcessing ? (
                <span className="flex items-center gap-2 text-xs font-bold">
                  <span className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                  <span>{isEn ? 'Opening secure checkout…' : 'Apertura checkout sicuro…'}</span>
                </span>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-current" />
                  <span>{isEn ? 'Upgrade to Pro' : 'Passa a Pro'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            <p className="text-[11px] text-zinc-500 text-center leading-relaxed">
              {isEn
                ? 'Price, taxes and any trial are shown on the secure Polar checkout (Merchant of Record). PRO activates automatically once payment is confirmed.'
                : 'Prezzo, imposte ed eventuale prova sono indicati nel checkout sicuro Polar (Merchant of Record). PRO si attiva automaticamente quando il pagamento è confermato.'}
            </p>
          </>
        )}

        <div className="text-center space-y-2 pt-1">
          <button
            onClick={() => { sound.playTap(); onClose(); }}
            className="text-xs text-zinc-400 hover:text-white underline underline-offset-4 font-mono transition-colors cursor-pointer"
          >
            {isEn ? 'Continue with the free version' : 'Continua con la versione gratuita'}
          </button>
          {!checkoutHidden && (
            <div className="pt-2 border-t border-zinc-800">
              <button
                onClick={handleManageSubscription}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-mono flex items-center justify-center gap-1.5 mx-auto transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{isEn ? 'Manage subscription' : 'Gestisci abbonamento'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
