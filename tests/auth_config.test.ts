import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ENABLE_LOCAL_ACCOUNTS } from '../src/config/auth';
import { 
  createCleanAccountState, 
  hashUserPassword, 
  createDefaultGuestState 
} from '../src/utils/userDatabase';

describe('Local Account Feature Flag & Integrity', () => {
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
});
