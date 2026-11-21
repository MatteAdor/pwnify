// =====================================================================
// PWNIFY PRO ENTITLEMENT SYSTEM — UNIT TESTS
// File: tests/license_system.test.ts
// =====================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as sha256Module from '../src/utils/sha256';
import * as security from '../src/utils/security';
import { hashUserPassword, verifyUserPassword, mergeUserStates, createCleanAccountState } from '../src/utils/userDatabase';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Timing-safe string comparison mirror for testing.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  if (a.length !== b.length) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Computes HMAC-SHA256 hex digest using Node crypto for test assertions.
 */
function computeHmacHex(secret: string, payload: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

test('Timing-safe string comparison prevents timing analysis', () => {
  const secretA = '7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b';
  const secretB = '7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b';
  const secretC = '7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8c'; // 1 bit diff
  const shortSecret = '7a8b9c';

  assert.equal(timingSafeEqual(secretA, secretB), true, 'Identical strings match');
  assert.equal(timingSafeEqual(secretA, secretC), false, 'Different strings fail');
  assert.equal(timingSafeEqual(secretA, shortSecret), false, 'Different length fails safely');
});

test('HMAC-SHA256 Webhook signature calculation and verification', () => {
  const testSecret = 'whsec_test_secret_0xDAY_2026';
  const payload = JSON.stringify({
    meta: {
      event_name: 'order_created',
      custom_data: { user_id: '11111111-1111-1111-1111-111111111111' },
    },
    data: {
      id: '12345',
      attributes: {
        customer_email: 'test@zeroday.gg',
        order_id: 12345,
      },
    },
  });

  const validSignature = computeHmacHex(testSecret, payload);
  const tamperedPayload = payload + ' ';
  const invalidSignature = computeHmacHex('wrong_secret', payload);

  assert.equal(
    timingSafeEqual(validSignature, computeHmacHex(testSecret, payload)),
    true,
    'Valid HMAC signature verifies correctly'
  );
  assert.equal(
    timingSafeEqual(validSignature, computeHmacHex(testSecret, tamperedPayload)),
    false,
    'Tampered payload fails HMAC verification'
  );
  assert.equal(
    timingSafeEqual(validSignature, invalidSignature),
    false,
    'Incorrect secret fails HMAC verification'
  );
});

test('Client exposes no license-key, checksum or contributor bypass', () => {
  // Only the SHA-256 helper is left on the client: no key generation/verification at all
  assert.deepEqual(Object.keys(sha256Module), ['sha256Hex']);
  assert.equal(fs.existsSync(path.join(rootDir, 'src', 'utils', 'licenseEngine.ts')), false, 'licenseEngine.ts must be removed');
  assert.equal('verifyCheckoutToken' in security, false, 'security must not export verifyCheckoutToken');
  assert.equal('generateCheckoutSignature' in security, false, 'security must not export generateCheckoutSignature');
});

test('Account state: new and merged accounts never auto-grant Pro or fake license keys', () => {
  const fresh = createCleanAccountState('matteador', 'someone@example.com');
  assert.equal(fresh.isPro, false, 'Callsign/email must not grant Pro');
  assert.equal('licenseKey' in fresh, false, 'No license key field on account state');

  const merged = mergeUserStates(
    createCleanAccountState('darkmatteo', 'a@example.com'),
    createCleanAccountState('darkmatteo', 'a@example.com', false)
  );
  assert.equal(merged.isPro, false, 'Merging two free states stays free');
  assert.equal('licenseKey' in merged, false, 'No synthetic lifetime key is invented');
});

test('Source tree: no hardcoded contributor bypass, dev keys or personal mailboxes', () => {
  const files = [
    'src/utils/sha256.ts',
    'src/utils/billing.ts',
    'src/utils/security.ts',
    'src/utils/userDatabase.ts',
    'src/App.tsx',
    'src/components/Paywall/PaywallModal.tsx',
  ];
  for (const rel of files) {
    const content = fs.readFileSync(path.join(rootDir, rel), 'utf-8');
    for (const forbidden of ['CONTRIBUTOR-LIFETIME', '0XPRO-DEV', '0xPRO-LIFETIME', 'isContributor', 'generateLicenseKey', '0xDAY_SECRET', 'STRIPE_RETURN_SECURE_SALT']) {
      assert.equal(content.includes(forbidden), false, `${rel} must not contain "${forbidden}"`);
    }
    assert.equal(/@gmail\.com/i.test(content), false, `${rel} must not contain a gmail address`);
  }
});

test('Password Security: Salted SHA-256 and Transparent Legacy Base64 Migration', () => {
  const plain = 'SecretP@ssw0rd123!';
  const hashed = hashUserPassword(plain);

  assert.ok(hashed.startsWith('sha256$'), 'Password hash uses salted sha256 prefix');
  assert.equal(verifyUserPassword(plain, hashed), true, 'Correct password verifies against salted hash');
  assert.equal(verifyUserPassword('WrongPassword', hashed), false, 'Wrong password fails verification');

  // Verify backward compatibility with legacy base64 passwords
  const legacyBtoa = Buffer.from(plain).toString('base64');
  assert.equal(verifyUserPassword(plain, legacyBtoa), true, 'Legacy base64 password verifies for transparent migration');
  assert.equal(verifyUserPassword('WrongPassword', legacyBtoa), false, 'Wrong password fails on legacy hash');
});

test('Checkout Security: URL params cannot grant Pro client-side', () => {
  const app = fs.readFileSync(path.join(rootDir, 'src', 'App.tsx'), 'utf-8');
  const paywall = fs.readFileSync(path.join(rootDir, 'src', 'components', 'Paywall', 'PaywallModal.tsx'), 'utf-8');
  const billing = fs.readFileSync(path.join(rootDir, 'src', 'utils', 'billing.ts'), 'utf-8');
  assert.equal(app.includes('verifyCheckoutToken'), false, 'App must not trust checkout URL params');
  assert.equal(app.includes('validate_license'), false, 'No license activation path left');
  assert.equal(/isPro:\s*true/.test(app), false, 'App never sets isPro to true by itself');
  assert.ok(app.includes('refreshProFromServer'), 'Checkout return re-reads is_pro from the server');
  assert.ok(billing.includes("supabase.functions.invoke('create_checkout'"), 'Checkout session is created server-side');
  assert.equal(/license/i.test(paywall), false, 'Paywall has no license-key UI');
});

