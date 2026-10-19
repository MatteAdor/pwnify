#!/usr/bin/env node
/**
 * ZeroDay — Question Bank Encryption Utility
 * Encrypts questions_bank.json with AES-256-GCM into questions_bank.json.enc
 * for safe disaster recovery and remote CI/CD storage without exposing correct_index.
 *
 * Usage:
 *   QUESTION_BANK_KEY="<32-byte-hex-or-passphrase>" node scripts/encrypt_questions.cjs
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const inputPath = path.resolve(__dirname, '../supabase/questions_bank.json');
const outputPath = path.resolve(__dirname, '../supabase/questions_bank.json.enc');

const secret = process.env.QUESTION_BANK_KEY;
if (!secret) {
  console.error('[Error] QUESTION_BANK_KEY environment variable is required.');
  console.error('Provide a 32-byte hex key or passphrase to encrypt the bank.');
  process.exit(1);
}

if (!fs.existsSync(inputPath)) {
  console.error(`[Error] Unencrypted question bank not found at: ${inputPath}`);
  process.exit(1);
}

const rawData = fs.readFileSync(inputPath, 'utf8');

// Derive 256-bit key using PBKDF2 with fixed salt
const salt = crypto.createHash('sha256').update('zeroday-salt-v1').digest();
const key = crypto.pbkdf2Sync(secret, salt, 100000, 32, 'sha256');
const iv = crypto.randomBytes(16);

const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
let encrypted = cipher.update(rawData, 'utf8', 'hex');
encrypted += cipher.final('hex');
const authTag = cipher.getAuthTag().toString('hex');

const payload = JSON.stringify({
  version: 1,
  iv: iv.toString('hex'),
  tag: authTag,
  data: encrypted
}, null, 2);

fs.writeFileSync(outputPath, payload, 'utf8');
console.log(`[Success] Encrypted ${Buffer.byteLength(rawData)} bytes into ${outputPath}`);
console.log('[Notice] questions_bank.json.enc is now safe for disaster recovery tracking.');
