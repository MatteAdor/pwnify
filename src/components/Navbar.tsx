import React, { useState } from 'react';
import { UserState } from '../types';
import { getRankFromElo } from '../data/ranks';
import { sound } from '../utils/soundEngine';
import { useLanguage } from '../utils/language';
import { 
  Flame, Ticket, Shield, Sparkles, Terminal, 
  Volume2, VolumeX, RotateCcw, Palette,
  LogIn, UserCheck
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

  const handleToggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#090D16]/90 backdrop-blur-md border-b border-white/[0.08] px-3 sm:px-4 py-2.5">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
        {/* Brand Logo */}
        <div 
          onClick={() => sound.playTap()}
          className="flex items-center gap-2 sm:gap-2.5 cursor-pointer"
        >
          <div className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-surface border border-white/10 shadow-neon-emerald">
            <span className="font-mono font-bold text-xs text-emerald-400">0x</span>
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping opacity-75" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-extrabold text-sm sm:text-base tracking-wider text-white">
                Zero<span className="text-emerald-400">Day</span>
              </span>
              <span className="text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                v2.5
              </span>
            </div>
            <p className="text-[9px] text-slate-400 font-mono hidden md:block">
              CYBER_WARFARE_ACADEMY
            </p>
          </div>
        </div>

        {/* Tactical Status Counters & Quick Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Daily Streak */}
          <div 
            onClick={() => sound.playTap()}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface/80 border border-white/10 hover:border-amber-500/40 transition-colors cursor-pointer"
            title={t.dailyStreak}
          >
            <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500 animate-pulse" />
            <span className="font-mono font-bold text-xs text-amber-300">
              {userState.streakDays}d
            </span>
          </div>

          {/* ELO Rank Badge */}
          <div 
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface/80 border border-white/10"
            style={{ borderColor: `${rank.badgeColor}40` }}
            title={`ELO Rating: ${userState.elo} (${rank.tier})`}
          >
            <Shield className="w-3.5 h-3.5" style={{ color: rank.badgeColor }} />
            <div className="flex flex-col text-left">
              <span className="text-[9px] text-slate-400 font-mono leading-none">
                {rank.tier}
              </span>
              <span className="font-mono font-bold text-xs text-slate-100 leading-tight">
                {userState.elo} <span className="text-[10px] text-slate-400 font-normal">ELO</span>
              </span>
            </div>
          </div>

          {/* Arena Tickets */}
          <div 
            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface/80 border border-white/10 hover:border-indigo-500/40 transition-colors"
            title={t.arenaTickets}
          >
            <Ticket className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-mono font-bold text-xs text-indigo-300">
              {userState.isPro ? (
                <span className="text-emerald-400 flex items-center gap-0.5">
                  ∞ <span className="text-[9px] font-semibold">PRO</span>
                </span>
              ) : (
                <span>{userState.arenaTickets}/{userState.maxTickets}</span>
              )}
            </span>
          </div>

          {/* DEFCON Live Indicator & Daily 0xBreach */}
          <button
            onClick={() => {
              sound.playTap();
              onOpenDailyBreach?.();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gradient-to-r from-red-950/70 via-amber-950/60 to-red-950/70 border border-red-500/40 hover:border-amber-400 text-amber-300 font-mono text-[11px] font-bold transition-all shadow-sm active:scale-95 animate-pulse"
            title="Daily 0xBreach: Solve today's live incident"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
            <span className="hidden sm:inline text-red-400">DEFCON 1 ·</span>
            <span>0xBREACH</span>
          </button>

          {/* Cyber Arsenal Customizer */}
          <button
            onClick={() => {
              sound.playTap();
              onOpenArsenal?.();
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-surface/80 border border-white/10 hover:border-indigo-400/50 text-slate-300 hover:text-indigo-300 font-mono text-[11px] transition-colors"
            title="Cyber Arsenal: HUD Themes & Custom Titles"
          >
            <Palette className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">ARSENAL</span>
          </button>

          {/* Mute Audio Toggle */}
          <button
            onClick={handleToggleSound}
            className="p-1.5 rounded-md bg-surface/80 border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-colors"
            title={t.soundToggle}
          >
            {isMuted ? (
              <VolumeX className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
          </button>

          {/* PRO Badge / Upgrade CTA */}
          {userState.isPro ? (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-gradient-to-r from-emerald-500/20 to-indigo-500/20 border border-emerald-500/50 shadow-neon-emerald">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] sm:text-[11px] font-mono font-bold text-emerald-300 uppercase tracking-wide">
                {t.proActiveBadge}
              </span>
            </div>
          ) : (
            <button
              onClick={() => {
                sound.playTap();
                onOpenPaywall();
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs transition-all shadow-neon-emerald transform active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              <span className="font-mono text-[11px] sm:text-xs">{t.tryPro}</span>
            </button>
          )}

          {/* Operator Auth / Account Profile Button */}
          <button
            onClick={() => {
              sound.playTap();
              onOpenAuth?.();
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono text-[11px] border transition-all cursor-pointer ${
              userState.isLoggedIn
                ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300 hover:border-emerald-400'
                : 'bg-surface/90 border-white/10 text-slate-300 hover:text-white hover:border-emerald-500/40'
            }`}
            title={userState.isLoggedIn ? `Operator: ${userState.username}` : t.logInNav}
          >
            {userState.isLoggedIn ? (
              <>
                <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="font-bold truncate max-w-[120px]">{userState.username}</span>
              </>
            ) : (
              <>
                <LogIn className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-bold">{t.logInNav}</span>
              </>
            )}
          </button>

          {/* Developer Quick Toggle & Reset (Protected by God Mode) */}
          {isGodMode && (
            <>
              <button
                onClick={() => {
                  sound.playTap();
                  onTogglePro();
                }}
                className={`flex items-center gap-1 px-2 py-1 rounded border font-mono text-[10px] transition-all ${
                  userState.isPro 
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' 
                    : 'bg-slate-800/80 text-slate-300 border-slate-600 hover:border-emerald-500/40'
                }`}
                title="God Mode: Toggle per testare lo sblocco immediato"
              >
                <Terminal className="w-3 h-3 text-emerald-400" />
                <span className="font-bold">{userState.isPro ? 'PRO ⚡' : 'FREE 🔒'}</span>
              </button>

              <button
                onClick={() => {
                  sound.playTap();
                  if (window.confirm('Vuoi azzerare i dati demo e riavviare l\'Onboarding Diagnostico?')) {
                    onResetData();
                  }
                }}
                className="p-1.5 rounded border border-white/10 bg-surface text-slate-400 hover:text-red-400 hover:border-red-500/30 transition-colors"
                title="God Mode: Azzera dati demo"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
