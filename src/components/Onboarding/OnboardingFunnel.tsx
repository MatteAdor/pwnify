import React, { useState, useEffect } from 'react';
import { getDiagnosticQuestionsForLevel } from '../../data/diagnosticQuestions';
import { HardcoreQuestion } from '../../types';
import { 
  Shield, CheckCircle2, AlertTriangle, ArrowRight, Terminal, 
  Cpu, Target, Sparkles, Check 
} from 'lucide-react';
import confetti from 'canvas-confetti';

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
  const [step, setStep] = useState<number>(1);
  const [selectedGoal, setSelectedGoal] = useState<string>('comptia_sec');
  const [selectedLevel, setSelectedLevel] = useState<string>('intermediate');
  const [dailyTime, setDailyTime] = useState<number>(15);

  // Diagnostic Quiz State
  const [diagQuestions, setDiagQuestions] = useState<HardcoreQuestion[]>(() => getDiagnosticQuestionsForLevel('intermediate'));
  const [currentDiagIndex, setCurrentDiagIndex] = useState<number>(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [selectedLineNum, setSelectedLineNum] = useState<number | null>(null);
  const [userScore, setUserScore] = useState<number>(0);
  const [hasAnswered, setHasAnswered] = useState<boolean>(false);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean>(false);

  // Recalculate dynamic difficulty questions whenever level changes
  useEffect(() => {
    setDiagQuestions(getDiagnosticQuestionsForLevel(selectedLevel));
    setCurrentDiagIndex(0);
    setUserScore(0);
    setSelectedOptionId(null);
    setHasAnswered(false);
  }, [selectedLevel]);

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
      title: 'Passare CompTIA Security+ / CCNA / CEH',
      desc: 'Obiettivo certificazione IT: simulazione domande d\'esame PBQs e laboratori pratici',
      icon: Shield,
      badge: 'CERTIFIED'
    },
    {
      id: 'web_hacking',
      title: 'Web Hacking & Bug Bounty Hunter',
      desc: 'OWASP Top 10, SQLi, XSS, SSRF, IDOR e bypass di Web Application Firewall',
      icon: Target,
      badge: 'OFFENSIVE'
    },
    {
      id: 'linux_bash',
      title: 'Linux Kernel & Bash Scripting Mastery',
      desc: 'Privilege escalation, GTFOBins, automazione cron, analisi dei permessi e rootkit',
      icon: Terminal,
      badge: 'SYSTEMS'
    },
    {
      id: 'soc_blue',
      title: 'SOC Analyst & Blue Team Defense',
      desc: 'Threat hunting, analisi pacchetti Wireshark, SIEM alert e rilevamento C2 beacon',
      icon: Cpu,
      badge: 'DEFENSIVE'
    }
  ];

  const levels = [
    {
      id: 'beginner',
      title: 'Script Kiddie / Principiante',
      desc: 'Conosco le basi del computer, ma non ho mai eseguito exploit né configurato VLAN.'
    },
    {
      id: 'intermediate',
      title: 'Sysadmin / Sviluppatore / Studente',
      desc: 'Uso regolarmente Linux o programmo, conosco i protocolli TCP/IP ma non ho esperienza di hacking offensivo.'
    },
    {
      id: 'advanced',
      title: 'Junior Pentester / SOC Analyst',
      desc: 'Ho già fatto lab su TryHackMe / HackTheBox e voglio massimizzare velocità e accuratezza.'
    }
  ];

  const commitments = [
    { minutes: 5, label: '5 min / giorno', desc: 'Audit Rapido (1 modulo al giorno)' },
    { minutes: 15, label: '15 min / giorno', desc: 'Red Teamer Drill (Consigliato per certificazioni)', recommended: true },
    { minutes: 30, label: '30 min / giorno', desc: 'ZeroDay Grind (Preparazione intensiva in 21 giorni)' }
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
    <div className="min-h-screen bg-[#090D16] bg-grid-cyber flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-xl bg-[#131B2E] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Glow corner */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header Progress Stepper */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
            <span className="text-emerald-400 font-bold">FASE 1: DIAGNOSTIC AUDIT</span>
            <span>STEP {step} DI 5</span>
          </div>
          <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-300"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* STEP 1: Obiettivo */}
        {step === 1 && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white">
                Qual è il tuo obiettivo primario di sicurezza?
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                ZeroDay adatterà i vettori di attacco e le simulazioni di terminale al tuo percorso.
              </p>
            </div>

            <div className="space-y-2.5">
              {goals.map((g) => {
                const Icon = g.icon;
                const isSelected = selectedGoal === g.id;
                return (
                  <div
                    key={g.id}
                    onClick={() => setSelectedGoal(g.id)}
                    className={`cursor-pointer p-4 rounded-xl border transition-all flex items-start gap-3.5 ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-500 shadow-neon-emerald'
                        : 'bg-surface/70 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className={`p-2.5 rounded-lg ${isSelected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold text-white leading-tight">{g.title}</h2>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {g.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{g.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full py-3.5 px-4 rounded-xl font-mono font-bold text-sm text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-all flex items-center justify-center gap-2 shadow-neon-emerald"
            >
              <span>CONTINUA</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: Livello attuale */}
        {step === 2 && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                Qual è la tua esperienza attuale con la riga di comando?
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Calibreremo la complessità dei laboratori di reverse engineering e dei pacchetti di rete.
              </p>
            </div>

            <div className="space-y-2.5">
              {levels.map((lvl) => {
                const isSelected = selectedLevel === lvl.id;
                return (
                  <div
                    key={lvl.id}
                    onClick={() => setSelectedLevel(lvl.id)}
                    className={`cursor-pointer p-4 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500 shadow-neon-indigo'
                        : 'bg-surface/70 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-bold text-white">{lvl.title}</h3>
                      {isSelected && <Check className="w-4 h-4 text-indigo-400" />}
                    </div>
                    <p className="text-xs text-slate-400">{lvl.desc}</p>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="py-3 px-4 rounded-xl font-mono text-xs text-slate-400 hover:text-white border border-white/10"
              >
                Indietro
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-3.5 px-4 rounded-xl font-mono font-bold text-sm text-slate-950 bg-indigo-500 hover:bg-indigo-400 transition-all flex items-center justify-center gap-2 shadow-neon-indigo"
              >
                <span>CONTINUA</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Tempo giornaliero */}
        {step === 3 && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                Quanto tempo puoi dedicare all'addestramento?
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                La costanza giornaliera preserva la streak e consolida le difese cognitive.
              </p>
            </div>

            <div className="space-y-2.5">
              {commitments.map((c) => {
                const isSelected = dailyTime === c.minutes;
                return (
                  <div
                    key={c.minutes}
                    onClick={() => setDailyTime(c.minutes)}
                    className={`cursor-pointer p-4 rounded-xl border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-500 shadow-neon-emerald'
                        : 'bg-surface/70 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-white">{c.label}</span>
                        {c.recommended && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                            CONSIGLIATO
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{c.desc}</p>
                    </div>
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="py-3 px-4 rounded-xl font-mono text-xs text-slate-400 hover:text-white border border-white/10"
              >
                Indietro
              </button>
              <button
                onClick={() => setStep(4)}
                className="flex-1 py-3.5 px-4 rounded-xl font-mono font-bold text-sm text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-all flex items-center justify-center gap-2 shadow-neon-emerald"
              >
                <span>AVVIA SFIDA DIAGNOSTICA (3 DOMANDE)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Mini-Sfida Diagnostica Live (3 domande hardcore) */}
        {step === 4 && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  {currentQuestion.domain}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Sfida {currentDiagIndex + 1} di {diagQuestions.length}
                </span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400">
                Punteggio live: {userScore}/{diagQuestions.length}
              </span>
            </div>

            <div>
              <h3 className="text-base font-bold text-white">
                {currentQuestion.title}
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                {currentQuestion.prompt}
              </p>
            </div>

            {/* Code / Packet Snippet display */}
            {currentQuestion.codeSnippet && !currentQuestion.codeLines && (
              <div className="rounded-lg bg-[#06090F] border border-white/10 p-3 overflow-x-auto text-xs font-mono text-slate-300 shadow-inner">
                <pre>{currentQuestion.codeSnippet}</pre>
              </div>
            )}

            {/* Spot the Zero-Day line picker */}
            {currentQuestion.codeLines && (
              <div className="rounded-lg bg-[#06090F] border border-white/10 p-2 overflow-hidden shadow-inner">
                <div className="text-[10px] font-mono text-slate-500 px-2 py-1 border-b border-white/5 flex items-center justify-between">
                  <span>TERMINAL_VIEWER // TOCCA LA RIGA VULNERABILE</span>
                  <span className="text-amber-400">CLICK TO SELECT</span>
                </div>
                <div className="divide-y divide-white/5 font-mono text-xs">
                  {currentQuestion.codeLines.map((line) => {
                    const isSelected = selectedLineNum === line.lineNum;
                    return (
                      <div
                        key={line.lineNum}
                        onClick={() => !hasAnswered && setSelectedLineNum(line.lineNum)}
                        className={`px-2.5 py-1.5 flex items-center gap-3 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-amber-500/20 text-amber-300 border-l-2 border-amber-400'
                            : 'hover:bg-white/5 text-slate-300'
                        }`}
                      >
                        <span className="text-slate-600 select-none w-4 text-right text-[11px]">
                          {line.lineNum}
                        </span>
                        <span className="truncate">{line.code}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Multiple choice options */}
            <div className="space-y-2 pt-1">
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
                    className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-center justify-between ${optClass}`}
                  >
                    <span className="font-mono">{opt.text}</span>
                    {hasAnswered && opt.isCorrect && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Submit or Next Question Action */}
            {!hasAnswered ? (
              <button
                disabled={currentQuestion.type === 'spot_the_zeroday' ? !selectedLineNum : !selectedOptionId}
                onClick={handleDiagnosticAnswer}
                className="w-full mt-2 py-3 px-4 rounded-xl font-mono font-bold text-xs text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-neon-emerald"
              >
                VERIFICA RISPOSTA
              </button>
            ) : (
              <div className="pt-2 animate-fade-in space-y-3">
                <div className={`p-3 rounded-xl border text-xs ${
                  isAnswerCorrect 
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300' 
                    : 'bg-red-950/40 border-red-500/50 text-red-300'
                }`}>
                  <div className="font-mono font-bold flex items-center gap-1.5 mb-1">
                    {isAnswerCorrect ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>ATTACCO RIUSCITO (+{currentQuestion.eloReward} ELO)</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        <span>PAYLOAD INTERCETTATO / RISPOSTA ERRATA</span>
                      </>
                    )}
                  </div>
                  <p className="text-slate-300 text-[11px]">
                    {currentQuestion.options.find(o => o.isCorrect)?.explanation || 'Analisi completata.'}
                  </p>
                </div>

                <button
                  onClick={handleNextDiagnostic}
                  className="w-full py-3 px-4 rounded-xl font-mono font-bold text-xs text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-all flex items-center justify-center gap-2"
                >
                  <span>{currentDiagIndex < diagQuestions.length - 1 ? 'PROSSIMA DOMANDA' : 'CALCOLA READINESS SCORE'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 5: Schermata Animata di Calcolo & Readiness Score */}
        {step === 5 && (
          <div className="space-y-6 text-center animate-fade-in py-2">
            {!calculationComplete ? (
              <div className="space-y-4 py-8">
                <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin" />
                  <Terminal className="w-8 h-8 text-emerald-400 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-mono font-bold text-lg text-white">
                    ANALISI VULNERABILITÀ IN CORSO...
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-1">
                    Scansione lacune su OWASP Top 10, TCP/IP, Linux Kernel ({calculatingProgress}%)
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold">
                  <Check className="w-3.5 h-3.5" />
                  VALUTAZIONE TECNICA INIZIALE COMPLETATA
                </div>

                <div>
                  <div className="flex items-center justify-center gap-4 my-2">
                    <div className="p-4 rounded-2xl bg-[#06090F] border border-white/10 text-center min-w-[130px]">
                      <span className="text-[10px] text-slate-400 font-mono block">READINESS BASE</span>
                      <span className="text-3xl sm:text-4xl font-mono font-extrabold text-amber-400">
                        {calculatedReadiness}%
                      </span>
                    </div>

                    <ArrowRight className="w-6 h-6 text-slate-500 shrink-0" />

                    <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-center min-w-[130px] shadow-neon-emerald">
                      <span className="text-[10px] text-emerald-300 font-mono block">BENCHMARK CERT</span>
                      <span className="text-3xl sm:text-4xl font-mono font-extrabold text-emerald-400">
                        85%+
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 max-w-md mx-auto mt-3 leading-relaxed">
                    Il test diagnostico ha mappato le tue competenze attuali. I percorsi pratici su <span className="text-emerald-400 font-bold">CompTIA Security+</span>, <span className="text-emerald-400 font-bold">CCNA</span> e <span className="text-emerald-400 font-bold">CEH</span> ti guideranno passo dopo passo nel consolidamento di exploit, networking e contromisure difensive.
                  </p>
                </div>

                {/* Primary CTA: Launch Paywall */}
                <button
                  onClick={handleFinishOnboarding}
                  className="w-full py-4 px-4 rounded-xl font-mono font-extrabold text-sm sm:text-base text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 hover:from-emerald-300 hover:to-teal-400 transition-all shadow-neon-emerald flex items-center justify-center gap-2 transform active:scale-98"
                >
                  <Sparkles className="w-4 h-4 fill-slate-950" />
                  <span>ESPLORA IL PERCORSO & PIANI PRO</span>
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
                  className="text-xs text-slate-400 hover:text-slate-200 underline font-mono"
                >
                  Continua con l'account Free
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
