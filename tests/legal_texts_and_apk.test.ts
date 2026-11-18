import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { SHOW_APK_DOWNLOAD, APK_CONFIG } from '../src/utils/platform.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('Legal Texts & Placeholders Verification Suite', () => {
  const privacyHtmlPath = path.join(rootDir, 'public', 'privacy.html');
  const legalModalPath = path.join(rootDir, 'src', 'components', 'Legal', 'LegalModal.tsx');
  const privacyReviewPath = path.join(rootDir, 'docs', 'PRIVACY_REVIEW.md');

  test('public/privacy.html contains no uppercase bracketed placeholders or << delimiters', () => {
    const content = fs.readFileSync(privacyHtmlPath, 'utf-8');
    
    // Check for uppercase bracketed placeholders like [INDIRIZZO], [DOMINIO], etc.
    const bracketPlaceholders = content.match(/\[[A-Z0-9_]{3,}\]/g) || [];
    assert.deepEqual(bracketPlaceholders, [], `Found bracketed placeholders in privacy.html: ${bracketPlaceholders.join(', ')}`);

    // Check for << delimiters
    assert.strictEqual(content.includes('<<'), false, 'Found << delimiter in privacy.html');
    assert.strictEqual(content.includes('>>'), false, 'Found >> delimiter in privacy.html');

    // Verify presence of required privacy notice text and absence of mailto link
    assert.strictEqual(content.includes('github.com/MatteAdor/pwnify/issues'), true, 'privacy.html must direct users to GitHub issues');
    assert.strictEqual(content.includes('mailto:[INDIRIZZO]'), false, 'privacy.html must not contain mailto:[INDIRIZZO]');
  });

  test('src/components/Legal/LegalModal.tsx contains no uppercase bracketed placeholders or << delimiters', () => {
    const content = fs.readFileSync(legalModalPath, 'utf-8');
    
    // Check for uppercase bracketed placeholders like [INDIRIZZO], [DOMINIO], etc.
    const bracketPlaceholders = content.match(/\[[A-Z0-9_]{3,}\]/g) || [];
    assert.deepEqual(bracketPlaceholders, [], `Found bracketed placeholders in LegalModal.tsx: ${bracketPlaceholders.join(', ')}`);

    // Check for << delimiters
    assert.strictEqual(content.includes('<<'), false, 'Found << delimiter in LegalModal.tsx');

    // Verify presence of required privacy notice text and absence of mailto link
    assert.strictEqual(content.includes('github.com/MatteAdor/pwnify/issues'), true, 'LegalModal.tsx must direct users to GitHub issues');
    assert.strictEqual(content.includes('mailto:[INDIRIZZO]'), false, 'LegalModal.tsx must not contain mailto:[INDIRIZZO]');
  });

  test('docs/PRIVACY_REVIEW.md contains no uppercase bracketed placeholders or << delimiters', () => {
    const content = fs.readFileSync(privacyReviewPath, 'utf-8');
    
    // Check for uppercase bracketed placeholders like [INDIRIZZO], [DOMINIO], etc.
    const bracketPlaceholders = content.match(/\[[A-Z0-9_]{3,}\]/g) || [];
    assert.deepEqual(bracketPlaceholders, [], `Found bracketed placeholders in PRIVACY_REVIEW.md: ${bracketPlaceholders.join(', ')}`);

    assert.strictEqual(content.includes('<<'), false, 'Found << delimiter in PRIVACY_REVIEW.md');
    assert.strictEqual(content.includes('github.com/MatteAdor/pwnify/issues'), true, 'PRIVACY_REVIEW.md must reference GitHub issues');
  });
});

describe('APK Gating & Direct Download Suite', () => {
  test('SHOW_APK_DOWNLOAD flag is set to true', () => {
    assert.strictEqual(SHOW_APK_DOWNLOAD, true, 'SHOW_APK_DOWNLOAD must be true');
  });

  test('public/downloads/pwnify.apk exists and matches config SHA-256', () => {
    const apkPath = path.join(rootDir, 'public', 'downloads', 'pwnify.apk');
    assert.strictEqual(fs.existsSync(apkPath), true, 'public/downloads/pwnify.apk must exist in repository');

    const fileBuffer = fs.readFileSync(apkPath);
    const calculatedHash = crypto.createHash('sha256').update(fileBuffer).digest('hex').toUpperCase();

    assert.strictEqual(
      calculatedHash,
      '501883D5516BA998C85C9E16A6C3686548E5E5B9EF147BA482A453E6D16FC4D8',
      'Calculated SHA-256 of pwnify.apk must match expected release hash'
    );
    assert.strictEqual(
      APK_CONFIG.sha256,
      calculatedHash,
      'APK_CONFIG.sha256 must match the physical file hash'
    );
    assert.strictEqual(
      APK_CONFIG.downloadUrl,
      '/downloads/pwnify.apk',
      'APK_CONFIG.downloadUrl must point to /downloads/pwnify.apk'
    );
  });

  test('Web code directs APK downloads to /downloads/pwnify.apk and removes fake hash and "in arrivo" stubs', () => {
    const appTsx = fs.readFileSync(path.join(rootDir, 'src', 'App.tsx'), 'utf-8');
    const arenaView = fs.readFileSync(path.join(rootDir, 'src', 'components', 'Arena', 'ArenaWebLockedView.tsx'), 'utf-8');
    const gateModal = fs.readFileSync(path.join(rootDir, 'src', 'components', 'Gating', 'AppDownloadGateModal.tsx'), 'utf-8');
    const landing = fs.readFileSync(path.join(rootDir, 'src', 'components', 'Landing', 'LandingPortal.tsx'), 'utf-8');

    const FAKE_HASH = 'e8b7f190c3a81f337b5d98418041a998bb9ffae410887e5e01c107e3cb29cf6a';

    for (const [name, content] of Object.entries({ appTsx, arenaView, gateModal, landing })) {
      // Must not contain fake hash
      assert.strictEqual(
        content.includes(FAKE_HASH),
        false,
        `${name} must not contain the stale fake hash ${FAKE_HASH}`
      );

      // Must not contain "Android: in arrivo" or "Android: Coming soon" fallback labels
      assert.strictEqual(
        content.includes('Android: in arrivo'),
        false,
        `${name} must not contain "Android: in arrivo"`
      );
      assert.strictEqual(
        content.includes('Android: Coming soon'),
        false,
        `${name} must not contain "Android: Coming soon"`
      );

      // Must reference APK_CONFIG for download URL and sha256
      assert.strictEqual(
        content.includes('APK_CONFIG'),
        true,
        `${name} must import and use APK_CONFIG`
      );
    }
  });

  test('vercel.json specifies correct package-archive and attachment headers for /downloads/(.*)', () => {
    const vercelConfig = JSON.parse(fs.readFileSync(path.join(rootDir, 'vercel.json'), 'utf-8'));
    const downloadHeader = vercelConfig.headers?.find(
      (h: { source: string }) => h.source === '/downloads/(.*)'
    );

    assert.ok(downloadHeader, 'vercel.json must define headers for /downloads/(.*)');
    const contentType = downloadHeader.headers?.find(
      (item: { key: string }) => item.key === 'Content-Type'
    );
    const contentDisposition = downloadHeader.headers?.find(
      (item: { key: string }) => item.key === 'Content-Disposition'
    );

    assert.strictEqual(
      contentType?.value,
      'application/vnd.android.package-archive',
      'Content-Type must be application/vnd.android.package-archive'
    );
    assert.strictEqual(
      contentDisposition?.value,
      'attachment',
      'Content-Disposition must be attachment'
    );
  });
});
