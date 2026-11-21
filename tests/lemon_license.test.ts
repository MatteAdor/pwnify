import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseIdList,
  isLicenseFromOurStore,
  classifyWebhookEvent,
  isUuid,
} from '../supabase/functions/_shared/lemonLicense.ts';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => fs.readFileSync(path.join(rootDir, rel), 'utf-8');

describe('Lemon Squeezy license store binding', () => {
  test('parseIdList trims and drops empties', () => {
    assert.deepEqual(parseIdList(' 12, 34 ,,56 '), ['12', '34', '56']);
    assert.deepEqual(parseIdList(''), []);
    assert.deepEqual(parseIdList(undefined), []);
  });

  test('accepts only keys from our store (numeric or string IDs)', () => {
    assert.equal(isLicenseFromOurStore({ store_id: 111, product_id: 9 }, '111'), true);
    assert.equal(isLicenseFromOurStore({ store_id: '111' }, ' 111 '), true);
    assert.equal(isLicenseFromOurStore({ store_id: 222, product_id: 9 }, '111'), false, 'foreign store key is rejected');
    assert.equal(isLicenseFromOurStore({}, '111'), false, 'missing store_id is rejected');
    assert.equal(isLicenseFromOurStore(null, '111'), false);
  });

  test('fails closed when the expected store ID is not configured', () => {
    assert.equal(isLicenseFromOurStore({ store_id: 111 }, ''), false);
    assert.equal(isLicenseFromOurStore({ store_id: 111 }, undefined), false);
  });

  test('enforces the optional product allowlist', () => {
    assert.equal(isLicenseFromOurStore({ store_id: 111, product_id: 5 }, '111', ['5', '6']), true);
    assert.equal(isLicenseFromOurStore({ store_id: 111, product_id: 7 }, '111', ['5', '6']), false);
    assert.equal(isLicenseFromOurStore({ store_id: 111 }, '111', ['5']), false, 'missing product_id fails the allowlist');
  });
});

describe('Lemon Squeezy webhook classification', () => {
  test('order_created grants PRO only when paid', () => {
    assert.equal(classifyWebhookEvent('order_created', { status: 'paid', store_id: 111 }, '111'), 'activate');
    assert.equal(classifyWebhookEvent('order_created', { status: 'pending', store_id: 111 }, '111'), 'ignore');
    assert.equal(classifyWebhookEvent('order_created', { status: 'failed' }, ''), 'ignore');
  });

  test('subscription lifecycle events keep their meaning', () => {
    assert.equal(classifyWebhookEvent('subscription_created', {}, ''), 'activate');
    assert.equal(classifyWebhookEvent('subscription_resumed', {}, ''), 'activate');
    assert.equal(classifyWebhookEvent('subscription_cancelled', {}, ''), 'revoke');
    assert.equal(classifyWebhookEvent('subscription_expired', {}, ''), 'revoke');
    assert.equal(classifyWebhookEvent('order_refunded', {}, ''), 'revoke');
    assert.equal(classifyWebhookEvent('license_key_created', {}, ''), 'ignore');
    assert.equal(classifyWebhookEvent(undefined, undefined, ''), 'ignore');
  });

  test('ignores events from another store or product when configured', () => {
    assert.equal(classifyWebhookEvent('subscription_created', { store_id: 222 }, '111'), 'ignore');
    assert.equal(classifyWebhookEvent('subscription_created', { store_id: 111, product_id: 9 }, '111', ['5']), 'ignore');
    assert.equal(
      classifyWebhookEvent('order_created', { store_id: 111, status: 'paid', first_order_item: { product_id: 5 } }, '111', ['5']),
      'activate'
    );
  });

  test('isUuid validates custom_data.user_id', () => {
    assert.equal(isUuid('38b1460a-5104-4067-a91d-77b872934d51'), true);
    assert.equal(isUuid('not-a-uuid'), false);
    assert.equal(isUuid(42), false);
  });
});

describe('Edge function wiring (static)', () => {
  const validate = read('supabase/functions/validate_license/index.ts');
  const webhook = read('supabase/functions/lemonsqueezy_webhook/index.ts');

  test('validate_license requires the store ID and checks it on activate and validate', () => {
    assert.ok(validate.includes('Deno.env.get("LEMONSQUEEZY_STORE_ID")'));
    assert.ok(validate.includes('!expectedStoreId'), 'missing store ID must fail closed');
    assert.equal((validate.match(/isLicenseFromOurStore\(/g) || []).length, 2, 'store check on both activate and validate paths');
    assert.ok(validate.includes('licenses/deactivate'), 'foreign activations are released');
  });

  test('validate_license re-validates only a stored instance of the same user', () => {
    assert.ok(validate.includes('.from("user_licenses")'));
    assert.ok(validate.includes('instance_id: storedInstanceId'));
    assert.equal(validate.includes('instance_id: instanceName'), false, 'must not pass the user id as instance_id');
  });

  test('webhook no longer matches nick to email, pages listUsers and logs no email', () => {
    assert.equal(/\.eq\("nick"/.test(webhook), false);
    assert.ok(webhook.includes('page <= MAX_PAGES'));
    assert.equal(/console\.(log|warn|error)\([^)]*customerEmail/.test(webhook), false, 'no buyer email in logs');
    assert.ok(webhook.includes('classifyWebhookEvent('));
  });
});
