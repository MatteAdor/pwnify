import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const sourcePath = path.join(rootDir, 'src', 'data', 'officialQuestions.json');
const outputDir = path.join(rootDir, 'public', 'data');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const rawData = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const questions = rawData.questions || [];

console.log(`Processing ${questions.length} total questions from officialQuestions.json...`);

const mapping = {
  sec_plus: ['CompTIA Security+', 'secplus'],
  ccna: ['Cisco CCNA', 'ccna'],
  aplus_core1: ['CompTIA A+ Core 1', 'aplus_core1'],
  aplus_core2: ['CompTIA A+ Core 2', 'aplus_core2'],
  netplus: ['CompTIA Network+', 'netplus']
};

const certBuckets = {
  sec_plus: [],
  ccna: [],
  aplus_core1: [],
  aplus_core2: [],
  netplus: [],
  ceh: []
};

for (const q of questions) {
  const cert = (q.certification || '').toLowerCase();
  const cat = (q.sourceCategory || '').toLowerCase();

  let matched = false;
  for (const [key, terms] of Object.entries(mapping)) {
    if (terms.some(t => cert.includes(t.toLowerCase()) || cat.includes(t.toLowerCase()))) {
      certBuckets[key].push(q);
      matched = true;
      break;
    }
  }

  if (!matched) {
    console.warn(`Unmatched question: id=${q.id}, cert=${q.certification}, cat=${q.sourceCategory}`);
  }
}

// Write per-cert files with both canonical key and hyphenated alias
const fileAliases = {
  sec_plus: ['sec_plus.json', 'security-plus.json'],
  ccna: ['ccna.json'],
  aplus_core1: ['aplus_core1.json', 'a-plus-core1.json'],
  aplus_core2: ['aplus_core2.json', 'a-plus-core2.json'],
  netplus: ['netplus.json', 'network-plus.json'],
  ceh: ['ceh.json']
};

const metadataIndex = [];

for (const [key, list] of Object.entries(certBuckets)) {
  console.log(`Bucket ${key}: ${list.length} questions`);
  const aliases = fileAliases[key] || [`${key}.json`];
  const jsonContent = JSON.stringify(list);

  for (const alias of aliases) {
    const filePath = path.join(outputDir, alias);
    fs.writeFileSync(filePath, jsonContent, 'utf8');
    const stats = fs.statSync(filePath);
    console.log(`  -> Wrote ${alias} (${(stats.size / 1024).toFixed(1)} kB)`);
  }

  metadataIndex.push({
    id: key,
    questionCount: list.length
  });
}

const indexPath = path.join(outputDir, 'cert-index.json');
fs.writeFileSync(indexPath, JSON.stringify(metadataIndex, null, 2), 'utf8');
console.log(`Wrote cert-index.json successfully.`);
