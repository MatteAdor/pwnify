import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../utils/language';
import { PRICING_CONFIG } from '../../config/pricing.config';
import { MONETIZATION_CONFIG } from '../../config/monetization';
import { sound } from '../../utils/soundEngine';
import { isSafeRedirectUrl } from '../../utils/security';
import { 
  Download, 
  Terminal, 
  ShieldCheck, 
  Swords, 
  CheckCircle2, 
  ExternalLink, 
  Copy, 
  Check, 
  Smartphone, 
  Globe, 
  FileCode2, 
  Radar, 
  Flame, 
  ArrowRight, 
  Zap,
  Lock
} from 'lucide-react';
import { APK_SIZE, getCachedVersionInfo, isPlayDistribution } from '../../utils/platform';
import { updateManager } from '../../utils/updateManager';
import { resolveApkDownloadUrl } from '../../utils/versionUtils';

interface LandingPortalProps {
  onLaunchApp: () => void;
  onOpenLegal: (tab: 'privacy' | 'terms' | 'refund' | 'cookies') => void;
  onOpenCookiePrefs?: () => void;
}

const APK_FILENAME = 'zeroday.apk';
const APK_GITHUB_MIRROR = 'https://github.com/MatteAdor/zeroday_app/releases';

export const LandingPortal: React.FC<LandingPortalProps> = ({
  onLaunchApp,
  onOpenLegal,
  onOpenCookiePrefs
}) => {
  const { lang, setLanguage } = useLanguage();
  const isEn = lang === 'en';
  const isPlay = isPlayDistribution();
  const versionInfo = getCachedVersionInfo();

  const [updateState, setUpdateState] = useState(() => updateManager.getState());
  useEffect(() => {
    return updateManager.subscribe(setUpdateState);
  }, []);

  const activeSha256 = updateState.apkSha256;
  const apkDownloadUrl = updateState.apkDownloadUrl || resolveApkDownloadUrl();

  const [copiedHash, setCopiedHash] = useState(false);
  const [selectedTerminalSnippet, setSelectedTerminalSnippet] = useState<number>(0);
  const [terminalExploitFound, setTerminalExploitFound] = useState(false);

  // Canvas & 3D Tilt Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const terminalCardRef = useRef<HTMLDivElement | null>(null);
  const terminalGlareRef = useRef<HTMLDivElement | null>(null);

  // --- 1. Background Matrix Stream Engine (Canvas, Zero-Dependency, 60 FPS) ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = 0;
    let height = 0;

    interface MatrixDrop {
      x: number;
      y: number;
      speed: number;
      char: string;
      alpha: number;
      size: number;
    }

    const HEX_CHARS = '0123456789ABCDEF!@#$%^&*<>[]{}~0x';
    let drops: MatrixDrop[] = [];

    const handleResize = () => {
      const parent = canvas.parentElement;
      width = parent ? parent.clientWidth : window.innerWidth;
      height = parent ? parent.clientHeight : window.innerHeight;
      canvas.width = width;
      canvas.height = height;

      const columnCount = Math.floor(width / 22);
      drops = [];
      for (let i = 0; i < columnCount; i++) {
        drops.push({
          x: i * 22 + 10,
          y: Math.random() * height,
          speed: 1.2 + Math.random() * 2.8,
          char: HEX_CHARS[Math.floor(Math.random() * HEX_CHARS.length)],
          alpha: 0.15 + Math.random() * 0.45,
          size: Math.random() > 0.8 ? 12 : 10
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const render = () => {
      // Gentle trailing fade
      ctx.fillStyle = 'rgba(7, 8, 11, 0.22)';
      ctx.fillRect(0, 0, width, height);

      drops.forEach((drop) => {
        drop.y += drop.speed;
        if (drop.y > height) {
          drop.y = -20;
          drop.char = HEX_CHARS[Math.floor(Math.random() * HEX_CHARS.length)];
          drop.speed = 1.2 + Math.random() * 2.8;
        }

        // Randomly morph character
        if (Math.random() > 0.95) {
          drop.char = HEX_CHARS[Math.floor(Math.random() * HEX_CHARS.length)];
        }

        ctx.font = `${drop.size}px monospace`;
        ctx.fillStyle = `rgba(16, 185, 129, ${drop.alpha})`;
        ctx.fillText(drop.char, drop.x, drop.y);

        // Bright leader glow head
        ctx.fillStyle = `rgba(255, 255, 255, ${drop.alpha * 0.7})`;
        ctx.fillText(drop.char, drop.x, drop.y + 12);
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // --- 2. 3D Perspective Tilt for the Interactive Terminal ---
  const handleTerminalMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = terminalCardRef.current;
    const glare = terminalGlareRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const cardX = e.clientX - rect.left;
    const cardY = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((cardY - centerY) / centerY) * -10; // Max 10 deg tilt
    const rotateY = ((cardX - centerX) / centerX) * 12;

    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.015, 1.015, 1.015)`;

    if (glare) {
      const glareX = (cardX / rect.width) * 100;
      const glareY = (cardY / rect.height) * 100;
      glare.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255, 255, 255, 0.08), transparent 65%)`;
    }
  };

  const handleTerminalMouseLeave = () => {
    const card = terminalCardRef.current;
    const glare = terminalGlareRef.current;
    if (card) {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    }
    if (glare) {
      glare.style.background = 'radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.04), transparent 70%)';
    }
  };

  const handleCopyHash = async () => {
    sound.playTap();
    if (!activeSha256) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(activeSha256);
      } else {
        throw new Error('Clipboard API unavailable');
      }
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2500);
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = activeSha256;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        setCopiedHash(true);
        setTimeout(() => setCopiedHash(false), 2500);
      } catch (err) {
        console.warn('Copy failed:', err);
      }
    }
  };

  const handleCheckoutRedirect = (url: string) => {
    sound.playTap();
    if (url && isSafeRedirectUrl(url)) {
      window.location.href = url;
    } else {
      onLaunchApp();
    }
  };

  const interactiveSnippets = [
    {
      id: 0,
      domain: 'PBQ_LAB',
      targetPath: '/var/log/auth.log',
      title: 'CompTIA Security+ (SY0-701) · PBQ Lab',
      target: 'Auth Log Forensic Analysis',
      code: [
        '$ tail -n 5 /var/log/auth.log',
        'Oct 18 19:12:01 edge-gw sshd[8412]: Invalid user admin from 192.168.1.105 port 44210',
        'Oct 18 19:12:03 edge-gw sshd[8415]: Failed password for root from 192.168.1.105 port 44212 ssh2',
        'Oct 18 19:12:04 edge-gw sshd[8418]: Failed password for root from 192.168.1.105 port 44214 ssh2',
        'Oct 18 19:12:05 edge-gw sshd[8420]: Accepted password for deploy from 192.168.1.105 port 44216 ssh2'
      ],
      question: isEn 
        ? 'Target anomaly: Which IP executed a successful credential compromise after brute-force?'
        : 'Anomalia: Quale IP ha completato una violazione credenziali dopo il brute-force?',
      solution: '192.168.1.105 [Compromised Account: deploy]'
    },
    {
      id: 1,
      domain: 'APPSEC_1V1',
      targetPath: '/api/v1/auth/session',
      title: 'AppSec Arena 1v1 · SQLi Injection Flaw',
      target: 'Endpoint: /api/v1/auth/session',
      code: [
        'def verify_operator_token(auth_header):',
        '    token = request.headers.get("Authorization")',
        '    # VULNERABLE QUERY CONCATENATION:',
        '    cursor.execute(f"SELECT * FROM users WHERE session_id = \'{token}\'")',
        '    return cursor.fetchone()'
      ],
      question: isEn
        ? 'Detect vector: Unsanitized parameter passed directly into SQL query execution.'
        : 'Vettore: Parametro non sanitizzato concatenato direttamente nella query SQL.',
      solution: "Exploit Vector: ' OR 1=1 --"
    }
  ];

  const currentSnippet = interactiveSnippets[selectedTerminalSnippet];

  return (
    <div className="min-h-screen bg-[#07080B] text-zinc-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300 overflow-x-hidden antialiased">
      
      {/* ================================================================= */}
      {/* 1. TACTICAL COMMAND HEADER */}
      {/* ================================================================= */}
      <header className="sticky top-0 z-40 bg-[#07080B]/90 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          
          {/* Brand ID */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <img 
                src="/brand/zeroday_icon_192.png" 
                alt="Pwnify Icon" 
                className="w-7 h-7 rounded-sm object-cover border border-zinc-700 bg-zinc-900" 
              />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-bold tracking-tight text-white font-mono text-sm sm:text-base">PWNIFY</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800/90 text-zinc-300 border border-zinc-700">
                v{versionInfo.versionName}
              </span>
            </div>
          </div>

          {/* Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-mono text-zinc-400">
            <a href="#features" className="hover:text-emerald-400 transition-colors">
              // FEATURES
            </a>
            <a href="#pbq" className="hover:text-emerald-400 transition-colors">
              // PBQ_LABS
            </a>
            <a href="#pricing" className="hover:text-emerald-400 transition-colors">
              // TIERS
            </a>
            <a href="#download" className="hover:text-emerald-400 transition-colors text-emerald-400">
              // DOWNLOAD_APK
            </a>
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2.5">
            {/* Locale Toggle */}
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-sm p-0.5 text-[11px] font-mono">
              <button
                onClick={() => {
                  sound.playTap();
                  setLanguage('en');
                }}
                className={`px-2 py-0.5 rounded-sm transition-colors ${isEn ? 'bg-zinc-800 text-emerald-300 font-bold' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                EN
              </button>
              <button
                onClick={() => {
                  sound.playTap();
                  setLanguage('it');
                }}
                className={`px-2 py-0.5 rounded-sm transition-colors ${!isEn ? 'bg-zinc-800 text-emerald-300 font-bold' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                IT
              </button>
            </div>

            {/* Launch Web App Button */}
            <button
              onClick={() => {
                sound.playTap();
                onLaunchApp();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-colors font-mono tracking-tight shadow-sm"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>{isEn ? 'LAUNCH SANDBOX' : 'AVVIA SANDBOX'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ================================================================= */}
      {/* 2. TACTICAL HERO WITH MATRIX STREAM CANVAS & 3D TILT TERMINAL */}
      {/* ================================================================= */}
      <section className="relative pt-10 pb-16 sm:pt-16 sm:pb-24 px-4 sm:px-6 max-w-7xl mx-auto w-full overflow-hidden">
        
        {/* Real-Time Background Matrix Stream Canvas */}
        <canvas 
          ref={canvasRef} 
          className="absolute inset-0 pointer-events-none opacity-40 z-0"
        />

        {/* Ambient Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#07080B]/60 to-[#07080B] pointer-events-none z-0" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Column: Command Brief */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Telemetry Status Line */}
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-sm bg-zinc-900/90 border border-zinc-800 text-zinc-300 font-mono text-[11px] shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-zinc-400">{isEn ? 'SYSTEM_STATUS:' : 'STATO_SISTEMA:'}</span>
              <span className="text-emerald-400 font-bold">ONLINE</span>
              <span className="text-zinc-600">|</span>
              <span className="text-zinc-400">{isEn ? 'DISTRIBUTION: APK & WEB' : 'DISTRIBUZIONE: APK & WEB'}</span>
            </div>

            {/* Main Punchline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-[1.1] font-sans">
              {isEn ? (
                <>
                  Spot the vulnerability.<br />
                  Defend in <span className="font-mono text-emerald-400">60 seconds</span>.
                </>
              ) : (
                <>
                  Individua la falla.<br />
                  Difendi in <span className="font-mono text-emerald-400">60 secondi</span>.
                </>
              )}
            </h1>

            {/* Subheading */}
            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed max-w-2xl font-mono">
              {isEn ? (
                'CompTIA Security+ (SY0-701), Cisco CCNA, and CEH certification preparation re-engineered as practical offensive/defensive operations: 1v1 blitz duels, interactive Linux/network Performance-Based Questions (PBQ), and historical CVE threat forensics.'
              ) : (
                'La preparazione per CompTIA Security+ (SY0-701), Cisco CCNA e CEH trasformata in simulazioni operative reali: duelli 1v1 blitz, laboratori pratici Performance-Based Questions (PBQ) su terminali Linux e analisi forense di CVE reali.'
              )}
            </p>

            {/* Primary Action Buttons */}
            <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Download APK CTA */}
              <a
                href={apkDownloadUrl}
                download={APK_FILENAME}
                onClick={() => sound.playTap()}
                className="flex items-center justify-center gap-2.5 px-6 py-3 rounded-sm bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-transform hover:-translate-y-0.5 font-mono tracking-tight shadow-lg shadow-emerald-500/10"
              >
                <Download className="w-4 h-4" />
                <span>{isEn ? 'DOWNLOAD APK (ANDROID)' : 'SCARICA APK (ANDROID)'}</span>
                <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded-sm font-mono">{APK_SIZE}</span>
              </a>

              {/* Web Platform CTA */}
              <button
                onClick={() => {
                  sound.playTap();
                  onLaunchApp();
                }}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-sm bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-semibold transition-colors font-mono"
              >
                <Globe className="w-4 h-4 text-emerald-400" />
                <span>{isEn ? 'LAUNCH IN BROWSER' : 'AVVIA NEL BROWSER'}</span>
                <ArrowRight className="w-4 h-4 text-zinc-500" />
              </button>
            </div>

            {/* Architectural Trust Points */}
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] font-mono text-zinc-400">
              <div className="flex items-center gap-2 border-l border-zinc-800 pl-2.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{isEn ? 'Offline-first engine' : 'Architettura offline-first'}</span>
              </div>
              <div className="flex items-center gap-2 border-l border-zinc-800 pl-2.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{isEn ? 'Zero trackers or telemetry' : 'Zero tracciamento o ads'}</span>
              </div>
              <div className="flex items-center gap-2 border-l border-zinc-800 pl-2.5">
                <Smartphone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Android 8.0+ / Web SPA</span>
              </div>
            </div>

          </div>

          {/* Right Column: 3D Perspective Tilt Terminal */}
          <div 
            className="lg:col-span-5"
            onMouseMove={handleTerminalMouseMove}
            onMouseLeave={handleTerminalMouseLeave}
          >
            <div 
              ref={terminalCardRef}
              style={{
                transformStyle: 'preserve-3d',
                transition: 'transform 0.12s ease-out, box-shadow 0.2s ease',
                willChange: 'transform'
              }}
              className="relative bg-[#090A0E]/95 border border-zinc-800 hover:border-emerald-500/50 rounded-sm overflow-hidden shadow-2xl shadow-black/80 backdrop-blur-md"
            >
              
              {/* Dynamic Glare Reflection Overlay */}
              <div 
                ref={terminalGlareRef} 
                className="absolute inset-0 pointer-events-none z-20 rounded-sm"
                style={{
                  background: 'radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.04), transparent 70%)'
                }}
              />

              {/* Terminal Title Bar */}
              <div className="bg-[#0D0E14] px-3.5 py-2 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block"></span>
                  <span className="text-[11px] font-mono text-zinc-400 ml-2">pwnify-soc-node-01</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-rose-950/40 text-rose-300 border border-rose-800/60 font-bold">
                    60s BLITZ
                  </span>
                </div>
              </div>

              {/* Snippet Tabs */}
              <div className="bg-[#07080B] px-3 py-1.5 border-b border-zinc-800/80 flex gap-2 text-[11px] font-mono overflow-x-auto">
                {interactiveSnippets.map((s, idx) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      sound.playTap();
                      setSelectedTerminalSnippet(idx);
                      setTerminalExploitFound(false);
                    }}
                    className={`px-2.5 py-1 rounded-sm transition-colors shrink-0 ${
                      selectedTerminalSnippet === idx 
                        ? 'bg-zinc-800 text-emerald-300 border border-emerald-500/40 font-bold' 
                        : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                    }`}
                  >
                    #{idx + 1} {s.domain}
                  </button>
                ))}
              </div>

              {/* Code Canvas */}
              <div className="p-3.5 font-mono text-xs space-y-3">
                <div className="flex items-center justify-between text-[11px] text-zinc-400 pb-1 border-b border-zinc-800/60">
                  <span className="truncate">PATH: <span className="text-zinc-200">{currentSnippet.targetPath}</span></span>
                  <span className="text-amber-400 shrink-0 text-[10px]">LIVE TARGET</span>
                </div>

                <div className="bg-[#050608] p-3 rounded-sm border border-zinc-800/90 space-y-1 overflow-x-auto text-[11px] leading-relaxed">
                  {currentSnippet.code.map((line, i) => (
                    <div key={i} className="flex gap-2 font-mono">
                      <span className="text-zinc-600 select-none w-4 text-right">{i + 1}</span>
                      <span className={
                        i === currentSnippet.code.length - 1 
                          ? 'text-emerald-300 font-semibold' 
                          : line.startsWith('$') 
                            ? 'text-cyan-300' 
                            : 'text-zinc-300'
                      }>
                        {line}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-1 space-y-2">
                  <p className="text-zinc-300 text-xs font-semibold leading-snug">
                    {currentSnippet.question}
                  </p>

                  {!terminalExploitFound ? (
                    <button
                      onClick={() => {
                        sound.playVictoryFanfare();
                        setTerminalExploitFound(true);
                      }}
                      className="w-full py-2 px-3 rounded-sm bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-colors tracking-tight"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      <span>{isEn ? 'VERIFY EXPLOIT VECTOR' : 'VERIFICA VETTORE EXPLOIT'}</span>
                    </button>
                  ) : (
                    <div className="p-2.5 rounded-sm bg-emerald-950/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{isEn ? 'Vulnerability Identified!' : 'Vulnerabilità Individuata!'}</span>
                      </div>
                      <div className="text-[11px] text-zinc-300 pl-5 break-all">{currentSnippet.solution}</div>
                    </div>
                  )}
                </div>

              </div>

              {/* Terminal Footer Info */}
              <div className="bg-[#0D0E14] px-3.5 py-1.5 border-t border-zinc-800 text-[10px] font-mono text-zinc-500 flex justify-between">
                <span>STATUS: RUNNING</span>
                <span>ENGINE: C_EMBEDDED_ARENA</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ================================================================= */}
      {/* 3. DISTRIBUTION HUB & CRYPTOGRAPHIC VERIFICATION */}
      {/* ================================================================= */}
      <section id="download" className="py-16 bg-[#090A0E] border-y border-zinc-800 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto space-y-10">
          
          <div className="space-y-1.5">
            <div className="text-emerald-400 font-mono text-xs uppercase tracking-wider">
              // DISTRIBUTION_HUB
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {isEn ? 'Official Package Distribution' : 'Distribuzione Pacchetti Ufficiali'}
            </h2>
            <p className="text-zinc-400 text-sm max-w-2xl font-mono">
              {isEn
                ? 'Download the official verified Android APK directly or launch the zero-install web application.'
                : 'Scarica l\'APK Android firmato ufficialmente con verifica crittografica SHA-256 oppure accedi tramite browser.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Card 1: Android APK Direct */}
            <div className="bg-[#0C0D12] border border-zinc-800 rounded-sm p-6 space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img 
                      src="/brand/zeroday_icon_192.png" 
                      alt="Pwnify APK" 
                      className="w-10 h-10 rounded-sm object-cover border border-zinc-700 bg-zinc-900" 
                    />
                    <div>
                      <h3 className="font-bold text-white text-base font-mono">Pwnify for Android</h3>
                      <p className="text-xs font-mono text-zinc-400">Build: v{versionInfo.versionName} (b{versionInfo.versionCode}) · Size: {APK_SIZE}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-sm bg-zinc-800 text-emerald-400 border border-emerald-500/30 font-bold">
                    STABLE
                  </span>
                </div>

                <p className="text-xs text-zinc-300 font-mono leading-relaxed">
                  {isEn 
                    ? 'Standalone Android package with offline database persistence, tactile haptics, and zero-latency PBQ evaluation.' 
                    : 'Pacchetto Android nativo con database SQLite offline locale, feedback aptico e laboratori PBQ senza latenza.'}
                </p>

                {/* SHA-256 Checksum Panel */}
                <div className="bg-[#050608] p-3 rounded-sm border border-zinc-800 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                    <span className="font-bold text-zinc-300">SHA-256 CHECKSUM</span>
                    <button 
                      onClick={handleCopyHash}
                      className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-mono transition-colors"
                    >
                      {copiedHash ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedHash ? 'COPIED' : 'COPY'}</span>
                    </button>
                  </div>
                  <div className="font-mono text-[10px] text-zinc-400 break-all select-all leading-tight">
                    {activeSha256 || (isEn ? 'SHA-256 verified on release' : 'SHA-256 verificato al rilascio')}
                  </div>
                </div>

                {/* Sideloading Procedural Guide */}
                <div className="border-t border-zinc-800/80 pt-3 text-[11px] font-mono text-zinc-400 space-y-1">
                  <div className="font-bold text-zinc-300">// INSTALLATION_PROTOCOL:</div>
                  <div>1. {isEn ? 'Tap Download APK and confirm browser download prompt.' : 'Tocca Scarica APK e conferma il download nel browser.'}</div>
                  <div>2. {isEn ? 'Allow "Install unknown apps" for browser if prompted.' : 'Consenti "Installa app sconosciute" per il tuo browser.'}</div>
                  <div>3. {isEn ? 'Open APK and sign in with your callsign.' : 'Apri l\'APK ed effettua l\'accesso con il tuo callsign.'}</div>
                </div>
              </div>

              {/* Download Buttons */}
              <div className="pt-2 space-y-2">
                <a
                  href={apkDownloadUrl}
                  download={APK_FILENAME}
                  onClick={() => sound.playTap()}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-sm bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold text-xs transition-colors tracking-tight"
                >
                  <Download className="w-4 h-4" />
                  <span>{isEn ? 'DOWNLOAD APK FILE (DIRECT)' : 'SCARICA FILE APK (DIRETTO)'}</span>
                </a>

                <a
                  href={APK_GITHUB_MIRROR}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-sm bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white font-mono text-xs border border-zinc-800 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{isEn ? 'GitHub Releases Mirror' : 'Mirror GitHub Releases'}</span>
                </a>
              </div>

            </div>

            {/* Card 2: Web Platform */}
            <div className="bg-[#0C0D12] border border-zinc-800 rounded-sm p-6 space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-sm bg-zinc-900 border border-zinc-700 flex items-center justify-center text-cyan-400">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base font-mono">Pwnify Web Sandbox</h3>
                      <p className="text-xs font-mono text-zinc-400">Zero installation · Modern Browser SPA</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-sm bg-zinc-800 text-cyan-300 border border-cyan-500/30 font-bold">
                    EDGE CDN
                  </span>
                </div>

                <p className="text-xs text-zinc-300 font-mono leading-relaxed">
                  {isEn 
                    ? 'Launch the Pwnify Cyber Arena directly in desktop or mobile browsers. Protected with Content Security Policy, HSTS, and edge rewrites.' 
                    : 'Avvia l\'intera Cyber Arena direttamente dal browser di qualsiasi dispositivo. Connessione cifrata HSTS e latenza zero.'}
                </p>

                <div className="bg-[#050608] p-3 rounded-sm border border-zinc-800 space-y-1.5 text-[11px] font-mono text-zinc-400">
                  <div className="text-emerald-400 font-bold">{isEn ? '✓ INSTANT SANDBOX ACCESS' : '✓ ACCESSO SANDBOX IMMEDIATO'}</div>
                  <p className="text-zinc-500 text-[10px]">
                    {isEn ? 'No device permissions or installation required. Boots in under 1 second.' : 'Nessun download né permesso richiesto. Pronto in meno di 1 secondo.'}
                  </p>
                  <div className="text-[10px] text-zinc-500 pt-1 border-t border-zinc-800">
                    {isEn ? 'Supported: Chrome, Firefox, Safari, Edge, Brave' : 'Supportati: Chrome, Firefox, Safari, Edge, Brave'}
                  </div>
                </div>

                <div className="border-t border-zinc-800/80 pt-3 text-[11px] font-mono text-zinc-400 space-y-1">
                  <div className="font-bold text-zinc-300">// PERSISTENCE:</div>
                  <div>• {isEn ? 'Encrypted localStorage session sync' : 'Sincronizzazione cifrata in sessione'}</div>
                  <div>• {isEn ? 'Seamless migration to native Android app' : 'Importazione progressi nell\'app nativa'}</div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    sound.playTap();
                    onLaunchApp();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-sm bg-zinc-900 hover:bg-zinc-800 text-white font-mono font-bold text-xs transition-colors border border-zinc-700 tracking-tight"
                >
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span>{isEn ? 'LAUNCH WEB SANDBOX' : 'AVVIA NELLA SANDBOX'}</span>
                  <ArrowRight className="w-4 h-4 text-zinc-400" />
                </button>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* ================================================================= */}
      {/* 4. CORE PLATFORM PILLARS (HIGH-DENSITY SPEC GRID) */}
      {/* ================================================================= */}
      <section id="features" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto space-y-12">
        
        <div className="space-y-1.5">
          <div className="text-emerald-400 font-mono text-xs uppercase tracking-wider">
            // CORE_MODULES
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {isEn ? 'Engineered for High-Stakes Operations' : 'Progettato per Operazioni sul Campo'}
          </h2>
          <p className="text-zinc-400 text-sm max-w-2xl font-mono">
            {isEn 
              ? 'Certifications demand real-world diagnostic reflexes. Pwnify trains operators against real PCAPs, logs, and live code vulnerabilities.'
              : 'I corsi tradizionali insegnano nozioni a memoria. Pwnify ti allena di fronte a log reali, stream di pacchetti e vulnerabilità reali da sfruttare contro il tempo.'}
          </p>
        </div>

        {/* 4-Quadrant Tactical Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Module 1: 1v1 Arena */}
          <div className="border border-zinc-800 rounded-sm p-5 bg-[#0A0B10] space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Swords className="w-4 h-4" />
                <span>1V1_CYBER_BLITZ</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">MODULE_01</span>
            </div>
            <h3 className="text-base font-bold text-white font-mono">
              {isEn ? '60s Real-Time Vulnerability Duels' : 'Duelli 1v1 da 60s in Tempo Reale'}
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed font-mono">
              {isEn
                ? 'Match against operators in 60-second synchronized combat. Identify SQL injections, privilege escalation vectors, buffer overflows, and broken access controls.'
                : 'Sfida altri operatori in match sincronizzati da 60 secondi. Individua exploit SQLi, privilege escalation, buffer overflow e controlli di accesso compromessi.'}
            </p>
            <div className="pt-2 text-[11px] font-mono text-zinc-500 border-t border-zinc-800/80">
              ELO Tiers: Bronze · Silver · Gold · Platinum · Cyber Warlord
            </div>
          </div>

          {/* Module 2: PBQ Labs */}
          <div id="pbq" className="border border-zinc-800 rounded-sm p-5 bg-[#0A0B10] space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2 text-cyan-400 font-bold">
                <FileCode2 className="w-4 h-4" />
                <span>PBQ_PERFORMANCE_LABS</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">MODULE_02</span>
            </div>
            <h3 className="text-base font-bold text-white font-mono">
              CompTIA Security+ (SY0-701) & Cisco CCNA
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed font-mono">
              {isEn
                ? 'Solve authentic Performance-Based Questions (PBQ): configure firewall rule sets, reassemble Wireshark TCP streams, remediate Linux permission escalations, and audit IAM policies.'
                : 'Affronta vere Performance-Based Questions (PBQ): configura regole firewall, riassembla flussi TCP Wireshark, correggi permessi Linux e verifica policy IAM.'}
            </p>
            <div className="pt-2 text-[11px] font-mono text-zinc-500 border-t border-zinc-800/80">
              {isEn ? '100% aligned with official exam domains' : 'Allineamento completo agli obiettivi d\'esame'}
            </div>
          </div>

          {/* Module 3: Readiness Radar */}
          <div className="border border-zinc-800 rounded-sm p-5 bg-[#0A0B10] space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <Radar className="w-4 h-4" />
                <span>READINESS_RADAR</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">MODULE_03</span>
            </div>
            <h3 className="text-base font-bold text-white font-mono">
              {isEn ? '6-Axis Competence Telemetry' : 'Radar di Idoneità a 6 Assi'}
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed font-mono">
              {isEn
                ? 'Algorithmic assessment tracking AppSec, Network Defense, Cryptography, Identity/IAM, Incident Response, and Governance to predict exam pass likelihood.'
                : 'Algoritmo telemetrico che misura le tue competenze in AppSec, Difesa di Rete, Crittografia, IAM, Risposta a Incidenti e Governance per dirti se sei pronto per l\'esame.'}
            </p>
            <div className="pt-2 text-[11px] font-mono text-zinc-500 border-t border-zinc-800/80">
              {isEn ? 'Dynamic calibration based on lab completion' : 'Calibrazione dinamica basata sulle simulazioni'}
            </div>
          </div>

          {/* Module 4: Daily Breaches */}
          <div className="border border-zinc-800 rounded-sm p-5 bg-[#0A0B10] space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2 text-rose-400 font-bold">
                <Flame className="w-4 h-4" />
                <span>DAILY_BREACH_FORENSICS</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">MODULE_04</span>
            </div>
            <h3 className="text-base font-bold text-white font-mono">
              {isEn ? 'Historical CVE Deconstructions' : 'Decostruzione Giornaliera di CVE Reali'}
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed font-mono">
              {isEn
                ? 'Every 24 hours, deconstruct forensic artifacts from notable real breaches: Log4Shell, SolarWinds, MoveIT Transfer, and EternalBlue.'
                : 'Ogni 24 ore analizza reperti forensi di incidenti storici reali come Log4Shell, SolarWinds, MoveIT ed EternalBlue per affinare l\'istinto analitico.'}
            </p>
            <div className="pt-2 text-[11px] font-mono text-zinc-500 border-t border-zinc-800/80">
              {isEn ? 'Continuous daily scenario releases' : 'Nuovi scenari pubblicati ogni giorno'}
            </div>
          </div>

        </div>

      </section>

      {/* ================================================================= */}
      {/* 5. ACCESS TIERS & LICENSE MATRIX */}
      {/* ================================================================= */}
      <section id="pricing" className="py-20 bg-[#090A0E] border-y border-zinc-800 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="space-y-1.5 text-center max-w-2xl mx-auto">
            <div className="text-emerald-400 font-mono text-xs uppercase tracking-wider">
              // ACCESS_TIERS
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {isEn ? 'Operational License Tiers' : 'Livelli Operativi di Licenza'}
            </h2>
            <p className="text-zinc-400 text-sm font-mono">
              {isEn 
                ? 'Start free in sandbox mode, or unlock PRO for unlimited PBQ labs and continuous 1v1 battles.'
                : 'Inizia gratis nella sandbox, o sblocca PRO per tutti i laboratori PBQ, le certificazioni e i duelli infiniti.'}
            </p>
          </div>

          {/* Pricing Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Tier 1: Free Operator */}
            <div className="bg-[#0C0D12] border border-zinc-800 rounded-sm p-6 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-white text-base font-mono">Free Operator</h3>
                    <p className="text-xs text-zinc-400 font-mono">{isEn ? 'Sandbox training' : 'Addestramento base'}</p>
                  </div>
                  <span className="font-mono text-[10px] text-zinc-400 px-2 py-0.5 rounded-sm bg-zinc-800 border border-zinc-700">
                    SANDBOX
                  </span>
                </div>

                <div className="text-2xl font-bold font-mono text-white">
                  €0 <span className="text-xs text-zinc-500 font-normal">{isEn ? '/ forever' : '/ sempre'}</span>
                </div>

                <ul className="text-xs text-zinc-300 space-y-2.5 font-mono pt-2">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{isEn ? 'Daily Breach (1/day)' : 'Breccia del Giorno (1/giorno)'}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{isEn ? '3 Arena PvP Tickets daily' : '3 Ticket Arena PvP / giorno'}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{isEn ? 'Level 1 PBQ Certification Labs' : 'Laboratori PBQ Livello 1'}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{isEn ? 'Base Readiness Radar score' : 'Radar Idoneità base'}</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => {
                  sound.playTap();
                  onLaunchApp();
                }}
                className="w-full py-2.5 rounded-sm bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-mono text-xs font-semibold border border-zinc-700 transition-colors"
              >
                {isEn ? 'START FREE' : 'INIZIA GRATIS'}
              </button>
            </div>

            {/* Tier 2: Pwnify PRO (Featured) */}
            <div className="bg-[#0D0F17] border-2 border-emerald-500/70 rounded-sm p-6 flex flex-col justify-between space-y-6 relative shadow-lg">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-black px-3 py-0.5 rounded-sm font-mono text-[10px] font-extrabold uppercase tracking-wider">
                {isEn ? 'RECOMMENDED · 7-DAY TRIAL' : 'CONSIGLIATO · 7 GIORNI GRATIS'}
              </div>

              <div className="space-y-4 pt-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-white text-base font-mono flex items-center gap-1.5">
                      <span>Pwnify PRO</span>
                      <Flame className="w-4 h-4 text-emerald-400" />
                    </h3>
                    <p className="text-xs text-zinc-400 font-mono">{isEn ? 'Full certification pass' : 'Pass certificazioni completo'}</p>
                  </div>
                  <span className="font-mono text-[10px] text-emerald-400 px-2 py-0.5 rounded-sm bg-emerald-950/40 border border-emerald-500/40 font-bold">
                    FULL ACCESS
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="text-3xl font-extrabold font-mono text-emerald-400">
                    €{PRICING_CONFIG.plans.monthly.amount.toFixed(2)} <span className="text-xs text-zinc-400 font-normal">{isEn ? '/ mo' : '/ mese'}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-mono">
                    {isEn ? `or €${PRICING_CONFIG.plans.annual.amount.toFixed(2)}/yr (€${(PRICING_CONFIG.plans.annual.amount / 12).toFixed(2)}/mo, save 42%)` : `o €${PRICING_CONFIG.plans.annual.amount.toFixed(2)}/anno (€${(PRICING_CONFIG.plans.annual.amount / 12).toFixed(2)}/mese, risparmi 42%)`}
                  </p>
                </div>

                <ul className="text-xs text-zinc-200 space-y-2.5 font-mono pt-2">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="font-semibold text-white">{isEn ? 'Infinite 1v1 Arena Duels' : 'Ticket Arena 1v1 Infiniti'}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{isEn ? 'All Security+ & CCNA PBQ Labs' : 'Tutti i laboratori PBQ'}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{isEn ? '6-Axis Predictive Radar' : 'Radar predittivo a 6 assi'}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{isEn ? 'Streak Shield & 2x XP' : 'Protezione Streak & 2x XP'}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{isEn ? 'Official License Key 0xPRO' : 'Chiave Licenza 0xPRO firmata'}</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                {isPlay ? (
                  <div className="w-full py-2.5 px-3 rounded-sm bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono text-xs text-center font-bold">
                    {isEn ? 'Purchases not available in this version' : 'Acquisti non disponibili in questa versione'}
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => handleCheckoutRedirect(MONETIZATION_CONFIG.stripeMonthlyUrl)}
                      className="w-full py-3 rounded-sm bg-emerald-500 hover:bg-emerald-400 text-black font-mono text-xs font-bold transition-colors flex items-center justify-center gap-1.5 tracking-tight shadow-sm"
                    >
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      <span>{isEn ? 'START 7-DAY TRIAL (MONTHLY)' : 'ATTIVA 7 GIORNI GRATIS'}</span>
                    </button>
                    <button
                      onClick={() => handleCheckoutRedirect(MONETIZATION_CONFIG.stripeAnnualUrl)}
                      className="w-full py-2 rounded-sm bg-zinc-900 hover:bg-zinc-800 text-emerald-400 border border-emerald-500/30 font-mono text-[11px] font-semibold transition-colors flex items-center justify-center gap-1"
                    >
                      <span>{isEn ? 'Annual (€69/yr · Save 42%)' : 'Scegli Annuale (€69/anno · -42%)'}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Tier 3: Starter Pass 90 Days */}
            <div className="bg-[#0C0D12] border border-zinc-800 rounded-sm p-6 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-white text-base font-mono">Starter Pass (90d)</h3>
                    <p className="text-xs text-zinc-400 font-mono">{isEn ? 'Single charge, zero renewal' : 'Pagamento singolo, nessun rinnovo'}</p>
                  </div>
                  <span className="font-mono text-[10px] text-zinc-400 px-2 py-0.5 rounded-sm bg-zinc-800 border border-zinc-700">
                    EXAM SPRINT
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="text-2xl font-bold font-mono text-white">
                    €{PRICING_CONFIG.plans.starterPass.amount.toFixed(2)}
                  </div>
                  <p className="text-[11px] text-zinc-500 font-mono">
                    {isEn ? 'Single charge · 90-day full access' : 'Pagamento unico · 90 giorni di accesso'}
                  </p>
                </div>

                <ul className="text-xs text-zinc-300 space-y-2.5 font-mono pt-2">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{isEn ? 'All PRO features for 90 days' : 'Tutte le funzioni PRO per 90gg'}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{isEn ? 'No recurring billing on card' : 'Nessun rinnovo automatico'}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{isEn ? 'Ideal for exam cramming' : 'Ideale per preparare l\'esame'}</span>
                  </li>
                </ul>
              </div>

              {isPlay ? (
                <div className="w-full py-2.5 px-3 rounded-sm bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono text-xs text-center font-bold">
                  {isEn ? 'Purchases not available in this version' : 'Acquisti non disponibili in questa versione'}
                </div>
              ) : (
                <button
                  onClick={() => handleCheckoutRedirect(MONETIZATION_CONFIG.starterPassUrl)}
                  className="w-full py-2.5 rounded-sm bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-mono text-xs font-semibold border border-zinc-700 transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>{isEn ? 'Get 90-Day Pass (€19.99)' : 'Acquista Pass 90gg (€19.99)'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

          </div>

        </div>
      </section>

      {/* ================================================================= */}
      {/* 6. SECURITY & AUTHENTICITY RUNBOOK FAQ */}
      {/* ================================================================= */}
      <section className="py-16 px-4 sm:px-6 max-w-4xl mx-auto space-y-8">
        <div className="space-y-1.5 text-center">
          <div className="text-emerald-400 font-mono text-xs uppercase tracking-wider">
            // RUNBOOK_FAQ
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white font-mono tracking-tight">
            {isEn ? 'Security & Technical Runbook' : 'Domande Frequenti & Sicurezza'}
          </h2>
        </div>

        <div className="space-y-3 font-mono">
          <div className="border border-zinc-800 rounded-sm p-4 bg-[#0A0B10] space-y-2">
            <h3 className="font-bold text-white text-xs flex items-center gap-2">
              <span className="text-emerald-400">[SEC::01]</span>
              <span>{isEn ? 'Is the Android APK package safe and verified?' : 'L\'APK per Android è sicura e priva di malware?'}</span>
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed pl-6">
              {isEn 
                ? 'Yes. Every APK build is cryptographically signed and published with its public SHA-256 hash. Zero telemetry SDKs, zero third-party ads, zero tracking scripts. You can inspect the source directly on GitHub.'
                : 'Sì. Ogni build dell\'APK è firmata crittograficamente con hash SHA-256 pubblico verificabile. L\'app non include SDK pubblicitari, né traccianti né script di telemetria. Il codice sorgente è interamente trasparente.'}
            </p>
          </div>

          <div className="border border-zinc-800 rounded-sm p-4 bg-[#0A0B10] space-y-2">
            <h3 className="font-bold text-white text-xs flex items-center gap-2">
              <span className="text-emerald-400">[SEC::02]</span>
              <span>{isEn ? 'Can I use Pwnify on desktop without installing anything?' : 'Posso usare Pwnify su PC senza installare nulla?'}</span>
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed pl-6">
              {isEn
                ? 'Yes. Clicking "LAUNCH SANDBOX" opens the full platform directly in your browser. All PBQ labs, 1v1 arenas, and telemetry work seamlessly on desktop.'
                : 'Assolutamente sì. Cliccando su "AVVIA SANDBOX" entri subito nella versione web completa, senza dover installare alcun software sul computer.'}
            </p>
          </div>

          <div className="border border-zinc-800 rounded-sm p-4 bg-[#0A0B10] space-y-2">
            <h3 className="font-bold text-white text-xs flex items-center gap-2">
              <span className="text-emerald-400">[SEC::03]</span>
              <span>{isEn ? 'How does the license key and trial work?' : 'Come funzionano la prova di 7 giorni e la chiave licenza?'}</span>
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed pl-6">
              {isEn
                ? 'The 7-day trial lets you explore all PRO features without being charged. If you purchase, you receive a cryptographically signed license key (0xPRO-XXXX) valid across both Web and Android.'
                : 'I 7 giorni di prova ti permettono di esplorare tutte le funzionalità PRO a costo zero. Al momento dell\'acquisto ricevi una licenza crittografica firmata (0xPRO-XXXX) utilizzabile sia da Web che su Android.'}
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 7. SYSTEM TERMINAL FOOTER */}
      {/* ================================================================= */}
      <footer className="mt-auto border-t border-zinc-800 bg-[#050608] py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-zinc-500 font-mono">
          
          <div className="space-y-1 text-center md:text-left">
            <div className="text-zinc-300 font-bold">PWNIFY // CYBER_WARFARE_ACADEMY</div>
            <div className="text-[11px] text-zinc-500">Official Portal & Download Hub · v{versionInfo.versionName} (b{versionInfo.versionCode})</div>
          </div>

          {/* Legal Triggers */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px]">
            <button 
              onClick={() => onOpenLegal('privacy')}
              className="hover:text-emerald-400 transition-colors"
            >
              {isEn ? 'Privacy Policy' : 'Informativa Privacy'}
            </button>
            <span className="text-zinc-700">•</span>
            <button 
              onClick={() => onOpenLegal('terms')}
              className="hover:text-emerald-400 transition-colors"
            >
              {isEn ? 'Terms of Service' : 'Termini di Servizio'}
            </button>
            <span className="text-zinc-700">•</span>
            <button 
              onClick={() => onOpenLegal('refund')}
              className="hover:text-emerald-400 transition-colors"
            >
              {isEn ? 'Withdrawal Policy (art. 59)' : 'Diritto di Recesso (art. 59)'}
            </button>
            {onOpenCookiePrefs && (
              <>
                <span className="text-zinc-700">•</span>
                <button 
                  onClick={onOpenCookiePrefs}
                  className="hover:text-emerald-400 transition-colors"
                >
                  {isEn ? 'Cookie Preferences' : 'Preferenze Cookie'}
                </button>
              </>
            )}
          </div>

          <div className="text-[11px] text-zinc-600">
            © {new Date().getFullYear()} Pwnify. All rights reserved.
          </div>

        </div>
      </footer>

    </div>
  );
};
