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
    chosenUsername?: string;
    profession?: string;
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
  const [customCallsign, setCustomCallsign] = useState<string>('');

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
      readinessScore: calculatedReadiness,
      chosenUsername: customCallsign.trim() || undefined,
      profession: goals.find(g => g.id === selectedGoal)?.title
    });
    // Trigger Paywall 1
    onOpenPaywall();
  };

  return (
    <div className="min-h-screen bg-[#060A12] text-zinc-100 flex flex-col justify-center items-center px-4 py-8 sm:py-12 select-none safe-top safe-bottom">
      <div className="w-full max-w-md bg-[#0D121D] border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-xl relative space-y-6">
        {/* Header Progress Stepper & Language Switcher */}
        <div>
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-2.5">
            <span className="font-bold text-zinc-300">0xDAY // ONBOARDING</span>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-zinc-500 font-mono">{step} / 5</span>
              <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-lg border border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    sound.playTap();
                    setLanguage('en');
                  }}
                  className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold transition-colors ${
                    lang === 'en' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'
                  }`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sound.playTap();
                    setLanguage('it');
                  }}
                  className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold transition-colors ${
                    lang === 'it' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'
                  }`}
                >
                  IT
                </button>
              </div>
            </div>
          </div>
          <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-400 h-full transition-all duration-300"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* STEP 1: Goal Selection */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {t.onboardingStep1Title}
              </h1>
            </div>

            <div className="space-y-3">
              {goals.map((g) => {
                const Icon = g.icon;
                const isSelected = selectedGoal === g.id;
                return (
                  <div
                    key={g.id}
                    onClick={() => {
                      sound.playTap();
                      setSelectedGoal(g.id);
                    }}
                    className={`p-4 rounded-xl border transition-colors flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-zinc-800/80 border-emerald-500 text-white'
                        : 'bg-zinc-900/40 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <Icon className={`w-5 h-5 shrink-0 ${isSelected ? 'text-emerald-400' : 'text-zinc-400'}`} />
                      <span className="text-sm font-bold text-white leading-snug">{g.title}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => {
                sound.playTap();
                setStep(2);
              }}
              className="w-full py-3.5 px-4 rounded-xl font-mono font-bold text-xs text-zinc-950 bg-emerald-500 hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{t.continueBtn}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: Current Experience Level */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {t.onboardingStep2Title}
              </h2>
            </div>

            <div className="space-y-3">
              {levels.map((lvl) => {
                const isSelected = selectedLevel === lvl.id;
                const shortTitle = lvl.id === 'beginner'
                  ? (lang === 'it' ? 'Principiante' : 'Beginner')
                  : lvl.id === 'intermediate'
                  ? (lang === 'it' ? 'Intermedio (Dev / Sysadmin)' : 'Intermediate (Dev / Sysadmin)')
                  : (lang === 'it' ? 'Avanzato (Pentester / SOC)' : 'Advanced (Pentester / SOC)');

                const shortDesc = lvl.id === 'beginner' 
                  ? (lang === 'it' ? 'Nessuna esperienza precedente con exploit o reti' : 'No prior exploit or networking experience')
                  : lvl.id === 'intermediate'
                  ? (lang === 'it' ? 'Uso Linux o sviluppo, conosco i protocolli di rete' : 'Regular Linux/dev usage, know network protocols')
                  : (lang === 'it' ? 'Pratica su laboratori pratici o analisi SOC' : 'Hands-on lab practice or SOC analysis');

                return (
                  <div
                    key={lvl.id}
                    onClick={() => {
                      sound.playTap();
                      setSelectedLevel(lvl.id);
                    }}
                    className={`p-4 rounded-xl border transition-colors flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-zinc-800/80 border-emerald-500'
                        : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <h3 className="text-sm font-bold text-white mb-0.5">{shortTitle}</h3>
                      <p className="text-xs text-zinc-400">{shortDesc}</p>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-3" />}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => {
                  sound.playTap();
                  setStep(1);
                }}
                className="py-3 px-4 rounded-xl font-mono text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                {t.backBtn}
              </button>
              <button
                onClick={() => {
                  sound.playTap();
                  setStep(3);
                }}
                className="flex-1 py-3.5 px-4 rounded-xl font-mono font-bold text-xs text-zinc-950 bg-emerald-500 hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{t.continueBtn}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Daily Commitment */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {t.onboardingStep3Title}
              </h2>
            </div>

            <div className="space-y-3">
              {commitments.map((c) => {
                const isSelected = dailyTime === c.minutes;
                return (
                  <div
                    key={c.minutes}
                    onClick={() => {
                      sound.playTap();
                      setDailyTime(c.minutes);
                    }}
                    className={`p-4 rounded-xl border transition-colors flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-zinc-800/80 border-emerald-500 text-white'
                        : 'bg-zinc-900/40 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono font-bold text-sm text-white">{c.label}</span>
                        {c.recommended && (
                          <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                            {t.recommendedBadge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400">{c.desc}</p>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-3" />}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => {
                  sound.playTap();
                  setStep(2);
                }}
                className="py-3 px-4 rounded-xl font-mono text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                {t.backBtn}
              </button>
              <button
                onClick={() => {
                  sound.playTap();
                  setStep(4);
                }}
                className="flex-1 py-3.5 px-4 rounded-xl font-mono font-bold text-xs text-zinc-950 bg-emerald-500 hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{t.nextScenarioBtn}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Live Diagnostic Benchmark */}
        {step === 4 && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                  {currentQuestion.domain}
                </span>
                <span className="text-xs text-zinc-400 font-mono">
                  {t.challenge} {currentDiagIndex + 1}/{diagQuestions.length}
                </span>
              </div>
              <span className="text-xs font-mono text-emerald-400 font-bold">
                {t.liveScore} {userScore}/{diagQuestions.length}
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-white leading-tight">
                {currentQuestion.title}
              </h3>
              <p className="text-xs text-zinc-400 mt-1 leading-normal">
                {currentQuestion.prompt}
              </p>
            </div>

            {/* Code / Packet Snippet display */}
            {currentQuestion.codeSnippet && !currentQuestion.codeLines && currentQuestion.type !== 'terminal_command' && (
              <div className="rounded-xl bg-[#090D17] border border-zinc-800 p-3 overflow-x-auto text-xs font-mono text-zinc-300 max-h-32 overflow-y-auto">
                <pre className="whitespace-pre-wrap">{currentQuestion.codeSnippet}</pre>
              </div>
            )}

            {/* Spot the Zero-Day line picker */}
            {currentQuestion.codeLines && (
              <div className="rounded-xl bg-[#090D17] border border-zinc-800 p-2 overflow-hidden max-h-36 overflow-y-auto">
                <div className="text-[10px] font-mono text-zinc-500 px-2 py-1 border-b border-zinc-800 flex items-center justify-between">
                  <span>{t.tapVulnerableLine}</span>
                  <span className="text-amber-400">{t.clickToSelect}</span>
                </div>
                <div className="divide-y divide-zinc-800/60 font-mono text-xs">
                  {currentQuestion.codeLines.map((line) => {
                    const isSelected = selectedLineNum === line.lineNum;
                    return (
                      <div
                        key={line.lineNum}
                        onClick={() => !hasAnswered && setSelectedLineNum(line.lineNum)}
                        className={`px-2.5 py-1.5 flex items-center gap-2.5 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-amber-500/20 text-amber-300 border-l-2 border-amber-400'
                            : 'hover:bg-zinc-800/50 text-zinc-300'
                        }`}
                      >
                        <span className="text-zinc-600 select-none w-4 text-right text-[10px]">
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
              <div className="space-y-3">
                <div className="rounded-xl bg-[#090D17] border border-zinc-800 p-3 sm:p-4 font-mono text-xs text-zinc-200">
                  <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-zinc-800 text-[11px] text-zinc-400">
                    <span className="text-zinc-300 font-mono font-bold tracking-wider text-xs">TTY1 // SANDBOX</span>
                    <div className="flex items-center gap-1.5 font-mono text-[10px] text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>ONLINE</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 bg-zinc-950 p-2 rounded-lg border border-zinc-800">
                    <span className="text-emerald-400 font-bold shrink-0 text-xs">
                      {currentQuestion.terminalPrompt || 'operator@zeroday:~$'}
                    </span>
                    {currentQuestion.commandPrefix && (
                      <span className="text-white font-bold shrink-0 text-xs">
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
                      placeholder="digita comando..."
                      className="bg-transparent text-emerald-300 px-2 py-1 rounded text-xs flex-1 min-w-[140px] outline-none font-mono"
                    />
                  </div>

                  {terminalStdout && (
                    <div className="mt-2.5 pt-2 border-t border-zinc-800 font-mono text-xs whitespace-pre-wrap text-emerald-300 bg-zinc-950 p-2.5 rounded-lg">
                      {terminalStdout}
                    </div>
                  )}
                </div>

                {currentQuestion.commandChips && currentQuestion.commandChips.length > 0 && !hasAnswered && (
                  <div>
                    <div className="flex flex-wrap gap-1.5">
                      {currentQuestion.commandChips.map((chip, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            sound.playTap();
                            setTerminalInputText(prev => prev ? `${prev} ${chip}` : chip);
                          }}
                          className="min-h-[32px] px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 font-mono text-xs font-semibold transition-colors cursor-pointer"
                        >
                          {chip}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          sound.playTap();
                          setTerminalInputText('');
                        }}
                        className="min-h-[32px] px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white text-xs font-mono transition-colors cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Multiple choice options */}
            {currentQuestion.type !== 'terminal_command' && (
              <div className="space-y-2 pt-1">
                {currentQuestion.options.map((opt) => {
                  const isSelected = selectedOptionId === opt.id;
                  let optClass = 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 text-zinc-200';

                  if (hasAnswered) {
                    if (opt.isCorrect) {
                      optClass = 'bg-emerald-950/60 border-emerald-500 text-emerald-300';
                    } else if (isSelected && !opt.isCorrect) {
                      optClass = 'bg-rose-950/60 border-rose-500 text-rose-300';
                    }
                  } else if (isSelected) {
                    optClass = 'bg-zinc-800 border-emerald-500 text-white';
                  }

                  return (
                    <button
                      key={opt.id}
                      disabled={hasAnswered}
                      onClick={() => setSelectedOptionId(opt.id)}
                      className={`w-full text-left py-3 px-3.5 rounded-xl border text-xs transition-colors flex items-center justify-between cursor-pointer ${optClass}`}
                    >
                      <span className="font-mono">{opt.text}</span>
                      {hasAnswered && opt.isCorrect && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
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
                className="w-full mt-2 py-3 px-4 rounded-xl font-mono font-bold text-xs text-zinc-950 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
              >
                {t.verifyAnswerBtn}
              </button>
            ) : (
              <div className="pt-1 animate-fade-in space-y-2.5">
                <div className={`p-3 rounded-xl border text-xs ${
                  isAnswerCorrect 
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                }`}>
                  <div className="font-mono font-bold flex items-center gap-1.5 mb-1">
                    {isAnswerCorrect ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>{t.attackSuccess} (+{currentQuestion.eloReward} ELO)</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        <span>{t.payloadBlocked}</span>
                      </>
                    )}
                  </div>
                  <p className="text-zinc-400 text-xs">
                    {currentQuestion.options.find(o => o.isCorrect)?.explanation || 'Analisi completata.'}
                  </p>
                </div>

                <button
                  onClick={handleNextDiagnostic}
                  className="w-full py-3 px-4 rounded-xl font-mono font-bold text-xs text-zinc-950 bg-emerald-500 hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{currentDiagIndex < diagQuestions.length - 1 ? t.nextQuestionBtn : t.calcReadinessBtn}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 5: Animated Calculation & Readiness Score */}
        {step === 5 && (
          <div className="space-y-6 text-center animate-fade-in">
            {!calculationComplete ? (
              <div className="space-y-4 py-8">
                <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin" />
                  <Terminal className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-mono font-bold text-base text-white">
                    {t.analyzingVulns}
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono mt-1">
                    {t.scanningGaps} ({calculatingProgress}%)
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-center gap-3 my-2">
                    <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-center min-w-[120px]">
                      <span className="text-[10px] text-zinc-400 font-mono block mb-1">{t.baseReadiness}</span>
                      <span className="text-3xl font-mono font-bold text-amber-400">
                        {calculatedReadiness}%
                      </span>
                    </div>

                    <ArrowRight className="w-4 h-4 text-zinc-600 shrink-0" />

                    <div className="p-4 rounded-xl bg-zinc-900 border border-emerald-500/40 text-center min-w-[120px]">
                      <span className="text-[10px] text-emerald-400 font-mono block mb-1">{t.certBenchmark}</span>
                      <span className="text-3xl font-mono font-bold text-emerald-400">
                        85%+
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-2 leading-relaxed">
                    {t.onboardingSummaryText}
                  </p>
                </div>

                {/* Username Selection */}
                <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-left space-y-2">
                  <label className="text-xs font-mono font-bold text-zinc-300 block">
                    {lang === 'it' ? 'Username / Callsign:' : 'Username / Callsign:'}
                  </label>
                  <input
                    type="text"
                    value={customCallsign}
                    onChange={(e) => setCustomCallsign(e.target.value)}
                    placeholder={lang === 'it' ? 'Es. DarkMatteo, Shadow_Op' : 'e.g. DarkMatteo, Shadow_Op'}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-emerald-500 text-sm text-white font-mono"
                  />
                </div>

                {/* Actions */}
                <div className="space-y-2.5">
                  <button
                    onClick={handleFinishOnboarding}
                    className="w-full py-3.5 px-4 rounded-xl font-mono font-bold text-xs text-zinc-950 bg-emerald-500 hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>{t.exploreProPlansBtn}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      onComplete({
                        goal: selectedGoal,
                        level: selectedLevel,
                        commitment: dailyTime,
                        readinessScore: calculatedReadiness,
                        chosenUsername: customCallsign.trim() || undefined,
                        profession: goals.find(g => g.id === selectedGoal)?.title
                      });
                    }}
                    className="w-full py-2 text-xs text-zinc-400 hover:text-white font-mono transition-colors cursor-pointer"
                  >
                    {t.continueFreeBtn}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
