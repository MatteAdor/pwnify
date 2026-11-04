import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../utils/language';
import { PRICING_CONFIG } from '../../config/pricing.config';
import { sound } from '../../utils/soundEngine';
import { isSafeRedirectUrl } from '../../utils/security';
import { getCachedVersionInfo } from '../../utils/platform';
import { updateManager } from '../../utils/updateManager';
import { resolveApkDownloadUrl } from '../../utils/versionUtils';

interface LandingPortalProps {
  onLaunchApp: () => void;
  onOpenLegal: (tab: 'privacy' | 'terms' | 'refund' | 'cookies') => void;
  onOpenCookiePrefs?: () => void;
}

export const LandingPortal: React.FC<LandingPortalProps> = ({
  onLaunchApp,
  onOpenLegal,
  onOpenCookiePrefs
}) => {
  const { lang, setLanguage } = useLanguage();
  const isEn = lang === 'en';

  // Version and APK state
  const [updateState, setUpdateState] = useState(() => updateManager.getState());
  useEffect(() => {
    return updateManager.subscribe(setUpdateState);
  }, []);
  const activeSha256 = updateState.apkSha256 || 'e8b7f190c3a81f337b5d98418041a998bb9ffae410887e5e01c107e3cb29cf6a';
  const apkDownloadUrl = updateState.apkDownloadUrl || resolveApkDownloadUrl();

  const [copiedHash, setCopiedHash] = useState(false);
  const [remediationDeployed, setRemediationDeployed] = useState(false);
  const [activeTrack, setActiveTrack] = useState<'secplus' | 'ccna' | 'ceh'>('secplus');
  const [activeTier, setActiveTier] = useState<'Cadet' | 'Operator' | 'Zero-Day'>('Operator');
  const [mobileDeckIndex, setMobileDeckIndex] = useState<number>(1);
  const [blitzSeconds, setBlitzSeconds] = useState<number>(42);
  const [answerFeedback, setAnswerFeedback] = useState<boolean | null>(null);

  // Hero card refs for 3D tilt
  const stageRef = useRef<HTMLDivElement>(null);
  const centerCardRef = useRef<HTMLDivElement>(null);
  const leftCardRef = useRef<HTMLDivElement>(null);
  const rightCardRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Blitz countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setBlitzSeconds((prev) => (prev <= 1 ? 60 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Scroll Progress and atmospheric parallax
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const progress = maxScroll > 0 ? (scrollY / maxScroll) * 100 : 0;
      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${progress}%`;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Desktop mouse parallax
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (window.innerWidth <= 768) return;
      const rect = stage.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;

      if (centerCardRef.current) {
        centerCardRef.current.style.transform = `translateX(-50%) rotateY(${x * 12}deg) rotateX(${-y * 12}deg) translateY(${y * -10}px)`;
      }
      if (leftCardRef.current) {
        leftCardRef.current.style.transform = `rotate(-5deg) rotateY(${x * 16}deg) rotateX(${-y * 16}deg) translateY(${y * 15}px)`;
      }
      if (rightCardRef.current) {
        rightCardRef.current.style.transform = `rotate(5deg) rotateY(${x * 16}deg) rotateX(${-y * 16}deg) translateY(${y * 15}px)`;
      }
    };

    const handleMouseLeave = () => {
      if (window.innerWidth <= 768) return;
      if (centerCardRef.current) {
        centerCardRef.current.style.transform = 'translateX(-50%) rotateY(0deg) rotateX(0deg) translateY(0)';
      }
      if (leftCardRef.current) {
        leftCardRef.current.style.transform = 'rotate(-5deg) translateY(0)';
      }
      if (rightCardRef.current) {
        rightCardRef.current.style.transform = 'rotate(5deg) translateY(0)';
      }
    };

    stage.addEventListener('mousemove', handleMouseMove);
    stage.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      stage.removeEventListener('mousemove', handleMouseMove);
      stage.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // Touch Swipe on mobile
  const touchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.innerWidth > 768) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (window.innerWidth > 768) return;
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    if (deltaX < -45 && mobileDeckIndex < 2) {
      sound.playTap();
      setMobileDeckIndex(prev => prev + 1);
    } else if (deltaX > 45 && mobileDeckIndex > 0) {
      sound.playTap();
      setMobileDeckIndex(prev => prev - 1);
    }
  };

  const handleCopyHash = () => {
    sound.playTap();
    if (activeSha256) {
      navigator.clipboard.writeText(activeSha256);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2500);
    }
  };

  const handleDeployRemediation = () => {
    sound.playTap();
    setRemediationDeployed(true);
    setTimeout(() => setRemediationDeployed(false), 2500);
  };

  const handleCheckoutRedirect = (url: string) => {
    sound.playTap();
    if (url && isSafeRedirectUrl(url)) {
      window.location.href = url;
    } else {
      onLaunchApp();
    }
  };

  // Scenario data
  const tracksData = {
    secplus: {
      title: 'CompTIA Security+ SY0-701',
      scenario: isEn ? 'SEC-701: Rogue DHCP Rogue Exhaustion' : 'SEC-701: Esaurimento Pool DHCP Rogue',
      desc: isEn 
        ? 'An unauthorized host at MAC 00:0c:29:4a:12:ef is broadcasting continuous DHCP Discover packets to exhaust scope pools. Select remediation:'
        : 'Un host non autorizzato su MAC 00:0c:29:4a:12:ef sta trasmettendo pacchetti DHCP Discover a raffica per esaurire il pool. Seleziona la mitigazione:',
      ans1: isEn ? 'A) Enable DHCP Snooping & Verify Trust Ports on Fa0/1' : 'A) Abilita DHCP Snooping e verifica Trust Ports su Fa0/1',
      ans2: isEn ? 'B) Clear ARP cache on core gateway' : 'B) Svuota cache ARP sul gateway di core'
    },
    ccna: {
      title: 'Cisco CCNA 200-301',
      scenario: isEn ? 'NET-200: OSPF Neighbor Adjacency MTU Mismatch' : 'NET-200: Mismatch MTU Adiacenza OSPF Neighbor',
      desc: isEn 
        ? 'Router R1 and R2 are stuck in EXSTART/EXCHANGE state over Gi0/0. Debug logs report Packet length > MTU. Select remediation:'
        : 'I router R1 e R2 sono bloccati nello stato EXSTART/EXCHANGE su Gi0/0. I log segnalano Packet length > MTU. Seleziona la contromisura:',
      ans1: isEn ? "A) Configure 'ip ospf mtu-ignore' or match interface MTU sizes" : "A) Configura 'ip ospf mtu-ignore' o uniforma le dimensioni MTU",
      ans2: isEn ? 'B) Increase OSPF Hello timer to 40 seconds' : 'B) Incrementa il timer Hello OSPF a 40 secondi'
    },
    ceh: {
      title: 'Certified Ethical Hacker v12',
      scenario: isEn ? 'CEH-12: SMB Ghost (CVE-2020-0796) Compression Inspection' : 'CEH-12: Ispezione Compressione SMB Ghost (CVE-2020-0796)',
      desc: isEn 
        ? 'Wireshark flags a malformed SMB2_COMPRESSION_TRANSFORM_HEADER with negative offset lengths directed at port 445. Select defense:'
        : 'Wireshark rileva un header SMB2_COMPRESSION_TRANSFORM_HEADER malformato con lunghezze negative verso la porta 445. Seleziona la difesa:',
      ans1: isEn ? 'A) Disable SMBv3 compression via PowerShell registry key & block 445 inbound' : 'A) Disabilita compressione SMBv3 via registro PowerShell e blocca porta 445 in ingresso',
      ans2: isEn ? 'B) Re-negotiate Kerberos ticket grants to NTLMv2' : 'B) Rinegozia l\'emissione ticket Kerberos a NTLMv2'
    }
  };

  const currentScenario = tracksData[activeTrack];

  return (
    <div className="relative min-h-screen bg-[#05060f] text-[#d1e4fa] font-sans selection:bg-[#663af3]/30 selection:text-[#d8ecf8] overflow-x-hidden">
      
      {/* Dynamic Scoped CSS for AuthKit Cathedral Tokens */}
      <style>{`
        :root {
          --color-midnight-canvas: #05060f;
          --color-steel-plate: #2f343e;
          --color-fog-veil: #9da7ba;
          --color-moon-mist: #c7d3ea;
          --color-frost-glow: #d1e4fa;
          --color-ice-highlight: #d8ecf8;
          --gradient-skywash: linear-gradient(0deg, #d8ecf8 0%, #98c0ef 100%);
          --color-pure-white: #ffffff;
          --color-void-violet: #663af3;
          --color-void-violet-hover: #7b53f7;
          --color-blueprint-blue: #b6d9fc;
          --color-glass-edge: rgba(186, 215, 247, 0.12);
        }

        .blueprint-grid-ambient {
          position: fixed;
          inset: 0;
          background-image: 
            linear-gradient(to right, rgba(186, 215, 247, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(186, 215, 247, 0.05) 1px, transparent 1px);
          background-size: 80px 80px;
          pointer-events: none;
          z-index: 0;
          mask-image: radial-gradient(ellipse 90% 70% at 50% 25%, #000 30%, transparent 95%);
        }

        .spotlight-halo-ambient {
          position: absolute;
          top: -160px;
          left: 50%;
          transform: translateX(-50%);
          width: 1000px;
          height: 700px;
          background: conic-gradient(at 50% -5%, transparent 45%, rgba(124, 145, 182, 0.25) 49%, rgba(124, 145, 182, 0.45) 50%, rgba(124, 145, 182, 0.25) 51%, transparent 55%);
          filter: blur(50px);
          pointer-events: none;
          z-index: 0;
        }

        .skywash-title {
          background: linear-gradient(0deg, #d8ecf8 0%, #98c0ef 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .btn-violet-cathedral {
          background-color: #663af3;
          color: #ffffff;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          box-shadow: 0 0 24px rgba(102, 58, 243, 0.35);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .btn-violet-cathedral:hover {
          background-color: #7b53f7;
          box-shadow: 0 0 36px rgba(102, 58, 243, 0.55);
          transform: translateY(-1px);
        }

        .btn-ghost-pill-cathedral {
          background: rgba(186, 214, 247, 0.05);
          color: #ffffff;
          border-radius: 999px;
          border: 1px solid rgba(186, 215, 247, 0.12);
          backdrop-filter: blur(8px);
          transition: all 0.2s ease;
        }
        .btn-ghost-pill-cathedral:hover {
          background: rgba(186, 214, 247, 0.12);
          border-color: rgba(186, 215, 247, 0.25);
          transform: translateY(-1px);
        }

        .glass-card-cathedral {
          background: rgba(186, 214, 247, 0.03);
          border-radius: 16px;
          border: 1px solid rgba(186, 215, 247, 0.12);
          box-shadow: inset 0 1px 1px rgba(216, 236, 248, 0.2), inset 0 24px 48px rgba(168, 216, 245, 0.06), 0 24px 48px rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(16px);
        }

        .deep-glass-cathedral {
          background: rgba(5, 6, 15, 0.96);
          border-radius: 16px;
          border: 1px solid rgba(186, 215, 247, 0.16);
          box-shadow: inset 0 1px 1px rgba(216, 236, 248, 0.2), inset 0 24px 48px rgba(168, 216, 245, 0.06), 0 24px 48px rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(24px);
        }

        /* Mobile adjustments */
        @media (max-width: 768px) {
          .cards-stage-mobile {
            height: 480px;
            perspective: 900px;
          }
        }
      `}</style>

      {/* Top 2px hairline scroll progress bar */}
      <div 
        ref={progressBarRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '2px',
          width: '0%',
          background: 'linear-gradient(90deg, #663af3, #98c0ef, #10b981)',
          zIndex: 999,
          pointerEvents: 'none',
          transition: 'width 0.08s ease-out',
          boxShadow: '0 0 10px rgba(102, 58, 243, 0.9)'
        }}
      />

      {/* Atmospheric Background Layers */}
      <div className="blueprint-grid-ambient" />
      <div className="spotlight-halo-ambient" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-[1200px] mx-auto px-4 sm:px-6">

        {/* ================================================================= */}
        {/* 1. TOP NAVIGATION BAR */}
        {/* ================================================================= */}
        <header className="sticky top-0 z-50 h-16 sm:h-[72px] flex items-center justify-between border-b border-[rgba(186,215,247,0.12)] bg-[#05060f]/80 backdrop-blur-md -mx-4 sm:-mx-6 px-4 sm:px-8 mb-8 sm:mb-10">
          <a href="#" className="flex items-center gap-3 text-decoration-none">
            <div className="w-8 h-8 rounded-md bg-[rgba(186,215,247,0.06)] border border-[rgba(186,215,247,0.12)] flex items-center justify-center shadow-[inset_0_1px_1px_rgba(216,236,248,0.2)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d1e4fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xl tracking-tight skywash-title">Pwnify</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[rgba(102,58,243,0.15)] text-[#b6d9fc] border border-[rgba(102,58,243,0.3)]">
                v{getCachedVersionInfo().versionName}
              </span>
            </div>
          </a>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#c7d3ea]">
            <a href="#simulations" className="hover:text-white transition-colors">
              {isEn ? 'Simulations' : 'Simulazioni'}
            </a>
            <a href="#certifications" className="hover:text-white transition-colors">
              {isEn ? 'Certifications' : 'Certificazioni'}
            </a>
            <a href="#blitz" className="hover:text-white transition-colors">
              {isEn ? '1v1 Blitz' : '1v1 Blitz'}
            </a>
            <a href="#distribution" className="hover:text-white transition-colors">
              {isEn ? 'Distribution' : 'Download APK'}
            </a>
            <a href="#pricing" className="hover:text-white transition-colors">
              {isEn ? 'Pricing' : 'Piani & Prezzi'}
            </a>
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <div className="flex items-center bg-[rgba(199,211,234,0.06)] border border-[rgba(186,215,247,0.12)] rounded-full p-0.5 text-[11px] font-mono">
              <button
                onClick={() => {
                  sound.playTap();
                  setLanguage('en');
                }}
                className={`px-2 py-0.5 rounded-full transition-colors ${isEn ? 'bg-[#663af3] text-white font-semibold' : 'text-[#9da7ba] hover:text-white'}`}
              >
                EN
              </button>
              <button
                onClick={() => {
                  sound.playTap();
                  setLanguage('it');
                }}
                className={`px-2 py-0.5 rounded-full transition-colors ${!isEn ? 'bg-[#663af3] text-white font-semibold' : 'text-[#9da7ba] hover:text-white'}`}
              >
                IT
              </button>
            </div>

            {/* Launch App Button */}
            <button
              onClick={() => {
                sound.playTap();
                onLaunchApp();
              }}
              className="btn-violet-cathedral px-4 py-2 text-xs sm:text-sm font-medium flex items-center gap-2 cursor-pointer"
            >
              <span>{isEn ? 'Launch Terminal' : 'Accedi all\'App'}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </div>
        </header>

        {/* ================================================================= */}
        {/* 2. HERO SECTION — THE CATHEDRAL STAGE */}
        {/* ================================================================= */}
        <section className="text-center pt-8 sm:pt-14 pb-20 sm:pb-28">
          
          {/* Eyebrow Label with Fading Rules */}
          <div className="inline-flex items-center justify-center gap-4 mb-5">
            <div className="w-12 sm:w-16 h-[1px] bg-gradient-to-r from-transparent to-[rgba(186,215,247,0.2)]" />
            <span className="font-mono text-xs sm:text-sm tracking-[0.10em] text-[#c7d3ea] uppercase font-normal">
              {isEn ? 'INTRODUCING PWNIFY v2.0' : 'PWNIFY · PIATTAFORMA DI COMBATTIMENTO'}
            </span>
            <div className="w-12 sm:w-16 h-[1px] bg-gradient-to-l from-transparent to-[rgba(186,215,247,0.2)]" />
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-medium tracking-tight leading-[1.12] mb-5 skywash-title max-w-4xl mx-auto">
            {isEn ? (
              <>Spot the breach.<br />Defend in 60 seconds.</>
            ) : (
              <>Intercetta la violazione.<br />Difendi in 60 secondi.</>
            )}
          </h1>

          <p className="text-base sm:text-lg text-[#c7d3ea] max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed">
            {isEn
              ? 'The cathedral of gamified cybersecurity readiness. Real-time PBQ log forensics, 1v1 adversarial terminal duels, and verifiable telemetry for CompTIA, CCNA, and CEH.'
              : 'La cattedrale della cyber-readiness interattiva. Forensics su log PBQ reali, duelli terminali 1v1 contro avversari live e telemetria predittiva per CompTIA, CCNA e CEH.'}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14 sm:mb-18">
            <button
              onClick={() => {
                sound.playTap();
                onLaunchApp();
              }}
              className="btn-violet-cathedral w-full sm:w-auto px-6 py-3 text-sm font-medium flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{isEn ? 'INITIALIZE TERMINAL' : 'INIZIALIZZA TERMINALE'}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>

            <a
              href="#distribution"
              className="btn-ghost-pill-cathedral w-full sm:w-auto px-5 py-2.5 text-sm font-medium flex items-center justify-center gap-2"
            >
              <span>{isEn ? 'Get APK Direct' : 'Scarica APK Diretto'}</span>
              <span className="text-[11px] opacity-60 font-mono">v{getCachedVersionInfo().versionName}</span>
            </a>

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono bg-[rgba(199,211,234,0.06)] border border-[rgba(186,215,247,0.12)] text-[#d1e4fa]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] shadow-[0_0_8px_#10b981]" />
              <span>1,420 OPERATORS ONLINE</span>
            </div>
          </div>

          {/* =============================================================== */}
          {/* 3D FLOATING CARDS STAGE */}
          {/* =============================================================== */}
          <div 
            ref={stageRef}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="relative w-full max-w-[1140px] mx-auto h-[480px] sm:h-[520px] [perspective:1100px] mb-8"
          >
            {/* Left Card: 1v1 Blitz */}
            <div
              ref={leftCardRef}
              onClick={() => { sound.playTap(); setMobileDeckIndex(0); }}
              style={{
                transform: window.innerWidth <= 768
                  ? (mobileDeckIndex === 0
                      ? 'translateX(-50%) rotateY(0deg) scale(1) translateY(0px)'
                      : 'translateX(calc(-50% - 26px)) rotateY(24deg) scale(0.85) translateY(12px)')
                  : 'rotate(-5deg) translateY(0)',
                zIndex: mobileDeckIndex === 0 ? 15 : 5,
                opacity: window.innerWidth <= 768 ? (mobileDeckIndex === 0 ? 1 : 0.45) : 1,
                filter: window.innerWidth <= 768 && mobileDeckIndex !== 0 ? 'blur(1.5px)' : 'none'
              }}
              className="absolute top-0 sm:top-11 left-1/2 sm:left-2 -translate-x-1/2 sm:translate-x-0 w-[min(90vw,340px)] p-6 glass-card-cathedral text-left transition-all duration-400 cursor-pointer"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="bg-red-500/15 border border-red-500/30 text-red-400 text-[11px] font-mono px-2 py-0.5 rounded flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  1v1 BLITZ MATCH
                </span>
                <span className="font-mono text-lg font-bold text-red-400">
                  00:{blitzSeconds < 10 ? `0${blitzSeconds}` : blitzSeconds}
                </span>
              </div>

              <div className="text-[13px] font-medium text-white mb-1">Kerberoast Ticket Hijack</div>
              <div className="text-[11px] text-[#9da7ba] font-mono mb-4">TARGET: Active Directory KDC</div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-black/40 border border-[rgba(186,215,247,0.08)] mb-4">
                <div className="text-center">
                  <div className="w-9 h-9 rounded-full bg-[rgba(102,58,243,0.2)] border border-[#663af3] text-xs font-bold text-white flex items-center justify-center mx-auto mb-1 shadow-[0_0_10px_rgba(102,58,243,0.5)]">
                    YOU
                  </div>
                  <div className="text-xs text-[#c7d3ea] font-mono">Matteador</div>
                  <div className="text-[10px] text-emerald-400 font-mono">+28 ELO</div>
                </div>

                <div className="font-mono text-xs text-[#9da7ba] font-bold">VS</div>

                <div className="text-center">
                  <div className="w-9 h-9 rounded-full bg-[rgba(186,215,247,0.1)] border border-[rgba(186,215,247,0.15)] text-xs font-bold text-[#d1e4fa] flex items-center justify-center mx-auto mb-1">
                    OPP
                  </div>
                  <div className="text-xs text-[#c7d3ea] font-mono">NullByte_9</div>
                  <div className="text-[10px] text-red-400 font-mono">-14 ELO</div>
                </div>
              </div>

              <div className="text-[11px] text-[#b6d9fc] font-mono text-center pt-2.5 border-t border-[rgba(186,215,247,0.08)]">
                Round 3/5 · Streak Active (4x)
              </div>
            </div>

            {/* Center Card: PBQ Forensic Terminal Modal */}
            <div
              ref={centerCardRef}
              onClick={() => { sound.playTap(); setMobileDeckIndex(1); }}
              style={{
                transform: window.innerWidth <= 768
                  ? (mobileDeckIndex === 1
                      ? 'translateX(-50%) rotateY(0deg) scale(1) translateY(0px)'
                      : mobileDeckIndex === 0
                        ? 'translateX(calc(-50% + 26px)) rotateY(-24deg) scale(0.85) translateY(12px)'
                        : 'translateX(calc(-50% - 26px)) rotateY(24deg) scale(0.85) translateY(12px)')
                  : 'translateX(-50%) rotateY(0deg) scale(1)',
                zIndex: mobileDeckIndex === 1 ? 15 : 5,
                opacity: window.innerWidth <= 768 ? (mobileDeckIndex === 1 ? 1 : 0.45) : 1,
                filter: window.innerWidth <= 768 && mobileDeckIndex !== 1 ? 'blur(1.5px)' : 'none'
              }}
              className="absolute top-0 left-1/2 -translate-x-1/2 w-[min(90vw,590px)] p-6 sm:p-7 deep-glass-cathedral text-left transition-all duration-400 cursor-pointer"
            >
              <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-[rgba(186,215,247,0.08)]">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/40" />
                </div>
                <div className="font-mono text-xs text-[#c7d3ea] tracking-wider">
                  LIVE PBQ FORENSIC RUNTIME · SEC501
                </div>
                <div className="text-[11px] font-mono text-[#10b981] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" /> ACTIVE
                </div>
              </div>

              <div className="bg-black/60 rounded-lg p-4 font-mono text-xs sm:text-[13px] leading-relaxed border border-[rgba(186,215,247,0.08)] mb-5 space-y-1">
                <div className="text-[#9da7ba]"># /var/log/auth.log - forensic inspection</div>
                <div>
                  <span className="text-amber-400">WARN</span> Failed password for root from <span className="text-[#b6d9fc]">192.168.1.105</span> port 42810 ssh2
                </div>
                <div>
                  <span className="text-amber-400">WARN</span> Repeated 142 times in 12s - <span className="text-[#a78bfa]">BruteForcePatternDetected</span>
                </div>
                <div className="text-[#10b981]">
                  ✔ Security+ Objective 2.4: Identify & isolate hostile host vector
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center bg-[rgba(199,211,234,0.06)] border border-[rgba(186,215,247,0.12)] rounded-md px-3.5 h-11">
                  <span className="text-[#663af3] font-mono font-bold mr-2">&gt;</span>
                  <input
                    type="text"
                    readOnly
                    value="iptables -A INPUT -s 192.168.1.105 -j DROP"
                    className="bg-transparent border-none outline-none font-mono text-xs sm:text-sm text-white w-full"
                  />
                </div>

                <button
                  onClick={handleDeployRemediation}
                  className={`w-full py-3 rounded-full text-xs sm:text-sm font-medium transition-all ${
                    remediationDeployed
                      ? 'bg-[#10b981] text-white border border-[#10b981]'
                      : 'btn-violet-cathedral cursor-pointer'
                  }`}
                >
                  {remediationDeployed
                    ? (isEn ? 'REMEDIATION DEPLOYED ✔ (+50 XP)' : 'CONTROMISURA ATTIVATA ✔ (+50 XP)')
                    : (isEn ? 'DEPLOY REMEDIATION & EARN +50 XP' : 'ATTIVA CONTROMISURA & GUADAGNA +50 XP')}
                </button>
              </div>
            </div>

            {/* Right Card: Telemetry Radar */}
            <div
              ref={rightCardRef}
              onClick={() => { sound.playTap(); setMobileDeckIndex(2); }}
              style={{
                transform: window.innerWidth <= 768
                  ? (mobileDeckIndex === 2
                      ? 'translateX(-50%) rotateY(0deg) scale(1) translateY(0px)'
                      : 'translateX(calc(-50% + 26px)) rotateY(-24deg) scale(0.85) translateY(12px)')
                  : 'rotate(5deg) translateY(0)',
                zIndex: mobileDeckIndex === 2 ? 15 : 5,
                opacity: window.innerWidth <= 768 ? (mobileDeckIndex === 2 ? 1 : 0.45) : 1,
                filter: window.innerWidth <= 768 && mobileDeckIndex !== 2 ? 'blur(1.5px)' : 'none'
              }}
              className="absolute top-0 sm:top-11 left-1/2 sm:left-auto sm:right-2 -translate-x-1/2 sm:translate-x-0 w-[min(90vw,340px)] p-6 glass-card-cathedral text-left transition-all duration-400 cursor-pointer"
            >
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-mono text-[#c7d3ea]">READINESS TELEMETRY</span>
                <span className="text-xs font-mono text-[#10b981] font-semibold">91.4% PROB</span>
              </div>

              <div className="space-y-3 mb-4">
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span>CompTIA Sec+ SY0-701</span>
                    <span>94%</span>
                  </div>
                  <div className="h-1.5 bg-[rgba(186,215,247,0.08)] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#663af3] to-[#98c0ef] rounded-full w-[94%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span>Cisco CCNA 200-301</span>
                    <span>88%</span>
                  </div>
                  <div className="h-1.5 bg-[rgba(186,215,247,0.08)] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#663af3] to-[#98c0ef] rounded-full w-[88%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span>CEH v12 Practical</span>
                    <span>85%</span>
                  </div>
                  <div className="h-1.5 bg-[rgba(186,215,247,0.08)] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#663af3] to-[#98c0ef] rounded-full w-[85%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span>Zero-Day Incident Triage</span>
                    <span>92%</span>
                  </div>
                  <div className="h-1.5 bg-[rgba(186,215,247,0.08)] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#663af3] to-[#98c0ef] rounded-full w-[92%]" />
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-[#9da7ba] font-mono text-center pt-2.5 border-t border-[rgba(186,215,247,0.08)]">
                Exam Simulation Confirmed: Ready
              </div>
            </div>
          </div>

          {/* Mobile Deck Switcher Controls */}
          <div className="flex sm:hidden justify-center items-center gap-2 mb-10">
            <button
              onClick={() => { sound.playTap(); setMobileDeckIndex(0); }}
              className={`px-3 py-1.5 rounded-full text-[11px] font-mono transition-all ${
                mobileDeckIndex === 0
                  ? 'bg-[rgba(102,58,243,0.25)] border border-[#663af3] text-white shadow-[0_0_12px_rgba(102,58,243,0.4)]'
                  : 'bg-[rgba(199,211,234,0.05)] border border-[rgba(186,215,247,0.12)] text-[#c7d3ea]'
              }`}
            >
              01 · 1v1 BLITZ
            </button>
            <button
              onClick={() => { sound.playTap(); setMobileDeckIndex(1); }}
              className={`px-3 py-1.5 rounded-full text-[11px] font-mono transition-all ${
                mobileDeckIndex === 1
                  ? 'bg-[rgba(102,58,243,0.25)] border border-[#663af3] text-white shadow-[0_0_12px_rgba(102,58,243,0.4)]'
                  : 'bg-[rgba(199,211,234,0.05)] border border-[rgba(186,215,247,0.12)] text-[#c7d3ea]'
              }`}
            >
              02 · PBQ TERMINAL
            </button>
            <button
              onClick={() => { sound.playTap(); setMobileDeckIndex(2); }}
              className={`px-3 py-1.5 rounded-full text-[11px] font-mono transition-all ${
                mobileDeckIndex === 2
                  ? 'bg-[rgba(102,58,243,0.25)] border border-[#663af3] text-white shadow-[0_0_12px_rgba(102,58,243,0.4)]'
                  : 'bg-[rgba(199,211,234,0.05)] border border-[rgba(186,215,247,0.12)] text-[#c7d3ea]'
              }`}
            >
              03 · TELEMETRY
            </button>
          </div>
        </section>

        {/* ================================================================= */}
        {/* 3. 6-TILE CIRCULAR FEATURE ROW */}
        {/* ================================================================= */}
        <section className="py-12 sm:py-20 border-t border-[rgba(186,215,247,0.1)]" id="features">
          <div className="inline-flex items-center justify-center gap-4 mb-8 w-full">
            <div className="w-12 h-[1px] bg-gradient-to-r from-transparent to-[rgba(186,215,247,0.2)]" />
            <span className="font-mono text-xs sm:text-sm tracking-[0.10em] text-[#c7d3ea] uppercase font-normal text-center">
              {isEn ? 'BUILT FOR ADVERSARIAL ACCELERATION' : 'ARCHITETTURA DI COMBATTIMENTO'}
            </span>
            <div className="w-12 h-[1px] bg-gradient-to-l from-transparent to-[rgba(186,215,247,0.2)]" />
          </div>

          <div className="grid grid-cols-3 sm:flex items-center justify-between gap-6 sm:gap-4 max-w-4xl mx-auto px-2">
            {[
              { label: '1v1 Blitz Duels', icon: 'M13 2 3 14 12 14 11 22 21 10 12 10 13 2' },
              { label: 'PBQ Lab Terminal', icon: 'M4 17l6-6-6-6M12 19h8' },
              { label: 'CVE Forensics', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
              { label: 'Readiness Radar', icon: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z' },
              { label: 'Offline SQLite', icon: 'M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5' },
              { label: 'Verified Certs', icon: 'M12 8a7 7 0 1 0 7 7 7 7 0 0 0-7-7z' }
            ].map((f, i) => (
              <div key={i} className="flex flex-col items-center gap-2.5 text-center group cursor-pointer">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#05060f] border border-[rgba(186,215,247,0.18)] shadow-[inset_0_1px_1px_rgba(216,236,248,0.2)] flex items-center justify-center text-[#d1e4fa] group-hover:border-[#663af3] group-hover:text-white group-hover:shadow-[0_0_20px_rgba(102,58,243,0.4)] transition-all">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d={f.icon} />
                  </svg>
                </div>
                <span className="text-xs sm:text-[13px] font-medium text-[#c7d3ea]">{f.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ================================================================= */}
        {/* 4. CALIBRATION SUITE (CUSTOMIZATION SHOWCASE) */}
        {/* ================================================================= */}
        <section className="py-16 sm:py-24" id="simulations">
          <div className="inline-flex items-center justify-center gap-4 mb-4 w-full">
            <div className="w-12 h-[1px] bg-gradient-to-r from-transparent to-[rgba(186,215,247,0.2)]" />
            <span className="font-mono text-xs sm:text-sm tracking-[0.10em] text-[#c7d3ea] uppercase font-normal">
              {isEn ? 'EXTENSIBLE BY DESIGN' : 'CALIBRAZIONE & SCENARI'}
            </span>
            <div className="w-12 h-[1px] bg-gradient-to-l from-transparent to-[rgba(186,215,247,0.2)]" />
          </div>

          <h2 className="text-3xl sm:text-4xl font-medium tracking-tight text-center text-[#d8ecf8] mb-3">
            {isEn ? 'Calibrate Your Defense Engine.' : 'Calibra il tuo Motore di Difesa.'}
          </h2>
          <p className="text-sm sm:text-base text-[#c7d3ea] text-center max-w-xl mx-auto mb-12">
            {isEn
              ? 'Switch certification standards, dial in adversarial difficulty, and inspect simulated scenarios in real time.'
              : 'Seleziona lo standard di certificazione, imposta il livello di difficoltà e sperimenta la risposta agli incidenti.'}
          </p>

          <div className="glass-card-cathedral p-5 sm:p-9 grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6 sm:gap-9">
            {/* Controls */}
            <div className="space-y-6 text-left">
              <div>
                <span className="font-mono text-xs text-[#9da7ba] uppercase tracking-wider block mb-2">
                  {isEn ? 'Certification Track' : 'Standard di Certificazione'}
                </span>
                <div className="space-y-1.5">
                  {(['secplus', 'ccna', 'ceh'] as const).map(trackKey => (
                    <div
                      key={trackKey}
                      onClick={() => { sound.playTap(); setActiveTrack(trackKey); }}
                      className={`p-2.5 sm:p-3 rounded-lg border text-xs sm:text-sm flex items-center justify-between cursor-pointer transition-all ${
                        activeTrack === trackKey
                          ? 'bg-[rgba(102,58,243,0.18)] border-[#663af3] text-white font-medium shadow-[0_0_12px_rgba(102,58,243,0.25)]'
                          : 'bg-[rgba(199,211,234,0.04)] border-[rgba(186,215,247,0.12)] text-[#c7d3ea] hover:border-[rgba(186,215,247,0.25)]'
                      }`}
                    >
                      <span>{tracksData[trackKey].title}</span>
                      <span className="font-mono text-xs opacity-75">
                        {trackKey === 'secplus' ? '650 Qs' : trackKey === 'ccna' ? '520 Qs' : '410 Qs'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="font-mono text-xs text-[#9da7ba] uppercase tracking-wider block mb-2">
                  {isEn ? 'Difficulty Tier' : 'Livello Operativo'}
                </span>
                <div className="flex gap-2">
                  {(['Cadet', 'Operator', 'Zero-Day'] as const).map(tier => (
                    <button
                      key={tier}
                      onClick={() => { sound.playTap(); setActiveTier(tier); }}
                      className={`flex-1 py-1.5 rounded-full text-xs font-mono transition-all cursor-pointer ${
                        activeTier === tier
                          ? 'border border-[#663af3] text-white bg-[rgba(102,58,243,0.2)] shadow-[0_0_10px_rgba(102,58,243,0.3)]'
                          : 'border border-[rgba(186,215,247,0.12)] text-[#9da7ba] hover:text-white'
                      }`}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="font-mono text-xs text-[#9da7ba] uppercase tracking-wider block mb-2">
                  {isEn ? 'Active Scenario' : 'Scenario Attivo'}
                </span>
                <div className="font-mono text-xs text-[#d1e4fa] bg-black/50 p-2.5 rounded-md border border-[rgba(186,215,247,0.1)]">
                  {currentScenario.scenario}
                </div>
              </div>
            </div>

            {/* Interactive Preview Canvas */}
            <div className="bg-[#05060f]/90 border border-[rgba(186,215,247,0.1)] rounded-xl p-4 sm:p-7 flex flex-col justify-center text-left">
              <div className="bg-[rgba(186,214,247,0.03)] border border-[rgba(186,215,247,0.12)] rounded-xl p-4 sm:p-5 shadow-[inset_0_1px_1px_rgba(216,236,248,0.2)]">
                
                {/* Header with Badges — Clean separation on mobile */}
                <div className="flex items-center justify-between gap-3 mb-3.5 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-[rgba(199,211,234,0.08)] border border-[rgba(186,215,247,0.12)] text-[#d1e4fa] whitespace-nowrap">
                    PBQ LOG ANALYSIS
                  </span>
                  <span className="font-mono text-[11px] text-[#b6d9fc] bg-[rgba(186,215,247,0.06)] border border-[rgba(186,215,247,0.12)] px-2.5 py-0.5 rounded whitespace-nowrap">
                    +150 PTS
                  </span>
                </div>

                <h3 className="font-medium text-lg sm:text-xl text-white mb-2">
                  {currentScenario.scenario}
                </h3>
                <p className="text-xs sm:text-sm text-[#c7d3ea] leading-relaxed mb-4">
                  {currentScenario.desc}
                </p>

                <div className="space-y-2">
                  <div
                    onClick={() => {
                      sound.playTap();
                      setAnswerFeedback(true);
                      setTimeout(() => setAnswerFeedback(null), 1800);
                    }}
                    className={`p-3 rounded-lg border text-xs sm:text-sm cursor-pointer transition-all ${
                      answerFeedback === true
                        ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-[0_0_14px_rgba(16,185,129,0.3)]'
                        : 'bg-[rgba(199,211,234,0.04)] border-[rgba(186,215,247,0.12)] text-[#c7d3ea] hover:border-[rgba(186,215,247,0.25)]'
                    }`}
                  >
                    <span>{currentScenario.ans1}</span>
                  </div>

                  <div
                    onClick={() => {
                      sound.playTap();
                      setAnswerFeedback(false);
                      setTimeout(() => setAnswerFeedback(null), 1800);
                    }}
                    className={`p-3 rounded-lg border text-xs sm:text-sm cursor-pointer transition-all ${
                      answerFeedback === false
                        ? 'bg-red-500/20 border-red-500 text-white shadow-[0_0_14px_rgba(239,68,68,0.3)]'
                        : 'bg-[rgba(199,211,234,0.04)] border-[rgba(186,215,247,0.12)] text-[#c7d3ea] hover:border-[rgba(186,215,247,0.25)]'
                    }`}
                  >
                    <span>{currentScenario.ans2}</span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* 5. DISTRIBUTION HUB (APK & SANDBOX) */}
        {/* ================================================================= */}
        <section className="py-14 sm:py-20" id="distribution">
          <div className="inline-flex items-center justify-center gap-4 mb-4 w-full">
            <div className="w-12 h-[1px] bg-gradient-to-r from-transparent to-[rgba(186,215,247,0.2)]" />
            <span className="font-mono text-xs sm:text-sm tracking-[0.10em] text-[#c7d3ea] uppercase font-normal">
              {isEn ? 'UNCOMPROMISED ACCESSIBILITY' : 'DISTRIBUZIONE & RUNTIME'}
            </span>
            <div className="w-12 h-[1px] bg-gradient-to-l from-transparent to-[rgba(186,215,247,0.2)]" />
          </div>

          <h2 className="text-3xl sm:text-4xl font-medium tracking-tight text-center text-[#d8ecf8] mb-3">
            {isEn ? 'Zero Friction Distribution.' : 'Accesso Istantaneo & Zero Attrito.'}
          </h2>
          <p className="text-sm sm:text-base text-[#c7d3ea] text-center max-w-xl mx-auto mb-10">
            {isEn
              ? 'Deploy natively on your Android hardware or run in the zero-trust cloud sandbox with instant biometric session sync.'
              : 'Installa direttamente sul tuo smartphone Android o avvia la sandbox cloud nel browser con sincronizzazione account.'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto text-left">
            
            {/* Card 1: Android APK */}
            <div className="glass-card-cathedral p-6 sm:p-8 flex flex-col justify-between min-w-0 max-w-full">
              <div>
                <span className="font-mono text-[11px] px-2.5 py-1 rounded bg-[rgba(199,211,234,0.08)] border border-[rgba(186,215,247,0.12)] text-[#d1e4fa] inline-block mb-4">
                  OFFICIAL RELEASE · ARMV8A &amp; X86_64
                </span>
                <h3 className="font-medium text-2xl text-white mb-2">
                  Pwnify Android APK
                </h3>
                <p className="text-xs sm:text-sm text-[#c7d3ea] leading-relaxed mb-6">
                  {isEn
                    ? 'Full offline SQLite database, hardware-accelerated terminal emulator, and local notification streaks. Zero third-party ad trackers.'
                    : 'Database SQLite 100% offline, emulatore terminale con accelerazione hardware e streak locali. Nessun tracker pubblicitario.'}
                </p>

                {/* SHA-256 Box with Ellipsis and Copy */}
                <div className="bg-black/50 rounded-md border border-[rgba(186,215,247,0.1)] p-3 font-mono text-[11px] text-[#9da7ba] mb-6 flex items-center justify-between gap-2 min-w-0 max-w-full">
                  <span className="shrink-0 text-[#c7d3ea]">SHA-256:</span>
                  <span className="truncate text-[#d1e4fa] flex-1">{activeSha256}</span>
                  <button
                    onClick={handleCopyHash}
                    className="shrink-0 px-2 py-0.5 rounded bg-[rgba(186,215,247,0.08)] border border-[rgba(186,215,247,0.15)] text-white text-[10px] font-mono hover:bg-[rgba(186,215,247,0.18)] cursor-pointer"
                  >
                    {copiedHash ? 'COPIED!' : 'COPY'}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <a
                  href={apkDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-violet-cathedral px-5 py-2.5 text-xs sm:text-sm font-medium flex items-center gap-2"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  <span>{isEn ? 'Download Direct APK' : 'Scarica APK Diretto'}</span>
                </a>
                <span className="text-xs text-[#9da7ba] font-mono">v{getCachedVersionInfo().versionName} · 28.4 MB</span>
              </div>
            </div>

            {/* Card 2: Web Sandbox */}
            <div className="glass-card-cathedral p-6 sm:p-8 flex flex-col justify-between min-w-0 max-w-full">
              <div>
                <span className="font-mono text-[11px] px-2.5 py-1 rounded bg-[rgba(199,211,234,0.08)] border border-[rgba(186,215,247,0.12)] text-[#d1e4fa] inline-block mb-4">
                  CROSS-PLATFORM · WEB INSTANT RUN
                </span>
                <h3 className="font-medium text-2xl text-white mb-2">
                  Web Sandbox Runtime
                </h3>
                <p className="text-xs sm:text-sm text-[#c7d3ea] leading-relaxed mb-6">
                  {isEn
                    ? 'Train directly in your browser. Includes 1v1 Blitz WebRTC matchmaking, interactive drag-and-drop network topology PBQs, and cloud progress sync.'
                    : 'Allenati direttamente dal browser senza installare nulla. Include duelli WebRTC 1v1, PBQ interattivi su rete e sync account.'}
                </p>

                <div className="bg-black/50 rounded-md border border-[rgba(186,215,247,0.1)] p-3 font-mono text-xs text-[#d1e4fa] mb-6">
                  <div className="text-emerald-400 mb-1">● WebRTC Mesh: Connected</div>
                  <div className="text-[#9da7ba]">Latency: 14ms · TLS 1.3 Strict</div>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => {
                    sound.playTap();
                    onLaunchApp();
                  }}
                  className="btn-ghost-pill-cathedral px-5 py-2.5 text-xs sm:text-sm font-medium flex items-center gap-2 border-[rgba(186,215,247,0.25)] cursor-pointer"
                >
                  <span>{isEn ? 'Open Web Sandbox' : 'Avvia Web Sandbox'}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
                </button>
                <span className="text-xs text-[#9da7ba] font-mono">{isEn ? 'No install required' : 'Nessuna installazione'}</span>
              </div>
            </div>

          </div>
        </section>

        {/* ================================================================= */}
        {/* 6. TRANSPARENT PRICING MATRIX */}
        {/* ================================================================= */}
        <section className="py-14 sm:py-20" id="pricing">
          <div className="inline-flex items-center justify-center gap-4 mb-4 w-full">
            <div className="w-12 h-[1px] bg-gradient-to-r from-transparent to-[rgba(186,215,247,0.2)]" />
            <span className="font-mono text-xs sm:text-sm tracking-[0.10em] text-[#c7d3ea] uppercase font-normal">
              {isEn ? 'TRANSPARENT VALUE' : 'PIANI & PREZZI'}
            </span>
            <div className="w-12 h-[1px] bg-gradient-to-l from-transparent to-[rgba(186,215,247,0.2)]" />
          </div>

          <h2 className="text-3xl sm:text-4xl font-medium tracking-tight text-center text-[#d8ecf8] mb-3">
            {isEn ? 'Simple, Uncompromising Plans.' : 'Piani Trasparenti. Nessun Vincolo.'}
          </h2>
          <p className="text-sm sm:text-base text-[#c7d3ea] text-center max-w-xl mx-auto mb-10">
            {isEn
              ? 'From solo certification sprint to enterprise red-team readiness.'
              : 'Dallo studio individuale per la certificazione alla preparazione red-team avanzata.'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto text-left">
            {/* Free */}
            <div className="glass-card-cathedral p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <div className="font-mono text-xs uppercase tracking-wider text-[#c7d3ea] mb-3">RECONNAISSANCE</div>
                <div className="text-4xl font-semibold text-white mb-2 font-mono">
                  $0 <span className="text-sm font-normal text-[#9da7ba]">/ {isEn ? 'forever' : 'per sempre'}</span>
                </div>
                <p className="text-xs text-[#c7d3ea] mb-6 min-h-[36px]">
                  {isEn ? 'Essential daily training drills and baseline certification question banks.' : 'Esercitazioni quotidiane essenziali e quesiti d\'esame base.'}
                </p>

                <ul className="space-y-3 mb-8 text-xs text-[#d1e4fa]">
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400">✔</span> Daily 10-Question Flash Drill
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400">✔</span> CompTIA Sec+ Core Bank (200 Qs)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400">✔</span> 3 1v1 Blitz Duels per day
                  </li>
                </ul>
              </div>

              <button
                onClick={() => { sound.playTap(); onLaunchApp(); }}
                className="btn-ghost-pill-cathedral w-full py-2.5 text-xs sm:text-sm font-medium cursor-pointer"
              >
                {isEn ? 'Start Free' : 'Inizia Gratis'}
              </button>
            </div>

            {/* Operator Pro (Featured Void Violet) */}
            <div className="relative rounded-2xl bg-[rgba(102,58,243,0.06)] border border-[#663af3]/50 p-6 sm:p-8 flex flex-col justify-between shadow-[inset_0_1px_1px_rgba(216,236,248,0.25),0_0_36px_rgba(102,58,243,0.2)]">
              <div className="absolute -top-3 right-6 px-3 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#663af3] text-white shadow-[0_0_12px_rgba(102,58,243,0.6)]">
                MOST ACCELERATED
              </div>

              <div>
                <div className="font-mono text-xs uppercase tracking-wider text-[#a78bfa] mb-3 font-semibold">OPERATOR PRO</div>
                <div className="text-4xl font-semibold text-white mb-2 font-mono">
                  $9.99 <span className="text-sm font-normal text-[#9da7ba]">/ {isEn ? 'month' : 'mese'}</span>
                </div>
                <p className="text-xs text-[#c7d3ea] mb-6 min-h-[36px]">
                  {isEn 
                    ? 'Uncapped PBQ simulations, unlimited 1v1 Blitz, and predictive exam telemetry.'
                    : 'Simulazioni PBQ illimitate, 1v1 Arena senza limiti e telemetria d\'esame avanzata.'}
                </p>

                <ul className="space-y-3 mb-8 text-xs text-[#d1e4fa]">
                  <li className="flex items-center gap-2">
                    <span className="text-[#a78bfa]">✔</span> All Cert Tracks (Sec+, CCNA, CEH)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#a78bfa]">✔</span> Unlimited 1v1 Blitz &amp; Private Rooms
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#a78bfa]">✔</span> Interactive PBQ Terminal Labs
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#a78bfa]">✔</span> AI Remediation Breakdown
                  </li>
                </ul>
              </div>

              <button
                onClick={() => handleCheckoutRedirect('https://buy.stripe.com/test_pro')}
                className="btn-violet-cathedral w-full py-2.5 text-xs sm:text-sm font-medium cursor-pointer"
              >
                {isEn ? 'Unlock Pro Access' : 'Sblocca Accesso Pro'}
              </button>
            </div>

            {/* Enterprise Vanguard */}
            <div className="glass-card-cathedral p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <div className="font-mono text-xs uppercase tracking-wider text-[#c7d3ea] mb-3">ENTERPRISE VANGUARD</div>
                <div className="text-4xl font-semibold text-white mb-2 font-mono">
                  $29 <span className="text-sm font-normal text-[#9da7ba]">/ seat / mo</span>
                </div>
                <p className="text-xs text-[#c7d3ea] mb-6 min-h-[36px]">
                  {isEn ? 'For security teams and universities needing live cohort benchmarking.' : 'Per team di sicurezza, università e benchmarking di gruppo.'}
                </p>

                <ul className="space-y-3 mb-8 text-xs text-[#d1e4fa]">
                  <li className="flex items-center gap-2">
                    <span className="text-[#b6d9fc]">✔</span> Custom PBQ Scenario Authoring
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#b6d9fc]">✔</span> Team Leaderboards &amp; ELO Analytics
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#b6d9fc]">✔</span> SAML / SSO Integration
                  </li>
                </ul>
              </div>

              <a
                href="mailto:ops@pwnify.xyz"
                className="btn-ghost-pill-cathedral w-full py-2.5 text-xs sm:text-sm font-medium text-center"
              >
                {isEn ? 'Contact Operations' : 'Contatta il Team'}
              </a>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* 7. CATHEDRAL FOOTER (WITHOUT OPERATIONAL STATUS BADGE) */}
        {/* ================================================================= */}
        <footer className="mt-16 sm:mt-24 border-t border-[rgba(186,215,247,0.12)] py-12 text-center text-xs text-[#9da7ba]">
          <div className="skywash-title text-xl font-medium mb-3">Pwnify</div>
          <p className="max-w-md mx-auto text-[#9da7ba] mb-6">
            {isEn 
              ? 'Gamified Cybersecurity Readiness & Certification Engine · Designed with Midnight Cathedral Precision.'
              : 'Piattaforma di addestramento e certificazione cyber interattiva.'}
          </p>

          {/* Legal Links */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] font-mono text-[#c7d3ea] mb-6">
            <button 
              onClick={() => { sound.playTap(); onOpenLegal('privacy'); }}
              className="hover:text-white transition-colors cursor-pointer"
            >
              {isEn ? 'Privacy Policy' : 'Informativa Privacy'}
            </button>
            <span>•</span>
            <button 
              onClick={() => { sound.playTap(); onOpenLegal('terms'); }}
              className="hover:text-white transition-colors cursor-pointer"
            >
              {isEn ? 'Terms of Service' : 'Termini di Servizio'}
            </button>
            <span>•</span>
            <button 
              onClick={() => { sound.playTap(); onOpenLegal('refund'); }}
              className="hover:text-white transition-colors cursor-pointer"
            >
              {isEn ? 'Withdrawal Policy (art. 59)' : 'Diritto di Recesso (art. 59)'}
            </button>
            {onOpenCookiePrefs && (
              <>
                <span>•</span>
                <button 
                  onClick={() => { sound.playTap(); onOpenCookiePrefs(); }}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  {isEn ? 'Cookie Preferences' : 'Preferenze Cookie'}
                </button>
              </>
            )}
          </div>

          <div className="text-[11px] text-[#9da7ba]/60 font-mono">
            © {new Date().getFullYear()} Pwnify. All rights reserved.
          </div>
        </footer>

      </div>
    </div>
  );
};
