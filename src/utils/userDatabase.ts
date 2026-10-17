import { UserState } from '../types';
import { INITIAL_DAILY_BOUNTIES } from '../data/bountiesAndPbq';
import { calculateDynamicTelemetry } from './readinessEngine';
import { sanitizeCallsign } from './security';

const ACCOUNTS_DB_KEY = 'zeroday_database_accounts_v1';
const SESSION_DB_KEY = 'zeroday_database_session_v1';
const LEGACY_STORAGE_PURGED_FLAG = 'zeroday_legacy_purged_v1';

export interface UserAccount {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  lastLoginAt: string;
  userState: UserState;
}

/**
 * Creates a clean, pristine UserState for a brand new operator account.
 * Guarantees zero leftover progress, zero mock values, fresh 0 XP,
 * and exactly the 2 initial required completed quests with streak 3.
 */
export function createCleanAccountState(username: string, email?: string): UserState {
  const dynamic = calculateDynamicTelemetry(['node_basics_1', 'node_basics_2'], [], false);
  return {
    username: sanitizeCallsign(username, 'Operatore'),
    userEmail: email ? email.trim().toLowerCase() : undefined,
    isLoggedIn: true,
    isPro: false,
    streakDays: 3,
    streakShieldActive: false,
    elo: 1000,
    arenaTickets: 3,
    maxTickets: 3,
    winStreak: 3,
    xp: 0,
    readinessScore: dynamic.readinessScore,
    completedNodeIds: ['node_basics_1', 'node_basics_2'],
    completedPbqIds: [],
    survivalHighScore: 0,
    dailyBounties: INITIAL_DAILY_BOUNTIES.map(b => ({
      ...b,
      progress: 0,
      isCompleted: false,
      freeClaimed: false,
      proClaimed: false
    })),
    goal: 'Passare CompTIA Security+ / CCNA',
    experienceLevel: 'Intermediate',
    dailyCommitment: 15,
    onboardingCompleted: true,
    hasSeenTrial: false,
    radarScores: dynamic.radarScores
  };
}

/**
 * Creates default anonymous/guest operator state when no account is logged in.
 */
export function createDefaultGuestState(): UserState {
  return createCleanAccountState('0x_GhostRider');
}

/**
 * One-time purge of all old legacy localStorage keys to ensure
 * previous dirty sessions (e.g. mock pro state, dirty username) are wiped clean.
 */
export function purgeLegacyStorage(): void {
  try {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(LEGACY_STORAGE_PURGED_FLAG) === 'true') return;

    const legacyKeys = [
      '0xday_user_state_v5',
      '0xday_user_state_v4',
      '0xday_user_state_v3',
      '0xday_user_state_v2',
      '0xday_user_state',
      'zeroday_registered_users',
      '0x_arsenal_theme',
      '0x_arsenal_title',
      '0x_godmode'
    ];

    legacyKeys.forEach(k => localStorage.removeItem(k));
    localStorage.setItem(LEGACY_STORAGE_PURGED_FLAG, 'true');
  } catch (e) {
    console.error('Failed to purge legacy storage', e);
  }
}

/**
 * Retrieves all registered accounts from the database.
 */
export function getRegisteredAccounts(): UserAccount[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(ACCOUNTS_DB_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Saves all accounts to the database.
 */
export function saveAccounts(accounts: UserAccount[]): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ACCOUNTS_DB_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.error('Failed to save accounts database', e);
  }
}

/**
 * Register a brand new operator account.
 * Rejects duplicates and starts with completely clean state ("nulla di nulla").
 */
export function registerAccount(
  username: string,
  email: string,
  passwordPlain: string
): { success: boolean; account?: UserAccount; error?: string } {
  const safeName = sanitizeCallsign(username);
  if (!safeName || safeName.length < 3) {
    return { success: false, error: 'Il Callsign deve contenere almeno 3 caratteri alfanumerici.' };
  }

  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
    return { success: false, error: 'Indirizzo email non valido.' };
  }

  if (!passwordPlain || passwordPlain.length < 6) {
    return { success: false, error: 'La password deve contenere almeno 6 caratteri.' };
  }

  const accounts = getRegisteredAccounts();
  const duplicate = accounts.find(
    a => a.username.toLowerCase() === safeName.toLowerCase() || a.email.toLowerCase() === cleanEmail
  );

  if (duplicate) {
    return { success: false, error: 'Un operatore con questo Callsign o Email è già registrato nel database.' };
  }

  // Create clean state with zero past progress
  const cleanState = createCleanAccountState(safeName, cleanEmail);

  const newAccount: UserAccount = {
    id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
    username: safeName,
    email: cleanEmail,
    passwordHash: btoa(passwordPlain),
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    userState: cleanState
  };

  accounts.push(newAccount);
  saveAccounts(accounts);
  setCurrentSession(newAccount);

  return { success: true, account: newAccount };
}

/**
 * Authenticates an existing operator from the database.
 */
export function loginAccount(
  identifier: string,
  passwordPlain: string
): { success: boolean; account?: UserAccount; error?: string } {
  const cleanId = identifier.trim().toLowerCase();
  const accounts = getRegisteredAccounts();

  const found = accounts.find(
    a => a.username.toLowerCase() === cleanId || a.email.toLowerCase() === cleanId
  );

  if (!found) {
    return { success: false, error: 'Nessun account operatore trovato con questo Callsign o Email.' };
  }

  if (found.passwordHash !== btoa(passwordPlain)) {
    return { success: false, error: 'Password crittografica errata.' };
  }

  found.lastLoginAt = new Date().toISOString();
  saveAccounts(accounts);
  setCurrentSession(found);

  return { success: true, account: found };
}

/**
 * Gets currently active session account.
 */
export function getCurrentSession(): UserAccount | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(SESSION_DB_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Sets or clears current session.
 */
export function setCurrentSession(account: UserAccount | null): void {
  try {
    if (typeof window === 'undefined') return;
    if (account) {
      localStorage.setItem(SESSION_DB_KEY, JSON.stringify(account));
    } else {
      localStorage.removeItem(SESSION_DB_KEY);
    }
  } catch (e) {
    console.error('Failed to set current session', e);
  }
}

/**
 * Updates the userState for the active account inside the database.
 */
export function persistActiveAccountState(state: UserState): void {
  try {
    const session = getCurrentSession();
    if (!session) return;

    const accounts = getRegisteredAccounts();
    const idx = accounts.findIndex(a => a.id === session.id);
    if (idx !== -1) {
      accounts[idx].userState = state;
      saveAccounts(accounts);
      session.userState = state;
      setCurrentSession(session);
    }
  } catch (e) {
    console.error('Failed to persist active account state to database', e);
  }
}
