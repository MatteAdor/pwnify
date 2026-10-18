import React, { useState } from 'react';
import { UserState } from '../types';
import { getRankFromElo } from '../data/ranks';
import { sound } from '../utils/soundEngine';
import { useLanguage } from '../utils/language';
import { 
  Flame, Ticket, Shield, Sparkles, Terminal, 
  Volume2, VolumeX, RotateCcw, Palette,
  LogIn, UserCheck, Settings, X, AlertTriangle, Zap
} from 'lucide-react';

interface NavbarProps {
  userState: UserState;
  onTogglePro: () => void;
  onOpenPaywall: () => void;
  onResetData: () => void;
  isGodMode?: boolean;
  onOpenDailyBreach?: () => void;
  onOpenArsenal?: () => void;
  onOpenAuth?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  userState,
  onTogglePro,
  onOpenPaywall,
  onResetData,
  isGodMode = true,
  onOpenDailyBreach,
  onOpenArsenal,
  onOpenAuth
}) => {
  const { t } = useLanguage();
  const rank = getRankFromElo(userState.elo);
  const [isMuted, setIsMuted] = useState<boolean>(sound.getMuted());
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  const handleToggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-[#090D16]/95 backdrop-blur-md border-b border-white/[0.08] px-3 sm:px-4 py-2">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          {/* Brand Logo - Compact and Touch Ergonomic */}
          <div 
            onClick={() => sound.playTap()}
            className="flex items-center gap-2 cursor-pointer select-none shrink-0"
          >
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-surface border border-white/10 shadow-neon-emerald">
              <span className="font-mono font-bold text-xs text-emerald-400">0x</span>
              <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-75" />
              <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-extrabold text-sm sm:text-base tracking-wider text-white">
                Zero<span className="text-emerald-400">Day</span>
              </span>
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                v2.5
              </span>
            </div>
          </div>

          {/* Minimalist Top Status & Controls: Zero Clutter on Mobile */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Daily Streak Counter */}
            <div 
              onClick={() => sound.playTap()}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-surface/90 border border-white/10 hover:border-amber-500/40 transition-colors cursor-pointer"
              title={t.dailyStreak}
            >
              <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500 animate-pulse" />
              <span className="font-mono font-bold text-xs text-amber-300">
                {userState.streakDays}d
              </span>
            </div>

            {/* Arena Tickets Counter */}
            <div 
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-surface/90 border border-white/10 hover:border-indigo-500/40 transition-colors"
              title={t.arenaTickets}
            >
              <Ticket className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-mono font-bold text-xs text-indigo-300">
                {userState.isPro ? (
                  <span className="text-emerald-400 font-semibold text-[11px]">∞ PRO</span>
                ) : (
                  <span>{userState.arenaTickets}/{userState.maxTickets}</span>
                )}
              </span>
            </div>

            {/* PRO Badge / CTA (Compact) */}
            {userState.isPro ? (
              <div className="hidden xs:flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-950/50 border border-emerald-500/40 shadow-neon-emerald">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] font-mono font-bold text-emerald-300 uppercase tracking-wider">
                  PRO
                </span>
              </div>
            ) : (
              <button
                onClick={() => {
                  sound.playTap();
                  onOpenPaywall();
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-mono font-extrabold text-[11px] transition-all shadow-neon-emerald transform active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-3 h-3 fill-slate-950" />
                <span>PRO</span>
              </button>
            )}

            {/* Settings Gear Button (Clean Vector Icon, No Emoji) */}
            <button
              onClick={() => {
                sound.playTap();
                setIsSettingsOpen(true);
              }}
              className="w-8 h-8 rounded-lg bg-surface/90 border border-white/10 hover:border-emerald-500/50 text-slate-300 hover:text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-sm"
              title="Tactical Settings & Config"
              aria-label="Settings"
            >
              <Settings className="w-4 h-4 text-slate-300 hover:text-emerald-400 transition-colors" />
            </button>
          </div>
        </div>
      </header>

      {/* Tactical Settings Modal (Clean Drawer for All Secondary Controls) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-[#111726] border border-white/15 rounded-3xl p-5 sm:p-6 shadow-2xl text-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-surface border border-white/10 flex items-center justify-center text-emerald-400 shadow-neon-emerald">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-mono font-extrabold text-sm text-white tracking-wide">
                    CONFIG // IMPOSTAZIONI
                  </h3>
                  <p className="text-[10px] font-mono text-slate-400">
                    Parametri operativi & preferenze
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  sound.playTap();
                  setIsSettingsOpen(false);
                }}
                className="w-8 h-8 rounded-lg bg-surface border border-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                aria-label="Chiudi impostazioni"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Operator Account Section */}
            <div className="p-3.5 rounded-2xl bg-[#090D16] border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  OPERATORE CORRENTE
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                  {rank.tier}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 truncate">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xs shrink-0">
                    {userState.username.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <p className="font-mono font-bold text-xs text-white truncate">
                      {userState.username}
                    </p>
                    <p className="text-[10px] font-mono text-emerald-400">
                      {userState.elo} ELO · Streak {userState.streakDays}d
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    sound.playTap();
                    setIsSettingsOpen(false);
                    onOpenAuth?.();
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-surface border border-white/10 hover:border-emerald-500/40 font-mono text-[11px] font-bold text-slate-200 hover:text-emerald-300 transition-all flex items-center gap-1 shrink-0"
                >
                  {userState.isLoggedIn ? (
                    <>
                      <UserCheck className="w-3 h-3 text-emerald-400" />
                      <span>Account</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-3 h-3 text-slate-400" />
                      <span>Accedi</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Tactical Features: 0xBreach & Cyber Arsenal */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider px-1">
                Laboratori & Personalizzazione
              </span>

              {/* DEFCON 1 0xBreach Challenge */}
              <button
                onClick={() => {
                  sound.playTap();
                  setIsSettingsOpen(false);
                  onOpenDailyBreach?.();
                }}
                className="w-full p-3 rounded-xl bg-gradient-to-r from-red-950/40 via-amber-950/30 to-red-950/40 border border-red-500/40 hover:border-amber-400 text-left flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono font-bold text-white group-hover:text-amber-300">
                        Daily 0xBreach
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 border border-red-500/30 font-bold animate-pulse">
                        DEFCON 1
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Risolvi l'incidente Zero-Day del giorno
                    </p>
                  </div>
                </div>
                <Zap className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Cyber Arsenal Customizer */}
              <button
                onClick={() => {
                  sound.playTap();
                  setIsSettingsOpen(false);
                  onOpenArsenal?.();
                }}
                className="w-full p-3 rounded-xl bg-surface border border-white/10 hover:border-indigo-400/50 text-left flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                    <Palette className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-mono font-bold text-white group-hover:text-indigo-300 block">
                      Cyber Arsenal & Temi HUD
                    </span>
                    <p className="text-[10px] text-slate-400">
                      Personalizza fosfori terminale e callsign badge
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-indigo-400 font-bold group-hover:underline">
                  Apri
                </span>
              </button>
            </div>

            {/* Audio Settings */}
            <div className="p-3 rounded-xl bg-surface border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                </div>
                <div>
                  <span className="text-xs font-mono font-bold text-white block">
                    Effetti Sonori Web Audio
                  </span>
                  <p className="text-[10px] text-slate-400">
                    Oscillatori sintetizzati nativi
                  </p>
                </div>
              </div>

              <button
                onClick={handleToggleSound}
                className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all ${
                  isMuted
                    ? 'bg-red-950/60 border border-red-500/40 text-red-300'
                    : 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                }`}
              >
                {isMuted ? 'MUTO' : 'ATTIVO'}
              </button>
            </div>

            {/* PRO Membership Section */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-b from-[#131E33] to-[#0A1020] border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  Stato Licenza ZeroDay
                </span>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                  userState.isPro ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'
                }`}>
                  {userState.isPro ? 'PRO UNLOCKED' : 'FREE TIER'}
                </span>
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed">
                {userState.isPro 
                  ? 'Accesso completo autorizzato a tutti i simulatori d\'esame ufficiali, laboratori PBQ e arena illimitata.'
                  : 'Sblocca le simulazioni ufficiali CompTIA & CCNA e le casse PBQ senza limiti.'}
              </p>

              {!userState.isPro && (
                <button
                  onClick={() => {
                    sound.playTap();
                    setIsSettingsOpen(false);
                    onOpenPaywall();
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-mono font-extrabold text-xs transition-all shadow-neon-emerald flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                  <span>Passa a ZeroDay PRO</span>
                </button>
              )}
            </div>

            {/* Developer God Mode (Only visible in Localhost / Godmode) */}
            {isGodMode && (
              <div className="p-3 rounded-xl bg-[#090D16] border border-amber-500/30 space-y-2">
                <div className="flex items-center gap-1.5 text-amber-400 font-mono text-[11px] font-bold">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>GOD_MODE // STRUMENTI SVILUPPATORE</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      sound.playTap();
                      onTogglePro();
                    }}
                    className={`flex-1 py-1.5 px-2 rounded-lg border font-mono text-[11px] font-bold transition-all ${
                      userState.isPro 
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' 
                        : 'bg-slate-800 text-slate-300 border-slate-600'
                    }`}
                  >
                    {userState.isPro ? 'Disattiva PRO' : 'Attiva PRO Test'}
                  </button>
                  <button
                    onClick={() => {
                      sound.playTap();
                      if (window.confirm('Vuoi azzerare tutti i dati locali e riavviare l\'app?')) {
                        setIsSettingsOpen(false);
                        onResetData();
                      }
                    }}
                    className="py-1.5 px-3 rounded-lg border border-red-500/40 bg-red-950/30 text-red-300 hover:bg-red-950/60 font-mono text-[11px] font-bold transition-colors flex items-center gap-1"
                    title="Azzera dati demo"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
