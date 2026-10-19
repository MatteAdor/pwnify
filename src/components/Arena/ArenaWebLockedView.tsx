import React, { useState } from 'react';
import { 
  Swords, 
  Download, 
  Lock, 
  ShieldAlert, 
  Zap, 
  Copy, 
  Check, 
  Smartphone,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { sound } from '../../utils/soundEngine';
import { useLanguage } from '../../utils/language';
import { APK_DOWNLOAD_URL, APK_SIZE, APK_SHA256, getCachedVersionInfo } from '../../utils/platform';

interface ArenaWebLockedViewProps {
  onBackToSkillTree: () => void;
}

export const ArenaWebLockedView: React.FC<ArenaWebLockedViewProps> = ({
  onBackToSkillTree
}) => {
  const { lang } = useLanguage();
  const isEn = lang === 'en';
  const [copiedHash, setCopiedHash] = useState(false);

  const handleCopyHash = () => {
    sound.playTap();
    navigator.clipboard.writeText(APK_SHA256);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2500);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12 space-y-6 animate-fade-in font-sans">
      
      {/* Top Warning Banner */}
      <div className="bg-[#101726] border border-rose-500/40 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
        
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold uppercase tracking-wider">
              {isEn ? 'ARENA PVP · MOBILE EXCLUSIVE' : 'ARENA PVP · ESCLUSIVA APP NATIVA'}
            </span>
            <span className="text-xs font-mono text-zinc-500">
              v{getCachedVersionInfo().versionName}
            </span>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <Swords className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {isEn ? '1v1 Arena is locked on browser' : 'L\'Arena 1v1 PvP è bloccata da browser'}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                {isEn
                  ? 'To prevent inspect-element tampering, script automation, and ensure 0ms real-time synchronization, 1v1 Blitz battles are restricted to the verified Android application.'
                  : 'Per prevenire manipolazioni da console del browser, automazioni di script e garantire sincronizzazione a 0ms nei duelli, l\'Arena 1v1 è accessibile unicamente tramite l\'App Android nativa.'}
              </p>
            </div>
          </div>
        </div>

        {/* Why the APK is required */}
        <div className="bg-[#070B12] border border-zinc-800 rounded-xl p-4 space-y-3 font-mono text-xs">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
            {isEn ? 'NATIVE ANDROID CAPABILITIES' : 'FUNZIONALITÀ ATTIVE NELL\'APK NATIVO'}
          </div>

          <div className="space-y-2 text-zinc-300 text-[11px]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{isEn ? 'Real-time 60s PvP duels with low-latency sockets' : 'Duelli 1v1 in tempo reale da 60 secondi a latenza zero'}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{isEn ? 'Anti-cheat memory verification & ELO ranking' : 'Verifica anti-cheat in memoria e classifica ELO protetta'}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{isEn ? 'Tactile haptic vibrations on exploit discovery' : 'Feedback aptico e vibrazione al rilevamento exploit'}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{isEn ? 'Full offline persistence with zero web lag' : 'Persistenza offline locale senza dipendenza dal browser'}</span>
            </div>
          </div>
        </div>

        {/* SHA-256 Checksum Box */}
        <div className="bg-[#070B12] p-3 rounded-lg border border-zinc-800 text-[10px] font-mono flex items-center justify-between">
          <div className="truncate text-zinc-400 mr-2">
            SHA-256: <span className="text-zinc-300">{APK_SHA256.slice(0, 16)}...{APK_SHA256.slice(-8)}</span>
          </div>
          <button
            onClick={handleCopyHash}
            className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 shrink-0 font-bold"
          >
            {copiedHash ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            <span>{copiedHash ? 'COPIED' : 'COPY HASH'}</span>
          </button>
        </div>

        {/* Primary Download CTA */}
        <div className="space-y-2 pt-2">
          <a
            href={APK_DOWNLOAD_URL}
            download="zeroday.apk"
            onClick={() => sound.playVictoryFanfare()}
            className="w-full py-4 px-4 rounded-xl font-mono font-bold text-sm text-slate-950 bg-emerald-500 hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/10 cursor-pointer"
          >
            <img src="/brand/zeroday_icon_192.png" alt="ZeroDay" className="w-5 h-5 rounded object-cover shadow-sm" />
            <span>{isEn ? 'DOWNLOAD APK TO PLAY 1V1 DUELS' : 'SCARICA L\'APK PER GIOCARE NELL\'ARENA'}</span>
            <span className="text-[10px] bg-slate-950/20 px-2 py-0.5 rounded font-mono">{APK_SIZE}</span>
          </a>

          <button
            onClick={() => {
              sound.playTap();
              onBackToSkillTree();
            }}
            className="w-full py-2.5 text-xs text-zinc-400 hover:text-white font-mono transition-colors flex items-center justify-center gap-1.5"
          >
            <span>{isEn ? '← Back to Skill Tree (Limited Sandbox)' : '← Torna allo Skill Tree (Sandbox Limitata)'}</span>
          </button>
        </div>

      </div>

    </div>
  );
};
