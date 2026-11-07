import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { ENABLE_LOCAL_ACCOUNTS } from '../src/config/auth';
import { 
  createCleanAccountState, 
  hashUserPassword, 
  createDefaultGuestState 
} from '../src/utils/userDatabase';
import {
  checkStoredLocalAccount,
  LOCAL_ACCOUNT_NOTICE_SEEN_KEY,
  LOCAL_ACCOUNT_DISABLED_NOTICE_IT,
  LOCAL_ACCOUNT_DISABLED_NOTICE_EN
} from '../src/components/Auth/AuthPage';

// In-memory localStorage mock for node environment
const createMockLocalStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => store.set(key, String(val)),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    get length() { return store.size; }
  };
};

describe('Local Account Feature Flag & Integrity', () => {
  beforeEach(() => {
    // @ts-expect-error Mocking global localStorage
    globalThis.localStorage = createMockLocalStorage();
    // @ts-expect-error Mocking global window
    globalThis.window = {} as unknown as Window & typeof globalThis;
  });

  it('ENABLE_LOCAL_ACCOUNTS defaults to false in standard environment', () => {
    assert.strictEqual(ENABLE_LOCAL_ACCOUNTS, false);
  });

  it('preserves underlying password hashing and account structures without degradation', () => {
    const rawPass = 'TacticalPwn2026!';
    const hash1 = hashUserPassword(rawPass);
    const hash2 = hashUserPassword(rawPass);
    
    // Salted hashes should be non-empty and well-formed
    assert.ok(hash1.startsWith('sha256$'), 'Salted SHA-256 hash must use sha256$ prefix');
    assert.ok(hash1.length > 32);
    
    // Creating clean account state must remain intact
    const clean = createCleanAccountState('0xTestOperator', 'test@pwnify.xyz', true);
    assert.strictEqual(clean.username, '0xTestOperator');
    assert.strictEqual(clean.userEmail, 'test@pwnify.xyz');
    assert.strictEqual(clean.isLoggedIn, true);
    assert.strictEqual(clean.streakDays, 0);
    assert.strictEqual(clean.radarScores['Web Sec'], 0);
  });

  it('preserves guest state creation for anonymous sandbox mode', () => {
    const guest = createDefaultGuestState();
    assert.strictEqual(guest.isLoggedIn, false);
    assert.strictEqual(guest.username, '0x_Anonymous');
    assert.strictEqual(guest.onboardingCompleted, false);
  });

  it('detects existing local email accounts in localStorage without deleting data', () => {
    // Empty storage: no local accounts
    assert.strictEqual(checkStoredLocalAccount(), false);

    const localAccount = {
      id: 'local-uuid-1',
      username: 'operator_alpha',
      email: 'alpha@local.test',
      passwordHash: 'sha256$mockhash',
      provider: 'email',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      userState: createCleanAccountState('operator_alpha', 'alpha@local.test', true)
    };

    localStorage.setItem('zeroday_database_accounts_v1', JSON.stringify([localAccount]));

    // Check returns true
    assert.strictEqual(checkStoredLocalAccount(), true);

    // Verify localStorage data was not deleted or modified
    const stored = localStorage.getItem('zeroday_database_accounts_v1');
    assert.ok(stored !== null);
    const parsed = JSON.parse(stored!);
    assert.strictEqual(parsed.length, 1);
    assert.strictEqual(parsed[0].username, 'operator_alpha');
  });

  it('verifies notice string and single-display flag persistence', () => {
    // Exact requested Italian notice
    const expectedItalianNotice = 'Gli accessi con email non sono più disponibili: usa Google o GitHub, oppure continua come ospite';
    assert.strictEqual(LOCAL_ACCOUNT_DISABLED_NOTICE_IT, expectedItalianNotice);
    assert.ok(LOCAL_ACCOUNT_DISABLED_NOTICE_EN.length > 0);

    // Notice seen flag key
    assert.strictEqual(LOCAL_ACCOUNT_NOTICE_SEEN_KEY, 'pwnify_local_account_notice_seen');

    // Simulate first display marking as seen
    localStorage.setItem(LOCAL_ACCOUNT_NOTICE_SEEN_KEY, 'true');
    assert.strictEqual(localStorage.getItem(LOCAL_ACCOUNT_NOTICE_SEEN_KEY), 'true');
  });
});
