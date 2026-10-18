import React, { useState } from 'react';
import { UserState } from '../types';
import { getRankFromElo } from '../data/ranks';
import { sound } from '../utils/soundEngine';
import { useLanguage } from '../utils/language';
import { 
  Flame, Ticket, Sparkles, Terminal, 
  Volume2, VolumeX, RotateCcw, Palette,
  LogIn, UserCheck, Settings, X, Shield
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
      <header className="sticky top-0 z-40 w-full bg-[#0B0E14]/95 backdrop-blur-md border-b border-zinc-800/80 px-3 sm:px-6 pt-safe pb-2.5 min-h-[58px] flex items-center transition-all">
        <div className="w-full max-w-6xl mx-auto flex items-center justify-between gap-2.5">
          {/* Brand Logo - Clear and Prominent on Mobile */}
          <div 
            onClick={() => sound.playTap()}
            className="flex items-center gap-2 cursor-pointer select-none shrink-0"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700/80 text-emerald-400 font-mono font-bold text-xs shadow-sm">
              0x
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-base sm:text-lg tracking-tight text-white">
                Zero<span className="text-emerald-400">Day</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800/90 text-zinc-300 border border-zinc-700">
                PRO
              </span>
            </div>
          </div>

          {/* Minimalist Top Telemetry & Controls: Visible & High Contrast */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Daily Streak Counter */}
            <div 
              onClick={() => sound.playTap()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-800 hover:border-amber-500/40 transition-colors cursor-pointer"
              title={t.dailyStreak}
            >
              <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="font-mono font-bold text-xs sm:text-sm text-amber-300">
                {userState.streakDays}d
              </span>
            </div>

            {/* Arena Tickets Counter */}
            <div 
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-800 hover:border-indigo-500/40 transition-colors"
              title={t.arenaTickets}
            >
              <Ticket className="w-4 h-4 text-indigo-400" />
              <span className="font-mono font-bold text-xs sm:text-sm text-indigo-300">
                {userState.isPro ? (
                  <span className="text-emerald-400 font-semibold text-xs">∞ PRO</span>
                ) : (
                  <span>{userState.arenaTickets}/{userState.maxTickets}</span>
                )}
              </span>
            </div>

            {/* PRO Upgrade CTA (Only if free) */}
            {!userState.isPro && (
              <button
                onClick={() => {
                  sound.playTap();
                  onOpenPaywall();
                }}
                className="hidden xs:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-mono font-bold text-xs transition-all transform active:scale-95 cursor-pointer shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 fill-zinc-950" />
                <span>PRO</span>
              </button>
            )}

            {/* Settings & Account Gear Button */}
            <button
              onClick={() => {
                sound.playTap();
                setIsSettingsOpen(true);
              }}
              className="flex items-center gap-1.5 p-2 rounded-lg bg-zinc-900/90 border border-zinc-700/80 hover:border-emerald-500/50 text-zinc-300 hover:text-white transition-all active:scale-95 cursor-pointer shadow-sm"
              title="Impostazioni & Account"
              aria-label="Settings and Profile"
            >
              <Settings className="w-4 h-4 text-zinc-200" />
            </button>
          </div>
        </div>
      </header>

      {/* Tactical Settings & Profile Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-[#121620] border border-zinc-800 rounded-2xl p-5 shadow-2xl text-zinc-100 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-emerald-400">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-mono font-bold text-sm text-white tracking-wide">
                    CONFIGURAZIONE // ACCOUNT
                  </h3>
                  <p className="text-[11px] font-mono text-zinc-400">
                    Parametri operatore & impostazioni
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  sound.playTap();
                  setIsSettingsOpen(false);
                }}
                className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Chiudi impostazioni"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Operator Account Section */}
            <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider">
                  OPERATORE ATTIVO
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-bold border border-zinc-700">
                  {rank.tier}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 truncate">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs shrink-0 font-mono">
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
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 hover:border-emerald-500/40 font-mono text-xs font-bold text-zinc-200 hover:text-emerald-300 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  {userState.isLoggedIn ? (
                    <>
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Account</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{t.logInNav}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Tactical Customization: Cyber Arsenal */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold tracking-wider px-1">
                Personalizzazione & HUD
              </span>

              {/* Cyber Arsenal Customizer */}
              <button
                onClick={() => {
                  sound.playTap();
                  setIsSettingsOpen(false);
                  onOpenArsenal?.();
                }}
                className="w-full p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 text-left flex items-center justify-between transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                    <Palette className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-mono font-bold text-white group-hover:text-indigo-300 block">
                      Cyber Arsenal & Temi Terminale
                    </span>
                    <p className="text-[10px] text-zinc-400">
                      Personalizza fosfori CRT e callsign
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono text-indigo-400 font-bold">
                  Apri
                </span>
              </button>
            </div>

            {/* Audio Settings */}
            <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                </div>
                <div>
                  <span className="text-xs font-mono font-bold text-white block">
                    Effetti Sonori Web Audio
                  </span>
                  <p className="text-[10px] text-zinc-400">
                    Oscillatori sintetizzati per feedback tattile
                  </p>
                </div>
              </div>

              <button
                onClick={handleToggleSound}
                className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                  isMuted
                    ? 'bg-red-950/60 border border-red-500/40 text-red-300'
                    : 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                }`}
              >
                {isMuted ? 'MUTO' : 'ATTIVO'}
              </button>
            </div>

            {/* PRO Membership Section */}
            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  Stato Licenza ZeroDay
                </span>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                  userState.isPro ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {userState.isPro ? 'PRO UNLOCKED' : 'FREE TIER'}
                </span>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                {userState.isPro 
                  ? 'Accesso completo ai simulatori d\'esame ufficiali CompTIA, CCNA e CEH, laboratori PBQ e arena illimitata.'
                  : 'Sblocca le simulazioni ufficiali d\'esame, i laboratori PBQ e l\'arena 1v1 senza limiti.'}
              </p>

              {!userState.isPro && (
                <button
                  onClick={() => {
                    sound.playTap();
                    setIsSettingsOpen(false);
                    onOpenPaywall();
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-mono font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5 fill-zinc-950" />
                  <span>Passa a ZeroDay PRO</span>
                </button>
              )}
            </div>

            {/* Developer God Mode (Only visible in Localhost / Godmode) */}
            {isGodMode && (
              <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-2">
                <div className="flex items-center gap-1.5 text-zinc-400 font-mono text-[11px] font-bold">
                  <Terminal className="w-3.5 h-3.5 text-zinc-400" />
                  <span>DEV TOOLS // MODALITÀ GOD</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      sound.playTap();
                      onTogglePro();
                    }}
                    className={`flex-1 py-1.5 px-2 rounded-lg border font-mono text-xs font-bold transition-all cursor-pointer ${
                      userState.isPro 
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' 
                        : 'bg-zinc-800 text-zinc-300 border-zinc-700'
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
                    className="py-1.5 px-3 rounded-lg border border-red-500/30 bg-red-950/20 text-red-300 hover:bg-red-950/40 font-mono text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
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
