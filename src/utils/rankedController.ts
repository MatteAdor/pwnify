import { supabase, isSupabaseConfigured } from '../config/supabase.ts';
import type { Database } from '../types/database.types.ts';
import { getAuthoritativeIceServers, type RTCIceServerConfig } from './turnService.ts';
import PeerPackage, { type DataConnection, type PeerOptions } from 'peerjs';

const Peer = (
  (PeerPackage as unknown as { Peer?: typeof PeerPackage; default?: typeof PeerPackage }).Peer ||
  (PeerPackage as unknown as { default?: typeof PeerPackage }).default ||
  PeerPackage
) as unknown as typeof PeerPackage;

export type MatchmakingStatus =
  | 'idle'
  | 'queued'
  | 'matched'
  | 'loading_questions'
  | 'ready'
  | 'error'
  | 'completed';

export interface RankedQuestion {
  id: string;
  category: string;
  question: string;
  code_snippet: string | null;
  options: string[];
  question_order: number;
}

export interface RankedOpponentInfo {
  id: string;
  nick: string;
  elo: number;
  rank: string;
  avatar: string;
}

export interface RankedMatchResult {
  status: 'completed' | 'already_completed';
  winnerId: string | null;
  userScore: number;
  opponentScore: number;
  eloDelta: number;
  isWin: boolean;
  isTie: boolean;
  p1Delta: number;
  p2Delta: number;
}

export interface CosmeticFeedbackPayload {
  questionIndex: number;
  score: number;
  streak: number;
  isCorrect?: boolean;
}

export interface RankedControllerCallbacks {
  onStatusChange?: (status: MatchmakingStatus, message?: string) => void;
  onOpponentFeedback?: (data: CosmeticFeedbackPayload) => void;
  onOpponentLagging?: (isLagging: boolean) => void;
  onOpponentForfeitTimeout?: () => void;
  onError?: (err: Error) => void;
}

const PEER_PREFIX = 'zeroday-pvp-v2-';

function getPeerOptions(iceServers: RTCIceServerConfig[]): Record<string, unknown> {
  const env = (import.meta as unknown as { env?: Record<string, string> })?.env || {};
  const host = env.VITE_PEER_HOST || undefined;
  const port = env.VITE_PEER_PORT ? Number(env.VITE_PEER_PORT) : undefined;
  const path = env.VITE_PEER_PATH || (host ? '/peerjs' : undefined);
  const key = env.VITE_PEER_KEY || (host ? 'zeroday-pvp' : 'peerjs');
  const secure = env.VITE_PEER_SECURE === 'true' ||
    (typeof window !== 'undefined' && window.location.protocol === 'https:' && Boolean(host));

  const options: Record<string, unknown> = {
    config: {
      iceServers,
      iceCandidatePoolSize: 10,
    },
  };

  if (host) options.host = host;
  if (port) options.port = port;
  if (path) options.path = path;
  if (key) options.key = key;
  if (typeof secure === 'boolean') options.secure = secure;

  return options;
}

export class RankedMatchController {
  private matchId: string | null = null;
  private userId: string | null = null;
  private isP1: boolean = false;
  private opponentId: string | null = null;
  private opponentProfile: RankedOpponentInfo | null = null;
  private questions: RankedQuestion[] = [];
  private callbacks: RankedControllerCallbacks;

  // Cosmetic P2P & Realtime
  private peer: Peer | null = null;
  private dataConn: DataConnection | null = null;
  private realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private lastOpponentHeartbeatAt: number = 0;
  private isOpponentLagging: boolean = false;
  private disconnectGraceTimeout: ReturnType<typeof setTimeout> | null = null;
  private isDestroyed: boolean = false;

  constructor(callbacks: RankedControllerCallbacks = {}) {
    this.callbacks = callbacks;
  }

  public getMatchId(): string | null {
    return this.matchId;
  }

  public getOpponent(): RankedOpponentInfo | null {
    return this.opponentProfile;
  }

  public getQuestions(): RankedQuestion[] {
    return this.questions;
  }

  /**
   * Enters the ranked queue via PostgreSQL RPC `find_or_create_match`.
   */
  public async enterQueue(): Promise<{ status: 'matched' | 'queued'; matchId?: string }> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase client is not configured for ranked play.');
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) {
      throw new Error('Autenticazione richiesta per accedere al PvP Ranked.');
    }
    this.userId = user.id;

    this.callbacks.onStatusChange?.('queued', 'Ricerca operatore nel bracket ELO...');

    const { data, error } = await supabase.rpc('find_or_create_match');
    if (error) {
      this.callbacks.onError?.(new Error(error.message));
      throw error;
    }

    const res = data as { status: 'matched' | 'queued'; match_id?: string; message?: string };
    if (res.status === 'matched' && res.match_id) {
      this.matchId = res.match_id;
      this.callbacks.onStatusChange?.('matched', 'Match agganciato! Caricamento parametri...');
      await this.initializeMatch(res.match_id);
      return { status: 'matched', matchId: res.match_id };
    }

    return { status: 'queued' };
  }

  /**
   * Polls the queue periodically until match found or aborted.
   */
  public async pollQueue(): Promise<{ status: 'matched' | 'waiting'; matchId?: string }> {
    const { data, error } = await supabase.rpc('poll_matchmaking');
    if (error) {
      throw error;
    }

    const res = data as { status: 'matched' | 'waiting'; match_id?: string };
    if (res.status === 'matched' && res.match_id) {
      this.matchId = res.match_id;
      this.callbacks.onStatusChange?.('matched', 'Match confermato! Download sfida...');
      await this.initializeMatch(res.match_id);
      return { status: 'matched', matchId: res.match_id };
    }

    return { status: 'waiting' };
  }

  /**
   * Cancels matchmaking queue participation.
   */
  public async cancelQueue(): Promise<void> {
    if (!this.userId) return;
    try {
      await supabase.from('matchmaking_queue').delete().eq('user_id', this.userId);
      this.callbacks.onStatusChange?.('idle');
    } catch (err) {
      console.warn('[RankedController] Error cancelling matchmaking queue:', err);
    }
  }

  /**
   * Initializes participants, questions and cosmetic channel.
   */
  public async initializeMatch(matchId: string): Promise<void> {
    this.matchId = matchId;
    this.callbacks.onStatusChange?.('loading_questions', 'Zero-knowledge verification in corso...');

    // 1. Fetch match row to identify role and opponent ID
    const { data: matchData, error: matchError } = await supabase
      .from('matches')
      .select('p1_id, p2_id, status')
      .eq('id', matchId)
      .single();

    if (matchError || !matchData) {
      throw new Error(`Impossibile leggere il match ${matchId}: ${matchError?.message}`);
    }

    this.isP1 = matchData.p1_id === this.userId;
    this.opponentId = this.isP1 ? matchData.p2_id : matchData.p1_id;

    // 2. Fetch opponent public profile
    if (this.opponentId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, nick, elo, rank')
        .eq('id', this.opponentId)
        .single();

      if (profile) {
        this.opponentProfile = {
          id: profile.id,
          nick: profile.nick,
          elo: profile.elo,
          rank: profile.rank,
          avatar: profile.nick.slice(0, 2).toUpperCase(),
        };
      }
    }

    // 3. Fetch questions (Server guarantees correct_index is NEVER exposed)
    const { data: questionsData, error: questionsError } = await supabase.rpc(
      'get_match_questions',
      { p_match_id: matchId }
    );

    if (questionsError || !Array.isArray(questionsData)) {
      throw new Error(`Impossibile caricare le domande del match: ${questionsError?.message}`);
    }

    this.questions = questionsData.map((q) => {
      let optionsList: string[] = [];
      if (Array.isArray(q.options)) {
        optionsList = q.options.map((opt) => (typeof opt === 'string' ? opt : JSON.stringify(opt)));
      } else if (typeof q.options === 'object' && q.options !== null) {
        optionsList = Object.values(q.options as Record<string, string>);
      }
      return {
        id: q.id,
        category: q.category,
        question: q.question,
        code_snippet: q.code_snippet,
        options: optionsList,
        question_order: q.question_order,
      };
    });

    // 4. Setup Cosmetic Low-Latency Channel (WebRTC + Realtime fallback)
    await this.setupCosmeticChannel(matchId);

    this.callbacks.onStatusChange?.('ready');
  }

  /**
   * Submits an answer to the server-authoritative RPC `submit_answer`.
   */
  public async submitAnswer(
    questionId: string,
    answerIndex: number
  ): Promise<{ isCorrect: boolean; elapsedMs: number; bothAnswered: boolean; questionIndex: number }> {
    if (!this.matchId) {
      throw new Error('Nessun match attivo.');
    }

    const { data, error } = await supabase.rpc('submit_answer', {
      p_match_id: this.matchId,
      p_question_id: questionId,
      p_answer_index: answerIndex,
    });

    if (error) {
      throw error;
    }

    const result = data as {
      is_correct: boolean;
      elapsed_ms: number;
      both_answered: boolean;
      question_index: number;
    };

    return {
      isCorrect: result.is_correct,
      elapsedMs: result.elapsed_ms,
      bothAnswered: result.both_answered,
      questionIndex: result.question_index,
    };
  }

  /**
   * Broadcasts cosmetic feedback (score, streak, question progress) to opponent.
   */
  public broadcastCosmeticProgress(payload: CosmeticFeedbackPayload): void {
    // Attempt WebRTC DataChannel first
    if (this.dataConn && this.dataConn.open) {
      try {
        this.dataConn.send({
          type: 'COSMETIC_FEEDBACK',
          payload,
        });
        return;
      } catch (e) {
        console.warn('[RankedController] WebRTC send failed, falling back to Realtime:', e);
      }
    }

    // Fallback to Supabase Realtime channel
    if (this.realtimeChannel) {
      this.realtimeChannel.send({
        type: 'broadcast',
        event: 'COSMETIC_FEEDBACK',
        payload,
      });
    }
  }

  /**
   * Finalizes the match on Postgres and retrieves authoritative ELO delta.
   */
  public async finalizeMatch(): Promise<RankedMatchResult> {
    if (!this.matchId) {
      throw new Error('Nessun match attivo da finalizzare.');
    }

    const { data, error } = await supabase.rpc('finalize_match', {
      p_match_id: this.matchId,
    });

    if (error) {
      throw error;
    }

    const res = data as {
      status: 'completed' | 'already_completed';
      winner_id: string | null;
      p1_score: number;
      p2_score: number;
      p1_delta: number;
      p2_delta: number;
    };

    const isWin = res.winner_id === this.userId;
    const isTie = res.winner_id === null;
    const userScore = this.isP1 ? res.p1_score : res.p2_score;
    const opponentScore = this.isP1 ? res.p2_score : res.p1_score;
    const eloDelta = this.isP1 ? res.p1_delta : res.p2_delta;

    this.callbacks.onStatusChange?.('completed');

    return {
      status: res.status,
      winnerId: res.winner_id,
      userScore,
      opponentScore,
      eloDelta,
      isWin,
      isTie,
      p1Delta: res.p1_delta,
      p2Delta: res.p2_delta,
    };
  }

  /**
   * Submits a forfeit when an operator surrenders.
   */
  public async forfeitMatch(): Promise<{ status: string; winnerId: string | null }> {
    if (!this.matchId) {
      return { status: 'no_match', winnerId: null };
    }

    const { data, error } = await supabase.rpc('forfeit_match', {
      p_match_id: this.matchId,
    });

    if (error) {
      throw error;
    }

    const res = data as { status: string; winner_id: string | null };
    return { status: res.status, winnerId: res.winner_id };
  }

  /**
   * Sets up cosmetic low-latency feedback channel.
   * STUN -> TURN order, Heartbeat (2s), Timeout (8s), Reconnect (10s), Realtime fallback.
   */
  private async setupCosmeticChannel(matchId: string): Promise<void> {
    // 1. Supabase Realtime fallback channel
    try {
      this.realtimeChannel = supabase.channel(`ranked_match_${matchId}`, {
        config: { broadcast: { self: false } },
      });

      this.realtimeChannel.on('broadcast', { event: 'COSMETIC_FEEDBACK' }, (payload) => {
        if (payload?.payload) {
          this.callbacks.onOpponentFeedback?.(payload.payload as CosmeticFeedbackPayload);
        }
      });

      await this.realtimeChannel.subscribe();
    } catch (rtErr) {
      console.warn('[RankedController] Realtime fallback subscribe warning:', rtErr);
    }

    // 2. Fetch authoritative ICE servers (STUN first, then TURN)
    const iceServers = await getAuthoritativeIceServers();
    const peerOptions = getPeerOptions(iceServers);

    // Deterministic Peer IDs for the pair:
    // P1 hosts peer ID: zeroday-pvp-v2-ranked-<matchId>-p1
    // P2 connects to P1
    const p1PeerId = `${PEER_PREFIX}ranked-${matchId.replace(/-/g, '').slice(0, 16)}-p1`;
    const p2PeerId = `${PEER_PREFIX}ranked-${matchId.replace(/-/g, '').slice(0, 16)}-p2`;

    try {
      if (this.isP1) {
        this.peer = new Peer(p1PeerId, peerOptions);
        this.peer.on('connection', (conn) => {
          this.bindDataConnection(conn);
        });
      } else {
        this.peer = new Peer(p2PeerId, peerOptions);
        this.peer.on('open', () => {
          if (this.isDestroyed || !this.peer) return;
          const conn = this.peer.connect(p1PeerId, { reliable: true });
          this.bindDataConnection(conn);
        });
      }

      this.peer.on('error', (err) => {
        console.warn('[RankedController] WebRTC cosmetic signaling notice:', err.message);
      });
    } catch (e) {
      console.warn('[RankedController] WebRTC init skipped, relying on Realtime:', e);
    }

    // 3. Heartbeat & Disconnection Watchdog (2s interval, 8s timeout, 10s reconnect window)
    this.lastOpponentHeartbeatAt = Date.now();
    this.heartbeatInterval = setInterval(() => {
      this.runHeartbeatCycle();
    }, 2000);
  }

  private bindDataConnection(conn: DataConnection): void {
    this.dataConn = conn;

    conn.on('open', () => {
      this.lastOpponentHeartbeatAt = Date.now();
      if (this.isOpponentLagging) {
        this.isOpponentLagging = false;
        this.callbacks.onOpponentLagging?.(false);
      }
      if (this.disconnectGraceTimeout) {
        clearTimeout(this.disconnectGraceTimeout);
        this.disconnectGraceTimeout = null;
      }
    });

    conn.on('data', (raw: unknown) => {
      const msg = raw as { type: string; payload?: unknown };
      if (!msg || typeof msg !== 'object') return;

      if (msg.type === 'PING') {
        this.lastOpponentHeartbeatAt = Date.now();
        if (conn.open) {
          conn.send({ type: 'PONG', ts: Date.now() });
        }
      } else if (msg.type === 'PONG') {
        this.lastOpponentHeartbeatAt = Date.now();
        if (this.isOpponentLagging) {
          this.isOpponentLagging = false;
          this.callbacks.onOpponentLagging?.(false);
        }
      } else if (msg.type === 'COSMETIC_FEEDBACK') {
        this.lastOpponentHeartbeatAt = Date.now();
        this.callbacks.onOpponentFeedback?.(msg.payload as CosmeticFeedbackPayload);
      }
    });

    conn.on('close', () => {
      this.handleConnectionDrop();
    });

    conn.on('error', (err) => {
      console.warn('[RankedController] DataConnection error:', err);
      this.handleConnectionDrop();
    });
  }

  private runHeartbeatCycle(): void {
    if (this.isDestroyed) return;

    if (this.dataConn && this.dataConn.open) {
      this.dataConn.send({ type: 'PING', ts: Date.now() });
    }

    const elapsed = Date.now() - this.lastOpponentHeartbeatAt;
    // 8s timeout trigger
    if (elapsed > 8000 && !this.isOpponentLagging) {
      this.isOpponentLagging = true;
      this.callbacks.onOpponentLagging?.(true);

      // Reconnection window: 10 seconds before forfeit notice
      if (!this.disconnectGraceTimeout) {
        this.disconnectGraceTimeout = setTimeout(() => {
          if (this.isOpponentLagging && !this.isDestroyed) {
            this.callbacks.onOpponentForfeitTimeout?.();
          }
        }, 10000);
      }
    }
  }

  private handleConnectionDrop(): void {
    if (!this.isOpponentLagging) {
      this.isOpponentLagging = true;
      this.callbacks.onOpponentLagging?.(true);
      if (!this.disconnectGraceTimeout) {
        this.disconnectGraceTimeout = setTimeout(() => {
          if (this.isOpponentLagging && !this.isDestroyed) {
            this.callbacks.onOpponentForfeitTimeout?.();
          }
        }, 10000);
      }
    }
  }

  public destroy(): void {
    this.isDestroyed = true;
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.disconnectGraceTimeout) {
      clearTimeout(this.disconnectGraceTimeout);
      this.disconnectGraceTimeout = null;
    }
    if (this.dataConn) {
      try {
        this.dataConn.close();
      } catch (e) {
        // ignore
      }
      this.dataConn = null;
    }
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (e) {
        // ignore
      }
      this.peer = null;
    }
    if (this.realtimeChannel) {
      try {
        this.realtimeChannel.unsubscribe();
      } catch (e) {
        // ignore
      }
      this.realtimeChannel = null;
    }
  }
}
