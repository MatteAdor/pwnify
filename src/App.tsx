import React, { useState, useEffect } from 'react';
import { UserState, SkillNode, PaywallContext } from './types';
import { INITIAL_DAILY_BOUNTIES } from './data/bountiesAndPbq';
import { Navbar } from './components/Navbar';
import { BottomNav, ActiveTab } from './components/BottomNav';
import { OnboardingFunnel } from './components/Onboarding/OnboardingFunnel';
import { TacticalSkillTree } from './components/SkillTree/TacticalSkillTree';
import { InteractiveQuizModal } from './components/Quiz/InteractiveQuizModal';
import { ArenaPvP, DuelChallengeData } from './components/Arena/ArenaPvP';
import { MissionsTab } from './components/Missions/MissionsTab';
import { ReadinessRadar } from './components/Analytics/ReadinessRadar';
import { CertPrepTab } from './components/Certs/CertPrepTab';
import { PaywallModal } from './components/Paywall/PaywallModal';
import { HackerIDCardModal } from './components/Viral/HackerIDCardModal';
import { DailyBreachModal } from './components/DailyBreach/DailyBreachModal';
import { CyberArsenalModal, TerminalThemeId } from './components/Arsenal/CyberArsenalModal';
import { AuthModal } from './components/Auth/AuthModal';
import { AuthPage } from './components/Auth/AuthPage';
import { LandingPortal } from './components/Landing/LandingPortal';
import { AppDownloadGateModal, GateContext } from './components/Gating/AppDownloadGateModal';
import { ArenaWebLockedView } from './components/Arena/ArenaWebLockedView';
import { isBrowserEnvironment, APK_DOWNLOAD_URL } from './utils/platform';
import { LegalModal, LegalTabType } from './components/Legal/LegalModal';
import { CookieConsentBanner } from './components/Legal/CookieConsentBanner';
import { generateLicenseKey, verifyLicenseKey } from './utils/licenseEngine';
import { calculateDynamicTelemetry } from './utils/readinessEngine';
import { 
  createDefaultGuestState, 
  getCachedGuestState,
  purgeLegacyStorage, 
  getCurrentSession, 
  setCurrentSession, 
  persistActiveAccountState, 
  sanitizeUserState,
  syncDatabaseWithBackend,
  updateOperatorUsername,
  UserAccount 
} from './utils/userDatabase';
import { isContributor } from './utils/licenseEngine';
import { sound } from './utils/soundEngine';
import { useLanguage } from './utils/language';
import { 
  sanitizeCallsign, 
  sanitizeAlphanumeric, 
  clampNumber, 
  verifyCheckoutToken 
} from './utils/security';
import { Swords, Zap, Check, Copy, Download, Sparkles, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';

const THEME_BG_MAP: Record<TerminalThemeId, string> = {
  cyber_emerald: 'bg-[#090D16]',
  matrix_phosphor: 'bg-[#030d06]',
  cyberpunk_neon: 'bg-[#0c071a]',
  amber_crt: 'bg-[#120b04]',
  stealth_oled: 'bg-[#000000]'
};

export const App: React.FC = () => {
  const { lang } = useLanguage();
  const isEn = lang === 'en';

  // Load initial state from active user database session or cached guest state or fallback to default
  const [userState, setUserState] = useState<UserState>(() => {
    try {
      purgeLegacyStorage();
      const session = getCurrentSession();
      if (session && session.userState) {
        return sanitizeUserState(session.userState);
      }
      const cachedGuest = getCachedGuestState();
      if (cachedGuest) {
        return sanitizeUserState(cachedGuest);
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

  // Sync local accounts with physical disk file database/logins.json
  useEffect(() => {
    syncDatabaseWithBackend().then(accs => {
      const session = getCurrentSession();
      if (session && Array.isArray(accs)) {
        const found = accs.find(a => a.id === session.id);
        if (found && found.userState) {
          setUserState(sanitizeUserState(found.userState));
        }
      }
    }).catch(err => {
      console.debug('Disk database background sync:', err);
    });
  }, []);

  // God Mode Protected Dev Toolbar State (Strictly restricted to local development)
  const [isGodMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    // Defense against production bypass: Never enable dev toolbar in production builds or outside localhost
    if (!import.meta.env.DEV) return false;
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
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

  // Legal & Privacy Modal State
  const [isLegalModalOpen, setIsLegalModalOpen] = useState<boolean>(false);
  const [legalTab, setLegalTab] = useState<LegalTabType>('privacy');
  const [forceCookieBanner, setForceCookieBanner] = useState<boolean>(false);

  // Navigation State
  const [activeTab, setActiveTab] = useState<ActiveTab>('tree');

  // View Mode: 'portal' (Public Presentation & Download Hub) vs 'app' (Interactive Web Platform)
  const [viewMode, setViewMode] = useState<'portal' | 'app'>(() => {
    try {
      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get('view') === 'app' || window.location.hash === '#app') {
          return 'app';
        }
      }
    } catch {}
    return 'portal';
  });

  // Interactive Quiz Modal State
  const [selectedNode, setSelectedNode] = useState<SkillNode | null>(null);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState<boolean>(false);

  // Paywall Modal State
  const [isPaywallOpen, setIsPaywallOpen] = useState<boolean>(false);
  const [paywallContext, setPaywallContext] = useState<PaywallContext>('manual_upgrade');

  // Native APK Download Gate Modal State (Forces APK download for PvP / advanced modules)
  const [isGateModalOpen, setIsGateModalOpen] = useState<boolean>(false);
  const [gateModalContext, setGateModalContext] = useState<GateContext>('arena_locked');
  const [browserActivityCount, setBrowserActivityCount] = useState<number>(0);

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

      // Check 2b: Incoming Live P2P Room Code (e.g. ?duel=0x7B42)
      const roomCode = params.get('duel') || params.get('room');
      if (roomCode) {
        setActiveTab('arena');
        sound.playRadarPing();
      }
    }
  }, [userState.username]);


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
    if (isBrowserEnvironment()) {
      sound.playPayloadBlocked();
      setGateModalContext('arena_locked');
      setIsGateModalOpen(true);
      return;
    }
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
    chosenUsername?: string;
    profession?: string;
  }) => {
    setUserState(prev => {
      const nextUsername = data.chosenUsername && data.chosenUsername.trim().length >= 3 
        ? sanitizeCallsign(data.chosenUsername.trim(), prev.username) 
        : prev.username;
      const isAutoPro = isContributor(nextUsername) || isContributor(prev.userEmail) || prev.isPro;
      const chosenProf = data.profession || (
        data.goal === 'soc_blue' ? 'SOC Analyst' :
        data.goal === 'web_hacking' ? 'Penetration Tester' :
        data.goal === 'linux_bash' ? 'Linux Systems Specialist' :
        'Cyber Warfare Operator'
      );

      const updated: UserState = {
        ...prev,
        username: nextUsername,
        goal: data.goal,
        profession: chosenProf,
        experienceLevel: data.level,
        dailyCommitment: data.commitment,
        readinessScore: data.readinessScore,
        onboardingCompleted: true,
        isPro: isAutoPro,
        licenseKey: isAutoPro ? (prev.licenseKey || '0xPRO-CONTRIBUTOR-LIFETIME') : prev.licenseKey
      };
      persistActiveAccountState(updated);
      return updated;
    });
  };

  // Username update with cooldown handler for Navbar settings
  const handleUpdateUsername = (newUsername: string): { success: boolean; error?: string } => {
    const res = updateOperatorUsername(newUsername, userState);
    if (res.success && res.updatedState) {
      setUserState(res.updatedState);
      return { success: true };
    }
    return { success: false, error: res.error };
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

    // In web browser: remind the user periodically to download the native APK!
    if (isBrowserEnvironment()) {
      setBrowserActivityCount(prev => {
        const next = prev + 1;
        if (next % 2 === 0) {
          setTimeout(() => {
            setGateModalContext('periodic_reminder');
            setIsGateModalOpen(true);
          }, 600);
        }
        return next;
      });
    }
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

  // Daily Bug Bounty Claim Handlers (Strictly requires mission completion)
  const handleClaimFreeBounty = (bountyId: string) => {
    const bounty = userState.dailyBounties.find(b => b.id === bountyId);
    if (!bounty || !bounty.isCompleted || bounty.freeClaimed) return;

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
    const bounty = userState.dailyBounties.find(b => b.id === bountyId);
    if (!bounty) return;

    // Casse del pro sbloccate SOLO se ho fatto la missione!
    const isMissionDone = Boolean(bounty.isCompleted && bounty.progress >= bounty.target && bounty.progress > 0);
    if (!isMissionDone || bounty.proClaimed) {
      sound.playPayloadBlocked();
      return;
    }

    if (!userState.isPro) {
      sound.playPayloadBlocked();
      triggerPaywall('bounty_crate_lock');
      return;
    }

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

    if (isBrowserEnvironment()) {
      setBrowserActivityCount(prev => {
        const next = prev + 1;
        setTimeout(() => {
          setGateModalContext('periodic_reminder');
          setIsGateModalOpen(true);
        }, 800);
        return next;
      });
    }
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
      {/* Public Presentation & Download Portal vs Interactive Web App */}
      {viewMode === 'portal' ? (
        <LandingPortal
          onLaunchApp={() => {
            sound.playTap();
            setViewMode('app');
            window.location.hash = '#app';
          }}
          onOpenLegal={(tab) => {
            setLegalTab(tab);
            setIsLegalModalOpen(true);
          }}
          onOpenCookiePrefs={() => setForceCookieBanner(true)}
        />
      ) : !userState.isLoggedIn ? (
        <AuthPage
          onLoginSuccess={handleLoginSuccess}
          currentUserState={userState}
          onGuestAccess={() => setUserState(prev => {
            const updated = { ...prev, isLoggedIn: true, onboardingCompleted: false };
            persistActiveAccountState(updated);
            return updated;
          })}
          onOpenLegal={(tab) => {
            setLegalTab(tab);
            setIsLegalModalOpen(true);
          }}
          onBackToPortal={() => {
            sound.playTap();
            setViewMode('portal');
            window.location.hash = '';
          }}
        />
      ) : !userState.onboardingCompleted ? (
        <OnboardingFunnel
          onComplete={handleOnboardingComplete}
          onOpenPaywall={() => triggerPaywall('diagnostic_funnel')}
        />
      ) : (
        <>
          {/* Browser Sandbox Persistent Reminder Banner */}
          {isBrowserEnvironment() && (
            <div className="bg-[#0b1322] border-b border-emerald-500/30 px-3 sm:px-6 py-2 flex items-center justify-between text-xs font-mono text-emerald-300 z-30 shrink-0">
              <div className="flex items-center gap-2 truncate">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0"></span>
                <span className="truncate">
                  {isEn 
                    ? 'Browser Sandbox · 1v1 Arena PvP & Full PBQ Labs require the native Android App'
                    : 'Sandbox Web Limitata · Arena 1v1 e tutti i laboratori PBQ richiedono l\'App Android'}
                </span>
              </div>
              <a
                href={APK_DOWNLOAD_URL}
                download="zeroday.apk"
                onClick={() => sound.playVictoryFanfare()}
                className="ml-3 shrink-0 px-2.5 py-1 rounded bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isEn ? 'Get APK' : 'Scarica APK (20.8MB)'}</span>
              </a>
            </div>
          )}

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
            onUpdateUsername={handleUpdateUsername}
            onUpdateLanguage={(l) => setUserState(prev => ({ ...prev, language: l }))}
            onOpenPortal={() => {
              sound.playTap();
              setViewMode('portal');
              window.location.hash = '';
            }}
          />

          {/* Subheader Interactive Demo Toolbar (Strictly Protected by God Mode & DEV mode) */}
          {isGodMode && import.meta.env.DEV && (
            <div className="bg-[#0c1220] border-b border-white/5 py-1 px-4 text-center flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-[11px] font-mono text-slate-400 animate-fade-in">
              <span className="text-emerald-400 font-bold">[DEV TEST]:</span>
              <button
                onClick={() => {
                  sound.playTap();
                  setUserState(prev => ({ ...prev, onboardingCompleted: false }));
                }}
                className="text-slate-300 hover:text-emerald-300 underline"
              >
                Restart Onboarding
              </button>
              <span className="text-slate-600">|</span>
              <button
                onClick={() => {
                  sound.playTap();
                  setUserState(prev => ({ ...prev, arenaTickets: 0, winStreak: 3 }));
                }}
                className="text-amber-400 hover:text-amber-300 underline font-semibold"
              >
                Reset Tickets to 0/3 (Win Streak Trap)
              </button>
              <span className="text-slate-600">|</span>
              <button
                onClick={handleSimulateIncomingDuel}
                className="text-rose-400 hover:text-rose-300 underline font-bold"
              >
                Simulate Received Duel Link
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
                Simulate Stripe Return
              </button>
              <span className="text-slate-600">|</span>
              <button
                onClick={() => {
                  sound.playTap();
                  triggerPaywall('manual_upgrade');
                }}
                className="text-amber-400 hover:text-amber-300 underline"
              >
                Open PRO Paywall
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
                onOpenDailyBreach={() => setIsDailyBreachOpen(true)}
              />
            )}

            {activeTab === 'arena' && (
              isBrowserEnvironment() ? (
                <ArenaWebLockedView onBackToSkillTree={() => setActiveTab('tree')} />
              ) : (
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
              )
            )}

            {activeTab === 'missions' && (
              <MissionsTab
                userState={userState}
                onOpenDailyBreach={() => setIsDailyBreachOpen(true)}
                onOpenPaywallContext={triggerPaywall}
                onClaimFreeBounty={handleClaimFreeBounty}
                onClaimProBounty={handleClaimProBounty}
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
            onOpenLegal={(tab) => {
              setLegalTab(tab);
              setIsLegalModalOpen(true);
            }}
            onOpenCookiePrefs={() => setForceCookieBanner(true)}
          />

          {/* ZeroDay PRO Paywall Modal (Stripe Bridge & License Key Restore) */}
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
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 animate-fade-in font-sans">
              <div className="relative w-full max-w-md bg-[#0D121D] border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xl text-zinc-100 text-center space-y-4">
                <Swords className="w-10 h-10 text-emerald-400 mx-auto" />

                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">
                    {isEn ? '1v1 Challenge Received' : 'Sfida 1v1 Ricevuta'}
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                    {isEn ? (
                      <>Operator <strong className="text-white font-mono">{incomingDuel.challenger}</strong> (ELO <strong className="text-zinc-200 font-mono">{incomingDuel.elo}</strong>) has challenged you on seed <span className="font-mono text-zinc-400">#{incomingDuel.seed}</span> with a target score of <strong className="text-white font-mono">{incomingDuel.score}/5</strong>.</>
                    ) : (
                      <>L'operatore <strong className="text-white font-mono">{incomingDuel.challenger}</strong> (ELO <strong className="text-zinc-200 font-mono">{incomingDuel.elo}</strong>) ti ha sfidato sul seed <span className="font-mono text-zinc-400">#{incomingDuel.seed}</span> con un punteggio di <strong className="text-white font-mono">{incomingDuel.score}/5</strong>.</>
                    )}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 font-mono text-xs text-zinc-400 flex items-center justify-around">
                  <div>
                    <span className="text-[10px] block text-zinc-500">{isEn ? 'CHALLENGER' : 'SFIDANTE'}</span>
                    <span className="font-bold text-white">{incomingDuel.challenger}</span>
                  </div>
                  <div className="w-px h-6 bg-zinc-800" />
                  <div>
                    <span className="text-[10px] block text-zinc-500">RATING</span>
                    <span className="font-bold text-zinc-200">{incomingDuel.elo} ELO</span>
                  </div>
                  <div className="w-px h-6 bg-zinc-800" />
                  <div>
                    <span className="text-[10px] block text-zinc-500">TARGET</span>
                    <span className="font-bold text-emerald-400">{incomingDuel.score}/5 Pts</span>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    onClick={handleAcceptDuel}
                    className="w-full py-2.5 px-4 rounded-xl font-mono font-bold text-xs sm:text-sm text-zinc-950 bg-emerald-500 hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Zap className="w-4 h-4 fill-current" />
                    <span>{isEn ? 'ACCEPT CHALLENGE (FREE)' : 'ACCETTA LA SFIDA (GRATIS)'}</span>
                  </button>

                  <button
                    onClick={handleDeclineDuel}
                    className="text-xs text-zinc-500 hover:text-zinc-300 font-mono transition-colors pt-1 cursor-pointer"
                  >
                    {isEn ? 'Decline challenge' : 'Rifiuta la sfida'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Celebratory Post-Checkout License Key Modal */}
          {verifiedCheckoutLicense && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 animate-fade-in font-sans">
              <div className="relative w-full max-w-md bg-[#0D121D] border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xl text-zinc-100 text-center space-y-4">
                <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto" />

                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">
                    {isEn ? 'ZeroDay PRO Access Authorized' : 'Accesso ZeroDay PRO Autorizzato'}
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    {isEn ? (
                      <>Welcome, operator <strong className="text-white font-mono">{userState.username}</strong>. All exam simulators, PBQ labs, and features are unlocked.</>
                    ) : (
                      <>Benvenuto, operatore <strong className="text-white font-mono">{userState.username}</strong>. Tutti i simulatori d'esame, i laboratori PBQ e le funzionalità sono sbloccati.</>
                    )}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
                  <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider block">
                    {isEn ? 'Your License Key' : 'La tua Chiave di Licenza'}
                  </span>
                  <div className="p-2.5 rounded-lg bg-black border border-zinc-800 font-mono font-bold text-sm text-emerald-400 tracking-wider select-all">
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
                      className="flex-1 py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-mono font-bold text-zinc-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {licenseCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
                      <span>{licenseCopied ? (isEn ? 'COPIED!' : 'COPIATA!') : (isEn ? 'COPY' : 'COPIA')}</span>
                    </button>
                    <button
                      onClick={() => handleDownloadLicenseCertificate(verifiedCheckoutLicense)}
                      className="flex-1 py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-mono font-bold text-zinc-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{isEn ? 'DOWNLOAD .TXT' : 'SCARICA .TXT'}</span>
                    </button>
                  </div>
                </div>

                <p className="text-[10px] text-zinc-500 font-mono">
                  {isEn ? 'Use this key to restore your subscription on any device.' : 'Usa questa chiave per ripristinare il tuo abbonamento su qualsiasi dispositivo.'}
                </p>

                <button
                  onClick={() => {
                    sound.playExploitSuccess();
                    setVerifiedCheckoutLicense(null);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl font-mono font-bold text-xs sm:text-sm text-zinc-950 bg-emerald-500 hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{isEn ? 'ENTER PRO LABS' : 'ENTRA NEI LABORATORI PRO'}</span>
                  <Zap className="w-4 h-4 fill-current" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Native App Download Gate & Periodic Browser Restriction Modal */}
      <AppDownloadGateModal
        isOpen={isGateModalOpen}
        onClose={() => setIsGateModalOpen(false)}
        context={gateModalContext}
      />

      {/* GDPR, Terms, Privacy & Refund Legal Modal */}
      <LegalModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
        initialTab={legalTab}
      />

      {/* ePrivacy & GDPR Cookie Consent Management Banner */}
      <CookieConsentBanner
        onOpenCookiePolicy={() => {
          setLegalTab('cookies');
          setIsLegalModalOpen(true);
        }}
        forceOpen={forceCookieBanner}
        onCloseForce={() => setForceCookieBanner(false)}
      />
    </div>
  );
};

export default App;
