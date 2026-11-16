import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distHtmlPath = path.join(rootDir, 'dist', 'index.html');

if (!fs.existsSync(distHtmlPath)) {
  console.error(`[Prerender] dist/index.html not found at ${distHtmlPath}. Run vite build first.`);
  process.exit(1);
}

// Minimal browser mocks for SSR execution
const storageMock = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {}
};

const windowMock = {
  location: {
    hostname: 'www.pwnify.xyz',
    href: 'https://www.pwnify.xyz/',
    pathname: '/',
    search: '',
    hash: ''
  },
  localStorage: storageMock,
  sessionStorage: storageMock,
  matchMedia: () => ({
    matches: false,
    media: '',
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
  addEventListener: () => {},
  removeEventListener: () => {},
  Audio: class {
    play() { return Promise.resolve(); }
    pause() {}
    load() {}
  }
};

(globalThis as any).window = windowMock;
(globalThis as any).localStorage = storageMock;
(globalThis as any).sessionStorage = storageMock;
(globalThis as any).document = {
  documentElement: { lang: 'en', style: {} },
  getElementById: () => null,
  addEventListener: () => {},
  removeEventListener: () => {}
};

try {
  Object.defineProperty(globalThis, 'navigator', {
    value: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SSG-Prerender' },
    configurable: true,
    writable: true
  });
} catch {
  try {
    Object.defineProperty(globalThis.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SSG-Prerender',
      configurable: true
    });
  } catch {}
}

async function prerender() {
  console.log('[Prerender] Starting homepage SSG prerendering...');
  const React = (await import('react')).default;
  const { renderToString } = await import('react-dom/server');
  const { App } = await import('../src/App');

  const appHtml = renderToString(React.createElement(App));
  console.log(`[Prerender] Rendered <App /> to string (${appHtml.length} characters).`);

  const rawHtml = fs.readFileSync(distHtmlPath, 'utf8');
  const rootRegex = /<div id="root">\s*<\/div>/;

  if (!rootRegex.test(rawHtml)) {
    console.warn('[Prerender] Could not find empty <div id="root"></div> in dist/index.html. Checking if already injected...');
    if (rawHtml.includes('<div id="root">') && rawHtml.includes('pwnify')) {
      console.log('[Prerender] Already prerendered.');
      return;
    }
  }

  const modifiedHtml = rawHtml.replace(rootRegex, `<div id="root">${appHtml}</div>`);
  fs.writeFileSync(distHtmlPath, modifiedHtml, 'utf8');

  const finalStats = fs.statSync(distHtmlPath);
  console.log(`[Prerender] Injected prerendered markup into dist/index.html (${(finalStats.size / 1024).toFixed(1)} kB).`);
}

prerender()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('[Prerender] Execution failed:', err);
    process.exit(1);
  });
