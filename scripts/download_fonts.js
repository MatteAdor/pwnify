import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const fontsDir = path.join(rootDir, 'public', 'fonts');

if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

// Clean up old giant TTF files if present
const existingFiles = fs.readdirSync(fontsDir);
for (const file of existingFiles) {
  if (file.endsWith('.ttf')) {
    fs.unlinkSync(path.join(fontsDir, file));
    console.log(`Removed legacy large TTF: ${file}`);
  }
}

async function fetchCss(familyQuery) {
  const url = `https://fonts.googleapis.com/css2?family=${familyQuery}&display=swap`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
    }
  });
  if (!res.ok) throw new Error(`Failed to fetch Google Fonts CSS: ${res.statusText}`);
  return await res.text();
}

// Parse blocks from CSS and pick the latin subset
function parseFontBlocks(css) {
  const blocks = css.split('@font-face').slice(1);
  const result = [];
  for (const block of blocks) {
    const familyMatch = block.match(/font-family:\s*['"]([^'"]+)['"]/);
    const weightMatch = block.match(/font-weight:\s*(\d+)/);
    const urlMatch = block.match(/src:\s*url\((https:\/\/fonts\.gstatic\.com\/[^\)]+)\)\s*format\(['"]woff2['"]\)/);
    const subsetMatch = block.match(/\/\*\s*([a-z\-0-9]+)\s*\*\//);

    if (familyMatch && weightMatch && urlMatch) {
      result.push({
        family: familyMatch[1],
        weight: weightMatch[1],
        url: urlMatch[1],
        subset: subsetMatch ? subsetMatch[1] : 'latin'
      });
    }
  }
  return result;
}

async function downloadFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.statusText}`);
  const arrayBuffer = await res.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(arrayBuffer));
}

async function run() {
  console.log('Fetching Google Fonts definitions...');
  const css = await fetchCss('JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700');
  const blocks = parseFontBlocks(css);

  const targets = [
    { family: 'JetBrains Mono', weight: '400', fileName: 'jetbrains-mono-400.woff2' },
    { family: 'JetBrains Mono', weight: '500', fileName: 'jetbrains-mono-500.woff2' },
    { family: 'JetBrains Mono', weight: '600', fileName: 'jetbrains-mono-600.woff2' },
    { family: 'JetBrains Mono', weight: '700', fileName: 'jetbrains-mono-700.woff2' },
    { family: 'Plus Jakarta Sans', weight: '400', fileName: 'plus-jakarta-sans-400.woff2' },
    { family: 'Plus Jakarta Sans', weight: '500', fileName: 'plus-jakarta-sans-500.woff2' },
    { family: 'Plus Jakarta Sans', weight: '600', fileName: 'plus-jakarta-sans-600.woff2' },
    { family: 'Plus Jakarta Sans', weight: '700', fileName: 'plus-jakarta-sans-700.woff2' }
  ];

  let totalBytes = 0;
  for (const target of targets) {
    // Pick the latin subset block for this family and weight
    const matched = blocks.find(b => b.family === target.family && b.weight === target.weight && b.subset === 'latin')
      || blocks.find(b => b.family === target.family && b.weight === target.weight);

    if (!matched) {
      console.warn(`No match found for ${target.family} ${target.weight}`);
      continue;
    }

    const dest = path.join(fontsDir, target.fileName);
    await downloadFile(matched.url, dest);
    const size = fs.statSync(dest).size;
    totalBytes += size;
    console.log(`Downloaded ${target.fileName}: ${(size / 1024).toFixed(1)} kB (subset: ${matched.subset})`);
  }

  console.log(`Total fonts downloaded: ${(totalBytes / 1024).toFixed(1)} kB`);
}

run().catch(console.error);
