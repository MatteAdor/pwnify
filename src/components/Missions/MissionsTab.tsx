import React, { useState, useEffect } from 'react';
import { UserState } from '../../types';
import { sound } from '../../utils/soundEngine';
import { 
  Target, AlertTriangle, Flame, Gift, Box, 
  Check, Sparkles, Zap, Clock, Shield, Award, ChevronRight, Lock
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface MissionsTabProps {
  userState: UserState;
  onOpenDailyBreach: () => void;
  onOpenPaywallContext: (context: 'bounty_crate_lock' | 'manual_upgrade' | 'blurred_breakdown') => void;
  onClaimFreeBounty: (bountyId: string) => void;
  onClaimProBounty: (bountyId: string) => void;
}

export const MissionsTab: React.FC<MissionsTabProps> = ({
  userState,
  onOpenDailyBreach,
  onOpenPaywallContext,
  onClaimFreeBounty,
  onClaimProBounty
}) => {
  // Midnight countdown timer
  const [timeLeft, setTimeLeft] = useState<string>('00:00:00');

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const diff = tomorrow.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];
  const isBreachSolvedToday = userState.lastDailyBreachDate === todayStr;

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 pb-28 space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-surface to-[#1B2640] border border-white/10 p-5 shadow-cyber-glass overflow-hidden">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">
                OPERATIONAL_OPS
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Reset tra: <strong className="text-slate-200">{timeLeft}</strong>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
              <Target className="w-6 h-6 text-amber-400" />
              <span>Centro Missioni & Taglie</span>
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-md">
              Risolvi l'incidente Zero-Day quotidiano, riscatta i contratti Bug Bounty e completa le operazioni speciali per accumulare XP e ticket.
            </p>
          </div>

          <div className="hidden sm:flex flex-col items-end text-right">
            <span className="text-[10px] font-mono text-slate-400">DAILY STREAK</span>
            <div className="flex items-center gap-1 font-mono font-extrabold text-2xl text-amber-400">
              <Flame className="w-5 h-5 fill-amber-500 text-amber-500" />
              <span>{userState.streakDays}d</span>
            </div>
          </div>
        </div>
      </div>

      {/* 1. DEFCON 1 · Daily 0xBreach Hero Card */}
      <div className="rounded-2xl bg-gradient-to-r from-[#1c0c10] via-[#14101e] to-[#0a101c] border-2 border-red-500/40 p-4 sm:p-5 shadow-neon-crimson relative overflow-hidden space-y-3">
        <div className="absolute top-0 right-0 w-36 h-36 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />
        
        {/* Top row: Status, Title, Streak */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/50 flex items-center justify-center text-red-400 shadow-neon-crimson shrink-0">
              <AlertTriangle className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-red-500/30 text-red-300 border border-red-500/40">
                  DEFCON 1
                </span>
                <h2 className="text-xs sm:text-sm font-black text-white">
                  Daily 0xBreach
                </h2>
              </div>
            </div>
          </div>

          {/* Triage streak */}
          <div className="font-mono text-right shrink-0">
            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
              🔥 x{userState.dailyBreachStreak || 0} TRIAGE
            </span>
          </div>
        </div>

        {/* Short, non-overwhelming summary */}
        <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed">
          Analizza l'incidente CVE quotidiano nel frammento di codice e individua la root cause per ottenere XP doppi.
        </p>

        {/* Action CTA */}
        <div className="pt-0.5 space-y-2">
          <button
            onClick={() => {
              sound.playTap();
              onOpenDailyBreach();
            }}
            className={`w-full py-2.5 px-4 rounded-xl font-mono font-extrabold text-xs transition-all flex items-center justify-center gap-2 shadow-neon-emerald transform active:scale-98 cursor-pointer ${
              isBreachSolvedToday
                ? 'bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 hover:bg-emerald-900/60'
                : 'bg-gradient-to-r from-red-500 via-amber-500 to-emerald-400 hover:from-red-400 hover:to-emerald-300 text-slate-950 font-black'
            }`}
          >
            {isBreachSolvedToday ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>TRIAGE COMPLETATO OGGI (RIVEDI ANALISI)</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 fill-slate-950" />
                <span>AVVIA TRIAGE ZERO-DAY (+150 XP)</span>
              </>
            )}
          </button>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 px-1">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>Nuovo breach alle 00:00</span>
            </span>
            <span>1 tentativo al giorno</span>
          </div>
        </div>
      </div>

      {/* 2. Daily Bug Bounty Contracts */}
      <div className="rounded-2xl bg-surface border border-white/10 p-5 shadow-cyber-glass space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
              <Gift className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                <span>Contratti Bug Bounty Giornalieri</span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                  3 CONTRATTI
                </span>
              </h2>
              <span className="text-[10px] text-slate-400 font-mono">
                Completa le missioni per sbloccare le taglie Free e le casse PRO
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-1">
          {userState.dailyBounties.map(bounty => {
            const isFinished = bounty.progress >= bounty.target;
            const pct = Math.min(100, Math.round((bounty.progress / bounty.target) * 100));

            return (
              <div 
                key={bounty.id}
                className="p-4 rounded-xl bg-[#090D16] border border-white/10 space-y-3 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-mono font-bold text-xs text-white flex items-center gap-2">
                      <span>{bounty.title}</span>
                      {isFinished && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          OBIETTIVO RAGGIUNTO
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">{bounty.description}</p>
                  </div>
                  <span className="font-mono font-bold text-xs text-slate-300 shrink-0">
                    {bounty.progress}/{bounty.target}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${isFinished ? 'bg-emerald-400' : 'bg-amber-400'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* Rewards row */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5 text-xs font-mono">
                  {/* Free reward */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Taglia Free:</span>
                    {bounty.freeClaimed ? (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold">
                        <Check className="w-3.5 h-3.5" /> Riscatto Effettuato
                      </span>
                    ) : isFinished ? (
                      <button
                        onClick={() => {
                          sound.playExploitSuccess();
                          onClaimFreeBounty(bounty.id);
                          confetti({ particleCount: 30, spread: 60, origin: { y: 0.7 } });
                        }}
                        className="py-1 px-3 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 text-[11px] font-bold transition-all shadow-neon-emerald flex items-center gap-1"
                      >
                        <Zap className="w-3 h-3" />
                        <span>Riscatta +{bounty.freeXp} XP</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-slate-600" />
                        <span>In Corso ({bounty.progress}/{bounty.target})</span>
                      </span>
                    )}
                  </div>

                  {/* PRO Crate */}
                  <div className="flex items-center gap-1.5">
                    <Box className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Cassa PRO:</span>
                    <span className="text-[10px] text-slate-400 font-mono">+{bounty.proXp} XP +{bounty.proTickets}T</span>

                    {bounty.proClaimed ? (
                      <span className="text-[11px] text-indigo-400 font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Aperta
                      </span>
                    ) : !isFinished ? (
                      <span className="text-[10px] text-slate-500 flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded border border-white/5">
                        <Lock className="w-3 h-3 text-slate-600" />
                        <span>Bloccata ({bounty.progress}/{bounty.target})</span>
                      </span>
                    ) : userState.isPro ? (
                      <button
                        onClick={() => {
                          sound.playVictoryFanfare();
                          onClaimProBounty(bounty.id);
                          confetti({ particleCount: 60, spread: 80, origin: { y: 0.7 } });
                        }}
                        className="py-1 px-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold text-[10px] transition-all shadow-neon-indigo flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Apri Cassa PRO</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          sound.playTap();
                          onOpenPaywallContext('bounty_crate_lock');
                        }}
                        className="py-1 px-2.5 rounded-lg bg-indigo-950/60 border border-indigo-500/40 hover:border-indigo-400 text-indigo-300 text-[10px] font-bold transition-all flex items-center gap-1"
                      >
                        <Lock className="w-3 h-3" />
                        <span>Sblocca con PRO</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Operazioni Speciali & Traguardi Settimanali */}
      <div className="rounded-2xl bg-surface border border-white/10 p-5 shadow-cyber-glass space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-white">
                Operazioni Speciali Settimanali
              </h2>
              <span className="text-[10px] text-slate-400 font-mono">
                Traguardi cumulativi per l'assegnazione di badge operatore
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl bg-[#090D16] border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-xs text-white">First Blood PvP</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-400">
                {userState.winStreak > 0 ? 'COMPLETATO' : '0/1'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Vinci almeno 1 match 1v1 nella Cyber Arena
            </p>
            <div className="text-[10px] font-mono text-emerald-400 font-bold">
              Ricompensa: +100 XP · Badge Gladiatore
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#090D16] border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-xs text-white">Deep Reconnaissance</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-indigo-400">
                {userState.completedNodeIds.length}/5
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Completa 5 lezioni tattiche nei Capitoli formativi
            </p>
            <div className="text-[10px] font-mono text-indigo-400 font-bold">
              Ricompensa: +250 XP · +2 Ticket Arena
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MissionsTab;
