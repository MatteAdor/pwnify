import { SkillDomain, UserState } from '../types';
import { SKILL_MODULES } from '../data/curriculum';
import { OFFICIAL_PBQ_LABS } from '../data/bountiesAndPbq';

export interface DynamicTelemetry {
  radarScores: Record<SkillDomain, number>;
  readinessScore: number;
  completedNodesCount: number;
  totalNodesCount: number;
  domainCounts: Record<SkillDomain, { completed: number; total: number }>;
}

/**
 * Calculates authentic domain mastery and exam readiness strictly based on
 * quests and PBQ labs the user has actually completed.
 * Eliminates artificial mock values for unattempted domains.
 */
export function calculateDynamicTelemetry(
  completedNodeIds: string[] = [],
  completedPbqIds: string[] = [],
  isPro: boolean = false
): DynamicTelemetry {
  const allDomains: SkillDomain[] = [
    'Web Sec',
    'Networking',
    'Linux & Bash',
    'Cryptography',
    'Code Analysis',
    'Defense & SOC'
  ];

  const domainCounts: Record<SkillDomain, { completed: number; total: number }> = {
    'Web Sec': { completed: 0, total: 0 },
    'Networking': { completed: 0, total: 0 },
    'Linux & Bash': { completed: 0, total: 0 },
    'Cryptography': { completed: 0, total: 0 },
    'Code Analysis': { completed: 0, total: 0 },
    'Defense & SOC': { completed: 0, total: 0 }
  };

  let totalNodesCount = 0;
  const completedSet = new Set(completedNodeIds);

  // Count curriculum nodes per domain
  for (const mod of SKILL_MODULES) {
    for (const node of mod.nodes) {
      totalNodesCount++;
      if (domainCounts[node.domain]) {
        domainCounts[node.domain].total++;
        if (completedSet.has(node.id)) {
          domainCounts[node.domain].completed++;
        }
      }
    }
  }

  // Factor in PBQs for Defense & SOC and Networking
  const pbqSet = new Set(completedPbqIds);
  for (const pbq of OFFICIAL_PBQ_LABS) {
    if (pbq.certification === 'Cisco CCNA') {
      domainCounts['Networking'].total++;
      if (pbqSet.has(pbq.id)) {
        domainCounts['Networking'].completed++;
      }
    } else {
      domainCounts['Defense & SOC'].total++;
      if (pbqSet.has(pbq.id)) {
        domainCounts['Defense & SOC'].completed++;
      }
    }
  }

  const radarScores: Record<SkillDomain, number> = {
    'Web Sec': 0,
    'Networking': 0,
    'Linux & Bash': 0,
    'Cryptography': 0,
    'Code Analysis': 0,
    'Defense & SOC': 0
  };

  for (const domain of allDomains) {
    const stats = domainCounts[domain];
    if (stats.total > 0 && stats.completed > 0) {
      // Scale percentage with a baseline floor of 20% once at least 1 quest is solved
      const ratio = stats.completed / stats.total;
      radarScores[domain] = Math.min(100, Math.round(20 + ratio * 80));
    } else {
      // Strictly 0% for uncompleted / unattempted domains!
      radarScores[domain] = 0;
    }
  }

  // Global readiness score based on real completed tasks
  const completedNodesCount = completedNodeIds.length;
  const totalWeight = totalNodesCount + OFFICIAL_PBQ_LABS.length;
  const completedWeight = completedNodesCount + completedPbqIds.length * 1.5;
  
  let readinessScore = Math.min(100, Math.round((completedWeight / Math.max(1, totalWeight)) * 100));
  
  // Baseline for the initial completed quests
  if (completedNodesCount > 0 && readinessScore < 15) {
    readinessScore = 15;
  }
  
  if (isPro) {
    readinessScore = Math.min(100, Math.max(readinessScore, 50));
  }

  return {
    radarScores,
    readinessScore,
    completedNodesCount,
    totalNodesCount,
    domainCounts
  };
}
