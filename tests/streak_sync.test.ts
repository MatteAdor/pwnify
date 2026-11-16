import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { syncAuthoritativeActivity, fetchAuthoritativeServerTime } from '../src/utils/streakSync';
import { StreakState } from '../src/utils/streakEngine';

describe('StreakSync Orchestration & Fail-Open Suite', () => {
  const mockInitialState: StreakState = {
    streakDays: 4,
    lastActiveDate: '2026-10-23',
    lastActiveTimestamp: Date.UTC(2026, 9, 23, 10, 0, 0),
    streakShieldCount: 0,
    streakShieldActive: false,
    freezeUntilDate: null,
    lastFreezeActivatedDate: null,
    inGracePeriod: false,
    graceExpiryTimestamp: null,
    timezone: 'Europe/Rome',
    lastShieldAwardedStreak: null
  };

  it('fetchAuthoritativeServerTime fails open safely when server offline', async () => {
    const res = await fetchAuthoritativeServerTime();
    // In unit test without live credentials, it returns null without crashing
    assert.equal(res === null || typeof res?.timestampMs === 'number', true);
  });

  it('syncAuthoritativeActivity executes local fallback when unauthenticated', async () => {
    const day5Timestamp = Date.UTC(2026, 9, 24, 10, 0, 0);
    const disposition = await syncAuthoritativeActivity(mockInitialState, {
      customClientTimestampMs: day5Timestamp
    });

    assert.equal(disposition.source, 'local');
    assert.equal(disposition.streakDays, 5);
    assert.equal(disposition.shieldEarned, true);
    assert.equal(disposition.streakShieldCount, 1);
  });

  it('does not crash or lose progress on network exception (fail-open)', async () => {
    const state: StreakState = {
      ...mockInitialState,
      streakDays: 12,
      lastActiveDate: '2026-10-23',
      lastActiveTimestamp: Date.UTC(2026, 9, 23, 10, 0, 0)
    };

    const nextDay = Date.UTC(2026, 9, 24, 12, 0, 0);
    const res = await syncAuthoritativeActivity(state, { customClientTimestampMs: nextDay });

    assert.equal(res.streakDays, 13);
    assert.equal(res.source, 'local');
    assert.match(res.message, /Streak continuato/);
  });

  it('preserves existing client/inventory streak without zeroing it even if no recent ranked matches were played', async () => {
    // User has an existing streak of 15 from daily breach / PBQ triage in inventory,
    // and hasn\'t played ranked PVP recently (lastRankedAt is null/undefined or old)
    const existingLegacyState: StreakState = {
      streakDays: 15,
      lastActiveDate: '2026-10-24',
      lastActiveTimestamp: Date.UTC(2026, 9, 24, 18, 0, 0),
      streakShieldCount: 1,
      streakShieldActive: false,
      freezeUntilDate: null,
      lastFreezeActivatedDate: null,
      inGracePeriod: false,
      graceExpiryTimestamp: null,
      timezone: 'UTC',
      lastShieldAwardedStreak: 15
    };

    // When syncing next activity (e.g. today 2026-10-25) without ranked activity
    const todayTimestamp = Date.UTC(2026, 9, 25, 9, 0, 0);
    const result = await syncAuthoritativeActivity(existingLegacyState, {
      customClientTimestampMs: todayTimestamp
    });

    // Streak must increment to 16, never reset to 0 or 1
    assert.equal(result.streakDays, 16, 'Streak from inventory must not be reset to 0');
    assert.equal(result.source, 'local');
  });
});
