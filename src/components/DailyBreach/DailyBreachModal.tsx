import React, { useState, useEffect, useRef, useMemo } from 'react';
import { UserState } from '../../types';
import { 
  getDailyBreachForDate, 
  generateDailyBreachShareCard, 
  DailyBreachIncident 
} from '../../data/dailyBreaches';
import { shuffleArray } from '../../utils/shuffle';
import { sound } from '../../utils/soundEngine';
import { 
  X, AlertTriangle, ShieldCheck, Flame, Share2, 
  Copy, CheckCircle2, Lock, Sparkles, Terminal, Code, Clock 
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
      onSuccess(incident.xpReward, incident.eloReward);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-2xl my-auto bg-[#101726] border border-amber-500/40 rounded-2xl p-5 sm:p-7 shadow-2xl text-slate-100 overflow-hidden shadow-neon-amber">
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-amber-400 to-emerald-400 animate-pulse" />

        {/* Header Bar */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4 mb-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-500/40 font-bold uppercase tracking-wider">
                  DEFCON 1 · DAILY 0xBREACH #{incident.dayIndex}
                </span>
                <span className="text-[10px] font-mono text-amber-400 font-bold">
                  {incident.cveId}
                </span>
              </div>
              <h3 className="font-extrabold text-base sm:text-lg text-white mt-0.5">
                {incident.title}
              </h3>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playTap();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Incident Metrics Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 font-mono text-xs">
          <div className="bg-[#090D16] p-2.5 rounded-xl border border-white/5">
            <span className="text-[10px] text-slate-500 block">CVSS SCORE</span>
            <span className="font-bold text-red-400 text-sm">{incident.cvssScore} / 10.0</span>
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
            <span className="font-bold text-emerald-400 text-sm">+{incident.eloReward} ELO · 🔥 +1d</span>
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
            let optStyle = 'bg-surface/80 border-white/10 hover:border-amber-500/40 text-slate-200';

            if (hasSubmitted) {
              if (opt.isCorrect) {
                optStyle = 'bg-emerald-950/70 border-emerald-500 text-emerald-300 shadow-neon-emerald';
              } else if (isSelected && !opt.isCorrect) {
                optStyle = 'bg-red-950/70 border-red-500 text-red-300';
              }
            }

            return (
              <button
                key={opt.id}
                disabled={hasSubmitted}
                onClick={() => handleSubmit(opt.id)}
                className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm transition-all flex items-center justify-between ${optStyle} active:scale-99`}
              >
                <span className="font-mono">{opt.text}</span>
                {hasSubmitted && opt.isCorrect && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                )}
              </button>
            );
          })}
        </div>

        {/* Post-Submission Triage Breakdown & Viral Share Card */}
        {hasSubmitted && (
          <div className="space-y-4 animate-fade-in pt-2">
            {/* Status Feedback Banner */}
            <div className={`p-3.5 rounded-xl border text-xs sm:text-sm flex items-center justify-between ${
              isCorrect 
                ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300' 
                : 'bg-red-950/60 border-red-500 text-red-300'
            }`}>
              <div className="flex items-center gap-2 font-mono font-bold">
                {isCorrect ? (
                  <>
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <span>ZERO-DAY MITIGATO CON SUCCESSO! (+{incident.eloReward} ELO)</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <span>TRIAGE FALLITO · IL MALWARE HA COMPROMESSO IL TARGET</span>
                  </>
                )}
              </div>
              <span className="font-mono text-xs text-slate-300">
                Tempo: {timeTaken.toFixed(1)}s
              </span>
            </div>

            {/* Root Cause Technical Deep Dive */}
            <div className="rounded-xl border border-white/10 bg-[#090D16] p-4 text-xs font-mono space-y-2">
              <div className="text-amber-400 font-bold border-b border-white/10 pb-1">
                ANALISI ROOT CAUSE // {incident.rootCauseAnalysis.cwe}
              </div>
              <p className="text-slate-300 leading-relaxed">
                <strong>Vettore d'Attacco:</strong> {incident.rootCauseAnalysis.attackVector}
              </p>
              <p className="text-slate-300 leading-relaxed">
                <strong>Impatto Storico:</strong> {incident.rootCauseAnalysis.historicalImpact}
              </p>
              <div className="bg-black/60 p-2.5 rounded-lg border border-emerald-500/30 text-emerald-300">
                <span className="text-slate-500 block text-[10px] mb-1">PROVA OPERATIVA DI TERMINALE:</span>
                <pre className="whitespace-pre-wrap">{incident.rootCauseAnalysis.terminalProof}</pre>
              </div>
            </div>

            {/* Action Buttons: Viral Bragging Share + PRO Archive Teaser */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Wordle-style Bragging Share Button */}
              <button
                onClick={handleCopyShare}
                className="py-3 px-4 rounded-xl font-mono font-bold text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-emerald-400 to-amber-300 hover:from-emerald-300 hover:to-amber-200 transition-all flex items-center justify-center gap-2 shadow-neon-emerald"
              >
                {copiedShare ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-slate-950" />
                    <span>CARD CONDIVISIONE COPIATA!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 text-slate-950" />
                    <span>CONDIVIDI TRIAGE (WORDLE STYLE)</span>
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
                className="py-3 px-4 rounded-xl font-mono text-xs sm:text-sm border border-indigo-500/40 bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-300 flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4 text-indigo-400" />
                <span>ARCHIVIO STORICO 0xBREACH (PRO)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
