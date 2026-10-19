import React, { useState } from 'react';
import { 
  Smartphone, 
  Download, 
  Swords, 
  ShieldAlert, 
  CheckCircle2, 
  Copy, 
  Check, 
  X, 
  ExternalLink,
  Zap,
  Lock
} from 'lucide-react';
import { sound } from '../../utils/soundEngine';
import { useLanguage } from '../../utils/language';
import { APK_DOWNLOAD_URL, APK_SIZE, APK_SHA256 } from '../../utils/platform';

export type GateContext = 'arena_locked' | 'periodic_reminder' | 'pbq_locked' | 'general_limit';

interface AppDownloadGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  context?: GateContext;
}

export const AppDownloadGateModal: React.FC<AppDownloadGateModalProps> = ({
  isOpen,
  onClose,
  context = 'arena_locked'
}) => {
  const { lang } = useLanguage();
  const isEn = lang === 'en';
  const [copiedHash, setCopiedHash] = useState(false);

  if (!isOpen) return null;

  const handleCopyHash = () => {
    sound.playTap();
    navigator.clipboard.writeText(APK_SHA256);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2500);
  };

  const getDetails = () => {
    switch (context) {
      case 'arena_locked':
        return {
          icon: Swords,
          badge: isEn ? 'ARENA PVP · MOBILE EXCLUSIVE' : 'ARENA PVP · ESCLUSIVA APP NATIVA',
          badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          title: isEn ? '1v1 Cyber Arena is locked on browser' : 'L\'Arena 1v1 PvP è bloccata da browser',
          description: isEn
            ? 'To ensure 0ms real-time duel synchronization, hardware-accelerated attack timers, and anti-tamper sandboxing, 1v1 Blitz battles are available exclusively on the native Android application.'
            : 'Per garantire sincronizzazione a 0ms nei duelli, timer di attacco accelerati via hardware e protezione anti-cheat, le battaglie 1v1 Blitz sono disponibili esclusivamente nell\'applicazione nativa per Android.'
        };
      case 'pbq_locked':
        return {
          icon: Lock,
          badge: isEn ? 'PBQ LABS · NATIVE ENGINE REQUIRED' : 'LABORATORI PBQ · ENGINE NATIVO RICHIESTO',
          badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
          title: isEn ? 'Advanced PBQ Simulator locked' : 'Simulatore PBQ Avanzato bloccato',
          description: isEn
            ? 'Full CompTIA Security+ and CCNA interactive packet reconstruction and terminal labs require local offline execution engines available only in the Android APK.'
            : 'La ricostruzione di pacchetti e i laboratori terminali completi per CompTIA Security+ e CCNA richiedono i motori di esecuzione offline presenti nell\'APK Android.'
        };
      case 'periodic_reminder':
      default:
        return {
          icon: Smartphone,
          badge: isEn ? 'BROWSER SANDBOX · LIMITED MODE' : 'SANDBOX BROWSER · MODALITÀ LIMITATA',
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          title: isEn ? 'Unlock the full power of ZeroDay' : 'Sblocca il vero potenziale di ZeroDay',
          description: isEn
            ? 'You are running in the restricted Web Sandbox. Duels, advanced PBQs, offline progress sync, and haptic feedback require the native Android application.'
            : 'Stai operando nella Sandbox Web con funzionalità limitate. I duelli 1v1, tutti i PBQ d\'esame, la sincronizzazione offline e il feedback tattile richiedono l\'app nativa per Android.'
        };
    }
  };

  const details = getDetails();
  const IconComponent = details.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in font-sans">
      <div className="relative w-full max-w-lg bg-[#0C121D] border border-zinc-800 rounded-2xl p-6 shadow-2xl text-zinc-100 space-y-6">
        
        {/* Close Button */}
        <button
          onClick={() => {
            sound.playTap();
            onClose();
          }}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with Icon and Badge */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold uppercase tracking-wider ${details.badgeColor}`}>
              {details.badge}
            </span>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
              <IconComponent className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                {details.title}
              </h2>
              <p className="text-xs text-zinc-300 mt-1.5 leading-relaxed">
                {details.description}
              </p>
            </div>
          </div>
        </div>

        {/* Feature Comparison Box: Browser vs Native APK */}
        <div className="bg-[#070B12] border border-zinc-800/80 rounded-xl p-3.5 space-y-2.5 font-mono text-xs">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
            {isEn ? 'ENVIRONMENT CAPABILITIES' : 'LIMITAZIONI AMBIENTE OPERATIVO'}
          </div>

          <div className="space-y-2 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">{isEn ? '1v1 Arena PvP Duels' : 'Duelli 1v1 Arena PvP'}</span>
              <div className="flex items-center gap-3">
                <span className="text-rose-400 font-bold">{isEn ? 'Web: LOCKED' : 'Web: BLOCCATO'}</span>
                <span className="text-emerald-400 font-bold">{isEn ? 'APK: UNLIMITED' : 'APK: ILLIMITATO'}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-400">{isEn ? 'CompTIA/CCNA PBQ Labs' : 'Laboratori PBQ Certificazioni'}</span>
              <div className="flex items-center gap-3">
                <span className="text-amber-400 font-bold">{isEn ? 'Web: Level 1 only' : 'Web: Solo Livello 1'}</span>
                <span className="text-emerald-400 font-bold">{isEn ? 'APK: Complete' : 'APK: Completi'}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-400">{isEn ? 'Offline Persistence & Haptics' : 'Persistenza Offline & Vibrazione'}</span>
              <div className="flex items-center gap-3">
                <span className="text-zinc-500">{isEn ? 'Web: No' : 'Web: No'}</span>
                <span className="text-emerald-400 font-bold">{isEn ? 'APK: Active' : 'APK: Attivo'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* SHA-256 Verification Chip */}
        <div className="bg-[#070B12] p-2.5 rounded-lg border border-zinc-800 text-[10px] font-mono flex items-center justify-between">
          <div className="truncate text-zinc-400 mr-2">
            SHA256: <span className="text-zinc-300">{APK_SHA256.slice(0, 16)}...{APK_SHA256.slice(-8)}</span>
          </div>
          <button
            onClick={handleCopyHash}
            className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 shrink-0 font-bold"
          >
            {copiedHash ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            <span>{copiedHash ? 'COPIED' : 'COPY HASH'}</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          {/* Direct APK Download Button */}
          <a
            href={APK_DOWNLOAD_URL}
            download="zeroday.apk"
            onClick={() => sound.playVictoryFanfare()}
            className="w-full py-3.5 px-4 rounded-xl font-mono font-bold text-xs sm:text-sm text-slate-950 bg-emerald-500 hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2.5 shadow-lg cursor-pointer"
          >
            <img src="/brand/zeroday_icon_192.png" alt="ZeroDay" className="w-5 h-5 rounded object-cover shadow-sm" />
            <span>{isEn ? 'DOWNLOAD ZERODAY APK (ANDROID)' : 'SCARICA ZERODAY APK (ANDROID)'}</span>
            <span className="text-[10px] bg-slate-950/20 px-1.5 py-0.5 rounded font-mono">{APK_SIZE}</span>
          </a>

          {/* Dismiss button */}
          <button
            onClick={() => {
              sound.playTap();
              onClose();
            }}
            className="w-full py-2 text-xs text-zinc-500 hover:text-zinc-300 font-mono transition-colors text-center"
          >
            {isEn ? 'Continue in limited browser mode' : 'Continua nella modalità browser limitata'}
          </button>
        </div>

      </div>
    </div>
  );
};
