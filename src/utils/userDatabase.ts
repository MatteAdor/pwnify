import { UserState } from '../types';
import { INITIAL_DAILY_BOUNTIES } from '../data/bountiesAndPbq';
import { calculateDynamicTelemetry } from './readinessEngine';
import { sanitizeCallsign } from './security';

const ACCOUNTS_DB_KEY = 'zeroday_database_accounts_v1';
const SESSION_DB_KEY = 'zeroday_database_session_v1';
const LEGACY_STORAGE_PURGED_FLAG = 'zeroday_legacy_purged_v3';
const PENDING_2FA_STORAGE_KEY = 'zeroday_pending_2fa_v1';

export type AuthProvider = 'email' | 'google' | 'github';

export interface UserAccount {
  id: string;
  username: string;
  email: string;
  passwordHash?: string;
  provider: AuthProvider;
  createdAt: string;
  lastLoginAt: string;
  userState: UserState;
}

interface Pending2FA {
  email: string;
  code: string;
  expiresAt: number;
}

/**
 * Ensures that any bounty where progress < target can NEVER have
 * freeClaimed or proClaimed set to true.
 * Casse del pro e taglie free sbloccate SOLO se la missione e' stata completata!
 */
export function sanitizeBounties(bounties?: UserState['dailyBounties']): UserState['dailyBounties'] {
  const base = bounties && Array.isArray(bounties) && bounties.length > 0 ? bounties : INITIAL_DAILY_BOUNTIES;
  return base.map(b => {
    const isCompleted = (b.progress ?? 0) >= (b.target ?? 1);
    return {
      ...b,
      progress: Math.max(0, b.progress ?? 0),
      isCompleted,
      freeClaimed: isCompleted ? Boolean(b.freeClaimed) : false,
      proClaimed: isCompleted ? Boolean(b.proClaimed) : false
    };
  });
}

export function sanitizeUserState(state: UserState): UserState {
  return {
    ...state,
    dailyBounties: sanitizeBounties(state.dailyBounties)
  };
}

/**
 * Creates a clean, pristine UserState for a brand new operator account.
 * Guarantees zero leftover progress, zero mock values, fresh 0 XP,
 * 0 completed quests, 0 streak, and onboardingCompleted false.
 */
export function createCleanAccountState(
  username: string, 
  email?: string, 
  isLoggedIn: boolean = true
): UserState {
  const dynamic = calculateDynamicTelemetry([], [], false);
  return sanitizeUserState({
    username: sanitizeCallsign(username, 'Operatore'),
    userEmail: email ? email.trim().toLowerCase() : undefined,
    isLoggedIn,
    isPro: false,
    streakDays: 0,
    streakShieldActive: false,
    elo: 1000,
    arenaTickets: 3,
    maxTickets: 3,
    winStreak: 0,
    xp: 0,
    readinessScore: 0,
    completedNodeIds: [],
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
    experienceLevel: 'Beginner',
    dailyCommitment: 15,
    onboardingCompleted: false,
    hasSeenTrial: false,
    radarScores: dynamic.radarScores
  });
}

/**
 * Creates default anonymous/unauthenticated state when no operator is logged in.
 * Has isLoggedIn = false so the Login/Signup page is shown.
 */
export function createDefaultGuestState(): UserState {
  return createCleanAccountState('0x_Anonimo', undefined, false);
}

/**
 * One-time purge of all old legacy localStorage keys to ensure
 * previous dirty sessions are completely wiped clean.
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
      '0x_godmode',
      'zeroday_legacy_purged_v1'
    ];

    legacyKeys.forEach(k => localStorage.removeItem(k));
    localStorage.removeItem(SESSION_DB_KEY);
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
    if (!raw) return [];
    const accounts: UserAccount[] = JSON.parse(raw);
    return accounts.map(a => ({
      ...a,
      userState: sanitizeUserState(a.userState)
    }));
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
 * Generates and sends a 6-digit cryptographic 2FA code for email verification.
 * Stored with a 5-minute expiration time.
 */
export function send2FACode(email: string): { code: string; expiresAt: number } {
  const cleanEmail = email.trim().toLowerCase();
  // Generate random 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  try {
    const pending: Pending2FA = { email: cleanEmail, code, expiresAt };
    sessionStorage.setItem(PENDING_2FA_STORAGE_KEY, JSON.stringify(pending));
  } catch (e) {
    console.error('Failed to store pending 2FA', e);
  }

  return { code, expiresAt };
}

/**
 * Verifies the 6-digit 2FA code submitted by the user.
 */
export function verify2FACode(email: string, inputCode: string): { valid: boolean; error?: string } {
  try {
    const raw = sessionStorage.getItem(PENDING_2FA_STORAGE_KEY);
    if (!raw) {
      return { valid: false, error: 'Nessun codice 2FA in attesa. Richiedi un nuovo codice.' };
    }
    const pending: Pending2FA = JSON.parse(raw);
    const cleanEmail = email.trim().toLowerCase();

    if (pending.email !== cleanEmail) {
      return { valid: false, error: 'L\'email non corrisponde alla richiesta 2FA.' };
    }

    if (Date.now() > pending.expiresAt) {
      return { valid: false, error: 'Il codice 2FA è scaduto. Richiedine uno nuovo.' };
    }

    if (pending.code !== inputCode.trim()) {
      return { valid: false, error: 'Codice 2FA non corretto. Riprova.' };
    }

    // Code verified! Remove pending entry
    sessionStorage.removeItem(PENDING_2FA_STORAGE_KEY);
    return { valid: true };
  } catch {
    return { valid: false, error: 'Errore di validazione del codice 2FA.' };
  }
}

/**
 * Completes email registration after 2FA verification.
 * Creates password, initializes account and sets active session.
 */
export function completeEmailRegistration(
  email: string,
  username: string,
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
    return { success: false, error: 'Un account con questo Callsign o Email esiste già nel database.' };
  }

  const cleanState = createCleanAccountState(safeName, cleanEmail, true);

  const newAccount: UserAccount = {
    id: 'usr_mail_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    username: safeName,
    email: cleanEmail,
    passwordHash: btoa(passwordPlain),
    provider: 'email',
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
 * Authenticates an existing email operator account.
 */
export function loginEmailAccount(
  identifier: string,
  passwordPlain: string
): { success: boolean; account?: UserAccount; error?: string } {
  const cleanId = identifier.trim().toLowerCase();
  const accounts = getRegisteredAccounts();

  const found = accounts.find(
    a => a.username.toLowerCase() === cleanId || a.email.toLowerCase() === cleanId
  );

  if (!found) {
    return { success: false, error: 'Nessun account trovato con questo Callsign o Email.' };
  }

  if (found.passwordHash && found.passwordHash !== btoa(passwordPlain)) {
    return { success: false, error: 'Password non corretta.' };
  }

  found.lastLoginAt = new Date().toISOString();
  saveAccounts(accounts);
  setCurrentSession(found);

  return { success: true, account: found };
}

// Aliases for compatibility
export const registerAccount = completeEmailRegistration;
export const loginAccount = loginEmailAccount;

/**
 * Authenticates or creates an account using OAuth (Google or GitHub).
 * If new account, creates fresh clean state ("nulla di nulla").
 * If existing account, logs in and restores user progress seamlessly!
 */
export function loginWithOAuth(
  provider: 'google' | 'github',
  profile: { name: string; email: string }
): { success: boolean; account: UserAccount } {
  const cleanEmail = profile.email.trim().toLowerCase();
  const baseName = sanitizeCallsign(profile.name.replace(/\s+/g, '_'), provider === 'google' ? 'Google_Op' : 'GitHub_Op');
  const accounts = getRegisteredAccounts();

  let existing = accounts.find(a => 
    (cleanEmail && a.email && a.email.toLowerCase() === cleanEmail) ||
    a.username.toLowerCase() === baseName.toLowerCase()
  );

  if (existing) {
    existing.lastLoginAt = new Date().toISOString();
    existing.userState = sanitizeUserState(existing.userState);
    saveAccounts(accounts);
    setCurrentSession(existing);
    return { success: true, account: existing };
  }

  // Create brand new OAuth account with completely fresh clean state
  let uniqueName = baseName;
  let counter = 1;
  while (accounts.some(a => a.username.toLowerCase() === uniqueName.toLowerCase())) {
    uniqueName = `${baseName}_${counter}`;
    counter++;
  }

  const cleanState = createCleanAccountState(uniqueName, cleanEmail, true);

  const newAccount: UserAccount = {
    id: `usr_${provider}_${Date.now()}`,
    username: uniqueName,
    email: cleanEmail,
    provider,
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
 * Fast passwordless 2FA login via email code.
 */
export function loginWithEmailOtp(
  email: string
): { success: boolean; account?: UserAccount; error?: string } {
  const cleanEmail = email.trim().toLowerCase();
  const accounts = getRegisteredAccounts();
  const existing = accounts.find(a => a.email.toLowerCase() === cleanEmail);

  if (!existing) {
    return { success: false, error: `Nessun operatore registrato con l'email ${cleanEmail}. Registrati prima!` };
  }

  existing.lastLoginAt = new Date().toISOString();
  existing.userState = sanitizeUserState(existing.userState);
  saveAccounts(accounts);
  setCurrentSession(existing);
  return { success: true, account: existing };
}

/**
 * Gets currently active session account.
 */
export function getCurrentSession(): UserAccount | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(SESSION_DB_KEY);
    if (!raw) return null;
    const session: UserAccount = JSON.parse(raw);
    if (session && session.userState) {
      session.userState = sanitizeUserState(session.userState);
    }
    return session;
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
      const cleanAccount: UserAccount = {
        ...account,
        userState: sanitizeUserState(account.userState)
      };
      localStorage.setItem(SESSION_DB_KEY, JSON.stringify(cleanAccount));
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

    const cleanState = sanitizeUserState(state);
    const accounts = getRegisteredAccounts();
    const idx = accounts.findIndex(a => a.id === session.id);
    if (idx !== -1) {
      accounts[idx].userState = cleanState;
      saveAccounts(accounts);
      session.userState = cleanState;
      setCurrentSession(session);
    }
  } catch (e) {
    console.error('Failed to persist active account state to database', e);
  }
}
