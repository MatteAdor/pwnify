import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeReminders,
  getTargetDateInTimezone,
  NOTIF_ID_TODAY_REMINDER,
  NOTIF_ID_TODAY_RISK,
  NOTIF_ID_TOMORROW_REMINDER,
  NOTIF_ID_TOMORROW_RISK,
  STREAK_CHANNEL_ID
} from '../src/utils/streakReminders.ts';

describe('Streak Reminders Pure Logic Suite (computeReminders)', () => {
  const TZ_ROME = 'Europe/Rome';
  const TZ_NY = 'America/New_York';
  const TZ_TOKYO = 'Asia/Tokyo';

  test('getTargetDateInTimezone accurately computes local hour and minute in target timezone', () => {
    // 2026-11-19 19:00 in Europe/Rome (CET, UTC+1) => 18:00 UTC
    const target = getTargetDateInTimezone(2026, 11, 19, 19, 0, TZ_ROME);
    assert.strictEqual(target.toISOString(), '2026-11-19T18:00:00.000Z');

    // 2026-07-15 19:00 in Europe/Rome (CEST, UTC+2) => 17:00 UTC
    const summer = getTargetDateInTimezone(2026, 7, 15, 19, 0, TZ_ROME);
    assert.strictEqual(summer.toISOString(), '2026-07-15T17:00:00.000Z');
  });

  test('Case 1: Activity not completed today, streak >= 1 (morning check before 19:00)', () => {
    // Current time: 2026-11-19 10:00:00 CET => 2026-11-19T09:00:00.000Z
    const now = new Date('2026-11-19T09:00:00.000Z');
    const state = {
      streakDays: 5,
      lastActiveDate: '2026-11-18' // yesterday
    };

    const reminders = computeReminders(state, now, TZ_ROME, 'it');

    // Expected: 4 notifications (today 19:00, today 21:30, tomorrow 19:00, tomorrow 21:30)
    assert.strictEqual(reminders.length, 4);

    const today1900 = reminders.find(r => r.id === NOTIF_ID_TODAY_REMINDER);
    const today2130 = reminders.find(r => r.id === NOTIF_ID_TODAY_RISK);
    const tm1900 = reminders.find(r => r.id === NOTIF_ID_TOMORROW_REMINDER);
    const tm2130 = reminders.find(r => r.id === NOTIF_ID_TOMORROW_RISK);

    assert.ok(today1900, 'Today 19:00 reminder must be scheduled');
    assert.ok(today2130, 'Today 21:30 risk warning must be scheduled');
    assert.ok(tm1900, 'Tomorrow 19:00 reminder must be scheduled');
    assert.ok(tm2130, 'Tomorrow 21:30 risk warning must be scheduled');

    assert.strictEqual(today1900?.schedule.at.toISOString(), '2026-11-19T18:00:00.000Z');
    assert.strictEqual(today2130?.schedule.at.toISOString(), '2026-11-19T20:30:00.000Z');
    assert.strictEqual(tm1900?.schedule.at.toISOString(), '2026-11-20T18:00:00.000Z');
    assert.strictEqual(tm2130?.schedule.at.toISOString(), '2026-11-20T20:30:00.000Z');

    assert.strictEqual(today1900?.channelId, STREAK_CHANNEL_ID);
    assert.strictEqual(today2130?.channelId, STREAK_CHANNEL_ID);
  });

  test('Case 2: Activity already completed today => NO notifications for today', () => {
    // Current time: 2026-11-19 14:00:00 CET
    const now = new Date('2026-11-19T13:00:00.000Z');
    const state = {
      streakDays: 6,
      lastActiveDate: '2026-11-19' // today!
    };

    const reminders = computeReminders(state, now, TZ_ROME, 'it');

    // Must not schedule ANY notification for today
    const todayNotifs = reminders.filter(r => r.id === NOTIF_ID_TODAY_REMINDER || r.id === NOTIF_ID_TODAY_RISK);
    assert.strictEqual(todayNotifs.length, 0, 'No notification must be scheduled for today when activity is already completed');

    // Only tomorrow notifications (19:00 & 21:30)
    assert.strictEqual(reminders.length, 2);
    assert.ok(reminders.some(r => r.id === NOTIF_ID_TOMORROW_REMINDER));
    assert.ok(reminders.some(r => r.id === NOTIF_ID_TOMORROW_RISK));
  });

  test('Case 3: Streak is 0 and no activity today => only 19:00 reminders, no risk alert', () => {
    const now = new Date('2026-11-19T09:00:00.000Z');
    const state = {
      streakDays: 0,
      lastActiveDate: null
    };

    const reminders = computeReminders(state, now, TZ_ROME, 'it');

    // When streak is 0: there is no streak to lose, so 21:30 risk alerts must NOT be generated
    const riskNotifs = reminders.filter(r => r.id === NOTIF_ID_TODAY_RISK || r.id === NOTIF_ID_TOMORROW_RISK);
    assert.strictEqual(riskNotifs.length, 0, 'Streak 0 must not trigger risk warning notifications');

    // Should only have 19:00 reminders for today and tomorrow
    assert.strictEqual(reminders.length, 2);
    assert.ok(reminders.some(r => r.id === NOTIF_ID_TODAY_REMINDER));
    assert.ok(reminders.some(r => r.id === NOTIF_ID_TOMORROW_REMINDER));
  });

  test('Case 4: Time of day progression (past 19:00 but before 21:30 today)', () => {
    // Current time: 2026-11-19 20:00:00 CET => 2026-11-19T19:00:00.000Z
    const now = new Date('2026-11-19T19:00:00.000Z');
    const state = {
      streakDays: 3,
      lastActiveDate: '2026-11-18'
    };

    const reminders = computeReminders(state, now, TZ_ROME, 'it');

    // Today 19:00 has passed, so today only gets 21:30. Tomorrow gets both 19:00 and 21:30
    assert.strictEqual(reminders.length, 3);
    assert.strictEqual(reminders.some(r => r.id === NOTIF_ID_TODAY_REMINDER), false, 'Past 19:00 notification must be skipped');
    assert.strictEqual(reminders.some(r => r.id === NOTIF_ID_TODAY_RISK), true, 'Future 21:30 risk notification must be scheduled');
  });

  test('Case 5: Time of day progression (past 21:30 today)', () => {
    // Current time: 2026-11-19 22:00:00 CET => 2026-11-19T21:00:00.000Z
    const now = new Date('2026-11-19T21:00:00.000Z');
    const state = {
      streakDays: 3,
      lastActiveDate: '2026-11-18'
    };

    const reminders = computeReminders(state, now, TZ_ROME, 'it');

    // Both today 19:00 and 21:30 have passed, so 0 for today, 2 for tomorrow
    assert.strictEqual(reminders.length, 2);
    assert.strictEqual(reminders.some(r => r.id === NOTIF_ID_TODAY_REMINDER), false);
    assert.strictEqual(reminders.some(r => r.id === NOTIF_ID_TODAY_RISK), false);
    assert.strictEqual(reminders.some(r => r.id === NOTIF_ID_TOMORROW_REMINDER), true);
    assert.strictEqual(reminders.some(r => r.id === NOTIF_ID_TOMORROW_RISK), true);
  });

  test('Case 6: Timezone and day rollover (America/New_York)', () => {
    // 2026-11-19 12:00:00 EST (UTC-5) => 2026-11-19T17:00:00.000Z
    const now = new Date('2026-11-19T17:00:00.000Z');
    const state = {
      streakDays: 10,
      lastActiveDate: '2026-11-18'
    };

    const reminders = computeReminders(state, now, TZ_NY, 'en');

    assert.strictEqual(reminders.length, 4);

    const today1900 = reminders.find(r => r.id === NOTIF_ID_TODAY_REMINDER);
    const today2130 = reminders.find(r => r.id === NOTIF_ID_TODAY_RISK);

    // 19:00 EST (UTC-5) => 24:00 (next day 00:00 UTC)
    assert.strictEqual(today1900?.schedule.at.toISOString(), '2026-11-20T00:00:00.000Z');
    // 21:30 EST (UTC-5) => 02:30 UTC next day
    assert.strictEqual(today2130?.schedule.at.toISOString(), '2026-11-20T02:30:00.000Z');
  });

  test('Case 7: DST transition boundary in autumn (Europe/Rome clock fallback)', () => {
    // 2026-10-25 is the autumn DST transition in Europe/Rome (CEST -> CET)
    // At 10:00:00 local time
    const now = new Date('2026-10-25T09:00:00.000Z');
    const state = {
      streakDays: 4,
      lastActiveDate: '2026-10-24'
    };

    const reminders = computeReminders(state, now, TZ_ROME, 'it');
    assert.strictEqual(reminders.length, 4);

    const today1900 = reminders.find(r => r.id === NOTIF_ID_TODAY_REMINDER);
    // At 19:00 on 2026-10-25, Rome is in CET (UTC+1)
    assert.strictEqual(today1900?.schedule.at.toISOString(), '2026-10-25T18:00:00.000Z');
  });

  test('Case 8: DST transition boundary in spring (Europe/Rome clock advance)', () => {
    // 2026-03-29 is the spring DST transition in Europe/Rome (CET -> CEST)
    const now = new Date('2026-03-29T09:00:00.000Z');
    const state = {
      streakDays: 8,
      lastActiveDate: '2026-03-28'
    };

    const reminders = computeReminders(state, now, TZ_ROME, 'it');
    assert.strictEqual(reminders.length, 4);

    const today1900 = reminders.find(r => r.id === NOTIF_ID_TODAY_REMINDER);
    // At 19:00 on 2026-03-29, Rome is in CEST (UTC+2)
    assert.strictEqual(today1900?.schedule.at.toISOString(), '2026-03-29T17:00:00.000Z');
  });

  test('Case 9: Month & Year Rollover boundaries', () => {
    // 31st of October to 1st of November
    const endOfMonth = new Date('2026-10-31T08:00:00.000Z');
    const remindersMonthEnd = computeReminders({ streakDays: 2, lastActiveDate: '2026-10-30' }, endOfMonth, 'UTC', 'en');
    const tmRem = remindersMonthEnd.find(r => r.id === NOTIF_ID_TOMORROW_REMINDER);
    assert.strictEqual(tmRem?.extra?.targetDate, '2026-11-01');

    // 31st of December to 1st of January (Year Rollover)
    const endOfYear = new Date('2026-12-31T08:00:00.000Z');
    const remindersYearEnd = computeReminders({ streakDays: 2, lastActiveDate: '2026-12-30' }, endOfYear, 'UTC', 'en');
    const tmRemYear = remindersYearEnd.find(r => r.id === NOTIF_ID_TOMORROW_REMINDER);
    assert.strictEqual(tmRemYear?.extra?.targetDate, '2027-01-01');
  });

  test('Case 10: Multilingual content verification (IT and EN)', () => {
    const now = new Date('2026-11-19T09:00:00.000Z');
    const itReminders = computeReminders({ streakDays: 5, lastActiveDate: null }, now, TZ_ROME, 'it');
    const enReminders = computeReminders({ streakDays: 5, lastActiveDate: null }, now, TZ_ROME, 'en');

    const itRisk = itReminders.find(r => r.id === NOTIF_ID_TODAY_RISK);
    const enRisk = enReminders.find(r => r.id === NOTIF_ID_TODAY_RISK);

    assert.ok(itRisk?.title.includes('a rischio'), 'Italian title must include "a rischio"');
    assert.ok(enRisk?.title.includes('at risk'), 'English title must include "at risk"');
  });
});
