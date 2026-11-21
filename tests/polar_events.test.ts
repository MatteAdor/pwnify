import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  classifyPolarEvent,
  decideLedgerOutcome,
  polarApiBase,
  parseIdList,
  STALE_PROCESSING_MS,
} from '../supabase/functions/_shared/polarBilling.ts';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => fs.readFileSync(path.join(rootDir, rel), 'utf-8');

const PRODUCT = 'prod_pwnify_pro';
const ORG = 'org_pwnify';
const USER = '38b1460a-5104-4067-a91d-77b872934d51';
const NOW = Date.parse('2026-11-22T12:00:00Z');
const FUTURE = '2026-12-22T12:00:00Z';
const PAST = '2026-11-01T12:00:00Z';
const cfg = { productIds: [PRODUCT], organizationId: ORG };

function sub(type: string, data: Record<string, unknown> = {}) {
  return {
    type,
    data: {
      id: 'sub_1',
      status: 'active',
      cancel_at_period_end: false,
      current_period_end: FUTURE,
      ended_at: null,
      product_id: PRODUCT,
      product: { id: PRODUCT, organization_id: ORG },
      customer_id: 'cus_1',
      customer: { id: 'cus_1', external_id: USER, organization_id: ORG, email: 'buyer@example.com' },
      ...data,
    },
  };
}

describe('Polar event mapping', () => {
  test('active and trialing subscriptions grant PRO until the period end', () => {
    for (const type of ['subscription.active', 'subscription.updated']) {
      const d = classifyPolarEvent(sub(type), cfg, NOW);
      assert.equal(d.action, 'activate');
      assert.equal(d.userId, USER);
      assert.equal(d.expiresAt, FUTURE);
      assert.equal(d.subscriptionId, 'sub_1');
    }
    assert.equal(classifyPolarEvent(sub('subscription.updated', { status: 'trialing' }), cfg, NOW).action, 'activate');
  });

  test('cancel_at_period_end keeps PRO until the period ends, then revokes', () => {
    const pending = classifyPolarEvent(sub('subscription.canceled', { cancel_at_period_end: true }), cfg, NOW);
    assert.equal(pending.action, 'activate');
    assert.equal(pending.expiresAt, FUTURE);
    const ended = classifyPolarEvent(sub('subscription.updated', { cancel_at_period_end: true, current_period_end: PAST }), cfg, NOW);
    assert.equal(ended.action, 'revoke');
  });

  test('revoked or expired subscriptions revoke PRO', () => {
    assert.equal(classifyPolarEvent(sub('subscription.revoked'), cfg, NOW).action, 'revoke');
    assert.equal(classifyPolarEvent(sub('subscription.updated', { status: 'canceled', ended_at: PAST }), cfg, NOW).action, 'revoke');
    assert.equal(classifyPolarEvent(sub('subscription.updated', { status: 'unpaid', ended_at: null, current_period_end: PAST }), cfg, NOW).action, 'revoke');
    // canceled but still inside the paid period: keep access
    assert.equal(classifyPolarEvent(sub('subscription.canceled', { status: 'canceled', ended_at: null }), cfg, NOW).action, 'activate');
  });

  test('past_due leaves the entitlement unchanged (Polar sends revoked if needed)', () => {
    assert.equal(classifyPolarEvent(sub('subscription.updated', { status: 'past_due' }), cfg, NOW).action, 'ignore');
  });

  test('order.paid grants only when paid', () => {
    const order = (status: string) => ({
      type: 'order.paid',
      data: { id: 'ord_1', status, product_id: PRODUCT, subscription_id: 'sub_1', customer: { external_id: USER } },
    });
    const d = classifyPolarEvent(order('paid'), cfg, NOW);
    assert.equal(d.action, 'activate');
    assert.equal(d.orderId, 'ord_1');
    assert.equal(classifyPolarEvent(order('pending'), cfg, NOW).action, 'ignore');
  });

  test('ignores foreign products, foreign organizations and unconfigured products', () => {
    assert.equal(classifyPolarEvent(sub('subscription.active', { product_id: 'prod_other', product: { id: 'prod_other' } }), cfg, NOW).reason, 'foreign_product');
    assert.equal(classifyPolarEvent(sub('subscription.active', { product: { id: PRODUCT, organization_id: 'org_other' } }), cfg, NOW).reason, 'foreign_organization');
    assert.equal(classifyPolarEvent(sub('subscription.active'), { productIds: [] }, NOW).reason, 'product_not_configured');
  });

  test('maps the user ONLY from customer.external_id (never email, nick or metadata)', () => {
    const noExternal = sub('subscription.active', {
      customer: { id: 'cus_1', external_id: null, email: 'victim@example.com' },
      metadata: { supabase_user_id: USER },
    });
    assert.equal(classifyPolarEvent(noExternal, cfg, NOW).reason, 'no_external_customer_id');
    const notUuid = sub('subscription.active', { customer: { external_id: 'admin' } });
    assert.equal(classifyPolarEvent(notUuid, cfg, NOW).action, 'ignore');
  });

  test('unhandled event types are ignored', () => {
    assert.equal(classifyPolarEvent({ type: 'checkout.created', data: {} }, cfg, NOW).reason, 'unhandled_event');
    assert.equal(classifyPolarEvent(null, cfg, NOW).action, 'ignore');
  });
});

describe('Polar webhook idempotency ledger', () => {
  const nowMs = Date.parse('2026-11-22T12:00:00Z');
  test('first delivery is processed', () => {
    assert.equal(decideLedgerOutcome(null, null, nowMs), 'process');
  });
  test('redelivery of a processed event is acknowledged without acting', () => {
    assert.equal(decideLedgerOutcome('23505', { status: 'processed', received_at: '2026-11-22T11:00:00Z' }, nowMs), 'duplicate');
  });
  test('a concurrent in-flight delivery asks Polar to retry later', () => {
    const recent = new Date(nowMs - 10_000).toISOString();
    assert.equal(decideLedgerOutcome('23505', { status: 'processing', received_at: recent }, nowMs), 'in_progress');
  });
  test('a stale processing row (crashed attempt) is taken over', () => {
    const stale = new Date(nowMs - STALE_PROCESSING_MS - 1).toISOString();
    assert.equal(decideLedgerOutcome('23505', { status: 'processing', received_at: stale }, nowMs), 'process');
  });
  test('missing ledger table fails open; other DB errors fail', () => {
    assert.equal(decideLedgerOutcome('42P01', null, nowMs), 'process_without_ledger');
    assert.equal(decideLedgerOutcome('08006', null, nowMs), 'error');
  });
});

describe('Polar config & wiring (static)', () => {
  test('polarApiBase defaults to sandbox and only switches on explicit production', () => {
    assert.equal(polarApiBase('production'), 'https://api.polar.sh');
    assert.equal(polarApiBase('sandbox'), 'https://sandbox-api.polar.sh');
    assert.equal(polarApiBase(undefined), 'https://sandbox-api.polar.sh');
    assert.deepEqual(parseIdList(' a, b ,,c'), ['a', 'b', 'c']);
  });

  test('create_checkout takes the user id from the JWT, never from the body', () => {
    const src = read('supabase/functions/create_checkout/index.ts');
    assert.ok(src.includes('auth.getUser()'));
    assert.ok(src.includes('external_customer_id: user.id'));
    assert.equal(/req\.json\(/.test(src), false, 'request body must not be read');
  });

  test('polar_webhook verifies the raw body, dedupes and writes PRO only via the RPC', () => {
    const src = read('supabase/functions/polar_webhook/index.ts');
    assert.ok(src.indexOf('await req.text()') < src.indexOf('JSON.parse(rawBody)'), 'verify before parsing');
    assert.ok(src.includes('verifyStandardWebhook('));
    assert.ok(src.includes('decideLedgerOutcome('));
    assert.ok(src.includes('rpc("set_profile_pro_status"'));
    assert.equal(/\.from\("profiles"\)\s*\.update/.test(src), false, 'no direct profiles update');
    assert.equal(/console\.(log|warn|error)\([^)]*(email|external_id|userId)/i.test(src), false, 'no personal data in logs');
  });

  test('Lemon Squeezy license functions are gone', () => {
    for (const rel of ['supabase/functions/validate_license', 'supabase/functions/lemonsqueezy_webhook', 'supabase/functions/_shared/lemonLicense.ts']) {
      assert.equal(fs.existsSync(path.join(rootDir, rel)), false, `${rel} must be removed`);
    }
  });
});
