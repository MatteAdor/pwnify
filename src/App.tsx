import React, { useState, useEffect } from 'react';
import { UserState, SkillNode, PaywallContext } from './types';
import { INITIAL_DAILY_BOUNTIES } from './data/bountiesAndPbq';
import { Navbar } from './components/Navbar';
import { BottomNav, ActiveTab } from './components/BottomNav';
import { OnboardingFunnel } from './components/Onboarding/OnboardingFunnel';
import { TacticalSkillTree } from './components/SkillTree/TacticalSkillTree';
import { InteractiveQuizModal } from './components/Quiz/InteractiveQuizModal';
import { ArenaPvP, DuelChallengeData } from './components/Arena/ArenaPvP';
import { LeagueTab } from './components/Leaderboard/LeagueTab';
import { ReadinessRadar } from './components/Analytics/ReadinessRadar';
import { CertPrepTab } from './components/Certs/CertPrepTab';
import { PaywallModal } from './components/Paywall/PaywallModal';
import { HackerIDCardModal } from './components/Viral/HackerIDCardModal';
import { DailyBreachModal } from './components/DailyBreach/DailyBreachModal';
import { CyberArsenalModal, TerminalThemeId } from './components/Arsenal/CyberArsenalModal';
import { AuthModal } from './components/Auth/AuthModal';
import { generateLicenseKey, verifyLicenseKey } from './utils/licenseEngine';
import { calculateDynamicTelemetry } from './utils/readinessEngine';
import { 
  createDefaultGuestState, 
  purgeLegacyStorage, 
  getCurrentSession, 
  setCurrentSession, 
  persistActiveAccountState, 
  UserAccount 
} from './utils/userDatabase';
import { sound } from './utils/soundEngine';
import { 
  sanitizeCallsign, 
  sanitizeAlphanumeric, 
  clampNumber, 
  verifyCheckoutToken 
} from './utils/security';
import { Swords, Zap, Check, Copy, Download, Sparkles, ShieldCheck, Edit3 } from 'lucide-react';
import confetti from 'canvas-confetti';

const THEME_BG_MAP: Record<TerminalThemeId, string> = {
  cyber_emerald: 'bg-[#090D16]',
  matrix_phosphor: 'bg-[#030d06]',
  cyberpunk_neon: 'bg-[#0c071a]',
  amber_crt: 'bg-[#120b04]',
  stealth_oled: 'bg-[#000000]'
};

export const App: React.FC = () => {
  // Load initial state from active user database session or fallback to clean guest state
  const [userState, setUserState] = useState<UserState>(() => {
    try {
      purgeLegacyStorage();
      const session = getCurrentSession();
      if (session && session.userState) {
        return session.userState;
      }
    } catch (e) {
      console.error('Failed to parse active user session', e);
    }
    return createDefaultGuestState();
  });

  // Persist userState to database on every state mutation
  useEffect(() => {
    try {
      persistActiveAccountState(userState);
    } catch (e) {
      console.error('Failed to persist user state to database', e);
    }
  }, [userState]);

  // God Mode Protected Dev Toolbar State (Strictly restricted to local development)
  const [isGodMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    // Defense against production bypass: Never enable dev toolbar outside localhost
    if (!isLocal) return false;
    const hasSession = sessionStorage.getItem('0x_godmode') === 'true';
    const params = new URLSearchParams(window.location.search);
    const hasParam = params.get('godmode') === '0xadmin';
    if (hasParam) {
      sessionStorage.setItem('0x_godmode', 'true');
      return true;
    }
    return hasSession;
  });

  // Navigation State
  const [activeTab, setActiveTab] = useState<ActiveTab>('tree');

  // Interactive Quiz Modal State
  const [selectedNode, setSelectedNode] = useState<SkillNode | null>(null);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState<boolean>(false);

  // Paywall Modal State
  const [isPaywallOpen, setIsPaywallOpen] = useState<boolean>(false);
  const [paywallContext, setPaywallContext] = useState<PaywallContext>('manual_upgrade');

  // Viral Hacker ID Card Modal State
  const [isHackerCardOpen, setIsHackerCardOpen] = useState<boolean>(false);

  // Incoming URL Duel Deep-Linking State
  const [incomingDuel, setIncomingDuel] = useState<DuelChallengeData | null>(null);
  const [activeDuelForArena, setActiveDuelForArena] = useState<DuelChallengeData | null>(null);

  // Post-Checkout Stripe / LemonSqueezy Verified State
  const [verifiedCheckoutLicense, setVerifiedCheckoutLicense] = useState<string | null>(null);
  const [licenseCopied, setLicenseCopied] = useState<boolean>(false);

  // Daily 0xBreach CVE Triage State
  const [isDailyBreachOpen, setIsDailyBreachOpen] = useState<boolean>(false);

  // Cyber Arsenal & Customizer State
  const [isArsenalOpen, setIsArsenalOpen] = useState<boolean>(false);
  const [currentTheme, setCurrentTheme] = useState<TerminalThemeId>(() => {
    try {
      return (localStorage.getItem('0x_arsenal_theme') as TerminalThemeId) || 'cyber_emerald';
    } catch {
      return 'cyber_emerald';
    }
  });
  const [currentTitle, setCurrentTitle] = useState<string>(() => {
    try {
      return localStorage.getItem('0x_arsenal_title') || 'Script Kiddie';
    } catch {
      return 'Script Kiddie';
    }
  });

  // Intercept ?seed=... or authenticated checkout returns on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search) {
      const params = new URLSearchParams(window.location.search);

      // Check 1: Post-checkout return verification (Defends against URL paywall bypass)
      const isCheckoutVerified = verifyCheckoutToken(params, userState.username);
      const incomingLicense = params.get('license');

      if (isCheckoutVerified || (incomingLicense && verifyLicenseKey(incomingLicense))) {
        const key = incomingLicense && verifyLicenseKey(incomingLicense) 
          ? incomingLicense 
          : generateLicenseKey(userState.username);
        setUserState(prev => ({
          ...prev,
          isPro: true,
          streakShieldActive: true,
          readinessScore: 92,
          licenseKey: key
        }));
        setVerifiedCheckoutLicense(key);
        sound.playVictoryFanfare();
        confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
        if (window.history) {
          window.history.replaceState({}, '', window.location.pathname);
        }
        return;
      }

      // Check 2: Incoming Duel Challenge (Strict input sanitization)
      const rawSeed = params.get('seed');
      if (rawSeed) {
        const seed = sanitizeAlphanumeric(rawSeed, 32, 'blitz_' + Math.floor(Math.random() * 10000));
        const elo = clampNumber(params.get('elo'), 100, 3000, 1350);
        const challenger = sanitizeCallsign(params.get('challenger'), '0x_Morpheus');
        const score = clampNumber(params.get('score'), 0, 5, 4);
        setIncomingDuel({ seed, elo, challenger, score });
        sound.playRadarPing();
      }
    }
  }, [userState.username]);

  // Update Callsign / Username handler with strict sanitization
  const handleUpdateUsername = (newName: string) => {
    const sanitized = sanitizeCallsign(newName, userState.username);
    if (!sanitized) return;
    setUserState(prev => ({
      ...prev,
      username: sanitized
    }));
  };

  // Restore License Key handler with cryptographic verification
  const handleRestoreLicense = (key: string) => {
    if (!verifyLicenseKey(key)) {
      sound.playPayloadBlocked();
      return;
    }
    setUserState(prev => ({
      ...prev,
      isPro: true,
      streakShieldActive: true,
      readinessScore: 92,
      licenseKey: key
    }));
  };

  // Download License Certificate File
  const handleDownloadLicenseCertificate = (key: string) => {
    sound.playTap();
    const fileContent = `=====================================================
ZERODAY // 0xDAY CYBER WARFARE ACADEMY
PRO OPERATOR LICENSE CERTIFICATE
=====================================================
Operator Callsign: ${userState.username}
License Key:       ${key}
Status:            AUTHENTICATED & ACTIVE
Features Unlocked:
  - Full Official Exam Simulators (CompTIA Sec+, CCNA, CEH)
  - Interactive PBQ Labs with Real-Time Validation
  - Unlimited 1v1 Blitz Arena Tickets & Win Streak Shields
  - Uncensored Root Cause Exploit Breakdowns & PoCs
  - 2x XP Multiplier & Weekly League Safe Shield
Issued:            ${new Date().toISOString()}
Verification:      Zero-Knowledge Algorithmic Checksum Passed
=====================================================`;

    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const safeUser = sanitizeAlphanumeric(userState.username, 24, 'operator');
    const link = document.createElement('a');
    link.href = url;
    link.download = `zeroday_pro_license_${safeUser}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Accept incoming challenge -> jump straight to Arena battle against ghost
  const handleAcceptDuel = () => {
    if (!incomingDuel) return;
    sound.playExploitSuccess();
    setActiveDuelForArena(incomingDuel);
    setActiveTab('arena');
    setIncomingDuel(null);
    if (typeof window !== 'undefined' && window.history) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  const handleDeclineDuel = () => {
    sound.playTap();
    setIncomingDuel(null);
    if (typeof window !== 'undefined' && window.history) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  // Quick Simulation Helper for testing incoming duel deep-link
  const handleSimulateIncomingDuel = () => {
    sound.playRadarPing();
    setIncomingDuel({
      seed: 'blitz_' + Math.floor(Math.random() * 90000 + 10000),
      elo: 1480,
      challenger: '0x_NeoCyber',
      score: 4
    });
  };

  // Cyber Arsenal Theme & Callsign Handlers
  const handleSelectTheme = (themeId: TerminalThemeId) => {
    setCurrentTheme(themeId);
    try {
      localStorage.setItem('0x_arsenal_theme', themeId);
    } catch (e) {
      console.error(e);
    }
    setUserState(prev => ({ ...prev, activeTheme: themeId }));
  };

  const handleSelectTitle = (title: string) => {
    setCurrentTitle(title);
    try {
      localStorage.setItem('0x_arsenal_title', title);
    } catch (e) {
      console.error(e);
    }
    setUserState(prev => ({ ...prev, customTitle: title }));
  };

  // Daily 0xBreach Completion Handler
  const handleDailyBreachSuccess = (xpGained: number, eloGained: number) => {
    setUserState(prev => {
      const xpMultiplier = prev.isPro ? 2 : 1;
      const currentStreak = prev.dailyBreachStreak || 0;
      const todayStr = new Date().toISOString().split('T')[0];
      return {
        ...prev,
        xp: prev.xp + xpGained * xpMultiplier,
        elo: prev.elo + eloGained,
        dailyBreachStreak: currentStreak + 1,
        lastDailyBreachDate: todayStr,
        readinessScore: Math.min(100, prev.readinessScore + 5)
      };
    });
  };

  // Operator Authentication Modal State
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);

  const handleLoginSuccess = (account: UserAccount) => {
    setUserState(account.userState);
  };

  const handleLogout = () => {
    setCurrentSession(null);
    setUserState(createDefaultGuestState());
  };

  // Trigger Paywall Helper
  const triggerPaywall = (context: PaywallContext) => {
    // 1. If PRO is already active, NEVER prompt paywall!
    if (userState.isPro) return;

    // 2. If user already saw the trial, don't show it again unless it's an explicit manual upgrade click
    if (userState.hasSeenTrial && context !== 'manual_upgrade') {
      return;
    }

    // Mark trial as seen so it only appears once in total
    if (!userState.hasSeenTrial) {
      setUserState(prev => ({ ...prev, hasSeenTrial: true }));
    }

    setPaywallContext(context);
    setIsPaywallOpen(true);
  };

  // Toggle Dev PRO Mode
  const handleTogglePro = () => {
    setUserState(prev => {
      const nextPro = !prev.isPro;
      const tele = calculateDynamicTelemetry(prev.completedNodeIds, prev.completedPbqIds, nextPro);
      return {
        ...prev,
        isPro: nextPro,
        streakShieldActive: nextPro,
        readinessScore: nextPro ? Math.max(92, tele.readinessScore) : tele.readinessScore
      };
    });
  };

  // Reset Demo Data
  const handleResetData = () => {
    setCurrentSession(null);
    setUserState(createDefaultGuestState());
    setActiveTab('tree');
  };

  // Onboarding Complete Handler
  const handleOnboardingComplete = (data: {
    goal: string;
    level: string;
    commitment: number;
    readinessScore: number;
  }) => {
    setUserState(prev => ({
      ...prev,
      goal: data.goal,
      experienceLevel: data.level,
      dailyCommitment: data.commitment,
      readinessScore: data.readinessScore,
      onboardingCompleted: true
    }));
  };

  // Skill Node Click Handler
  const handleSelectNode = (node: SkillNode) => {
    sound.playTap();
    setSelectedNode(node);
    setIsQuizModalOpen(true);
  };

  // Node Completion Handler (Quiz)
  const handleCompleteNode = (nodeId: string, gainedXp: number, gainedElo: number) => {
    setUserState(prev => {
      const xpMultiplier = prev.isPro ? 2 : 1;
      const updatedBounties = (prev.dailyBounties || INITIAL_DAILY_BOUNTIES).map(b => {
        if (b.id === 'bounty_zeroday') {
          const nextProg = Math.min(b.target, b.progress + 1);
          return { ...b, progress: nextProg, isCompleted: nextProg >= b.target };
        }
        if (b.id === 'bounty_terminal') {
          return { ...b, progress: b.target, isCompleted: true };
        }
        return b;
      });

      return {
        ...prev,
        xp: prev.xp + gainedXp * xpMultiplier,
        elo: prev.elo + gainedElo,
        readinessScore: Math.min(100, prev.readinessScore + 6),
        completedNodeIds: prev.completedNodeIds.includes(nodeId)
          ? prev.completedNodeIds
          : [...prev.completedNodeIds, nodeId],
        dailyBounties: updatedBounties
      };
    });
  };

  // Arena Ticket Consumption
  const handleConsumeTicket = (): boolean => {
    if (userState.isPro) return true;
    if (userState.arenaTickets <= 0) return false;

    setUserState(prev => ({
      ...prev,
      arenaTickets: Math.max(0, prev.arenaTickets - 1)
    }));
    return true;
  };

  // Arena PvP Win/Loss Handlers
  const handleWinMatch = (eloGain: number) => {
    setUserState(prev => {
      const xpMultiplier = prev.isPro ? 2 : 1;
      const updatedBounties = (prev.dailyBounties || INITIAL_DAILY_BOUNTIES).map(b => {
        if (b.id === 'bounty_pvp') {
          const nextProg = Math.min(b.target, b.progress + 1);
          return { ...b, progress: nextProg, isCompleted: nextProg >= b.target };
        }
        return b;
      });

      return {
        ...prev,
        elo: prev.elo + eloGain,
        winStreak: prev.winStreak + 1,
        xp: prev.xp + 80 * xpMultiplier,
        readinessScore: Math.min(100, prev.readinessScore + 3),
        dailyBounties: updatedBounties
      };
    });
  };

  const handleLossMatch = (eloLoss: number) => {
    setUserState(prev => ({
      ...prev,
      elo: Math.max(100, prev.elo - eloLoss),
      winStreak: 0
    }));
  };

  // Daily Bug Bounty Claim Handlers
  const handleClaimFreeBounty = (bountyId: string) => {
    const bounty = userState.dailyBounties.find(b => b.id === bountyId);
    if (!bounty || bounty.freeClaimed) return;

    sound.playExploitSuccess();
    setUserState(prev => {
      const updated = prev.dailyBounties.map(b =>
        b.id === bountyId ? { ...b, freeClaimed: true } : b
      );
      return {
        ...prev,
        xp: prev.xp + bounty.freeXp,
        dailyBounties: updated
      };
    });
  };

  const handleClaimProBounty = (bountyId: string) => {
    if (!userState.isPro) {
      sound.playPayloadBlocked();
      triggerPaywall('bounty_crate_lock');
      return;
    }

    const bounty = userState.dailyBounties.find(b => b.id === bountyId);
    if (!bounty || bounty.proClaimed) return;

    sound.playVictoryFanfare();
    setUserState(prev => {
      const updated = prev.dailyBounties.map(b =>
        b.id === bountyId ? { ...b, proClaimed: true } : b
      );
      return {
        ...prev,
        xp: prev.xp + bounty.proXp,
        arenaTickets: prev.arenaTickets + bounty.proTickets,
        dailyBounties: updated
      };
    });
  };

  // PBQ Lab Completion Handler
  const handleCompletePbq = (pbqId: string, gainedXp: number, gainedElo: number) => {
    setUserState(prev => {
      const alreadyDone = prev.completedPbqIds?.includes(pbqId);
      return {
        ...prev,
        xp: prev.xp + (prev.isPro ? gainedXp * 2 : gainedXp),
        elo: prev.elo + gainedElo,
        readinessScore: Math.min(100, prev.readinessScore + 8),
        completedPbqIds: alreadyDone
          ? prev.completedPbqIds
          : [...(prev.completedPbqIds || []), pbqId]
      };
    });
  };

  // Sudden Death Survival Mode Score Handler
  const handleUpdateSurvivalScore = (newScore: number, gainedXp: number) => {
    setUserState(prev => {
      const currentBest = prev.survivalHighScore || 0;
      return {
        ...prev,
        survivalHighScore: Math.max(currentBest, newScore),
        xp: prev.xp + (prev.isPro ? gainedXp * 2 : gainedXp),
        readinessScore: Math.min(100, prev.readinessScore + Math.min(5, newScore))
      };
    });
  };

  return (
    <div className={`min-h-screen ${THEME_BG_MAP[currentTheme] || 'bg-[#090D16]'} text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300 transition-colors duration-300`}>
      {/* Onboarding Mode vs App Mode */}
      {!userState.onboardingCompleted ? (
        <OnboardingFunnel
          onComplete={handleOnboardingComplete}
          onOpenPaywall={() => triggerPaywall('diagnostic_funnel')}
        />
      ) : (
        <>
          {/* Tactical Navbar */}
          <Navbar
            userState={userState}
            onTogglePro={handleTogglePro}
            onOpenPaywall={() => triggerPaywall('manual_upgrade')}
            onResetData={handleResetData}
            isGodMode={isGodMode}
            onOpenDailyBreach={() => setIsDailyBreachOpen(true)}
            onOpenArsenal={() => setIsArsenalOpen(true)}
            onOpenAuth={() => setIsAuthOpen(true)}
          />

          {/* Subheader Interactive Demo Toolbar (Protected by God Mode) */}
          {isGodMode && (
            <div className="bg-[#0c1220] border-b border-white/5 py-1 px-4 text-center flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-[11px] font-mono text-slate-400 animate-fade-in">
              <span className="text-emerald-400 font-bold">🎯 SHORTCUT TEST:</span>
              <button
                onClick={() => {
                  sound.playTap();
                  setUserState(prev => ({ ...prev, onboardingCompleted: false }));
                }}
                className="text-slate-300 hover:text-emerald-300 underline"
              >
                Riavvia Onboarding
              </button>
              <span className="text-slate-600">|</span>
              <button
                onClick={() => {
                  sound.playTap();
                  setUserState(prev => ({ ...prev, arenaTickets: 0, winStreak: 3 }));
                }}
                className="text-amber-400 hover:text-amber-300 underline font-semibold"
              >
                Azzera Ticket a 0/3 (Win Streak Trap)
              </button>
              <span className="text-slate-600">|</span>
              <button
                onClick={handleSimulateIncomingDuel}
                className="text-rose-400 hover:text-rose-300 underline font-bold"
              >
                ⚡ Simula Link Sfida Ricevuto
              </button>
              <span className="text-slate-600">|</span>
              <button
                onClick={() => {
                  sound.playTap();
                  const key = generateLicenseKey(userState.username);
                  setVerifiedCheckoutLicense(key);
                  setUserState(prev => ({ ...prev, isPro: true, streakShieldActive: true, readinessScore: 92, licenseKey: key }));
                  sound.playVictoryFanfare();
                  confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
                }}
                className="text-cyan-400 hover:text-cyan-300 underline font-bold"
              >
                🔓 Simula Return-URL Stripe
              </button>
              <span className="text-slate-600">|</span>
              <button
                onClick={() => {
                  sound.playTap();
                  triggerPaywall('manual_upgrade');
                }}
                className="text-amber-400 hover:text-amber-300 underline"
              >
                Test Exit-Intent Downsell (-50%)
              </button>
              <span className="text-slate-600">|</span>
              <button
                onClick={() => {
                  sound.playTap();
                  setIsHackerCardOpen(true);
                }}
                className="text-emerald-400 hover:text-emerald-300 underline font-bold"
              >
                Hacker Card (9:16)
              </button>
            </div>
          )}

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto">
            {activeTab === 'tree' && (
              <TacticalSkillTree
                userState={userState}
                onSelectNode={handleSelectNode}
                onOpenPaywall={() => triggerPaywall('manual_upgrade')}
                onOpenPaywallContext={triggerPaywall}
                onClaimFreeBounty={handleClaimFreeBounty}
                onClaimProBounty={handleClaimProBounty}
              />
            )}

            {activeTab === 'arena' && (
              <ArenaPvP
                userState={userState}
                onConsumeTicket={handleConsumeTicket}
                onWinMatch={handleWinMatch}
                onLossMatch={handleLossMatch}
                onOpenPaywall={(ctx) => triggerPaywall(ctx)}
                onOpenHackerCard={() => setIsHackerCardOpen(true)}
                initialDuelChallenge={activeDuelForArena}
                onClearInitialDuel={() => setActiveDuelForArena(null)}
                onUpdateSurvivalScore={handleUpdateSurvivalScore}
              />
            )}

            {activeTab === 'leagues' && (
              <LeagueTab
                userState={userState}
                onOpenPaywall={(ctx) => triggerPaywall(ctx)}
              />
            )}

            {activeTab === 'radar' && (
              <ReadinessRadar
                userState={userState}
                onOpenPaywall={(ctx) => triggerPaywall(ctx)}
                onOpenHackerCard={() => setIsHackerCardOpen(true)}
              />
            )}

            {activeTab === 'certs' && (
              <CertPrepTab
                userState={userState}
                onOpenPaywallContext={triggerPaywall}
                onCompletePbq={handleCompletePbq}
              />
            )}
          </main>

          {/* Bottom Persistent Navigation */}
          <BottomNav
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            winStreak={userState.winStreak}
          />

          {/* Hardcore Interactive Quiz Modal */}
          {selectedNode && (
            <InteractiveQuizModal
              node={selectedNode}
              isOpen={isQuizModalOpen}
              onClose={() => setIsQuizModalOpen(false)}
              isPro={userState.isPro}
              onOpenPaywall={() => triggerPaywall('blurred_breakdown')}
              onCompleteNode={handleCompleteNode}
            />
          )}

          {/* Operator Authentication Modal (Login / Sign Up) */}
          <AuthModal
            isOpen={isAuthOpen}
            onClose={() => setIsAuthOpen(false)}
            userState={userState}
            onLoginSuccess={handleLoginSuccess}
            onLogout={handleLogout}
          />

          {/* ZeroDay PRO Paywall Modal (with Exit-Intent Downsell, Stripe Bridge & License Restore) */}
          <PaywallModal
            isOpen={isPaywallOpen && !userState.isPro}
            onClose={() => setIsPaywallOpen(false)}
            context={paywallContext}
            winStreak={userState.winStreak}
            onRestoreLicense={handleRestoreLicense}
            onUpgradeSuccess={() => {
              const key = generateLicenseKey(userState.username);
              setUserState(prev => ({
                ...prev,
                isPro: true,
                streakShieldActive: true,
                readinessScore: 92,
                licenseKey: key
              }));
            }}
          />

          {/* Viral Hacker Operator ID Card Modal (9:16) */}
          <HackerIDCardModal
            isOpen={isHackerCardOpen}
            onClose={() => setIsHackerCardOpen(false)}
            userState={userState}
            onUpdateUsername={handleUpdateUsername}
          />

          {/* Daily 0xBreach CVE Triage Modal */}
          <DailyBreachModal
            isOpen={isDailyBreachOpen}
            onClose={() => setIsDailyBreachOpen(false)}
            userState={userState}
            onSuccess={handleDailyBreachSuccess}
            onOpenPaywallContext={(ctx) => triggerPaywall(ctx)}
          />

          {/* Cyber Arsenal & Terminal HUD Themes Modal */}
          <CyberArsenalModal
            isOpen={isArsenalOpen}
            onClose={() => setIsArsenalOpen(false)}
            userState={userState}
            currentTheme={currentTheme}
            currentTitle={currentTitle}
            onSelectTheme={handleSelectTheme}
            onSelectTitle={handleSelectTitle}
            onOpenPaywallContext={(ctx) => triggerPaywall(ctx)}
          />

          {/* Incoming Cyber Duel Challenge Deep-Link Modal */}
          {incomingDuel && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in">
              <div className="relative w-full max-w-md bg-[#131B2E] border-2 border-indigo-500/60 rounded-3xl p-6 shadow-neon-indigo text-slate-100 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center mx-auto shadow-neon-indigo">
                  <Swords className="w-8 h-8 animate-pulse" />
                </div>

                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 mb-2">
                    ⚡ INCOMING CYBER DUEL CHALLENGE
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    Sfida 1v1 Ricevuta!
                  </h2>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    L'operatore <strong className="text-emerald-400 font-mono">{incomingDuel.challenger}</strong> (ELO <strong className="text-indigo-400 font-mono">{incomingDuel.elo}</strong>) ti ha sfidato sul seed <span className="font-mono text-slate-400">#{incomingDuel.seed}</span> con un punteggio di <strong className="text-amber-400 font-mono">{incomingDuel.score}/5</strong>.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#090D16] border border-white/5 font-mono text-xs text-slate-400 flex items-center justify-around">
                  <div>
                    <span className="text-[10px] block text-slate-500">SFIDANTE</span>
                    <span className="font-bold text-white">{incomingDuel.challenger}</span>
                  </div>
                  <div className="w-px h-6 bg-white/10" />
                  <div>
                    <span className="text-[10px] block text-slate-500">RATING</span>
                    <span className="font-bold text-indigo-400">{incomingDuel.elo} ELO</span>
                  </div>
                  <div className="w-px h-6 bg-white/10" />
                  <div>
                    <span className="text-[10px] block text-slate-500">TARGET SCORE</span>
                    <span className="font-bold text-amber-400">{incomingDuel.score}/5 Pts</span>
                  </div>
                </div>

                {/* Callsign Editor for Challenged User */}
                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                  <span>Il tuo Callsign:</span>
                  <strong className="text-white font-mono">{userState.username}</strong>
                  <button
                    onClick={() => {
                      sound.playTap();
                      const next = window.prompt('Modifica il tuo Callsign per questo duello:', userState.username);
                      if (next && next.trim()) handleUpdateUsername(next.trim());
                    }}
                    className="text-emerald-400 hover:underline font-mono text-[11px] flex items-center gap-0.5"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Modifica</span>
                  </button>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={handleAcceptDuel}
                    className="w-full py-4 px-4 rounded-xl font-mono font-extrabold text-sm sm:text-base text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-400 to-indigo-400 hover:from-emerald-300 hover:to-indigo-300 transition-all shadow-neon-emerald flex items-center justify-center gap-2 transform active:scale-98"
                  >
                    <Zap className="w-4 h-4 fill-slate-950" />
                    <span>ACCETTA LA SFIDA (GRATIS)</span>
                  </button>

                  <button
                    onClick={handleDeclineDuel}
                    className="text-xs text-slate-500 hover:text-slate-300 font-mono transition-colors pt-1"
                  >
                    Rifiuta la sfida (Torna alla visuale standard)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Celebratory Post-Checkout License Key Modal */}
          {verifiedCheckoutLicense && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in">
              <div className="relative w-full max-w-md bg-[#131B2E] border-2 border-emerald-500/70 rounded-3xl p-6 shadow-neon-emerald text-slate-100 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-neon-emerald">
                  <ShieldCheck className="w-9 h-9" />
                </div>

                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>TRANSAZIONE CONFERMATA // STRIPE VERIFIED</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    ACCESSO ZERODAY PRO AUTORIZZATO!
                  </h2>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Benvenuto nel Red Team d'élite, operatore <strong className="text-emerald-400 font-mono">{userState.username}</strong>. Tutte le funzionalità, i simulatori ufficiali e i laboratori PBQ sono ora sbloccati.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#090D16] border border-white/10 space-y-2">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                    La tua Chiave di Licenza Crittografica (Zero-Backend)
                  </span>
                  <div className="p-2.5 rounded-xl bg-[#0e1628] border border-emerald-500/40 font-mono font-black text-base text-emerald-300 tracking-widest select-all">
                    {verifiedCheckoutLicense}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        sound.playTap();
                        navigator.clipboard.writeText(verifiedCheckoutLicense);
                        setLicenseCopied(true);
                        setTimeout(() => setLicenseCopied(false), 2500);
                      }}
                      className="flex-1 py-2 px-3 rounded-lg bg-surface border border-white/10 hover:border-emerald-500/40 text-xs font-mono font-bold text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      {licenseCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                      <span>{licenseCopied ? 'COPIATA!' : 'COPIA'}</span>
                    </button>
                    <button
                      onClick={() => handleDownloadLicenseCertificate(verifiedCheckoutLicense)}
                      className="flex-1 py-2 px-3 rounded-lg bg-surface border border-white/10 hover:border-emerald-500/40 text-xs font-mono font-bold text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      <span>SCARICA .TXT</span>
                    </button>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 font-mono">
                  💡 Puoi usare questa chiave per ripristinare il tuo abbonamento su qualsiasi dispositivo tramite il pulsante "Ripristina Licenza PRO".
                </p>

                <button
                  onClick={() => {
                    sound.playExploitSuccess();
                    setVerifiedCheckoutLicense(null);
                  }}
                  className="w-full py-3.5 px-4 rounded-xl font-mono font-extrabold text-sm text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 transition-all shadow-neon-emerald flex items-center justify-center gap-2"
                >
                  <span>ENTRA NEI LABORATORI PRO</span>
                  <Zap className="w-4 h-4 fill-slate-950" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default App;
