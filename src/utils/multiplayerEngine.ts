import PeerPackage, { type Peer, type DataConnection, type PeerOptions } from 'peerjs';

const PeerConstructor = (
  (PeerPackage as unknown as { Peer?: typeof PeerPackage; default?: typeof PeerPackage }).Peer ||
  (PeerPackage as unknown as { default?: typeof PeerPackage }).default ||
  PeerPackage
) as unknown as typeof PeerPackage;

export type PeerFactory = (id?: string, options?: PeerOptions) => Peer;

export const defaultPeerFactory: PeerFactory = (id, options) => {
  return new (PeerConstructor as unknown as new (id?: string, options?: PeerOptions) => Peer)(id, options);
};

import { PvPPlayer, PvPChallenge } from '../types/index.ts';
import { generatePvPMatchChallenges, PVP_CHALLENGES } from '../data/pvpChallenges.ts';
import { getAuthoritativeIceServers, type RTCIceServerConfig } from './turnService.ts';

export type DuelMode = 'host' | 'join' | 'matchmaking' | 'ai';

export interface AnswerUpdatePayload {
  isCorrect: boolean;
  opponentScore: number;
  streak: number;
  questionIndex: number;
}

export interface FinishedPayload {
  finalScore: number;
}

export interface HelloPayload {
  guest?: PvPPlayer;
}

export interface StartMatchPayload {
  host: PvPPlayer;
  challengeIds: string[];
}

export interface PingPongPayload {
  ts?: number;
}

export type DuelPacket =
  | { type: 'HELLO'; payload: HelloPayload }
  | { type: 'START_MATCH'; payload: StartMatchPayload }
  | { type: 'ANSWER_UPDATE'; payload: AnswerUpdatePayload }
  | { type: 'PING'; payload?: PingPongPayload }
  | { type: 'PONG'; payload?: PingPongPayload }
  | { type: 'SURRENDER'; payload?: Record<string, unknown> }
  | { type: 'FINISHED'; payload: FinishedPayload };

export interface OnlineMatchSession {
  roomCode: string;
  isHost: boolean;
  opponent: PvPPlayer;
  challenges: PvPChallenge[];
  sendAnswer: (isCorrect: boolean, newScore: number, streak: number, questionIndex: number) => void;
  sendFinished: (finalScore: number) => void;
  onOpponentAnswer: (cb: (data: AnswerUpdatePayload) => void) => void;
  onOpponentFinished: (cb: (data: FinishedPayload) => void) => void;
  onDisconnect: (cb: () => void) => void;
  disconnect: () => void;
  latencyMs: number;
}

const PEER_PREFIX = 'zeroday-pvp-v2-';

/**
 * Builds PeerJS configuration reading host/port/key/path/secure from environment variables
 * and integrating ephemeral ICE servers (STUN -> TURN).
 */
export async function buildPeerOptions(customIceServers?: RTCIceServerConfig[]): Promise<PeerOptions> {
  const iceServers = customIceServers || (await getAuthoritativeIceServers());

  const env = (import.meta as unknown as { env?: Record<string, string> })?.env || {};
  const host = env.VITE_PEER_HOST || undefined;
  const port = env.VITE_PEER_PORT ? Number(env.VITE_PEER_PORT) : undefined;
  const path = env.VITE_PEER_PATH || (host ? '/peerjs' : undefined);
  const key = env.VITE_PEER_KEY || (host ? 'zeroday-pvp' : 'peerjs');
  const secure = env.VITE_PEER_SECURE === 'true' ||
    (typeof window !== 'undefined' && window.location.protocol === 'https:' && Boolean(host));

  const options: PeerOptions = {
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

/**
 * Generates a clean tactical room code e.g. "0x7F2A"
 */
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `0x${code}`;
}

/**
 * Creates an online Host room waiting for a peer to join (Casual mode).
 */
export function hostOnlineDuel(
  hostUser: { username: string; elo: number; rank: string; profession?: string },
  customCode?: string,
  peerFactory?: PeerFactory
): Promise<{
  roomCode: string;
  waitForOpponent: () => Promise<OnlineMatchSession>;
  cancel: () => void;
}> {
  return new Promise(async (resolve, reject) => {
    const roomCode = customCode || generateRoomCode();
    const peerId = `${PEER_PREFIX}${roomCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

    let peer: Peer | null = null;
    let isCancelled = false;

    try {
      const options = await buildPeerOptions();
      if (isCancelled) return;
      const factory = peerFactory || defaultPeerFactory;
      peer = factory(peerId, options);
    } catch (err) {
      return reject(err instanceof Error ? err : new Error(String(err)));
    }

    peer.on('error', (err) => {
      console.warn('[P2P Duel Host Error]', err);
      if (err.type === 'unavailable-id') {
        peer?.destroy();
        resolve(hostOnlineDuel(hostUser, customCode, peerFactory));
      }
    });

    const cancel = () => {
      isCancelled = true;
      try {
        peer?.destroy();
      } catch (e) {
        // ignore
      }
    };

    const waitForOpponent = (): Promise<OnlineMatchSession> => {
      return new Promise((resolveMatch, rejectMatch) => {
        if (!peer) return rejectMatch(new Error('Peer not initialized'));

        peer.on('connection', (conn: DataConnection) => {
          conn.on('open', () => {
            // Generate seed and challenge set as Host (Casual)
            const challenges = generatePvPMatchChallenges(hostUser.elo, 5);
            const challengeIds = challenges.map((c) => c.id);

            conn.send({
              type: 'START_MATCH',
              payload: {
                host: {
                  id: `host_${Date.now()}`,
                  name: hostUser.username,
                  elo: hostUser.elo,
                  rank: hostUser.rank as PvPPlayer['rank'],
                  avatar: hostUser.username.slice(0, 2).toUpperCase(),
                  isBot: false,
                  winStreak: 0,
                },
                challengeIds,
              },
            });

            setupSession(conn, peer!, roomCode, true, challenges, resolveMatch);
          });
        });
      });
    };

    peer.on('open', () => {
      if (isCancelled) return;
      resolve({
        roomCode,
        waitForOpponent,
        cancel,
      });
    });
  });
}

/**
 * Joins an active online Duel room created by another operator (Casual mode).
 */
export function joinOnlineDuel(
  roomCode: string,
  guestUser: { username: string; elo: number; rank: string; profession?: string },
  peerFactory?: PeerFactory
): Promise<OnlineMatchSession> {
  return new Promise(async (resolve, reject) => {
    const cleanCode = roomCode.toLowerCase().replace(/[^a-z0-9]/g, '');
    const targetPeerId = `${PEER_PREFIX}${cleanCode}`;

    let guestPeer: Peer | null = null;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    try {
      const options = await buildPeerOptions();
      const factory = peerFactory || defaultPeerFactory;
      guestPeer = factory(undefined, options);
    } catch (err) {
      return reject(err instanceof Error ? err : new Error(String(err)));
    }

    timeout = setTimeout(() => {
      guestPeer?.destroy();
      reject(new Error('Timeout: Impossibile trovare la stanza specificata. Verifica il codice.'));
    }, 12000);

    guestPeer.on('open', () => {
      if (!guestPeer) return;
      const conn = guestPeer.connect(targetPeerId, { reliable: true });

      conn.on('open', () => {
        conn.send({
          type: 'HELLO',
          payload: {
            guest: {
              id: `guest_${Date.now()}`,
              name: guestUser.username,
              elo: guestUser.elo,
              rank: guestUser.rank as PvPPlayer['rank'],
              avatar: guestUser.username.slice(0, 2).toUpperCase(),
              isBot: false,
              winStreak: 0,
            },
          },
        });
      });

      conn.on('data', (raw: unknown) => {
        const data = raw as DuelPacket;
        if (data && data.type === 'START_MATCH') {
          if (timeout) clearTimeout(timeout);
          const { host, challengeIds } = data.payload;

          const matchedChallenges: PvPChallenge[] = [];
          if (Array.isArray(challengeIds)) {
            challengeIds.forEach((id: string) => {
              const ch = PVP_CHALLENGES.find((c) => c.id === id);
              if (ch) matchedChallenges.push(ch);
            });
          }

          const fallback = matchedChallenges.length >= 5
            ? matchedChallenges
            : generatePvPMatchChallenges(guestUser.elo, 5);

          setupSession(conn, guestPeer!, roomCode, false, fallback, resolve, host);
        }
      });

      conn.on('error', (err) => {
        if (timeout) clearTimeout(timeout);
        guestPeer?.destroy();
        reject(err instanceof Error ? err : new Error(String(err)));
      });
    });

    guestPeer.on('error', (err) => {
      if (timeout) clearTimeout(timeout);
      guestPeer?.destroy();
      reject(err instanceof Error ? err : new Error(String(err)));
    });
  });
}

/**
 * Internal helper to bind event listeners and establish the session handle.
 */
function setupSession(
  conn: DataConnection,
  peer: Peer,
  roomCode: string,
  isHost: boolean,
  challenges: PvPChallenge[],
  onResolved: (session: OnlineMatchSession) => void,
  initialOpponent?: PvPPlayer
) {
  let opponentAnswerCallback: ((data: AnswerUpdatePayload) => void) | null = null;
  let opponentFinishedCallback: ((data: FinishedPayload) => void) | null = null;
  let disconnectCallback: (() => void) | null = null;
  let opponentPlayer: PvPPlayer = initialOpponent || {
    id: `opp_${Date.now()}`,
    name: 'Operatore Online',
    elo: 1200,
    rank: 'Red Teamer',
    avatar: 'OP',
    isBot: false,
    winStreak: 0,
  };

  let pingStart = Date.now();
  let latency = 28;

  conn.on('data', (raw: unknown) => {
    const packet = raw as DuelPacket;
    if (!packet || typeof packet !== 'object') return;

    switch (packet.type) {
      case 'HELLO':
        if (packet.payload?.guest) {
          opponentPlayer = packet.payload.guest;
        }
        break;
      case 'ANSWER_UPDATE':
        if (opponentAnswerCallback && packet.payload) {
          opponentAnswerCallback(packet.payload);
        }
        break;
      case 'FINISHED':
        if (opponentFinishedCallback && packet.payload) {
          opponentFinishedCallback(packet.payload);
        }
        break;
      case 'PING':
        conn.send({ type: 'PONG', payload: { ts: Date.now() } });
        break;
      case 'PONG':
        latency = Math.max(8, Date.now() - pingStart);
        break;
    }
  });

  const pingInterval = setInterval(() => {
    if (conn.open) {
      pingStart = Date.now();
      conn.send({ type: 'PING' });
    }
  }, 5000);

  conn.on('close', () => {
    clearInterval(pingInterval);
    if (disconnectCallback) disconnectCallback();
  });

  const session: OnlineMatchSession = {
    roomCode,
    isHost,
    opponent: opponentPlayer,
    challenges,
    latencyMs: latency,
    sendAnswer: (isCorrect, newScore, streak, questionIndex) => {
      if (conn.open) {
        conn.send({
          type: 'ANSWER_UPDATE',
          payload: {
            isCorrect,
            opponentScore: newScore,
            streak,
            questionIndex,
          },
        });
      }
    },
    sendFinished: (finalScore) => {
      if (conn.open) {
        conn.send({
          type: 'FINISHED',
          payload: { finalScore },
        });
      }
    },
    onOpponentAnswer: (cb) => {
      opponentAnswerCallback = cb;
    },
    onOpponentFinished: (cb) => {
      opponentFinishedCallback = cb;
    },
    onDisconnect: (cb) => {
      disconnectCallback = cb;
    },
    disconnect: () => {
      clearInterval(pingInterval);
      try {
        conn.close();
        peer.destroy();
      } catch (e) {
        // ignore
      }
    },
  };

  onResolved(session);
}
