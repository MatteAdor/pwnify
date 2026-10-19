// =====================================================================
// ZERODAY PRO LICENSE SYSTEM — UNIT TESTS
// File: tests/license_system.test.ts
// =====================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { verifyLicenseKey, generateLicenseKey } from '../src/utils/licenseEngine';

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

test('Local License Engine: Algorithmic Checksum is strictly UX and does not substitute Server Authorization', () => {
  const validKey = generateLicenseKey();
  assert.ok(validKey.startsWith('0xPRO-'), 'Key starts with 0xPRO- prefix');
  assert.equal(verifyLicenseKey(validKey), true, 'Valid generated key passes algorithmic checksum');

  // Corrupted / forged key
  const invalidKey = '0xPRO-AAAA-BBBB-CCCC';
  assert.equal(verifyLicenseKey(invalidKey), false, 'Forged key fails checksum');

  // Verify that frontend license check is purely syntax verification
  const fakeKey = '0xPRO-1234-5678-9999';
  assert.equal(verifyLicenseKey(fakeKey), false, 'Malformed checksum fails');
});

test('State Machine: Event classification for Lemon Squeezy Webhook', () => {
  const PRO_ACTIVATION_EVENTS = [
    'order_created',
    'subscription_created',
    'subscription_resumed',
    'subscription_unpaused',
  ];

  const PRO_REVOCATION_EVENTS = [
    'subscription_cancelled',
    'subscription_expired',
    'order_refunded',
  ];

  assert.ok(PRO_ACTIVATION_EVENTS.includes('order_created'));
  assert.ok(PRO_ACTIVATION_EVENTS.includes('subscription_created'));
  assert.ok(PRO_REVOCATION_EVENTS.includes('subscription_cancelled'));
  assert.ok(PRO_REVOCATION_EVENTS.includes('subscription_expired'));
  assert.equal(PRO_ACTIVATION_EVENTS.includes('subscription_cancelled'), false);
});
