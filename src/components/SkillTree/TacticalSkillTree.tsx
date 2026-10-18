import React, { useState } from 'react';
import { SKILL_MODULES } from '../../data/curriculum';
import { SkillNode, UserState } from '../../types';
import { sound } from '../../utils/soundEngine';
import { 
  Lock, CheckCircle2, Play, 
  Sparkles, ChevronDown, ChevronUp, 
  Shield, Gift, Check, ArrowRight,
  Terminal, Zap
} from 'lucide-react';

interface TacticalSkillTreeProps {
  userState: UserState;
  onSelectNode: (node: SkillNode) => void;
  onOpenPaywall: () => void;
  onOpenPaywallContext: (context: 'bounty_crate_lock' | 'manual_upgrade') => void;
  onClaimFreeBounty: (bountyId: string) => void;
  onClaimProBounty: (bountyId: string) => void;
}

export const TacticalSkillTree: React.FC<TacticalSkillTreeProps> = ({
  userState,
  onSelectNode,
  onOpenPaywall,
  onOpenPaywallContext,
  onClaimFreeBounty,
  onClaimProBounty
}) => {
  const [bountiesExpanded, setBountiesExpanded] = useState<boolean>(true);

  return (
    <div className="w-full max-w-3xl mx-auto px-2.5 sm:px-6 py-3 sm:py-6 pb-24 sm:pb-32 space-y-4 sm:space-y-7">
      {/* ============================================================== */}
      {/* MISSION CONTROL HERO HEADER */}
      {/* ============================================================== */}
      <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#0B1222] to-[#070C18] border border-white/10 p-3.5 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.12)] overflow-hidden">
        {/* Ambient atmospheric glows */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 sm:gap-5 relative z-10">
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-[9px] sm:text-[10px] font-mono px-2 py-0.2 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                ACTIVE_CAMPAIGN // V2.5
              </span>
              <span className="text-[11px] sm:text-xs text-slate-400 font-mono">
                CompTIA Security+ · CCNA · CEH
              </span>
              {/* Cyber Streak Shield Indicator */}
              <div 
                className={`flex items-center gap-1 px-2 py-0.2 rounded-full text-[9px] sm:text-[10px] font-mono font-bold border transition-all ${
                  userState.streakShieldActive
                    ? 'bg-cyan-950/60 text-cyan-300 border-cyan-400/40 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                    : 'bg-slate-900/60 text-slate-400 border-slate-700'
                }`}
                title="Daily anti-loss streak protection"
              >
                <Shield className="w-3 h-3 text-cyan-400" />
                <span>{userState.streakShieldActive ? 'CYBER SHIELD ACTIVE' : 'SHIELD OFF'}</span>
              </div>
            </div>

            <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight">
              Tactical Skill Tree
            </h1>
            <p className="text-[11px] sm:text-sm text-slate-300 max-w-lg leading-snug">
              Operational modular campaign. Complete terminal labs, spot zero-day bugs in source code, and calibrate your cyber readiness.
            </p>
          </div>

          {/* Exam Readiness Gauge Metric */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5 shrink-0">
            <div className="text-left sm:text-right">
              <span className="text-[9px] sm:text-[10px] font-mono text-slate-400 uppercase tracking-widest block">EXAM READINESS</span>
              <span className="text-2xl sm:text-4xl font-mono font-black text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.4)]">
                {userState.readinessScore}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* DAILY BUG BOUNTY CONTRACTS PANEL */}
      {/* ============================================================== */}
      <div className="rounded-2xl sm:rounded-3xl bg-[#0B1120]/90 border border-white/10 p-3.5 sm:p-6 shadow-[0_15px_40px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.2)] shrink-0">
              <Gift className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="font-bold text-xs sm:text-base text-white flex items-center gap-1.5 sm:gap-2">
                Daily Bug Bounty Contracts
                <span className="text-[8px] sm:text-[9px] font-mono px-1.5 py-0.2 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold uppercase">
                  3 ACTIVE
                </span>
              </h2>
              <span className="text-[11px] text-slate-400 font-mono">
                Encrypted daily drops · Resets at midnight UTC
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playTap();
              setBountiesExpanded(!bountiesExpanded);
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            {bountiesExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {bountiesExpanded && (
          <div className="space-y-3.5 pt-1 animate-fade-in">
            {userState.dailyBounties.map((bounty) => {
              const isMissionDone = Boolean(bounty.isCompleted) && (bounty.progress >= bounty.target) && (bounty.progress > 0);

              return (
                <div 
                  key={bounty.id}
                  className={`p-4 rounded-2xl border transition-all duration-300 ${
                    isMissionDone 
                      ? 'bg-gradient-to-br from-[#0B1526] to-[#070E1B] border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)]' 
                      : 'bg-[#080D17]/70 border-white/[0.06] hover:border-white/15'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs sm:text-sm text-white">
                          {bounty.title}
                        </span>
                        {isMissionDone && (
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1">
                            <Check className="w-3 h-3" /> COMPLETE
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        {bounty.description}
                      </p>
                    </div>

                    <span className="font-mono text-xs font-bold text-slate-300 shrink-0 bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                      {bounty.progress}/{bounty.target}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden mb-3.5 border border-white/5">
                    <div 
                      className={`h-full transition-all duration-500 ${isMissionDone ? 'bg-gradient-to-r from-emerald-400 to-teal-400 shadow-[0_0_10px_#10B981]' : 'bg-gradient-to-r from-indigo-500 to-cyan-500'}`}
                      style={{ width: `${Math.min(100, (bounty.progress / bounty.target) * 100)}%` }}
                    />
                  </div>

                  {/* Dual Loot Rewards (Free Reward + Encrypted PRO Bounty Crate) */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-white/5">
                    {/* Free Reward */}
                    <div className="flex items-center justify-between sm:justify-start gap-2 text-xs font-mono">
                      <span className="text-slate-400 text-[11px]">STANDARD REWARD:</span>
                      {bounty.freeClaimed ? (
                        <span className="text-emerald-400 flex items-center gap-1 font-bold">
                          <Check className="w-3.5 h-3.5" /> Claimed (+{bounty.freeXp} XP)
                        </span>
                      ) : !isMissionDone ? (
                        <span className="text-slate-500">
                          +{bounty.freeXp} XP (Locked)
                        </span>
                      ) : (
                        <button
                          onClick={() => onClaimFreeBounty(bounty.id)}
                          className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-sm transition-all active:scale-95 cursor-pointer"
                        >
                          CLAIM (+{bounty.freeXp} XP)
                        </button>
                      )}
                    </div>

                    {/* PRO Encrypted Bounty Crate */}
                    <div className="flex items-center justify-between sm:justify-end gap-2 text-xs font-mono">
                      <span className="text-amber-400 text-[11px] font-bold">PRO CRATE:</span>
                      {bounty.proClaimed ? (
                        <span className="text-emerald-400 flex items-center gap-1 font-bold">
                          <Check className="w-3.5 h-3.5" /> Unlocked (+{bounty.proXp} XP, +{bounty.proTickets} Tickets)
                        </span>
                      ) : !isMissionDone ? (
                        <span className="text-slate-500 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Complete Mission to Unlock
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            if (!userState.isPro) {
                              sound.playTap();
                              onOpenPaywallContext('bounty_crate_lock');
                            } else {
                              onClaimProBounty(bounty.id);
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-amber-500/20 border-amber-500/50 text-amber-300 hover:border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)] active:scale-95 animate-pulse cursor-pointer"
                          title="Mission complete! Unlock PRO crate"
                        >
                          {!userState.isPro ? (
                            <>
                              <Lock className="w-3.5 h-3.5 text-amber-400" />
                              <span>DECRYPT WITH PRO</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                              <span>OPEN PRO CRATE</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* CURRICULUM MODULES LIST */}
      {/* ============================================================== */}
      <div className="space-y-6 sm:space-y-12">
        {SKILL_MODULES.map((module, mIndex) => {
          return (
            <div key={module.id} className="relative">
              {/* Module Header Card */}
              <div className="rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#0F172A] to-[#0A101D] border border-white/10 p-3 sm:p-5 mb-4 sm:mb-8 flex items-center justify-between shadow-[0_8px_30px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.08)]">
                <div>
                  <span className="text-[9px] sm:text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold block mb-0.5">
                    {module.certificationFocus}
                  </span>
                  <h3 className="text-sm sm:text-xl font-bold text-white">
                    {module.title}
                  </h3>
                </div>
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#060A12] border border-white/10 flex items-center justify-center font-mono text-xs font-black text-emerald-400 shadow-inner shrink-0">
                  0{mIndex + 1}
                </div>
              </div>

              {/* Vertical Path Nodes */}
              <div className="relative flex flex-col items-center space-y-4 sm:space-y-8">
                {/* Vertical SVG connection line */}
                <div className="absolute top-4 bottom-4 w-1 bg-gradient-to-b from-emerald-500/40 via-indigo-500/30 to-slate-800 -z-0" />

                {module.nodes.map((node) => {
                  const isCompleted = userState.completedNodeIds.includes(node.id);
                  const isLocked = !isCompleted && node.status === 'locked' && !userState.isPro;

                  return (
                    <div 
                      key={node.id} 
                      className="relative z-10 w-full flex flex-col items-center"
                    >
                      {/* Interactive Node Button */}
                      <div
                        onClick={() => {
                          sound.playTap();
                          if (isLocked) {
                            onOpenPaywall();
                          } else {
                            onSelectNode(node);
                          }
                        }}
                        className={`cursor-pointer group relative w-full sm:w-[94%] p-3 sm:p-5 rounded-xl sm:rounded-2xl border transition-all duration-300 flex items-center gap-3 sm:gap-4 ${
                          isCompleted
                            ? 'bg-gradient-to-br from-[#0A1A22] to-[#061016] border-emerald-500/50 hover:border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2),inset_0_1px_0_0_rgba(16,185,129,0.3)]'
                            : isLocked
                            ? 'bg-[#0B101D]/60 border-white/[0.06] opacity-75 hover:opacity-100 hover:border-amber-500/40'
                            : 'bg-[#0E1628] border-white/10 hover:border-emerald-500/50 hover:shadow-[0_0_25px_rgba(16,185,129,0.25),inset_0_1px_0_0_rgba(255,255,255,0.12)]'
                        }`}
                      >
                        {/* Node Icon Geometric Pod */}
                        <div className={`w-13 h-13 rounded-2xl flex items-center justify-center shrink-0 border transition-transform duration-200 group-hover:scale-105 ${
                          isCompleted
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                            : isLocked
                            ? 'bg-slate-900 border-slate-700 text-slate-500'
                            : 'bg-indigo-500/20 border-indigo-500/60 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.3)]'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                          ) : isLocked ? (
                            <Lock className="w-5 h-5 text-amber-500/80" />
                          ) : (
                            <Play className="w-5 h-5 text-indigo-400 fill-indigo-400 ml-0.5" />
                          )}
                        </div>

                        {/* Node Description & Domain */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-white/5">
                              {node.domain}
                            </span>
                            {isCompleted && (
                              <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                                <Check className="w-3 h-3" /> COMPLETED
                              </span>
                            )}
                            {isLocked && (
                              <span className="text-[10px] font-mono text-amber-400 font-bold flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> PRO ONLY
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-sm sm:text-base text-white truncate group-hover:text-emerald-300 transition-colors">
                            {node.title}
                          </h4>
                          <p className="text-xs text-slate-400 truncate mt-0.5">
                            {node.subtitle}
                          </p>
                        </div>

                        {/* Rewards Pill */}
                        <div className="flex flex-col items-end shrink-0 font-mono text-right pl-2">
                          <span className="text-xs text-emerald-400 font-black">
                            +{node.xpReward} XP
                          </span>
                          <span className="text-[10px] text-slate-400">
                            +{node.eloReward} ELO
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TacticalSkillTree;
