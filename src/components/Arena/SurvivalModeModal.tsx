import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { UserState, PvPChallenge } from '../../types';
import { PVP_CHALLENGES } from '../../data/pvpChallenges';
import { shuffleArray } from '../../utils/shuffle';
import { sound } from '../../utils/soundEngine';
import { 
  X, Skull, Flame, Zap, Trophy, Timer, 
  RotateCcw, CheckCircle2, ShieldAlert
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface SurvivalModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userState: UserState;
  onUpdateHighScore: (score: number, gainedXp: number) => void;
}

export const SurvivalModeModal: React.FC<SurvivalModeModalProps> = ({
  isOpen,
  onClose,
  userState,
  onUpdateHighScore
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(20);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isNewHighScore, setIsNewHighScore] = useState<boolean>(false);

  const highScore = userState.survivalHighScore || 0;

  // Question Pool for Current Round
  const [questionPool, setQuestionPool] = useState<PvPChallenge[]>(() => 
    shuffleArray([...PVP_CHALLENGES])
  );
  const [currentIdx, setCurrentIdx] = useState<number>(0);

  const currentQ = questionPool[currentIdx % questionPool.length];

  const shuffledOptions = useMemo(() => {
    return currentQ?.options ? shuffleArray(currentQ.options) : [];
  }, [currentQ]);

  const handleTriggerGameOver = useCallback((_reason: 'WRONG_ANSWER' | 'TIME_EXPIRED') => {
    sound.playPayloadBlocked();
    setIsPlaying(false);
    setGameOver(true);

    const isRecord = score > highScore;
    if (isRecord) {
      setIsNewHighScore(true);
      sound.playVictoryFanfare();
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 }
      });
      onUpdateHighScore(score, score * 35);
    } else if (score > 0) {
      onUpdateHighScore(highScore, score * 20);
    }
  }, [score, highScore, onUpdateHighScore]);

  const gameOverRef = useRef(handleTriggerGameOver);
  useEffect(() => {
    gameOverRef.current = handleTriggerGameOver;
  }, [handleTriggerGameOver]);

  // Sudden Death Timer Loop
  useEffect(() => {
    if (!isPlaying || gameOver) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          gameOverRef.current('TIME_EXPIRED');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlaying, gameOver]);

  const handleStartGame = () => {
    sound.playRadarPing();
    setQuestionPool(shuffleArray([...PVP_CHALLENGES]));
    setCurrentIdx(0);
    setScore(0);
    setTimeLeft(22);
    setSelectedOptionId(null);
    setIsNewHighScore(false);
    setGameOver(false);
    setIsPlaying(true);
  };

  const handleSelectOption = (optionId: string) => {
    if (selectedOptionId || gameOver) return;
    sound.playTap();
    setSelectedOptionId(optionId);

    const isRight = currentQ.options.find(o => o.id === optionId)?.isCorrect || false;

    if (isRight) {
      sound.playExploitSuccess();
      const nextScore = score + 1;
      setScore(nextScore);
      // Reward +4 bonus seconds per correct answer!
      setTimeLeft(prev => Math.min(30, prev + 4));

      setTimeout(() => {
        setSelectedOptionId(null);
        setCurrentIdx(prev => prev + 1);
      }, 450);
    } else {
      // Sudden Death: Instant death on first wrong answer!
      handleTriggerGameOver('WRONG_ANSWER');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md overflow-y-auto animate-fade-in font-sans">
      <div className="relative w-full max-w-xl my-auto rounded-3xl bg-[#0B0F19] border-2 border-rose-500/50 p-6 sm:p-7 shadow-2xl text-slate-100 overflow-hidden"
        style={{ boxShadow: '0 0 45px -5px rgba(244, 63, 94, 0.3)' }}
      >
        {/* Background Atmosphere */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Close Button */}
        <button
          onClick={() => {
            sound.playTap();
            setIsPlaying(false);
            onClose();
          }}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors z-20"
        >
          <X className="w-5 h-5" />
        </button>

        {/* SCREEN 1: PRE-GAME LOBBY */}
        {!isPlaying && !gameOver && (
          <div className="space-y-6 text-center py-4">
            <div className="w-20 h-20 rounded-2xl bg-rose-500/20 border-2 border-rose-500/50 text-rose-400 flex items-center justify-center mx-auto shadow-neon-amber animate-pulse">
              <Skull className="w-10 h-10" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 mb-2">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>SUDDEN DEATH // ENDLESS GAUNTLET</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                Survival Mode
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-md mx-auto leading-relaxed">
                Il timer scende inesorabilmente. <strong className="text-rose-400">Un singolo errore e sei fuori.</strong> Ogni exploit corretto aggiunge <span className="text-emerald-400 font-bold">+4 secondi</span> al tuo orologio.
              </p>
            </div>

            {/* High Score Banner */}
            <div className="p-4 rounded-2xl bg-[#06090F] border border-white/10 max-w-xs mx-auto flex items-center justify-between font-mono">
              <div className="text-left">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">RECORD PERSONALE</span>
                <span className="text-2xl font-black text-amber-400">{highScore} Exploit</span>
              </div>
              <Trophy className="w-8 h-8 text-amber-400" />
            </div>

            <button
              onClick={handleStartGame}
              className="w-full py-4 px-6 rounded-xl font-mono font-black text-base text-slate-950 bg-gradient-to-r from-rose-500 via-amber-400 to-rose-400 hover:from-rose-400 hover:to-amber-300 transition-all shadow-neon-amber flex items-center justify-center gap-2 transform active:scale-98"
            >
              <Zap className="w-5 h-5 fill-slate-950" />
              <span>INIZIA SUDDEN DEATH</span>
            </button>
          </div>
        )}

        {/* SCREEN 2: ACTIVE SURVIVAL ROUND */}
        {isPlaying && !gameOver && (
          <div className="space-y-4 animate-fade-in">
            {/* Top Tactical HUD */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-400 fill-amber-400 animate-pulse" />
                <span className="font-mono text-sm font-black text-white">
                  STREAK: <span className="text-amber-400 text-base">{score}</span>
                </span>
              </div>

              {/* Countdown Clock with Emergency Alert State */}
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-mono font-black text-sm border ${
                timeLeft <= 5 
                  ? 'bg-rose-950/80 border-rose-500 text-rose-400 animate-ping' 
                  : 'bg-slate-900 border-white/10 text-emerald-400'
              }`}>
                <Timer className="w-4 h-4" />
                <span>{timeLeft}s</span>
              </div>

              <div className="font-mono text-xs text-slate-400">
                BEST: <strong className="text-amber-400">{Math.max(highScore, score)}</strong>
              </div>
            </div>

            {/* Question Card */}
            <div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase font-bold">
                TIER: {currentQ?.tier?.toUpperCase() || 'SURVIVAL'} · MIN ELO {currentQ?.minElo ?? 0}
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white mt-2 leading-snug">
                {currentQ?.question}
              </h3>
            </div>

            {/* Code Snippet if present */}
            {currentQ.codeSnippet && (
              <div className="p-3 rounded-xl bg-[#06090F] border border-white/10 font-mono text-xs text-slate-300 overflow-x-auto shadow-inner">
                <pre>{currentQ.codeSnippet}</pre>
              </div>
            )}

            {/* Answer Options */}
            <div className="space-y-2 pt-1">
              {shuffledOptions.map((opt) => {
                const isSelected = selectedOptionId === opt.id;
                return (
                  <button
                    key={opt.id}
                    disabled={Boolean(selectedOptionId)}
                    onClick={() => handleSelectOption(opt.id)}
                    className={`w-full p-3.5 rounded-xl border text-left font-mono text-xs sm:text-sm transition-all flex items-center justify-between ${
                      isSelected 
                        ? opt.isCorrect 
                          ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300' 
                          : 'bg-rose-950/80 border-rose-500 text-rose-300'
                        : 'bg-[#131B2E] border-white/10 hover:border-rose-400/50 hover:bg-white/5 text-slate-200'
                    }`}
                  >
                    <span>{opt.text}</span>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* SCREEN 3: GAME OVER / POST-MORTEM */}
        {gameOver && (
          <div className="space-y-5 text-center py-4 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto shadow-neon-amber">
              <Skull className="w-8 h-8" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-500/20 text-rose-400 mb-1.5">
                SUDDEN DEATH // RUN TERMINATA
              </div>
              <h3 className="text-2xl font-black text-white">
                {isNewHighScore ? 'NUOVO RECORD STRABILIANTE!' : 'Game Over, Operatore!'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Hai concatenato <strong className="text-amber-400 font-mono text-sm">{score} exploit</strong> consecutivi prima del collasso.
              </p>
            </div>

            {/* Scorecard */}
            <div className="p-4 rounded-2xl bg-[#06090F] border border-white/10 max-w-sm mx-auto grid grid-cols-2 gap-3 font-mono">
              <div className="border-r border-white/10 pr-2">
                <span className="text-[10px] text-slate-500 block">EXPLOIT STREAK</span>
                <span className="text-2xl font-black text-white">x{score}</span>
              </div>
              <div className="pl-2">
                <span className="text-[10px] text-slate-500 block">ALL-TIME BEST</span>
                <span className="text-2xl font-black text-amber-400">x{Math.max(highScore, score)}</span>
              </div>
            </div>

            <div className="flex gap-2.5 max-w-sm mx-auto">
              <button
                onClick={handleStartGame}
                className="flex-1 py-3 px-4 rounded-xl font-mono font-extrabold text-sm text-slate-950 bg-gradient-to-r from-rose-500 to-amber-400 hover:from-rose-400 hover:to-amber-300 transition-all shadow-neon-amber flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4 stroke-[3]" />
                <span>RIPROVA SUBITO</span>
              </button>

              <button
                onClick={onClose}
                className="py-3 px-4 rounded-xl font-mono text-xs text-slate-400 hover:text-white bg-surface border border-white/10 hover:border-white/20 transition-colors"
              >
                Esci
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
