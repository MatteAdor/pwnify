import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('Android Identity & Deep Link Cross-Consistency Suite', () => {
  const rootDir = process.cwd();

  const readProjectFile = (relPath: string): string => {
    return fs.readFileSync(path.join(rootDir, relPath), 'utf-8');
  };

  const EXPECTED_APPLICATION_ID = 'com.pwnify.app';
  const EXPECTED_APP_NAME = 'Pwnify';
  const EXPECTED_SCHEME = 'com.pwnify.app';
  const EXPECTED_SHORT_SCHEME = 'pwnify';
  const EXPECTED_FILEPROVIDER_AUTHORITY = '${applicationId}.fileprovider';

  it('verifies build.gradle applicationId matches expected package and keeps Java namespace', () => {
    const content = readProjectFile('android/app/build.gradle');
    const appIdMatch = content.match(/applicationId\s+["']([^"']+)["']/);
    const namespaceMatch = content.match(/namespace\s*=?\s*["']([^"']+)["']/);

    assert.ok(appIdMatch, 'applicationId must be declared in build.gradle');
    assert.strictEqual(appIdMatch[1], EXPECTED_APPLICATION_ID, 'build.gradle applicationId mismatch');

    assert.ok(namespaceMatch, 'namespace must be declared in build.gradle');
    assert.strictEqual(namespaceMatch[1], 'com.zeroday.academy', 'Java namespace must remain unchanged');
  });

  it('verifies capacitor.config.ts appId and appName match Android configuration', () => {
    const content = readProjectFile('capacitor.config.ts');
    const appIdMatch = content.match(/appId:\s*['"]([^'"]+)['"]/);
    const appNameMatch = content.match(/appName:\s*['"]([^'"]+)['"]/);

    assert.ok(appIdMatch, 'appId must be defined in capacitor.config.ts');
    assert.strictEqual(appIdMatch[1], EXPECTED_APPLICATION_ID, 'capacitor.config.ts appId mismatch');

    assert.ok(appNameMatch, 'appName must be defined in capacitor.config.ts');
    assert.strictEqual(appNameMatch[1], EXPECTED_APP_NAME, 'capacitor.config.ts appName mismatch');
  });

  it('verifies strings.xml contains matching package_name, custom_url_scheme, and app_name', () => {
    const content = readProjectFile('android/app/src/main/res/values/strings.xml');

    const pkgMatch = content.match(/<string\s+name="package_name">([^<]+)<\/string>/);
    const schemeMatch = content.match(/<string\s+name="custom_url_scheme">([^<]+)<\/string>/);
    const nameMatch = content.match(/<string\s+name="app_name">([^<]+)<\/string>/);

    assert.ok(pkgMatch, 'package_name string must exist in strings.xml');
    assert.strictEqual(pkgMatch[1], EXPECTED_APPLICATION_ID, 'strings.xml package_name mismatch');

    assert.ok(schemeMatch, 'custom_url_scheme string must exist in strings.xml');
    assert.strictEqual(schemeMatch[1], EXPECTED_SCHEME, 'strings.xml custom_url_scheme mismatch');

    assert.ok(nameMatch, 'app_name string must exist in strings.xml');
    assert.strictEqual(nameMatch[1], EXPECTED_APP_NAME, 'strings.xml app_name mismatch');
  });

  it('verifies AndroidManifest.xml FileProvider authority and deep link intent-filters', () => {
    const content = readProjectFile('android/app/src/main/AndroidManifest.xml');

    // FileProvider authority
    const authorityMatch = content.match(/android:authorities="([^"]+)"/);
    assert.ok(authorityMatch, 'FileProvider authority must be defined in AndroidManifest.xml');
    assert.strictEqual(
      authorityMatch[1],
      EXPECTED_FILEPROVIDER_AUTHORITY,
      'FileProvider authority must use ${applicationId}.fileprovider for multi-flavor / dynamic package binding'
    );

    // Deep link schemes in intent-filter
    assert.ok(
      content.includes(`<data android:scheme="${EXPECTED_SCHEME}" />`),
      `AndroidManifest.xml must include deep link scheme <data android:scheme="${EXPECTED_SCHEME}" />`
    );
    assert.ok(
      content.includes(`<data android:scheme="${EXPECTED_SHORT_SCHEME}" />`),
      `AndroidManifest.xml must include short deep link scheme <data android:scheme="${EXPECTED_SHORT_SCHEME}" />`
    );
  });

  it('verifies OAuth callback.html deep link URI matches expected package scheme', () => {
    const content = readProjectFile('public/auth/callback.html');
    const expectedUri = `${EXPECTED_SCHEME}://auth/callback`;

    assert.ok(
      content.includes(`var deepLink = '${expectedUri}'`),
      `callback.html must declare primary deepLink '${expectedUri}'`
    );
  });

  it('verifies App.tsx deep link bounce URI matches expected package scheme', () => {
    const content = readProjectFile('src/App.tsx');
    const expectedBounce = `const deepLink = \`${EXPECTED_SCHEME}://auth/callback\${search}\${hash}\`;`;

    assert.ok(
      content.includes(expectedBounce),
      `src/App.tsx must construct mobile deep link using '${EXPECTED_SCHEME}://auth/callback'`
    );
  });

  it('verifies updateManager.ts store URL and appId match expected applicationId', () => {
    const content = readProjectFile('src/utils/updateManager.ts');

    assert.ok(
      content.includes(`details?id=${EXPECTED_APPLICATION_ID}`),
      `updateManager.ts must point storeUrl to id=${EXPECTED_APPLICATION_ID}`
    );
    assert.ok(
      content.includes(`appId: '${EXPECTED_APPLICATION_ID}'`),
      `updateManager.ts must open store with appId '${EXPECTED_APPLICATION_ID}'`
    );
  });
});
