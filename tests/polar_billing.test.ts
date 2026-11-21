import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import {
  verifyStandardWebhook,
  computeSignature,
  timingSafeEqual,
  DEFAULT_TOLERANCE_SECONDS,
} from '../supabase/functions/_shared/polarWebhookSignature.ts';

const SECRET = 'polar_whs_test_secret_value';
const NOW = 1_800_000_000;
const BODY = JSON.stringify({ type: 'subscription.active', data: { id: 'sub_1' } });

/** Independent reference: Polar SDK semantics (HMAC key = UTF-8 bytes of the secret). */
function referenceSig(secret: string, id: string, ts: string, body: string): string {
  return createHmac('sha256', Buffer.from(secret, 'utf-8')).update(`${id}.${ts}.${body}`).digest('base64');
}

function headersFor(id: string, ts: number, sig: string) {
  return { id, timestamp: String(ts), signature: `v1,${sig}` };
}

describe('Polar webhook signature (Standard Webhooks)', () => {
  test('computeSignature matches an independent node:crypto HMAC', async () => {
    const ours = await computeSignature(SECRET, 'msg_1', String(NOW), BODY);
    assert.equal(ours, referenceSig(SECRET, 'msg_1', String(NOW), BODY));
  });

  test('whsec_ secrets are base64-decoded per the spec', async () => {
    const raw = Buffer.from('raw-key-bytes');
    const whsec = `whsec_${raw.toString('base64')}`;
    const expected = createHmac('sha256', raw).update(`msg_2.${NOW}.${BODY}`).digest('base64');
    assert.equal(await computeSignature(whsec, 'msg_2', String(NOW), BODY), expected);
  });

  test('accepts a valid signature, also among several space-separated entries', async () => {
    const sig = referenceSig(SECRET, 'msg_3', String(NOW), BODY);
    assert.deepEqual(await verifyStandardWebhook(BODY, headersFor('msg_3', NOW, sig), SECRET, NOW), { ok: true });
    const multi = { id: 'msg_3', timestamp: String(NOW), signature: `v1,AAAA v1,${sig}` };
    assert.deepEqual(await verifyStandardWebhook(BODY, multi, SECRET, NOW), { ok: true });
  });

  test('rejects a tampered body, wrong secret or wrong id', async () => {
    const sig = referenceSig(SECRET, 'msg_4', String(NOW), BODY);
    const h = headersFor('msg_4', NOW, sig);
    assert.equal((await verifyStandardWebhook(BODY + ' ', h, SECRET, NOW)).ok, false);
    assert.equal((await verifyStandardWebhook(BODY, h, 'other_secret', NOW)).ok, false);
    assert.equal((await verifyStandardWebhook(BODY, { ...h, id: 'msg_x' }, SECRET, NOW)).ok, false);
  });

  test('enforces the timestamp tolerance (replay protection)', async () => {
    const old = NOW - DEFAULT_TOLERANCE_SECONDS - 1;
    const sig = referenceSig(SECRET, 'msg_5', String(old), BODY);
    assert.deepEqual(
      await verifyStandardWebhook(BODY, headersFor('msg_5', old, sig), SECRET, NOW),
      { ok: false, reason: 'timestamp_out_of_tolerance' },
    );
    const future = NOW + DEFAULT_TOLERANCE_SECONDS + 1;
    const sigF = referenceSig(SECRET, 'msg_5', String(future), BODY);
    assert.equal((await verifyStandardWebhook(BODY, headersFor('msg_5', future, sigF), SECRET, NOW)).ok, false);
    const edge = NOW - DEFAULT_TOLERANCE_SECONDS;
    const sigE = referenceSig(SECRET, 'msg_5', String(edge), BODY);
    assert.equal((await verifyStandardWebhook(BODY, headersFor('msg_5', edge, sigE), SECRET, NOW)).ok, true);
  });

  test('rejects missing headers, bad timestamps, unversioned signatures and a missing secret', async () => {
    const sig = referenceSig(SECRET, 'msg_6', String(NOW), BODY);
    assert.deepEqual(await verifyStandardWebhook(BODY, { id: '', timestamp: String(NOW), signature: `v1,${sig}` }, SECRET, NOW), { ok: false, reason: 'missing_headers' });
    assert.deepEqual(await verifyStandardWebhook(BODY, { id: 'msg_6', timestamp: '12abc', signature: `v1,${sig}` }, SECRET, NOW), { ok: false, reason: 'bad_timestamp' });
    assert.deepEqual(await verifyStandardWebhook(BODY, { id: 'msg_6', timestamp: String(NOW), signature: sig }, SECRET, NOW), { ok: false, reason: 'bad_signature' });
    assert.deepEqual(await verifyStandardWebhook(BODY, headersFor('msg_6', NOW, sig), '', NOW), { ok: false, reason: 'missing_secret' });
  });

  test('timingSafeEqual compares exactly', () => {
    assert.equal(timingSafeEqual('abc', 'abc'), true);
    assert.equal(timingSafeEqual('abc', 'abd'), false);
    assert.equal(timingSafeEqual('abc', 'abcd'), false);
  });
});
