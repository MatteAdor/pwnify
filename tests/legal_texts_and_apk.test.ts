import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SHOW_APK_DOWNLOAD } from '../src/utils/platform.ts';

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

describe('APK Gating & Download Protection Suite', () => {
  test('SHOW_APK_DOWNLOAD flag defaults to false', () => {
    assert.strictEqual(SHOW_APK_DOWNLOAD, false, 'SHOW_APK_DOWNLOAD must default to false');
  });

  test('public/downloads/zeroday.apk is confirmed removed from distribution bundle', () => {
    const apkPath = path.join(rootDir, 'public', 'downloads', 'zeroday.apk');
    assert.strictEqual(fs.existsSync(apkPath), false, 'public/downloads/zeroday.apk must not exist in repository');
  });

  test('Web code contains fallback "Android: in arrivo" indicator when SHOW_APK_DOWNLOAD is false', () => {
    const appTsx = fs.readFileSync(path.join(rootDir, 'src', 'App.tsx'), 'utf-8');
    const arenaView = fs.readFileSync(path.join(rootDir, 'src', 'components', 'Arena', 'ArenaWebLockedView.tsx'), 'utf-8');
    const gateModal = fs.readFileSync(path.join(rootDir, 'src', 'components', 'Gating', 'AppDownloadGateModal.tsx'), 'utf-8');
    const landing = fs.readFileSync(path.join(rootDir, 'src', 'components', 'Landing', 'LandingPortal.tsx'), 'utf-8');

    for (const [name, content] of Object.entries({ appTsx, arenaView, gateModal, landing })) {
      assert.strictEqual(
        content.includes('Android: in arrivo'),
        true,
        `${name} must contain "Android: in arrivo" label when SHOW_APK_DOWNLOAD is false`
      );
      assert.strictEqual(
        content.includes('SHOW_APK_DOWNLOAD'),
        true,
        `${name} must respect SHOW_APK_DOWNLOAD flag`
      );
    }
  });
});
