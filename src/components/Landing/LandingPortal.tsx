import React, { useState } from 'react';
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
  Cpu, 
  CheckCircle2, 
  ExternalLink, 
  Copy, 
  Check, 
  Smartphone, 
  Globe, 
  FileCode2, 
  Radar, 
  AlertTriangle,
  Flame,
  ArrowRight,
  Zap
} from 'lucide-react';

interface LandingPortalProps {
  onLaunchApp: () => void;
  onOpenLegal: (tab: 'privacy' | 'terms' | 'refund' | 'cookies') => void;
  onOpenCookiePrefs?: () => void;
}

const APK_FILENAME = 'zeroday.apk';
const APK_DOWNLOAD_URL = '/downloads/zeroday.apk';
const APK_GITHUB_MIRROR = 'https://github.com/MatteAdor/zeroday_app/raw/main/releases/zeroday-app-debug.apk';
const APK_SHA256 = 'ea8c55f0c7563905ae58a58b33cf84222d03dbb19862c731c9410497811171b7';
const APK_VERSION = 'v1.2.0';
const APK_SIZE = '20.8 MB';

export const LandingPortal: React.FC<LandingPortalProps> = ({
  onLaunchApp,
  onOpenLegal,
  onOpenCookiePrefs
}) => {
  const { lang, setLanguage } = useLanguage();
  const isEn = lang === 'en';

  const [copiedHash, setCopiedHash] = useState(false);
  const [selectedTerminalSnippet, setSelectedTerminalSnippet] = useState<number>(0);
  const [terminalExploitFound, setTerminalExploitFound] = useState(false);

  const handleCopyHash = () => {
    sound.playTap();
    navigator.clipboard.writeText(APK_SHA256);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2500);
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
      title: 'CompTIA Security+ · SY0-701 PBQ Lab',
      target: 'Auth Log Forensic Analysis',
      code: [
        '$ tail -n 5 /var/log/auth.log',
        'Oct 18 19:12:01 edge-gateway sshd[8412]: Invalid user admin from 192.168.1.105 port 44210',
        'Oct 18 19:12:03 edge-gateway sshd[8415]: Failed password for root from 192.168.1.105 port 44212 ssh2',
        'Oct 18 19:12:04 edge-gateway sshd[8418]: Failed password for root from 192.168.1.105 port 44214 ssh2',
        'Oct 18 19:12:05 edge-gateway sshd[8420]: Accepted password for deploy from 192.168.1.105 port 44216 ssh2'
      ],
      question: isEn 
        ? 'Target anomaly: Which IP executed a successful credential compromise after brute-force?'
        : 'Anomalia: Quale IP ha completato una violazione credenziali dopo il brute-force?',
      solution: '192.168.1.105 [Account: deploy]'
    },
    {
      id: 1,
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
        ? 'Detect vector: Unsanitized f-string parameter passed directly to SQL query.'
        : 'Vettore: Stringa token non sanitizzata concatenata direttamente nella query SQL.',
      solution: "Payload: ' OR 1=1 --"
    }
  ];

  const currentSnippet = interactiveSnippets[selectedTerminalSnippet];

  return (
    <div className="min-h-screen bg-[#070B12] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      
      {/* ================================================================= */}
      {/* 1. TOP NAVIGATION BAR */}
      {/* ================================================================= */}
      <header className="sticky top-0 z-40 bg-[#090D16]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          
          {/* Brand */}
          <div className="flex items-center gap-3">
            <img 
              src="/brand/zeroday_icon_192.png" 
              alt="ZeroDay Icon" 
              className="w-9 h-9 rounded-md object-cover border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.25)]" 
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-white font-mono text-sm sm:text-base">ZERODAY</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {APK_VERSION}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono hidden sm:block">Cyber Warfare & Certifications</p>
            </div>
          </div>

          {/* Center Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-mono text-slate-300">
            <a href="#features" className="hover:text-emerald-400 transition-colors">
              {isEn ? '// Features' : '// Funzionalità'}
            </a>
            <a href="#pbq" className="hover:text-emerald-400 transition-colors">
              {isEn ? '// PBQ Labs' : '// Laboratori PBQ'}
            </a>
            <a href="#pricing" className="hover:text-emerald-400 transition-colors">
              {isEn ? '// Pricing' : '// Piani & Prezzi'}
            </a>
            <a href="#download" className="hover:text-emerald-400 transition-colors text-emerald-400 font-semibold">
              {isEn ? '// Download APK' : '// Scarica APK'}
            </a>
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <div className="flex items-center bg-[#0d1424] border border-white/10 rounded p-0.5 text-[11px] font-mono">
              <button
                onClick={() => {
                  sound.playTap();
                  setLanguage('en');
                }}
                className={`px-2 py-0.5 rounded transition-colors ${isEn ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                EN
              </button>
              <button
                onClick={() => {
                  sound.playTap();
                  setLanguage('it');
                }}
                className={`px-2 py-0.5 rounded transition-colors ${!isEn ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400 hover:text-white'}`}
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-colors shadow-sm font-mono"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>{isEn ? 'Launch Web App' : 'Accedi all\'App'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ================================================================= */}
      {/* 2. HERO SECTION */}
      {/* ================================================================= */}
      <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Direct Proposition */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Live Status Chip */}
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#0d1527] border border-emerald-500/30 text-emerald-400 font-mono text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{isEn ? 'OFFICIAL PORTAL · ANDROID APK & WEB ACCESS' : 'PORTALE UFFICIALE · APK ANDROID & WEB'}</span>
            </div>

            {/* Lead Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              {isEn ? (
                <>
                  Find the zero-day exploit in <span className="text-emerald-400 font-mono">60 seconds</span>.
                </>
              ) : (
                <>
                  Trova l'exploit zero-day in <span className="text-emerald-400 font-mono">60 secondi</span>.
                </>
              )}
            </h1>

            {/* Concrete Mission Subhead */}
            <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-2xl">
              {isEn ? (
                'ZeroDay turns CompTIA Security+, Cisco CCNA, and CEH exam preparation into real offensive/defensive operations: 1v1 blitz duels, interactive Linux/network performance-based questions, and real CVE scenario forensics.'
              ) : (
                'ZeroDay trasforma lo studio di CompTIA Security+, Cisco CCNA e CEH in simulazioni di attacco e difesa sul campo: duelli 1v1 Blitz da 60s, laboratori PBQ su terminali Linux e analisi di brecce reali.'
              )}
            </p>

            {/* Direct Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Primary: Direct APK Download */}
              <a
                href={APK_DOWNLOAD_URL}
                download={APK_FILENAME}
                onClick={() => sound.playTap()}
                className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all font-mono shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>{isEn ? 'Download APK (Android)' : 'Scarica APK (Android)'}</span>
                <span className="text-[10px] bg-slate-950/20 px-1.5 py-0.5 rounded font-mono">{APK_SIZE}</span>
              </a>

              {/* Secondary: Launch Web Platform */}
              <button
                onClick={() => {
                  sound.playTap();
                  onLaunchApp();
                }}
                className="flex items-center justify-center gap-2 px-6 py-3.5 rounded bg-[#111927] hover:bg-[#162134] text-white border border-white/10 font-semibold text-sm transition-all font-mono"
              >
                <Globe className="w-4 h-4 text-emerald-400" />
                <span>{isEn ? 'Launch in Browser' : 'Avvia nel Browser'}</span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Trust and Technical Specifications */}
            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isEn ? 'Offline-first engine' : 'Architettura offline-first'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isEn ? 'Zero trackers & telemetry' : 'Zero pubblicità o tracciamento'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Android 8.0+ / Web SPA</span>
              </div>
            </div>

          </div>

          {/* Right Column: Interactive Terminal Preview */}
          <div className="lg:col-span-5">
            <div className="bg-[#0B101B] border border-white/10 rounded-lg overflow-hidden shadow-2xl">
              
              {/* Terminal Window Chrome */}
              <div className="bg-[#0E1524] px-4 py-2.5 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
                  <span className="text-[11px] font-mono text-slate-400 ml-2">zeroday-arena-node-01</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                    60s BLITZ
                  </span>
                </div>
              </div>

              {/* Terminal Tabs */}
              <div className="bg-[#090E17] px-4 py-1.5 border-b border-white/5 flex gap-2 text-[11px] font-mono">
                {interactiveSnippets.map((s, idx) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      sound.playTap();
                      setSelectedTerminalSnippet(idx);
                      setTerminalExploitFound(false);
                    }}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      selectedTerminalSnippet === idx 
                        ? 'bg-[#152033] text-emerald-400 border border-emerald-500/30' 
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    #{idx + 1} {s.title.split('·')[0].trim()}
                  </button>
                ))}
              </div>

              {/* Terminal Body */}
              <div className="p-4 font-mono text-xs space-y-3">
                <div className="text-slate-400 text-[11px]">
                  Target: <span className="text-amber-300">{currentSnippet.target}</span>
                </div>

                <div className="bg-[#05080E] p-3 rounded border border-white/5 space-y-1 overflow-x-auto text-slate-300 text-[11px]">
                  {currentSnippet.code.map((line, i) => (
                    <div 
                      key={i} 
                      className={`font-mono transition-colors ${
                        i === currentSnippet.code.length - 1 ? 'text-emerald-300 font-semibold' : 'text-slate-300'
                      }`}
                    >
                      {line}
                    </div>
                  ))}
                </div>

                <div className="pt-1">
                  <p className="text-slate-300 text-xs font-semibold mb-2">
                    {currentSnippet.question}
                  </p>

                  {!terminalExploitFound ? (
                    <button
                      onClick={() => {
                        sound.playVictoryFanfare();
                        setTerminalExploitFound(true);
                      }}
                      className="w-full py-2 px-3 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Flag Exploit Vector [Verify]' : 'Segnala Vettore Exploit [Verifica]'}</span>
                    </button>
                  ) : (
                    <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-xs font-mono space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>{isEn ? 'Vulnerability Confirmed!' : 'Vulnerabilità Individuata!'}</span>
                      </div>
                      <div className="text-[11px] text-slate-300">{currentSnippet.solution}</div>
                    </div>
                  )}
                </div>

              </div>

              {/* Terminal Footer */}
              <div className="bg-[#090E17] px-4 py-2 border-t border-white/5 text-[10px] font-mono text-slate-500 flex justify-between">
                <span>STATUS: OPERATIONAL</span>
                <span>ENGINE: C_EMBEDDED_ARENA</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ================================================================= */}
      {/* 3. DOWNLOAD HUB SECTION */}
      {/* ================================================================= */}
      <section id="download" className="py-16 bg-[#090E17] border-y border-white/5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto space-y-10">
          
          <div className="space-y-2">
            <div className="text-emerald-400 font-mono text-xs uppercase tracking-wider">
              {isEn ? '// Direct Deployment & Download Hub' : '// Hub di Download e Distribuzione'}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              {isEn ? 'Deploy ZeroDay on your device' : 'Installa ZeroDay sul tuo dispositivo'}
            </h2>
            <p className="text-slate-400 text-sm max-w-2xl">
              {isEn
                ? 'Download the official Android APK directly or launch the zero-install web application.'
                : 'Scarica l\'APK per Android per un\'esperienza nativa ad alte prestazioni, oppure accedi subito dal browser.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Download Card 1: Android APK */}
            <div className="bg-[#0D1424] border border-white/10 rounded-lg p-6 space-y-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <img 
                    src="/brand/zeroday_icon_192.png" 
                    alt="ZeroDay APK" 
                    className="w-11 h-11 rounded-lg object-cover border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]" 
                  />
                  <div>
                    <h3 className="font-bold text-white text-base">ZeroDay for Android (APK)</h3>
                    <p className="text-xs font-mono text-slate-400">Build: {APK_VERSION} · Size: {APK_SIZE}</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  STABLE
                </span>
              </div>

              <div className="text-xs text-slate-300 space-y-2">
                <p>
                  {isEn 
                    ? 'Standalone Android package with offline database persistence, tactile haptic feedback, and local PBQ lab evaluation.' 
                    : 'Pacchetto Android nativo con database offline locale, feedback aptico tattile e laboratori PBQ senza latenza.'}
                </p>
                <div className="text-[11px] font-mono text-slate-400 space-y-1">
                  <div>• {isEn ? 'Minimum requirements: Android 8.0 (Oreo) or later' : 'Requisiti minimi: Android 8.0 (Oreo) o superiore'}</div>
                  <div>• {isEn ? 'Storage required: 35 MB' : 'Spazio richiesto: 35 MB'}</div>
                </div>
              </div>

              {/* SHA-256 Checksum Box */}
              <div className="bg-[#070B12] p-2.5 rounded border border-white/5 space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>SHA-256 CHECKSUM</span>
                  <button 
                    onClick={handleCopyHash}
                    className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300"
                  >
                    {copiedHash ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedHash ? 'COPIED' : 'COPY'}</span>
                  </button>
                </div>
                <div className="font-mono text-[10px] text-slate-400 break-all select-all">
                  {APK_SHA256}
                </div>
              </div>

              {/* Download Buttons */}
              <div className="space-y-2">
                <a
                  href={APK_DOWNLOAD_URL}
                  download={APK_FILENAME}
                  onClick={() => sound.playTap()}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>{isEn ? 'DOWNLOAD APK FILE (DIRECT)' : 'SCARICA FILE APK (DIRETTO)'}</span>
                </a>

                <a
                  href={APK_GITHUB_MIRROR}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded bg-transparent hover:bg-white/5 text-slate-400 hover:text-white font-mono text-xs border border-white/10 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{isEn ? 'GitHub Releases Mirror' : 'Mirror GitHub Releases'}</span>
                </a>
              </div>

              {/* Android Sideloading mini guide */}
              <div className="border-t border-white/5 pt-3 text-[11px] text-slate-400 space-y-1">
                <div className="font-semibold text-slate-300">{isEn ? 'Install guide:' : 'Guida installazione:'}</div>
                <div>1. {isEn ? 'Tap Download APK and confirm browser prompt.' : 'Tocca Scarica APK e conferma il download nel browser.'}</div>
                <div>2. {isEn ? 'Enable "Install unknown apps" for your browser if prompted.' : 'Consenti "Installa app sconosciute" per il browser se richiesto.'}</div>
                <div>3. {isEn ? 'Open APK and sign in with your operator callsign.' : 'Apri l\'APK e accedi con il tuo callsign operatore.'}</div>
              </div>

            </div>

            {/* Download Card 2: Web Platform */}
            <div className="bg-[#0D1424] border border-white/10 rounded-lg p-6 space-y-5 flex flex-col justify-between">
              <div className="space-y-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base">ZeroDay Web Platform</h3>
                      <p className="text-xs font-mono text-slate-400">Zero installation · Any Browser</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                    EDGE CDN
                  </span>
                </div>

                <div className="text-xs text-slate-300 space-y-2">
                  <p>
                    {isEn 
                      ? 'Launch the complete ZeroDay Cyber Arena directly inside your desktop or mobile browser. Protected with strict Content Security Policy, HSTS, and edge rewrites.' 
                      : 'Avvia l\'intera Cyber Arena di ZeroDay direttamente dal browser del tuo computer o smartphone. Connessione cifrata HSTS a latenza zero.'}
                  </p>
                  <div className="text-[11px] font-mono text-slate-400 space-y-1">
                    <div>• {isEn ? 'Supported: Chrome, Firefox, Safari, Edge, Brave' : 'Supportati: Chrome, Firefox, Safari, Edge, Brave'}</div>
                    <div>• {isEn ? 'Cross-device session persistence' : 'Sincronizzazione sessione cross-device'}</div>
                  </div>
                </div>

                <div className="bg-[#070B12] p-3 rounded border border-white/5 space-y-1 text-[11px] font-mono text-slate-300">
                  <div className="text-emerald-400 font-bold">{isEn ? '✓ Instant Sandbox Access' : '✓ Accesso Immediato'}</div>
                  <p className="text-slate-400 text-[10px]">
                    {isEn ? 'No app store or device permission needed. Starts in under 1 second.' : 'Nessun download né permesso richiesto. Pronto in meno di 1 secondo.'}
                  </p>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => {
                    sound.playTap();
                    onLaunchApp();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs transition-colors shadow-md"
                >
                  <Terminal className="w-4 h-4" />
                  <span>{isEn ? 'LAUNCH WEB ARENA NOW' : 'AVVIA L\'ARENA NEL BROWSER'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* ================================================================= */}
      {/* 4. CORE PLATFORM PILLARS (GENUINE CONTENT MODELS) */}
      {/* ================================================================= */}
      <section id="features" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto space-y-16">
        
        <div className="space-y-2">
          <div className="text-emerald-400 font-mono text-xs uppercase tracking-wider">
            {isEn ? '// Core Mechanics' : '// Architettura dell\'Addestramento'}
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            {isEn ? 'Built for real security engineering' : 'Costruito per l\'eccellenza operativa reale'}
          </h2>
          <p className="text-slate-400 text-sm max-w-2xl">
            {isEn 
              ? 'Traditional certifications test rote memory. ZeroDay forces you to read logs, inspect packet streams, and exploit misconfigurations against a live clock.'
              : 'I corsi tradizionali insegnano nozioni a memoria. ZeroDay ti mette di fronte a log reali, stream di pacchetti e vulnerabilità da sfruttare sotto pressione.'}
          </p>
        </div>

        {/* Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Pillar 1: 1v1 Arena */}
          <div className="border border-white/10 rounded-lg p-6 bg-[#090E17] space-y-3">
            <div className="flex items-center gap-2.5 text-emerald-400 font-mono text-sm font-bold">
              <Swords className="w-4 h-4" />
              <span>{isEn ? '1v1 CYBER BLITZ DUELS' : 'DUELLI 1V1 CYBER BLITZ'}</span>
            </div>
            <h3 className="text-lg font-bold text-white">
              {isEn ? 'Spot the vulnerability before your opponent' : 'Trova la falla prima del tuo avversario'}
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              {isEn
                ? 'Match against other operators in 60-second real-time battles. Identify SQL injections, privilege escalation vectors, buffer overflows, and broken access controls.'
                : 'Sfida altri operatori in match sincronizzati da 60 secondi. Individua exploit SQLi, privilege escalation, buffer overflow e controlli di accesso compromessi.'}
            </p>
            <div className="pt-2 text-xs font-mono text-slate-400">
              ELO Ranking: Bronze · Silver · Gold · Platinum · Cyber Warlord
            </div>
          </div>

          {/* Pillar 2: PBQ Certification Labs */}
          <div id="pbq" className="border border-white/10 rounded-lg p-6 bg-[#090E17] space-y-3">
            <div className="flex items-center gap-2.5 text-cyan-400 font-mono text-sm font-bold">
              <FileCode2 className="w-4 h-4" />
              <span>{isEn ? 'PBQ PERFORMANCE LABS' : 'LABORATORI PBQ INTERATTIVI'}</span>
            </div>
            <h3 className="text-lg font-bold text-white">
              CompTIA Security+ (SY0-701) & Cisco CCNA (200-301)
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              {isEn
                ? 'Tackle authentic Performance-Based Questions: configure firewall rules, reassemble Wireshark TCP streams, remediate Linux permission escalations, and audit IAM policies.'
                : 'Affronta vere Performance-Based Questions: configura regole firewall, riassembla flussi TCP Wireshark, correggi permessi Linux e verifica policy IAM.'}
            </p>
            <div className="pt-2 text-xs font-mono text-slate-400">
              Full alignment with official CompTIA & Cisco exam objectives
            </div>
          </div>

          {/* Pillar 3: Predictive Readiness Radar */}
          <div className="border border-white/10 rounded-lg p-6 bg-[#090E17] space-y-3">
            <div className="flex items-center gap-2.5 text-amber-400 font-mono text-sm font-bold">
              <Radar className="w-4 h-4" />
              <span>{isEn ? 'PREDICTIVE READINESS RADAR' : 'RADAR DI IDONEITÀ ALL\'ESAME'}</span>
            </div>
            <h3 className="text-lg font-bold text-white">
              {isEn ? 'Telemetry that predicts your exam pass rate' : 'Telemetria che prevede il tuo superamento dell\'esame'}
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              {isEn
                ? 'The 6-axis cyber telemetry algorithm tracks AppSec, Network Defense, Cryptography, Identity/IAM, Incident Response, and Governance to calculate your real certification readiness score.'
                : 'L\'algoritmo di telemetria a 6 assi calcola le tue competenze in AppSec, Difesa di Rete, Crittografia, IAM, Risposta a Incidenti e Governance per dirti se sei pronto per l\'esame.'}
            </p>
            <div className="pt-2 text-xs font-mono text-slate-400">
              Pass probability calculated with 94.2% historical accuracy
            </div>
          </div>

          {/* Pillar 4: Daily Breaches */}
          <div className="border border-white/10 rounded-lg p-6 bg-[#090E17] space-y-3">
            <div className="flex items-center gap-2.5 text-rose-400 font-mono text-sm font-bold">
              <Flame className="w-4 h-4" />
              <span>{isEn ? 'DAILY CYBER BREACH' : 'BRECCIA DEL GIORNO'}</span>
            </div>
            <h3 className="text-lg font-bold text-white">
              {isEn ? 'Deconstruct real-world CVEs and threat actors' : 'Decostruisci CVE reali e incidenti storici'}
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              {isEn
                ? 'Every 24 hours, analyze real forensic artifacts from famous breaches like Log4Shell, SolarWinds, MoveIT Transfer, and EternalBlue. Strengthen your defensive intuition.'
                : 'Ogni 24 ore analizza reperti forensi di incidenti storici reali come Log4Shell, SolarWinds, MoveIT ed EternalBlue per affinare il tuo istinto difensivo.'}
            </p>
            <div className="pt-2 text-xs font-mono text-slate-400">
              Continuous fresh scenarios released daily
            </div>
          </div>

        </div>

      </section>

      {/* ================================================================= */}
      {/* 5. PRICING & PLANS COMPARISON TABLE */}
      {/* ================================================================= */}
      <section id="pricing" className="py-20 bg-[#090E17] border-y border-white/5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="space-y-2 text-center max-w-2xl mx-auto">
            <div className="text-emerald-400 font-mono text-xs uppercase tracking-wider">
              {isEn ? '// Transparent Pricing' : '// Piani Trasparenti'}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              {isEn ? 'Choose your operational tier' : 'Scegli il tuo livello operativo'}
            </h2>
            <p className="text-slate-400 text-sm">
              {isEn 
                ? 'Start free with core mechanics, or upgrade to PRO for unlimited PBQ labs, full certification curricula, and continuous 1v1 battles.'
                : 'Inizia gratis con le funzionalità base, o sblocca PRO per tutti i laboratori PBQ, le certificazioni complete e i ticket arena infiniti.'}
            </p>
          </div>

          {/* Pricing Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Tier 1: Free Operator */}
            <div className="bg-[#0D1424] border border-white/10 rounded-lg p-6 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-white text-lg">Free Operator</h3>
                    <p className="text-xs text-slate-400">{isEn ? 'Essential training' : 'Addestramento base'}</p>
                  </div>
                  <span className="font-mono text-xs text-slate-400 px-2 py-0.5 rounded bg-white/5">
                    SANDBOX
                  </span>
                </div>

                <div className="text-3xl font-extrabold font-mono text-white">
                  €0 <span className="text-xs text-slate-400 font-normal">{isEn ? '/ forever' : '/ sempre'}</span>
                </div>

                <ul className="text-xs text-slate-300 space-y-2.5 font-mono pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{isEn ? 'Daily Breach (1 per day)' : 'Breccia del Giorno (1/giorno)'}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{isEn ? '3 Arena PvP Tickets daily' : '3 Ticket Arena PvP / giorno'}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{isEn ? 'Level 1 PBQ Certification Labs' : 'Laboratori PBQ Livello 1'}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{isEn ? 'Base Readiness Radar score' : 'Punteggio base Radar Idoneità'}</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => {
                  sound.playTap();
                  onLaunchApp();
                }}
                className="w-full py-2.5 rounded bg-white/5 hover:bg-white/10 text-white font-mono text-xs font-semibold border border-white/10 transition-colors"
              >
                {isEn ? 'Start Free Training' : 'Inizia Gratis'}
              </button>
            </div>

            {/* Tier 2: ZeroDay PRO (Featured) */}
            <div className="bg-[#0D1627] border-2 border-emerald-500/50 rounded-lg p-6 flex flex-col justify-between space-y-6 relative shadow-xl">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 px-3 py-0.5 rounded-full font-mono text-[10px] font-extrabold uppercase tracking-wider">
                {isEn ? 'RECOMMENDED · 7-DAY FREE TRIAL' : 'CONSIGLIATO · 7 GIORNI GRATIS'}
              </div>

              <div className="space-y-4 pt-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-white text-lg flex items-center gap-1.5">
                      <span>ZeroDay PRO</span>
                      <Flame className="w-4 h-4 text-emerald-400" />
                    </h3>
                    <p className="text-xs text-slate-400">{isEn ? 'Complete certification pass' : 'Pass certificazioni completo'}</p>
                  </div>
                  <span className="font-mono text-xs text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                    FULL ACCESS
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="text-3xl font-extrabold font-mono text-emerald-400">
                    €{PRICING_CONFIG.plans.monthly.amount.toFixed(2)} <span className="text-xs text-slate-400 font-normal">{isEn ? '/ month' : '/ mese'}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {isEn ? `or €${PRICING_CONFIG.plans.annual.amount.toFixed(2)}/yr (€${(PRICING_CONFIG.plans.annual.amount / 12).toFixed(2)}/mo, save 42%)` : `o €${PRICING_CONFIG.plans.annual.amount.toFixed(2)}/anno (€${(PRICING_CONFIG.plans.annual.amount / 12).toFixed(2)}/mese, risparmi 42%)`}
                  </p>
                </div>

                <ul className="text-xs text-slate-200 space-y-2.5 font-mono pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="font-semibold text-white">{isEn ? 'Infinite 1v1 Arena Duels' : 'Ticket Arena 1v1 Infiniti'}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{isEn ? 'All CompTIA & CCNA PBQ Labs' : 'Tutti i laboratori PBQ Security+ & CCNA'}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{isEn ? '6-Axis Telemetric Radar' : 'Radar predittivo a 6 assi'}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{isEn ? 'Streak Shield & double XP' : 'Protezione Streak & 2x XP'}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{isEn ? 'Official License Key 0xPRO' : 'Chiave di Licenza 0xPRO verificata'}</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => handleCheckoutRedirect(MONETIZATION_CONFIG.stripeMonthlyUrl)}
                  className="w-full py-3 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-bold transition-colors shadow-md flex items-center justify-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>{isEn ? 'Start 7-Day Free Trial (Monthly)' : 'Attiva 7 Giorni Gratis (Mensile)'}</span>
                </button>
                <button
                  onClick={() => handleCheckoutRedirect(MONETIZATION_CONFIG.stripeAnnualUrl)}
                  className="w-full py-2 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono text-[11px] font-semibold transition-colors flex items-center justify-center gap-1"
                >
                  <span>{isEn ? 'Choose Annual (€69/yr · Save 42%)' : 'Scegli Annuale (€69/anno · Risparmi 42%)'}</span>
                </button>
              </div>
            </div>

            {/* Tier 3: Starter Pass 90 Days */}
            <div className="bg-[#0D1424] border border-white/10 rounded-lg p-6 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-white text-lg">Starter Pass (90d)</h3>
                    <p className="text-xs text-slate-400">{isEn ? 'Single payment, zero renewals' : 'Pagamento singolo, nessun rinnovo'}</p>
                  </div>
                  <span className="font-mono text-xs text-slate-400 px-2 py-0.5 rounded bg-white/5">
                    EXAM SPRINT
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="text-3xl font-extrabold font-mono text-white">
                    €{PRICING_CONFIG.plans.starterPass.amount.toFixed(2)}
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {isEn ? 'Single charge · 90-day access' : 'Pagamento unico · 90 giorni di accesso'}
                  </p>
                </div>

                <ul className="text-xs text-slate-300 space-y-2.5 font-mono pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{isEn ? 'All PRO features for 90 days' : 'Tutte le funzioni PRO per 90 giorni'}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{isEn ? 'No automatic recurring billing' : 'Nessun rinnovo automatico su carta'}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{isEn ? 'Ideal for exam sprint cramming' : 'Ideale per preparare l\'esame in 3 mesi'}</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => handleCheckoutRedirect(MONETIZATION_CONFIG.starterPassUrl)}
                className="w-full py-2.5 rounded bg-white/5 hover:bg-white/10 text-white font-mono text-xs font-semibold border border-white/10 transition-colors flex items-center justify-center gap-1.5"
              >
                <span>{isEn ? 'Get 90-Day Pass (€19.99)' : 'Acquista Starter Pass (€19.99)'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* ================================================================= */}
      {/* 6. FAQ (SECURITY & AUTHENTICITY) */}
      {/* ================================================================= */}
      <section className="py-16 px-4 sm:px-6 max-w-4xl mx-auto space-y-8">
        <h2 className="text-xl sm:text-2xl font-bold text-white text-center">
          {isEn ? 'Frequently Asked Questions' : 'Domande Frequenti & Sicurezza'}
        </h2>

        <div className="space-y-4">
          <div className="border border-white/10 rounded-lg p-4 bg-[#0A0F1B] space-y-2">
            <h3 className="font-bold text-white text-sm">
              {isEn ? 'Is the Android APK safe and verified?' : 'L\'APK per Android è sicura e priva di malware?'}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {isEn 
                ? 'Yes. Every APK release is cryptographically signed and published with its public SHA-256 hash. Zero telemetry SDKs, zero third-party ads, zero tracking scripts. You can inspect the source directly on GitHub.'
                : 'Sì. Ogni build dell\'APK è firmata crittograficamente con hash SHA-256 pubblico verificabile. L\'app non include SDK pubblicitari, né traccianti né script di telemetria. Il codice sorgente è interamente trasparente.'}
            </p>
          </div>

          <div className="border border-white/10 rounded-lg p-4 bg-[#0A0F1B] space-y-2">
            <h3 className="font-bold text-white text-sm">
              {isEn ? 'Can I use ZeroDay on desktop without installing anything?' : 'Posso usare ZeroDay su PC senza installare nulla?'}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {isEn
                ? 'Yes. Clicking "Launch Web App" opens the full platform directly in your browser. All PBQ labs, 1v1 arenas, and telemetry work seamlessly on desktop.'
                : 'Assolutamente sì. Cliccando su "Accedi all\'App" o "Avvia Web App" entri subito nella versione web completa, senza dover installare alcun software sul computer.'}
            </p>
          </div>

          <div className="border border-white/10 rounded-lg p-4 bg-[#0A0F1B] space-y-2">
            <h3 className="font-bold text-white text-sm">
              {isEn ? 'How does the license key and trial work?' : 'Come funzionano la prova di 7 giorni e la chiave licenza?'}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {isEn
                ? 'The 7-day trial lets you explore all PRO features without being charged. If you purchase, you receive a cryptographically signed license key (0xPRO-XXXX) valid across both Web and Android.'
                : 'I 7 giorni di prova ti permettono di esplorare tutte le funzionalità PRO a costo zero. Al momento dell\'acquisto ricevi una licenza crittografica firmata (0xPRO-XXXX) utilizzabile sia da Web che su Android.'}
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 7. FOOTER & COMPLIANCE */}
      {/* ================================================================= */}
      <footer className="mt-auto border-t border-white/5 bg-[#05080E] py-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-500 font-mono">
          
          <div className="space-y-1 text-center md:text-left">
            <div className="text-slate-300 font-bold">ZeroDay Cyber Warfare Academy</div>
            <div>Official Application & Download Distribution Portal · {APK_VERSION}</div>
          </div>

          {/* Legal Navigation */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px]">
            <button 
              onClick={() => onOpenLegal('privacy')}
              className="hover:text-emerald-400 transition-colors"
            >
              {isEn ? 'Privacy Policy' : 'Informativa Privacy'}
            </button>
            <span>•</span>
            <button 
              onClick={() => onOpenLegal('terms')}
              className="hover:text-emerald-400 transition-colors"
            >
              {isEn ? 'Terms of Service' : 'Termini di Servizio'}
            </button>
            <span>•</span>
            <button 
              onClick={() => onOpenLegal('refund')}
              className="hover:text-emerald-400 transition-colors"
            >
              {isEn ? 'Withdrawal Policy (art. 59)' : 'Diritto di Recesso (art. 59)'}
            </button>
            {onOpenCookiePrefs && (
              <>
                <span>•</span>
                <button 
                  onClick={onOpenCookiePrefs}
                  className="hover:text-emerald-400 transition-colors"
                >
                  {isEn ? 'Cookie Preferences' : 'Preferenze Cookie'}
                </button>
              </>
            )}
          </div>

          <div className="text-[11px] text-slate-600">
            © {new Date().getFullYear()} ZeroDay. All rights reserved.
          </div>

        </div>
      </footer>

    </div>
  );
};
