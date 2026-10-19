#!/usr/bin/env node
/**
 * ZeroDay — Remote Question Seeder (In-Memory Decryption with Scrypt/GCM)
 * Decrypts questions_bank.json.enc from a private S3/R2 URL or local path in memory
 * and seeds Supabase (Staging, Production, or Local) via service_role without writing plaintext to disk.
 *
 * Usage:
 *   QUESTION_BANK_KEY="<32-byte-key>" \
 *   QUESTION_BANK_REMOTE_URL="https://my-private-bucket.r2.cloudflarestorage.com/questions_bank.json.enc" \
 *   SUPABASE_URL="https://xxx.supabase.co" \
 *   SUPABASE_SERVICE_ROLE_KEY="eyJ..." \
 *   node scripts/seed_questions_remote.cjs
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const secret = process.env.QUESTION_BANK_KEY;
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const remoteUrl = process.env.QUESTION_BANK_REMOTE_URL;
const localPath = process.env.QUESTION_BANK_PATH || path.resolve(__dirname, '../supabase/questions_bank.json.enc');
const authToken = process.env.QUESTION_BANK_AUTH_TOKEN;

if (!secret) {
  console.error('[Error] QUESTION_BANK_KEY environment variable is required.');
  process.exit(1);
}

if (!supabaseUrl || !serviceKey) {
  console.error('[Error] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required.');
  process.exit(1);
}

function fetchPayload(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const headers = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    client.get(url, { headers }, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function getDeterministicUUID(text) {
  const hash = crypto.createHash('sha256').update(text).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

async function run() {
  let rawJson = '';

  if (remoteUrl) {
    console.log(`[ZeroDay Seeder] Fetching encrypted bank from private remote storage: ${remoteUrl.split('?')[0]}...`);
    rawJson = await fetchPayload(remoteUrl);
  } else if (fs.existsSync(localPath)) {
    console.log(`[ZeroDay Seeder] Loading encrypted bank from local path: ${localPath}...`);
    rawJson = fs.readFileSync(localPath, 'utf8');
  } else {
    console.error('[Error] No encrypted bank available.');
    console.error(`Provide QUESTION_BANK_REMOTE_URL or ensure ${localPath} exists.`);
    process.exit(1);
  }

  const encPayload = JSON.parse(rawJson);
  let key;

  if (encPayload.kdf === 'scrypt') {
    const salt = Buffer.from(encPayload.salt, 'hex');
    const params = encPayload.scrypt_params || { N: 16384, r: 8, p: 1 };
    key = crypto.scryptSync(secret, salt, 32, params);
  } else {
    // Legacy fallback (v1 PBKDF2)
    const salt = crypto.createHash('sha256').update('zeroday-salt-v1').digest();
    key = crypto.pbkdf2Sync(secret, salt, 100000, 32, 'sha256');
  }

  const iv = Buffer.from(encPayload.iv, 'hex');
  const authTag = Buffer.from(encPayload.tag, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted;
  try {
    decrypted = decipher.update(encPayload.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
  } catch (err) {
    console.error('[Error] Decryption failed: invalid QUESTION_BANK_KEY or corrupted payload.');
    process.exit(1);
  }

  const questions = JSON.parse(decrypted);
  console.log(`[ZeroDay Seeder] Successfully decrypted ${questions.length} questions in-memory.`);

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const batchSize = 50;
  let inserted = 0;

  for (let i = 0; i < questions.length; i += batchSize) {
    const batch = questions.slice(i, i + batchSize).map((q) => ({
      id: q.id || getDeterministicUUID(q.question),
      category: q.category,
      question: q.question,
      code_snippet: q.code_snippet || null,
      options: q.options,
      correct_index: q.correct_index,
      difficulty: q.difficulty || 'medium'
    }));

    const { error } = await supabase.from('questions').upsert(batch, { onConflict: 'id' });
    if (error) {
      console.error(`[Error] Failed seeding batch ${i / batchSize + 1}:`, error.message);
      process.exit(1);
    }
    inserted += batch.length;
    console.log(`[ZeroDay Seeder] Seeded ${inserted}/${questions.length} questions...`);
  }

  console.log(`[ZeroDay Seeder] SUCCESS: Completed seeding ${inserted} questions.`);
}

run().catch((err) => {
  console.error('[Fatal Error]:', err.message);
  process.exit(1);
});
