#!/usr/bin/env node
/**
 * ZeroDay — Question Bank Encryption Utility (Hardened Scrypt + AES-256-GCM)
 * Encrypts questions_bank.json with scrypt KDF and AES-256-GCM (12-byte random nonce).
 * The resulting .enc file is strictly ignored by git and stored in private S3/R2 storage.
 *
 * Usage:
 *   QUESTION_BANK_KEY="<random-32-char-key>" node scripts/encrypt_questions.cjs [input_path] [output_path]
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const inputPath = process.argv[2] 
  ? path.resolve(process.cwd(), process.argv[2])
  : path.resolve(__dirname, '../supabase/questions_bank.json');

const outputPath = process.argv[3]
  ? path.resolve(process.cwd(), process.argv[3])
  : path.resolve(__dirname, '../supabase/questions_bank.json.enc');

const secret = process.env.QUESTION_BANK_KEY;
if (!secret || secret.length < 32) {
  console.error('[Error] QUESTION_BANK_KEY environment variable is required and must be at least 32 characters long.');
  console.error('Generate a key via: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}

if (!fs.existsSync(inputPath)) {
  console.error(`[Error] Unencrypted question bank not found at: ${inputPath}`);
  process.exit(1);
}

const rawData = fs.readFileSync(inputPath, 'utf8');

// 1. Generate cryptographically secure random 16-byte salt
const salt = crypto.randomBytes(16);

// 2. Derive 256-bit key using scrypt (memory-hard, resistant to GPU/ASIC attacks)
const key = crypto.scryptSync(secret, salt, 32, { N: 16384, r: 8, p: 1 });

// 3. Generate random 12-byte nonce (standard for GCM mode)
const iv = crypto.randomBytes(12);

// 4. Encrypt with AES-256-GCM
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
let encrypted = cipher.update(rawData, 'utf8', 'hex');
encrypted += cipher.final('hex');
const authTag = cipher.getAuthTag().toString('hex');

const payload = JSON.stringify({
  version: 2,
  kdf: 'scrypt',
  scrypt_params: { N: 16384, r: 8, p: 1 },
  salt: salt.toString('hex'),
  iv: iv.toString('hex'),
  tag: authTag,
  data: encrypted
}, null, 2);

fs.writeFileSync(outputPath, payload, 'utf8');
console.log(`[Success] Encrypted ${Buffer.byteLength(rawData)} bytes using scrypt + AES-256-GCM into ${outputPath}`);
console.log('[Security Reminder] Upload this file to your private S3/R2 bucket or private repo. DO NOT commit to public git.');
