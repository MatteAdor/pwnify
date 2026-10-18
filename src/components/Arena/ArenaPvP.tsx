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
import { useLanguage } from '../../utils/language';

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
  const { lang, t } = useLanguage();
  const isEn = lang === 'en';
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
        particleCount: 60,
        spread: 60,
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

  // Matchmaking radar timer
  useEffect(() => {
    let interval: any;
    if (phase === 'searching') {
      sound.playRadarPing();
      radarPingCounterRef.current = 0;
      interval = setInterval(() => {
        setSearchTimer(prev => {
          const next = prev + 0.1;
          radarPingCounterRef.current += 1;
          if (radarPingCounterRef.current % 12 === 0) {
            sound.playRadarPing();
          }
          if (next >= 1.6) {
            clearInterval(interval);
            const pool = SMART_BOTS.filter(b => Math.abs(b.elo - userState.elo) < 350);
            const matchedBot = pool.length > 0 
              ? pool[Math.floor(Math.random() * pool.length)] 
              : SMART_BOTS[0];

            setOpponent(matchedBot);
            const generated = generatePvPMatchChallenges(userState.elo, 5);
            setMatchChallenges(generated);
            setUserScore(0);
            setOpponentScore(0);
            setCurrentChallengeIndex(0);
            setSelectedOptionId(null);
            setPhase('vs_screen');
            sound.playExploitSuccess();

            setTimeout(() => {
              setPhase('battle');
              questionStartTimeRef.current = Date.now();
            }, 2500);
          }
          return next;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [phase, userState.elo]);

  // 60-Second Battle Countdown
  useEffect(() => {
    let interval: any;
    if (phase === 'battle') {
      setBattleTimer(60);
      interval = setInterval(() => {
        setBattleTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            endMatch();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [phase, endMatch]);

  const handleStartMatchmaking = () => {
    const hasTicket = onConsumeTicket();
    if (!hasTicket) {
      sound.playPayloadBlocked();
      onOpenPaywall('win_streak_trap');
      return;
    }

    sound.playTap();
    setSearchTimer(0);
    setPhase('searching');
  };

  const handleSelectAnswer = (optionId: string) => {
    if (selectedOptionId) return; // Prevent double taps
    sound.playTap();
    setSelectedOptionId(optionId);

    const challenge = matchChallenges[currentChallengeIndex];
    const isCorrect = challenge.options.find(o => o.id === optionId)?.isCorrect || false;

    if (isCorrect) {
      sound.playExploitSuccess();
      setUserScore(prev => prev + 1);
    } else {
      sound.playPayloadBlocked();
    }

    // Bot answering simulation
    const botAccuracy = opponent?.isBot ? 0.65 : 0.75;
    const botCorrect = Math.random() < botAccuracy;
    if (botCorrect) {
      setOpponentScore(prev => prev + 1);
    }

    // Advance to next question or end match
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

  const totalPoints = userScore + opponentScore;
  const userRatio = totalPoints === 0 ? 50 : Math.round((userScore / totalPoints) * 100);

  return (
    <div className="w-full max-w-xl mx-auto px-3.5 sm:px-4 py-4 pb-24 space-y-4 font-sans">
      {/* PHASE 1: IDLE / LOBBY */}
      {phase === 'idle' && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-baseline justify-between gap-2 border-b border-zinc-800 pb-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {t.blitzArenaTitle}
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                {t.blitzArenaSub}
              </p>
            </div>
            <div className="flex items-center gap-3 text-right font-mono shrink-0">
              <div>
                <span className="text-[10px] text-zinc-400 block uppercase">STREAK</span>
                <span className="text-amber-400 font-bold text-sm">x{userState.winStreak}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block uppercase">TICKETS</span>
                <span className="text-indigo-400 font-bold text-sm">
                  {userState.isPro ? 'UNLIMITED' : `${userState.arenaTickets}/${userState.maxTickets}`}
                </span>
              </div>
            </div>
          </div>

          {/* Action Center Card */}
          <div className="rounded-xl bg-[#0D121D] border border-zinc-800 p-5 space-y-4">
            <div>
              <h2 className="text-base font-bold text-white">
                {isEn ? 'Matchmaking Calibration' : 'Duello Tattico 1v1'}
              </h2>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                {isEn 
                  ? `Compete on synchronized exam questions calibrated to ELO ${userState.elo} (${userRank.tier}).`
                  : `Affronta un operatore calibrato sul tuo ELO ${userState.elo} (${userRank.tier}) su 5 quesiti tecnici.`}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={handleStartMatchmaking}
                className="flex-1 py-2.5 px-4 rounded-lg font-mono font-bold text-xs text-zinc-950 bg-emerald-500 hover:bg-emerald-400 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 fill-zinc-950 text-zinc-950" />
                <span>{t.findOpponentBlitz}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setIsSurvivalOpen(true);
                }}
                className="py-2.5 px-4 rounded-lg font-mono font-bold text-xs text-rose-300 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Skull className="w-3.5 h-3.5 text-rose-400" />
                <span>{t.survivalGauntlet} (x{userState.survivalHighScore || 0})</span>
              </button>
            </div>
          </div>

          {/* Global Leaderboard & Leagues */}
          <div className="pt-2 border-t border-zinc-800 space-y-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <div>
                <h3 className="text-sm font-mono font-bold text-white">
                  {t.leaguesTitle}
                </h3>
                <p className="text-[11px] text-zinc-400">
                  {t.leaguesSub}
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

      {/* PHASE 2: MATCHMAKING SEARCHING */}
      {phase === 'searching' && (
        <div className="rounded-xl bg-[#0D121D] border border-zinc-800 p-8 text-center space-y-4 my-8">
          <div className="flex items-center justify-center text-emerald-400">
            <Swords className="w-8 h-8 animate-pulse" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-white font-mono">
              SEARCHING MATCH
            </h3>
            <p className="text-xs text-zinc-400 font-mono mt-1">
              Calibrating question pool for ELO {userState.elo} ({searchTimer.toFixed(1)}s)
            </p>
          </div>

          <div className="text-xs font-mono text-zinc-400 flex items-center justify-center gap-2 pt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Pool: CompTIA Security+, CCNA & CEH active</span>
          </div>
        </div>
      )}

      {/* PHASE 3: PRE-MATCH VS SCREEN */}
      {phase === 'vs_screen' && opponent && (
        <div className="space-y-4 my-6">
          <div className="text-center font-mono text-xs text-zinc-400">
            ROUND STARTS IN 2s
          </div>

          <div className="grid grid-cols-2 gap-3 relative">
            {/* User */}
            <div className="p-4 rounded-xl bg-[#0D121D] border border-zinc-800 text-center space-y-2">
              <div className="text-xs font-mono font-bold text-emerald-400">OPERATOR</div>
              <h3 className="font-mono font-bold text-sm text-white truncate">{userState.username}</h3>
              <div className="text-xs font-mono text-zinc-300">{userState.elo} ELO</div>
              <div className="text-[10px] font-mono text-zinc-400">{userRank.tier}</div>
            </div>

            {/* Opponent */}
            <div className="p-4 rounded-xl bg-[#0D121D] border border-zinc-800 text-center space-y-2">
              <div className="text-xs font-mono font-bold text-rose-400">OPPONENT</div>
              <h3 className="font-mono font-bold text-sm text-white truncate">{opponent.name}</h3>
              <div className="text-xs font-mono text-zinc-300">{opponent.elo} ELO</div>
              <div className="text-[10px] font-mono text-zinc-400">{opponent.rank}</div>
            </div>
          </div>
        </div>
      )}

      {/* PHASE 4: 60s BLITZ BATTLE IN-GAME */}
      {phase === 'battle' && opponent && currentChallenge && (
        <div className="space-y-4">
          {/* Top Score Bar & Timer */}
          <div className="rounded-xl bg-[#0D121D] border border-zinc-800 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-400">{userState.username}</span>
                <span className="text-white font-bold">{userScore} PTS</span>
              </div>

              <div className="flex items-center gap-1 font-bold text-amber-400">
                <Timer className="w-3.5 h-3.5" />
                <span>{battleTimer}s</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-white font-bold">{opponentScore} PTS</span>
                <span className="font-bold text-rose-400">{opponent.name}</span>
              </div>
            </div>

            {/* Split Score Bar */}
            <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden flex">
              <div 
                className="bg-emerald-500 h-full transition-all duration-300"
                style={{ width: `${userRatio}%` }}
              />
              <div 
                className="bg-rose-500 h-full transition-all duration-300"
                style={{ width: `${100 - userRatio}%` }}
              />
            </div>

            <div className="text-[10px] font-mono text-zinc-400 text-center">
              ROUND {currentChallengeIndex + 1} OF {matchChallenges.length}
            </div>
          </div>

          {/* Active Challenge Card */}
          <div className="rounded-xl bg-[#0D121D] border border-zinc-800 p-5 space-y-4">
            <h3 className="font-bold text-sm sm:text-base text-white leading-relaxed">
              {currentChallenge.question}
            </h3>

            {currentChallenge.codeSnippet && (
              <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3 font-mono text-xs text-emerald-300 overflow-x-auto">
                <pre>{currentChallenge.codeSnippet}</pre>
              </div>
            )}

            {/* Options */}
            <div className="grid grid-cols-1 gap-2">
              {currentChallenge.options.map((opt) => {
                const isSelected = selectedOptionId === opt.id;
                let optStyle = 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-200';

                if (selectedOptionId) {
                  if (opt.isCorrect) {
                    optStyle = 'bg-emerald-950/60 border-emerald-500 text-emerald-300';
                  } else if (isSelected && !opt.isCorrect) {
                    optStyle = 'bg-rose-950/60 border-rose-500 text-rose-300';
                  }
                }

                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={!!selectedOptionId}
                    onClick={() => handleSelectAnswer(opt.id)}
                    className={`p-3.5 rounded-lg border text-left text-xs sm:text-sm font-mono transition-colors flex items-center justify-between cursor-pointer ${optStyle}`}
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

      {/* PHASE 5: POST-MATCH ANALYSIS */}
      {phase === 'post_match' && opponent && (
        <div className="rounded-xl bg-[#0D121D] border border-zinc-800 p-6 space-y-5 my-4">
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-white">
              {matchResult === 'win' ? 'VICTORY' : 'DEFEAT'}
            </h2>
            <div className="font-mono text-sm">
              <span className={`font-bold ${matchResult === 'win' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {eloDelta > 0 ? `+${eloDelta}` : eloDelta} ELO
              </span>
              <span className="text-zinc-400 ml-1.5">
                ({userState.elo} ELO)
              </span>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 divide-y divide-zinc-800 text-xs font-mono">
            <div className="grid grid-cols-3 py-1.5 text-center text-zinc-400 uppercase text-[10px]">
              <span className="text-emerald-400 font-bold">{userState.username}</span>
              <span>Metric</span>
              <span className="text-rose-400 font-bold">{opponent.name}</span>
            </div>

            <div className="grid grid-cols-3 py-1.5 text-center text-white">
              <span>{userScore} / 5</span>
              <span className="text-zinc-400">Score</span>
              <span>{opponentScore} / 5</span>
            </div>

            <div className="grid grid-cols-3 py-1.5 text-center text-white">
              <span>{Math.round((userScore / (matchChallenges.length || 5)) * 100)}%</span>
              <span className="text-zinc-400">Accuracy</span>
              <span>{Math.round((opponentScore / (matchChallenges.length || 5)) * 100)}%</span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                if (!userState.isPro && userState.arenaTickets <= 0) {
                  onOpenPaywall('win_streak_trap');
                } else {
                  handleStartMatchmaking();
                }
              }}
              className="w-full py-2.5 px-4 rounded-lg font-mono font-bold text-xs text-zinc-950 bg-emerald-500 hover:bg-emerald-400 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isEn ? 'PLAY AGAIN' : 'GIOCA ANCORA'}</span>
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  sound.playExploitSuccess();
                  const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://zeroday.gg';
                  const seed = `blitz_${Math.floor(Math.random() * 90000 + 10000)}`;
                  const duelUrl = `${origin}/?seed=${seed}&elo=${userState.elo}&challenger=${encodeURIComponent(userState.username)}&score=${userScore}`;
                  navigator.clipboard.writeText(`[ZeroDay Arena] I scored ${userScore}/5 (ELO: ${userState.elo})! Beat my time: ${duelUrl}`);
                  setCopiedDuelLink(true);
                  setTimeout(() => setCopiedDuelLink(false), 2500);
                }}
                className="flex-1 py-2 px-3 rounded-lg border border-zinc-800 bg-zinc-900 hover:border-zinc-700 text-zinc-300 font-mono text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedDuelLink ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
                <span>{copiedDuelLink ? 'COPIED' : 'CHALLENGE FRIEND'}</span>
              </button>

              <button
                type="button"
                onClick={() => setPhase('idle')}
                className="py-2 px-4 rounded-lg text-xs text-zinc-400 hover:text-white font-mono cursor-pointer"
              >
                Lobby
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Survival Mode Gauntlet Modal */}
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

export default ArenaPvP;
