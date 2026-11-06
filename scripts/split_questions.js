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

// Clean up any old snake_case aliases or ceh.json in public/data/
const obsoleteFiles = [
  'sec_plus.json',
  'netplus.json',
  'aplus_core1.json',
  'aplus_core2.json',
  'ceh.json'
];
for (const file of obsoleteFiles) {
  const p = path.join(outputDir, file);
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
    console.log(`[Clean] Deleted obsolete alias: ${file}`);
  }
}

const rawData = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const questions = rawData.questions || [];

console.log(`Processing ${questions.length} total questions from officialQuestions.json...`);

const mapping = {
  'security-plus': {
    name: 'CompTIA Security+',
    code: 'SY0-701',
    terms: ['CompTIA Security+', 'secplus'],
    fileName: 'security-plus.json'
  },
  'ccna': {
    name: 'Cisco CCNA',
    code: '200-301',
    terms: ['Cisco CCNA', 'ccna'],
    fileName: 'ccna.json'
  },
  'network-plus': {
    name: 'CompTIA Network+',
    code: 'N10-008',
    terms: ['CompTIA Network+', 'netplus'],
    fileName: 'network-plus.json'
  },
  'a-plus-core1': {
    name: 'CompTIA A+ Core 1',
    code: '220-1101',
    terms: ['CompTIA A+ Core 1', 'aplus_core1'],
    fileName: 'a-plus-core1.json'
  },
  'a-plus-core2': {
    name: 'CompTIA A+ Core 2',
    code: '220-1102',
    terms: ['CompTIA A+ Core 2', 'aplus_core2'],
    fileName: 'a-plus-core2.json'
  }
};

const certBuckets = {
  'security-plus': [],
  'ccna': [],
  'network-plus': [],
  'a-plus-core1': [],
  'a-plus-core2': []
};

for (const q of questions) {
  const cert = (q.certification || '').toLowerCase();
  const cat = (q.sourceCategory || '').toLowerCase();

  let matched = false;
  for (const [key, conf] of Object.entries(mapping)) {
    if (conf.terms.some(t => cert.includes(t.toLowerCase()) || cat.includes(t.toLowerCase()))) {
      certBuckets[key].push(q);
      matched = true;
      break;
    }
  }

  if (!matched) {
    console.warn(`Unmatched question: id=${q.id}, cert=${q.certification}, cat=${q.sourceCategory}`);
  }
}

const metadataIndex = [];

for (const [key, conf] of Object.entries(mapping)) {
  const list = certBuckets[key];
  console.log(`Bucket ${key}: ${list.length} questions`);
  const filePath = path.join(outputDir, conf.fileName);
  fs.writeFileSync(filePath, JSON.stringify(list), 'utf8');
  const stats = fs.statSync(filePath);
  console.log(`  -> Wrote ${conf.fileName} (${(stats.size / 1024).toFixed(1)} kB)`);

  metadataIndex.push({
    id: key,
    name: conf.name,
    code: conf.code,
    questionCount: list.length,
    file: conf.fileName
  });
}

const indexPath = path.join(outputDir, 'cert-index.json');
fs.writeFileSync(indexPath, JSON.stringify(metadataIndex, null, 2), 'utf8');
console.log(`Wrote cert-index.json successfully with ${metadataIndex.length} certifications.`);
