import React, { useState, useEffect } from 'react';
import { UserState, LeagueHacker } from '../../types';
import { getRankFromElo } from '../../data/ranks';
import { sound } from '../../utils/soundEngine';
import { useLanguage } from '../../utils/language';
import { 
  Trophy, Sparkles, ArrowUp, ArrowDown, 
  Zap, Crown, Clock, Users, Globe, Wifi, Radio
} from 'lucide-react';
import { checkNetworkTelemetry, NetworkTelemetry, fetchRankedLeaderboard } from '../../utils/cloudSync';

interface LeagueTabProps {
  userState: UserState;
  onOpenPaywall: (context: 'xp_boost_shield') => void;
}

export const LeagueTab: React.FC<LeagueTabProps> = ({
  userState,
  onOpenPaywall
}) => {
  const { lang } = useLanguage();
  const isEn = lang === 'en';
  const userRank = getRankFromElo(userState.elo);

  // Live Online Telemetry
  const [telemetry, setTelemetry] = useState<NetworkTelemetry>({
    isOnline: true,
    pingMs: 24,
    activeOperators: 340,
    region: 'EU-CENTRAL',
    lastSyncAt: Date.now()
  });

  useEffect(() => {
    checkNetworkTelemetry().then(setTelemetry).catch(() => {});
    const interval = setInterval(() => {
      checkNetworkTelemetry().then(setTelemetry).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Real accounts only — strictly zero mock/fake bot profiles
  const [hackers, setHackers] = useState<LeagueHacker[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    fetchRankedLeaderboard().then(entries => {
      if (!isMounted) return;

      const currentUsername = userState.username;
      const currentXp = userState.xp || 0;
      const currentElo = userState.elo ?? 100;

      // Ensure user is present in leaderboard
      const hasUser = entries.some(e => e.username.toLowerCase() === currentUsername.toLowerCase() || e.isCurrentUser);

      const combined = [...entries];
      if (!hasUser) {
        combined.push({
          rank: combined.length + 1,
          username: currentUsername,
          avatar: (currentUsername.slice(0, 2) || 'OP').toUpperCase(),
          elo: currentElo,
          xp: currentXp,
          division: userRank.tier,
          winStreak: userState.winStreak || 0,
          isOnline: true,
          isCurrentUser: true
        });
      }

      // Sort descending by ELO, then XP
      combined.sort((a, b) => {
        if (b.elo !== a.elo) return b.elo - a.elo;
        return b.xp - a.xp;
      });

      const formatted: LeagueHacker[] = combined.map((item, index) => {
        const position = index + 1;
        let status: 'promoted' | 'safe' | 'demoted' = 'safe';
        if (position <= 3) status = 'promoted';
        else if (position >= Math.max(10, combined.length - 2)) status = 'demoted';

        const isUser = item.isCurrentUser || item.username.toLowerCase() === currentUsername.toLowerCase();
        const itemTier = getRankFromElo(item.elo).tier;

        return {
          rankPosition: position,
          username: item.username,
          avatar: item.avatar,
          tier: itemTier,
          xp: item.xp,
          isUser,
          winStreak: isUser ? (userState.winStreak || 0) : item.winStreak,
          status
        };
      });

      setHackers(formatted);
      setIsLoading(false);
    }).catch(err => {
      console.warn('[LeagueTab] Error loading real accounts:', err);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [userState.xp, userState.username, userRank.tier, userState.winStreak, userState.elo]);

  const userHacker = hackers.find(h => h.isUser);
  const userPosition = userHacker ? userHacker.rankPosition : 6;

  return (
    <div className="w-full max-w-xl mx-auto space-y-4 font-sans">
      {/* Real-time Network Telemetry Status */}
      <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs font-mono shadow-sm">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10B981]" />
          <span className="text-zinc-300 font-bold">GRID ONLINE</span>
          <span className="text-zinc-600">·</span>
          <span className="text-emerald-400 font-bold">{telemetry.activeOperators} {isEn ? 'Operators Active' : 'Operatori Attivi'}</span>
        </div>
        <div className="text-zinc-400 text-[11px] flex items-center gap-1.5">
          <Wifi className="w-3 h-3 text-emerald-400" />
          <span>{telemetry.pingMs}ms</span>
          <span className="text-zinc-600 hidden sm:inline">|</span>
          <span className="text-zinc-400 hidden sm:inline">{telemetry.region}</span>
        </div>
      </div>

      {/* League Header Card */}
      <div className="rounded-2xl bg-[#0D121D] border border-zinc-800 p-5 space-y-3 shadow-md">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 font-bold flex items-center gap-1.5 uppercase">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            {isEn ? 'WEEKLY LEAGUE' : 'LEGA SETTIMANALE'}
          </span>
          <span className="text-xs font-mono text-zinc-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {isEn ? 'Ends in: 2d 14h' : 'Termina tra: 2g 14h'}
          </span>
        </div>

        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              {isEn ? `Division: ${userRank.tier}` : `Divisione: ${userRank.tier}`}
              <Crown className="w-4 h-4 text-amber-400" />
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              {isEn 
                ? 'Top 3 advance to the higher tier. Bottom 3 are relegated.' 
                : 'I primi 3 avanzano alla lega superiore. Gli ultimi 3 retrocedono.'}
            </p>
          </div>
          <div className="text-right font-mono">
            <span className="text-[10px] text-zinc-400 block">{isEn ? 'YOUR RANK' : 'TUA POSIZIONE'}</span>
            <span className={`text-xl font-black ${userPosition <= 3 ? 'text-emerald-400' : userPosition >= 13 ? 'text-rose-400' : 'text-zinc-200'}`}>
              #{userPosition} <span className="text-xs text-zinc-400 font-normal">/ {hackers.length}</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2x XP Multiplier & Demotion Shield Banner */}
      <div className="rounded-2xl bg-[#0D121D] border border-zinc-800 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-700 text-amber-400 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 fill-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-xs sm:text-sm text-white">
                {isEn ? '2x XP Multiplier & Shield' : 'Attiva 2x XP Multiplier & Shield'}
              </h3>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {isEn 
                ? 'Double XP on every challenge and block demotion when offline.'
                : 'Raddoppia gli XP di ogni test e blocca la retrocessione.'}
            </p>
          </div>
        </div>

        {userState.isPro ? (
          <div className="w-full sm:w-auto px-3.5 py-2 rounded-xl font-mono font-bold text-xs text-emerald-400 bg-zinc-900 border border-emerald-500/30 shrink-0 flex items-center justify-center gap-1.5">
            <Zap className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
            <span>2X XP {isEn ? 'ACTIVE' : 'ATTIVO'}</span>
          </div>
        ) : (
          <button
            onClick={() => {
              sound.playTap();
              onOpenPaywall('xp_boost_shield');
            }}
            className="w-full sm:w-auto px-4 py-2 rounded-xl font-mono font-bold text-xs text-zinc-950 bg-emerald-500 hover:bg-emerald-400 shrink-0 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 fill-zinc-950" />
            <span>{isEn ? 'UNLOCK 2X XP' : 'ATTIVA 2X XP'}</span>
          </button>
        )}
      </div>

      {/* Leaderboard Table */}
      <div className="bg-[#0D121D] border border-zinc-800 rounded-2xl overflow-hidden shadow-md">
        {/* Table Legend */}
        <div className="bg-zinc-950 px-3.5 py-2 border-b border-zinc-800 flex items-center justify-between text-[10px] font-mono text-zinc-400">
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-zinc-400" /> {isEn ? `OPERATORS (${hackers.length})` : `OPERATORI (${hackers.length})`}
          </span>
          <span>{isEn ? 'WEEKLY XP' : 'XP SETTIMANALI'}</span>
        </div>

        <div className="divide-y divide-zinc-800/80">
          {hackers.map((hacker) => {
            const isTop3 = hacker.rankPosition <= 3;
            const isBottom3 = hackers.length > 5 && hacker.rankPosition > hackers.length - 3;

            return (
              <div
                key={hacker.username}
                className={`px-3.5 py-2.5 flex items-center justify-between transition-colors ${
                  hacker.isUser
                    ? 'bg-emerald-500/10 border-l-2 border-emerald-400'
                    : isTop3
                    ? 'hover:bg-zinc-900/60'
                    : isBottom3
                    ? 'hover:bg-rose-950/20'
                    : 'hover:bg-zinc-900/40'
                }`}
              >
                {/* Left: Position, Avatar, Name */}
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-5 font-mono font-bold text-xs text-center shrink-0 ${
                    hacker.rankPosition === 1 ? 'text-amber-400' :
                    hacker.rankPosition === 2 ? 'text-zinc-300' :
                    hacker.rankPosition === 3 ? 'text-amber-600' :
                    isBottom3 ? 'text-rose-400' : 'text-zinc-500'
                  }`}>
                    {hacker.rankPosition}
                  </span>

                  <div className={`w-7 h-7 rounded-lg font-mono font-bold text-xs flex items-center justify-center shrink-0 border ${
                    hacker.isUser
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      : 'bg-zinc-900 text-zinc-300 border-zinc-800'
                  }`}>
                    {hacker.avatar}
                  </div>

                  <div className="min-w-0">
                    <span className={`font-mono text-xs font-bold truncate flex items-center gap-1.5 ${
                      hacker.isUser ? 'text-emerald-400' : 'text-zinc-200'
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_5px_#10B981]" />
                      <span className="truncate">{hacker.username} {hacker.isUser && (isEn ? '(You)' : '(Tu)')}</span>
                    </span>
                    <div className="text-[10px] font-mono text-zinc-400 pl-3">
                      <span>x{hacker.winStreak} streak</span>
                    </div>
                  </div>
                </div>

                {/* Right: XP Score & Promotion/Demotion Indicator */}
                <div className="flex items-center gap-2">
                  <div className="text-right font-mono">
                    <span className="font-bold text-xs text-white block">
                      {hacker.xp} XP
                    </span>
                    {isTop3 && (
                      <span className="text-[9px] text-emerald-400 flex items-center justify-end gap-0.5">
                        <ArrowUp className="w-2.5 h-2.5" /> {isEn ? 'PROMOTION' : 'PROMOZIONE'}
                      </span>
                    )}
                    {isBottom3 && (
                      <span className="text-[9px] text-rose-400 flex items-center justify-end gap-0.5">
                        <ArrowDown className="w-2.5 h-2.5" /> {isEn ? 'RELEGATION' : 'RETROCESSIONE'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Zone Legend */}
        <div className="bg-zinc-950 p-2.5 border-t border-zinc-800 flex flex-wrap items-center justify-between text-[10px] font-mono text-zinc-400 gap-2">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{isEn ? 'Top 3: Promoted to Higher League' : 'Top 3: Promozione alla Lega Superiore'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-rose-400">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span>{isEn ? 'Bottom 3: Demotion Zone' : 'Ultimi 3: Zona Retrocessione'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
