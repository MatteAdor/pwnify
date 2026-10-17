import React, { useState, useEffect } from 'react';
import { PaywallContext } from '../../types';
import { MONETIZATION_CONFIG } from '../../config/monetization';
import { SocialProofBanner } from './SocialProofBanner';
import { sound } from '../../utils/soundEngine';
import { 
  X, Check, Sparkles, ArrowRight, Zap, AlertTriangle, 
  Clock, ShieldAlert, KeyRound 
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
  const [checkoutStep, setCheckoutStep] = useState<string>('');

  // License Restore Mode
  const [isRestoreView, setIsRestoreView] = useState(false);
  const [restoreInput, setRestoreInput] = useState('');
  const [restoreError, setRestoreError] = useState<string | null>(null);

  // Exit-Intent Downsell State
  const [isDownsellMode, setIsDownsellMode] = useState(false);
  const [hasSeenDownsell, setHasSeenDownsell] = useState(false);
  const [downsellPlan, setDownsellPlan] = useState<'downsell_annual' | 'starter_pass'>('downsell_annual');

  // Downsell Countdown Timer (09:59 minutes)
  const [timeLeft, setTimeLeft] = useState<number>(599); // 9m 59s

  useEffect(() => {
    let timer: any;
    if (isDownsellMode && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isDownsellMode, timeLeft]);

  // Reset downsell mode if modal is reopened fresh
  useEffect(() => {
    if (isOpen && !hasSeenDownsell) {
      setIsDownsellMode(false);
    }
  }, [isOpen, hasSeenDownsell]);

  if (!isOpen) return null;

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Intercept close button: if downsell has not been shown, show Downsell!
  const handleAttemptClose = () => {
    if (!hasSeenDownsell) {
      sound.playPayloadBlocked();
      setHasSeenDownsell(true);
      setIsDownsellMode(true);
    } else {
      sound.playTap();
      setIsDownsellMode(false);
      onClose();
    }
  };

  // User explicitly rejects the -50% downsell
  const handleRejectDownsell = () => {
    sound.playTap();
    setIsDownsellMode(false);
    onClose();
  };

  // Restore License Handler
  const handleVerifyAndRestore = () => {
    sound.playTap();
    const cleanKey = restoreInput.trim().toUpperCase();
    if (!cleanKey) {
      setRestoreError('Inserisci la tua chiave licenza');
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
      setRestoreError('Checksum algoritmico non valido. Formato corretto: 0xPRO-XXXX-XXXX-XXXX');
    }
  };

  // Secure Checkout Flow (Simulated + Stripe URL bridge)
  const handleExecuteCheckout = (planType: 'annual' | 'monthly' | 'downsell_annual' | 'starter_pass') => {
    sound.playTap();
    setIsProcessing(true);
    setCheckoutStep('Connessione sicura al Gateway Stripe (TLSv1.3)...');

    let checkoutUrl = MONETIZATION_CONFIG.stripeAnnualUrl;
    if (planType === 'monthly') checkoutUrl = MONETIZATION_CONFIG.stripeMonthlyUrl;
    if (planType === 'downsell_annual') checkoutUrl = MONETIZATION_CONFIG.stripeDownsellUrl;
    if (planType === 'starter_pass') checkoutUrl = MONETIZATION_CONFIG.starterPassUrl;

    const isRealUrl = checkoutUrl.startsWith('https://') && !checkoutUrl.includes('test_');
    if (MONETIZATION_CONFIG.enableRealRedirect || isRealUrl) {
      if (isSafeRedirectUrl(checkoutUrl)) {
        window.location.href = checkoutUrl;
        return;
      }
      console.warn('[Security] Blocked unauthorized redirect target:', checkoutUrl);
    }

    // Cryptographic terminal simulation
    setTimeout(() => {
      setCheckoutStep('Generazione zero-knowledge session & verifica token...');
    }, 600);

    setTimeout(() => {
      setCheckoutStep('Attivazione licenza ZeroDay PRO in corso...');
    }, 1200);

    setTimeout(() => {
      setIsProcessing(false);
      sound.playVictoryFanfare();
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
      onUpgradeSuccess();
      setIsDownsellMode(false);
      onClose();
    }, 2000);
  };

  // Context-specific messaging
  const getContextContent = () => {
    switch (context) {
      case 'win_streak_trap':
        return {
          badge: `🔥 WIN STREAK IN PERICOLO (${winStreak} VITTORIE DI FILA)`,
          badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
          title: 'Hai esaurito i Ticket Arena di oggi!',
          subtitle: `Non fermare la scalata ELO mentre sei on fire. Sblocca match PvP 1v1 illimitati e difendi la tua striscia vincente con ZeroDay PRO.`
        };
      case 'blurred_breakdown':
        return {
          badge: '🔒 ROOT CAUSE BREAKDOWN RISERVATO PRO',
          badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
          title: 'Sblocca l\'Anatomia Completa dell\'Exploit',
          subtitle: 'I veri hacker non memorizzano le risposte: comprendono i registri di memoria, il PoC e il codice di mitigazione senza censure.'
        };
      case 'weakness_drill':
        return {
          badge: '🎯 WEAKNESS DRILL & FORENSIC RADAR',
          badgeColor: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40',
          title: 'Colma le falle nei tuoi domini critici',
          subtitle: 'Isola e correggi le tue lacune con drill mirati sui root-cause exploit non superati, allineando la tua preparazione ai benchmark ufficiali d\'esame.'
        };
      case 'xp_boost_shield':
        return {
          badge: '⚡ 2x XP MULTIPLIER & LEAGUE SHIELD',
          badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
          title: 'Domina la Lega Settimanale senza Rischi',
          subtitle: 'Raddoppia istantaneamente tutti i punti XP guadagnati nei lab, entra nella Promotion Zone (Top 3) e attiva lo scudo contro la retrocessione.'
        };
      case 'exam_simulator_lock':
        return {
          badge: '🎓 GARANZIA SUPERAMENTO ESAME 100%',
          badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
          title: 'Risparmia oltre 350€ di Voucher Esame',
          subtitle: 'Non rischiare di fallire CompTIA Security+, CCNA o CEH. Sblocca tutti i simulatori ufficiali cronometrati e i laboratori PBQ reali con ZeroDay PRO.'
        };
      case 'bounty_crate_lock':
        return {
          badge: '🎁 TAGLIA SBLOCCATA SUL CAMPO',
          badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
          title: 'Decritta le Tue Bounty Crates Giornaliere',
          subtitle: 'Hai già completato l\'obiettivo operativo! Passa a ZeroDay PRO per decrittare le casse PRO (+150 XP extra + 2 Arena Tickets) e raddoppiare la tua scalata.'
        };
      case 'diagnostic_funnel':
      default:
        return {
          badge: '⚡ PROVA GRATUITA 7 GIORNI · ZERO RISCHIO',
          badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
          title: 'Raggiungi il 92% di Readiness Score in 21 Giorni',
          subtitle: 'Accedi al programma d\'addestramento offensivo completo: CompTIA Security+, CCNA, CEH e simulatore di scenari Zero-Day reali.'
        };
    }
  };

  const contextData = getContextContent();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className={`relative w-full max-w-lg my-auto rounded-3xl p-5 sm:p-6 shadow-2xl transition-all duration-300 ${
        isDownsellMode 
          ? 'bg-[#0E0C17] border-2 border-amber-500/60 shadow-neon-amber' 
          : 'bg-[#131B2E] border border-white/10 shadow-cyber-glass'
      }`}>
        
        {/* Top Dismiss Button */}
        <button
          onClick={handleAttemptClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/5 transition-colors z-20"
          aria-label="Chiudi Paywall"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ------------------------------------------------------------- */}
        {/* MODE 0: OFFLINE CRYPTOGRAPHIC LICENSE KEY RESTORE             */}
        {/* ------------------------------------------------------------- */}
        {isRestoreView ? (
          <div className="space-y-4 animate-fade-in text-slate-100">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold w-fit">
              <KeyRound className="w-4 h-4 text-emerald-400" />
              <span>OFFLINE LICENSE KEY VALIDATOR</span>
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                Ripristina Licenza PRO
              </h2>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Inserisci la chiave crittografica ricevuta dopo l'acquisto per ripristinare il tuo accesso PRO illimitato su qualsiasi dispositivo.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-mono font-bold text-slate-300 block">
                CHIAVE DI LICENZA (FORMATO: 0xPRO-XXXX-XXXX-XXXX)
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
                <p className="text-xs text-red-400 font-mono flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{restoreError}</span>
                </p>
              )}
            </div>

            <button
              onClick={handleVerifyAndRestore}
              className="w-full py-3.5 px-4 rounded-xl font-mono font-extrabold text-sm text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-400 to-indigo-400 hover:from-emerald-300 hover:to-indigo-300 transition-all shadow-neon-emerald flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>VERIFICA & RIPRISTINA ACCESSO PRO</span>
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
        ) : isDownsellMode ? (
          <div className="space-y-4 animate-fade-in text-slate-100">
            {/* Glitch Intercept Header */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold w-fit">
              <ShieldAlert className="w-4 h-4 animate-pulse text-amber-400" />
              <span>0xOVERRIDE INTERCEPTED // ONE-TIME OFFER</span>
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
                <span>Offerta Segreta Sbloccata</span>
                <span className="text-amber-400 text-sm px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30">
                  -50% EXTRA
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Il firewall ha intercettato il tentativo di disconnessione. Prima di abbandonare le difese, ti riserviamo l'accesso illimitato a ZeroDay PRO al prezzo di costo operativo.
              </p>
            </div>

            {/* Live Countdown Banner */}
            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 flex items-center justify-between font-mono">
              <div className="flex items-center gap-2 text-xs text-amber-300">
                <Clock className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
                <span>Questa offerta scade tra:</span>
              </div>
              <div className="text-base sm:text-lg font-black text-amber-400 tracking-wider">
                {formatCountdown(timeLeft)}
              </div>
            </div>

            {/* Downsell Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option A: Annual -50% (€39.99/year -> €3.33/mo) */}
              <div
                onClick={() => setDownsellPlan('downsell_annual')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  downsellPlan === 'downsell_annual'
                    ? 'bg-gradient-to-b from-amber-500/20 to-surface border-amber-400 ring-2 ring-amber-400/40'
                    : 'bg-[#090D16] border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/30 text-amber-300 font-bold">
                    MIGLIOR AFFARE
                  </span>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    downsellPlan === 'downsell_annual' ? 'border-amber-400 bg-amber-400 text-slate-950' : 'border-slate-500'
                  }`}>
                    {downsellPlan === 'downsell_annual' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
                <div className="text-sm font-bold text-white">Piano Annuale -50%</div>
                <div className="flex items-baseline gap-1 my-1">
                  <span className="text-2xl font-black text-white font-mono">€3.33</span>
                  <span className="text-[10px] text-slate-400">/mese</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  €39.99/anno <span className="line-through text-slate-500">€69.00</span>
                </div>
              </div>

              {/* Option B: Starter Pass 30 Days (€4.99 one-off) */}
              <div
                onClick={() => setDownsellPlan('starter_pass')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  downsellPlan === 'starter_pass'
                    ? 'bg-gradient-to-b from-indigo-500/20 to-surface border-indigo-400 ring-2 ring-indigo-400/40'
                    : 'bg-[#090D16] border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-300 font-bold">
                    UNA TANTUM
                  </span>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    downsellPlan === 'starter_pass' ? 'border-indigo-400 bg-indigo-400 text-slate-950' : 'border-slate-500'
                  }`}>
                    {downsellPlan === 'starter_pass' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
                <div className="text-sm font-bold text-white">Starter Pass 30 Giorni</div>
                <div className="flex items-baseline gap-1 my-1">
                  <span className="text-2xl font-black text-white font-mono">€4.99</span>
                  <span className="text-[10px] text-slate-400">totali</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  Nessun rinnovo automatico
                </div>
              </div>
            </div>

            {/* Cryptographic Checkout Button */}
            <button
              onClick={() => handleExecuteCheckout(downsellPlan)}
              disabled={isProcessing}
              className="w-full py-4 px-4 rounded-xl font-mono font-extrabold text-sm sm:text-base text-slate-950 bg-gradient-to-r from-amber-400 via-orange-400 to-emerald-400 hover:from-amber-300 hover:to-emerald-300 transition-all shadow-neon-amber flex items-center justify-center gap-2 transform active:scale-98 disabled:opacity-75"
            >
              {isProcessing ? (
                <span className="flex items-center gap-2 text-xs">
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>{checkoutStep}</span>
                </span>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-slate-950" />
                  <span>
                    {downsellPlan === 'downsell_annual' 
                      ? 'APPROFITTA DEL -50% (SOLI €39.99/ANNO)' 
                      : 'ATTIVA LO STARTER PASS A €4.99'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Reject Downsell Action */}
            <div className="text-center pt-1">
              <button
                onClick={handleRejectDownsell}
                className="text-xs text-slate-500 hover:text-slate-300 underline font-mono transition-colors"
              >
                Rifiuta lo sconto del 50% e resta vulnerabile (Torna alla versione Free)
              </button>
            </div>
          </div>
        ) : (
          /* ------------------------------------------------------------- */
          /* MODE 2: STANDARD HIGH-CONVERTING ZERO-DAY PAYWALL (7 TRIGGERS) */
          /* ------------------------------------------------------------- */
          <div className="space-y-4 animate-fade-in text-slate-100">
            {/* Live Social Proof Banner in Header */}
            <SocialProofBanner variant="compact" className="mb-2" />

            {/* Badge & Title */}
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border mb-2.5 backdrop-blur-md">
                <span className="text-emerald-400 font-extrabold">{contextData.badge}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-tight">
                {contextData.title}
              </h2>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {contextData.subtitle}
              </p>
            </div>

            {/* 7-Day Free Trial Timeline (Headway / Duolingo Style) */}
            <div className="p-4 rounded-2xl bg-[#090D16] border border-white/10 space-y-3">
              <div className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>COME FUNZIONA LA PROVA GRATUITA DI 7 GIORNI:</span>
              </div>

              <div className="relative pl-6 space-y-3.5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-emerald-400 before:via-indigo-400 before:to-slate-600">
                <div className="relative text-xs">
                  <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-950" />
                  <span className="font-mono font-bold text-white block">Oggi (Giorno 0)</span>
                  <span className="text-slate-400 text-[11px]">
                    Sblocco immediato di tutti i lab PBQ, simulazioni e ticket arena illimitati. Addebito: <strong className="text-emerald-300">€0.00</strong>.
                  </span>
                </div>

                <div className="relative text-xs">
                  <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-indigo-400 ring-4 ring-indigo-950" />
                  <span className="font-mono font-bold text-white block">Giorno 5</span>
                  <span className="text-slate-400 text-[11px]">
                    Ti inviamo una notifica prima della scadenza della prova. Nessuna sorpresa.
                  </span>
                </div>

                <div className="relative text-xs">
                  <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-slate-500 ring-4 ring-slate-900" />
                  <span className="font-mono font-bold text-white block">Giorno 7</span>
                  <span className="text-slate-400 text-[11px]">
                    Inizio dell'abbonamento selezionato. Disdici con 1-click in qualsiasi momento.
                  </span>
                </div>
              </div>
            </div>

            {/* Billing Cycle Switcher */}
            <div className="grid grid-cols-2 gap-3">
              {/* Annual Plan (Best Value - 60% OFF) */}
              <div
                onClick={() => setBillingCycle('annual')}
                className={`relative p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  billingCycle === 'annual'
                    ? 'bg-gradient-to-b from-emerald-500/20 to-surface border-emerald-400 ring-2 ring-emerald-400/30 shadow-neon-emerald'
                    : 'bg-[#090D16] border-white/10 hover:border-white/20'
                }`}
              >
                <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950 font-mono font-extrabold text-[9px] uppercase tracking-wider">
                  Risparmi 60%
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold text-xs text-slate-200">PIANO ANNUALE</span>
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
                  Fatturato annualmente a €69/anno
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
                  <span className="font-mono font-bold text-xs text-slate-200">PIANO MENSILE</span>
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
                  Fatturato ogni 30 giorni, disdici online
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
                <span>Tutti i lab PBQ & Simulatori</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Root Cause Exploit & mitigazioni</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Bounty Crates PRO decrittate</span>
              </div>
            </div>

            {/* Call to Action Button */}
            <button
              onClick={() => handleExecuteCheckout(billingCycle)}
              disabled={isProcessing}
              className="w-full py-3.5 px-4 rounded-xl font-mono font-extrabold text-sm sm:text-base text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 hover:from-emerald-300 hover:to-teal-400 transition-all shadow-neon-emerald flex items-center justify-center gap-2 transform active:scale-98 disabled:opacity-75"
            >
              {isProcessing ? (
                <span className="flex items-center gap-2 text-xs font-bold">
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>{checkoutStep}</span>
                </span>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-slate-950" />
                  <span>INIZIA LA PROVA GRATUITA DI 7 GIORNI</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Social Proof & Free fallback */}
            <div className="text-center space-y-2 pt-1">
              <p className="text-[11px] text-slate-400">
                ⭐ Valutato <span className="text-white font-bold">4.9/5</span> da oltre 14.800 professionisti e red teamer.
              </p>
              <button
                onClick={handleAttemptClose}
                className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-4 font-mono transition-colors"
              >
                Continua con la versione Free (funzionalità e ticket limitati)
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
                  <span>Hai già una chiave? Ripristina Licenza PRO</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
