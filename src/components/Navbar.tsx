import React, { useState } from 'react';
import { UserState } from '../types';
import { getRankFromElo } from '../data/ranks';
import { sound } from '../utils/soundEngine';
import { useLanguage } from '../utils/language';
import { 
  Flame, Ticket, Shield, Sparkles, Terminal, 
  Volume2, VolumeX, RotateCcw, Palette,
  LogIn, UserCheck, Activity
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
    <header className="sticky top-0 z-40 w-full bg-[#070B14]/85 backdrop-blur-xl border-b border-white/[0.08] px-3 sm:px-6 py-2.5 transition-colors duration-300 shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand Identity / Terminal Emblem */}
        <div 
          onClick={() => sound.playTap()}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-[#131C31] to-[#0A101D] border border-emerald-500/30 group-hover:border-emerald-400 transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <span className="font-mono font-black text-xs text-emerald-400 group-hover:scale-105 transition-transform">0x</span>
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping opacity-60" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-[#070B14]" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-sm sm:text-base tracking-wider text-white">
                Zero<span className="text-emerald-400">Day</span>
              </span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                PRO_OPS
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-mono hidden sm:flex">
              <Activity className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
              <span>LIVE TELEMETRY // SECURE 256-BIT</span>
            </div>
          </div>
        </div>

        {/* Tactical Telemetry Pods */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Daily Streak Pod */}
          <div 
            onClick={() => sound.playTap()}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#0E1628]/80 border border-white/[0.08] hover:border-amber-500/40 transition-all cursor-pointer shadow-sm"
            title={t.dailyStreak}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
            <span className="font-mono font-bold text-xs text-amber-300">
              {userState.streakDays}d
            </span>
          </div>

          {/* ELO Rank Badge */}
          <div 
            className="hidden md:flex items-center gap-2 px-3 py-1 rounded-xl bg-[#0E1628]/80 border border-white/[0.08] shadow-sm"
            style={{ borderColor: `${rank.badgeColor}35` }}
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

          {/* Arena Tickets Meter */}
          <div 
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#0E1628]/80 border border-white/[0.08] hover:border-indigo-500/40 transition-all shadow-sm"
            title={t.arenaTickets}
          >
            <Ticket className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-mono font-bold text-xs text-indigo-300">
              {userState.isPro ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <span>∞</span>
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">PRO</span>
                </span>
              ) : (
                <span>{userState.arenaTickets}/{userState.maxTickets}</span>
              )}
            </span>
          </div>

          {/* DEFCON Live 0xBreach Button */}
          <button
            onClick={() => {
              sound.playTap();
              onOpenDailyBreach?.();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-red-950/60 via-amber-950/40 to-red-950/60 border border-red-500/40 hover:border-amber-400 text-amber-300 font-mono text-[11px] font-bold transition-all shadow-sm active:scale-95 animate-pulse cursor-pointer"
            title="Daily 0xBreach: Solve today's live CVE incident"
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
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#0E1628]/80 border border-white/[0.08] hover:border-indigo-400/50 text-slate-300 hover:text-indigo-300 font-mono text-[11px] transition-colors cursor-pointer"
            title="Cyber Arsenal: HUD Themes & Custom Titles"
          >
            <Palette className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden lg:inline">ARSENAL</span>
          </button>

          {/* Audio Synthesizer Mute Toggle */}
          <button
            onClick={handleToggleSound}
            className="p-1.5 rounded-xl bg-[#0E1628]/80 border border-white/[0.08] text-slate-400 hover:text-white hover:border-white/20 transition-all cursor-pointer"
            title={t.soundToggle}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-red-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>

          {/* PRO Status Badge vs Upgrade CTA */}
          {userState.isPro ? (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gradient-to-r from-emerald-500/15 to-indigo-500/15 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] sm:text-[11px] font-mono font-bold text-emerald-300 uppercase tracking-wider">
                {t.proActiveBadge}
              </span>
            </div>
          ) : (
            <button
              onClick={() => {
                sound.playTap();
                onOpenPaywall();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-mono font-extrabold text-xs transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] transform active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t.tryPro}</span>
            </button>
          )}

          {/* Operator Auth / Account Profile Button */}
          <button
            onClick={() => {
              sound.playTap();
              onOpenAuth?.();
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-mono text-[11px] border transition-all cursor-pointer shadow-sm ${
              userState.isLoggedIn
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:border-emerald-400'
                : 'bg-[#0E1628]/80 border-white/[0.08] text-slate-300 hover:text-white hover:border-emerald-500/40'
            }`}
            title={userState.isLoggedIn ? `Operator: ${userState.username}` : t.logInNav}
          >
            {userState.isLoggedIn ? (
              <>
                <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="font-bold truncate max-w-[110px]">{userState.username}</span>
              </>
            ) : (
              <>
                <LogIn className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-bold">{t.logInNav}</span>
              </>
            )}
          </button>

          {/* Dev Quick Controls (God Mode Protected) */}
          {isGodMode && (
            <div className="flex items-center gap-1 pl-1 border-l border-white/10">
              <button
                onClick={() => {
                  sound.playTap();
                  onTogglePro();
                }}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg border font-mono text-[10px] transition-all cursor-pointer ${
                  userState.isPro 
                    ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40' 
                    : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-emerald-500/40'
                }`}
                title="God Mode: Toggle instant PRO unlock"
              >
                <Terminal className="w-3 h-3 text-emerald-400" />
                <span className="font-bold">{userState.isPro ? 'PRO' : 'FREE'}</span>
              </button>

              <button
                onClick={() => {
                  sound.playTap();
                  if (window.confirm('Reset local demo progress and restart Diagnostic Onboarding?')) {
                    onResetData();
                  }
                }}
                className="p-1 rounded-lg border border-white/10 bg-[#0E1628] text-slate-400 hover:text-red-400 hover:border-red-500/30 transition-colors cursor-pointer"
                title="God Mode: Reset demo data"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
