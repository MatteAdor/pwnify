import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserState, PvPPlayer, PvPChallenge, PaywallContext } from '../../types';
import { SMART_BOTS, generatePvPMatchChallenges } from '../../data/pvpChallenges';
import { getRankFromElo } from '../../data/ranks';
import { sound } from '../../utils/soundEngine';
import { 
  Swords, Flame, Zap, Trophy, Timer, 
  RotateCcw, Sparkles, CheckCircle2, Copy, Skull, Ticket,
  Radio, Wifi, Users, Share2, Globe, Link2, X, AlertCircle, ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';

import { SurvivalModeModal } from './SurvivalModeModal';
import { LeagueTab } from '../Leaderboard/LeagueTab';
import { useLanguage } from '../../utils/language';
import { 
  hostOnlineDuel, 
  joinOnlineDuel, 
  OnlineMatchSession, 
  generateRoomCode 
} from '../../utils/multiplayerEngine';
import { getDuelCodeFromUrl } from '../../utils/cloudSync';

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

  // Online P2P Multiplayer States
  const [onlineSession, setOnlineSession] = useState<OnlineMatchSession | null>(null);
  const [isDuelModalOpen, setIsDuelModalOpen] = useState<boolean>(false);
  const [duelModalTab, setDuelModalTab] = useState<'host' | 'join'>('host');
  const [hostedRoomCode, setHostedRoomCode] = useState<string | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [isConnectingOnline, setIsConnectingOnline] = useState<boolean>(false);
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [copiedRoomLink, setCopiedRoomLink] = useState<boolean>(false);
  const [opponentAnswerFeedback, setOpponentAnswerFeedback] = useState<{ isCorrect: boolean; streak: number } | null>(null);
  const hostCancelRef = useRef<(() => void) | null>(null);

  // Dynamic Match Challenges Pool
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

  const userRank = getRankFromElo(userState.elo);

  // Check URL parameters on mount for deep-linked duel
  useEffect(() => {
    const duelCode = getDuelCodeFromUrl();
    if (duelCode && !onlineSession && phase === 'idle') {
      setJoinCodeInput(duelCode);
      setIsDuelModalOpen(true);
      setDuelModalTab('join');
    }
  }, []);

  const endMatch = useCallback(() => {
    const isWin = userScore >= opponentScore;
    setMatchResult(isWin ? 'win' : 'loss');
    const gained = isWin ? 26 + Math.floor(Math.random() * 8) : -18;
    setEloDelta(gained);

    if (onlineSession) {
      onlineSession.sendFinished(userScore);
    }

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
  }, [userScore, opponentScore, onWinMatch, onLossMatch, onlineSession]);

  // Handle Incoming URL Duel Challenge fallback
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

  // Public Matchmaking Radar Timer
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

          // If no human connected after 2.8s, pair with a calibrated cyber sentinel
          if (next >= 2.8) {
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

  // Cleanup online session on unmount or return to lobby
  useEffect(() => {
    return () => {
      if (onlineSession) {
        onlineSession.disconnect();
      }
      if (hostCancelRef.current) {
        hostCancelRef.current();
      }
    };
  }, [onlineSession]);

  const handleStartQuickMatch = () => {
    const hasTicket = onConsumeTicket();
    if (!hasTicket) {
      sound.playPayloadBlocked();
      onOpenPaywall('win_streak_trap');
      return;
    }

    sound.playTap();
    if (onlineSession) {
      onlineSession.disconnect();
      setOnlineSession(null);
    }
    setSearchTimer(0);
    setPhase('searching');
  };

  // --- ONLINE DUEL: HOST ROOM ---
  const handleHostRoom = async () => {
    sound.playTap();
    setOnlineError(null);
    setIsConnectingOnline(true);

    try {
      const code = generateRoomCode();
      setHostedRoomCode(code);

      const hostHandle = await hostOnlineDuel(
        {
          username: userState.username,
          elo: userState.elo,
          rank: userRank.tier,
          profession: userState.profession
        },
        code
      );

      hostCancelRef.current = hostHandle.cancel;
      setIsConnectingOnline(false);

      // Await opponent to join
      hostHandle.waitForOpponent().then((session) => {
        sound.playVictoryFanfare();
        bindOnlineSession(session);
      }).catch((err) => {
        console.warn('Host waiting error:', err);
      });
    } catch (e: any) {
      setIsConnectingOnline(false);
      setOnlineError(e.message || 'Errore inizializzazione stanza online.');
    }
  };

  // --- ONLINE DUEL: JOIN ROOM ---
  const handleJoinRoom = async () => {
    const code = joinCodeInput.trim().toUpperCase();
    if (!code || code.length < 3) {
      setOnlineError('Inserisci un codice stanza valido (es. 0x4B21).');
      sound.playPayloadBlocked();
      return;
    }

    const hasTicket = onConsumeTicket();
    if (!hasTicket) {
      sound.playPayloadBlocked();
      onOpenPaywall('win_streak_trap');
      return;
    }

    sound.playTap();
    setOnlineError(null);
    setIsConnectingOnline(true);

    try {
      const session = await joinOnlineDuel(code, {
        username: userState.username,
        elo: userState.elo,
        rank: userRank.tier,
        profession: userState.profession
      });

      setIsConnectingOnline(false);
      sound.playExploitSuccess();
      bindOnlineSession(session);
    } catch (e: any) {
      setIsConnectingOnline(false);
      setOnlineError(e.message || 'Stanza non trovata o host disconnesso.');
      sound.playPayloadBlocked();
    }
  };

  // Binds an active P2P session into match flow
  const bindOnlineSession = (session: OnlineMatchSession) => {
    setOnlineSession(session);
    setOpponent(session.opponent);
    setMatchChallenges(session.challenges);
    setUserScore(0);
    setOpponentScore(0);
    setCurrentChallengeIndex(0);
    setSelectedOptionId(null);
    setIsDuelModalOpen(false);

    // Setup live incoming packet callbacks
    session.onOpponentAnswer((data) => {
      setOpponentScore(data.opponentScore);
      setOpponentAnswerFeedback({
        isCorrect: data.isCorrect,
        streak: data.streak
      });
      sound.playEloTick();
      setTimeout(() => setOpponentAnswerFeedback(null), 2500);
    });

    session.onOpponentFinished((data) => {
      setOpponentScore(data.finalScore);
    });

    session.onDisconnect(() => {
      setOnlineError('L\'avversario si è disconnesso dalla sessione.');
    });

    setPhase('vs_screen');

    setTimeout(() => {
      setPhase('battle');
      questionStartTimeRef.current = Date.now();
    }, 2500);
  };

  const handleSelectAnswer = (optionId: string) => {
    if (selectedOptionId) return; // Prevent double taps
    sound.playTap();
    setSelectedOptionId(optionId);

    const challenge = matchChallenges[currentChallengeIndex];
    const isCorrect = challenge.options.find(o => o.id === optionId)?.isCorrect || false;

    const newScore = isCorrect ? userScore + 1 : userScore;
    if (isCorrect) {
      sound.playExploitSuccess();
      setUserScore(newScore);
    } else {
      sound.playPayloadBlocked();
    }

    // Broadcast live answer to opponent via WebRTC P2P
    if (onlineSession) {
      onlineSession.sendAnswer(
        isCorrect, 
        newScore, 
        userState.winStreak + (isCorrect ? 1 : 0), 
        currentChallengeIndex
      );
    } else {
      // Local Bot answering simulation if offline
      const botAccuracy = opponent?.isBot ? 0.65 : 0.75;
      const botCorrect = Math.random() < botAccuracy;
      if (botCorrect) {
        setOpponentScore(prev => prev + 1);
      }
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

  const currentChallenge = matchChallenges[currentChallengeIndex];
  const totalPoints = userScore + opponentScore;
  const userRatio = totalPoints > 0 ? (userScore / totalPoints) * 100 : 50;

  return (
    <div className="w-full max-w-xl mx-auto space-y-4 font-sans">
      {/* PHASE 1: IDLE / LOBBY */}
      {phase === 'idle' && (
        <div className="space-y-4">
          {/* Top Banner: Arena Status & Tickets */}
          <div className="rounded-xl bg-[#0D121D] border border-zinc-800 p-4 flex items-center justify-between shadow-md">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10B981]" />
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                  <Swords className="w-4 h-4 text-emerald-400" />
                  {t.blitzArenaTitle}
                </h1>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                  P2P REALTIME
                </span>
              </div>
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

          {/* Action Center Card: Online Matchmaking & Private Duels */}
          <div className="rounded-xl bg-[#0D121D] border border-zinc-800 p-5 space-y-4 shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-400" />
                  <span>{isEn ? 'Cyber Warfare Grid' : 'Griglia Duelli Online'}</span>
                </h2>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  {isEn 
                    ? `Live 60-second synchronized combat calibrated to ELO ${userState.elo} (${userRank.tier}).`
                    : `Combattimento sincronizzato a 60 secondi calibrato sul tuo ELO ${userState.elo} (${userRank.tier}).`}
                </p>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-400 shrink-0">
                <Wifi className="w-3 h-3 text-emerald-400" />
                <span>WEBRTC 0MS</span>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {/* Quick Match Online */}
              <button
                type="button"
                onClick={handleStartQuickMatch}
                className="py-3 px-4 rounded-xl font-mono font-bold text-xs text-zinc-950 bg-emerald-500 hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/10 active:scale-[0.99]"
              >
                <Zap className="w-4 h-4 fill-zinc-950 text-zinc-950" />
                <span>{isEn ? 'QUICK MATCH ONLINE' : 'DUEL CASUALE (ONLINE)'}</span>
              </button>

              {/* Private Room Duel (Challenge Friend) */}
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setIsDuelModalOpen(true);
                  if (!hostedRoomCode) {
                    handleHostRoom();
                  }
                }}
                className="py-3 px-4 rounded-xl font-mono font-bold text-xs text-zinc-200 bg-zinc-900 border border-zinc-700/80 hover:border-emerald-500/60 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                <Share2 className="w-4 h-4 text-emerald-400" />
                <span>{isEn ? 'CHALLENGE A FRIEND' : 'SFIDA UN AMICO (CODICE)'}</span>
              </button>
            </div>

            {/* Offline Survival Mode */}
            <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
              <span className="text-[11px] font-mono text-zinc-400">
                {isEn ? 'Solo offline training:' : 'Addestramento offline:'}
              </span>
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setIsSurvivalOpen(true);
                }}
                className="py-1.5 px-3 rounded-lg font-mono font-bold text-[11px] text-rose-300 bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/40 transition-colors flex items-center gap-1.5 cursor-pointer"
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
            <Radio className="w-12 h-12 animate-pulse text-emerald-400" />
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white font-mono">
              {isEn ? 'Searching Online Opponent...' : 'Ricerca Avversario Online...'}
            </h2>
            <p className="text-xs text-zinc-400 font-mono">
              {isEn ? 'Calibrating ELO' : 'Calibrazione ELO'} {userState.elo} · WebRTC P2P Radar
            </p>
          </div>

          <div className="w-48 mx-auto h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <div 
              className="bg-emerald-500 h-full transition-all duration-100"
              style={{ width: `${Math.min(100, (searchTimer / 2.8) * 100)}%` }}
            />
          </div>

          <button
            type="button"
            onClick={() => {
              sound.playTap();
              setPhase('idle');
            }}
            className="text-xs text-zinc-400 hover:text-white font-mono underline cursor-pointer"
          >
            {isEn ? 'Cancel Search' : 'Annulla Ricerca'}
          </button>
        </div>
      )}

      {/* PHASE 3: VS SCREEN */}
      {phase === 'vs_screen' && opponent && (
        <div className="rounded-xl bg-[#0D121D] border border-zinc-800 p-6 space-y-6 text-center my-8 animate-fadeIn">
          <div className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-bold flex items-center justify-center gap-1.5">
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span>{onlineSession ? 'LIVE P2P OPPONENT CONNECTED' : 'OPERATOR LOCKED'}</span>
          </div>

          <div className="flex items-center justify-around">
            {/* User */}
            <div className="space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-zinc-800 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 font-mono font-bold text-xl mx-auto shadow-lg shadow-emerald-500/20">
                {userState.username.slice(0, 2).toUpperCase()}
              </div>
              <h3 className="font-mono font-bold text-sm text-white truncate">{userState.username}</h3>
              <div className="text-xs font-mono text-zinc-300">{userState.elo} ELO</div>
              <div className="text-[10px] font-mono text-emerald-400">{userRank.tier}</div>
            </div>

            <div className="text-2xl font-bold font-mono text-zinc-600">VS</div>

            {/* Opponent */}
            <div className="space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-zinc-800 border-2 border-rose-500 flex items-center justify-center text-rose-400 font-mono font-bold text-xl mx-auto shadow-lg shadow-rose-500/20">
                {opponent.avatar}
              </div>
              <h3 className="font-mono font-bold text-sm text-white truncate">{opponent.name}</h3>
              <div className="text-xs font-mono text-zinc-300">{opponent.elo} ELO</div>
              <div className="text-[10px] font-mono text-rose-400">{opponent.rank}</div>
            </div>
          </div>

          <div className="text-xs font-mono text-zinc-400 animate-pulse">
            {isEn ? 'Duel starting in 3 seconds...' : 'Inizio duello tra 3 secondi...'}
          </div>
        </div>
      )}

      {/* PHASE 4: 60s BLITZ BATTLE IN-GAME */}
      {phase === 'battle' && opponent && currentChallenge && (
        <div className="space-y-4">
          {/* Top Score Bar & Timer */}
          <div className="rounded-xl bg-[#0D121D] border border-zinc-800 p-4 space-y-3 shadow-md">
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-400">{userState.username}</span>
                <span className="text-white font-bold">{userScore} PTS</span>
              </div>

              <div className="flex items-center gap-1.5 font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
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

            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
              <span>ROUND {currentChallengeIndex + 1} OF {matchChallenges.length}</span>
              {onlineSession ? (
                <span className="text-emerald-400 flex items-center gap-1 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  LIVE P2P · {onlineSession.latencyMs}ms
                </span>
              ) : (
                <span className="text-zinc-500">PRACTICE SENTINEL</span>
              )}
            </div>

            {/* Live Opponent Action Banner */}
            {opponentAnswerFeedback && (
              <div className={`text-[11px] font-mono px-2 py-1 rounded border text-center transition-all ${
                opponentAnswerFeedback.isCorrect 
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' 
                  : 'bg-zinc-800/80 border-zinc-700 text-zinc-400'
              }`}>
                {opponent.name} {opponentAnswerFeedback.isCorrect ? 'trovato exploit! (+1 PTS)' : 'payload bloccato (0 PTS)'}
              </div>
            )}
          </div>

          {/* Active Challenge Card */}
          <div className="rounded-xl bg-[#0D121D] border border-zinc-800 p-5 space-y-4 shadow-md">
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

      {/* PHASE 5: POST-MATCH VICTORY/DEFEAT */}
      {phase === 'post_match' && opponent && (
        <div className="rounded-xl bg-[#0D121D] border border-zinc-800 p-6 space-y-5 my-6 text-center shadow-lg">
          <div>
            <h2 className={`text-2xl font-extrabold font-mono uppercase tracking-wider ${
              matchResult === 'win' ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {matchResult === 'win' ? (isEn ? 'MISSION ACCOMPLISHED' : 'VITTORIA TATTICA') : (isEn ? 'OPERATOR DEFEATED' : 'SCONFITTA TATTICA')}
            </h2>
            <p className="text-xs text-zinc-400 font-mono mt-1">
              {matchResult === 'win' ? (isEn ? 'Payload delivered with sub-millisecond precision' : 'Payload completato prima dell\'avversario') : (isEn ? 'Opponent extracted flag first' : 'L\'avversario ha estratto la flag per primo')}
            </p>
          </div>

          {/* ELO Delta Badge */}
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 font-mono max-w-xs mx-auto space-y-1">
            <span className="text-[10px] text-zinc-400 uppercase">RATING ADJUSTMENT</span>
            <div className={`text-xl font-bold ${matchResult === 'win' ? 'text-emerald-400' : 'text-rose-400'}`}>
              {matchResult === 'win' ? `+${eloDelta}` : `${eloDelta}`} ELO
            </div>
            <div className="text-xs text-zinc-300">
              Current Rating: <span className="text-white font-bold">{userState.elo}</span>
            </div>
          </div>

          {/* Match Score Summary */}
          <div className="bg-zinc-950 rounded-lg p-3 text-xs font-mono space-y-1 border border-zinc-800/80">
            <div className="grid grid-cols-3 py-1.5 text-center border-b border-zinc-800">
              <span className="text-emerald-400 font-bold">{userState.username}</span>
              <span className="text-zinc-500">OPERATOR</span>
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
                  handleStartQuickMatch();
                }
              }}
              className="w-full py-3 px-4 rounded-xl font-mono font-bold text-xs text-zinc-950 bg-emerald-500 hover:bg-emerald-400 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isEn ? 'PLAY ANOTHER MATCH' : 'NUOVO MATCH ONLINE'}</span>
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  sound.playExploitSuccess();
                  const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://zeroday.gg';
                  const room = hostedRoomCode || generateRoomCode();
                  const duelUrl = `${origin}/?duel=${room}`;
                  navigator.clipboard.writeText(`[ZeroDay Arena] Ti sfido a duello 1v1 online su ZeroDay! Entra nella mia stanza: ${duelUrl}`);
                  setCopiedDuelLink(true);
                  setTimeout(() => setCopiedDuelLink(false), 2500);
                }}
                className="flex-1 py-2 px-3 rounded-lg border border-zinc-800 bg-zinc-900 hover:border-zinc-700 text-zinc-300 font-mono text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedDuelLink ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
                <span>{copiedDuelLink ? 'LINK COPIATO!' : 'SFIDA CON LINK'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onlineSession) {
                    onlineSession.disconnect();
                    setOnlineSession(null);
                  }
                  setPhase('idle');
                }}
                className="py-2 px-4 rounded-lg text-xs text-zinc-400 hover:text-white font-mono cursor-pointer"
              >
                Lobby
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PRIVATE DUEL ROOM (HOST OR JOIN) */}
      {isDuelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-[#0D121D] border border-zinc-800 rounded-2xl p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => {
                sound.playTap();
                setIsDuelModalOpen(false);
                if (hostCancelRef.current) hostCancelRef.current();
              }}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-emerald-400" />
                  <span>{isEn ? 'Private Duel Staging Room' : 'Stanza Privata Duello 1v1'}</span>
                </h3>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                {isEn ? 'Direct encrypted WebRTC data channel between two operators.' : 'Canale cifrato diretto peer-to-peer tra due dispositivi.'}
              </p>
            </div>

            {/* Tabs: Host vs Join */}
            <div className="grid grid-cols-2 p-1 bg-zinc-950 rounded-xl border border-zinc-800 text-xs font-mono">
              <button
                onClick={() => {
                  sound.playTap();
                  setDuelModalTab('host');
                  if (!hostedRoomCode) handleHostRoom();
                }}
                className={`py-2 rounded-lg font-bold transition-colors ${
                  duelModalTab === 'host' ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {isEn ? 'HOST DUEL' : 'CREA STANZA'}
              </button>
              <button
                onClick={() => {
                  sound.playTap();
                  setDuelModalTab('join');
                  setOnlineError(null);
                }}
                className={`py-2 rounded-lg font-bold transition-colors ${
                  duelModalTab === 'join' ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {isEn ? 'JOIN CODE' : 'ENTRA CON CODICE'}
              </button>
            </div>

            {/* HOST TAB CONTENT */}
            {duelModalTab === 'host' && (
              <div className="space-y-4 text-center">
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">
                    CODICE STANZA ATTIVA
                  </span>
                  <div className="text-3xl font-extrabold font-mono text-emerald-400 tracking-wider">
                    {hostedRoomCode || 'GENERAZIONE...'}
                  </div>
                  <p className="text-[11px] font-mono text-zinc-400">
                    Condividi questo codice con il tuo avversario
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => {
                      sound.playExploitSuccess();
                      const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://zeroday.gg';
                      const link = `${origin}/?duel=${hostedRoomCode}`;
                      navigator.clipboard.writeText(`Entra nel duello 1v1 su ZeroDay! Codice: ${hostedRoomCode} | Link diretto: ${link}`);
                      setCopiedRoomLink(true);
                      setTimeout(() => setCopiedRoomLink(false), 2500);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-emerald-500 text-zinc-200 font-mono text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {copiedRoomLink ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-zinc-400" />}
                    <span>{copiedRoomLink ? 'LINK DIRETTO COPIATO!' : 'COPIA LINK DI INVITO'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs font-mono text-zinc-400 py-2">
                  <Radio className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>In attesa che l'avversario entri nella stanza...</span>
                </div>
              </div>
            )}

            {/* JOIN TAB CONTENT */}
            {duelModalTab === 'join' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-mono text-zinc-300 block">
                    Inserisci il codice della stanza (es. 0x7B21):
                  </label>
                  <input
                    type="text"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    placeholder="0x...."
                    maxLength={8}
                    className="w-full py-3 px-4 rounded-xl bg-zinc-950 border border-zinc-800 text-emerald-400 font-mono font-bold text-center text-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {onlineError && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{onlineError}</span>
                  </div>
                )}

                <button
                  type="button"
                  disabled={isConnectingOnline || !joinCodeInput.trim()}
                  onClick={handleJoinRoom}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-mono font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  {isConnectingOnline ? (
                    <>
                      <Radio className="w-4 h-4 animate-spin" />
                      <span>CONNESSIONE ALL'HOST...</span>
                    </>
                  ) : (
                    <>
                      <span>ENTRA E AVVIA IL DUELLO</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}
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
