import { Peer, DataConnection } from 'peerjs';
import { PvPPlayer, PvPChallenge } from '../types';
import { generatePvPMatchChallenges, PVP_CHALLENGES } from '../data/pvpChallenges';

export type DuelMode = 'host' | 'join' | 'matchmaking' | 'ai';

export interface DuelPacket {
  type: 
    | 'HELLO' 
    | 'START_MATCH' 
    | 'ANSWER_UPDATE' 
    | 'PING' 
    | 'PONG' 
    | 'SURRENDER' 
    | 'FINISHED';
  payload?: any;
}

export interface OnlineMatchSession {
  roomCode: string;
  isHost: boolean;
  opponent: PvPPlayer;
  challenges: PvPChallenge[];
  sendAnswer: (isCorrect: boolean, newScore: number, streak: number, questionIndex: number) => void;
  sendFinished: (finalScore: number) => void;
  onOpponentAnswer: (cb: (data: { isCorrect: boolean; opponentScore: number; streak: number; questionIndex: number }) => void) => void;
  onOpponentFinished: (cb: (data: { finalScore: number }) => void) => void;
  onDisconnect: (cb: () => void) => void;
  disconnect: () => void;
  latencyMs: number;
}

const PEER_PREFIX = 'zeroday-pvp-v2-';

const PEER_CONFIG = {
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  }
};

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
 * Creates an online Host room waiting for a peer to join.
 */
export function hostOnlineDuel(
  hostUser: { username: string; elo: number; rank: string; profession?: string },
  customCode?: string
): Promise<{
  roomCode: string;
  waitForOpponent: () => Promise<OnlineMatchSession>;
  cancel: () => void;
}> {
  return new Promise((resolve, reject) => {
    const roomCode = customCode || generateRoomCode();
    const peerId = `${PEER_PREFIX}${roomCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

    let peer: Peer | null = null;
    try {
      peer = new Peer(peerId, PEER_CONFIG);
    } catch (err) {
      return reject(err);
    }

    let isCancelled = false;

    peer.on('error', (err) => {
      console.warn('[P2P Duel Host Error]', err);
      if (err.type === 'unavailable-id') {
        // Try another code
        peer?.destroy();
        resolve(hostOnlineDuel(hostUser));
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
            // Generate seed and challenge set as Host
            const challenges = generatePvPMatchChallenges(hostUser.elo, 5);
            const challengeIds = challenges.map(c => c.id);

            // Send HELLO packet with host profile and challenge seed
            conn.send({
              type: 'START_MATCH',
              payload: {
                host: {
                  id: `host_${Date.now()}`,
                  name: hostUser.username,
                  elo: hostUser.elo,
                  rank: hostUser.rank as any,
                  avatar: hostUser.username.slice(0, 2).toUpperCase(),
                  isBot: false,
                  winStreak: 0
                },
                challengeIds
              }
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
        cancel
      });
    });
  });
}

/**
 * Joins an active online Duel room created by another operator.
 */
export function joinOnlineDuel(
  roomCode: string,
  guestUser: { username: string; elo: number; rank: string; profession?: string }
): Promise<OnlineMatchSession> {
  return new Promise((resolve, reject) => {
    const cleanCode = roomCode.toLowerCase().replace(/[^a-z0-9]/g, '');
    const targetPeerId = `${PEER_PREFIX}${cleanCode}`;

    const guestPeer = new Peer(PEER_CONFIG);

    const timeout = setTimeout(() => {
      guestPeer.destroy();
      reject(new Error('Timeout: Impossibile trovare la stanza specificata. Verifica il codice.'));
    }, 12000);

    guestPeer.on('open', () => {
      const conn = guestPeer.connect(targetPeerId, { reliable: true });

      conn.on('open', () => {
        // Send Guest Hello
        conn.send({
          type: 'HELLO',
          payload: {
            guest: {
              id: `guest_${Date.now()}`,
              name: guestUser.username,
              elo: guestUser.elo,
              rank: guestUser.rank,
              avatar: guestUser.username.slice(0, 2).toUpperCase(),
              isBot: false,
              winStreak: 0
            }
          }
        });
      });

      conn.on('data', (raw: any) => {
        const data = raw as DuelPacket;
        if (data.type === 'START_MATCH') {
          clearTimeout(timeout);
          const { host, challengeIds } = data.payload;

          // Rehydrate challenges matching host IDs
          const matchedChallenges: PvPChallenge[] = [];
          if (Array.isArray(challengeIds)) {
            challengeIds.forEach((id: string) => {
              const ch = PVP_CHALLENGES.find(c => c.id === id);
              if (ch) matchedChallenges.push(ch);
            });
          }

          const fallback = matchedChallenges.length >= 5 
            ? matchedChallenges 
            : generatePvPMatchChallenges(guestUser.elo, 5);

          setupSession(conn, guestPeer, roomCode, false, fallback, resolve, host);
        }
      });

      conn.on('error', (err) => {
        clearTimeout(timeout);
        guestPeer.destroy();
        reject(err);
      });
    });

    guestPeer.on('error', (err) => {
      clearTimeout(timeout);
      guestPeer.destroy();
      reject(err);
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
  let opponentAnswerCallback: ((data: any) => void) | null = null;
  let opponentFinishedCallback: ((data: any) => void) | null = null;
  let disconnectCallback: (() => void) | null = null;
  let opponentPlayer: PvPPlayer = initialOpponent || {
    id: `opp_${Date.now()}`,
    name: 'Operatore Online',
    elo: 1200,
    rank: 'Gold Specialist' as any,
    avatar: 'OP',
    isBot: false,
    winStreak: 0
  };

  let pingStart = Date.now();
  let latency = 28; // default healthy ms

  conn.on('data', (raw: any) => {
    const packet = raw as DuelPacket;
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

  // Measure latency every 5s
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
            questionIndex
          }
        });
      }
    },
    sendFinished: (finalScore) => {
      if (conn.open) {
        conn.send({
          type: 'FINISHED',
          payload: { finalScore }
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
    }
  };

  onResolved(session);
}
