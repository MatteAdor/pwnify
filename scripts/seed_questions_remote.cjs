#!/usr/bin/env node
/**
 * ZeroDay — Remote Question Seeder (In-Memory Decryption)
 * Decrypts questions_bank.json.enc in memory and seeds remote Supabase DB
 * (Staging, Production, or Local) via service_role without writing plaintext to disk.
 *
 * Usage:
 *   QUESTION_BANK_KEY="<key>" SUPABASE_URL="https://xxx.supabase.co" SUPABASE_SERVICE_ROLE_KEY="eyJ..." node scripts/seed_questions_remote.cjs
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const encPath = path.resolve(__dirname, '../supabase/questions_bank.json.enc');

const secret = process.env.QUESTION_BANK_KEY;
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!secret) {
  console.error('[Error] QUESTION_BANK_KEY environment variable is required.');
  process.exit(1);
}

if (!supabaseUrl || !serviceKey) {
  console.error('[Error] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required.');
  process.exit(1);
}

if (!fs.existsSync(encPath)) {
  console.error(`[Error] Encrypted question bank not found at: ${encPath}`);
  console.error('Run npm run questions:encrypt first.');
  process.exit(1);
}

const encPayload = JSON.parse(fs.readFileSync(encPath, 'utf8'));

// Derive key
const salt = crypto.createHash('sha256').update('zeroday-salt-v1').digest();
const key = crypto.pbkdf2Sync(secret, salt, 100000, 32, 'sha256');
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

function getDeterministicUUID(text) {
  const hash = crypto.createHash('sha256').update(text).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

async function seed() {
  console.log(`[ZeroDay Seeder] Connecting to Supabase: ${supabaseUrl}`);

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

seed().catch((err) => {
  console.error('[Fatal Error]:', err);
  process.exit(1);
});
