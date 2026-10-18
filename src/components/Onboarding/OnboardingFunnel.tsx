import React, { useState, useEffect } from 'react';
import { getDiagnosticQuestionsForLevel } from '../../data/diagnosticQuestions';
import { HardcoreQuestion } from '../../types';
import { 
  Shield, CheckCircle2, AlertTriangle, ArrowRight, Terminal, 
  Cpu, Target, Sparkles, Check, Globe, CornerDownLeft 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useLanguage } from '../../utils/language';
import { sound } from '../../utils/soundEngine';
import { executeVirtualCommand } from '../../utils/terminalEngine';

interface OnboardingFunnelProps {
  onComplete: (data: {
    goal: string;
    level: string;
    commitment: number;
    readinessScore: number;
  }) => void;
  onOpenPaywall: () => void;
}

export const OnboardingFunnel: React.FC<OnboardingFunnelProps> = ({
  onComplete,
  onOpenPaywall
}) => {
  const { lang, setLanguage, t } = useLanguage();
  const [step, setStep] = useState<number>(1);
  const [selectedGoal, setSelectedGoal] = useState<string>('comptia_sec');
  const [selectedLevel, setSelectedLevel] = useState<string>('intermediate');
  const [dailyTime, setDailyTime] = useState<number>(15);

  // Diagnostic Quiz State
  const [diagQuestions, setDiagQuestions] = useState<HardcoreQuestion[]>(() => getDiagnosticQuestionsForLevel('intermediate', lang));
  const [currentDiagIndex, setCurrentDiagIndex] = useState<number>(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [selectedLineNum, setSelectedLineNum] = useState<number | null>(null);
  const [terminalInputText, setTerminalInputText] = useState<string>('');
  const [terminalStdout, setTerminalStdout] = useState<string | null>(null);
  const [userScore, setUserScore] = useState<number>(0);
  const [hasAnswered, setHasAnswered] = useState<boolean>(false);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean>(false);

  // Recalculate dynamic difficulty questions whenever level or language changes
  useEffect(() => {
    setDiagQuestions(getDiagnosticQuestionsForLevel(selectedLevel, lang));
    setCurrentDiagIndex(0);
    setUserScore(0);
    setSelectedOptionId(null);
    setHasAnswered(false);
  }, [selectedLevel, lang]);

  // Step 5 Animated Calculation State
  const [calculatingProgress, setCalculatingProgress] = useState<number>(0);
  const [calculationComplete, setCalculationComplete] = useState<boolean>(false);

  // Step 5 simulated calculation
  useEffect(() => {
    if (step === 5) {
      let current = 0;
      const interval = setInterval(() => {
        current += 2;
        if (current >= 100) {
          clearInterval(interval);
          setCalculatingProgress(100);
          setCalculationComplete(true);
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.7 }
          });
        } else {
          setCalculatingProgress(current);
        }
      }, 35);
      return () => clearInterval(interval);
    }
  }, [step]);

  const goals = [
    {
      id: 'comptia_sec',
      title: t.goalSecPlusTitle,
      desc: t.goalSecPlusDesc,
      icon: Shield,
      badge: 'CERTIFIED'
    },
    {
      id: 'web_hacking',
      title: t.goalWebTitle,
      desc: t.goalWebDesc,
      icon: Target,
      badge: 'OFFENSIVE'
    },
    {
      id: 'linux_bash',
      title: t.goalLinuxTitle,
      desc: t.goalLinuxDesc,
      icon: Terminal,
      badge: 'SYSTEMS'
    },
    {
      id: 'soc_blue',
      title: t.goalSocTitle,
      desc: t.goalSocDesc,
      icon: Cpu,
      badge: 'DEFENSIVE'
    }
  ];

  const levels = [
    {
      id: 'beginner',
      title: t.levelBeginnerTitle,
      desc: t.levelBeginnerDesc
    },
    {
      id: 'intermediate',
      title: t.levelIntermediateTitle,
      desc: t.levelIntermediateDesc
    },
    {
      id: 'advanced',
      title: t.levelAdvancedTitle,
      desc: t.levelAdvancedDesc
    }
  ];

  const commitments = [
    { minutes: 5, label: t.commit5Label, desc: t.commit5Desc },
    { minutes: 15, label: t.commit15Label, desc: t.commit15Desc, recommended: true },
    { minutes: 30, label: t.commit30Label, desc: t.commit30Desc }
  ];

  // Current diagnostic question
  const currentQuestion: HardcoreQuestion = diagQuestions[currentDiagIndex] || diagQuestions[0];

  const handleDiagnosticAnswer = () => {
    let correct = false;
    if (currentQuestion.type === 'spot_the_zeroday') {
      const vulnerableLine = currentQuestion.codeLines?.find(l => l.isVulnerable);
      if (vulnerableLine && selectedLineNum === vulnerableLine.lineNum) {
        correct = true;
      }
    } else if (currentQuestion.type === 'terminal_command') {
      const target = currentQuestion.commandTarget?.trim().toLowerCase() || '';
      const prefix = currentQuestion.commandPrefix?.trim().toLowerCase() || '';
      const input = terminalInputText.trim().toLowerCase();
      const combined = `${prefix} ${input}`.trim();
      
      const fullCmd = `${currentQuestion.commandPrefix ? currentQuestion.commandPrefix + ' ' : ''}${terminalInputText}`.trim();
      const result = executeVirtualCommand(fullCmd);
      setTerminalStdout(result.output);

      const correctOpt = currentQuestion.options.find(o => o.isCorrect);
      if (
        combined.includes(target) || 
        input.includes(target) || 
        (correctOpt && input.includes(correctOpt.text.trim().toLowerCase()))
      ) {
        correct = true;
      }
    } else {
      const correctOpt = currentQuestion.options.find(o => o.isCorrect);
      if (correctOpt && selectedOptionId === correctOpt.id) {
        correct = true;
      }
    }

    setIsAnswerCorrect(correct);
    setHasAnswered(true);
    if (correct) {
      setUserScore(prev => prev + 1);
    }
  };

  const handleNextDiagnostic = () => {
    setHasAnswered(false);
    setSelectedOptionId(null);
    setSelectedLineNum(null);
    setTerminalInputText('');
    setTerminalStdout(null);
    if (currentDiagIndex < diagQuestions.length - 1) {
      setCurrentDiagIndex(prev => prev + 1);
    } else {
      setStep(5);
    }
  };

  const calculatedReadiness = userScore === 3 ? 48 : userScore === 2 ? 38 : userScore === 1 ? 26 : 14;

  const handleFinishOnboarding = () => {
    onComplete({
      goal: selectedGoal,
      level: selectedLevel,
      commitment: dailyTime,
      readinessScore: calculatedReadiness
    });
    // Trigger Paywall 1
    onOpenPaywall();
  };

  return (
    <div className="min-h-screen bg-[#090D16] bg-grid-cyber flex flex-col justify-center items-center px-2.5 py-3 sm:px-4 sm:py-8">
      <div className="w-full max-w-xl bg-[#131B2E] border border-white/10 rounded-2xl p-3.5 sm:p-7 shadow-2xl relative overflow-hidden">
        {/* Glow corner */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header Progress Stepper */}
        <div className="mb-3.5 sm:mb-5">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1.5">
            <span className="text-emerald-400 font-bold">{t.diagPhaseTitle}</span>
            <span>{t.stepOf} {step} {t.of}</span>
          </div>
          <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-300"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* STEP 1: Goal / Faculty Selection & Language Selector */}
        {step === 1 && (
          <div className="space-y-3 sm:space-y-4 animate-fade-in">
            {/* Language Selector placed right when selecting the goal/faculty */}
            <div className="flex items-center justify-between p-2 sm:p-2.5 rounded-xl bg-[#0b1220] border border-white/10 shadow-sm">
              <div className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-mono font-bold text-slate-200">
                  {t.selectLanguageLabel}
                </span>
              </div>
              <div className="flex items-center gap-1 bg-[#070b14] p-0.5 rounded-lg border border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    sound.playTap();
                    setLanguage('en');
                  }}
                  className={`px-2.5 py-0.5 rounded font-mono text-[11px] font-bold transition-all cursor-pointer ${
                    lang === 'en'
                      ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sound.playTap();
                    setLanguage('it');
                  }}
                  className={`px-2.5 py-0.5 rounded font-mono text-[11px] font-bold transition-all cursor-pointer ${
                    lang === 'it'
                      ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Italiano
                </button>
              </div>
            </div>

            <div>
              <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight">
                {t.onboardingStep1Title}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {t.onboardingStep1Desc}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
              {goals.map((g) => {
                const Icon = g.icon;
                const isSelected = selectedGoal === g.id;
                return (
                  <div
                    key={g.id}
                    onClick={() => setSelectedGoal(g.id)}
                    className={`cursor-pointer p-2.5 sm:p-3 rounded-xl border transition-all flex items-start gap-2.5 ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-500 shadow-neon-emerald'
                        : 'bg-surface/70 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${isSelected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h2 className="text-xs sm:text-sm font-bold text-white leading-tight truncate">{g.title}</h2>
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                          {g.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{g.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full py-2.5 sm:py-3 px-4 rounded-xl font-mono font-bold text-xs sm:text-sm text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-all flex items-center justify-center gap-2 shadow-neon-emerald cursor-pointer"
            >
              <span>{t.continueBtn}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: Current Experience Level */}
        {step === 2 && (
          <div className="space-y-3 sm:space-y-4 animate-fade-in">
            <div>
              <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">
                {t.onboardingStep2Title}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {t.onboardingStep2Desc}
              </p>
            </div>

            <div className="space-y-2">
              {levels.map((lvl) => {
                const isSelected = selectedLevel === lvl.id;
                return (
                  <div
                    key={lvl.id}
                    onClick={() => setSelectedLevel(lvl.id)}
                    className={`cursor-pointer p-2.5 sm:p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500 shadow-neon-indigo'
                        : 'bg-surface/70 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className="text-xs sm:text-sm font-bold text-white">{lvl.title}</h3>
                      {isSelected && <Check className="w-4 h-4 text-indigo-400" />}
                    </div>
                    <p className="text-[11px] text-slate-400">{lvl.desc}</p>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                onClick={() => setStep(1)}
                className="py-2.5 px-3.5 rounded-xl font-mono text-xs text-slate-400 hover:text-white border border-white/10 cursor-pointer"
              >
                {t.backBtn}
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-2.5 sm:py-3 px-4 rounded-xl font-mono font-bold text-xs sm:text-sm text-slate-950 bg-indigo-500 hover:bg-indigo-400 transition-all flex items-center justify-center gap-2 shadow-neon-indigo cursor-pointer"
              >
                <span>{t.continueBtn}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Daily Commitment */}
        {step === 3 && (
          <div className="space-y-3 sm:space-y-4 animate-fade-in">
            <div>
              <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">
                {t.onboardingStep3Title}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {t.onboardingStep3Desc}
              </p>
            </div>

            <div className="space-y-2">
              {commitments.map((c) => {
                const isSelected = dailyTime === c.minutes;
                return (
                  <div
                    key={c.minutes}
                    onClick={() => setDailyTime(c.minutes)}
                    className={`cursor-pointer p-2.5 sm:p-3 rounded-xl border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-500 shadow-neon-emerald'
                        : 'bg-surface/70 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs sm:text-sm text-white">{c.label}</span>
                        {c.recommended && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                            {t.recommendedBadge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{c.desc}</p>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                onClick={() => setStep(2)}
                className="py-2.5 px-3.5 rounded-xl font-mono text-xs text-slate-400 hover:text-white border border-white/10 cursor-pointer"
              >
                {t.backBtn}
              </button>
              <button
                onClick={() => setStep(4)}
                className="flex-1 py-2.5 sm:py-3 px-4 rounded-xl font-mono font-bold text-xs sm:text-sm text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-all flex items-center justify-center gap-2 shadow-neon-emerald cursor-pointer"
              >
                <span>{t.nextScenarioBtn} (3 {t.challenge}s)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Live Diagnostic Benchmark */}
        {step === 4 && (
          <div className="space-y-2.5 sm:space-y-3.5 animate-fade-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  {currentQuestion.domain}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {t.challenge} {currentDiagIndex + 1}/{diagQuestions.length}
                </span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 font-bold">
                {t.liveScore} {userScore}/{diagQuestions.length}
              </span>
            </div>

            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white leading-tight">
                {currentQuestion.title}
              </h3>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                {currentQuestion.prompt}
              </p>
            </div>

            {/* Code / Packet Snippet display */}
            {currentQuestion.codeSnippet && !currentQuestion.codeLines && currentQuestion.type !== 'terminal_command' && (
              <div className="rounded-lg bg-[#06090F] border border-white/10 p-2 overflow-x-auto text-[11px] font-mono text-slate-300 shadow-inner max-h-24 sm:max-h-32 overflow-y-auto">
                <pre className="whitespace-pre-wrap">{currentQuestion.codeSnippet}</pre>
              </div>
            )}

            {/* Spot the Zero-Day line picker */}
            {currentQuestion.codeLines && (
              <div className="rounded-lg bg-[#06090F] border border-white/10 p-1.5 overflow-hidden shadow-inner max-h-28 sm:max-h-36 overflow-y-auto">
                <div className="text-[9px] font-mono text-slate-500 px-1.5 py-0.5 border-b border-white/5 flex items-center justify-between">
                  <span>{t.tapVulnerableLine}</span>
                  <span className="text-amber-400">{t.clickToSelect}</span>
                </div>
                <div className="divide-y divide-white/5 font-mono text-[11px]">
                  {currentQuestion.codeLines.map((line) => {
                    const isSelected = selectedLineNum === line.lineNum;
                    return (
                      <div
                        key={line.lineNum}
                        onClick={() => !hasAnswered && setSelectedLineNum(line.lineNum)}
                        className={`px-2 py-1 flex items-center gap-2 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-amber-500/20 text-amber-300 border-l-2 border-amber-400'
                            : 'hover:bg-white/5 text-slate-300'
                        }`}
                      >
                        <span className="text-slate-600 select-none w-3 text-right text-[10px]">
                          {line.lineNum}
                        </span>
                        <span className="truncate">{line.code}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Interactive Terminal Sandbox */}
            {currentQuestion.type === 'terminal_command' && (
              <div className="space-y-2">
                <div className="rounded-xl bg-[#06090F] border border-cyan-500/40 p-3 shadow-inner font-mono text-xs text-slate-200">
                  <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-white/5 text-[11px] text-slate-400">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                    </div>
                    <span className="text-slate-400">bash — terminale diagnostico interattivo</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-emerald-400 font-bold shrink-0">
                      {currentQuestion.terminalPrompt || 'operator@zeroday:~$'}
                    </span>
                    {currentQuestion.commandPrefix && (
                      <span className="text-slate-300 font-bold shrink-0">
                        {currentQuestion.commandPrefix}
                      </span>
                    )}
                    <input
                      type="text"
                      maxLength={256}
                      disabled={hasAnswered}
                      value={terminalInputText}
                      onChange={(e) => setTerminalInputText(e.target.value.slice(0, 256))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !hasAnswered) {
                          handleDiagnosticAnswer();
                        }
                      }}
                      placeholder="digita o tocca i comandi sotto..."
                      className="bg-slate-900 border border-slate-700 focus:border-cyan-400 text-cyan-300 px-2 py-1 rounded text-xs flex-1 min-w-[150px] outline-none font-mono"
                    />
                  </div>

                  {terminalStdout && (
                    <div className="mt-2 pt-2 border-t border-white/10 font-mono text-[11px] whitespace-pre-wrap text-emerald-400 bg-black/50 p-2 rounded border border-emerald-500/20">
                      {terminalStdout}
                    </div>
                  )}
                </div>

                {currentQuestion.commandChips && currentQuestion.commandChips.length > 0 && !hasAnswered && (
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 block mb-1 uppercase">
                      Tocca i parametri per assemblare la sintassi:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {currentQuestion.commandChips.map((chip, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            sound.playTap();
                            setTerminalInputText(prev => prev ? `${prev} ${chip}` : chip);
                          }}
                          className="min-h-[34px] px-2.5 py-1.5 rounded-lg bg-surface border border-white/10 hover:border-cyan-400 text-slate-200 hover:text-cyan-300 font-mono text-xs font-semibold transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                        >
                          <span>{chip}</span>
                          <CornerDownLeft className="w-3 h-3 opacity-60 text-cyan-400" />
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          sound.playTap();
                          setTerminalInputText('');
                        }}
                        className="min-h-[34px] px-2.5 py-1.5 rounded-lg bg-red-950/40 border border-red-500/30 hover:border-red-500/60 text-red-400 text-xs font-mono font-bold transition-all active:scale-95 cursor-pointer"
                      >
                        Cancella
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Multiple choice options */}
            {currentQuestion.type !== 'terminal_command' && (
              <div className="space-y-1.5 pt-0.5">
                {currentQuestion.options.map((opt) => {
                  const isSelected = selectedOptionId === opt.id;
                  let optClass = 'bg-surface/80 border-white/10 hover:border-white/20';

                  if (hasAnswered) {
                    if (opt.isCorrect) {
                      optClass = 'bg-emerald-950/60 border-emerald-500 text-emerald-300';
                    } else if (isSelected && !opt.isCorrect) {
                      optClass = 'bg-red-950/60 border-red-500 text-red-300';
                    }
                  } else if (isSelected) {
                    optClass = 'bg-indigo-950/40 border-indigo-500 text-indigo-200';
                  }

                  return (
                    <button
                      key={opt.id}
                      disabled={hasAnswered}
                      onClick={() => setSelectedOptionId(opt.id)}
                      className={`w-full text-left py-2 px-2.5 sm:py-2.5 sm:px-3 rounded-xl border text-[11px] sm:text-xs transition-all flex items-center justify-between cursor-pointer leading-snug ${optClass}`}
                    >
                      <span className="font-mono">{opt.text}</span>
                      {hasAnswered && opt.isCorrect && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Submit or Next Question Action */}
            {!hasAnswered ? (
              <button
                disabled={
                  currentQuestion.type === 'spot_the_zeroday' 
                    ? !selectedLineNum 
                    : currentQuestion.type === 'terminal_command' 
                    ? !terminalInputText.trim() 
                    : !selectedOptionId
                }
                onClick={handleDiagnosticAnswer}
                className="w-full mt-1.5 py-2.5 px-4 rounded-xl font-mono font-bold text-xs text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer shadow-sm"
              >
                {t.verifyAnswerBtn}
              </button>
            ) : (
              <div className="pt-1 animate-fade-in space-y-2">
                <div className={`p-2.5 rounded-xl border text-[11px] ${
                  isAnswerCorrect 
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300' 
                    : 'bg-red-950/40 border-red-500/50 text-red-300'
                }`}>
                  <div className="font-mono font-bold flex items-center gap-1.5 mb-0.5">
                    {isAnswerCorrect ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{t.attackSuccess} (+{currentQuestion.eloReward} ELO)</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                        <span>{t.payloadBlocked}</span>
                      </>
                    )}
                  </div>
                  <p className="text-slate-300 text-[10px] leading-tight">
                    {currentQuestion.options.find(o => o.isCorrect)?.explanation || 'Analisi completata.'}
                  </p>
                </div>

                <button
                  onClick={handleNextDiagnostic}
                  className="w-full py-2.5 px-4 rounded-xl font-mono font-bold text-xs text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{currentDiagIndex < diagQuestions.length - 1 ? t.nextQuestionBtn : t.calcReadinessBtn}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 5: Animated Calculation & Readiness Score */}
        {step === 5 && (
          <div className="space-y-4 text-center animate-fade-in py-1">
            {!calculationComplete ? (
              <div className="space-y-3 py-6">
                <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin" />
                  <Terminal className="w-7 h-7 text-emerald-400 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-mono font-bold text-base sm:text-lg text-white">
                    {t.analyzingVulns}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {t.scanningGaps} ({calculatingProgress}%)
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold">
                  <Check className="w-3.5 h-3.5" />
                  {t.initialEvalComplete}
                </div>

                <div>
                  <div className="flex items-center justify-center gap-2.5 my-1.5">
                    <div className="p-2.5 sm:p-3.5 rounded-xl bg-[#06090F] border border-white/10 text-center min-w-[110px] sm:min-w-[130px]">
                      <span className="text-[9px] sm:text-[10px] text-slate-400 font-mono block">{t.baseReadiness}</span>
                      <span className="text-2xl sm:text-4xl font-mono font-extrabold text-amber-400">
                        {calculatedReadiness}%
                      </span>
                    </div>

                    <ArrowRight className="w-4 h-4 sm:w-6 sm:h-6 text-slate-500 shrink-0" />

                    <div className="p-2.5 sm:p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-center min-w-[110px] sm:min-w-[130px] shadow-neon-emerald">
                      <span className="text-[9px] sm:text-[10px] text-emerald-300 font-mono block">{t.certBenchmark}</span>
                      <span className="text-2xl sm:text-4xl font-mono font-extrabold text-emerald-400">
                        85%+
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-300 max-w-md mx-auto mt-2 leading-relaxed">
                    {t.onboardingSummaryText}
                  </p>
                </div>

                {/* Primary CTA: Launch Paywall */}
                <button
                  onClick={handleFinishOnboarding}
                  className="w-full py-2.5 sm:py-3.5 px-4 rounded-xl font-mono font-extrabold text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 hover:from-emerald-300 hover:to-teal-400 transition-all shadow-neon-emerald flex items-center justify-center gap-2 transform active:scale-98 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 fill-slate-950" />
                  <span>{t.exploreProPlansBtn}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    onComplete({
                      goal: selectedGoal,
                      level: selectedLevel,
                      commitment: dailyTime,
                      readinessScore: calculatedReadiness
                    });
                  }}
                  className="text-xs text-slate-400 hover:text-slate-200 underline font-mono cursor-pointer"
                >
                  {t.continueFreeBtn}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
