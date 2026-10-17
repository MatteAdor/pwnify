import React, { useState } from 'react';
import { SKILL_MODULES } from '../../data/curriculum';
import { SkillNode, UserState } from '../../types';
import { sound } from '../../utils/soundEngine';
import { 
  Lock, CheckCircle2, Play, 
  Sparkles, ChevronDown, ChevronUp, 
  Shield, Gift, Box, Check 
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
    <div className="w-full max-w-2xl mx-auto px-4 py-6 pb-28 space-y-6">
      {/* Tactical Header Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-surface to-[#1B2640] border border-white/10 p-5 shadow-cyber-glass overflow-hidden">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                ACTIVE_CAMPAIGN
              </span>
              <span className="text-xs text-slate-400 font-mono">
                CompTIA Security+ · CCNA · CEH
              </span>
              {/* Cyber Streak Shield Indicator */}
              <div 
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                  userState.streakShieldActive
                    ? 'bg-cyan-950/70 text-cyan-300 border-cyan-400/50 shadow-sm'
                    : 'bg-slate-900/60 text-slate-400 border-slate-700'
                }`}
                title="Protezione Streak Giornaliera anticaduta"
              >
                <Shield className="w-3 h-3 text-cyan-400" />
                <span>{userState.streakShieldActive ? 'CYBER SHIELD ATTIVO' : 'SHIELD OFF'}</span>
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              Tactical Skill Tree
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-md">
              Progressione a moduli operativi. Completa i lab, trova i bug 0-day nei frammenti di codice e aumenta il tuo ELO.
            </p>
          </div>

          <div className="hidden sm:flex flex-col items-end text-right">
            <span className="text-[10px] font-mono text-slate-400">READINESS ESAME</span>
            <span className="text-2xl font-mono font-extrabold text-emerald-400">
              {userState.readinessScore}%
            </span>
          </div>
        </div>
      </div>

      {/* Daily Bug Bounty Contracts Panel */}
      <div className="rounded-2xl bg-surface border border-white/10 p-4 sm:p-5 shadow-cyber-glass">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
              <Gift className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white flex items-center gap-1.5">
                Daily Bug Bounty Contracts
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                  3 CONTRATTI
                </span>
              </h2>
              <span className="text-[10px] text-slate-400 font-mono">
                Si resettano ogni notte a mezzanotte
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playTap();
              setBountiesExpanded(!bountiesExpanded);
            }}
            className="p-1 rounded text-slate-400 hover:text-white"
          >
            {bountiesExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {bountiesExpanded && (
          <div className="space-y-3 pt-1 animate-fade-in">
            {userState.dailyBounties.map((bounty) => {
              const isMissionDone = Boolean(bounty.isCompleted) && (bounty.progress >= bounty.target) && (bounty.progress > 0);

              return (
                <div 
                  key={bounty.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isMissionDone 
                      ? 'bg-[#090D16] border-emerald-500/40' 
                      : 'bg-[#090D16]/60 border-white/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-white">
                          {bounty.title}
                        </span>
                        {isMissionDone && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30 flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5" /> OBIETTIVO RAGGIUNTO
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        {bounty.description}
                      </p>
                    </div>

                    <span className="font-mono text-xs font-bold text-slate-400 shrink-0">
                      {bounty.progress}/{bounty.target}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden mb-3">
                    <div 
                      className={`h-full transition-all duration-300 ${isMissionDone ? 'bg-emerald-400' : 'bg-indigo-500'}`}
                      style={{ width: `${Math.min(100, (bounty.progress / bounty.target) * 100)}%` }}
                    />
                  </div>

                  {/* Dual Loot Rewards (Free Reward + The Trap "Encrypted PRO Bounty Crate") */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1 border-t border-white/5">
                    {/* Free Reward */}
                    <div className="flex items-center justify-between sm:justify-start gap-2">
                      <span className="text-[10px] font-mono text-slate-400">TAGLIA FREE:</span>
                      {bounty.freeClaimed ? (
                        <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1 font-semibold">
                          <Check className="w-3 h-3 text-emerald-500" /> Riscattato (+{bounty.freeXp} XP)
                        </span>
                      ) : !isMissionDone ? (
                        <span 
                          className="px-2.5 py-1 rounded-md text-[10px] font-mono font-medium text-slate-500 bg-slate-900/90 border border-slate-800 flex items-center gap-1 cursor-not-allowed select-none"
                          title="Completa la missione per riscattare la taglia free"
                        >
                          <Lock className="w-2.5 h-2.5 text-slate-600" /> In Corso ({bounty.progress}/{bounty.target})
                        </span>
                      ) : (
                        <button
                          onClick={() => onClaimFreeBounty(bounty.id)}
                          className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-neon-emerald transition-all active:scale-95 animate-pulse cursor-pointer"
                        >
                          RISCATTA +{bounty.freeXp} XP
                        </button>
                      )}
                    </div>

                    {/* Encrypted PRO Bounty Crate: SBLOCCABILE SOLO DOPO AVER FATTO LA MISSIONE */}
                    <div className="flex items-center justify-between sm:justify-end gap-2">
                      <div className="flex items-center gap-1 text-[10px] font-mono font-bold">
                        <Box className={`w-3.5 h-3.5 ${isMissionDone ? 'text-amber-400 animate-bounce' : 'text-slate-600'}`} />
                        <span className={isMissionDone ? "text-amber-300" : "text-slate-500"}>CRATE PRO:</span>
                        <span className={isMissionDone ? "text-emerald-400" : "text-slate-600"}>+{bounty.proXp} XP + {bounty.proTickets} Tickets</span>
                      </div>

                      {!isMissionDone ? (
                        /* Caso 1: Missione NON completata -> CASSA TOTALMENTE BLOCCATA */
                        <span 
                          className="px-2.5 py-1 rounded-md text-[10px] font-mono font-semibold text-slate-500 bg-slate-900/90 border border-slate-800/80 flex items-center gap-1.5 cursor-not-allowed select-none opacity-80"
                          title="Questa cassa PRO si sblocca solo dopo aver completato l'obiettivo della missione!"
                        >
                          <Lock className="w-3 h-3 text-amber-500/50" />
                          <span>BLOCCATA (Fai la missione: {bounty.progress}/{bounty.target})</span>
                        </span>
                      ) : bounty.proClaimed ? (
                        /* Caso 2: Missione completata E cassa già riscattata */
                        <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Cassa Decrittata
                        </span>
                      ) : (
                        /* Caso 3: Missione completata! Cassa pronta per essere aperta o decrittata */
                        <button
                          onClick={() => {
                            if (!userState.isPro) {
                              sound.playTap();
                              onOpenPaywallContext('bounty_crate_lock');
                            } else {
                              onClaimProBounty(bounty.id);
                            }
                          }}
                          className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold border transition-all flex items-center gap-1 bg-gradient-to-r from-amber-500/20 to-emerald-500/20 border-amber-500/50 text-amber-300 hover:border-amber-400 shadow-neon-amber active:scale-95 animate-pulse cursor-pointer"
                          title="Missione completata! Sblocca la cassa PRO"
                        >
                          {!userState.isPro ? (
                            <>
                              <Lock className="w-3 h-3 text-amber-400" />
                              <span>DECRITTA CON PRO</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3 text-emerald-400" />
                              <span>APRI CASSA PRO</span>
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

      {/* Modules List */}
      <div className="space-y-10">
        {SKILL_MODULES.map((module, mIndex) => {
          return (
            <div key={module.id} className="relative">
              {/* Module Header Card */}
              <div className="rounded-xl bg-surface/90 border border-white/10 p-4 mb-6 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                    {module.certificationFocus}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    {module.title}
                  </h3>
                </div>
                <div className="w-8 h-8 rounded-lg bg-[#090D16] border border-white/10 flex items-center justify-center font-mono text-xs font-bold text-emerald-400">
                  0{mIndex + 1}
                </div>
              </div>

              {/* Vertical Path Nodes */}
              <div className="relative flex flex-col items-center space-y-7">
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
                        className={`cursor-pointer group relative w-full sm:w-[90%] p-4 rounded-2xl border transition-all duration-300 flex items-center gap-4 ${
                          isCompleted
                            ? 'bg-emerald-950/30 border-emerald-500/50 hover:border-emerald-400 shadow-neon-emerald'
                            : isLocked
                            ? 'bg-surface/50 border-white/5 opacity-75 hover:opacity-100 hover:border-amber-500/30'
                            : 'bg-surface border-white/15 hover:border-emerald-500/50 hover:shadow-neon-emerald'
                        }`}
                      >
                        {/* Node Icon Circle */}
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105 ${
                          isCompleted
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                            : isLocked
                            ? 'bg-slate-900 border-slate-700 text-slate-500'
                            : 'bg-indigo-500/20 border-indigo-500 text-indigo-400 shadow-neon-indigo'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                          ) : isLocked ? (
                            <Lock className="w-5 h-5 text-amber-500/80" />
                          ) : (
                            <Play className="w-5 h-5 text-indigo-400 fill-indigo-400 ml-0.5" />
                          )}
                        </div>

                        {/* Node Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900/80 text-slate-300 border border-white/5">
                              {node.domain}
                            </span>
                            {isCompleted && (
                              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                                COMPLETATO
                              </span>
                            )}
                            {isLocked && (
                              <span className="text-[10px] font-mono text-amber-400 font-bold flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> PRO ONLY
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-sm sm:text-base text-white truncate">
                            {node.title}
                          </h4>
                          <p className="text-xs text-slate-400 truncate mt-0.5">
                            {node.subtitle}
                          </p>
                        </div>

                        {/* Rewards / Status Action */}
                        <div className="flex flex-col items-end shrink-0 font-mono text-right">
                          <span className="text-xs text-emerald-400 font-bold">
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
