import { EloRankInfo, EloRankTier } from '../types';

export const ELO_RANKS: EloRankInfo[] = [
  {
    tier: 'Script Kiddie',
    minElo: 0,
    maxElo: 799,
    badgeColor: '#94A3B8', // Slate grey
    glowColor: 'rgba(148, 163, 184, 0.3)',
    iconName: 'Terminal',
    description: 'Esegue script automatizzati e scanner generici. Sta imparando le basi del terminale e della sintassi dei payload.'
  },
  {
    tier: 'Packet Sniffer',
    minElo: 800,
    maxElo: 1199,
    badgeColor: '#06B6D4', // Cyan
    glowColor: 'rgba(6, 182, 212, 0.4)',
    iconName: 'Radio',
    description: 'Analizza frame Ethernet e handshake TCP con Wireshark. Comprende la manipolazione delle intestazioni e il subnetting.'
  },
  {
    tier: 'Red Teamer',
    minElo: 1200,
    maxElo: 1599,
    badgeColor: '#6366F1', // Electric Indigo
    glowColor: 'rgba(99, 102, 241, 0.5)',
    iconName: 'Crosshair',
    description: 'Esegue privilege escalation su Linux/Windows, bypass WAF e sfrutta vulnerabilità applicative OWASP Top 10.'
  },
  {
    tier: 'APT Operator',
    minElo: 1600,
    maxElo: 1999,
    badgeColor: '#F59E0B', // Amber Gold
    glowColor: 'rgba(245, 158, 11, 0.5)',
    iconName: 'ShieldAlert',
    description: 'Movimenti laterali avanzati, C2 beaconing personalizzato, memory injection e bypass di EDR in ambienti Active Directory.'
  },
  {
    tier: 'ZeroDay Hunter',
    minElo: 2000,
    maxElo: 3500,
    badgeColor: '#10B981', // Emerald Neon
    glowColor: 'rgba(16, 185, 129, 0.6)',
    iconName: 'Zap',
    description: 'Top Tier League. Ricercatore di vulnerabilità 0-day, reverse engineering di binari x86_64 e scrittura di exploit PoC.'
  }
];

export function getRankFromElo(elo: number): EloRankInfo {
  for (let i = ELO_RANKS.length - 1; i >= 0; i--) {
    if (elo >= ELO_RANKS[i].minElo) {
      return ELO_RANKS[i];
    }
  }
  return ELO_RANKS[0];
}

export function getNextRankProgress(elo: number): {
  currentTier: EloRankTier;
  nextTier: EloRankTier | null;
  progressPercent: number;
  pointsToNext: number;
} {
  const currentRank = getRankFromElo(elo);
  const currentIndex = ELO_RANKS.findIndex(r => r.tier === currentRank.tier);
  
  if (currentIndex === ELO_RANKS.length - 1) {
    return {
      currentTier: currentRank.tier,
      nextTier: null,
      progressPercent: 100,
      pointsToNext: 0
    };
  }

  const nextRank = ELO_RANKS[currentIndex + 1];
  const range = nextRank.minElo - currentRank.minElo;
  const gained = elo - currentRank.minElo;
  const progressPercent = Math.min(100, Math.max(0, Math.round((gained / range) * 100)));
  const pointsToNext = nextRank.minElo - elo;

  return {
    currentTier: currentRank.tier,
    nextTier: nextRank.tier,
    progressPercent,
    pointsToNext
  };
}
