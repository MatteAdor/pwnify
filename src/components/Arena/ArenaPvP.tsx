import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserState, PvPPlayer, PvPChallenge, PaywallContext } from '../../types';
import { SMART_BOTS, generatePvPMatchChallenges } from '../../data/pvpChallenges';
import { getRankFromElo } from '../../data/ranks';
import { sound } from '../../utils/soundEngine';
import { 
  Swords, Flame, Zap, Trophy, Timer, 
  RotateCcw, Sparkles, CheckCircle2, Copy, Skull, Ticket
} from 'lucide-react';
import confetti from 'canvas-confetti';

import { SurvivalModeModal } from './SurvivalModeModal';
import { LeagueTab } from '../Leaderboard/LeagueTab';

export interface DuelChallengeData {
  seed: string;
  elo: number;
  challenger: string;
  score: number;
}

interface ArenaPvPProps {
  userState: UserState;
  onConsumeTicket: () => boolean; // returns true if has tickets or is pro
  onWinMatch: (eloGain: number) => void;
  onLossMatch: (eloLoss: number) => void;
  onOpenPaywall: (context: PaywallContext) => void;
  onOpenHackerCard?: () => void;
  initialDuelChallenge?: DuelChallengeData | null;
  onClearInitialDuel?: () => void;
  onUpdateSurvivalScore?: (score: number, gainedXp: number) => void;
}

type MatchPhase = 'idle' | 'searching' | 'vs_screen' | 'battle' | 'post_match';

export const ArenaPvP: React.FC<ArenaPvPProps> = ({
  userState,
  onConsumeTicket,
  onWinMatch,
  onLossMatch,
  onOpenPaywall,
  onOpenHackerCard,
  initialDuelChallenge,
  onClearInitialDuel,
  onUpdateSurvivalScore
}) => {
  const [phase, setPhase] = useState<MatchPhase>('idle');
  const [isSurvivalOpen, setIsSurvivalOpen] = useState<boolean>(false);
  const [searchTimer, setSearchTimer] = useState<number>(0);
  const [opponent, setOpponent] = useState<PvPPlayer | null>(null);

  // Dynamic Match Challenges Pool (Calibrated to ELO + Shuffled Options)
  const [matchChallenges, setMatchChallenges] = useState<PvPChallenge[]>(() => 
    generatePvPMatchChallenges(userState.elo, 5)
  );

  // Battle State
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState<number>(0);
  const [userScore, setUserScore] = useState<number>(0);
  const [opponentScore, setOpponentScore] = useState<number>(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [battleTimer, setBattleTimer] = useState<number>(60);
  const questionStartTimeRef = useRef<number>(0);
  const radarPingCounterRef = useRef<number>(0);

  // Post match stats
  const [matchResult, setMatchResult] = useState<'win' | 'loss'>('win');
  const [eloDelta, setEloDelta] = useState<number>(26);
  const [copiedDuelLink, setCopiedDuelLink] = useState<boolean>(false);

  const endMatch = useCallback(() => {
    const isWin = userScore >= opponentScore;
    setMatchResult(isWin ? 'win' : 'loss');
    const gained = isWin ? 26 + Math.floor(Math.random() * 8) : -18;
    setEloDelta(gained);

    if (isWin) {
      sound.playVictoryFanfare();
      setTimeout(() => sound.playEloTick(), 400);
      setTimeout(() => sound.playEloTick(), 550);
      setTimeout(() => sound.playEloTick(), 700);
      setTimeout(() => sound.playEloTick(), 850);
      
      onWinMatch(gained);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } else {
      sound.playPayloadBlocked();
      onLossMatch(Math.abs(gained));
    }

    setPhase('post_match');
  }, [userScore, opponentScore, onWinMatch, onLossMatch]);

  // Handle Incoming URL Duel Challenge
  useEffect(() => {
    if (initialDuelChallenge) {
      const challengerRank = getRankFromElo(initialDuelChallenge.elo);
      const ghostOpponent: PvPPlayer = {
        id: 'ghost_challenger_' + initialDuelChallenge.seed,
        name: initialDuelChallenge.challenger || '0x_GhostChallenger',
        elo: initialDuelChallenge.elo,
        rank: challengerRank.tier,
        avatar: 'GH',
        winStreak: 2,
        isBot: true,
        targetScore: Math.min(5, initialDuelChallenge.score || 3)
      };
      setOpponent(ghostOpponent);
      const generated = generatePvPMatchChallenges(initialDuelChallenge.elo, 5);
      setMatchChallenges(generated);
      setUserScore(0);
      setOpponentScore(0);
      setCurrentChallengeIndex(0);
      setSelectedOptionId(null);
      setPhase('vs_screen');
      sound.playExploitSuccess();

      const vsTimer = setTimeout(() => {
        setPhase('battle');
        questionStartTimeRef.current = Date.now();
        onClearInitialDuel?.();
      }, 2500);

      return () => clearTimeout(vsTimer);
    }
  }, [initialDuelChallenge, onClearInitialDuel]);

  // Matchmaking radar timer with periodic sonar ping
  useEffect(() => {
    let interval: any;
    if (phase === 'searching') {
      sound.playRadarPing();
      radarPingCounterRef.current = 0;
      interval = setInterval(() => {
        setSearchTimer(prev => {
          const next = prev + 0.1;
          radarPingCounterRef.current += 1;
          if (radarPingCounterRef.current % 10 === 0) {
            sound.playRadarPing();
          }
          // Fallback to realistic bot after ~3.2 seconds
          if (next >= 3.2 && !opponent) {
            const randomBot = SMART_BOTS[Math.floor(Math.random() * SMART_BOTS.length)];
            setOpponent(randomBot);
            setPhase('vs_screen');
          }
          return next;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [phase, opponent]);

  // VS Screen countdown before entering battle
  useEffect(() => {
    if (phase === 'vs_screen') {
      const timer = setTimeout(() => {
        setPhase('battle');
        setBattleTimer(60);
        questionStartTimeRef.current = Date.now();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  // 60-Second Blitz Battle Clock
  useEffect(() => {
    let timer: any;
    if (phase === 'battle') {
      timer = setInterval(() => {
        setBattleTimer(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            endMatch();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [phase, endMatch]);

  // Bot response simulator
  useEffect(() => {
    let botTimer: any;
    if (phase === 'battle' && currentChallengeIndex < matchChallenges.length) {
      // Bot takes between 3.5s and 6.0s to answer
      const delay = Math.floor(Math.random() * 2500) + 3500;
      botTimer = setTimeout(() => {
        // 80% chance bot is right
        const botSuccess = Math.random() < 0.82;
        if (botSuccess) {
          setOpponentScore(prev => prev + 1);
        }
      }, delay);
    }
    return () => clearTimeout(botTimer);
  }, [phase, currentChallengeIndex, matchChallenges.length]);

  const handleStartMatchmaking = () => {
    // Check tickets
    if (!userState.isPro && userState.arenaTickets <= 0) {
      onOpenPaywall('win_streak_trap');
      return;
    }

    const success = onConsumeTicket();
    if (!success) {
      onOpenPaywall('win_streak_trap');
      return;
    }

    const generated = generatePvPMatchChallenges(userState.elo, 5);
    setMatchChallenges(generated);
    setOpponent(null);
    setSearchTimer(0);
    setUserScore(0);
    setOpponentScore(0);
    setCurrentChallengeIndex(0);
    setSelectedOptionId(null);
    setPhase('searching');
  };

  const handleSelectAnswer = (optionId: string) => {
    if (selectedOptionId) return; // Prevent double clicks
    sound.playTap();
    setSelectedOptionId(optionId);

    const challenge = matchChallenges[currentChallengeIndex] || matchChallenges[0];
    const isRight = challenge.options.find(o => o.id === optionId)?.isCorrect || false;

    if (isRight) {
      sound.playExploitSuccess();
      setUserScore(prev => prev + 1);
    } else {
      sound.playPayloadBlocked();
    }

    setTimeout(() => {
      setSelectedOptionId(null);
      if (currentChallengeIndex < matchChallenges.length - 1) {
        setCurrentChallengeIndex(prev => prev + 1);
        questionStartTimeRef.current = Date.now();
      } else {
        endMatch();
      }
    }, 800);
  };

  const userRank = getRankFromElo(userState.elo);
  const currentChallenge = matchChallenges[currentChallengeIndex] || matchChallenges[0];

  // Dynamic split bar ratio calculation
  const totalPoints = userScore + opponentScore;
  const userRatio = totalPoints === 0 ? 50 : Math.round((userScore / totalPoints) * 100);

  return (
    <div className="w-full max-w-3xl mx-auto px-3 sm:px-6 py-6 pb-32 space-y-7 animate-fade-in">
      {/* PHASE 1: IDLE / LOBBY */}
      {phase === 'idle' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="rounded-3xl bg-[#0B1120]/90 border border-indigo-500/30 p-6 sm:p-7 shadow-[0_15px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-bold flex items-center gap-1.5 shadow-sm">
                <Swords className="w-3.5 h-3.5" />
                BLITZ 1V1 LIVE ARENA
              </span>
              <div className="flex items-center gap-1.5 text-xs font-mono text-amber-400 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 font-bold">
                <Flame className="w-4 h-4 fill-amber-500" />
                <span>Win Streak: x{userState.winStreak}</span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              ZeroDay Cyber Arena
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-lg leading-relaxed">
              Challenge other hackers in real-time 60-second Blitz battles. Answer first, gain ELO points, and climb competitive leagues.
            </p>

            {/* Arena Tickets Status Box */}
            <div className="mt-5 p-4 rounded-2xl bg-[#060A12]/80 border border-white/10 flex items-center justify-between shadow-inner">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold border border-indigo-500/30">
                  <Ticket className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Arena Payloads (Tickets)</span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {userState.isPro ? 'Unlimited PRO Access Active' : 'Consumes 1 ticket per match (max 3/3 free daily)'}
                  </span>
                </div>
              </div>
              <span className="font-mono font-bold text-sm text-indigo-400 px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                {userState.isPro ? 'UNLIMITED' : `${userState.arenaTickets}/${userState.maxTickets}`}
              </span>
            </div>
          </div>

          {/* Authentic Arena Training Banner */}
          <div className="w-full p-4 rounded-2xl bg-[#0B1120]/90 border border-white/10 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                <Trophy className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white block">Tactical ELO Simulation & Direct Duels</span>
                <span className="text-[10px] text-slate-400">1v1 training on CompTIA Security+, CCNA & CEH scenarios</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-300">
              <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 font-mono">60s per match</span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono font-bold">ELO Calibrated</span>
            </div>
          </div>

          {/* Quick Match Action */}
          <div className="rounded-3xl bg-[#0B1120]/90 border border-white/10 p-7 sm:p-8 text-center space-y-5 shadow-[0_15px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center mx-auto shadow-neon-indigo">
              <Swords className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">Ready for 1v1 Blitz?</h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-1.5 max-w-md mx-auto">
                Challenge a training agent calibrated to your ELO ({userState.elo} - {userRank.tier}) or send a duel challenge link.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={handleStartMatchmaking}
                className="w-full sm:w-auto min-w-[240px] py-4 px-7 rounded-xl font-mono font-extrabold text-sm sm:text-base text-slate-950 bg-gradient-to-r from-indigo-400 via-indigo-500 to-emerald-400 hover:from-indigo-300 hover:to-emerald-300 transition-all shadow-neon-indigo flex items-center justify-center gap-2 transform active:scale-98"
              >
                <Zap className="w-4 h-4 fill-slate-950" />
                <span>FIND OPPONENT (BLITZ)</span>
              </button>

              <button
                onClick={() => {
                  sound.playTap();
                  setIsSurvivalOpen(true);
                }}
                className="w-full sm:w-auto min-w-[240px] py-4 px-7 rounded-xl font-mono font-extrabold text-xs sm:text-sm text-rose-300 bg-rose-950/40 border border-rose-500/40 hover:border-rose-400 hover:bg-rose-900/30 transition-all shadow-sm flex items-center justify-center gap-2 transform active:scale-98"
              >
                <Skull className="w-4 h-4 text-rose-400" />
                <span>SURVIVAL GAUNTLET (BEST: x{userState.survivalHighScore || 0})</span>
              </button>
            </div>
          </div>

          {/* ZeroDay Leagues & Global Leaderboard Embedded at the bottom */}
          <div className="pt-6 border-t border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-mono font-extrabold text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <span>Classifica & ZeroDay Leagues</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Scala le leghe settimanali vincendo match nell'Arena
                </p>
              </div>
            </div>

            <LeagueTab
              userState={userState}
              onOpenPaywall={(ctx) => onOpenPaywall(ctx)}
            />
          </div>
        </div>
      )}

      {/* PHASE 2: MATCHMAKING RADAR (Chess.com Style) */}
      {phase === 'searching' && (
        <div className="rounded-3xl bg-[#0B1120]/90 border border-indigo-500/30 p-8 sm:p-10 text-center space-y-6 shadow-[0_15px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl animate-fade-in my-8">
          <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
            {/* Spinning Radar circles */}
            <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 animate-ping opacity-60" />
            <div className="absolute inset-2 rounded-full border border-indigo-500/40 animate-pulse" />
            <div className="w-16 h-16 rounded-full bg-indigo-950/80 border border-indigo-400 flex items-center justify-center text-indigo-400">
              <Swords className="w-7 h-7 animate-spin" style={{ animationDuration: '4s' }} />
            </div>
          </div>

          <div>
            <h3 className="text-xl font-black text-white font-mono tracking-tight">
              CALIBRATING SIMULATION AGENT...
            </h3>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Selecting exam pool calibrated to ELO {userState.elo} ({searchTimer.toFixed(1)}s)
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#060A12]/80 border border-white/5 inline-flex items-center gap-2 text-xs font-mono text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>CompTIA, CCNA & CEH question pool active</span>
          </div>
        </div>
      )}

      {/* PHASE 3: PRE-MATCH VS SCREEN */}
      {phase === 'vs_screen' && opponent && (
        <div className="space-y-6 animate-fade-in my-6">
          <div className="text-center">
            <span className="text-xs font-mono px-4 py-1.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold shadow-sm">
              CALIBRATED SCENARIO · ROUND STARTS IN 2s
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 relative">
            {/* User Card */}
            <div className="p-6 rounded-3xl bg-[#0B1120]/90 border border-emerald-500/40 text-center space-y-2.5 shadow-[0_10px_30px_rgba(16,185,129,0.15)] backdrop-blur-xl">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                <Zap className="w-7 h-7" />
              </div>
              <h3 className="font-mono font-bold text-sm text-white truncate">{userState.username}</h3>
              <div className="text-xs font-mono text-emerald-400 font-bold">{userState.elo} ELO</div>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 inline-block">
                {userRank.tier}
              </span>
              <div className="text-[11px] font-mono text-amber-400 flex items-center justify-center gap-1 font-bold">
                <Flame className="w-3.5 h-3.5 fill-amber-500" />
                Streak: x{userState.winStreak}
              </div>
            </div>

            {/* Split VS Badge */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-indigo-600 border-2 border-white flex items-center justify-center font-mono font-black text-xs text-white shadow-xl">
              VS
            </div>

            {/* Opponent Card */}
            <div className="p-6 rounded-3xl bg-[#0B1120]/90 border border-red-500/40 text-center space-y-2.5 shadow-[0_10px_30px_rgba(239,68,68,0.15)] backdrop-blur-xl">
              <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500 text-red-400 font-mono font-black text-base flex items-center justify-center mx-auto shadow-sm">
                {opponent.avatar}
              </div>
              <h3 className="font-mono font-bold text-sm text-white truncate">{opponent.name}</h3>
              <div className="text-xs font-mono text-red-400 font-bold">{opponent.elo} ELO</div>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 inline-block">
                {opponent.rank}
              </span>
              <div className="text-[10px] font-mono text-indigo-300 font-bold flex items-center justify-center gap-1">
                {opponent.isBot ? '[BOT] Training Agent' : '[LIVE] Active Duelist'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PHASE 4: 60s BLITZ BATTLE IN-GAME */}
      {phase === 'battle' && opponent && currentChallenge && (
        <div className="space-y-5 animate-fade-in">
          {/* Top Score Split Bar & Ticking Clock */}
          <div className="rounded-3xl bg-[#0B1120]/90 border border-white/10 p-5 shadow-[0_15px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl space-y-3.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-400">{userState.username}</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  {userScore} PTS
                </span>
              </div>

              {/* Countdown clock */}
              <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#060A12] border border-amber-500/40 text-amber-300 font-bold shadow-inner">
                <Timer className="w-3.5 h-3.5 animate-spin" />
                <span>{battleTimer}s</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 font-bold border border-red-500/30">
                  {opponentScore} PTS
                </span>
                <span className="font-bold text-red-400">{opponent.name}</span>
              </div>
            </div>

            {/* Split Tug-of-War Score Bar */}
            <div className="w-full h-3 rounded-full bg-slate-900 border border-white/5 overflow-hidden flex">
              <div 
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-300 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                style={{ width: `${userRatio}%` }}
              />
              <div 
                className="bg-gradient-to-r from-rose-500 to-red-600 h-full transition-all duration-300 shadow-[0_0_12px_rgba(239,68,68,0.5)]"
                style={{ width: `${100 - userRatio}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span className="font-semibold text-indigo-300">ROUND {currentChallengeIndex + 1} OF {matchChallenges.length}</span>
              <span>SPEED + ACCURACY CALIBRATION</span>
            </div>
          </div>

          {/* Active PvP Challenge Card */}
          <div className="rounded-3xl bg-[#0B1120]/90 border border-white/10 p-6 sm:p-7 shadow-[0_15px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl space-y-5">
            <h3 className="font-bold text-base sm:text-lg text-white leading-relaxed">
              {currentChallenge.question}
            </h3>

            {currentChallenge.codeSnippet && (
              <div className="rounded-2xl bg-[#060A12] border border-white/10 p-4 font-mono text-xs text-emerald-300 overflow-x-auto shadow-inner">
                <pre>{currentChallenge.codeSnippet}</pre>
              </div>
            )}

            {/* Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentChallenge.options.map((opt) => {
                const isSelected = selectedOptionId === opt.id;
                let optStyle = 'bg-surface-light border-white/10 hover:border-indigo-500/40 text-slate-200';

                if (selectedOptionId) {
                  if (opt.isCorrect) {
                    optStyle = 'bg-emerald-950/70 border-emerald-500 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]';
                  } else if (isSelected && !opt.isCorrect) {
                    optStyle = 'bg-red-950/70 border-red-500 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.2)]';
                  }
                }

                return (
                  <button
                    key={opt.id}
                    disabled={!!selectedOptionId}
                    onClick={() => handleSelectAnswer(opt.id)}
                    className={`p-4 rounded-2xl border text-left text-xs sm:text-sm font-mono transition-all flex items-center justify-between active:scale-[0.98] ${optStyle}`}
                  >
                    <span>{opt.text}</span>
                    {selectedOptionId && opt.isCorrect && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* PHASE 5: POST-MATCH ANALYSIS SCREEN (Chess.com Style) */}
      {phase === 'post_match' && opponent && (
        <div className="rounded-3xl bg-[#0B1120]/90 border border-white/10 p-7 sm:p-8 shadow-[0_15px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl space-y-6 animate-fade-in my-4">
          <div className="text-center">
            <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-3 shadow-lg ${
              matchResult === 'win' 
                ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-400 shadow-neon-emerald' 
                : 'bg-red-500/20 border border-red-500 text-red-400 shadow-neon-crimson'
            }`}>
              <Trophy className="w-8 h-8" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {matchResult === 'win' ? 'DECISIVE VICTORY!' : 'OPERATIONAL DEFEAT'}
            </h2>
            <div className="flex items-center justify-center gap-2 mt-1.5">
              <span className={`font-mono font-bold text-lg ${matchResult === 'win' ? 'text-emerald-400' : 'text-red-400'}`}>
                {eloDelta > 0 ? `+${eloDelta}` : eloDelta} ELO
              </span>
              <span className="text-xs text-slate-400 font-mono">
                (New Rating: {userState.elo} ELO)
              </span>
            </div>
          </div>

          {/* Post-Match Accuracy & Speed Comparison */}
          <div className="bg-[#060A12]/80 border border-white/10 rounded-2xl p-4 divide-y divide-white/5 shadow-inner">
            <div className="grid grid-cols-3 py-2 text-center text-xs font-mono">
              <span className="font-bold text-emerald-400">{userState.username}</span>
              <span className="text-slate-400 font-semibold uppercase">Metric</span>
              <span className="font-bold text-red-400">{opponent.name}</span>
            </div>

            {/* Score */}
            <div className="grid grid-cols-3 py-2 text-center text-xs font-mono">
              <span className="font-bold text-white">{userScore} / 5</span>
              <span className="text-slate-400">Total Score</span>
              <span className="font-bold text-white">{opponentScore} / 5</span>
            </div>

            {/* Accuracy */}
            <div className="grid grid-cols-3 py-2 text-center text-xs font-mono">
              <span className="font-bold text-emerald-300">
                {Math.round((userScore / (matchChallenges.length || 5)) * 100)}%
              </span>
              <span className="text-slate-400">Accuracy</span>
              <span className="font-bold text-slate-300">
                {Math.round((opponentScore / (matchChallenges.length || 5)) * 100)}%
              </span>
            </div>

            {/* Average Speed */}
            <div className="grid grid-cols-3 py-2 text-center text-xs font-mono">
              <span className="font-bold text-emerald-300">3.8s</span>
              <span className="text-slate-400">Avg Speed</span>
              <span className="font-bold text-slate-300">4.9s</span>
            </div>
          </div>

          {/* Win Streak Trap CTA or Rematch */}
          <div className="space-y-3">
            <button
              onClick={() => {
                // If user has 0 tickets left, trigger Paywall 3 Win Streak Trap!
                if (!userState.isPro && userState.arenaTickets <= 0) {
                  onOpenPaywall('win_streak_trap');
                } else {
                  handleStartMatchmaking();
                }
              }}
              className="w-full py-4 px-4 rounded-xl font-mono font-extrabold text-sm sm:text-base text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-400 to-indigo-400 hover:from-emerald-300 hover:to-indigo-300 transition-all shadow-neon-emerald flex items-center justify-center gap-2 transform active:scale-98"
            >
              <RotateCcw className="w-4 h-4" />
              <span>PLAY AGAIN (PROTECT WIN STREAK)</span>
            </button>

            {/* Viral Growth & Challenge a Friend */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => {
                  sound.playExploitSuccess();
                  const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://zeroday.gg';
                  const seed = `blitz_${Math.floor(Math.random() * 90000 + 10000)}`;
                  const duelUrl = `${origin}/?seed=${seed}&elo=${userState.elo}&challenger=${encodeURIComponent(userState.username)}&score=${userScore}`;
                  navigator.clipboard.writeText(`[ZeroDay Arena] I scored ${userScore}/5 (ELO: ${userState.elo} · Win Streak: x${userState.winStreak})! Beat my time: ${duelUrl}`);
                  setCopiedDuelLink(true);
                  confetti({ particleCount: 35, spread: 60, origin: { y: 0.8 } });
                  setTimeout(() => setCopiedDuelLink(false), 2500);
                }}
                className="py-3 px-3 rounded-xl border border-indigo-500/30 bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-300 font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-98"
              >
                {copiedDuelLink ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">DUEL LINK COPIED!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-indigo-400" />
                    <span>CHALLENGE A FRIEND 1v1</span>
                  </>
                )}
              </button>

              {onOpenHackerCard && (
                <button
                  onClick={() => {
                    sound.playTap();
                    onOpenHackerCard();
                  }}
                  className="py-3 px-3 rounded-xl border border-emerald-500/30 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-98"
                >
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>HACKER ID CARD (9:16)</span>
                </button>
              )}
            </div>

            <button
              onClick={() => setPhase('idle')}
              className="w-full py-2.5 text-xs text-slate-400 hover:text-white font-mono"
            >
              Return to Arena Lobby
            </button>
          </div>
        </div>
      )}

      {/* Sudden Death Survival Mode Gauntlet Modal */}
      <SurvivalModeModal
        isOpen={isSurvivalOpen}
        onClose={() => setIsSurvivalOpen(false)}
        userState={userState}
        onUpdateHighScore={(score, gainedXp) => {
          onUpdateSurvivalScore?.(score, gainedXp);
        }}
      />
    </div>
  );
};
