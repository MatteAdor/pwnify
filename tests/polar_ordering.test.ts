import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  resolvePolarEntitlement,
  createSubscriptionFetcher,
  decideLedgerOutcome,
  isOlderThanLastApplied,
  subscriptionIdOf,
  type FetchSubscriptionResult,
} from '../supabase/functions/_shared/polarBilling.ts';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => fs.readFileSync(path.join(rootDir, rel), 'utf-8');

const PRODUCT = 'prod_pwnify_pro';
const USER = '38b1460a-5104-4067-a91d-77b872934d51';
const NOW = Date.parse('2026-11-22T12:00:00Z');
const config = { productIds: [PRODUCT], organizationId: 'org_pwnify' };

function subData(over: Record<string, unknown> = {}) {
  return {
    id: 'sub_1',
    status: 'active',
    cancel_at_period_end: false,
    current_period_end: '2026-12-22T12:00:00Z',
    ended_at: null,
    modified_at: '2026-11-20T10:00:00Z',
    product_id: PRODUCT,
    product: { id: PRODUCT, organization_id: 'org_pwnify' },
    customer_id: 'cus_1',
    customer: { id: 'cus_1', external_id: USER, organization_id: 'org_pwnify' },
    ...over,
  };
}

const REVOKED_LIVE = subData({
  status: 'canceled',
  ended_at: '2026-11-21T09:00:00Z',
  modified_at: '2026-11-21T09:00:00Z',
});

/** Fake fetcher that returns a fixed live state and counts calls. */
function liveFetcher(result: FetchSubscriptionResult) {
  const calls: string[] = [];
  const fn = async (id: string) => {
    calls.push(id);
    return result;
  };
  return { fn, calls };
}

describe('Out-of-order events: decide on the live subscription state', () => {
  test('a delayed subscription.active arriving after revoked does NOT re-grant PRO', async () => {
    // The payload (stale) says active, but Polar now reports the subscription ended.
    const delayedActive = { type: 'subscription.active', data: subData() };
    const { fn, calls } = liveFetcher({ ok: true, data: REVOKED_LIVE });

    const res = await resolvePolarEntitlement({ event: delayedActive, config, fetchSubscription: fn, nowMs: NOW });

    assert.deepEqual(calls, ['sub_1'], 'the subscription is re-read from Polar');
    assert.equal(res.kind, 'apply');
    assert.equal(res.kind === 'apply' && res.decision.action, 'revoke');
    assert.equal(res.kind === 'apply' && res.modifiedAt, '2026-11-21T09:00:00Z');
  });

  test('a delayed order.paid for a revoked subscription does NOT re-grant PRO', async () => {
    const lateOrder = {
      type: 'order.paid',
      data: { id: 'ord_1', status: 'paid', product_id: PRODUCT, subscription_id: 'sub_1', customer: { external_id: USER } },
    };
    const { fn, calls } = liveFetcher({ ok: true, data: REVOKED_LIVE });
    const res = await resolvePolarEntitlement({ event: lateOrder, config, fetchSubscription: fn, nowMs: NOW });
    assert.deepEqual(calls, ['sub_1']);
    assert.equal(res.kind === 'apply' && res.decision.action, 'revoke');
    assert.equal(res.kind === 'apply' && res.decision.orderId, 'ord_1');
  });

  test('a live state older than the last applied one is ignored (ordering guard)', async () => {
    const event = { type: 'subscription.updated', data: subData() };
    const olderLive = subData({ modified_at: '2026-11-20T10:00:00Z' });
    const { fn } = liveFetcher({ ok: true, data: olderLive });
    const res = await resolvePolarEntitlement({
      event, config, fetchSubscription: fn, nowMs: NOW,
      lastAppliedModifiedAt: '2026-11-21T09:00:00Z',
    });
    assert.deepEqual(res, { kind: 'ignore', reason: 'stale_subscription_state' });
  });

  test('a newer live state is applied and an equal one is not considered stale', async () => {
    const event = { type: 'subscription.updated', data: subData() };
    const { fn } = liveFetcher({ ok: true, data: subData({ modified_at: '2026-11-22T08:00:00Z' }) });
    const res = await resolvePolarEntitlement({
      event, config, fetchSubscription: fn, nowMs: NOW, lastAppliedModifiedAt: '2026-11-21T09:00:00Z',
    });
    assert.equal(res.kind === 'apply' && res.decision.action, 'activate');
    assert.equal(isOlderThanLastApplied('2026-11-21T09:00:00Z', '2026-11-21T09:00:00Z'), false);
    assert.equal(isOlderThanLastApplied(null, '2026-11-21T09:00:00Z'), false);
  });

  test('cancel_at_period_end stays PRO on the live state until the period ends', async () => {
    const event = { type: 'subscription.canceled', data: subData({ cancel_at_period_end: true }) };
    const { fn } = liveFetcher({ ok: true, data: subData({ cancel_at_period_end: true }) });
    const res = await resolvePolarEntitlement({ event, config, fetchSubscription: fn, nowMs: NOW });
    assert.equal(res.kind === 'apply' && res.decision.action, 'activate');
    assert.equal(res.kind === 'apply' && res.decision.expiresAt, '2026-12-22T12:00:00Z');
  });
});

describe('Duplicate deliveries', () => {
  test('a redelivered, already processed webhook-id is acknowledged without acting', () => {
    const nowMs = Date.parse('2026-11-22T12:00:00Z');
    assert.equal(decideLedgerOutcome('23505', { status: 'processed', received_at: '2026-11-22T11:59:00Z' }, nowMs), 'duplicate');
  });

  test('replaying the same event yields the same decision (idempotent outcome)', async () => {
    const event = { type: 'subscription.revoked', data: subData() };
    const { fn } = liveFetcher({ ok: true, data: REVOKED_LIVE });
    const first = await resolvePolarEntitlement({ event, config, fetchSubscription: fn, nowMs: NOW });
    const second = await resolvePolarEntitlement({ event, config, fetchSubscription: fn, nowMs: NOW });
    assert.deepEqual(first, second);
    // After the first apply the ledger holds its modified_at: a replay is not "older", so it is
    // harmless (same state), and any OLDER replay would be ignored.
    const replayOlder = await resolvePolarEntitlement({
      event, config, nowMs: NOW,
      fetchSubscription: liveFetcher({ ok: true, data: subData({ modified_at: '2026-11-19T00:00:00Z' }) }).fn,
      lastAppliedModifiedAt: '2026-11-21T09:00:00Z',
    });
    assert.equal(replayOlder.kind, 'ignore');
  });
});

describe('Re-read failures', () => {
  const event = { type: 'subscription.active', data: subData() };

  test('API error -> retry (webhook answers 5xx so Polar redelivers)', async () => {
    const res = await resolvePolarEntitlement({
      event, config, nowMs: NOW,
      fetchSubscription: liveFetcher({ ok: false, notFound: false, status: 502 }).fn,
    });
    assert.deepEqual(res, { kind: 'retry', reason: 'subscription_reread_failed_502' });
  });

  test('network exception in the real fetcher -> retry', async () => {
    const throwingFetch = (async () => { throw new Error('ECONNRESET'); }) as unknown as typeof fetch;
    const fetcher = createSubscriptionFetcher('https://sandbox-api.polar.sh', 'tok', throwingFetch);
    const res = await resolvePolarEntitlement({ event, config, nowMs: NOW, fetchSubscription: fetcher });
    assert.equal(res.kind, 'retry');
  });

  test('404 -> ignore (not ours / deleted), so Polar does not retry forever', async () => {
    const res = await resolvePolarEntitlement({
      event, config, nowMs: NOW,
      fetchSubscription: liveFetcher({ ok: false, notFound: true, status: 404 }).fn,
    });
    assert.deepEqual(res, { kind: 'ignore', reason: 'subscription_not_found' });
  });

  test('live state for a different subscription or customer is not applied', async () => {
    const otherSub = await resolvePolarEntitlement({
      event, config, nowMs: NOW,
      fetchSubscription: liveFetcher({ ok: true, data: subData({ id: 'sub_other' }) }).fn,
    });
    assert.equal(otherSub.kind, 'retry');
    const otherUser = await resolvePolarEntitlement({
      event, config, nowMs: NOW,
      fetchSubscription: liveFetcher({
        ok: true,
        data: subData({ customer: { id: 'cus_2', external_id: '11111111-2222-4333-8444-555555555555' } }),
      }).fn,
    });
    assert.deepEqual(otherUser, { kind: 'ignore', reason: 'live_customer_mismatch' });
  });
});

describe('Fetcher & event plumbing', () => {
  test('createSubscriptionFetcher calls GET /v1/subscriptions/{id} with the bearer token', async () => {
    const seen: { url: string; init?: RequestInit }[] = [];
    const fakeFetch = (async (url: string, init?: RequestInit) => {
      seen.push({ url, init });
      return new Response(JSON.stringify(subData()), { status: 200 });
    }) as unknown as typeof fetch;
    const res = await createSubscriptionFetcher('https://api.polar.sh', 'tok_123', fakeFetch)('sub_1');
    assert.equal(res.ok, true);
    assert.equal(seen[0].url, 'https://api.polar.sh/v1/subscriptions/sub_1');
    assert.equal(seen[0].init?.method, 'GET');
    assert.equal((seen[0].init?.headers as Record<string, string>).Authorization, 'Bearer tok_123');

    const notFound = (async () => new Response('{}', { status: 404 })) as unknown as typeof fetch;
    assert.deepEqual(await createSubscriptionFetcher('https://api.polar.sh', 't', notFound)('x'), { ok: false, notFound: true, status: 404 });
  });

  test('one-time order.paid (no subscription) is applied without a re-read', async () => {
    const order = { type: 'order.paid', data: { id: 'ord_9', status: 'paid', product_id: PRODUCT, customer: { external_id: USER } } };
    const { fn, calls } = liveFetcher({ ok: false, notFound: false });
    const res = await resolvePolarEntitlement({ event: order, config, fetchSubscription: fn, nowMs: NOW });
    assert.deepEqual(calls, []);
    assert.equal(res.kind === 'apply' && res.decision.action, 'activate');
  });

  test('subscriptionIdOf reads the right field per event type', () => {
    assert.equal(subscriptionIdOf({ type: 'subscription.updated', data: { id: 'sub_7' } }), 'sub_7');
    assert.equal(subscriptionIdOf({ type: 'order.paid', data: { id: 'ord_1', subscription_id: 'sub_8' } }), 'sub_8');
    assert.equal(subscriptionIdOf({ type: 'order.paid', data: { id: 'ord_1' } }), null);
  });

  test('webhook wiring: live re-read, 5xx on retry, ordering stored in the ledger', () => {
    const src = read('supabase/functions/polar_webhook/index.ts');
    assert.ok(src.includes('resolvePolarEntitlement('));
    assert.ok(src.includes('createSubscriptionFetcher('));
    assert.ok(/resolution\.kind === "retry"[\s\S]{0,200}503/.test(src), 'retry -> 503');
    assert.ok(src.includes('subscription_modified_at: resolution.modifiedAt'));
    assert.ok(src.includes('!polarToken'), 'POLAR_ACCESS_TOKEN required');
    const sql = read('supabase/contract/20261122000001_contract_polar_webhook_events.sql');
    assert.ok(sql.includes('subscription_modified_at TIMESTAMPTZ'));
    assert.ok(sql.includes('idx_polar_webhook_events_sub_modified'));
  });
});
