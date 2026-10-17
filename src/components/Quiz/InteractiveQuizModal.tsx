import React, { useState, useMemo } from 'react';
import { SkillNode } from '../../types';
import { sound } from '../../utils/soundEngine';
import { shuffleArray } from '../../utils/shuffle';
import { 
  X, CheckCircle2, AlertTriangle, Lock, Sparkles, Terminal, 
  ArrowRight, Cpu, Code, CornerDownLeft, Play 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { executeVirtualCommand } from '../../utils/terminalEngine';

interface InteractiveQuizModalProps {
  node: SkillNode;
  isOpen: boolean;
  onClose: () => void;
  isPro: boolean;
  onOpenPaywall: () => void;
  onCompleteNode: (nodeId: string, gainedXp: number, gainedElo: number) => void;
}

export const InteractiveQuizModal: React.FC<InteractiveQuizModalProps> = ({
  node,
  isOpen,
  onClose,
  isPro,
  onOpenPaywall,
  onCompleteNode
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [selectedLineNum, setSelectedLineNum] = useState<number | null>(null);
  const [terminalInputText, setTerminalInputText] = useState<string>('');
  const [terminalStdout, setTerminalStdout] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [shouldShake, setShouldShake] = useState<boolean>(false);

  const currentQ = node?.questions?.[currentQuestionIndex];

  // Fisher-Yates shuffle options and command chips on every question change
  const shuffledOptions = useMemo(() => {
    return currentQ?.options ? shuffleArray(currentQ.options) : [];
  }, [currentQ]);

  const shuffledChips = useMemo(() => {
    return currentQ?.commandChips ? shuffleArray(currentQ.commandChips) : [];
  }, [currentQ]);

  if (!isOpen || !node?.questions || node.questions.length === 0 || !currentQ) return null;

  const handleChipClick = (chip: string) => {
    sound.playTap();
    setTerminalInputText(prev => (prev ? `${prev} ${chip}` : chip));
  };

  const handleLineClick = (lineNum: number) => {
    if (hasSubmitted) return;
    sound.playTap();
    setSelectedLineNum(lineNum);
  };

  const handleOptionClick = (id: string) => {
    if (hasSubmitted) return;
    sound.playTap();
    setSelectedOptionId(id);
  };

  const handleSubmit = () => {
    let correct = false;

    if (currentQ.type === 'spot_the_zeroday') {
      const vulnLine = currentQ.codeLines?.find(l => l.isVulnerable);
      if (vulnLine && selectedLineNum === vulnLine.lineNum) {
        correct = true;
      }
    } else if (currentQ.type === 'terminal_command') {
      const target = currentQ.commandTarget?.trim().toLowerCase() || '';
      const prefix = currentQ.commandPrefix?.trim().toLowerCase() || '';
      const input = terminalInputText.trim().toLowerCase();
      const combined = `${prefix} ${input}`.trim();
      
      const fullCmd = `${currentQ.commandPrefix ? currentQ.commandPrefix + ' ' : ''}${terminalInputText}`.trim();
      const result = executeVirtualCommand(fullCmd);
      setTerminalStdout(result.output);

      // Check if combined or input matches target or correct option
      const correctOpt = currentQ.options.find(o => o.isCorrect);
      if (
        combined.includes(target) || 
        input.includes(target) || 
        (correctOpt && input.includes(correctOpt.text.trim().toLowerCase()))
      ) {
        correct = true;
      }
    } else {
      const correctOpt = currentQ.options.find(o => o.isCorrect);
      if (correctOpt && selectedOptionId === correctOpt.id) {
        correct = true;
      }
    }

    setIsCorrect(correct);
    setHasSubmitted(true);

    if (correct) {
      sound.playExploitSuccess();
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });
    } else {
      sound.playPayloadBlocked();
      setShouldShake(true);
      setTimeout(() => setShouldShake(false), 500);
    }
  };

  const handleNextOrFinish = () => {
    sound.playTap();
    setHasSubmitted(false);
    setSelectedOptionId(null);
    setSelectedLineNum(null);
    setTerminalInputText('');
    setTerminalStdout(null);

    if (currentQuestionIndex < node.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      onCompleteNode(node.id, node.xpReward, node.eloReward);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className={`relative w-full max-w-2xl my-auto bg-[#131B2E] border border-white/10 rounded-2xl p-5 sm:p-7 shadow-2xl text-slate-100 overflow-hidden transition-transform ${
        shouldShake ? 'animate-shake border-red-500/60' : ''
      }`}>
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold block uppercase tracking-wide">
                LAB INTERATTIVO · {node.domain}
              </span>
              <h3 className="font-bold text-sm sm:text-base text-white">
                {node.title}
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

        {/* Question Stepper */}
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-3">
          <span>SFIDA {currentQuestionIndex + 1} DI {node.questions.length}</span>
          <span className="text-emerald-400 font-bold">+{currentQ.eloReward} ELO · +{currentQ.xpReward} XP</span>
        </div>

        {/* Prompt Header */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            {currentQ.type === 'spot_the_zeroday' && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                SPOT THE ZERO-DAY
              </span>
            )}
            {currentQ.type === 'terminal_command' && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                TERMINAL COMMAND INJECTION
              </span>
            )}
            <span className="text-xs font-mono text-slate-400">Livello: {currentQ.difficulty}</span>
          </div>
          <h4 className="text-sm sm:text-base font-extrabold text-white">
            {currentQ.title}
          </h4>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
            {currentQ.prompt}
          </p>
        </div>

        {/* TYPE 1: Spot the Zero-Day Code Viewer */}
        {currentQ.type === 'spot_the_zeroday' && currentQ.codeLines && (
          <div className="mb-4 rounded-xl bg-[#06090F] border border-white/10 overflow-hidden shadow-inner">
            <div className="bg-slate-900/90 px-3 py-1.5 border-b border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-emerald-400" />
                VULN_INSPECTOR // TOCCA LA RIGA DEL BUG
              </span>
              <span className="text-amber-400 font-bold">TOUCH LINE TO EXPLOIT</span>
            </div>
            <div className="divide-y divide-white/5 font-mono text-xs sm:text-[13px] py-1">
              {currentQ.codeLines.map((line) => {
                const isSelected = selectedLineNum === line.lineNum;
                let lineBg = 'hover:bg-white/5 text-slate-300';

                if (hasSubmitted) {
                  if (line.isVulnerable) {
                    lineBg = 'bg-emerald-950/70 text-emerald-300 border-l-4 border-emerald-400';
                  } else if (isSelected && !line.isVulnerable) {
                    lineBg = 'bg-red-950/70 text-red-300 border-l-4 border-red-500';
                  }
                } else if (isSelected) {
                  lineBg = 'bg-amber-500/25 text-amber-200 border-l-4 border-amber-400';
                }

                return (
                  <div
                    key={line.lineNum}
                    onClick={() => handleLineClick(line.lineNum)}
                    className={`px-3 py-1.5 flex items-start gap-3 cursor-pointer transition-colors ${lineBg}`}
                  >
                    <span className="text-slate-600 select-none w-5 text-right font-mono text-xs pt-0.5">
                      {line.lineNum}
                    </span>
                    <pre className="font-mono overflow-x-auto whitespace-pre-wrap flex-1">{line.code}</pre>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TYPE 2: Terminal Command Interactive Sandbox */}
        {currentQ.type === 'terminal_command' && (
          <div className="mb-4 space-y-3">
            {/* Live Terminal Box */}
            <div className="rounded-xl bg-[#06090F] border border-cyan-500/40 p-3.5 shadow-inner font-mono text-xs text-slate-200">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5 text-[11px] text-slate-400">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <span className="text-slate-400">bash — interactive shell injection</span>
              </div>

              {/* Terminal Prompt Line */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-emerald-400 font-bold shrink-0">
                  {currentQ.terminalPrompt || 'root@zeroday-lab:~#'}
                </span>
                {currentQ.commandPrefix && (
                  <span className="text-slate-300 font-bold shrink-0">
                    {currentQ.commandPrefix}
                  </span>
                )}
                <input
                  type="text"
                  disabled={hasSubmitted}
                  value={terminalInputText}
                  onChange={(e) => setTerminalInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !hasSubmitted) {
                      handleSubmit();
                    }
                  }}
                  placeholder="completa il comando o tocca i chip sotto (Premi Invio per eseguire)..."
                  className="bg-slate-900 border border-slate-700 focus:border-cyan-400 text-cyan-300 px-2 py-1 rounded text-xs flex-1 min-w-[200px] outline-none font-mono"
                />
              </div>

              {/* Real-time Stdout Terminal Simulation */}
              {terminalStdout && (
                <div className="mt-2.5 pt-2 border-t border-white/10 font-mono text-[11px] whitespace-pre-wrap text-emerald-400 bg-black/50 p-2.5 rounded border border-emerald-500/20">
                  {terminalStdout}
                </div>
              )}
            </div>

            {/* Clickable Command Chips (Duolingo/Mimo Style) */}
            {shuffledChips.length > 0 && !hasSubmitted && (
              <div>
                <span className="text-[10px] font-mono text-slate-400 block mb-1.5 uppercase">
                  Tocca i chip per completare il comando:
                </span>
                <div className="flex flex-wrap gap-2">
                  {shuffledChips.map((chip, i) => (
                    <button
                      key={i}
                      onClick={() => handleChipClick(chip)}
                      className="px-2.5 py-1 rounded-lg bg-surface border border-white/10 hover:border-cyan-400 text-slate-300 hover:text-cyan-300 font-mono text-xs transition-all active:scale-95 flex items-center gap-1"
                    >
                      <span>{chip}</span>
                      <CornerDownLeft className="w-3 h-3 opacity-60" />
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      sound.playTap();
                      setTerminalInputText('');
                    }}
                    className="px-2 py-1 rounded-lg bg-red-950/40 border border-red-500/30 text-red-400 text-[11px] font-mono"
                  >
                    Cancella
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TYPE 3: Regular Code Snippet Viewer */}
        {currentQ.codeSnippet && currentQ.type !== 'spot_the_zeroday' && currentQ.type !== 'terminal_command' && (
          <div className="mb-4 rounded-xl bg-[#06090F] border border-white/10 p-3 overflow-x-auto text-xs font-mono text-slate-300 shadow-inner">
            <pre>{currentQ.codeSnippet}</pre>
          </div>
        )}

        {/* Options Selector for multiple choice or fallback */}
        {currentQ.type !== 'terminal_command' && (
          <div className="space-y-2 mb-4">
            {shuffledOptions.map((opt) => {
              const isSelected = selectedOptionId === opt.id;
              let optStyle = 'bg-surface/80 border-white/10 hover:border-white/20 text-slate-200';

              if (hasSubmitted) {
                if (opt.isCorrect) {
                  optStyle = 'bg-emerald-950/60 border-emerald-500 text-emerald-300';
                } else if (isSelected && !opt.isCorrect) {
                  optStyle = 'bg-red-950/60 border-red-500 text-red-300';
                }
              } else if (isSelected) {
                optStyle = 'bg-indigo-950/50 border-indigo-500 text-indigo-200';
              }

              return (
                <button
                  key={opt.id}
                  disabled={hasSubmitted}
                  onClick={() => handleOptionClick(opt.id)}
                  className={`w-full text-left p-3 rounded-xl border text-xs sm:text-sm transition-all flex items-center justify-between ${optStyle}`}
                >
                  <span className="font-mono">{opt.text}</span>
                  {hasSubmitted && opt.isCorrect && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Trigger Paywall 2: Blurred Technical Breakdown */}
        {hasSubmitted && (
          <div className="mb-4 animate-fade-in">
            {/* Status Feedback Banner */}
            <div className={`p-3 rounded-xl border text-xs mb-3 flex items-center justify-between ${
              isCorrect 
                ? 'bg-emerald-950/50 border-emerald-500/60 text-emerald-300' 
                : 'bg-red-950/50 border-red-500/60 text-red-300'
            }`}>
              <div className="flex items-center gap-2">
                {isCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                )}
                <span className="font-mono font-bold text-sm">
                  {isCorrect ? 'EXPLOIT ESEGUITO CON SUCCESSO (+ ELO)' : 'PAYLOAD BLOCCATO / RISPOSTA ERRATA'}
                </span>
              </div>
            </div>

            {/* Root Cause & Technical Breakdown Box */}
            <div className="relative rounded-xl border border-white/10 bg-[#090D16] p-4 overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  <span className="font-mono font-bold text-xs text-white uppercase tracking-wider">
                    Root Cause & Technical Breakdown
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {currentQ.rootCauseBreakdown.cveOrTopic}
                </span>
              </div>

              {/* Free User = Blur + Lock overlay */}
              {!isPro ? (
                <div className="relative">
                  <div className="filter blur-sm select-none opacity-40 space-y-2 text-xs font-mono">
                    <p>
                      <strong>Meccanica dell'Exploit:</strong> {currentQ.rootCauseBreakdown.whyItWorks}
                    </p>
                    <p>
                      <strong>Mitigazione Consigliata:</strong> {currentQ.rootCauseBreakdown.patchRecommendation}
                    </p>
                    <div className="bg-black p-2 rounded text-[11px]">
                      {currentQ.rootCauseBreakdown.terminalProof}
                    </div>
                  </div>

                  {/* Backdrop Blur Lock Overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-center rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-2">
                      <Lock className="w-4 h-4" />
                    </div>
                    <span className="font-mono font-bold text-xs text-white mb-1">
                      ANALISI TECNICA & COMANDI TERMINALE RISERVATI PRO
                    </span>
                    <p className="text-[11px] text-slate-300 max-w-xs mb-3">
                      Sblocca la spiegazione dettagliata del registro di memoria, comandi PoC ed esatte regole di mitigazione.
                    </p>
                    <button
                      onClick={() => {
                        sound.playTap();
                        onOpenPaywall();
                      }}
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-mono font-extrabold text-xs shadow-neon-emerald flex items-center gap-1.5 transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>SBLOCCA BREAKDOWN CON ZERODAY PRO</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Pro User = Full unredacted technical breakdown */
                <div className="space-y-2.5 text-xs font-mono text-slate-200 animate-fade-in">
                  <div>
                    <span className="text-emerald-400 font-bold block mb-0.5">PERCHÉ FUNZIONA QUESTO EXPLOIT:</span>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {currentQ.rootCauseBreakdown.whyItWorks}
                    </p>
                  </div>
                  <div>
                    <span className="text-indigo-400 font-bold block mb-0.5">PATCH & HARDENING:</span>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {currentQ.rootCauseBreakdown.patchRecommendation}
                    </p>
                  </div>
                  <div>
                    <span className="text-amber-400 font-bold block mb-0.5">TERMINAL PROOF OF CONCEPT (PoC):</span>
                    <div className="bg-[#04060A] border border-white/10 rounded p-2 text-[11px] text-emerald-300 overflow-x-auto">
                      <pre>{currentQ.rootCauseBreakdown.terminalProof}</pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom Action Button */}
        {!hasSubmitted ? (
          <button
            disabled={
              currentQ.type === 'spot_the_zeroday' 
                ? !selectedLineNum 
                : currentQ.type === 'terminal_command' 
                ? !terminalInputText.trim() 
                : !selectedOptionId
            }
            onClick={handleSubmit}
            className="w-full py-3.5 px-4 rounded-xl font-mono font-extrabold text-xs sm:text-sm text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-neon-emerald flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>ESEGUI COMANDO / VERIFICA EXPLOIT</span>
          </button>
        ) : (
          <button
            onClick={handleNextOrFinish}
            className="w-full py-3.5 px-4 rounded-xl font-mono font-extrabold text-xs sm:text-sm text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-all flex items-center justify-center gap-2 shadow-neon-emerald"
          >
            <span>{currentQuestionIndex < node.questions.length - 1 ? 'PROSSIMA SFIDA' : 'COMPLETA MODULO & RISCATTA XP'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
