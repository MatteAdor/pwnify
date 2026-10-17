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
      setRestoreError('Inserisci il codice di licenza.');
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
      setRestoreError('Formato o checksum della licenza non valido. Esempio corretto: 0xPRO-8F9A-K2L1-77BC');
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
      setErrorMessage('L\'indirizzo di reindirizzamento al pagamento non è autorizzato.');
      return;
    }

    // In local dev or self-hosted demo without Stripe keys:
    // Do NOT simulate fake purchases. Open the authentic license key input instead.
    setIsRestoreView(true);
    setRestoreError(
      'Gateway Stripe non configurato in questo ambiente locale. Inserisci una chiave di licenza crittografica per attivare ZeroDay PRO.'
    );
  };

  // Context-specific messaging: factual, technical, and without AI slop
  const getContextContent = () => {
    switch (context) {
      case 'win_streak_trap':
        return {
          badge: `TICKET ARENA ESAURITI · STREAK ATTUALE: ${winStreak}`,
          badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
          title: 'Continua ad Addestrarti nell\'Arena 1v1',
          subtitle: 'I ticket gratuiti giornalieri per i match Arena sono terminati. Passa a ZeroDay PRO per sessioni illimitate.'
        };
      case 'blurred_breakdown':
        return {
          badge: 'ANALISI TECNICA & MITIGAZIONE',
          badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
          title: 'Anatomia Completa dell\'Exploit',
          subtitle: 'Consulta i PoC, l\'analisi della memoria e il codice di mitigazione consigliato per ogni scenario.'
        };
      case 'weakness_drill':
        return {
          badge: 'DRILL MIRATO SULLE LACUNE',
          badgeColor: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40',
          title: 'Sessioni di Recupero Personalizzate',
          subtitle: 'Esercitati in modo mirato sui domini e sulle tipologie di vulnerabilità in cui hai commesso errori.'
        };
      case 'xp_boost_shield':
        return {
          badge: '2X XP & PROTEZIONE LEGA',
          badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
          title: 'Avanzamento Rapido nelle Leghe',
          subtitle: 'Raddoppia i punti XP ottenuti da ogni laboratorio e attiva lo scudo contro la retrocessione settimanale.'
        };
      case 'exam_simulator_lock':
        return {
          badge: 'SIMULATORI D\'ESAME UFFICIALI',
          badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
          title: 'Simulatori CompTIA Security+, CCNA & CEH',
          subtitle: 'Esercitati su pool di domande d\'esame cronometrate e laboratori basati su scenari operativi reali.'
        };
      case 'bounty_crate_lock':
        return {
          badge: 'TAGLIE PRO DISPONIBILI',
          badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
          title: 'Riscatta le Casse Bounty PRO',
          subtitle: 'Completa le missioni giornaliere per riscattare bonus XP e ricompense avanzate.'
        };
      case 'diagnostic_funnel':
      default:
        return {
          badge: 'ACCESSO COMPLETO ZERODAY PRO',
          badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
          title: 'Potenzia la Tua Preparazione con ZeroDay PRO',
          subtitle: 'Sblocca tutti i laboratori pratici PBQ, i simulatori d\'esame e l\'accesso illimitato alle sessioni Arena.'
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
          aria-label="Chiudi Finestra"
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
              <span>ATTIVAZIONE CHIAVE LICENZA PRO</span>
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                Attiva o Ripristina Licenza PRO
              </h2>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Inserisci la chiave di licenza crittografica per sbloccare tutte le funzionalità PRO in locale o su qualsiasi dispositivo.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-mono font-bold text-slate-300 block">
                CODICE LICENZA (FORMATO: 0xPRO-XXXX-XXXX-XXXX)
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
              <span>VERIFICA & ATTIVA ACCESSO PRO</span>
            </button>

            <button
              onClick={() => {
                sound.playTap();
                setIsRestoreView(false);
                setRestoreError(null);
              }}
              className="w-full py-2 text-xs text-slate-400 hover:text-white font-mono transition-colors"
            >
              ← Torna ai Piani di Abbonamento
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
                <span>DETTAGLI PROVA GRATUITA DI 7 GIORNI:</span>
              </div>

              <div className="relative pl-5 space-y-2.5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/15 text-xs">
                <div className="relative">
                  <div className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="font-mono font-bold text-white block">Giorno 0</span>
                  <span className="text-slate-400 text-[11px]">
                    Accesso completo a tutti i simulatori e lab PBQ. Nessun addebito anticipato.
                  </span>
                </div>

                <div className="relative">
                  <div className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-indigo-400" />
                  <span className="font-mono font-bold text-white block">Giorno 5</span>
                  <span className="text-slate-400 text-[11px]">
                    Promemoria prima della scadenza della prova.
                  </span>
                </div>

                <div className="relative">
                  <div className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-slate-500" />
                  <span className="font-mono font-bold text-white block">Giorno 7</span>
                  <span className="text-slate-400 text-[11px]">
                    Inizio dell'abbonamento scelto. Disdici in qualsiasi momento.
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
                  PIÙ SCELTO
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold text-xs text-slate-200">ANNUALE</span>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    billingCycle === 'annual' ? 'border-emerald-400 bg-emerald-400 text-slate-950' : 'border-slate-500'
                  }`}>
                    {billingCycle === 'annual' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-mono font-extrabold text-xl sm:text-2xl text-white">€5.75</span>
                  <span className="text-[10px] text-slate-400">/mese</span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Fatturato a €69/anno
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
                  <span className="font-mono font-bold text-xs text-slate-200">MENSILE</span>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    billingCycle === 'monthly' ? 'border-indigo-400 bg-indigo-500 text-slate-950' : 'border-slate-500'
                  }`}>
                    {billingCycle === 'monthly' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-mono font-extrabold text-xl sm:text-2xl text-white">€14.99</span>
                  <span className="text-[10px] text-slate-400">/mese</span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Fatturato ogni 30 giorni
                </p>
              </div>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Ticket Arena 1v1 illimitati</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Tutti i lab PBQ & simulatori</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Analisi PoC & mitigazioni</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Bounty Crates PRO decrittate</span>
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
                  <span>Connessione a Stripe in corso...</span>
                </span>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-slate-950" />
                  <span>INIZIA LA PROVA GRATUITA DI 7 GIORNI</span>
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
                Continua con la versione Free
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
                  <span>Possiedi già una licenza? Inserisci il codice di attivazione</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
