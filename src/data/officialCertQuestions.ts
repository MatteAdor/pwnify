import rawQuestionsData from './officialQuestions.json';

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

export const ALL_OFFICIAL_QUESTIONS: OfficialCertQuestion[] = (rawQuestionsData.questions || []) as OfficialCertQuestion[];

// Map of canonical certification IDs to questions
const CERT_CATEGORY_MAP: Record<string, string[]> = {
  sec_plus: ['CompTIA Security+', 'secplus'],
  ccna: ['Cisco CCNA', 'ccna'],
  aplus_core1: ['CompTIA A+ Core 1', 'aplus_core1'],
  aplus_core2: ['CompTIA A+ Core 2', 'aplus_core2'],
  netplus: ['CompTIA Network+', 'netplus'],
};

/**
 * Retrieve all questions matching a specific certification key or sourceCategory
 */
export function getQuestionsForCert(certKey: string): OfficialCertQuestion[] {
  const normalizedKey = certKey.toLowerCase();
  const searchTerms = CERT_CATEGORY_MAP[normalizedKey] || [normalizedKey];

  return ALL_OFFICIAL_QUESTIONS.filter(q => {
    const cert = q.certification.toLowerCase();
    const cat = q.sourceCategory.toLowerCase();
    return searchTerms.some(term => cert.includes(term.toLowerCase()) || cat.includes(term.toLowerCase()));
  });
}

/**
 * Returns N random questions for a certification (ideal for Quick Check quizzes)
 */
export function getRandomQuestionsForCert(certKey: string, count = 5): OfficialCertQuestion[] {
  const pool = getQuestionsForCert(certKey);
  if (!pool.length) {
    // Fallback: return any questions from the general pool
    return [...ALL_OFFICIAL_QUESTIONS].sort(() => 0.5 - Math.random()).slice(0, count);
  }
  return [...pool].sort(() => 0.5 - Math.random()).slice(0, count);
}

/**
 * Returns available certification metadata
 */
export function getAvailableCertifications(): CertSummary[] {
  return [
    { name: 'CompTIA Security+', code: 'SY0-701', category: 'sec_plus', questionCount: getQuestionsForCert('sec_plus').length },
    { name: 'Cisco CCNA', code: '200-301', category: 'ccna', questionCount: getQuestionsForCert('ccna').length },
    { name: 'CompTIA Network+', code: 'N10-008', category: 'netplus', questionCount: getQuestionsForCert('netplus').length },
    { name: 'CompTIA A+ Core 1', code: '220-1101', category: 'aplus_core1', questionCount: getQuestionsForCert('aplus_core1').length },
    { name: 'CompTIA A+ Core 2', code: '220-1102', category: 'aplus_core2', questionCount: getQuestionsForCert('aplus_core2').length },
  ];
}
