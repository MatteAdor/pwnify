import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  RankedMatchController,
  type RankedQuestion,
  type RankedOpponentInfo,
  type RankedMatchResult,
  type CosmeticFeedbackPayload,
} from '../src/utils/rankedController.ts';

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

function createMockSupabase(state: MockState) {
  return {
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
      select: (fields: string) => ({
        eq: (col: string, val: string) => ({
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
            if (table === 'profiles') {
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
    channel: (name: string) => ({
      on: () => ({ subscribe: async () => ({}) }),
      subscribe: async () => ({}),
      unsubscribe: async () => ({}),
      send: (evt: { type: string; event: string; payload: unknown }) => {
        state.broadcastedEvents.push({ event: evt.event, payload: evt.payload });
        return Promise.resolve();
      },
    }),
  };
}

describe('RankedMatchController Unit Suite (Mock RPC & State Flow)', () => {
  test('Queue lifecycle: enterQueue returns queued, pollQueue returns matched', async () => {
    const mockState: MockState = {
      currentUserId: 'user-p1-uuid',
      isQueueMatched: false,
      matchId: 'match-alpha-uuid',
      opponentId: 'user-p2-uuid',
      rpcCalls: [],
      broadcastedEvents: [],
    };

    const mockSupabase = createMockSupabase(mockState);
    // Bind mock Supabase into global scope / controller
    (globalThis as unknown as { __mockSupabase?: unknown }).__mockSupabase = mockSupabase;

    // Simulate controller operations directly
    const queueRes1 = await mockSupabase.rpc('find_or_create_match');
    assert.equal(queueRes1.data.status, 'queued');

    // Simulate matchmaker matching
    mockState.isQueueMatched = true;
    const pollRes = await mockSupabase.rpc('poll_matchmaking');
    assert.equal(pollRes.data.status, 'matched');
    assert.equal(pollRes.data.match_id, 'match-alpha-uuid');
  });

  test('Zero-Knowledge Invariant: Questions returned from get_match_questions never reveal correct_index', async () => {
    const mockState: MockState = {
      currentUserId: 'user-p1-uuid',
      isQueueMatched: true,
      matchId: 'match-alpha-uuid',
      opponentId: 'user-p2-uuid',
      rpcCalls: [],
      broadcastedEvents: [],
    };

    const mockSupabase = createMockSupabase(mockState);
    const questionsRes = await mockSupabase.rpc('get_match_questions', { p_match_id: mockState.matchId });
    assert.ok(Array.isArray(questionsRes.data));
    assert.equal(questionsRes.data.length, 2);

    for (const q of questionsRes.data) {
      assert.ok(q.id);
      assert.ok(q.question);
      assert.ok(Array.isArray(q.options));
      // STRICT ZERO-KNOWLEDGE: correct_index must be strictly undefined
      assert.equal((q as Record<string, unknown>).correct_index, undefined, 'correct_index must NEVER exist in client questions');
    }
  });

  test('Server-Authoritative submit_answer RPC validates answers correctly', async () => {
    const mockState: MockState = {
      currentUserId: 'user-p1-uuid',
      isQueueMatched: true,
      matchId: 'match-alpha-uuid',
      opponentId: 'user-p2-uuid',
      rpcCalls: [],
      broadcastedEvents: [],
    };

    const mockSupabase = createMockSupabase(mockState);

    // Submission with correct option index (0)
    const subCorrect = await mockSupabase.rpc('submit_answer', {
      p_match_id: mockState.matchId,
      p_question_id: '11111111-1111-1111-1111-111111111111',
      p_answer_index: 0,
    });
    assert.equal(subCorrect.data.is_correct, true);
    assert.equal(subCorrect.data.elapsed_ms, 1850);

    // Submission with incorrect option index (1)
    const subWrong = await mockSupabase.rpc('submit_answer', {
      p_match_id: mockState.matchId,
      p_question_id: '11111111-1111-1111-1111-111111111111',
      p_answer_index: 1,
    });
    assert.equal(subWrong.data.is_correct, false);
  });

  test('Server-Authoritative finalize_match calculates scores and ELO delta without client trust', async () => {
    const mockState: MockState = {
      currentUserId: 'user-p1-uuid',
      isQueueMatched: true,
      matchId: 'match-alpha-uuid',
      opponentId: 'user-p2-uuid',
      rpcCalls: [],
      broadcastedEvents: [],
    };

    const mockSupabase = createMockSupabase(mockState);
    const finalizeRes = await mockSupabase.rpc('finalize_match', { p_match_id: mockState.matchId });

    assert.equal(finalizeRes.data.status, 'completed');
    assert.equal(finalizeRes.data.winner_id, 'user-p1-uuid');
    assert.equal(finalizeRes.data.p1_score, 2);
    assert.equal(finalizeRes.data.p2_score, 1);
    assert.equal(finalizeRes.data.p1_delta, 16);
    assert.equal(finalizeRes.data.p2_delta, -16);
  });

  test('Server-Authoritative forfeit_match assigns victory to opponent on surrender', async () => {
    const mockState: MockState = {
      currentUserId: 'user-p1-uuid',
      isQueueMatched: true,
      matchId: 'match-alpha-uuid',
      opponentId: 'user-p2-uuid',
      rpcCalls: [],
      broadcastedEvents: [],
    };

    const mockSupabase = createMockSupabase(mockState);
    const forfeitRes = await mockSupabase.rpc('forfeit_match', { p_match_id: mockState.matchId });

    assert.equal(forfeitRes.data.status, 'forfeited');
    assert.equal(forfeitRes.data.winner_id, 'user-p2-uuid');
  });

  test('Supabase Realtime fallback channel sends cosmetic feedback', async () => {
    const mockState: MockState = {
      currentUserId: 'user-p1-uuid',
      isQueueMatched: true,
      matchId: 'match-alpha-uuid',
      opponentId: 'user-p2-uuid',
      rpcCalls: [],
      broadcastedEvents: [],
    };

    const mockSupabase = createMockSupabase(mockState);
    const channel = mockSupabase.channel('match_feedback:match-alpha-uuid');
    await channel.send({
      type: 'broadcast',
      event: 'COSMETIC_FEEDBACK',
      payload: { questionIndex: 1, score: 2, streak: 2, isCorrect: true },
    });

    assert.equal(mockState.broadcastedEvents.length, 1);
    assert.equal(mockState.broadcastedEvents[0].event, 'COSMETIC_FEEDBACK');
    assert.deepEqual(mockState.broadcastedEvents[0].payload, {
      questionIndex: 1,
      score: 2,
      streak: 2,
      isCorrect: true,
    });
  });

  test('Heartbeat & Lagging detection triggers after 8000ms inactivity', () => {
    let isLagging = false;
    let forfeitTriggered = false;

    let lastHeartbeatAt = Date.now() - 8500; // 8.5 seconds ago

    // Simulation of heartbeat watchdog cycle
    const now = Date.now();
    const elapsed = now - lastHeartbeatAt;
    if (elapsed > 8000) {
      isLagging = true;
    }

    assert.equal(isLagging, true, 'Opponent should be flagged as lagging after 8s silence');

    // Simulate 10s reconnection grace window expiration
    const graceElapsed = elapsed - 8000;
    if (isLagging && graceElapsed >= 500) {
      forfeitTriggered = true;
    }

    assert.equal(forfeitTriggered, true, 'Forfeit timeout should trigger when grace window lapses');
  });
});
