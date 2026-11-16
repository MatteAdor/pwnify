import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  StreakState,
  getCalendarDateInTimezone,
  getCalendarDaysDiff,
  validateClientTimestamp,
  recordLearningActivity,
  activateStreakFreeze,
  getStreakThresholdTitle
} from '../src/utils/streakEngine';

describe('ZeroDay Unified Streak Engine (B0 Audit Suite)', () => {

  const createInitialState = (tz = 'Europe/Rome'): StreakState => ({
    streakDays: 0,
    lastActiveDate: null,
    lastActiveTimestamp: 0,
    streakShieldCount: 0,
    streakShieldActive: false,
    freezeUntilDate: null,
    lastFreezeActivatedDate: null,
    inGracePeriod: false,
    graceExpiryTimestamp: null,
    timezone: tz
  });

  describe('1. Timezone & Midnight Turnover Handling', () => {
    it('correctly maps UTC timestamp to Rome timezone across midnight', () => {
      // 2026-10-24 22:30:00 UTC = 2026-10-25 00:30:00 CEST (UTC+2) in Rome!
      const tsUtc = Date.UTC(2026, 9, 24, 22, 30, 0); // Oct is month 9 (0-indexed)
      const dateInRome = getCalendarDateInTimezone(tsUtc, 'Europe/Rome');
      const dateInUtc = getCalendarDateInTimezone(tsUtc, 'UTC');

      assert.equal(dateInRome, '2026-10-25');
      assert.equal(dateInUtc, '2026-10-24');
    });

    it('correctly maps timestamps to Tokyo (+9) vs New York (-5)', () => {
      // 2026-05-15 14:00:00 UTC
      // In Tokyo: 23:00 on May 15
      // In New York: 10:00 on May 15
      const tsUtc = Date.UTC(2026, 4, 15, 14, 0, 0);
      assert.equal(getCalendarDateInTimezone(tsUtc, 'Asia/Tokyo'), '2026-05-15');
      assert.equal(getCalendarDateInTimezone(tsUtc, 'America/New_York'), '2026-05-15');

      // 2026-05-15 23:30:00 UTC
      // In Tokyo: May 16 (08:30)
      // In New York: May 15 (19:30)
      const tsUtcLate = Date.UTC(2026, 4, 15, 23, 30, 0);
      assert.equal(getCalendarDateInTimezone(tsUtcLate, 'Asia/Tokyo'), '2026-05-16');
      assert.equal(getCalendarDateInTimezone(tsUtcLate, 'America/New_York'), '2026-05-15');
    });

    it('handles DST transition without dropping or duplicating calendar days', () => {
      // Europe/Rome DST switch: Sunday 25 Oct 2026 at 03:00 CEST -> 02:00 CET
      // Day before DST switch:
      const beforeDst = Date.UTC(2026, 9, 24, 12, 0, 0);
      // Day of DST switch:
      const duringDst = Date.UTC(2026, 9, 25, 12, 0, 0);
      // Day after DST switch:
      const afterDst = Date.UTC(2026, 9, 26, 12, 0, 0);

      const d1 = getCalendarDateInTimezone(beforeDst, 'Europe/Rome');
      const d2 = getCalendarDateInTimezone(duringDst, 'Europe/Rome');
      const d3 = getCalendarDateInTimezone(afterDst, 'Europe/Rome');

      assert.equal(d1, '2026-10-24');
      assert.equal(d2, '2026-10-25');
      assert.equal(d3, '2026-10-26');
      assert.equal(getCalendarDaysDiff(d1, d2), 1);
      assert.equal(getCalendarDaysDiff(d2, d3), 1);
    });
  });

  describe('2. Client Clock Anti-Tampering Guards', () => {
    it('detects and flags client clock drift against trusted server timestamp', () => {
      const serverTime = Date.UTC(2026, 9, 24, 12, 0, 0);
      const tamperedClientTime = serverTime + 3 * 24 * 60 * 60 * 1000; // 3 days ahead!

      const validation = validateClientTimestamp(tamperedClientTime, null, serverTime);
      assert.equal(validation.isTampered, true);
      assert.equal(validation.effectiveTimestampMs, serverTime, 'Server timestamp must override tampered client clock');
    });

    it('rejects client clock moving backwards past last active timestamp', () => {
      const lastKnown = Date.UTC(2026, 9, 24, 15, 0, 0);
      const woundBackClient = Date.UTC(2026, 9, 23, 10, 0, 0); // Clock set to yesterday

      const validation = validateClientTimestamp(woundBackClient, lastKnown, null);
      assert.equal(validation.isValid, false);
      assert.equal(validation.isTampered, true);
    });

    it('does not increment streak if user rewinds clock to past date', () => {
      const state: StreakState = {
        ...createInitialState(),
        streakDays: 4,
        lastActiveDate: '2026-10-24',
        lastActiveTimestamp: Date.UTC(2026, 9, 24, 12, 0, 0)
      };

      const rewoundTime = Date.UTC(2026, 9, 23, 12, 0, 0); // Yesterday
      const { updatedState, result } = recordLearningActivity(state, rewoundTime);

      assert.equal(result.streakIncremented, false);
      assert.equal(result.tamperDetected, true);
      assert.equal(updatedState.streakDays, 4);
    });
  });

  describe('3. Progression & Consecutive Activity', () => {
    it('starts streak at 1 on first ever activity', () => {
      const state = createInitialState();
      const now = Date.UTC(2026, 9, 20, 10, 0, 0);
      const { updatedState, result } = recordLearningActivity(state, now);

      assert.equal(result.newStreak, 1);
      assert.equal(result.streakIncremented, true);
      assert.equal(updatedState.lastActiveDate, '2026-10-20');
    });

    it('does not duplicate streak on multiple activities on same calendar day', () => {
      const state = createInitialState();
      const morning = Date.UTC(2026, 9, 20, 8, 0, 0);
      const afternoon = Date.UTC(2026, 9, 20, 16, 0, 0);

      const first = recordLearningActivity(state, morning);
      assert.equal(first.result.newStreak, 1);

      const second = recordLearningActivity(first.updatedState, afternoon);
      assert.equal(second.result.newStreak, 1);
      assert.equal(second.result.streakIncremented, false);
    });

    it('increments streak on consecutive day', () => {
      const state = createInitialState();
      const day1 = Date.UTC(2026, 9, 20, 10, 0, 0);
      const day2 = Date.UTC(2026, 9, 21, 11, 0, 0);

      const res1 = recordLearningActivity(state, day1);
      const res2 = recordLearningActivity(res1.updatedState, day2);

      assert.equal(res2.result.newStreak, 2);
      assert.equal(res2.result.streakIncremented, true);
      assert.equal(res2.updatedState.lastActiveDate, '2026-10-21');
    });
  });

  describe('4. Well-being Safeguards: Shields, Pause Mode, Grace Recovery', () => {
    it('earns 1 Streak Shield upon reaching 5 consecutive days', () => {
      let state = createInitialState();
      state.streakDays = 4;
      state.lastActiveDate = '2026-10-23';
      state.lastActiveTimestamp = Date.UTC(2026, 9, 23, 10, 0, 0);

      const day5 = Date.UTC(2026, 9, 24, 10, 0, 0);
      const res = recordLearningActivity(state, day5);

      assert.equal(res.result.newStreak, 5);
      assert.equal(res.result.shieldEarned, true);
      assert.equal(res.updatedState.streakShieldCount, 1);
      assert.equal(res.updatedState.streakShieldActive, true);
      assert.equal(res.updatedState.lastShieldAwardedStreak, 5);
    });

    it('does not award shield at multiple of 5 if shield slot is already full (max 1 for free)', () => {
      let state = createInitialState();
      state.streakDays = 9;
      state.lastActiveDate = '2026-10-23';
      state.lastActiveTimestamp = Date.UTC(2026, 9, 23, 10, 0, 0);
      state.streakShieldCount = 1; // Slot already full
      state.streakShieldActive = true;
      state.lastShieldAwardedStreak = 5;

      const day10 = Date.UTC(2026, 9, 24, 10, 0, 0);
      const res = recordLearningActivity(state, day10);

      assert.equal(res.result.newStreak, 10);
      assert.equal(res.result.shieldEarned, false, 'Shield should NOT be earned because slot is already full');
      assert.equal(res.updatedState.streakShieldCount, 1, 'Shield count must remain capped at 1');
    });

    it('does not award shield again for the same threshold if already awarded', () => {
      let state = createInitialState();
      state.streakDays = 4;
      state.lastActiveDate = '2026-10-23';
      state.lastActiveTimestamp = Date.UTC(2026, 9, 23, 10, 0, 0);
      state.streakShieldCount = 0; // Slot emptied
      state.lastShieldAwardedStreak = 5; // Already claimed for day 5

      const day5 = Date.UTC(2026, 9, 24, 10, 0, 0);
      const res = recordLearningActivity(state, day5);

      assert.equal(res.result.newStreak, 5);
      assert.equal(res.result.shieldEarned, false, 'Shield must not be awarded twice for same threshold');
      assert.equal(res.updatedState.streakShieldCount, 0);
    });

    it('earns 1 Streak Shield upon achieving 100% on a PBQ Lab', () => {
      const state = createInitialState();
      state.streakDays = 2;
      state.lastActiveDate = '2026-10-20';
      state.lastActiveTimestamp = Date.UTC(2026, 9, 20, 10, 0, 0);

      const now = Date.UTC(2026, 9, 20, 14, 0, 0); // Same day PBQ
      const res = recordLearningActivity(state, now, { isPbqPerfect: true });

      assert.equal(res.result.shieldEarned, true);
      assert.equal(res.updatedState.streakShieldCount, 1);
    });

    it('consumes Streak Shield when 1 day is missed, preventing reset', () => {
      const state: StreakState = {
        ...createInitialState(),
        streakDays: 8,
        lastActiveDate: '2026-10-20',
        lastActiveTimestamp: Date.UTC(2026, 9, 20, 10, 0, 0),
        streakShieldCount: 1,
        streakShieldActive: true
      };

      // User skips Oct 21 and returns on Oct 22 (+2 days)
      const day22 = Date.UTC(2026, 9, 22, 10, 0, 0);
      const res = recordLearningActivity(state, day22);

      assert.equal(res.result.shieldConsumed, true);
      assert.equal(res.result.newStreak, 9, 'Streak must continue without loss');
      assert.equal(res.updatedState.streakShieldCount, 0, 'Shield count decremented to 0');
    });

    it('activates Pause / Freeze mode and preserves streak through vacation', () => {
      let state: StreakState = {
        ...createInitialState(),
        streakDays: 14,
        lastActiveDate: '2026-10-20',
        lastActiveTimestamp: Date.UTC(2026, 9, 20, 10, 0, 0)
      };

      // Activate freeze for 5 days
      const freezeRes = activateStreakFreeze(state, 5, Date.UTC(2026, 9, 20, 12, 0, 0));
      assert.equal(freezeRes.success, true);
      assert.equal(freezeRes.updatedState?.freezeUntilDate, '2026-10-25');

      // User studies during or on the final day of freeze (Oct 24, 4 days later)
      state = freezeRes.updatedState!;
      const returnDate = Date.UTC(2026, 9, 24, 10, 0, 0);
      const activityRes = recordLearningActivity(state, returnDate);

      assert.equal(activityRes.result.newStreak, 15, 'Streak maintained through freeze');
      assert.equal(activityRes.result.streakIncremented, true);
    });

    it('enforces 30-day cooldown between streak freeze activations', () => {
      let state: StreakState = {
        ...createInitialState(),
        lastFreezeActivatedDate: '2026-10-01'
      };

      // Attempt another freeze 10 days later (Oct 11) -> should fail
      const attempt1 = activateStreakFreeze(state, 3, Date.UTC(2026, 9, 11, 10, 0, 0));
      assert.equal(attempt1.success, false);
      assert.match(attempt1.error || '', /30 giorni/);

      // Attempt freeze 31 days later (Nov 02) -> should succeed
      const attempt2 = activateStreakFreeze(state, 3, Date.UTC(2026, 10, 2, 10, 0, 0));
      assert.equal(attempt2.success, true);
    });
  });

  describe('5. Verified Streak Threshold Titles', () => {
    it('returns null for streaks under 7 days', () => {
      assert.equal(getStreakThresholdTitle(6), null);
    });

    it('awards titles at 7, 30, 60, and 100 days thresholds', () => {
      assert.equal(getStreakThresholdTitle(7)?.title, '7-Day Persistent Operative');
      assert.equal(getStreakThresholdTitle(29)?.title, '7-Day Persistent Operative');
      assert.equal(getStreakThresholdTitle(30)?.title, 'Monthly Defcon Sentinel');
      assert.equal(getStreakThresholdTitle(59)?.title, 'Monthly Defcon Sentinel');
      assert.equal(getStreakThresholdTitle(60)?.title, 'ZeroDay Red Team Veteran');
      assert.equal(getStreakThresholdTitle(99)?.title, 'ZeroDay Red Team Veteran');
      assert.equal(getStreakThresholdTitle(100)?.title, 'Centurion Elite Vanguard');
      assert.equal(getStreakThresholdTitle(250)?.title, 'Centurion Elite Vanguard');
    });
  });
});
