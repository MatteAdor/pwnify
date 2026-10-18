import React, { useState, useMemo } from 'react';
import { SkillNode } from '../../types';
import { sound } from '../../utils/soundEngine';
import { shuffleArray } from '../../utils/shuffle';
import { getLessonBriefing } from '../../data/lessonBriefings';
import { 
  X, CheckCircle2, AlertTriangle, Lock, Sparkles, Terminal, 
  ArrowRight, Cpu, Code, CornerDownLeft, Play, BookOpen, 
  Shield, Award, Check, RotateCcw, ChevronRight 
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
  // Lesson view phases: 'briefing' -> 'quiz' -> 'completed'
  const [viewPhase, setViewPhase] = useState<'briefing' | 'quiz' | 'completed'>('briefing');
  const [isBriefingDrawerOpen, setIsBriefingDrawerOpen] = useState<boolean>(false);

  // Quiz state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [selectedLineNum, setSelectedLineNum] = useState<number | null>(null);
  const [terminalInputText, setTerminalInputText] = useState<string>('');
  const [terminalStdout, setTerminalStdout] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [shouldShake, setShouldShake] = useState<boolean>(false);
  const [correctCount, setCorrectCount] = useState<number>(0);

  // Lesson Briefing data
  const briefing = useMemo(() => {
    return getLessonBriefing(node?.id || '', node?.title, node?.domain);
  }, [node?.id, node?.title, node?.domain]);

  const currentQ = node?.questions?.[currentQuestionIndex];

  // Fisher-Yates shuffle options and command chips only when question changes
  const shuffledOptions = useMemo(() => {
    return currentQ?.options ? shuffleArray(currentQ.options) : [];
  }, [currentQ?.id]);

  const shuffledChips = useMemo(() => {
    return currentQ?.commandChips ? shuffleArray(currentQ.commandChips) : [];
  }, [currentQ?.id]);

  if (!isOpen || !node?.questions || node.questions.length === 0) return null;

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
    if (!currentQ) return;
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
      setCorrectCount(prev => prev + 1);
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
      setViewPhase('completed');
      sound.playVictoryFanfare();
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.5 }
      });
    }
  };

  const handleFinalClaim = () => {
    sound.playTap();
    onCompleteNode(node.id, node.xpReward, node.eloReward);
    onClose();
  };

  const handleResetLesson = () => {
    sound.playTap();
    setCurrentQuestionIndex(0);
    setCorrectCount(0);
    setSelectedOptionId(null);
    setSelectedLineNum(null);
    setTerminalInputText('');
    setTerminalStdout(null);
    setHasSubmitted(false);
    setViewPhase('briefing');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden animate-fade-in font-sans">
      <div className={`relative w-full max-w-2xl bg-[#0D131F] border border-white/10 rounded-2xl p-3.5 sm:p-5 shadow-2xl text-slate-100 max-h-[92vh] flex flex-col overflow-hidden transition-transform ${
        shouldShake ? 'animate-shake border-red-500/60' : ''
      }`}>

        {/* ================================================================= */}
        {/* PHASE 1: BRIEFING TATTICO DELLA LEZIONE (GUIDED THEORY BRIEFING)  */}
        {/* ================================================================= */}
        {viewPhase === 'briefing' && (
          <div className="flex flex-col h-full overflow-hidden animate-fade-in space-y-3">
            {/* Briefing Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold block uppercase tracking-wide">
                    {briefing.badge}
                  </span>
                  <h3 className="font-bold text-sm sm:text-base text-white truncate max-w-[260px] sm:max-w-none">
                    {node.title}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => {
                  sound.playTap();
                  onClose();
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Briefing Body */}
            <div className="overflow-y-auto flex-1 pr-1 space-y-3 font-sans">
              
              {/* Card 1: Obiettivo Tattico & Focus Certificazione */}
              <div className="p-3 rounded-xl bg-[#121A2B] border border-emerald-500/30 space-y-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    OBIETTIVO DIDATTICO
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    {briefing.examRelevance}
                  </span>
                </div>
                <p className="text-xs text-slate-200 font-medium leading-relaxed">
                  {briefing.objective}
                </p>
              </div>

              {/* Card 2: Concetto Chiave & Meccanismo */}
              <div className="p-3.5 rounded-xl bg-[#090E17] border border-white/10 space-y-2">
                <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  <span>COME FUNZIONA // MECCANISMO FONDAMENTALE</span>
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {briefing.coreConcept}
                </p>
                <div className="pt-1.5 border-t border-white/5 space-y-1.5 font-mono text-[11px]">
                  {briefing.keyPoints.map((point, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-slate-300">
                      <span className="text-emerald-400 font-bold mt-0.5">▸</span>
                      <span className="leading-snug">{point}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 3: Esempio Tecnico / Terminale di Riferimento */}
              {briefing.syntaxExample && (
                <div className="rounded-xl bg-[#06090F] border border-cyan-500/30 overflow-hidden">
                  <div className="bg-[#0B101D] px-3 py-1.5 border-b border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span className="flex items-center gap-1.5 text-cyan-300 font-bold">
                      <Code className="w-3.5 h-3.5" />
                      {briefing.syntaxExample.title}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">SINTASSI GUIDA</span>
                  </div>
                  <div className="p-3 font-mono text-xs text-emerald-300 overflow-x-auto whitespace-pre-wrap bg-[#050811]">
                    {briefing.syntaxExample.code}
                  </div>
                  <div className="px-3 py-2 bg-[#090E1A] border-t border-white/5 text-[11px] text-slate-300 font-mono">
                    <span className="text-cyan-400 font-bold">Nota operativa: </span>
                    {briefing.syntaxExample.explanation}
                  </div>
                </div>
              )}

              {/* Card 4: Regola d'Oro di Difesa */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 shrink-0 mt-0.5">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-amber-300 block uppercase tracking-wider">
                    REGOLA D'ORO DI SICUREZZA
                  </span>
                  <p className="text-xs text-slate-200 mt-0.5 leading-snug">
                    {briefing.goldenRule}
                  </p>
                </div>
              </div>

              {/* Mission Structure Checklist */}
              <div className="p-3 rounded-xl bg-[#090E17] border border-white/10 space-y-1.5">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                  STRUTTURA DELL'ESERCITAZIONE ({node.questions.length} SFIDE PRATICHE)
                </span>
                <div className="space-y-1">
                  {node.questions.map((q, qIdx) => (
                    <div key={q.id} className="flex items-center justify-between text-xs font-mono p-1.5 rounded bg-surface border border-white/5">
                      <span className="text-slate-300 truncate max-w-[240px]">
                        {qIdx + 1}. {q.title}
                      </span>
                      <span className="text-[10px] text-emerald-400 shrink-0 font-bold">
                        +{q.xpReward} XP
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Briefing CTA Button */}
            <div className="pt-2 shrink-0 border-t border-white/10">
              <button
                onClick={() => {
                  sound.playTap();
                  setViewPhase('quiz');
                }}
                className="w-full py-3 px-4 rounded-xl font-mono font-bold text-xs sm:text-sm text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <span>INIZIA ESERCITAZIONE PRATICA ({node.questions.length} QUESITI)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* PHASE 2: QUIZ / ESERCITAZIONE GUIDATA                           */}
        {/* ================================================================= */}
        {viewPhase === 'quiz' && currentQ && (
          <div className="flex flex-col h-full overflow-hidden animate-fade-in space-y-2.5">
            {/* Header Bar with Stepper and Tactical Guide Drawer Trigger */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-slate-400 font-bold">
                  QUESITO {currentQuestionIndex + 1} DI {node.questions.length}
                </span>
                <span className="text-emerald-400 font-mono text-[10px] font-bold">
                  +{currentQ.eloReward} ELO · +{currentQ.xpReward} XP
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Tactical Guide Button: opens theory drawer at any moment! */}
                <button
                  type="button"
                  onClick={() => {
                    sound.playTap();
                    setIsBriefingDrawerOpen(!isBriefingDrawerOpen);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 font-mono text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Apri teoria e guida tattica"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{isBriefingDrawerOpen ? 'Chiudi Guida' : 'Guida Tattica'}</span>
                </button>

                <button
                  onClick={() => {
                    sound.playTap();
                    onClose();
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* In-Quiz Tactical Reference Drawer (Slide-down Sheet) */}
            {isBriefingDrawerOpen && (
              <div className="p-3 rounded-xl bg-[#080D18] border border-indigo-500/40 space-y-2 font-sans text-xs animate-fade-in max-h-48 overflow-y-auto shrink-0 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-[10px] text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" /> GUIDA TATTICA // {briefing.badge}
                  </span>
                  <button
                    onClick={() => setIsBriefingDrawerOpen(false)}
                    className="text-slate-400 hover:text-white text-[10px] font-mono cursor-pointer"
                  >
                    Nascondi
                  </button>
                </div>
                <p className="text-slate-200 text-[11px] leading-relaxed">
                  {briefing.coreConcept}
                </p>
                {briefing.syntaxExample && (
                  <div className="p-2 rounded bg-black/60 border border-white/10 font-mono text-[10px] text-emerald-300 overflow-x-auto whitespace-pre-wrap">
                    {briefing.syntaxExample.code}
                  </div>
                )}
                <div className="text-[10px] font-mono text-amber-300 bg-amber-500/10 p-1.5 rounded border border-amber-500/20">
                  <strong>Regola:</strong> {briefing.goldenRule}
                </div>
              </div>
            )}

            {/* Scrollable Question Content */}
            <div className="overflow-y-auto flex-1 pr-1 space-y-2.5">
              
              {/* Question Badge & Title */}
              <div>
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  {currentQ.type === 'spot_the_zeroday' && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                      SPOT THE ZERO-DAY
                    </span>
                  )}
                  {currentQ.type === 'terminal_command' && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                      TERMINAL BASH
                    </span>
                  )}
                  {currentQ.type === 'multiple_choice' && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                      SCELTA MULTIPLA
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-slate-400">Livello: {currentQ.difficulty}</span>
                </div>
                
                <h4 className="text-xs sm:text-sm font-bold text-white">
                  {currentQ.title}
                </h4>
                <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 leading-snug">
                  {currentQ.prompt}
                </p>
              </div>

              {/* TYPE 1: Spot the Zero-Day Code Viewer */}
              {currentQ.type === 'spot_the_zeroday' && currentQ.codeLines && (
                <div className="rounded-xl bg-[#06090F] border border-white/10 overflow-hidden shadow-inner">
                  <div className="bg-slate-900/90 px-3 py-1.5 border-b border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Code className="w-3.5 h-3.5 text-emerald-400" />
                      ISPETTORE CODICE // TOCCA LA RIGA VULNERABILE
                    </span>
                    <span className="text-amber-400 font-bold">SELEZIONA RIGA</span>
                  </div>
                  <div className="divide-y divide-white/5 font-mono text-xs py-0.5">
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
                          className={`px-3 py-2 min-h-[40px] flex items-center gap-3 cursor-pointer transition-colors select-none ${lineBg}`}
                        >
                          <span className="text-slate-500 select-none w-6 text-right font-mono text-xs font-bold shrink-0">
                            {line.lineNum}
                          </span>
                          <pre className="font-mono overflow-x-auto whitespace-pre-wrap flex-1 text-xs">{line.code}</pre>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TYPE 2: Terminal Command Interactive Sandbox */}
              {currentQ.type === 'terminal_command' && (
                <div className="space-y-2.5">
                  {/* Live Terminal Box */}
                  <div className="rounded-xl bg-[#06090F] border border-cyan-500/40 p-3 shadow-inner font-mono text-xs text-slate-200">
                    <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-white/5 text-[11px] text-slate-400">
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                      </div>
                      <span className="text-slate-400">bash — sessione interattiva</span>
                    </div>

                    {/* Terminal Prompt Line */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-emerald-400 font-bold shrink-0">
                        {currentQ.terminalPrompt || 'operator@cyberlab:~$'}
                      </span>
                      {currentQ.commandPrefix && (
                        <span className="text-slate-300 font-bold shrink-0">
                          {currentQ.commandPrefix}
                        </span>
                      )}
                      <input
                        type="text"
                        maxLength={256}
                        disabled={hasSubmitted}
                        value={terminalInputText}
                        onChange={(e) => setTerminalInputText(e.target.value.slice(0, 256))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !hasSubmitted) {
                            handleSubmit();
                          }
                        }}
                        placeholder="completa il comando o tocca i chip sotto..."
                        className="bg-slate-900 border border-slate-700 focus:border-cyan-400 text-cyan-300 px-2 py-1 rounded text-xs flex-1 min-w-[180px] outline-none font-mono"
                      />
                    </div>

                    {/* Real-time Stdout Terminal Simulation */}
                    {terminalStdout && (
                      <div className="mt-2 pt-2 border-t border-white/10 font-mono text-[11px] whitespace-pre-wrap text-emerald-400 bg-black/50 p-2 rounded border border-emerald-500/20">
                        {terminalStdout}
                      </div>
                    )}
                  </div>

                  {/* Clickable Command Chips */}
                  {shuffledChips.length > 0 && !hasSubmitted && (
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 block mb-1 uppercase">
                        Tocca i parametri per completare la sintassi:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {shuffledChips.map((chip, i) => (
                          <button
                            key={i}
                            onClick={() => handleChipClick(chip)}
                            className="min-h-[36px] px-3 py-1.5 rounded-lg bg-surface border border-white/10 hover:border-cyan-400 text-slate-200 hover:text-cyan-300 font-mono text-xs font-semibold transition-all active:scale-95 flex items-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <span>{chip}</span>
                            <CornerDownLeft className="w-3 h-3 opacity-60 text-cyan-400" />
                          </button>
                        ))}
                        <button
                          onClick={() => {
                            sound.playTap();
                            setTerminalInputText('');
                          }}
                          className="min-h-[36px] px-2.5 py-1.5 rounded-lg bg-red-950/40 border border-red-500/30 hover:border-red-500/60 text-red-400 text-xs font-mono font-bold transition-all active:scale-95 cursor-pointer"
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
                <div className="rounded-xl bg-[#06090F] border border-white/10 p-2.5 overflow-x-auto text-[11px] font-mono text-slate-300 shadow-inner max-h-24 sm:max-h-32 overflow-y-auto">
                  <pre className="whitespace-pre-wrap">{currentQ.codeSnippet}</pre>
                </div>
              )}

              {/* Options Selector for multiple choice or fallback */}
              {currentQ.type !== 'terminal_command' && (
                <div className="space-y-1.5">
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
                        className={`w-full text-left py-2 px-3 rounded-xl border text-[11px] sm:text-xs transition-all flex items-center justify-between cursor-pointer leading-snug ${optStyle}`}
                      >
                        <span className="font-mono">{opt.text}</span>
                        {hasSubmitted && opt.isCorrect && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1.5" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Detailed Guided Feedback Card upon answer submission */}
              {hasSubmitted && (
                <div className="animate-fade-in space-y-2">
                  {/* Status Banner */}
                  <div className={`p-2 rounded-xl border text-xs flex items-center justify-between ${
                    isCorrect 
                      ? 'bg-emerald-950/50 border-emerald-500/60 text-emerald-300' 
                      : 'bg-red-950/50 border-red-500/60 text-red-300'
                  }`}>
                    <div className="flex items-center gap-2">
                      {isCorrect ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                      )}
                      <span className="font-mono font-bold text-xs sm:text-sm">
                        {isCorrect ? 'ESECUZIONE CORRETTA (+ ELO)' : 'PAYLOAD BLOCCATO // RISPOSTA NON OTTIMALE'}
                      </span>
                    </div>
                  </div>

                  {/* Immediate Educational Explanation - Visible to EVERY user for real learning! */}
                  <div className="rounded-xl border border-white/10 bg-[#090D16] p-3 space-y-2">
                    <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                      <div className="flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="font-mono font-bold text-[11px] text-white uppercase tracking-wider">
                          SPIEGAZIONE TECNICA & ROOT CAUSE
                        </span>
                      </div>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {currentQ.rootCauseBreakdown.cveOrTopic}
                      </span>
                    </div>

                    {/* Educational breakdown */}
                    <div className="space-y-1.5 text-xs text-slate-200">
                      <div>
                        <span className="text-emerald-400 font-mono font-bold text-[10px] block mb-0.5">
                          PERCHÉ FUNZIONA COSÌ:
                        </span>
                        <p className="text-slate-300 leading-snug">
                          {currentQ.rootCauseBreakdown.whyItWorks}
                        </p>
                      </div>

                      <div>
                        <span className="text-indigo-400 font-mono font-bold text-[10px] block mb-0.5">
                          REGOLA DI MITIGAZIONE & HARDENING:
                        </span>
                        <p className="text-slate-300 leading-snug">
                          {currentQ.rootCauseBreakdown.patchRecommendation}
                        </p>
                      </div>

                      {/* Optional Pro Perk: Raw Terminal PoC Script */}
                      {isPro ? (
                        <div>
                          <span className="text-amber-400 font-mono font-bold text-[10px] block mb-0.5">
                            PRO TERMINAL PROOF OF CONCEPT (PoC):
                          </span>
                          <div className="bg-[#04060A] border border-white/10 rounded p-1.5 text-[10px] text-emerald-300 font-mono overflow-x-auto max-h-20 overflow-y-auto">
                            <pre>{currentQ.rootCauseBreakdown.terminalProof}</pre>
                          </div>
                        </div>
                      ) : (
                        <div className="pt-1 flex items-center justify-between bg-slate-900/60 p-2 rounded-lg border border-white/5">
                          <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                            <Lock className="w-3 h-3 text-amber-400" />
                            <span>PoC Script avanzato per ZeroDay Pro</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              sound.playTap();
                              onOpenPaywall();
                            }}
                            className="text-[10px] font-mono text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer"
                          >
                            Scopri Pro →
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Pinned Bottom Action Button */}
            <div className="pt-2 shrink-0 border-t border-white/10">
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
                  className="w-full py-2.5 px-4 rounded-xl font-mono font-bold text-xs sm:text-sm text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <Play className="w-3.5 h-3.5 fill-slate-950" />
                  <span>ESEGUI E VERIFICA RISPOSTA</span>
                </button>
              ) : (
                <button
                  onClick={handleNextOrFinish}
                  className="w-full py-2.5 px-4 rounded-xl font-mono font-bold text-xs sm:text-sm text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <span>
                    {currentQuestionIndex < node.questions.length - 1 ? 'PROSSIMO QUESITO' : 'VEDI RIEPILOGO LEZIONE'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* PHASE 3: LEZIONE COMPLETATA (COMPLETION & REWARDS SUMMARY)        */}
        {/* ================================================================= */}
        {viewPhase === 'completed' && (
          <div className="flex flex-col h-full overflow-hidden animate-fade-in space-y-4 py-2">
            <div className="flex-1 flex flex-col items-center justify-center text-center p-2 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-lg">
                <Award className="w-8 h-8" />
              </div>

              <div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 uppercase font-bold tracking-wider inline-block mb-1">
                  LEZIONE COMPLETATA CON SUCCESSO
                </span>
                <h2 className="text-lg sm:text-xl font-extrabold text-white">
                  {node.title}
                </h2>
                <p className="text-xs text-slate-300 max-w-sm mt-1">
                  Hai superato tutte le sfide pratiche e completato il modulo guidato.
                </p>
              </div>

              {/* Rewards Summary Pills */}
              <div className="flex items-center gap-3 pt-1">
                <div className="px-3.5 py-2 rounded-xl bg-[#121A2B] border border-emerald-500/40 text-center min-w-[100px]">
                  <span className="text-[10px] font-mono text-slate-400 block">PUNTI XP</span>
                  <span className="text-base sm:text-lg font-black text-emerald-400 font-mono">
                    +{node.xpReward} XP
                  </span>
                </div>
                <div className="px-3.5 py-2 rounded-xl bg-[#121A2B] border border-indigo-500/40 text-center min-w-[100px]">
                  <span className="text-[10px] font-mono text-slate-400 block">RATING ELO</span>
                  <span className="text-base sm:text-lg font-black text-indigo-400 font-mono">
                    +{node.eloReward} ELO
                  </span>
                </div>
                <div className="px-3.5 py-2 rounded-xl bg-[#121A2B] border border-white/10 text-center min-w-[100px]">
                  <span className="text-[10px] font-mono text-slate-400 block">PRECISIONE</span>
                  <span className="text-base sm:text-lg font-black text-white font-mono">
                    {Math.round((correctCount / node.questions.length) * 100)}%
                  </span>
                </div>
              </div>

              {/* Key Takeaways Recap */}
              <div className="w-full text-left p-3 rounded-xl bg-[#090E17] border border-white/10 space-y-1.5 font-mono text-xs">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                  COMPETENZE ACQUISITE
                </span>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  ✓ {briefing.goldenRule}
                </p>
                <p className="text-slate-400 text-[10px]">
                  Standard esame: {briefing.examRelevance}
                </p>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 shrink-0 border-t border-white/10 flex gap-2">
              <button
                type="button"
                onClick={handleResetLesson}
                className="py-2.5 px-3 rounded-xl border border-white/10 text-slate-400 hover:text-white font-mono text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Rivedi Teoria</span>
              </button>
              <button
                type="button"
                onClick={handleFinalClaim}
                className="flex-1 py-2.5 px-4 rounded-xl font-mono font-bold text-xs sm:text-sm text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Check className="w-4 h-4" />
                <span>SALVA E PROSEGUI NEL PERCORSO</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
