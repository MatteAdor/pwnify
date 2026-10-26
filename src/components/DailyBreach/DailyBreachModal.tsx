import React, { useState, useEffect, useRef, useMemo } from 'react';
import { UserState } from '../../types';
import { 
  getDailyBreachForDate, 
  generateDailyBreachShareCard, 
  DailyBreachIncident,
  calculateBreachTriageRewards,
  DailyBreachTriageReward
} from '../../data/dailyBreaches';
import { shuffleArray } from '../../utils/shuffle';
import { sound } from '../../utils/soundEngine';
import { 
  X, AlertTriangle, ShieldCheck, Share2, 
  CheckCircle2, Lock, Terminal, Code, Clock 
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface DailyBreachModalProps {
  isOpen: boolean;
  onClose: () => void;
  userState: UserState;
  onSuccess: (xp: number, elo: number) => void;
  onOpenPaywallContext: (context: 'blurred_breakdown' | 'manual_upgrade') => void;
}

export const DailyBreachModal: React.FC<DailyBreachModalProps> = ({
  isOpen,
  onClose,
  userState,
  onSuccess,
  onOpenPaywallContext
}) => {
  const incident: DailyBreachIncident = useMemo(() => getDailyBreachForDate(), []);
  
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [timeTaken, setTimeTaken] = useState<number>(0);
  const [copiedShare, setCopiedShare] = useState<boolean>(false);
  const [rewards, setRewards] = useState<DailyBreachTriageReward | null>(null);
  
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<any>(null);

  // Fisher-Yates shuffled options for unbiased selection
  const shuffledOptions = useMemo(() => {
    return shuffleArray(incident.options);
  }, [incident]);

  useEffect(() => {
    if (isOpen && !hasSubmitted) {
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setTimeTaken((Date.now() - startTimeRef.current) / 1000);
      }, 100);
    }
    return () => clearInterval(timerRef.current);
  }, [isOpen, hasSubmitted]);

  if (!isOpen) return null;

  const handleSubmit = (optionId: string) => {
    if (hasSubmitted) return;
    sound.playTap();
    setSelectedOptionId(optionId);
    clearInterval(timerRef.current);

    const chosen = incident.options.find(o => o.id === optionId);
    const right = chosen?.isCorrect || false;
    setIsCorrect(right);
    setHasSubmitted(true);

    if (right) {
      sound.playExploitSuccess();
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      const calculated = calculateBreachTriageRewards(incident, timeTaken, userState.isPro);
      setRewards(calculated);
      onSuccess(calculated.totalXp, calculated.totalElo);
    } else {
      sound.playPayloadBlocked();
    }
  };

  const handleCopyShare = () => {
    sound.playTap();
    const shareText = generateDailyBreachShareCard(
      incident,
      timeTaken,
      isCorrect,
      userState.streakDays + 1,
      userState.elo
    );
    navigator.clipboard.writeText(shareText);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 overflow-y-auto animate-fade-in font-sans">
      <div className="relative w-full max-w-2xl my-auto bg-[#0D121D] border border-zinc-800 rounded-2xl p-5 sm:p-7 shadow-xl text-zinc-100">
        {/* Header Bar */}
        <div className="flex items-start justify-between border-b border-zinc-800 pb-4 mb-4 gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-zinc-400 font-bold uppercase tracking-wider">
                  Daily 0xBreach #{incident.dayIndex}
                </span>
                <span className="text-xs font-mono text-amber-400 font-bold">
                  {incident.cveId}
                </span>
              </div>
              <h3 className="font-bold text-base sm:text-lg text-white mt-0.5">
                {incident.title}
              </h3>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playTap();
              onClose();
            }}
            className="p-1 rounded text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Incident Metrics Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 font-mono text-xs">
          <div className="bg-[#090D16] p-2.5 rounded-xl border border-white/5">
            <span className="text-[10px] text-slate-500 block">CVSS SCORE</span>
            <span className="font-bold text-red-400 text-xs sm:text-sm">{incident.cvssDisplay || `${incident.cvssScore} / 10.0`}</span>
          </div>
          <div className="bg-[#090D16] p-2.5 rounded-xl border border-white/5">
            <span className="text-[10px] text-slate-500 block">THREAT ACTOR</span>
            <span className="font-bold text-slate-300 text-[11px] truncate block">{incident.threatActor}</span>
          </div>
          <div className="bg-[#090D16] p-2.5 rounded-xl border border-white/5">
            <span className="text-[10px] text-slate-500 block">TIMER TRIAGE</span>
            <span className="font-bold text-amber-300 text-sm flex items-center gap-1">
              <Clock className="w-3 h-3 animate-spin" />
              {timeTaken.toFixed(1)}s
            </span>
          </div>
          <div className="bg-[#090D16] p-2.5 rounded-xl border border-white/5">
            <span className="text-[10px] text-slate-500 block">REWARD STREAK</span>
            <span className="font-bold text-emerald-400 text-sm">+{incident.eloReward} ELO · +1d Streak</span>
          </div>
        </div>

        {/* Incident Context Narrative */}
        <div className="mb-4 text-xs sm:text-sm text-slate-300 bg-surface/60 border border-white/5 p-3.5 rounded-xl leading-relaxed">
          <p>{incident.scenario}</p>
        </div>

        {/* Code Snippet Viewer */}
        <div className="mb-4 rounded-xl bg-[#06090F] border border-white/10 overflow-hidden shadow-inner">
          <div className="bg-slate-900/90 px-3 py-1.5 border-b border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-amber-400" />
              TARGET_DISASSEMBLY // {incident.targetArchitecture}
            </span>
            <span className="text-red-400 font-bold uppercase text-[10px]">Zero-Day Vector</span>
          </div>
          <pre className="p-3 font-mono text-xs sm:text-sm text-slate-200 overflow-x-auto whitespace-pre-wrap leading-relaxed">
            {incident.vulnerableCodeSnippet}
          </pre>
        </div>

        {/* Question Prompt */}
        <div className="mb-3">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>{incident.prompt}</span>
          </h4>
        </div>

        {/* Shuffled Multiple Choice Options */}
        <div className="space-y-2 mb-4">
          {shuffledOptions.map((opt) => {
            const isSelected = selectedOptionId === opt.id;
            let optStyle = 'bg-zinc-900 border-zinc-800 hover:border-amber-500/40 text-zinc-100';

            if (hasSubmitted) {
              if (opt.isCorrect) {
                optStyle = 'bg-emerald-950/70 border-emerald-500 text-emerald-200';
              } else if (isSelected && !opt.isCorrect) {
                optStyle = 'bg-red-950/70 border-red-500 text-red-200';
              }
            }

            return (
              <button
                key={opt.id}
                disabled={hasSubmitted}
                onClick={() => handleSubmit(opt.id)}
                className={`w-full text-left min-h-[52px] sm:min-h-[56px] p-4 rounded-xl border text-xs sm:text-sm font-bold transition-all flex items-center justify-between cursor-pointer active:scale-99 ${optStyle}`}
              >
                <span className="font-mono font-bold">{opt.text}</span>
                {hasSubmitted && opt.isCorrect && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 ml-2" />
                )}
              </button>
            );
          })}
        </div>

        {/* Post-Submission Triage Breakdown & Viral Share Card */}
        {hasSubmitted && (
          <div className="space-y-4 animate-fade-in pt-2">
            {/* Status Feedback Banner */}
            <div className={`p-3.5 rounded-xl border text-xs sm:text-sm flex flex-col gap-2 ${
              isCorrect 
                ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300' 
                : 'bg-red-950/60 border-red-500 text-red-300'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-mono font-bold">
                  {isCorrect ? (
                    <>
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      <span>ZERO-DAY MITIGATED! (+{rewards?.totalElo || incident.eloReward} ELO)</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                      <span>TRIAGE FAILED · MALWARE COMPROMISED TARGET</span>
                    </>
                  )}
                </div>
                <span className="font-mono text-xs text-slate-300">
                  Time: {timeTaken.toFixed(1)}s
                </span>
              </div>

              {/* Transparent Controlled Rewards Breakdown */}
              {isCorrect && rewards && (
                <div className="mt-1 pt-2 border-t border-emerald-500/20 text-xs font-mono space-y-1 text-emerald-400/90">
                  <div className="flex items-center justify-between">
                    <span>Base Triage Protocol:</span>
                    <span className="font-bold">+{rewards.baseXp} XP</span>
                  </div>
                  {rewards.isSpeedBonusEarned && (
                    <div className="flex items-center justify-between text-amber-300">
                      <span>⚡ Rapid Triage Speed Bonus (&le; 30s):</span>
                      <span className="font-bold">+{rewards.speedBonusXp} XP</span>
                    </div>
                  )}
                  {rewards.classifiedDossierDiscovered && (
                    <div className="flex items-center justify-between text-indigo-300">
                      <span>📁 Classified Dossier (15% Field Anomaly):</span>
                      <span className="font-bold">+{rewards.dossierBonusXp} XP</span>
                    </div>
                  )}
                  {userState.isPro && (
                    <div className="flex items-center justify-between text-emerald-300">
                      <span>⚡ 2x XP Multiplier (PRO):</span>
                      <span className="font-bold">2X APPLIED</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between font-bold text-emerald-200 border-t border-emerald-500/30 pt-1 text-sm">
                    <span>Total Awarded:</span>
                    <span>+{rewards.totalXp} XP</span>
                  </div>
                </div>
              )}
            </div>

            {/* Root Cause Technical Deep Dive */}
            <div className="rounded-xl border border-white/10 bg-[#090D16] p-4 text-xs font-mono space-y-2">
              <div className="text-amber-400 font-bold border-b border-white/10 pb-1">
                ROOT CAUSE ANALYSIS // {incident.rootCauseAnalysis.cwe}
              </div>
              <p className="text-slate-300 leading-relaxed">
                <strong>Attack Vector:</strong> {incident.rootCauseAnalysis.attackVector}
              </p>
              <p className="text-slate-300 leading-relaxed">
                <strong>Historical Impact:</strong> {incident.rootCauseAnalysis.historicalImpact}
              </p>
              <div className="bg-black/60 p-2.5 rounded-lg border border-emerald-500/30 text-emerald-300">
                <span className="text-slate-500 block text-[10px] mb-1">OPERATIONAL TERMINAL PROOF:</span>
                <pre className="whitespace-pre-wrap">{incident.rootCauseAnalysis.terminalProof}</pre>
              </div>
            </div>

            {/* Action Buttons: Viral Bragging Share + PRO Archive Teaser */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Wordle-style Bragging Share Button */}
              <button
                onClick={handleCopyShare}
                className="min-h-[50px] py-3.5 px-4 rounded-xl font-mono font-black text-xs sm:text-sm text-zinc-950 bg-emerald-500 hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-98"
              >
                {copiedShare ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 fill-current" />
                    <span>RISULTATO COPIATO!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    <span>CONDIVIDI RISULTATO</span>
                  </>
                )}
              </button>

              {/* Pro Archive Teaser */}
              <button
                onClick={() => {
                  sound.playTap();
                  if (!userState.isPro) {
                    onOpenPaywallContext('blurred_breakdown');
                  } else {
                    onClose();
                  }
                }}
                className="min-h-[50px] py-3.5 px-4 rounded-xl font-mono font-black text-xs sm:text-sm border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
              >
                <Lock className="w-4 h-4 text-zinc-400" />
                <span>ARCHIVIO STORICO (PRO)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
