import { UserState, EloRankTier } from '../types';
import { INITIAL_DAILY_BOUNTIES } from '../data/bountiesAndPbq';
import { calculateDynamicTelemetry } from './readinessEngine';
import { sanitizeCallsign } from './security';
import { isContributor } from './licenseEngine';

const ACCOUNTS_DB_KEY = 'zeroday_database_accounts_v1';
const SESSION_DB_KEY = 'zeroday_database_session_v1';
const GUEST_STATE_KEY = 'zeroday_guest_state_v1';
const LEGACY_STORAGE_PURGED_FLAG = 'zeroday_legacy_purged_v4';
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
    const isCompleted = (b.progress ?? 0) >= (b.target ?? 1) && (b.progress ?? 0) > 0;
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
  const elo = typeof state.elo === 'number' 
    ? (state.elo === 1000 && (state.xp || 0) === 0 && (!state.completedNodeIds || state.completedNodeIds.length === 0) ? 100 : Math.max(100, state.elo))
    : 100;

  const todayStr = new Date().toISOString().split('T')[0];
  const isNewDay = !state.lastTicketResetDate || state.lastTicketResetDate !== todayStr;

  const maxTickets = 5;
  let arenaTickets = typeof state.arenaTickets === 'number' ? Math.max(0, state.arenaTickets) : 5;
  if (isNewDay || (state.maxTickets && state.maxTickets <= 3)) {
    arenaTickets = 5;
  }

  return {
    ...state,
    elo,
    arenaTickets,
    maxTickets,
    lastTicketResetDate: todayStr,
    dailyBounties: sanitizeBounties(state.dailyBounties),
    streakDays: typeof state.streakDays === 'number' ? Math.max(0, state.streakDays) : 0,
    streakShieldsEarned: typeof state.streakShieldsEarned === 'number' ? Math.max(0, state.streakShieldsEarned) : 0,
    streakFreezeActive: Boolean(state.streakFreezeActive),
    streakMilestonesUnlocked: Array.isArray(state.streakMilestonesUnlocked) ? state.streakMilestonesUnlocked : [],
    earnedTitles: Array.isArray(state.earnedTitles) ? state.earnedTitles : [],
    leagueHistory: Array.isArray(state.leagueHistory) ? state.leagueHistory : [],
    passedCerts: Array.isArray(state.passedCerts) ? state.passedCerts : [],
    cpeMaintenanceActive: Boolean(state.cpeMaintenanceActive),
    leaderboardOptIn: state.leaderboardOptIn !== undefined ? Boolean(state.leaderboardOptIn) : true
  };
}

/**
 * Retrieves cached guest state if available.
 */
export function getCachedGuestState(): UserState | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(GUEST_STATE_KEY);
    if (!raw) return null;
    return sanitizeUserState(JSON.parse(raw));
  } catch {
    return null;
  }
}

/**
 * Persists guest progress to local storage so progress is never lost before login.
 */
export function saveCachedGuestState(state: UserState): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(GUEST_STATE_KEY, JSON.stringify(sanitizeUserState(state)));
  } catch (e) {
    console.error('Failed to save cached guest state', e);
  }
}

/**
 * Merges base account state with active session/guest progress, ensuring that
 * completed lessons, PBQs, XP, ELO, streak, paid PRO status, and license keys
 * are never lost when logging in or registering.
 */
export function mergeUserStates(base: UserState, incoming?: UserState | null): UserState {
  if (!incoming) return sanitizeUserState(base);

  const cleanEmail = base.userEmail || incoming.userEmail;
  const username = base.username || incoming.username;
  const autoPro = isContributor(cleanEmail) || isContributor(username);

  const isPro = Boolean(autoPro || base.isPro || incoming.isPro);
  const licenseKey = autoPro 
    ? (base.licenseKey || incoming.licenseKey || '0xPRO-CONTRIBUTOR-LIFETIME')
    : (base.licenseKey || incoming.licenseKey || (isPro ? '0xPRO-LIFETIME' : undefined));

  const mergedNodes = Array.from(new Set([
    ...(base.completedNodeIds || []),
    ...(incoming.completedNodeIds || [])
  ]));

  const mergedPbqs = Array.from(new Set([
    ...(base.completedPbqIds || []),
    ...(incoming.completedPbqIds || [])
  ]));

  const maxXp = Math.max(base.xp || 0, incoming.xp || 0);
  const maxElo = Math.max(base.elo ?? 100, incoming.elo ?? 100);
  const maxStreak = Math.max(base.streakDays || 0, incoming.streakDays || 0);
  const maxSurvival = Math.max(base.survivalHighScore || 0, incoming.survivalHighScore || 0);

  const dynamic = calculateDynamicTelemetry(mergedNodes, mergedPbqs, isPro);
  const readiness = Math.max(
    base.readinessScore || 0, 
    incoming.readinessScore || 0, 
    dynamic.readinessScore
  );

  return sanitizeUserState({
    ...base,
    userEmail: cleanEmail,
    isLoggedIn: true,
    isPro,
    licenseKey,
    streakShieldActive: isPro || base.streakShieldActive || incoming.streakShieldActive,
    completedNodeIds: mergedNodes,
    completedPbqIds: mergedPbqs,
    xp: maxXp,
    elo: maxElo,
    streakDays: maxStreak,
    survivalHighScore: maxSurvival,
    readinessScore: readiness,
    radarScores: dynamic.radarScores,
    goal: base.goal && base.goal !== 'Pass CompTIA Security+ / CCNA' ? base.goal : (incoming.goal || base.goal),
    profession: base.profession || incoming.profession,
    experienceLevel: base.experienceLevel && base.experienceLevel !== 'Beginner' ? base.experienceLevel : (incoming.experienceLevel || base.experienceLevel),
    dailyCommitment: Math.max(base.dailyCommitment || 15, incoming.dailyCommitment || 15),
    onboardingCompleted: Boolean(base.onboardingCompleted || incoming.onboardingCompleted),
    hasSeenTrial: Boolean(base.hasSeenTrial || incoming.hasSeenTrial),
    activeTheme: base.activeTheme || incoming.activeTheme,
    customTitle: base.customTitle || incoming.customTitle,
    dailyBreachStreak: Math.max(base.dailyBreachStreak || 0, incoming.dailyBreachStreak || 0),
    lastDailyBreachDate: base.lastDailyBreachDate || incoming.lastDailyBreachDate,
    lastActiveDate: base.lastActiveDate || incoming.lastActiveDate,
    streakShieldsEarned: Math.max(base.streakShieldsEarned || 0, incoming.streakShieldsEarned || 0),
    streakFreezeActive: Boolean(base.streakFreezeActive || incoming.streakFreezeActive),
    streakFreezeExpiresDate: base.streakFreezeExpiresDate || incoming.streakFreezeExpiresDate,
    streakMilestonesUnlocked: Array.from(new Set([...(base.streakMilestonesUnlocked || []), ...(incoming.streakMilestonesUnlocked || [])])),
    earnedTitles: Array.from(new Set([...(base.earnedTitles || []), ...(incoming.earnedTitles || [])])),
    leagueHistory: [...(base.leagueHistory || []), ...(incoming.leagueHistory || [])].filter((v, i, a) => a.findIndex(t => t.seasonId === v.seasonId) === i),
    passedCerts: [...(base.passedCerts || []), ...(incoming.passedCerts || [])].filter((v, i, a) => a.findIndex(t => t.certId === v.certId) === i),
    cpeMaintenanceActive: Boolean(base.cpeMaintenanceActive || incoming.cpeMaintenanceActive),
    leaderboardOptIn: base.leaderboardOptIn !== undefined ? base.leaderboardOptIn : (incoming.leaderboardOptIn ?? true),
    lastUsernameChangeTimestamp: base.lastUsernameChangeTimestamp || incoming.lastUsernameChangeTimestamp,
    language: base.language || incoming.language
  });
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
  const cleanEmail = email ? email.trim().toLowerCase() : undefined;
  const safeName = sanitizeCallsign(username, 'Operator');
  const autoPro = isContributor(cleanEmail) || isContributor(safeName);

  return sanitizeUserState({
    username: safeName,
    userEmail: cleanEmail,
    isLoggedIn,
    isPro: autoPro,
    licenseKey: autoPro ? '0xPRO-CONTRIBUTOR-LIFETIME' : undefined,
    streakDays: 0,
    streakShieldActive: false,
    elo: 100,
    arenaTickets: 5,
    maxTickets: 5,
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
    goal: 'Pass CompTIA Security+ / CCNA',
    experienceLevel: 'Beginner',
    dailyCommitment: 15,
    onboardingCompleted: false,
    hasSeenTrial: false,
    radarScores: dynamic.radarScores,
    streakShieldsEarned: 0,
    streakFreezeActive: false,
    streakMilestonesUnlocked: [],
    earnedTitles: [],
    leagueHistory: [],
    passedCerts: [],
    cpeMaintenanceActive: false,
    leaderboardOptIn: true
  });
}

/**
 * Creates default anonymous/unauthenticated state when no operator is logged in.
 * Has isLoggedIn = false so the Login/Signup page is shown.
 */
export function createDefaultGuestState(): UserState {
  return createCleanAccountState('0x_Anonymous', undefined, false);
}

/**
 * One-time purge of all old legacy localStorage keys and stored mock accounts
 * to prevent data leakage and hacker attacks.
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
      'zeroday_legacy_purged_v1',
      'zeroday_legacy_purged_v2',
      'zeroday_legacy_purged_v3',
      ACCOUNTS_DB_KEY,
      SESSION_DB_KEY
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
 * Saves all accounts to the database and syncs to physical disk file database/logins.json.
 */
export function saveAccounts(accounts: UserAccount[]): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ACCOUNTS_DB_KEY, JSON.stringify(accounts));
    // Asynchronously write to physical database/logins.json via local Vite API
    fetch('/api/database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(accounts, null, 2)
    }).catch(err => {
      console.debug('Physical database/logins.json sync notice:', err);
    });
  } catch (e) {
    console.error('Failed to save accounts database', e);
  }
}

/**
 * Synchronizes accounts between physical database/logins.json and browser localStorage.
 */
export async function syncDatabaseWithBackend(): Promise<UserAccount[]> {
  try {
    if (typeof window === 'undefined') return [];
    const res = await fetch('/api/database');
    if (res.ok) {
      const diskAccounts = await res.json();
      const localAccounts = getRegisteredAccounts();

      if (Array.isArray(diskAccounts) && diskAccounts.length > 0) {
        // Merge disk accounts with local accounts
        const map = new Map<string, UserAccount>();
        localAccounts.forEach(a => map.set(a.id, a));
        diskAccounts.forEach((a: UserAccount) => map.set(a.id, a));
        const merged = Array.from(map.values()).map(a => ({
          ...a,
          userState: sanitizeUserState(a.userState)
        }));
        localStorage.setItem(ACCOUNTS_DB_KEY, JSON.stringify(merged));
        return merged;
      } else if (Array.isArray(diskAccounts) && diskAccounts.length === 0) {
        // Disk accounts were purged to protect against hackers: sync purge to localStorage
        localStorage.setItem(ACCOUNTS_DB_KEY, JSON.stringify([]));
        return [];
      }
    }
  } catch (e) {
    console.debug('Database backend sync notice:', e);
  }
  return getRegisteredAccounts();
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
      return { valid: false, error: 'No pending 2FA code. Please request a new code.' };
    }
    const pending: Pending2FA = JSON.parse(raw);
    const cleanEmail = email.trim().toLowerCase();

    if (pending.email !== cleanEmail) {
      return { valid: false, error: 'Email does not match the 2FA request.' };
    }

    if (Date.now() > pending.expiresAt) {
      return { valid: false, error: 'The 2FA code has expired. Please request a new one.' };
    }

    if (pending.code !== inputCode.trim()) {
      return { valid: false, error: 'Incorrect 2FA code. Please try again.' };
    }

    // Code verified! Remove pending entry
    sessionStorage.removeItem(PENDING_2FA_STORAGE_KEY);
    return { valid: true };
  } catch {
    return { valid: false, error: '2FA code validation error.' };
  }
}

/**
 * Completes email registration after 2FA verification.
 * Creates password, initializes account and sets active session.
 */
export function completeEmailRegistration(
  email: string,
  username: string,
  passwordPlain: string,
  currentProgress?: UserState | null
): { success: boolean; account?: UserAccount; error?: string } {
  const safeName = sanitizeCallsign(username);
  if (!safeName || safeName.length < 3) {
    return { success: false, error: 'Callsign must contain at least 3 alphanumeric characters.' };
  }

  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
    return { success: false, error: 'Invalid email address.' };
  }

  if (!passwordPlain || passwordPlain.length < 6) {
    return { success: false, error: 'Password must contain at least 6 characters.' };
  }

  const accounts = getRegisteredAccounts();
  const duplicate = accounts.find(
    a => a.username.toLowerCase() === safeName.toLowerCase() || a.email.toLowerCase() === cleanEmail
  );

  if (duplicate) {
    return { success: false, error: 'An account with this Callsign or Email already exists in the database.' };
  }

  const cleanState = createCleanAccountState(safeName, cleanEmail, true);
  const guestFallback = currentProgress || getCachedGuestState();
  const finalState = guestFallback ? mergeUserStates(cleanState, guestFallback) : cleanState;

  const newAccount: UserAccount = {
    id: 'usr_mail_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    username: safeName,
    email: cleanEmail,
    passwordHash: btoa(passwordPlain),
    provider: 'email',
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    userState: finalState
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
  passwordPlain: string,
  currentProgress?: UserState | null
): { success: boolean; account?: UserAccount; error?: string } {
  const cleanId = identifier.trim().toLowerCase();
  const accounts = getRegisteredAccounts();

  const found = accounts.find(
    a => a.username.toLowerCase() === cleanId || a.email.toLowerCase() === cleanId
  );

  if (!found) {
    return { success: false, error: 'No account found with this Callsign or Email.' };
  }

  if (found.passwordHash && found.passwordHash !== btoa(passwordPlain)) {
    return { success: false, error: 'Incorrect password.' };
  }

  // Merge any active progress or guest payments with saved account data
  const guestFallback = currentProgress || getCachedGuestState();
  if (guestFallback) {
    found.userState = mergeUserStates(found.userState, guestFallback);
  }

  // Ensure contributors automatically have PRO
  if (isContributor(found.email) || isContributor(found.username)) {
    found.userState.isPro = true;
    found.userState.licenseKey = found.userState.licenseKey || '0xPRO-CONTRIBUTOR-LIFETIME';
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
 * If new account, creates fresh state or adopts active guest progress.
 * If existing account, logs in and restores user progress seamlessly!
 */
export function loginWithOAuth(
  provider: 'google' | 'github',
  profile: { name: string; email: string; customUsername?: string },
  currentProgress?: UserState | null
): { success: boolean; account: UserAccount } {
  const cleanEmail = profile.email.trim().toLowerCase();
  const rawChosenName = (profile.customUsername && profile.customUsername.trim()) || profile.name;
  const baseName = sanitizeCallsign(rawChosenName.replace(/\s+/g, '_'), provider === 'google' ? 'Google_User' : 'GitHub_User');
  const accounts = getRegisteredAccounts();

  let existing = accounts.find(a => 
    cleanEmail && a.email && a.email.toLowerCase() === cleanEmail
  );

  const guestFallback = currentProgress || getCachedGuestState();

  if (existing) {
    if (guestFallback) {
      existing.userState = mergeUserStates(existing.userState, guestFallback);
    }
    if (isContributor(existing.email) || isContributor(existing.username) || isContributor(cleanEmail)) {
      existing.userState.isPro = true;
      existing.userState.licenseKey = existing.userState.licenseKey || '0xPRO-CONTRIBUTOR-LIFETIME';
    }
    existing.lastLoginAt = new Date().toISOString();
    existing.userState = sanitizeUserState(existing.userState);
    saveAccounts(accounts);
    setCurrentSession(existing);
    return { success: true, account: existing };
  }

  // Create brand new OAuth account
  let uniqueName = baseName;
  let counter = 1;
  while (accounts.some(a => a.username.toLowerCase() === uniqueName.toLowerCase())) {
    uniqueName = `${baseName}_${counter}`;
    counter++;
  }

  const cleanState = createCleanAccountState(uniqueName, cleanEmail, true);
  const finalState = guestFallback ? mergeUserStates(cleanState, guestFallback) : cleanState;

  const newAccount: UserAccount = {
    id: `usr_${provider}_${Date.now()}`,
    username: uniqueName,
    email: cleanEmail,
    provider,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    userState: finalState
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
  email: string,
  currentProgress?: UserState | null
): { success: boolean; account?: UserAccount; error?: string } {
  const cleanEmail = email.trim().toLowerCase();
  const accounts = getRegisteredAccounts();
  const existing = accounts.find(a => a.email.toLowerCase() === cleanEmail);

  if (!existing) {
    return { success: false, error: `No account registered with email ${cleanEmail}. Please sign up first!` };
  }

  const guestFallback = currentProgress || getCachedGuestState();
  if (guestFallback) {
    existing.userState = mergeUserStates(existing.userState, guestFallback);
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
    const cleanState = sanitizeUserState(state);
    const session = getCurrentSession();
    if (session) {
      const accounts = getRegisteredAccounts();
      const idx = accounts.findIndex(a => a.id === session.id);
      if (idx !== -1) {
        accounts[idx].userState = cleanState;
        accounts[idx].lastLoginAt = new Date().toISOString();
        saveAccounts(accounts);
      }
      session.userState = cleanState;
      setCurrentSession(session);
    } else {
      saveCachedGuestState(cleanState);
    }
  } catch (e) {
    console.error('Failed to persist active account state to database', e);
  }
}

/**
 * Permanently deletes a user account and wipes all their associated data (Right to Erasure)
 */
export function deleteUserAccount(accountId: string): boolean {
  try {
    const accounts = getRegisteredAccounts();
    const remaining = accounts.filter(a => a.id !== accountId);
    saveAccounts(remaining);

    const session = getCurrentSession();
    if (session && session.id === accountId) {
      setCurrentSession(null);
    }
    return true;
  } catch (e) {
    console.error('Failed to delete user account', e);
    return false;
  }
}

/**
 * Purges all accounts from local storage and backend (Security reset)
 */
export function purgeAllUserAccounts(): void {
  try {
    saveAccounts([]);
    setCurrentSession(null);
  } catch (e) {
    console.error('Failed to purge accounts', e);
  }
}

/**
 * Verifies whether a given username/callsign is unique across all operators.
 * Checks both local accounts database and remote Supabase profiles.
 */
export async function isUsernameAvailable(
  candidateUsername: string,
  excludeEmail?: string
): Promise<{ available: boolean; error?: string }> {
  const clean = candidateUsername.trim();
  if (clean.length < 3) {
    return { available: false, error: 'Il nome utente deve avere almeno 3 caratteri.' };
  }
  if (clean.length > 20) {
    return { available: false, error: 'Il nome utente non può superare i 20 caratteri.' };
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(clean)) {
    return { available: false, error: 'Sono consentiti solo lettere, numeri, trattini e underscore.' };
  }

  const lower = clean.toLowerCase();

  // 1. Check local accounts database
  const accounts = getRegisteredAccounts();
  const localMatch = accounts.find(a => 
    a.username.toLowerCase() === lower &&
    (!excludeEmail || (a.email && a.email.toLowerCase() !== excludeEmail.toLowerCase()))
  );
  if (localMatch) {
    return { available: false, error: 'Questo nome utente è già in uso. Scegline un altro.' };
  }

  // 2. Check remote Supabase profiles via security definer RPC
  try {
    const { supabase, isSupabaseConfigured } = await import('../config/supabase');
    if (isSupabaseConfigured) {
      const { data, error } = await (supabase.rpc as any)('is_nick_available', {
        p_nick: clean
      });

      if (!error && typeof data === 'boolean') {
        if (!data) {
          return { available: false, error: 'Questo nome utente è già in uso sulla rete Pwnify.' };
        }
      } else if (error) {
        // Fail-open fallback: check public_profiles view if RPC not yet deployed
        const { data: viewData, error: viewError } = await supabase
          .from('public_profiles')
          .select('id, nick')
          .ilike('nick', clean);

        if (!viewError && viewData && viewData.length > 0) {
          return { available: false, error: 'Questo nome utente è già in uso sulla rete Pwnify.' };
        }
      }
    }
  } catch (err) {
    console.warn('[Validation] Remote username check error:', err);
  }

  return { available: true };
}

/**
 * Updates the operator username with a 7-day cooldown check.
 * 1 change allowed immediately; subsequent changes require 7 days.
 */
export function updateOperatorUsername(
  newUsername: string,
  currentState: UserState
): { success: boolean; error?: string; updatedState?: UserState } {
  const clean = sanitizeCallsign(newUsername, '').trim();
  if (clean.length < 3) {
    return { success: false, error: 'Il nome utente deve avere almeno 3 caratteri.' };
  }

  // Check 7 days cooldown (7 * 24 * 60 * 60 * 1000 ms)
  const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
  if (currentState.lastUsernameChangeTimestamp) {
    const elapsed = Date.now() - currentState.lastUsernameChangeTimestamp;
    if (elapsed < COOLDOWN_MS) {
      const remainingDays = Math.ceil((COOLDOWN_MS - elapsed) / (24 * 60 * 60 * 1000));
      return { 
        success: false, 
        error: `Puoi cambiare username solo una volta a settimana. Riprova tra ${remainingDays} giorni.` 
      };
    }
  }

  // Check uniqueness across other accounts
  const accounts = getRegisteredAccounts();
  const session = getCurrentSession();
  const duplicate = accounts.find(
    a => a.id !== session?.id && a.username.toLowerCase() === clean.toLowerCase()
  );
  if (duplicate) {
    return { success: false, error: 'Questo callsign è già in uso da un altro utente.' };
  }

  const updatedState: UserState = {
    ...currentState,
    username: clean,
    lastUsernameChangeTimestamp: Date.now()
  };

  if (session) {
    session.username = clean;
    session.userState = sanitizeUserState(updatedState);
    setCurrentSession(session);

    const idx = accounts.findIndex(a => a.id === session.id);
    if (idx !== -1) {
      accounts[idx].username = clean;
      accounts[idx].userState = sanitizeUserState(updatedState);
      saveAccounts(accounts);
    }
  }

  return { success: true, updatedState };
}

/**
 * GAMIFICATION & UNIFIED STREAK ENGINE
 * Strictly follows ethical retention principles:
 * - Free earnable shields every 5 consecutive days (never locked to paywall)
 * - Vacation / freeze pause mode to avoid anxiety
 * - Tangible milestone rewards (7, 30, 60, 100 days)
 * - Never shaming the user
 */
export interface StreakUpdateResult {
  updatedState: UserState;
  streakChanged: boolean;
  newStreak: number;
  shieldEarned: boolean;
  shieldConsumed: boolean;
  freezeProtected: boolean;
  milestoneUnlocked?: {
    days: number;
    title: string;
    xpBonus: number;
  };
}

export const STREAK_MILESTONES = [
  { days: 7, title: '7-Day Persistent Operative', xpBonus: 100 },
  { days: 30, title: 'Monthly Defcon Sentinel', xpBonus: 300 },
  { days: 60, title: 'Pwnify Red Team Veteran', xpBonus: 600 },
  { days: 100, title: 'Centurion Elite Vanguard', xpBonus: 1000 }
];

export function recordActivityAndUpdateStreak(state: UserState, customToday?: string): StreakUpdateResult {
  const todayStr = customToday || new Date().toISOString().split('T')[0];
  const lastActive = state.lastActiveDate;

  // If already trained today, no change to streak length
  if (lastActive === todayStr) {
    return {
      updatedState: state,
      streakChanged: false,
      newStreak: state.streakDays || 1,
      shieldEarned: false,
      shieldConsumed: false,
      freezeProtected: false
    };
  }

  // Calculate day difference
  let dayDiff = 1;
  if (lastActive) {
    const lastDate = new Date(lastActive + 'T00:00:00Z');
    const currDate = new Date(todayStr + 'T00:00:00Z');
    const diffMs = currDate.getTime() - lastDate.getTime();
    dayDiff = Math.round(diffMs / (1000 * 60 * 60 * 24));
  } else {
    dayDiff = 1;
  }

  let streakDays = state.streakDays || 0;
  let streakShieldsEarned = state.streakShieldsEarned || 0;
  let shieldEarned = false;
  let shieldConsumed = false;
  let freezeProtected = false;
  const streakFreezeActive = Boolean(state.streakFreezeActive);
  const streakFreezeExpiresDate = state.streakFreezeExpiresDate;

  if (dayDiff === 1 || !lastActive) {
    // Consecutive day
    streakDays += 1;
    // Every 5 consecutive training days earns 1 free streak shield
    if (streakDays > 0 && streakDays % 5 === 0) {
      streakShieldsEarned += 1;
      shieldEarned = true;
    }
  } else if (dayDiff > 1) {
    // Gap of 1 or more days
    const isFreezeValid = streakFreezeActive && (!streakFreezeExpiresDate || todayStr <= streakFreezeExpiresDate);
    if (isFreezeValid) {
      freezeProtected = true;
      streakDays += 1;
    } else if (streakShieldsEarned > 0) {
      // Consume 1 earned shield
      streakShieldsEarned -= 1;
      shieldConsumed = true;
      streakDays += 1;
    } else if (state.isPro && state.streakShieldActive) {
      // PRO shield protection
      shieldConsumed = true;
      streakDays += 1;
    } else {
      // Reset streak honestly to 1 (new streak starting today)
      streakDays = 1;
    }
  }

  // Milestone awards
  let milestoneUnlocked: StreakUpdateResult['milestoneUnlocked'] = undefined;
  const milestonesUnlocked = [...(state.streakMilestonesUnlocked || [])];
  const earnedTitles = [...(state.earnedTitles || [])];
  let bonusXp = 0;

  for (const m of STREAK_MILESTONES) {
    if (streakDays >= m.days && !milestonesUnlocked.includes(m.days)) {
      milestonesUnlocked.push(m.days);
      if (!earnedTitles.includes(m.title)) {
        earnedTitles.push(m.title);
      }
      bonusXp += m.xpBonus;
      milestoneUnlocked = m;
    }
  }

  const updatedState: UserState = {
    ...state,
    streakDays,
    lastActiveDate: todayStr,
    streakShieldsEarned,
    streakFreezeActive: freezeProtected ? streakFreezeActive : false,
    streakMilestonesUnlocked: milestonesUnlocked,
    earnedTitles,
    xp: (state.xp || 0) + bonusXp
  };

  return {
    updatedState: sanitizeUserState(updatedState),
    streakChanged: true,
    newStreak: streakDays,
    shieldEarned,
    shieldConsumed,
    freezeProtected,
    milestoneUnlocked
  };
}

export function toggleStreakFreeze(state: UserState, days: number = 7): UserState {
  const nextFreezeState = !state.streakFreezeActive;
  let expiresStr: string | undefined = undefined;
  if (nextFreezeState) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    expiresStr = d.toISOString().split('T')[0];
  }

  return sanitizeUserState({
    ...state,
    streakFreezeActive: nextFreezeState,
    streakFreezeExpiresDate: expiresStr
  });
}

export function recordCertPassed(state: UserState, certId: string, scorePercent: number): UserState {
  const passedList = [...(state.passedCerts || [])];
  const existingIdx = passedList.findIndex(c => c.certId === certId);
  const todayStr = new Date().toISOString().split('T')[0];

  if (existingIdx >= 0) {
    passedList[existingIdx] = { 
      certId, 
      passDate: todayStr, 
      scorePercent: Math.max(passedList[existingIdx].scorePercent, scorePercent) 
    };
  } else {
    passedList.push({ certId, passDate: todayStr, scorePercent });
  }

  const newTitles = Array.from(new Set([...(state.earnedTitles || []), `Certified: ${certId}`]));

  return sanitizeUserState({
    ...state,
    passedCerts: passedList,
    cpeMaintenanceActive: true,
    xp: (state.xp || 0) + 500,
    earnedTitles: newTitles
  });
}

export function recordSeasonArchive(
  state: UserState,
  seasonId: string,
  rankPosition: number,
  tier: EloRankTier,
  xp: number
): UserState {
  const history = [...(state.leagueHistory || [])];
  if (!history.some(h => h.seasonId === seasonId)) {
    history.push({
      seasonId,
      rankPosition,
      tier,
      xp,
      date: new Date().toISOString().split('T')[0]
    });
  }

  const earnedTitles = [...(state.earnedTitles || [])];
  if (rankPosition <= 3) {
    const title = `${seasonId} Top 3 Veteran`;
    if (!earnedTitles.includes(title)) {
      earnedTitles.push(title);
    }
  }

  return sanitizeUserState({
    ...state,
    leagueHistory: history,
    earnedTitles
  });
}



