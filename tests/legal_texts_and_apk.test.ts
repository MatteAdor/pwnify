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
  const termsHtmlPath = path.join(rootDir, 'public', 'terms.html');

  // Invented company details that must never reappear in legal texts.
  const FORBIDDEN_LEGAL_STRINGS = [
    'S.r.l.',
    'P.IVA',
    'IT01234567890',
    'Spadolini',
    'sede legale',
    'registered office',
    'zeroday.academy',
    'Pwnify Cyber Academy',
    'zerolag_os@',
  ];

  const assertNoInventedDetails = (name: string, content: string) => {
    for (const forbidden of FORBIDDEN_LEGAL_STRINGS) {
      assert.strictEqual(content.includes(forbidden), false, `${name} must not contain "${forbidden}"`);
    }
  };

  const assertRealControllerAndContacts = (name: string, content: string) => {
    assertNoInventedDetails(name, content);
    assert.ok(content.includes('Matteo Adorni, persona fisica'), `${name} must name "Matteo Adorni, persona fisica" as controller`);
    assert.ok(content.includes('privacy@pwnify.xyz'), `${name} must reference privacy@pwnify.xyz`);
    assert.ok(content.includes('support@pwnify.xyz'), `${name} must reference support@pwnify.xyz`);
  };

  test('public/privacy.html contains no uppercase bracketed placeholders or << delimiters', () => {
    const content = fs.readFileSync(privacyHtmlPath, 'utf-8');
    
    // Check for uppercase bracketed placeholders like [INDIRIZZO], [DOMINIO], etc.
    const bracketPlaceholders = content.match(/\[[A-Z0-9_]{3,}\]/g) || [];
    assert.deepEqual(bracketPlaceholders, [], `Found bracketed placeholders in privacy.html: ${bracketPlaceholders.join(', ')}`);

    // Check for << delimiters
    assert.strictEqual(content.includes('<<'), false, 'Found << delimiter in privacy.html');
    assert.strictEqual(content.includes('>>'), false, 'Found >> delimiter in privacy.html');

    assert.strictEqual(content.includes('mailto:[INDIRIZZO]'), false, 'privacy.html must not contain mailto:[INDIRIZZO]');
    assertRealControllerAndContacts('privacy.html', content);
  });

  test('public/terms.html names the real provider and support contact', () => {
    const content = fs.readFileSync(termsHtmlPath, 'utf-8');
    assertNoInventedDetails('terms.html', content);
    assert.ok(content.includes('Matteo Adorni, persona fisica'), 'terms.html must name Matteo Adorni, persona fisica');
    assert.ok(content.includes('mailto:support@pwnify.xyz'), 'terms.html must link support@pwnify.xyz for refunds');
    assert.ok(content.includes('non &egrave; affiliato'), 'terms.html must contain the trademark disclaimer');
  });

  test('src/components/Legal/LegalModal.tsx contains no uppercase bracketed placeholders or << delimiters', () => {
    const content = fs.readFileSync(legalModalPath, 'utf-8');
    
    // Check for uppercase bracketed placeholders like [INDIRIZZO], [DOMINIO], etc.
    const bracketPlaceholders = content.match(/\[[A-Z0-9_]{3,}\]/g) || [];
    assert.deepEqual(bracketPlaceholders, [], `Found bracketed placeholders in LegalModal.tsx: ${bracketPlaceholders.join(', ')}`);

    // Check for << delimiters
    assert.strictEqual(content.includes('<<'), false, 'Found << delimiter in LegalModal.tsx');

    assert.strictEqual(content.includes('mailto:[INDIRIZZO]'), false, 'LegalModal.tsx must not contain mailto:[INDIRIZZO]');
    assertRealControllerAndContacts('LegalModal.tsx', content);
    assert.ok(content.includes('mailto:support@pwnify.xyz'), 'LegalModal.tsx must link support@pwnify.xyz');
  });

  test('docs/PRIVACY_REVIEW.md contains no uppercase bracketed placeholders or << delimiters', () => {
    const content = fs.readFileSync(privacyReviewPath, 'utf-8');
    
    // Check for uppercase bracketed placeholders like [INDIRIZZO], [DOMINIO], etc.
    const bracketPlaceholders = content.match(/\[[A-Z0-9_]{3,}\]/g) || [];
    assert.deepEqual(bracketPlaceholders, [], `Found bracketed placeholders in PRIVACY_REVIEW.md: ${bracketPlaceholders.join(', ')}`);

    assert.strictEqual(content.includes('<<'), false, 'Found << delimiter in PRIVACY_REVIEW.md');
    assert.ok(content.includes('Matteo Adorni, persona fisica'), 'PRIVACY_REVIEW.md must name the real controller');
    assert.ok(content.includes('privacy@pwnify.xyz'), 'PRIVACY_REVIEW.md must reference privacy@pwnify.xyz');
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
      'C9D16320500C0A8CA9ECB5A83E541E23F4DF15B75DF2533311A2789E00B4BCB4',
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

      // Must reference APK_CONFIG for the download URL
      assert.strictEqual(
        content.includes('APK_CONFIG'),
        true,
        `${name} must import and use APK_CONFIG`
      );
    }
  });

  test('Landing has no fake stats, version badge or APK hash card, and shows the trademark disclaimer', () => {
    const landing = fs.readFileSync(path.join(rootDir, 'src', 'components', 'Landing', 'LandingPortal.tsx'), 'utf-8');
    const settings = fs.readFileSync(path.join(rootDir, 'src', 'components', 'Settings', 'SettingsPage.tsx'), 'utf-8');

    for (const forbidden of ['OPERATORS ONLINE', 'INTRODUCING PWNIFY', 'SHA-256:', 'APK_CONFIG.sha256', 'Latency: 14ms', 'ops@pwnify.xyz']) {
      assert.strictEqual(landing.includes(forbidden), false, `LandingPortal.tsx must not contain "${forbidden}"`);
    }

    const disclaimerIt = 'Pwnify non è affiliato né approvato da CompTIA, Cisco, EC-Council o altri enti di certificazione. I marchi appartengono ai rispettivi proprietari.';
    const disclaimerEn = 'Pwnify is not affiliated with or endorsed by CompTIA, Cisco, EC-Council or any other certification body.';
    for (const [name, content] of Object.entries({ landing, settings })) {
      assert.ok(content.includes(disclaimerIt), `${name} must contain the Italian trademark disclaimer`);
      assert.ok(content.includes(disclaimerEn), `${name} must contain the English trademark disclaimer`);
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
