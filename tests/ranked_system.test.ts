import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// =====================================================================
// 1. ELO CALCULATION UNIT LOGIC (K=32 STANDARD FORMULA)
// Replicates public.finalize_match_internal ELO algorithm
// =====================================================================
export function calculateEloDelta(
  p1Elo: number,
  p2Elo: number,
  s1: number, // 1 for win, 0.5 for draw, 0 for loss
  k: number = 32
): { delta1: number; delta2: number } {
  const e1 = 1 / (1 + Math.pow(10, (p2Elo - p1Elo) / 400));
  const e2 = 1 / (1 + Math.pow(10, (p1Elo - p2Elo) / 400));
  const s2 = 1 - s1;

  const delta1 = Math.round(k * (s1 - e1));
  const delta2 = Math.round(k * (s2 - e2));

  return { delta1, delta2 };
}

// =====================================================================
// 2. TIMING & ANTI-CHEAT VALIDATION UNIT LOGIC
// Replicates public.submit_answer timing gates
// =====================================================================
export function validateAnswerSubmission(
  questionStartedAt: number,
  submittedAt: number,
  answerIndex: number,
  correctIndex: number
): { isCorrect: boolean; isFlaggedSoft: boolean; isTimeout: boolean; elapsedMs: number } {
  const DEADLINE_MS = 17500; // 15,000ms + 2,500ms network grace
  const SOFT_FLAG_MS = 350;  // Sub-human reaction threshold

  const elapsedMs = Math.max(0, submittedAt - questionStartedAt);
  const isFlaggedSoft = elapsedMs < SOFT_FLAG_MS;
  const isTimeout = elapsedMs > DEADLINE_MS;
  const isCorrect = !isTimeout && answerIndex === correctIndex;

  return { isCorrect, isFlaggedSoft, isTimeout, elapsedMs };
}

// =====================================================================
// 3. IDEMPOTENT MATCH FINALIZER SIMULATOR
// Replicates public.finalize_match_internal idempotency
// =====================================================================
export interface SimulatedMatch {
  id: string;
  status: 'active' | 'completed';
  p1Id: string;
  p2Id: string;
  p1Score: number;
  p2Score: number;
  p1Elo: number;
  p2Elo: number;
  winnerId: string | null;
  p1Delta: number | null;
  p2Delta: number | null;
  finalizedCount: number;
}

export function finalizeMatchSimulated(match: SimulatedMatch): {
  status: 'completed' | 'already_completed';
  match: SimulatedMatch;
} {
  // Idempotency check: if match is already completed, return without applying ELO updates
  if (match.status === 'completed') {
    return {
      status: 'already_completed',
      match
    };
  }

  const s1 = match.p1Score > match.p2Score ? 1 : match.p2Score > match.p1Score ? 0 : 0.5;
  const { delta1, delta2 } = calculateEloDelta(match.p1Elo, match.p2Elo, s1);

  match.status = 'completed';
  match.winnerId = match.p1Score > match.p2Score ? match.p1Id : match.p2Score > match.p1Score ? match.p2Id : null;
  match.p1Delta = delta1;
  match.p2Delta = delta2;
  match.p1Elo = Math.max(100, match.p1Elo + delta1);
  match.p2Elo = Math.max(100, match.p2Elo + delta2);
  match.finalizedCount += 1;

  return {
    status: 'completed',
    match
  };
}

// =====================================================================
// TEST SUITE EXECUTION
// =====================================================================
describe('ZERODAY RANKED SYSTEM — STEP 1 VERIFICATION', () => {

  // TEST 1: ELO K=32 FORMULA ACCURACY
  test('ELO K=32: Equal ratings (1000 vs 1000) produces exact +16/-16 delta on win', () => {
    const { delta1, delta2 } = calculateEloDelta(1000, 1000, 1);
    assert.equal(delta1, 16, 'P1 should gain +16 ELO');
    assert.equal(delta2, -16, 'P2 should lose -16 ELO');
    assert.equal(delta1 + delta2, 0, 'Zero-sum delta conservation');
  });

  test('ELO K=32: Equal ratings on draw produces 0 delta', () => {
    const { delta1, delta2 } = calculateEloDelta(1000, 1000, 0.5);
    assert.equal(delta1, 0, 'Draw yields 0 delta for equal players');
    assert.equal(delta2, 0, 'Draw yields 0 delta for equal players');
  });

  test('ELO K=32: Underdog upset win yields high delta (1000 beats 1400 -> +29)', () => {
    const { delta1, delta2 } = calculateEloDelta(1000, 1400, 1);
    assert.equal(delta1, 29, 'Underdog should gain +29 ELO');
    assert.equal(delta2, -29, 'Favorite should lose -29 ELO');
  });

  test('ELO K=32: Expected favorite win yields modest delta (1400 beats 1000 -> +3)', () => {
    const { delta1, delta2 } = calculateEloDelta(1400, 1000, 1);
    assert.equal(delta1, 3, 'Favorite should gain +3 ELO on expected win');
    assert.equal(delta2, -3, 'Underdog should lose -3 ELO');
  });

  // TEST 2: TIMING DEADLINE & SOFT FLAG
  test('Timing: Submissions within deadline (3,500ms) with correct index are accepted', () => {
    const res = validateAnswerSubmission(10000, 13500, 2, 2);
    assert.equal(res.isCorrect, true);
    assert.equal(res.isTimeout, false);
    assert.equal(res.isFlaggedSoft, false);
    assert.equal(res.elapsedMs, 3500);
  });

  test('Timing: Submissions exceeding deadline (18,000ms > 15s + 2.5s grace) are rejected as timeout', () => {
    const res = validateAnswerSubmission(10000, 28000, 1, 1);
    assert.equal(res.isCorrect, false, 'Timeout answers must never be marked correct');
    assert.equal(res.isTimeout, true);
    assert.equal(res.elapsedMs, 18000);
  });

  test('Timing: Sub-human reaction times (< 350ms) trigger soft flag for inspection', () => {
    const res = validateAnswerSubmission(10000, 10180, 0, 0); // 180ms response
    assert.equal(res.isCorrect, true, 'Answer can still be recorded');
    assert.equal(res.isFlaggedSoft, true, 'Anomaly detected: response time < 350ms');
    assert.equal(res.elapsedMs, 180);
  });

  // TEST 3: IDEMPOTENCY OF FINALIZE MATCH
  test('Idempotency: Repeated finalize_match calls do not double-increment ELO', () => {
    const match: SimulatedMatch = {
      id: 'match_uuid_test_1',
      status: 'active',
      p1Id: 'usr_alpha',
      p2Id: 'usr_bravo',
      p1Score: 4,
      p2Score: 2,
      p1Elo: 1000,
      p2Elo: 1000,
      winnerId: null,
      p1Delta: null,
      p2Delta: null,
      finalizedCount: 0
    };

    // First call: executes match finalization
    const call1 = finalizeMatchSimulated(match);
    assert.equal(call1.status, 'completed');
    assert.equal(call1.match.status, 'completed');
    assert.equal(call1.match.p1Elo, 1016, 'P1 ELO incremented once');
    assert.equal(call1.match.p2Elo, 984, 'P2 ELO decremented once');
    assert.equal(call1.match.finalizedCount, 1);

    // Second call: duplicate/replay call (e.g. network retry or concurrent trigger)
    const call2 = finalizeMatchSimulated(match);
    assert.equal(call2.status, 'already_completed');
    assert.equal(call2.match.p1Elo, 1016, 'P1 ELO must NOT be incremented a second time');
    assert.equal(call2.match.p2Elo, 984, 'P2 ELO must NOT be decremented a second time');
    assert.equal(call2.match.finalizedCount, 1, 'Finalization logic ran exactly once');
  });

  // TEST 4: RLS VERIFICATION IN SQL MIGRATION
  test('RLS Security: Migration SQL strictly isolates correct_index and denies direct access', () => {
    const sqlPath = path.resolve(process.cwd(), 'supabase/migrations/20261019000001_ranked_system.sql');
    assert.ok(fs.existsSync(sqlPath), 'Migration SQL file must exist');

    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

    // Verify RLS is enabled on all critical tables
    assert.match(sqlContent, /ALTER TABLE public\.questions ENABLE ROW LEVEL SECURITY;/, 'Questions RLS enabled');
    assert.match(sqlContent, /ALTER TABLE public\.match_answers ENABLE ROW LEVEL SECURITY;/, 'Match answers RLS enabled');
    assert.match(sqlContent, /ALTER TABLE public\.matches ENABLE ROW LEVEL SECURITY;/, 'Matches RLS enabled');

    // Verify that NO direct SELECT policy exists on public.questions for authenticated or anon
    assert.doesNotMatch(
      sqlContent,
      /CREATE POLICY ".*" ON public\.questions\s+FOR SELECT TO authenticated/,
      'Must NOT grant SELECT policy on questions table to authenticated users'
    );
    assert.doesNotMatch(
      sqlContent,
      /CREATE POLICY ".*" ON public\.questions\s+FOR SELECT TO anon/,
      'Must NOT grant SELECT policy on questions table to anon users'
    );

    // Verify get_match_questions explicitly strips correct_index
    const rpcDefinition = sqlContent.substring(
      sqlContent.indexOf('CREATE OR REPLACE FUNCTION public.get_match_questions'),
      sqlContent.indexOf('CREATE OR REPLACE FUNCTION public.find_or_create_match')
    );

    assert.ok(rpcDefinition.includes('options JSONB'), 'Returns options');
    assert.ok(!rpcDefinition.includes('correct_index'), 'Must NOT return correct_index in get_match_questions');
    assert.ok(rpcDefinition.includes('SELECT q.id, q.category, q.question, q.code_snippet, q.options'), 'Projection excludes correct_index');

    // Verify match_answers is append-only (no UPDATE or DELETE policies)
    assert.doesNotMatch(sqlContent, /FOR UPDATE ON public\.match_answers/, 'Must NOT allow UPDATE on match_answers');
    assert.doesNotMatch(sqlContent, /FOR DELETE ON public\.match_answers/, 'Must NOT allow DELETE on match_answers');
  });
});
