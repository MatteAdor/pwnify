import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserState, PvPPlayer, PvPChallenge, PaywallContext } from '../../types/index.ts';
import { SMART_BOTS, generatePvPMatchChallenges } from '../../data/pvpChallenges.ts';
import { getRankFromElo } from '../../data/ranks.ts';
import { sound } from '../../utils/soundEngine.ts';
import { 
  Swords, Flame, Zap, Trophy, Timer, 
  RotateCcw, Sparkles, CheckCircle2, Copy, Skull,
  Radio, Wifi, Users, Share2, Globe, Link2, X, AlertCircle, ArrowRight, ShieldAlert, ShieldCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';

import { SurvivalModeModal } from './SurvivalModeModal.tsx';
import { LeagueTab } from '../Leaderboard/LeagueTab.tsx';
import { useLanguage } from '../../utils/language.ts';
import { 
  hostOnlineDuel, 
  joinOnlineDuel, 
  OnlineMatchSession, 
  generateRoomCode 
} from '../../utils/multiplayerEngine.ts';
import { getDuelCodeFromUrl } from '../../utils/cloudSync.ts';
import { 
  RankedMatchController, 
  RankedQuestion, 
  RankedOpponentInfo, 
  RankedMatchResult 
} from '../../utils/rankedController.ts';
import { supabase, isSupabaseConfigured } from '../../config/supabase.ts';

export interface DuelChallengeData {
  seed: string;
  elo: number;
  challenger: string;
  score: number;
}

interface ArenaPvPProps {
  userState: UserState;
  onConsumeTicket: () => boolean;
  onWinMatch: (eloGain: number) => void;
  onLossMatch: (eloLoss: number) => void;
  onOpenPaywall: (context: PaywallContext) => void;
  onOpenHackerCard?: () => void;
  initialDuelChallenge?: DuelChallengeData | null;
  onClearInitialDuel?: () => void;
  onUpdateSurvivalScore?: (score: number, gainedXp: number) => void;
}

type MatchPhase = 'idle' | 'searching' | 'vs_screen' | 'battle' | 'post_match';
type MatchMode = 'ranked' | 'casual' | 'bot';

export const ArenaPvP: React.FC<ArenaPvPProps> = ({
  userState,
  onConsumeTicket,
  onWinMatch,
  onLossMatch,
  onOpenPaywall,
  initialDuelChallenge,
  onClearInitialDuel,
  onUpdateSurvivalScore
}) => {
  const { lang, t } = useLanguage();
  const isEn = lang === 'en';
  const [phase, setPhase] = useState<MatchPhase>('idle');
  const [matchMode, setMatchMode] = useState<MatchMode>('ranked');
  const [isSurvivalOpen, setIsSurvivalOpen] = useState<boolean>(false);
  const [searchTimer, setSearchTimer] = useState<number>(0);
  const [rankedStatusMsg, setRankedStatusMsg] = useState<string>('');
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  // Opponent Details
  const [opponent, setOpponent] = useState<PvPPlayer | null>(null);
  const [isOpponentLagging, setIsOpponentLagging] = useState<boolean>(false);

  // Casual P2P Multiplayer States
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

  // Ranked Controller
  const rankedControllerRef = useRef<RankedMatchController | null>(null);
  const rankedPollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Question State
  const [casualChallenges, setCasualChallenges] = useState<PvPChallenge[]>(() =>
    generatePvPMatchChallenges(userState.elo, 5)
  );
  const [rankedQuestions, setRankedQuestions] = useState<RankedQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [isAnswerGradedCorrect, setIsAnswerGradedCorrect] = useState<boolean | null>(null);

  // Battle State
  const [userScore, setUserScore] = useState<number>(0);
  const [opponentScore, setOpponentScore] = useState<number>(0);
  const [battleTimer, setBattleTimer] = useState<number>(60);
  const questionStartTimeRef = useRef<number>(0);

  // Post Match Results
  const [matchResult, setMatchResult] = useState<'win' | 'loss' | 'tie'>('win');
  const [eloDelta, setEloDelta] = useState<number>(0);
  const [copiedDuelLink, setCopiedDuelLink] = useState<boolean>(false);

  const userRank = getRankFromElo(userState.elo);

  // Clean up timers and sessions on unmount
  useEffect(() => {
    return () => {
      if (onlineSession) onlineSession.disconnect();
      if (hostCancelRef.current) hostCancelRef.current();
      if (rankedControllerRef.current) rankedControllerRef.current.destroy();
      if (rankedPollTimerRef.current) clearInterval(rankedPollTimerRef.current);
    };
  }, [onlineSession]);

  // Deep-linked casual duel check
  useEffect(() => {
    const duelCode = getDuelCodeFromUrl();
    if (duelCode && !onlineSession && phase === 'idle') {
      setJoinCodeInput(duelCode);
      setIsDuelModalOpen(true);
      setDuelModalTab('join');
    }
  }, []);

  // Handle incoming challenge fallback
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

      setMatchMode('casual');
      setOpponent(ghostOpponent);
      const generated = generatePvPMatchChallenges(initialDuelChallenge.elo, 5);
      setCasualChallenges(generated);
      setUserScore(0);
      setOpponentScore(0);
      setCurrentQuestionIndex(0);
      setSelectedOptionIndex(null);
      setIsAnswerGradedCorrect(null);
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

  // 60-second Battle Countdown Timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (phase === 'battle') {
      setBattleTimer(60);
      interval = setInterval(() => {
        setBattleTimer((prev) => {
          if (prev <= 1) {
            if (interval) clearInterval(interval);
            handleBattleTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [phase]);

  const handleBattleTimeout = () => {
    if (matchMode === 'ranked') {
      finalizeRankedMatch();
    } else {
      endCasualMatch();
    }
  };

  // ---------------------------------------------------------------------
  // 1. RANKED FLOW (SERVER-AUTHORITATIVE)
  // ---------------------------------------------------------------------

  const handleStartRankedMatchmaking = async () => {
    sound.playTap();
    setAuthNotice(null);
    setOnlineError(null);

    if (!isSupabaseConfigured) {
      setAuthNotice('Configurazione server non disponibile per il PvP Ranked.');
      return;
    }

    // Verify authentication and confirmed email
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) {
        setAuthNotice(isEn 
          ? 'Authentication required: Log in to enter Competitive Ranked Duels.' 
          : 'Accesso richiesto: effettua il login per accedere al PvP Ranked competitivo.');
        sound.playPayloadBlocked();
        return;
      }

      if (!user.email_confirmed_at) {
        setAuthNotice(isEn
          ? 'Email Verification Required: Confirm your email to participate in Ranked duels and protect ELO integrity.'
          : 'Verifica Email Richiesta: Conferma l\'indirizzo email per partecipare ai duelli Ranked.');
        sound.playPayloadBlocked();
        return;
      }
    } catch (err) {
      setAuthNotice('Errore durante la verifica delle credenziali operatore.');
      return;
    }

    const hasTicket = onConsumeTicket();
    if (!hasTicket) {
      sound.playPayloadBlocked();
      onOpenPaywall('win_streak_trap');
      return;
    }

    if (onlineSession) {
      onlineSession.disconnect();
      setOnlineSession(null);
    }

    setMatchMode('ranked');
    setSearchTimer(0);
    setPhase('searching');
    setRankedStatusMsg(isEn ? 'Broadcasting ELO bracket handshake...' : 'Ricerca operatore nel bracket ELO...');

    // Initialize controller
    const controller = new RankedMatchController({
      onStatusChange: (status, message) => {
        if (message) setRankedStatusMsg(message);
        if (status === 'ready') {
          launchRankedBattle(controller);
        }
      },
      onOpponentFeedback: (data) => {
        setOpponentScore(data.score);
        setOpponentAnswerFeedback({ isCorrect: !!data.isCorrect, streak: data.streak });
        sound.playEloTick();
        setTimeout(() => setOpponentAnswerFeedback(null), 2500);
      },
      onOpponentLagging: (isLagging) => {
        setIsOpponentLagging(isLagging);
      },
      onOpponentForfeitTimeout: async () => {
        setIsOpponentLagging(false);
        await finalizeAbandonedRankedMatch();
      },
      onError: (err) => {
        setOnlineError(err.message);
        setPhase('idle');
      }
    });

    rankedControllerRef.current = controller;

    try {
      const enterRes = await controller.enterQueue();
      if (enterRes.status === 'matched') {
        // initializeMatch triggered automatically by controller
        return;
      }

      // Start queue poll loop
      let attempts = 0;
      rankedPollTimerRef.current = setInterval(async () => {
        attempts += 1;
        setSearchTimer((prev) => prev + 1.5);

        try {
          const pollRes = await controller.pollQueue();
          if (pollRes.status === 'matched') {
            if (rankedPollTimerRef.current) {
              clearInterval(rankedPollTimerRef.current);
              rankedPollTimerRef.current = null;
            }
          } else if (attempts >= 25) {
            // 37.5s search limit -> abort queue
            if (rankedPollTimerRef.current) {
              clearInterval(rankedPollTimerRef.current);
              rankedPollTimerRef.current = null;
            }
            await controller.cancelQueue();
            setPhase('idle');
            setOnlineError(isEn ? 'No operator found in bracket. Try again shortly.' : 'Nessun operatore disponibile nella fascia ELO. Riprova tra poco.');
          }
        } catch (pollErr: unknown) {
          if (rankedPollTimerRef.current) {
            clearInterval(rankedPollTimerRef.current);
            rankedPollTimerRef.current = null;
          }
          setOnlineError(pollErr instanceof Error ? pollErr.message : String(pollErr));
          setPhase('idle');
        }
      }, 1500);

    } catch (queueErr: unknown) {
      setOnlineError(queueErr instanceof Error ? queueErr.message : String(queueErr));
      setPhase('idle');
    }
  };

  const launchRankedBattle = (controller: RankedMatchController) => {
    const opp = controller.getOpponent();
    const qList = controller.getQuestions();

    const opponentPlayer: PvPPlayer = {
      id: opp?.id || `opp_${Date.now()}`,
      name: opp?.nick || 'Operatore Ranked',
      elo: opp?.elo || 1000,
      rank: (opp?.rank || 'Bronze Recruit') as PvPPlayer['rank'],
      avatar: opp?.avatar || 'OP',
      isBot: false,
      winStreak: 0
    };

    setOpponent(opponentPlayer);
    setRankedQuestions(qList);
    setUserScore(0);
    setOpponentScore(0);
    setCurrentQuestionIndex(0);
    setSelectedOptionIndex(null);
    setIsAnswerGradedCorrect(null);
    setPhase('vs_screen');
    sound.playExploitSuccess();

    setTimeout(() => {
      setPhase('battle');
      questionStartTimeRef.current = Date.now();
    }, 2500);
  };

  const handleRankedAnswer = async (optionIndex: number) => {
    if (selectedOptionIndex !== null || !rankedControllerRef.current) return;
    sound.playTap();
    setSelectedOptionIndex(optionIndex);

    const question = rankedQuestions[currentQuestionIndex];
    if (!question) return;

    try {
      const result = await rankedControllerRef.current.submitAnswer(question.id, optionIndex);
      setIsAnswerGradedCorrect(result.isCorrect);

      const newScore = result.isCorrect ? userScore + 1 : userScore;
      if (result.isCorrect) {
        sound.playExploitSuccess();
        setUserScore(newScore);
      } else {
        sound.playPayloadBlocked();
      }

      // Broadcast cosmetic low-latency feedback to opponent
      rankedControllerRef.current.broadcastCosmeticProgress({
        questionIndex: currentQuestionIndex,
        score: newScore,
        streak: userState.winStreak + (result.isCorrect ? 1 : 0),
        isCorrect: result.isCorrect
      });

      // Advance question or finalize
      setTimeout(async () => {
        setSelectedOptionIndex(null);
        setIsAnswerGradedCorrect(null);

        if (currentQuestionIndex < rankedQuestions.length - 1) {
          setCurrentQuestionIndex((prev) => prev + 1);
          questionStartTimeRef.current = Date.now();
        } else {
          await finalizeRankedMatch();
        }
      }, 900);

    } catch (err: unknown) {
      console.error('[Ranked Error] Answer submission failed:', err);
      // Advance on error to prevent locking
      setTimeout(() => {
        setSelectedOptionIndex(null);
        setIsAnswerGradedCorrect(null);
        if (currentQuestionIndex < rankedQuestions.length - 1) {
          setCurrentQuestionIndex((prev) => prev + 1);
        } else {
          finalizeRankedMatch();
        }
      }, 900);
    }
  };

  const finalizeRankedMatch = async () => {
    if (!rankedControllerRef.current) {
      setPhase('post_match');
      return;
    }

    try {
      const result: RankedMatchResult = await rankedControllerRef.current.finalizeMatch();

      setEloDelta(result.eloDelta);
      if (result.isWin) {
        setMatchResult('win');
        sound.playVictoryFanfare();
        setTimeout(() => sound.playEloTick(), 400);
        setTimeout(() => sound.playEloTick(), 550);
        setTimeout(() => sound.playEloTick(), 700);
        confetti({ particleCount: 70, spread: 65, origin: { y: 0.6 } });
        onWinMatch(result.eloDelta);
      } else if (result.isTie) {
        setMatchResult('tie');
        sound.playExploitSuccess();
      } else {
        setMatchResult('loss');
        sound.playPayloadBlocked();
        onLossMatch(Math.abs(result.eloDelta));
      }

      setPhase('post_match');
    } catch (err) {
      console.error('[Ranked] Failed to finalize match:', err);
      setPhase('post_match');
    }
  };

  const finalizeAbandonedRankedMatch = async () => {
    if (!rankedControllerRef.current) {
      setPhase('post_match');
      return;
    }

    try {
      const result: RankedMatchResult = await rankedControllerRef.current.finalizeAbandonedMatch();
      setEloDelta(result.eloDelta);
      if (result.isWin) {
        setMatchResult('win');
        sound.playVictoryFanfare();
        confetti({ particleCount: 70, spread: 65, origin: { y: 0.6 } });
        onWinMatch(result.eloDelta);
      } else if (result.isTie) {
        setMatchResult('tie');
        sound.playExploitSuccess();
      } else {
        setMatchResult('loss');
        sound.playPayloadBlocked();
        onLossMatch(Math.abs(result.eloDelta));
      }
      setPhase('post_match');
    } catch (err) {
      console.warn('[Ranked] Fallback to normal finalize on timeout:', err);
      await finalizeRankedMatch();
    }
  };

  const handleCancelMatchmaking = async () => {
    sound.playTap();
    if (rankedPollTimerRef.current) {
      clearInterval(rankedPollTimerRef.current);
      rankedPollTimerRef.current = null;
    }
    if (rankedControllerRef.current) {
      await rankedControllerRef.current.cancelQueue();
      rankedControllerRef.current.destroy();
      rankedControllerRef.current = null;
    }
    setPhase('idle');
  };

  // ---------------------------------------------------------------------
  // 2. CASUAL FLOW (PEER-TO-PEER UNCHANGED, NO RATED IMPACT)
  // ---------------------------------------------------------------------

  const handleHostRoom = async () => {
    sound.playTap();
    setOnlineError(null);
    setIsConnectingOnline(true);
    setMatchMode('casual');

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

      hostHandle.waitForOpponent().then((session) => {
        sound.playVictoryFanfare();
        bindCasualOnlineSession(session);
      }).catch((err) => {
        console.warn('Casual host waiting error:', err);
      });
    } catch (e: unknown) {
      setIsConnectingOnline(false);
      setOnlineError(e instanceof Error ? e.message : 'Errore inizializzazione stanza online.');
    }
  };

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
    setMatchMode('casual');

    try {
      const session = await joinOnlineDuel(code, {
        username: userState.username,
        elo: userState.elo,
        rank: userRank.tier,
        profession: userState.profession
      });

      setIsConnectingOnline(false);
      sound.playExploitSuccess();
      bindCasualOnlineSession(session);
    } catch (e: unknown) {
      setIsConnectingOnline(false);
      setOnlineError(e instanceof Error ? e.message : 'Stanza non trovata o host disconnesso.');
      sound.playPayloadBlocked();
    }
  };

  const bindCasualOnlineSession = (session: OnlineMatchSession) => {
    setOnlineSession(session);
    setOpponent(session.opponent);
    setCasualChallenges(session.challenges);
    setUserScore(0);
    setOpponentScore(0);
    setCurrentQuestionIndex(0);
    setSelectedOptionIndex(null);
    setIsAnswerGradedCorrect(null);
    setIsDuelModalOpen(false);

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
      setOnlineError('L\'avversario si è disconnesso dalla sessione casual.');
    });

    setPhase('vs_screen');
    setTimeout(() => {
      setPhase('battle');
      questionStartTimeRef.current = Date.now();
    }, 2500);
  };

  const handleCasualAnswer = (optionId: string) => {
    if (selectedOptionIndex !== null) return;
    sound.playTap();

    const challenge = casualChallenges[currentQuestionIndex];
    const optIndex = challenge.options.findIndex((o) => o.id === optionId);
    setSelectedOptionIndex(optIndex);

    const isCorrect = challenge.options[optIndex]?.isCorrect || false;
    setIsAnswerGradedCorrect(isCorrect);

    const newScore = isCorrect ? userScore + 1 : userScore;
    if (isCorrect) {
      sound.playExploitSuccess();
      setUserScore(newScore);
    } else {
      sound.playPayloadBlocked();
    }

    if (onlineSession) {
      onlineSession.sendAnswer(
        isCorrect,
        newScore,
        userState.winStreak + (isCorrect ? 1 : 0),
        currentQuestionIndex
      );
    }

    setTimeout(() => {
      setSelectedOptionIndex(null);
      setIsAnswerGradedCorrect(null);
      if (currentQuestionIndex < casualChallenges.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
        questionStartTimeRef.current = Date.now();
      } else {
        endCasualMatch();
      }
    }, 800);
  };

  const endCasualMatch = useCallback(() => {
    const isWin = userScore >= opponentScore;
    setMatchResult(isWin ? 'win' : 'loss');
    // Casual matches carry zero ELO delta
    setEloDelta(0);

    if (onlineSession) {
      onlineSession.sendFinished(userScore);
    }

    if (isWin) {
      sound.playVictoryFanfare();
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    } else {
      sound.playPayloadBlocked();
    }

    setPhase('post_match');
  }, [userScore, opponentScore, onlineSession]);

  // Total questions count based on mode
  const totalQuestionsCount = matchMode === 'ranked' ? rankedQuestions.length : casualChallenges.length;
  const totalPoints = userScore + opponentScore;
  const userRatio = totalPoints > 0 ? (userScore / totalPoints) * 100 : 50;

  // Active Challenge references
  const currentCasualChallenge = casualChallenges[currentQuestionIndex];
  const currentRankedChallenge = rankedQuestions[currentQuestionIndex];

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
                  SERVER AUTHORITATIVE
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

          {/* Authentication Notice Alert */}
          {authNotice && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono flex items-center gap-2.5 shadow-md">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{authNotice}</span>
            </div>
          )}

          {onlineError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-2.5 shadow-md">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{onlineError}</span>
            </div>
          )}

          {/* Mode Selection Grid */}
          <div className="grid grid-cols-1 gap-3">
            {/* 1. COMPETITIVE RANKED CARD (SERVER-AUTHORITATIVE) */}
            <div className="rounded-xl bg-gradient-to-br from-[#0D121D] to-[#121826] border-2 border-emerald-500/40 p-5 space-y-4 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2 w-28 h-28 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-mono font-bold tracking-wider">
                      OFFICIAL RANKED
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">K=32 ELO</span>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 mt-1">
                    <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                    <span>{isEn ? 'Competitive Ranked Duel' : 'Duello Ranked Competitivo'}</span>
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    {isEn
                      ? `Authoritative 1v1 quiz duel. Questions streamed directly from database; zero client timing trust.`
                      : `Duello 1v1 server-authoritative con rating ELO ufficiale. Timing server-side e validazione Postgres.`}
                  </p>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between">
                <div className="text-[11px] font-mono text-zinc-400">
                  Rating: <span className="text-white font-bold">{userState.elo} ELO</span> ({userRank.tier})
                </div>
                <button
                  type="button"
                  onClick={handleStartRankedMatchmaking}
                  className="py-2.5 px-5 rounded-xl font-mono font-bold text-xs text-zinc-950 bg-emerald-500 hover:bg-emerald-400 transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
                >
                  <Swords className="w-4 h-4" />
                  <span>{isEn ? 'SEARCH RANKED MATCH' : 'TROVA MATCH RANKED'}</span>
                </button>
              </div>
            </div>

            {/* 2. CASUAL DUEL & PRIVATE STAGING */}
            <div className="rounded-xl bg-[#0D121D] border border-zinc-800 p-5 space-y-3 shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 text-[10px] font-mono font-bold tracking-wider">
                    CASUAL P2P
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 mt-1">
                    <Share2 className="w-4 h-4 text-indigo-400" />
                    <span>{isEn ? 'Casual Duel (Direct Link / Code)' : 'Duello Amichevole (Link / Codice)'}</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {isEn
                      ? 'Direct encrypted peer-to-peer combat. Zero impact on official ELO rating.'
                      : 'Duello diretto WebRTC tramite link o codice stanza. Nessun impatto su ELO.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end pt-1">
                <button
                  type="button"
                  onClick={() => {
                    sound.playTap();
                    setIsDuelModalOpen(true);
                    if (!hostedRoomCode) {
                      handleHostRoom();
                    }
                  }}
                  className="py-2 px-4 rounded-xl font-mono font-bold text-xs text-zinc-200 bg-zinc-900 border border-zinc-700 hover:border-indigo-500/60 transition-colors flex items-center gap-2 cursor-pointer active:scale-[0.98]"
                >
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span>{isEn ? 'OPEN STAGING ROOM' : 'STANZA AMICHEVOLE'}</span>
                </button>
              </div>
            </div>

            {/* 3. SOLO OFFLINE TRAINING */}
            <div className="rounded-xl bg-[#0D121D] border border-zinc-800/80 p-3.5 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2.5">
                <Skull className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="text-xs font-mono text-zinc-300">
                  {isEn ? 'Solo Gauntlet Survival' : 'Addestramento Survival Gauntlet'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setIsSurvivalOpen(true);
                }}
                className="py-1.5 px-3 rounded-lg font-mono font-bold text-[11px] text-rose-300 bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/40 transition-colors cursor-pointer"
              >
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

      {/* PHASE 2: SEARCHING / RADAR */}
      {phase === 'searching' && (
        <div className="rounded-xl bg-[#0D121D] border border-zinc-800 p-8 text-center space-y-4 my-8">
          <div className="flex items-center justify-center text-emerald-400">
            <Radio className="w-12 h-12 animate-pulse text-emerald-400" />
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white font-mono">
              {isEn ? 'Searching Opponent...' : 'Ricerca Avversario Ranked...'}
            </h2>
            <p className="text-xs text-zinc-400 font-mono">
              {rankedStatusMsg || `${userState.elo} ELO · Bracket Matching`}
            </p>
          </div>

          <div className="w-48 mx-auto h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <div 
              className="bg-emerald-500 h-full transition-all duration-300 animate-pulse"
              style={{ width: `${Math.min(100, Math.max(15, (searchTimer / 30) * 100))}%` }}
            />
          </div>

          <button
            type="button"
            onClick={handleCancelMatchmaking}
            className="text-xs text-zinc-400 hover:text-white font-mono underline cursor-pointer"
          >
            {isEn ? 'Cancel Matchmaking' : 'Annulla Ricerca'}
          </button>
        </div>
      )}

      {/* PHASE 3: VS SCREEN */}
      {phase === 'vs_screen' && opponent && (
        <div className="rounded-xl bg-[#0D121D] border border-zinc-800 p-6 space-y-6 text-center my-8 animate-fadeIn">
          <div className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-bold flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{matchMode === 'ranked' ? 'OFFICIAL RANKED DUEL LOCKED' : 'CASUAL P2P OPERATOR CONNECTED'}</span>
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
            {isEn ? 'Duel starting in 2.5 seconds...' : 'Inizio duello tra 2.5 secondi...'}
          </div>
        </div>
      )}

      {/* PHASE 4: 60s BATTLE IN-GAME */}
      {phase === 'battle' && opponent && (
        <div className="space-y-4">
          {/* Top Score Bar & Timer */}
          <div className="rounded-xl bg-[#0D121D] border border-zinc-800 p-4 space-y-3 shadow-md">
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-400">{userState.username}</span>
                <span className="text-white font-bold">{userScore} PTS</span>
              </div>

              <div className="flex items-center gap-1.5 font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
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
              <span>ROUND {currentQuestionIndex + 1} OF {totalQuestionsCount || 5}</span>
              {matchMode === 'ranked' ? (
                <span className="text-emerald-400 flex items-center gap-1 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  POSTGRES AUTHORITATIVE
                </span>
              ) : onlineSession ? (
                <span className="text-indigo-400 flex items-center gap-1 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                  CASUAL P2P · {onlineSession.latencyMs}ms
                </span>
              ) : (
                <span className="text-zinc-500">PRACTICE SENTINEL</span>
              )}
            </div>

            {/* Lagging Opponent Warning */}
            {isOpponentLagging && (
              <div className="text-[11px] font-mono px-2 py-1.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-center animate-pulse">
                Avversario temporaneamente disconnesso · Finestra di riconnessione attiva (10s)
              </div>
            )}

            {/* Opponent Feedback Banner */}
            {opponentAnswerFeedback && (
              <div className={`text-[11px] font-mono px-2 py-1 rounded border text-center transition-all ${
                opponentAnswerFeedback.isCorrect 
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' 
                  : 'bg-zinc-800/80 border-zinc-700 text-zinc-400'
              }`}>
                {opponent.name} {opponentAnswerFeedback.isCorrect ? 'risposta corretta! (+1 PTS)' : 'risposta errata (0 PTS)'}
              </div>
            )}
          </div>

          {/* Active Question Card */}
          <div className="rounded-xl bg-[#0D121D] border border-zinc-800 p-5 space-y-4 shadow-md">
            <h3 className="font-bold text-sm sm:text-base text-white leading-relaxed">
              {matchMode === 'ranked'
                ? currentRankedChallenge?.question
                : currentCasualChallenge?.question}
            </h3>

            {(matchMode === 'ranked' ? currentRankedChallenge?.code_snippet : currentCasualChallenge?.codeSnippet) && (
              <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3 font-mono text-xs text-emerald-300 overflow-x-auto">
                <pre>{matchMode === 'ranked' ? currentRankedChallenge?.code_snippet : currentCasualChallenge?.codeSnippet}</pre>
              </div>
            )}

            {/* Options List */}
            <div className="grid grid-cols-1 gap-2">
              {matchMode === 'ranked' ? (
                // RANKED OPTIONS (Strings, graded exclusively server-side via submit_answer)
                currentRankedChallenge?.options.map((optText, idx) => {
                  const isSelected = selectedOptionIndex === idx;
                  let optStyle = 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-200';

                  if (selectedOptionIndex !== null) {
                    if (isSelected) {
                      optStyle = isAnswerGradedCorrect
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                        : 'bg-rose-950/60 border-rose-500 text-rose-300';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={selectedOptionIndex !== null}
                      onClick={() => handleRankedAnswer(idx)}
                      className={`p-3.5 rounded-lg border text-left text-xs sm:text-sm font-mono transition-colors flex items-center justify-between cursor-pointer ${optStyle}`}
                    >
                      <span>{optText}</span>
                      {isSelected && isAnswerGradedCorrect && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })
              ) : (
                // CASUAL OPTIONS
                currentCasualChallenge?.options.map((opt, idx) => {
                  const isSelected = selectedOptionIndex === idx;
                  let optStyle = 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-200';

                  if (selectedOptionIndex !== null) {
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
                      disabled={selectedOptionIndex !== null}
                      onClick={() => handleCasualAnswer(opt.id)}
                      className={`p-3.5 rounded-lg border text-left text-xs sm:text-sm font-mono transition-colors flex items-center justify-between cursor-pointer ${optStyle}`}
                    >
                      <span>{opt.text}</span>
                      {selectedOptionIndex !== null && opt.isCorrect && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* PHASE 5: POST-MATCH VICTORY/DEFEAT */}
      {phase === 'post_match' && opponent && (
        <div className="rounded-xl bg-[#0D121D] border border-zinc-800 p-6 space-y-5 my-6 text-center shadow-lg animate-fadeIn">
          <div>
            <h2 className={`text-2xl font-extrabold font-mono uppercase tracking-wider ${
              matchResult === 'win' ? 'text-emerald-400' : matchResult === 'tie' ? 'text-amber-400' : 'text-rose-400'
            }`}>
              {matchResult === 'win' 
                ? (isEn ? 'TACTICAL VICTORY' : 'VITTORIA TATTICA')
                : matchResult === 'tie'
                ? (isEn ? 'DRAW / TACTICAL STALEMATE' : 'PAREGGIO TATTICO')
                : (isEn ? 'TACTICAL DEFEAT' : 'SCONFITTA TATTICA')}
            </h2>
            <p className="text-xs text-zinc-400 font-mono mt-1">
              {matchMode === 'ranked'
                ? (isEn ? 'PostgreSQL server-authoritative match finalization.' : 'Punteggio e rating calcolati e validati da PostgreSQL RPC.')
                : (isEn ? 'Casual session complete. Rating unaffected.' : 'Sessione amichevole completata. Nessun impatto su ELO.')}
            </p>
          </div>

          {/* ELO Delta Badge */}
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 font-mono max-w-xs mx-auto space-y-1">
            <span className="text-[10px] text-zinc-400 uppercase">
              {matchMode === 'ranked' ? 'OFFICIAL RATING ADJUSTMENT' : 'CASUAL MATCH'}
            </span>
            <div className={`text-xl font-bold ${
              matchMode !== 'ranked'
                ? 'text-zinc-400'
                : eloDelta > 0
                ? 'text-emerald-400'
                : eloDelta < 0
                ? 'text-rose-400'
                : 'text-zinc-300'
            }`}>
              {matchMode === 'ranked'
                ? (eloDelta > 0 ? `+${eloDelta} ELO` : `${eloDelta} ELO`)
                : '0 ELO (Unrated)'}
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
              <span>{userScore} / {totalQuestionsCount || 5}</span>
              <span className="text-zinc-400">Score</span>
              <span>{opponentScore} / {totalQuestionsCount || 5}</span>
            </div>
          </div>

          {/* CTAs */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                if (matchMode === 'ranked') {
                  handleStartRankedMatchmaking();
                } else {
                  setIsDuelModalOpen(true);
                  if (!hostedRoomCode) handleHostRoom();
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
                  if (rankedControllerRef.current) {
                    rankedControllerRef.current.destroy();
                    rankedControllerRef.current = null;
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

      {/* CASUAL DUEL MODAL (HOST / JOIN) */}
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

            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-indigo-400" />
                  <span>{isEn ? 'Casual Duel Staging Room' : 'Stanza Duello Amichevole (P2P)'}</span>
                </h3>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                {isEn ? 'Direct WebRTC data channel. Unrated casual play.' : 'Canale WebRTC diretto peer-to-peer. Nessun impatto su ELO.'}
              </p>
            </div>

            <div className="grid grid-cols-2 p-1 bg-zinc-950 rounded-xl border border-zinc-800 text-xs font-mono">
              <button
                onClick={() => {
                  sound.playTap();
                  setDuelModalTab('host');
                  if (!hostedRoomCode) handleHostRoom();
                }}
                className={`py-2 rounded-lg font-bold transition-colors ${
                  duelModalTab === 'host' ? 'bg-indigo-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
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
                  duelModalTab === 'join' ? 'bg-indigo-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {isEn ? 'JOIN CODE' : 'ENTRA CON CODICE'}
              </button>
            </div>

            {/* HOST TAB */}
            {duelModalTab === 'host' && (
              <div className="space-y-4 text-center">
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">
                    CODICE STANZA ATTIVA
                  </span>
                  <div className="text-3xl font-extrabold font-mono text-indigo-400 tracking-wider">
                    {hostedRoomCode || 'GENERAZIONE...'}
                  </div>
                  <p className="text-[11px] font-mono text-zinc-400">
                    Condividi questo codice con il tuo avversario
                  </p>
                </div>

                <button
                  onClick={() => {
                    sound.playExploitSuccess();
                    const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://zeroday.gg';
                    const link = `${origin}/?duel=${hostedRoomCode}`;
                    navigator.clipboard.writeText(`Entra nel duello 1v1 su ZeroDay! Codice: ${hostedRoomCode} | Link diretto: ${link}`);
                    setCopiedRoomLink(true);
                    setTimeout(() => setCopiedRoomLink(false), 2500);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-indigo-500 text-zinc-200 font-mono text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copiedRoomLink ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-zinc-400" />}
                  <span>{copiedRoomLink ? 'LINK DIRETTO COPIATO!' : 'COPIA LINK DI INVITO'}</span>
                </button>

                <div className="flex items-center justify-center gap-2 text-xs font-mono text-zinc-400 py-2">
                  <Radio className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>In attesa che l'avversario entri nella stanza...</span>
                </div>
              </div>
            )}

            {/* JOIN TAB */}
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
                    className="w-full py-3 px-4 rounded-xl bg-zinc-950 border border-zinc-800 text-indigo-400 font-mono font-bold text-center text-lg focus:outline-none focus:border-indigo-500"
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
                  className="w-full py-3 px-4 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-zinc-950 font-mono font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
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

      {/* Survival Gauntlet Modal */}
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
