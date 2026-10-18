import React, { useState, useEffect } from 'react';
import { UserState, LeagueHacker } from '../../types';
import { getRankFromElo } from '../../data/ranks';
import { sound } from '../../utils/soundEngine';
import { 
  Trophy, Flame, Sparkles, ArrowUp, ArrowDown, 
  Zap, Crown, Clock, Users 
} from 'lucide-react';

interface LeagueTabProps {
  userState: UserState;
  onOpenPaywall: (context: 'xp_boost_shield') => void;
}

export const LeagueTab: React.FC<LeagueTabProps> = ({
  userState,
  onOpenPaywall
}) => {
  const userRank = getRankFromElo(userState.elo);

  // Generate 14 simulated league competitors around user's XP
  const [hackers, setHackers] = useState<LeagueHacker[]>([]);

  useEffect(() => {
    const mockHackerProfiles = [
      { name: '0x_V0rtex', avatar: 'VX', streak: 7, baseDiff: 240 },
      { name: 'K3rnel_Crush3r', avatar: 'KC', streak: 5, baseDiff: 180 },
      { name: 'syn_flood_99', avatar: 'SF', streak: 4, baseDiff: 120 },
      { name: 'b4sh_pwn3r', avatar: 'BP', streak: 6, baseDiff: 70 },
      { name: 'cyber_samurai', avatar: 'CS', streak: 3, baseDiff: 25 },
      // User will be inserted here dynamically based on XP
      { name: 'spectre_v4', avatar: 'SP', streak: 2, baseDiff: -40 },
      { name: 'null_byte_ninja', avatar: 'NB', streak: 4, baseDiff: -95 },
      { name: 'packet_chaser', avatar: 'PC', streak: 2, baseDiff: -150 },
      { name: 'sudo_su_root', avatar: 'SR', streak: 1, baseDiff: -210 },
      { name: 'crypto_ghost', avatar: 'CG', streak: 3, baseDiff: -280 },
      { name: 'buffer_overflow', avatar: 'BO', streak: 0, baseDiff: -360 },
      { name: 'wireshark_sniff', avatar: 'WS', streak: 1, baseDiff: -440 },
      { name: 'reverse_eng_0', avatar: 'RE', streak: 0, baseDiff: -510 },
      { name: 'script_k1d_x', avatar: 'SK', streak: 0, baseDiff: -600 }
    ];

    const currentXp = userState.xp;

    const list: { username: string; avatar: string; xp: number; isUser: boolean; winStreak: number }[] = [
      {
        username: userState.username,
        avatar: userState.username.slice(0, 2).toUpperCase(),
        xp: currentXp,
        isUser: true,
        winStreak: userState.winStreak
      },
      ...mockHackerProfiles.map(p => ({
        username: p.name,
        avatar: p.avatar,
        xp: Math.max(100, currentXp + p.baseDiff),
        isUser: false,
        winStreak: p.streak
      }))
    ];

    // Sort descending by XP
    list.sort((a, b) => b.xp - a.xp);

    const formatted: LeagueHacker[] = list.map((item, index) => {
      const position = index + 1;
      let status: 'promoted' | 'safe' | 'demoted' = 'safe';
      if (position <= 3) status = 'promoted';
      else if (position >= 13) status = 'demoted';

      return {
        rankPosition: position,
        username: item.username,
        avatar: item.avatar,
        tier: userRank.tier,
        xp: item.xp,
        isUser: item.isUser,
        winStreak: item.winStreak,
        status
      };
    });

    setHackers(formatted);
  }, [userState.xp, userState.username, userRank.tier, userState.winStreak]);

  const userHacker = hackers.find(h => h.isUser);
  const userPosition = userHacker ? userHacker.rankPosition : 6;

  return (
    <div className="w-full max-w-3xl mx-auto px-3 sm:px-6 py-6 pb-32 space-y-7 animate-fade-in">
      {/* League Header Card */}
      <div className="rounded-3xl bg-[#0B1120]/90 border border-indigo-500/30 p-6 sm:p-7 shadow-[0_15px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-bold flex items-center gap-1.5 shadow-sm">
            <Trophy className="w-3.5 h-3.5" />
            WEEKLY COMPETITIVE LEAGUE
          </span>
          <span className="text-xs font-mono text-amber-400 flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 font-bold">
            <Clock className="w-3.5 h-3.5" />
            Ends in: 2d 14h
          </span>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              {userRank.tier} League
              <Crown className="w-6 h-6 text-amber-400" />
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
              Top 3 advance to the higher league. Bottom 3 are demoted to the lower tier.
            </p>
          </div>
          <div className="text-right font-mono bg-[#060A12]/80 px-4 py-2.5 rounded-2xl border border-white/10 shadow-inner shrink-0">
            <span className="text-[10px] text-slate-400 block font-bold">YOUR RANK</span>
            <span className={`text-2xl font-black ${userPosition <= 3 ? 'text-emerald-400' : userPosition >= 13 ? 'text-red-400' : 'text-indigo-400'}`}>
              #{userPosition} <span className="text-xs text-slate-400 font-normal">/ 15</span>
            </span>
          </div>
        </div>
      </div>

      {/* Trigger Paywall 5: 2x XP Multiplier & Demotion Shield Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-indigo-500/10 border border-amber-500/30 p-5 sm:p-6 shadow-[0_15px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 shadow-sm">
            <Zap className="w-6 h-6 fill-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm sm:text-base text-white">
                Activate 2x XP Multiplier & Shield
              </h3>
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                PRO FEATURE
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              Doubles XP on every exploit and shields against demotion even if you are inactive for 2 days.
            </p>
          </div>
        </div>

        {userState.isPro ? (
          <div className="w-full sm:w-auto px-5 py-3 rounded-xl font-mono font-bold text-xs text-emerald-300 bg-emerald-500/15 border border-emerald-500/40 shrink-0 flex items-center justify-center gap-2 shadow-sm">
            <Zap className="w-4 h-4 fill-emerald-400 text-emerald-400" />
            <span>2X XP ACTIVE (PERMANENT PRO)</span>
          </div>
        ) : (
          <button
            onClick={() => {
              sound.playTap();
              onOpenPaywall('xp_boost_shield');
            }}
            className="w-full sm:w-auto px-5 py-3 rounded-xl font-mono font-extrabold text-xs text-slate-950 bg-gradient-to-r from-amber-400 to-emerald-400 hover:from-amber-300 hover:to-emerald-300 shadow-neon-emerald shrink-0 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
            <span>ACTIVATE 2x XP WITH PRO</span>
          </button>
        )}
      </div>

      {/* Leaderboard Table */}
      <div className="rounded-3xl bg-[#0B1120]/90 border border-white/10 overflow-hidden shadow-[0_15px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        {/* Table Legend */}
        <div className="bg-[#060A12]/80 px-5 py-3 border-b border-white/10 flex items-center justify-between text-xs font-mono text-slate-400">
          <span className="flex items-center gap-2 font-bold text-slate-300">
            <Users className="w-4 h-4 text-indigo-400" /> HACKER LEADERBOARD ({hackers.length} OPERATORS)
          </span>
          <span className="text-[11px]">WEEKLY XP SCORE</span>
        </div>

        <div className="divide-y divide-white/5">
          {hackers.map((hacker) => {
            const isTop3 = hacker.rankPosition <= 3;
            const isBottom3 = hacker.rankPosition >= 13;

            let rowStyle = 'hover:bg-white/5';
            if (hacker.isUser) {
              rowStyle = 'bg-emerald-950/40 border-l-4 border-emerald-400';
            } else if (isTop3) {
              rowStyle = 'bg-emerald-950/15';
            } else if (isBottom3) {
              rowStyle = 'bg-red-950/15';
            }

            return (
              <div
                key={hacker.username}
                className={`px-4 py-3 flex items-center justify-between transition-colors ${rowStyle}`}
              >
                {/* Left: Position & Avatar & Username */}
                <div className="flex items-center gap-3">
                  {/* Position number */}
                  <span className={`w-6 font-mono font-bold text-center text-xs ${
                    hacker.rankPosition === 1 
                      ? 'text-amber-400' 
                      : hacker.rankPosition === 2 
                      ? 'text-slate-300' 
                      : hacker.rankPosition === 3 
                      ? 'text-amber-600' 
                      : 'text-slate-500'
                  }`}>
                    {`#${hacker.rankPosition < 10 ? '0' + hacker.rankPosition : hacker.rankPosition}`}
                  </span>

                  {/* Avatar icon */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm border ${
                    hacker.isUser ? 'bg-emerald-500/20 border-emerald-500/50' : 'bg-slate-800 border-white/10'
                  }`}>
                    {hacker.avatar}
                  </div>

                  {/* Username & Status badge */}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className={`font-mono text-xs font-bold ${hacker.isUser ? 'text-emerald-400' : 'text-slate-200'}`}>
                        {hacker.username}
                      </span>
                      {hacker.isUser && (
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/40">
                          YOU
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                      <Flame className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                      <span>{hacker.winStreak} win streak</span>
                    </div>
                  </div>
                </div>

                {/* Right: XP Score & Promotion/Demotion Indicator */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="font-mono font-bold text-xs text-white block">
                      {hacker.xp} XP
                    </span>
                    {isTop3 && (
                      <span className="text-[9px] font-mono text-emerald-400 flex items-center justify-end gap-0.5">
                        <ArrowUp className="w-2.5 h-2.5" /> PROMOTION
                      </span>
                    )}
                    {isBottom3 && (
                      <span className="text-[9px] font-mono text-red-400 flex items-center justify-end gap-0.5">
                        <ArrowDown className="w-2.5 h-2.5" /> DEMOTION
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Zone Legend */}
        <div className="bg-[#060A12]/80 px-5 py-3.5 border-t border-white/10 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 gap-2">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <span>Top 3: Promoted to {userRank.tier === 'ZeroDay Hunter' ? 'Apex' : 'Higher'} League</span>
          </div>
          <div className="flex items-center gap-2 text-red-400 font-semibold">
            <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
            <span>Bottom 3: Demotion Zone</span>
          </div>
        </div>
      </div>
    </div>
  );
};
