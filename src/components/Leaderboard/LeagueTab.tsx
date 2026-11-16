import { computeCohortPercentile } from '../../utils/cohort';
export { computeCohortPercentile };

import React, { useState, useEffect } from 'react';
import { UserState, LeagueHacker } from '../../types';
import { getRankFromElo } from '../../data/ranks';
import { sound } from '../../utils/soundEngine';
import { useLanguage } from '../../utils/language';
import { 
  Trophy, Sparkles, Zap, Crown, Clock, Users, Globe, Wifi, Radio,
  Award, ShieldCheck
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

  // Real accounts only — queries Supabase public_profiles view
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
        const isUser = item.isCurrentUser || item.username.toLowerCase() === currentUsername.toLowerCase();
        const itemTier = getRankFromElo(item.elo).tier;

        return {
          rankPosition: position,
          username: item.username,
          avatar: item.avatar,
          tier: itemTier,
          xp: item.xp,
          elo: item.elo,
          isUser,
          winStreak: isUser ? (userState.winStreak || 0) : item.winStreak,
          status: 'safe'
        };
      });

      setHackers(formatted);
      setIsLoading(false);
    }).catch(err => {
      console.warn('[LeagueTab] Error loading real accounts from public_profiles:', err);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [userState.xp, userState.username, userRank.tier, userState.winStreak, userState.elo]);

  const userHacker = hackers.find(h => h.isUser);
  const userPosition = userHacker ? userHacker.rankPosition : 1;

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
        <div className="text-zinc-400 flex items-center gap-2 text-[11px]">
          <span>{telemetry.region}</span>
          <span className="text-zinc-600">·</span>
          <span className="text-emerald-400">{telemetry.pingMs}ms</span>
        </div>
      </div>

      {/* Division Banner & Live Standing */}
      <div className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-4 space-y-3 shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-emerald-400 tracking-wider">
            {isEn ? 'RANKED LEAGUE' : 'LEGA CLASSIFICATA'}
          </span>
          <span className="text-xs font-mono text-zinc-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isEn ? 'Live Database Standing' : 'Classifica Live Database'}</span>
          </span>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div>
            <div className="text-xl font-black text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <span>{userRank.tier}</span>
            </div>
            <div className="text-xs font-mono text-zinc-400 mt-0.5">
              {isEn ? 'Global Standing:' : 'Posizione Globale:'} <span className="text-white font-bold">#{userPosition}</span> / {hackers.length}
            </div>
          </div>
          <div className="text-right">
            <span className="text-lg font-mono font-black text-emerald-400 block">
              {userState.elo} ELO
            </span>
            <span className="text-[10px] font-mono text-zinc-400">
              {userState.xp} XP
            </span>
          </div>
        </div>

        {/* Peer Cohort Percentile Mirror (Percentile among real verified accounts - minimum 50 active operators) */}
        {computeCohortPercentile(userPosition, hackers.length) !== null && (
          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-400">
              {isEn ? 'Cohort Standing (Real Accounts):' : 'Specchio Coorte (Account Reali):'}
            </span>
            <span className="text-emerald-400 font-bold">
              {`Top ${computeCohortPercentile(userPosition, hackers.length)}% in ${telemetry.region}`}
            </span>
          </div>
        )}
      </div>

      {/* Permanent Status & Season Honors */}
      {((userState.leagueHistory && userState.leagueHistory.length > 0) || (userState.earnedTitles && userState.earnedTitles.length > 0)) && (
        <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-3.5 space-y-2 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-amber-400 font-bold">
            <Award className="w-4 h-4" />
            <span>{isEn ? 'PERMANENT OPERATIONAL HONORS' : 'ONORIFICENZE PERMANENTI'}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {userState.earnedTitles?.map(title => (
              <span key={title} className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 text-[11px]">
                🎖 {title}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Privacy & Anti-Cheat Safeguards Banner */}
      <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-zinc-900/50 border border-zinc-800 text-[11px] font-mono text-zinc-400">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          {isEn ? 'Pseudonymous Callsigns · Anti-Cheat Audited' : 'Callsign Pseudonimi · Verificato Anti-Cheat'}
        </span>
        <span className="text-zinc-500">GDPR Compliant</span>
      </div>

      {/* 2x XP Multiplier & Demotion Shield Banner */}
      {!userState.isPro && (
        <button
          onClick={() => {
            sound.playTap();
            onOpenPaywall('xp_boost_shield');
          }}
          className="w-full text-left rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-3 flex items-center justify-between hover:border-amber-500/50 transition-colors group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-mono font-bold text-amber-300 flex items-center gap-1">
                <span>{isEn ? 'ZERO-DAY PRO LICENSE' : 'LICENZA ZERO-DAY PRO'}</span>
                <Sparkles className="w-3 h-3 text-amber-400" />
              </div>
              <div className="text-[11px] font-mono text-zinc-400">
                {isEn ? 'Unlock 2x XP Multiplier & Permanent Demotion Shield' : 'Sblocca moltiplicatore 2x XP e Scudo Permanente'}
              </div>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-amber-400 group-hover:translate-x-0.5 transition-transform">
            &rarr;
          </span>
        </button>
      )}

      {/* Leaderboard Table */}
      <div className="bg-[#0D121D] border border-zinc-800 rounded-2xl overflow-hidden shadow-md">
        {/* Table Legend */}
        <div className="bg-zinc-950 px-3.5 py-2 border-b border-zinc-800 flex items-center justify-between text-[10px] font-mono text-zinc-400">
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-zinc-400" /> {isEn ? `OPERATORS (${hackers.length})` : `OPERATORI (${hackers.length})`}
          </span>
          <span>{isEn ? 'RANKED XP / ELO' : 'XP / ELO CLASSIFICATA'}</span>
        </div>

        <div className="divide-y divide-zinc-800/80">
          {isLoading ? (
            <div className="p-6 text-center text-zinc-500 font-mono text-xs">
              {isEn ? 'Synchronizing encrypted telemetry...' : 'Sincronizzazione telemetria cifrata...'}
            </div>
          ) : hackers.map((hacker) => {
            const isTop3 = hacker.rankPosition <= 3;

            return (
              <div
                key={hacker.username}
                className={`px-3.5 py-2.5 flex items-center justify-between transition-colors ${
                  hacker.isUser
                    ? 'bg-emerald-500/10 border-l-2 border-emerald-400'
                    : isTop3
                    ? 'hover:bg-zinc-900/60'
                    : 'hover:bg-zinc-900/40'
                }`}
              >
                {/* Left: Position, Avatar, Name */}
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-5 font-mono font-bold text-xs text-center shrink-0 ${
                    hacker.rankPosition === 1 ? 'text-amber-400' :
                    hacker.rankPosition === 2 ? 'text-zinc-300' :
                    hacker.rankPosition === 3 ? 'text-amber-600' : 'text-zinc-500'
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
                      <span>{hacker.tier} · x{hacker.winStreak} streak</span>
                    </div>
                  </div>
                </div>

                {/* Right: XP Score */}
                <div className="flex items-center gap-2">
                  <div className="text-right font-mono">
                    <span className="font-bold text-xs text-white block">
                      {hacker.elo} ELO
                    </span>
                    <span className="text-[10px] text-zinc-400 block">
                      {hacker.xp} XP
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
