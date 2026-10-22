import React, { useState, useEffect } from 'react';
import { UserState } from '../../types';
import { sound } from '../../utils/soundEngine';
import { 
  Target, AlertTriangle, Flame, Gift, Box, 
  Check, Sparkles, Zap, Clock, Shield, Award, ChevronRight, Lock
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useLanguage } from '../../utils/language';

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
  const { lang } = useLanguage();
  const isEn = lang === 'en';

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
    <div className="w-full max-w-xl mx-auto px-3.5 sm:px-4 py-4 pb-28 space-y-4 animate-fade-in font-sans">
      {/* Header Banner */}
      <div className="rounded-2xl bg-[#0D121D] border border-zinc-800 p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs text-zinc-400 font-mono">
                {isEn ? 'Reset in:' : 'Reset tra:'} <strong className="text-zinc-200">{timeLeft}</strong>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2 tracking-tight">
              <Target className="w-5 h-5 text-zinc-400" />
              <span>{isEn ? 'Bounties & Missions Hub' : 'Centro Missioni & Taglie'}</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-md leading-relaxed">
              {isEn 
                ? 'Triage daily Zero-Day incidents, claim Bug Bounty contracts, and complete tactical objectives for XP and tickets.'
                : 'Risolvi l\'incidente Zero-Day quotidiano, riscatta i contratti Bug Bounty e completa le operazioni speciali.'}
            </p>
          </div>

          <div className="hidden sm:flex flex-col items-end text-right">
            <span className="text-[10px] font-mono text-zinc-500">STREAK</span>
            <div className="flex items-center gap-1 font-mono font-bold text-xl text-amber-400">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>{userState.streakDays}d</span>
            </div>
          </div>
        </div>
      </div>

      {/* 1. Daily 0xBreach Incident Card */}
      <div className="rounded-2xl bg-[#0D121D] border border-zinc-800 p-4 sm:p-5 space-y-3">
        {/* Top row: Status, Title, Streak */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <div>
              <h2 className="text-sm font-bold text-white">
                Daily 0xBreach
              </h2>
            </div>
          </div>

          {/* Triage streak */}
          <div className="font-mono text-right shrink-0">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 font-mono">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>x{userState.dailyBreachStreak || 0} TRIAGE</span>
            </span>
          </div>
        </div>

        {/* Short, non-overwhelming summary */}
        <p className="text-xs text-zinc-400 leading-relaxed">
          {isEn
            ? 'Analyze the daily CVE incident in the vulnerable code snippet and identify the root cause for 2x XP.'
            : 'Analizza l\'incidente CVE quotidiano nel frammento di codice e individua la root cause per ottenere XP doppi.'}
        </p>

        {/* Action CTA */}
        <div className="pt-0.5 space-y-2">
          <button
            onClick={() => {
              sound.playTap();
              onOpenDailyBreach();
            }}
            className={`w-full min-h-[50px] py-3 px-5 rounded-xl font-mono font-black text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-98 ${
              isBreachSolvedToday
                ? 'bg-zinc-800 border border-emerald-500/40 text-emerald-300 hover:bg-zinc-700'
                : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950'
            }`}
          >
            {isBreachSolvedToday ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>TRIAGE COMPLETATO OGGI (RIVEDI)</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-current" />
                <span>AVVIA TRIAGE ZERO-DAY (+150 XP)</span>
              </>
            )}
          </button>

          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 px-1 font-bold">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span>Nuovo breach alle 00:00</span>
            </span>
            <span>1 al giorno</span>
          </div>
        </div>
      </div>

      {/* 2. Daily Bug Bounty Contracts */}
      <div className="rounded-2xl bg-[#0D121D] border border-zinc-800 p-5 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <Gift className="w-4 h-4 text-zinc-400 shrink-0" />
            <div className="min-w-0">
              <h2 className="font-bold text-sm text-white truncate">
                Contratti Bug Bounty
              </h2>
              <p className="text-[11px] text-zinc-400 truncate">
                Completa le missioni per riscattare le ricompense
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-zinc-400 shrink-0 whitespace-nowrap pt-0.5">
            3 Contratti
          </span>
        </div>

        <div className="space-y-3 pt-1">
          {userState.dailyBounties.map(bounty => {
            const isFinished = bounty.progress >= bounty.target;
            const pct = Math.min(100, Math.round((bounty.progress / bounty.target) * 100));

            return (
              <div 
                key={bounty.id}
                className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-mono font-bold text-xs text-white flex items-center gap-2">
                      <span>{bounty.title}</span>
                      {isFinished && (
                        <span className="text-[10px] text-emerald-400 font-mono">
                          (COMPLETATO)
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">{bounty.description}</p>
                  </div>
                  <span className="font-mono font-bold text-xs text-zinc-300 shrink-0">
                    {bounty.progress}/{bounty.target}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${isFinished ? 'bg-emerald-400' : 'bg-zinc-400'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* Rewards row */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-zinc-800 text-xs font-mono">
                  {/* Free reward */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase">Free:</span>
                    {bounty.freeClaimed ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-400 font-bold">
                        <Check className="w-3.5 h-3.5" /> Riscosso
                      </span>
                    ) : isFinished ? (
                      <button
                        onClick={() => {
                          sound.playExploitSuccess();
                          onClaimFreeBounty(bounty.id);
                          confetti({ particleCount: 30, spread: 60, origin: { y: 0.7 } });
                        }}
                        className="min-h-[40px] py-1.5 px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-black transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-sm"
                      >
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        <span>Riscatta +{bounty.freeXp} XP</span>
                      </button>
                    ) : (
                      <span className="text-xs text-zinc-500 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-zinc-600" />
                        <span>In Corso</span>
                      </span>
                    )}
                  </div>

                  {/* PRO Crate */}
                  <div className="flex items-center gap-1.5">
                    <Box className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className="text-[10px] text-zinc-500 font-bold uppercase">PRO:</span>
                    <span className="text-xs text-zinc-400 font-mono">+{bounty.proXp} XP +{bounty.proTickets}T</span>

                    {bounty.proClaimed ? (
                      <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Aperta
                      </span>
                    ) : !isFinished ? (
                      <span className="text-[10px] text-zinc-500 flex items-center gap-1 bg-zinc-800 px-2 py-0.5 rounded">
                        <Lock className="w-3 h-3 text-zinc-600" />
                        <span>Bloccata</span>
                      </span>
                    ) : userState.isPro ? (
                      <button
                        onClick={() => {
                          sound.playVictoryFanfare();
                          onClaimProBounty(bounty.id);
                          confetti({ particleCount: 60, spread: 80, origin: { y: 0.7 } });
                        }}
                        className="min-h-[40px] py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-sm"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Apri Cassa</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          sound.playTap();
                          onOpenPaywallContext('bounty_crate_lock');
                        }}
                        className="min-h-[40px] py-1.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-black transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Sblocca PRO</span>
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
      <div className="rounded-2xl bg-[#0D121D] border border-zinc-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Award className="w-4 h-4 text-zinc-400 shrink-0" />
            <div>
              <h2 className="font-bold text-sm sm:text-base text-white">
                Operazioni Speciali Settimanali
              </h2>
              <span className="text-[11px] text-zinc-400">
                Traguardi cumulativi per l'assegnazione dei badge
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-xs text-white">First Blood PvP</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-emerald-400">
                {userState.winStreak > 0 ? 'COMPLETATO' : '0/1'}
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Vinci almeno 1 match 1v1 nella Cyber Arena
            </p>
            <div className="text-xs font-mono text-emerald-400 font-bold">
              Ricompensa: +100 XP · Badge Gladiatore
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-xs text-white">Deep Reconnaissance</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                {userState.completedNodeIds.length}/5
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Completa 5 lezioni tattiche nei Capitoli formativi
            </p>
            <div className="text-xs font-mono text-zinc-300 font-bold">
              Ricompensa: +250 XP · +2 Ticket Arena
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MissionsTab;
