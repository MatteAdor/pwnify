import React, { useState } from 'react';
import { SKILL_MODULES } from '../../data/curriculum';
import { SkillModule, SkillNode, UserState } from '../../types';
import { sound } from '../../utils/soundEngine';
import { useLanguage } from '../../utils/language';
import { 
  Terminal, Globe, Key, Shield, Server, Network, Cpu, Lock, 
  ArrowLeft, Check, AlertTriangle, Zap, 
  BookOpen, ChevronRight, Copy, ChevronDown
} from 'lucide-react';

interface TacticalSkillTreeProps {
  userState: UserState;
  onSelectNode: (node: SkillNode) => void;
  onOpenPaywall: () => void;
  onOpenDailyBreach?: () => void;
}

// Icon mapping for the 8 core missions
const MISSION_ICON_MAP: Record<string, React.ElementType> = {
  mod_bash: Terminal,
  mod_networking: Globe,
  mod_crypto: Key,
  mod_web_sqli: Shield,
  mod_ssrf: Server,
  mod_subnetting: Network,
  mod_linux: Cpu,
  mod_active_directory: Lock
};

// Tactical reference cheat sheets
const CHAPTER_TOOLS: Record<string, {
  cheatSheetTitle: string;
  cheatSheetCommands: string[];
  keyTakeaway: string;
}> = {
  bash: {
    cheatSheetTitle: 'Bash Survival & FHS Navigation',
    cheatSheetCommands: [
      'pwd                         # Absolute path',
      'ls -la /var/log/            # Hidden files and permissions',
      'grep -in "error" app.log    # Case-insensitive search',
      'chmod 600 id_rsa            # Restrictive SSH key permissions',
      'chown root:root /etc/shadow # Enforce root ownership on shadow'
    ],
    keyTakeaway: 'Under the FHS standard, system configuration lives in /etc/ and logs in /var/log/. Never store credentials in world-readable /tmp/.'
  },
  web: {
    cheatSheetTitle: 'OWASP SQLi & Web Payloads',
    cheatSheetCommands: [
      "' OR 1=1 -- -               # SQL Injection Auth Bypass",
      "' UNION SELECT null, user, password FROM users -- # Data Exfil",
      '<script>alert(document.cookie)</script>           # Classic XSS',
      '"><img src=x onerror=alert(1)>                    # Evasion XSS',
      'admin\' --                  # Comment-out password check'
    ],
    keyTakeaway: 'Parameterized queries (Prepared Statements) are the primary defense against SQLi. Context-aware output encoding prevents XSS.'
  },
  net: {
    cheatSheetTitle: 'TCP/IP Handshake & Packet Dissection',
    cheatSheetCommands: [
      'tcp.flags.syn == 1 && tcp.flags.ack == 0  # Filter SYN packets',
      'http.request.method == "POST"             # Credential traffic',
      'nmap -sS -p 1-1000 -T4 target_ip          # TCP SYN Stealth Scan',
      'arp -a                                    # IP -> MAC mapping table',
      'netstat -tulpn                            # Listening TCP/UDP sockets'
    ],
    keyTakeaway: 'TCP 3-way handshake operates as SYN -> SYN-ACK -> ACK. A RST flag abruptly tears down the connection.'
  },
  privesc: {
    cheatSheetTitle: 'Linux Privilege Escalation Vector',
    cheatSheetCommands: [
      'find / -perm -4000 -type f 2>/dev/null    # Find SUID binaries',
      'sudo -l                                  # List allowable commands',
      'uname -a                                 # Kernel version for exploit check',
      'cat /etc/crontab                         # World-writable cron jobs',
      'ls -ld /tmp /var/tmp                     # Verify sticky bits on temp'
    ],
    keyTakeaway: 'SUID binaries execute with file owner privileges. Misconfigured SUID tools that spawn shells allow immediate root privilege escalation.'
  },
  ad: {
    cheatSheetTitle: 'Active Directory & Kerberos Lateral Movement',
    cheatSheetCommands: [
      'GetUserSPNs.py domain/user -request       # Kerberoasting TGS exfiltration',
      'GetNPUsers.py domain/ -usersfile users.txt # AS-REP Roasting without pre-auth',
      '# LSASS memory triage: extract NTLM hashes from memory dump',
      'bloodhound-python -d domain.local -u user # Map AD domain trust graph',
      'pth-winexe -U domain/admin%aad3... //host cmd.exe # Pass-The-Hash execution'
    ],
    keyTakeaway: 'Protect enterprise service accounts by enforcing AES Kerberos encryption and complex 25+ character passwords against offline cracking.'
  }
};

const MISSION_FOCUS_MAP: Record<string, { it: string; en: string }> = {
  mod_bash: {
    it: 'Navigazione shell Linux, permessi Unix, piping, grep e scripting per amministrazione sicura.',
    en: 'Shell navigation, Unix permissions, piping, grep, and essential scripting for secure systems.'
  },
  mod_networking: {
    it: 'Modello OSI, subnetting CIDR, analisi TCP/UDP, ARP poisoning e ispezione pacchetti.',
    en: 'OSI model, CIDR subnetting, TCP/UDP handshake analysis, ARP poisoning, and packet inspection.'
  },
  mod_blue_team: {
    it: 'Monitoraggio SIEM, analisi log Syslog/Auth, triage incidenti SOC e configurazione firewall.',
    en: 'SIEM log telemetry, authentication audit trails, SOC triage alerts, and firewall rules.'
  },
  mod_web_sec: {
    it: 'OWASP Top 10: SQL Injection, Cross-Site Scripting (XSS), CSRF e prevenzione applicativa.',
    en: 'OWASP Top 10 vulnerabilities: SQL Injection, XSS, CSRF, and defensive secure coding.'
  },
  mod_crypto: {
    it: 'Crittografia asimmetrica RSA/ECC, hashing SHA-256/bcrypt, certificati X.509 e TLS 1.3.',
    en: 'Asymmetric cryptography, SHA-256 hashing, X.509 PKI certificate chains, and TLS 1.3.'
  },
  mod_cloud_infra: {
    it: 'AWS IAM privilege escalation, misconfigurazioni bucket S3, sicurezza Kubernetes e container Docker.',
    en: 'AWS IAM policy hardening, S3 public leakage containment, and Kubernetes cluster security controls.'
  },
  mod_red_recon: {
    it: 'Scansione porte Nmap (SYN scan), fingerprinting servizi, enumeration OS e mapping superficie d\'attacco.',
    en: 'Nmap stealth SYN scans, banner grabbing, OS fingerprinting, and external attack surface mapping.'
  },
  mod_threat_intel: {
    it: 'Framework MITRE ATT&CK, indicatori di compromissione (IoC), Cyber Kill Chain e threat intelligence.',
    en: 'MITRE ATT&CK mapping, Indicators of Compromise (IoCs), Cyber Kill Chain, and triage feeds.'
  }
};

export const TacticalSkillTree: React.FC<TacticalSkillTreeProps> = ({
  userState,
  onSelectNode,
  onOpenPaywall,
  onOpenDailyBreach
}) => {
  const { lang, t } = useLanguage();
  const isEn = lang === 'en';

  // State: currently active mission container for drill-down view (null = main missions overview)
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

  // Tactical Cheat Sheets modal / drawer state
  const [activeToolKey, setActiveToolKey] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showToolsSection, setShowToolsSection] = useState<boolean>(false);

  // Daily Breach solved check
  const todayStr = new Date().toISOString().split('T')[0];
  const isBreachSolvedToday = userState.lastDailyBreachDate === todayStr;

  const handleCopyCommand = (cmd: string, index: number) => {
    sound.playTap();
    navigator.clipboard.writeText(cmd.split('#')[0].trim());
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1800);
  };

  // Find currently active drill-down module
  const activeModule = SKILL_MODULES.find(m => m.id === selectedModuleId);

  // Calculate overall mission completion
  const totalMissions = SKILL_MODULES.length;
  const completedMissionsCount = SKILL_MODULES.filter(m => 
    m.nodes.every(n => userState.completedNodeIds.includes(n.id))
  ).length;

  return (
    <div className="w-full max-w-xl mx-auto px-3.5 sm:px-4 py-4 pb-24 space-y-4 font-sans">
      
      {/* ========================================================================= */}
      {/* VIEW A: MISSION DRILL-DOWN (LIST OF LESSONS INSIDE CLICKED MISSION)       */}
      {/* ========================================================================= */}
      {activeModule ? (
        <div className="space-y-3">
          {/* Back to Missions Button */}
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              setSelectedModuleId(null);
            }}
            className="flex items-center gap-2 py-2 px-3 min-h-[42px] rounded-xl bg-zinc-900 border border-zinc-800 text-xs sm:text-sm font-mono font-black text-zinc-300 hover:text-white transition-all cursor-pointer active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
            <span>{t.backToMissions}</span>
          </button>

          {/* Mission Header */}
          <div className="p-4 rounded-xl bg-[#0D121D] border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-400 font-bold uppercase">
                {isEn ? `MISSION 0${SKILL_MODULES.findIndex(m => m.id === activeModule.id) + 1}` : `MISSIONE 0${SKILL_MODULES.findIndex(m => m.id === activeModule.id) + 1}`} · {activeModule.certificationFocus}
              </span>
              <span className="text-emerald-400 font-bold">
                {activeModule.nodes.filter(n => userState.completedNodeIds.includes(n.id)).length} / {activeModule.nodes.length} {t.completed}
              </span>
            </div>

            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                {activeModule.title}
              </h1>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                {MISSION_FOCUS_MAP[activeModule.id]?.[isEn ? 'en' : 'it'] || activeModule.certificationFocus}
              </p>
            </div>

            {/* Mission Progress Bar */}
            <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{
                  width: `${(activeModule.nodes.filter(n => userState.completedNodeIds.includes(n.id)).length / activeModule.nodes.length) * 100}%`
                }}
              />
            </div>
          </div>

          {/* List of Lessons */}
          <div className="space-y-2.5">
            {activeModule.nodes.map((node, index) => {
              const isCompleted = userState.completedNodeIds.includes(node.id);
              const isFinal = node.isFinalTest;

              return (
                <div
                  key={node.id}
                  onClick={() => {
                    sound.playTap();
                    onSelectNode(node);
                  }}
                  className={`group rounded-xl border p-4 min-h-[64px] transition-all cursor-pointer flex items-center justify-between gap-3 active:scale-[0.99] ${
                    isFinal
                      ? isCompleted
                        ? 'bg-[#0E1524] border-emerald-500/40 hover:border-emerald-400'
                        : 'bg-[#131122] border-purple-500/30 hover:border-purple-400'
                      : isCompleted
                      ? 'bg-[#0B111D] border-emerald-500/20 hover:border-emerald-500/40'
                      : 'bg-[#0D121D] border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-[11px] font-mono">
                      <span className={`font-black uppercase ${isFinal ? 'text-purple-300' : 'text-zinc-400'}`}>
                        {isFinal ? t.finalTestBadge : `${t.lessonWord} 0${index + 1}`}
                      </span>

                      {isCompleted && (
                        <span className="text-emerald-400 font-black flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          {t.completed}
                        </span>
                      )}
                    </div>

                    <h3 className={`font-mono font-black text-sm sm:text-base truncate ${
                      isFinal ? 'text-purple-200 group-hover:text-white' : 'text-zinc-100 group-hover:text-emerald-300'
                    }`}>
                      {node.title}
                    </h3>

                    <p className="text-xs text-zinc-400 font-medium line-clamp-1">
                      {node.lessonExplanation?.keyTakeaway || node.subtitle}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs sm:text-sm font-mono font-black text-emerald-400">
                      +{node.xpReward} XP
                    </span>
                    <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (

        /* ========================================================================= */
        /* VIEW B: MAIN MISSIONS OVERVIEW (8 CORE MISSIONS)                          */
        /* ========================================================================= */
        <>
          {/* 1. Header: Lead with core utility, eliminate template card */}
          <div className="flex items-baseline justify-between gap-2 border-b border-zinc-800 pb-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {t.missionsTitle}
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                {isEn 
                  ? '8 Operational Field Missions · Hands-on labs & final validation'
                  : '8 Missioni Tattiche · Laboratori guidati e verifica finale'}
              </p>
            </div>
            <div className="text-right font-mono shrink-0">
              <span className="text-[10px] text-zinc-400 block uppercase">READINESS</span>
              <span className="text-emerald-400 font-bold text-base">{userState.readinessScore}%</span>
            </div>
          </div>

          {/* Overall Progress Counter */}
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span>{t.missionProgress}</span>
            <span className="text-zinc-200 font-bold">
              {completedMissionsCount} / {totalMissions} {t.completed}
            </span>
          </div>
          <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden -mt-2">
            <div 
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ 
                width: `${Math.max((completedMissionsCount / totalMissions) * 100, 3)}%` 
              }}
            />
          </div>

          {/* 2. Daily CVE Incident Triage: Clean Actionable Card */}
          <div className="rounded-xl bg-[#0D121D] border border-zinc-800 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <h2 className="text-sm font-black text-white tracking-wide">
                  {t.dailyBreachTitle}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  if (!userState.isPro) onOpenPaywall();
                }}
                className="text-xs font-mono font-black text-amber-400 hover:text-amber-300 cursor-pointer"
              >
                {userState.isPro ? '2X XP ACTIVE' : '2X XP PRO'}
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                sound.playTap();
                if (onOpenDailyBreach) onOpenDailyBreach();
              }}
              className={`w-full min-h-[50px] py-3 px-5 rounded-xl font-mono font-black text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-98 ${
                isBreachSolvedToday
                  ? 'bg-zinc-800 border border-zinc-700 text-emerald-300 hover:bg-zinc-750'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950'
              }`}
            >
              {isBreachSolvedToday ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{t.triageCompletedToday}</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-zinc-950 text-zinc-950" />
                  <span>{t.startDailyBreach}</span>
                </>
              )}
            </button>
          </div>

          {/* 3. The 8 Core Missions: Unslop List */}
          <div className="space-y-2 pt-1">
            <h2 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">
              {isEn ? `FIELD CURRICULUM (${SKILL_MODULES.length})` : `CURRICULUM OPERATIVO (${SKILL_MODULES.length})`}
            </h2>

            <div className="space-y-2">
              {SKILL_MODULES.map((module, index) => {
                const completedCount = module.nodes.filter(n => userState.completedNodeIds.includes(n.id)).length;
                const totalLessons = module.nodes.length;
                const isAllCompleted = completedCount === totalLessons && totalLessons > 0;
                const IconComponent = MISSION_ICON_MAP[module.id] || Terminal;

                return (
                  <div
                    key={module.id}
                    onClick={() => {
                      sound.playTap();
                      setSelectedModuleId(module.id);
                    }}
                    className={`group rounded-xl border p-4 min-h-[72px] transition-all cursor-pointer active:scale-[0.99] ${
                      isAllCompleted
                        ? 'bg-[#0B111D] border-emerald-500/30 hover:border-emerald-400'
                        : 'bg-[#0D121D] border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      {/* Left: Unboxed Icon + Text */}
                      <div className="flex items-center gap-3.5 flex-1 min-w-0">
                        <IconComponent className="w-5 h-5 text-emerald-400 shrink-0" />

                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] font-mono font-black text-zinc-400 uppercase">
                            {isEn ? `MISSION 0${index + 1}` : `MISSIONE 0${index + 1}`}
                          </div>
                          <h3 className="text-base font-black text-white group-hover:text-emerald-300 transition-colors truncate">
                            {module.title}
                          </h3>
                          <div className="text-xs font-mono font-bold text-zinc-400 mt-0.5">
                            {completedCount} / {totalLessons} {t.lessonsCountWord}
                          </div>
                        </div>
                      </div>

                      {/* Right: Status or Chevron */}
                      <div className="shrink-0">
                        {isAllCompleted ? (
                          <span className="text-xs font-mono font-black text-emerald-400 flex items-center gap-1">
                            <Check className="w-4 h-4 text-emerald-400" />
                            {t.completed}
                          </span>
                        ) : (
                          <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                        )}
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden mt-3">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${(completedCount / totalLessons) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Tactical Reference Command Sheets */}
          <div className="rounded-lg bg-[#0D121D] border border-zinc-800 p-3.5 space-y-2.5">
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                setShowToolsSection(!showToolsSection);
              }}
              className="w-full flex items-center justify-between text-left cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-zinc-400" />
                <div>
                  <h3 className="font-mono font-bold text-xs sm:text-sm text-zinc-200">
                    {t.tacticalToolsTitle}
                  </h3>
                  <p className="text-[10px] text-zinc-400">
                    {t.tacticalToolsSub}
                  </p>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${showToolsSection ? 'rotate-180' : ''}`} />
            </button>

            {showToolsSection && (
              <div className="pt-2 border-t border-zinc-800 space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(CHAPTER_TOOLS).map(([key]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        sound.playTap();
                        setActiveToolKey(activeToolKey === key ? null : key);
                      }}
                      className={`px-2 py-1 rounded text-xs font-mono font-bold border transition-colors cursor-pointer ${
                        activeToolKey === key
                          ? 'bg-emerald-500 text-zinc-950 border-emerald-400'
                          : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {key.toUpperCase()}
                    </button>
                  ))}
                </div>

                {activeToolKey && CHAPTER_TOOLS[activeToolKey] && (
                  <div className="p-3 rounded bg-zinc-950 border border-zinc-800 space-y-2 text-xs font-mono">
                    <p className="text-emerald-400 font-bold">
                      {CHAPTER_TOOLS[activeToolKey].cheatSheetTitle}
                    </p>
                    <div className="space-y-1">
                      {CHAPTER_TOOLS[activeToolKey].cheatSheetCommands.map((cmd, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleCopyCommand(cmd, idx)}
                          className="p-1.5 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700 flex items-center justify-between text-zinc-300 hover:text-white cursor-pointer"
                        >
                          <span className="truncate">{cmd}</span>
                          <span className="text-[10px] text-zinc-400 shrink-0 ml-2">
                            {copiedIndex === idx ? (isEn ? 'Copied' : 'Copiato') : (isEn ? 'Copy' : 'Copia')}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-zinc-400 pt-1 border-t border-zinc-800">
                      {CHAPTER_TOOLS[activeToolKey].keyTakeaway}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default TacticalSkillTree;
