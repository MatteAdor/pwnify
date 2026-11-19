import { Capacitor } from '@capacitor/core';
import { LocalNotifications, LocalNotificationSchema } from '@capacitor/local-notifications';
import { getCalendarDateInTimezone } from './streakEngine';

export const STREAK_CHANNEL_ID = 'streak-reminders';
export const STREAK_CHANNEL_NAME = 'Streak';

export const NOTIF_ID_TODAY_REMINDER = 101;
export const NOTIF_ID_TODAY_RISK = 102;
export const NOTIF_ID_TOMORROW_REMINDER = 201;
export const NOTIF_ID_TOMORROW_RISK = 202;
export const ALL_STREAK_NOTIFICATION_IDS = [
  NOTIF_ID_TODAY_REMINDER,
  NOTIF_ID_TODAY_RISK,
  NOTIF_ID_TOMORROW_REMINDER,
  NOTIF_ID_TOMORROW_RISK,
];

export const STREAK_REMINDERS_PREF_KEY = 'pwnify_streak_reminders_enabled';
export const STREAK_NOTIF_PERMISSION_ASKED_KEY = 'pwnify_streak_notif_permission_asked';

export interface StreakReminderState {
  streakDays?: number;
  streak?: number;
  lastActiveDate?: string | null;
  lastActivityDate?: string | null;
}

export interface ScheduledStreakReminder extends LocalNotificationSchema {
  id: number;
  title: string;
  body: string;
  schedule: {
    at: Date;
    allowWhileIdle?: boolean;
  };
  channelId: string;
  extra?: {
    type: 'reminder' | 'at_risk';
    targetDate: string;
  };
}

/**
 * Returns a Date representing specific year, month, day, hour, minute in the given timezone.
 * Handles DST transitions seamlessly.
 */
export function getTargetDateInTimezone(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  const pad = (n: number) => String(n).padStart(2, '0');
  const guessIso = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00Z`;
  const guess = new Date(guessIso);

  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const parts = dtf.formatToParts(guess);
  const pMap: Record<string, string> = {};
  for (const p of parts) {
    pMap[p.type] = p.value;
  }

  const parsedHour = pMap.hour === '24' ? 0 : parseInt(pMap.hour, 10);
  const inTzUtc = new Date(
    Date.UTC(
      parseInt(pMap.year, 10),
      parseInt(pMap.month, 10) - 1,
      parseInt(pMap.day, 10),
      parsedHour,
      parseInt(pMap.minute, 10),
      parseInt(pMap.second, 10)
    )
  );

  const diff = guess.getTime() - inTzUtc.getTime();
  return new Date(guess.getTime() + diff);
}

/**
 * Pure function: calculates local notification reminders for the next 2 days.
 * - Reminder at 19:00 if today has no activity yet
 * - Warning "streak at risk" at 21:30 if streak >= 1 and today has no activity
 * - Short IT / EN copy
 * - If today's activity is already completed, returns no notifications for today
 */
export function computeReminders(
  state: StreakReminderState | null | undefined,
  now: Date | number,
  tz: string,
  lang: string = 'it'
): ScheduledStreakReminder[] {
  const safeState = state || {};
  const currentStreak = Math.max(0, safeState.streakDays ?? safeState.streak ?? 0);
  const lastActiveDate = safeState.lastActiveDate ?? safeState.lastActivityDate ?? null;

  const nowDate = now instanceof Date ? now : new Date(now);
  const nowMs = isNaN(nowDate.getTime()) ? Date.now() : nowDate.getTime();
  const validNow = new Date(nowMs);

  let validTz = tz;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: validTz });
  } catch {
    validTz = 'UTC';
  }

  const isEn = lang.toLowerCase().startsWith('en');

  // Today in user's timezone
  const todayStr = getCalendarDateInTimezone(validNow.getTime(), validTz);
  const [tYear, tMonth, tDay] = todayStr.split('-').map(n => parseInt(n, 10));

  // Tomorrow in user's timezone (using UTC day arithmetic to handle month/year roll-overs)
  const tomorrowUtc = new Date(Date.UTC(tYear, tMonth - 1, tDay + 1));
  const tmStr = getCalendarDateInTimezone(tomorrowUtc.getTime(), validTz);
  const [tmYear, tmMonth, tmDay] = tmStr.split('-').map(n => parseInt(n, 10));

  const isTodayCompleted = Boolean(lastActiveDate && lastActiveDate === todayStr);

  const notifications: ScheduledStreakReminder[] = [];

  // Helper texts
  const getReminderTexts = (streak: number) => {
    if (isEn) {
      return {
        title: streak >= 1 ? `Keep your streak alive (${streak}d) 🔥` : 'Start your streak today 🔥',
        body: streak >= 1
          ? 'Complete a quick quiz to keep your training streak going.'
          : 'Complete your first lesson to ignite your streak.',
      };
    }
    return {
      title: streak >= 1 ? `Mantieni la streak (${streak}d) 🔥` : 'Inizia la tua streak 🔥',
      body: streak >= 1
        ? 'Completa un quiz rapido per continuare la tua serie di studio.'
        : 'Completa la tua prima lezione per accendere la streak.',
    };
  };

  const getRiskTexts = (streak: number) => {
    if (isEn) {
      return {
        title: '⚠️ Streak at risk!',
        body: `Only a few hours left before midnight. Don't lose your ${streak}-day streak!`,
      };
    }
    return {
      title: '⚠️ Streak a rischio!',
      body: `Mancano poche ore a mezzanotte. Non perdere la tua serie di ${streak} giorni!`,
    };
  };

  // 1. DAY 0 (TODAY) — only if not already done today
  if (!isTodayCompleted) {
    // 19:00 Reminder
    const today1900 = getTargetDateInTimezone(tYear, tMonth, tDay, 19, 0, validTz);
    if (today1900.getTime() > validNow.getTime()) {
      const texts = getReminderTexts(currentStreak);
      notifications.push({
        id: NOTIF_ID_TODAY_REMINDER,
        title: texts.title,
        body: texts.body,
        schedule: {
          at: today1900,
          allowWhileIdle: true,
        },
        channelId: STREAK_CHANNEL_ID,
        extra: {
          type: 'reminder',
          targetDate: todayStr,
        },
      });
    }

    // 21:30 "Streak a rischio" warning (only if streak >= 1)
    if (currentStreak >= 1) {
      const today2130 = getTargetDateInTimezone(tYear, tMonth, tDay, 21, 30, validTz);
      if (today2130.getTime() > validNow.getTime()) {
        const riskTexts = getRiskTexts(currentStreak);
        notifications.push({
          id: NOTIF_ID_TODAY_RISK,
          title: riskTexts.title,
          body: riskTexts.body,
          schedule: {
            at: today2130,
            allowWhileIdle: true,
          },
          channelId: STREAK_CHANNEL_ID,
          extra: {
            type: 'at_risk',
            targetDate: todayStr,
          },
        });
      }
    }
  }

  // 2. DAY 1 (TOMORROW) — rolling forward protection
  // If today is completed or streak is maintained, tomorrow's expected streak is at least currentStreak (or >= 1)
  const tomorrowStreak = isTodayCompleted ? currentStreak : currentStreak;

  // 19:00 Tomorrow Reminder
  const tm1900 = getTargetDateInTimezone(tmYear, tmMonth, tmDay, 19, 0, validTz);
  if (tm1900.getTime() > validNow.getTime()) {
    const tmTexts = getReminderTexts(tomorrowStreak);
    notifications.push({
      id: NOTIF_ID_TOMORROW_REMINDER,
      title: tmTexts.title,
      body: tmTexts.body,
      schedule: {
        at: tm1900,
        allowWhileIdle: true,
      },
      channelId: STREAK_CHANNEL_ID,
      extra: {
        type: 'reminder',
        targetDate: tmStr,
      },
    });
  }

  // 21:30 Tomorrow "Streak a rischio" warning (only if expected streak >= 1)
  if (tomorrowStreak >= 1) {
    const tm2130 = getTargetDateInTimezone(tmYear, tmMonth, tmDay, 21, 30, validTz);
    if (tm2130.getTime() > validNow.getTime()) {
      const tmRiskTexts = getRiskTexts(tomorrowStreak);
      notifications.push({
        id: NOTIF_ID_TOMORROW_RISK,
        title: tmRiskTexts.title,
        body: tmRiskTexts.body,
        schedule: {
          at: tm2130,
          allowWhileIdle: true,
        },
        channelId: STREAK_CHANNEL_ID,
        extra: {
          type: 'at_risk',
          targetDate: tmStr,
        },
      });
    }
  }

  return notifications;
}

/**
 * Checks user preference for streak reminders in localStorage.
 * Defaults to true.
 */
export function isStreakRemindersEnabled(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const val = window.localStorage.getItem(STREAK_REMINDERS_PREF_KEY);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

/**
 * Sets user preference for streak reminders in localStorage.
 */
export function setStreakRemindersEnabled(enabled: boolean): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STREAK_REMINDERS_PREF_KEY, String(enabled));
    }
  } catch {}
}

/**
 * Checks whether permission has already been requested once.
 */
export function hasNotificationPermissionBeenRequested(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    return window.localStorage.getItem(STREAK_NOTIF_PERMISSION_ASKED_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Marks that permission has been asked, ensuring it will never be asked again if denied.
 */
export function markNotificationPermissionRequested(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STREAK_NOTIF_PERMISSION_ASKED_KEY, 'true');
    }
  } catch {}
}

/**
 * Ensures the Android Notification Channel "Streak" is registered with normal priority (importance: 3).
 */
export async function ensureStreakNotificationChannel(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await LocalNotifications.createChannel({
      id: STREAK_CHANNEL_ID,
      name: STREAK_CHANNEL_NAME,
      description: 'Promemoria giornalieri per la streak',
      importance: 3, // NotificationImportance.DEFAULT
      visibility: 1, // NotificationVisibility.PUBLIC
      vibration: true,
      sound: undefined,
    });
  } catch (err) {
    console.warn('[StreakReminders] Could not register notification channel:', err);
  }
}

/**
 * Cancels all scheduled streak reminders.
 */
export async function cancelAllStreakReminders(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const pending = await LocalNotifications.getPending();
    const toCancel = pending.notifications.filter(n =>
      ALL_STREAK_NOTIFICATION_IDS.includes(n.id)
    );
    if (toCancel.length > 0) {
      await LocalNotifications.cancel({ notifications: toCancel });
    }
  } catch (err) {
    console.warn('[StreakReminders] Failed to cancel notifications:', err);
  }
}

/**
 * Requests notification permission exactly once.
 * If already asked previously, does not ask again and returns whether it is currently granted.
 */
export async function requestNotificationPermissionOnce(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const current = await LocalNotifications.checkPermissions();
    if (current.display === 'granted') {
      return true;
    }

    if (hasNotificationPermissionBeenRequested()) {
      return false; // Already prompted before, do not re-prompt
    }

    markNotificationPermissionRequested();
    const req = await LocalNotifications.requestPermissions();
    return req.display === 'granted';
  } catch (err) {
    console.warn('[StreakReminders] Permission request failed:', err);
    return false;
  }
}

/**
 * Re-schedules local streak reminders for the rolling 2-day period.
 * Only executes if on native platform and reminders are enabled.
 */
export async function rescheduleStreakReminders(
  state: StreakReminderState | null | undefined,
  options?: { lang?: string; tz?: string; force?: boolean }
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  if (!isStreakRemindersEnabled() && !options?.force) {
    await cancelAllStreakReminders();
    return;
  }

  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      return;
    }

    await ensureStreakNotificationChannel();
    await cancelAllStreakReminders();

    const tz = options?.tz || (typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC');
    const lang = options?.lang || 'it';
    const reminders = computeReminders(state, new Date(), tz, lang);

    if (reminders.length > 0) {
      await LocalNotifications.schedule({
        notifications: reminders,
      });
    }
  } catch (err) {
    console.warn('[StreakReminders] Failed to schedule reminders:', err);
  }
}

/**
 * Triggered after every completed learning activity.
 * Requests notification permission once after the first activity (never at startup),
 * and reschedules reminders if enabled.
 */
export async function onActivityCompletedForReminders(
  state: StreakReminderState | null | undefined,
  lang: string = 'it'
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  if (!hasNotificationPermissionBeenRequested()) {
    const granted = await requestNotificationPermissionOnce();
    if (!granted) return;
  }

  await rescheduleStreakReminders(state, { lang });
}

/**
 * Initializes streak reminders on app startup.
 * Does NOT request permission, only reschedules if permission was already granted previously.
 */
export async function initStreakRemindersOnStartup(
  state: StreakReminderState | null | undefined,
  lang: string = 'it'
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display === 'granted' && isStreakRemindersEnabled()) {
      await rescheduleStreakReminders(state, { lang });
    }
  } catch {}
}
