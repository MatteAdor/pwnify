import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  RankedMatchController,
  computeRankedPeerId,
  type PeerFactory,
  type RankedQuestion,
  type RankedOpponentInfo,
  type RankedMatchResult,
  type CosmeticFeedbackPayload,
} from '../src/utils/rankedController.ts';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../src/types/database.types.ts';
import type { Peer } from 'peerjs';

// =====================================================================
// MOCK IMPLEMENTATION OF SUPABASE CLIENT FOR CONTROLLER UNIT TESTING
// =====================================================================

interface MockState {
  currentUserId: string;
  isQueueMatched: boolean;
  matchId: string;
  opponentId: string;
  rpcCalls: Array<{ fn: string; args: Record<string, unknown> }>;
  broadcastedEvents: Array<{ event: string; payload: unknown }>;
}

function createMockSupabase(state: MockState): SupabaseClient<Database> {
  const client = {
    auth: {
      getSession: async () => ({
        data: {
          session: {
            user: { id: state.currentUserId, email: 'operator@zeroday.internal', email_confirmed_at: '2026-10-19T00:00:00Z' },
            access_token: 'mock-jwt-token-xyz',
          },
        },
        error: null,
      }),
    },
    from: (table: string) => ({
      select: (_fields: string) => ({
        eq: (_col: string, _val: string) => ({
          single: async () => {
            if (table === 'matches') {
              return {
                data: {
                  p1_id: state.currentUserId,
                  p2_id: state.opponentId,
                  status: 'active',
                },
                error: null,
              };
            }
            if (table === 'profiles' || table === 'public_profiles') {
              return {
                data: {
                  id: state.opponentId,
                  nick: 'TargetOperator_99',
                  elo: 1080,
                  rank: 'Bronze Recruit',
                },
                error: null,
              };
            }
            return { data: null, error: new Error('Table not found in mock') };
          },
        }),
      }),
      delete: () => ({
        eq: async (_col: string, _val: string) => ({ data: null, error: null }),
      }),
    }),
    rpc: async (fn: string, args: Record<string, unknown> = {}) => {
      state.rpcCalls.push({ fn, args });

      switch (fn) {
        case 'find_or_create_match':
          if (state.isQueueMatched) {
            return { data: { status: 'matched', match_id: state.matchId }, error: null };
          }
          return { data: { status: 'queued', message: 'Searching opponent...' }, error: null };

        case 'poll_matchmaking':
          if (state.isQueueMatched) {
            return { data: { status: 'matched', match_id: state.matchId }, error: null };
          }
          return { data: { status: 'waiting' }, error: null };

        case 'get_match_questions':
          return {
            data: [
              {
                id: '11111111-1111-1111-1111-111111111111',
                category: 'Web Security',
                question: 'Quale header HTTP previene attacchi clickjacking su browser moderni?',
                code_snippet: null,
                options: ['Content-Security-Policy: frame-ancestors', 'X-Frame-Options: ALLOW-FROM', 'Access-Control-Allow-Origin', 'Set-Cookie: SameSite=None'],
                question_order: 1,
              },
              {
                id: '22222222-2222-2222-2222-222222222222',
                category: 'Binary Exploitation',
                question: 'Quale tecnica mitiga il buffer overflow sovrascrivendo un cookie casuale nello stack frame?',
                code_snippet: 'sub rsp, 28h\nmov rax, [__security_cookie]',
                options: ['Stack Canaries / GS', 'ASLR', 'DEP / NX', 'SafeSEH'],
                question_order: 2,
              },
            ],
            error: null,
          };

        case 'submit_answer':
          const isCorrect = args.p_answer_index === 0;
          return {
            data: {
              is_correct: isCorrect,
              elapsed_ms: 1850,
              both_answered: false,
              question_index: 0,
            },
            error: null,
          };

        case 'finalize_match':
          return {
            data: {
              status: 'completed',
              winner_id: state.currentUserId,
              p1_score: 2,
              p2_score: 1,
              p1_delta: 16,
              p2_delta: -16,
            },
            error: null,
          };

        case 'finalize_abandoned_match':
          return {
            data: {
              status: 'completed',
              winner_id: state.currentUserId,
              p1_score: 1,
              p2_score: 0,
              p1_delta: 18,
              p2_delta: -18,
            },
            error: null,
          };

        case 'forfeit_match':
          return {
            data: {
              status: 'forfeited',
              winner_id: state.opponentId,
            },
            error: null,
          };

        default:
          return { data: null, error: new Error(`Unknown RPC ${fn}`) };
      }
    },
    channel: (_name: string) => ({
      on: () => ({ subscribe: async () => ({}) }),
      subscribe: async () => ({}),
      unsubscribe: async () => ({}),
      send: (evt: { type: string; event: string; payload: unknown }) => {
        state.broadcastedEvents.push({ event: evt.event, payload: evt.payload });
        return Promise.resolve();
      },
    }),
  };

  return client as unknown as SupabaseClient<Database>;
}

function createMockPeerFactory(createdPeers: Array<{ id?: string }>): PeerFactory {
  return (id, options) => {
    const mockPeer = {
      id: id || 'mock-peer-id',
      options,
      on: (_event: string, cb: (data?: unknown) => void) => {
        if (_event === 'open') setTimeout(() => cb(id || 'mock-peer-id'), 0);
        return mockPeer;
      },
      connect: (_targetId: string) => ({
        open: true,
        send: () => {},
        on: () => {},
        close: () => {},
      }),
      destroy: () => {},
    };
    createdPeers.push(mockPeer);
    return mockPeer as unknown as Peer;
  };
}

describe('RankedMatchController Unit Suite (Mock RPC & Injected Dependencies)', () => {
  test('Deterministic Peer ID hash generation', async () => {
    const peerId1 = await computeRankedPeerId('match-alpha-1234', 'user-p1-5678');
    const peerId2 = await computeRankedPeerId('match-alpha-1234', 'user-p1-5678');
    const peerIdDiff = await computeRankedPeerId('match-alpha-1234', 'user-p2-9999');

    assert.ok(peerId1.startsWith('zeroday-pvp-v2-ranked-'));
    assert.equal(peerId1, peerId2, 'Same match and user must produce identical peer ID');
    assert.notEqual(peerId1, peerIdDiff, 'Different users must produce distinct peer IDs');
  });

  test('Queue lifecycle via Injected Controller: enterQueue -> matched -> initializeMatch', async () => {
    const mockState: MockState = {
      currentUserId: 'user-p1-uuid',
      isQueueMatched: true, // Immediately matched for this test
      matchId: 'match-alpha-uuid',
      opponentId: 'user-p2-uuid',
      rpcCalls: [],
      broadcastedEvents: [],
    };

    const createdPeers: Array<{ id?: string }> = [];
    const mockSupabase = createMockSupabase(mockState);
    const mockPeerFactory = createMockPeerFactory(createdPeers);

    let statusUpdates: string[] = [];
    const controller = new RankedMatchController(
      {
        onStatusChange: (status) => {
          statusUpdates.push(status);
        },
      },
      {
        peerFactory: mockPeerFactory,
        supabaseClient: mockSupabase,
      }
    );

    const res = await controller.enterQueue();
    assert.equal(res.status, 'matched');
    assert.equal(res.matchId, 'match-alpha-uuid');
    assert.equal(controller.getMatchId(), 'match-alpha-uuid');

    // Verify questions loaded with ZERO correct_index
    const questions = controller.getQuestions();
    assert.equal(questions.length, 2);
    for (const q of questions) {
      assert.equal((q as Record<string, unknown>).correct_index, undefined);
    }

    // Verify opponent loaded
    const opponent = controller.getOpponent();
    assert.ok(opponent);
    assert.equal(opponent?.nick, 'TargetOperator_99');

    // Verify injected peer was instantiated with hashed peer ID
    assert.ok(createdPeers.length > 0);
    assert.ok(createdPeers[0].id?.startsWith('zeroday-pvp-v2-ranked-'));

    controller.destroy();
  });

  test('Injected Controller submitAnswer and finalizeMatch execution', async () => {
    const mockState: MockState = {
      currentUserId: 'user-p1-uuid',
      isQueueMatched: true,
      matchId: 'match-alpha-uuid',
      opponentId: 'user-p2-uuid',
      rpcCalls: [],
      broadcastedEvents: [],
    };

    const createdPeers: Array<{ id?: string }> = [];
    const mockSupabase = createMockSupabase(mockState);
    const mockPeerFactory = createMockPeerFactory(createdPeers);

    const controller = new RankedMatchController(
      {},
      {
        peerFactory: mockPeerFactory,
        supabaseClient: mockSupabase,
      }
    );

    await controller.enterQueue();

    // Test answer submission
    const ansResult = await controller.submitAnswer('11111111-1111-1111-1111-111111111111', 0);
    assert.equal(ansResult.isCorrect, true);
    assert.equal(ansResult.elapsedMs, 1850);

    // Test broadcast fallback to Realtime
    controller.broadcastCosmeticProgress({
      questionIndex: 0,
      score: 1,
      streak: 1,
      isCorrect: true,
    });
    assert.equal(mockState.broadcastedEvents.length, 1);
    assert.equal(mockState.broadcastedEvents[0].event, 'COSMETIC_FEEDBACK');

    // Test match finalization
    const finalResult = await controller.finalizeMatch();
    assert.equal(finalResult.status, 'completed');
    assert.equal(finalResult.isWin, true);
    assert.equal(finalResult.eloDelta, 16);

    controller.destroy();
  });

  test('Injected Controller finalizeAbandonedMatch on opponent inactivity', async () => {
    const mockState: MockState = {
      currentUserId: 'user-p1-uuid',
      isQueueMatched: true,
      matchId: 'match-alpha-uuid',
      opponentId: 'user-p2-uuid',
      rpcCalls: [],
      broadcastedEvents: [],
    };

    const mockSupabase = createMockSupabase(mockState);
    const mockPeerFactory = createMockPeerFactory([]);

    const controller = new RankedMatchController(
      {},
      {
        peerFactory: mockPeerFactory,
        supabaseClient: mockSupabase,
      }
    );

    await controller.enterQueue();

    const abandonedResult = await controller.finalizeAbandonedMatch();
    assert.equal(abandonedResult.status, 'completed');
    assert.equal(abandonedResult.isWin, true);
    assert.equal(abandonedResult.eloDelta, 18);

    controller.destroy();
  });

  test('Injected Controller forfeitMatch strictly yields defeat for caller', async () => {
    const mockState: MockState = {
      currentUserId: 'user-p1-uuid',
      isQueueMatched: true,
      matchId: 'match-alpha-uuid',
      opponentId: 'user-p2-uuid',
      rpcCalls: [],
      broadcastedEvents: [],
    };

    const mockSupabase = createMockSupabase(mockState);
    const mockPeerFactory = createMockPeerFactory([]);

    const controller = new RankedMatchController(
      {},
      {
        peerFactory: mockPeerFactory,
        supabaseClient: mockSupabase,
      }
    );

    await controller.enterQueue();

    const forfeitResult = await controller.forfeitMatch();
    assert.equal(forfeitResult.status, 'forfeited');
    assert.equal(forfeitResult.winnerId, 'user-p2-uuid');

    controller.destroy();
  });
});
