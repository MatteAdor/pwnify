export interface OfficialCertQuestion {
  id: string;
  certification: string;
  sourceCategory: string;
  question: string;
  options: string[];
  correctAnswer: string;
  correctIndex: number;
  explanation: string;
}

export interface CertSummary {
  name: string;
  code: string;
  category: string;
  questionCount: number;
}

// In-memory cache for loaded certification questions
const certQuestionCache = new Map<string, OfficialCertQuestion[]>();

// Mapping canonical keys to static data files in public/data/ (strictly kebab-case)
const CERT_FILE_MAP: Record<string, string> = {
  sec_plus: 'security-plus.json',
  'security-plus': 'security-plus.json',
  secplus: 'security-plus.json',
  ccna: 'ccna.json',
  aplus_core1: 'a-plus-core1.json',
  'a-plus-core1': 'a-plus-core1.json',
  aplus_core2: 'a-plus-core2.json',
  'a-plus-core2': 'a-plus-core2.json',
  netplus: 'network-plus.json',
  'network-plus': 'network-plus.json'
};

/**
 * Fetch questions for a certification on demand with in-memory caching.
 * Prevents bundling the ~750 kB question bank into main app bundles.
 */
export async function fetchQuestionsForCert(certKey: string): Promise<OfficialCertQuestion[]> {
  const normalizedKey = certKey.toLowerCase();
  
  // Return cached pool if previously loaded
  if (certQuestionCache.has(normalizedKey)) {
    return certQuestionCache.get(normalizedKey)!;
  }

  const fileName = CERT_FILE_MAP[normalizedKey];
  if (!fileName) {
    console.warn(`[CertQuestions] No question file mapped for certificate key: "${certKey}"`);
    return [];
  }

  const basePath = typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL 
    ? import.meta.env.BASE_URL 
    : '/';
  const url = `${basePath.endsWith('/') ? basePath : basePath + '/'}data/${fileName}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      // Fallback relative path for native/capacitor local runtimes
      const relRes = await fetch(`./data/${fileName}`);
      if (!relRes.ok) {
        throw new Error(`Failed to load questions from ${url} (status ${res.status})`);
      }
      const data: OfficialCertQuestion[] = await relRes.json();
      certQuestionCache.set(normalizedKey, data);
      return data;
    }
    const data: OfficialCertQuestion[] = await res.json();
    certQuestionCache.set(normalizedKey, data);
    return data;
  } catch (err) {
    console.warn(`[CertQuestions] Failed to fetch on-demand questions for ${certKey}:`, err);
    return [];
  }
}

/**
 * Asynchronously returns N random questions for a certification.
 */
export async function getRandomQuestionsForCertAsync(
  certKey: string,
  count = 5
): Promise<OfficialCertQuestion[]> {
  const pool = await fetchQuestionsForCert(certKey);
  if (!pool.length) {
    return [];
  }
  return [...pool].sort(() => 0.5 - Math.random()).slice(0, count);
}

/**
 * Synchronous accessor utilizing cached questions if already loaded.
 */
export function getRandomQuestionsForCert(certKey: string, count = 5): OfficialCertQuestion[] {
  const normalizedKey = certKey.toLowerCase();
  const pool = certQuestionCache.get(normalizedKey) || [];
  if (!pool.length) {
    return [];
  }
  return [...pool].sort(() => 0.5 - Math.random()).slice(0, count);
}

export function getQuestionsForCert(certKey: string): OfficialCertQuestion[] {
  const normalizedKey = certKey.toLowerCase();
  return certQuestionCache.get(normalizedKey) || [];
}

export const ALL_OFFICIAL_QUESTIONS: OfficialCertQuestion[] = [];

/**
 * Returns available certification metadata without bundling question arrays.
 */
export function getAvailableCertifications(): CertSummary[] {
  return [
    { name: 'CompTIA Security+', code: 'SY0-701', category: 'security-plus', questionCount: 314 },
    { name: 'Cisco CCNA', code: '200-301', category: 'ccna', questionCount: 402 },
    { name: 'CompTIA Network+', code: 'N10-008', category: 'network-plus', questionCount: 300 },
    { name: 'CompTIA A+ Core 1', code: '220-1101', category: 'a-plus-core1', questionCount: 303 },
    { name: 'CompTIA A+ Core 2', code: '220-1102', category: 'a-plus-core2', questionCount: 305 },
  ];
}
