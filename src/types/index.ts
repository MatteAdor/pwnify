export type EloRankTier = 
  | 'Script Kiddie' 
  | 'Packet Sniffer' 
  | 'Red Teamer' 
  | 'APT Operator' 
  | 'ZeroDay Hunter';

export interface EloRankInfo {
  tier: EloRankTier;
  minElo: number;
  maxElo: number;
  badgeColor: string;
  glowColor: string;
  iconName: string;
  description: string;
}

export type SkillDomain = 
  | 'Web Sec' 
  | 'Networking' 
  | 'Linux & Bash' 
  | 'Cryptography' 
  | 'Code Analysis' 
  | 'Defense & SOC';

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
  explanation?: string;
}

export type QuestionType = 
  | 'multiple_choice' 
  | 'spot_the_zeroday' 
  | 'terminal_command' 
  | 'packet_analysis';

export interface CodeLine {
  lineNum: number;
  code: string;
  isVulnerable?: boolean;
  vulnerabilityHint?: string;
}

export interface HardcoreQuestion {
  id: string;
  title: string;
  type: QuestionType;
  domain: SkillDomain;
  difficulty: 'Beginner' | 'Intermediate' | 'Hardcore' | 'Zero-Day';
  prompt: string;
  language?: string;
  codeSnippet?: string;
  codeLines?: CodeLine[];
  terminalPrompt?: string;
  terminalOutput?: string[];
  packetHeaders?: { [key: string]: string };
  commandPrefix?: string;
  commandTarget?: string;
  commandChips?: string[];
  options: QuestionOption[];
  rootCauseBreakdown: {
    cveOrTopic: string;
    whyItWorks: string;
    patchRecommendation: string;
    terminalProof: string;
  };
  xpReward: number;
  eloReward: number;
}

export interface SkillNode {
  id: string;
  title: string;
  subtitle: string;
  moduleId: string;
  status: 'locked' | 'available' | 'completed';
  domain: SkillDomain;
  xpReward: number;
  eloReward: number;
  questions: HardcoreQuestion[];
}

export interface SkillModule {
  id: string;
  title: string;
  certificationFocus: string;
  color: string;
  nodes: SkillNode[];
}

export interface DailyBounty {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  isCompleted: boolean;
  freeClaimed: boolean;
  proClaimed: boolean;
  freeXp: number;
  proXp: number;
  proTickets: number;
}

export interface UserState {
  username: string;
  isPro: boolean;
  streakDays: number;
  streakShieldActive: boolean;
  elo: number;
  arenaTickets: number; // Max 3 for free users
  maxTickets: number;
  winStreak: number;
  xp: number;
  readinessScore: number; // 0 - 100%
  completedNodeIds: string[];
  completedPbqIds: string[];
  dailyBounties: DailyBounty[];
  goal: string;
  experienceLevel: string;
  dailyCommitment: number; // minutes
  onboardingCompleted: boolean;
  radarScores: {
    'Web Sec': number;
    'Networking': number;
    'Linux & Bash': number;
    'Cryptography': number;
    'Code Analysis': number;
    'Defense & SOC': number;
  };
  licenseKey?: string;
}

export type PaywallContext = 
  | 'diagnostic_funnel' 
  | 'blurred_breakdown' 
  | 'win_streak_trap' 
  | 'weakness_drill' 
  | 'xp_boost_shield'
  | 'exam_simulator_lock'
  | 'bounty_crate_lock'
  | 'manual_upgrade';

export interface PaywallTriggerInfo {
  isOpen: boolean;
  context: PaywallContext;
  title?: string;
  subtitle?: string;
}

export interface PvPPlayer {
  id: string;
  name: string;
  avatar: string;
  elo: number;
  rank: EloRankTier;
  winStreak: number;
  isBot?: boolean;
  targetScore?: number;
}

export interface PvPChallenge {
  id: string;
  question: string;
  codeSnippet?: string;
  options: { id: string; text: string; isCorrect: boolean }[];
  timeLimitSec: number;
  tier?: 'beginner' | 'intermediate' | 'advanced';
  minElo?: number;
}

export interface LeagueHacker {
  rankPosition: number;
  username: string;
  avatar: string;
  tier: EloRankTier;
  xp: number;
  isUser?: boolean;
  winStreak: number;
  status: 'promoted' | 'safe' | 'demoted';
}

export interface PbqStep {
  id: string;
  instruction: string;
  scenario: string;
  ruleAction: 'ALLOW' | 'DENY';
  sourceIp: string;
  destinationPort: string;
  protocol: 'TCP' | 'UDP' | 'ICMP';
  isCorrectConfig?: boolean;
}

export interface PbqLab {
  id: string;
  title: string;
  certification: 'CompTIA Security+' | 'Cisco CCNA' | 'CEH v13';
  scenarioDescription: string;
  targetObjective: string;
  steps: PbqStep[];
  solutionExplanation: string;
  xpReward: number;
  eloReward: number;
}
