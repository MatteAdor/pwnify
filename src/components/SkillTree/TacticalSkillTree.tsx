import React, { useState } from 'react';
import { SKILL_MODULES } from '../../data/curriculum';
import { SkillModule, SkillNode, UserState } from '../../types';
import { sound } from '../../utils/soundEngine';
import { 
  Lock, CheckCircle2, Play, Sparkles, Shield, 
  Terminal, Globe, Network, Cpu, Key, Server, 
  ArrowLeft, ChevronRight, Zap, BookOpen, 
  Check, Copy, FileText, Flame, Target,
  AlertTriangle, Clock, X, ChevronDown, Wrench
} from 'lucide-react';

interface TacticalSkillTreeProps {
  userState: UserState;
  onSelectNode: (node: SkillNode) => void;
  onOpenPaywall: () => void;
  onOpenDailyBreach?: () => void;
}

// 8 Core Operational Missions (Fulfills min 5, max 10 requirement)
interface CoreMissionConfig {
  nodeId: string;
  keywordTitle: string;
  domainTag: string;
  shortSubtitle: string;
  icon: React.ElementType;
  accentBadge: string;
}

const CORE_MISSIONS: CoreMissionConfig[] = [
  {
    nodeId: 'node_basics_1',
    keywordTitle: 'BASH & TERMINAL',
    domainTag: 'FONDAMENTA',
    shortSubtitle: 'Navigazione filesystem & permessi',
    icon: Terminal,
    accentBadge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
  },
  {
    nodeId: 'node_basics_2',
    keywordTitle: 'PROTOCOLLI & RETI',
    domainTag: 'NETWORKING',
    shortSubtitle: 'Porte standard 80/443 & status HTTP',
    icon: Globe,
    accentBadge: 'bg-blue-500/15 text-blue-300 border-blue-500/30'
  },
  {
    nodeId: 'node_basics_3',
    keywordTitle: 'CRITTOGRAFIA & HASH',
    domainTag: 'AUTH & CRYPTO',
    shortSubtitle: 'Hashing SHA-256, salt & crack',
    icon: Key,
    accentBadge: 'bg-purple-500/15 text-purple-300 border-purple-500/30'
  },
  {
    nodeId: 'node_sqli_1',
    keywordTitle: 'SQL INJECTION',
    domainTag: 'OFFENSIVE WEB',
    shortSubtitle: 'Auth bypass & estrazione database',
    icon: Shield,
    accentBadge: 'bg-rose-500/15 text-rose-300 border-rose-500/30'
  },
  {
    nodeId: 'node_sqli_2',
    keywordTitle: 'SSRF & CLOUD METADATA',
    domainTag: 'CLOUD SECURITY',
    shortSubtitle: 'IMDSv1 & exfiltration token cloud',
    icon: Server,
    accentBadge: 'bg-amber-500/15 text-amber-300 border-amber-500/30'
  },
  {
    nodeId: 'node_net_1',
    keywordTitle: 'RETI & SUBNETTING',
    domainTag: 'PACKET ANALYSIS',
    shortSubtitle: 'Calcolo CIDR, broadcast & routing',
    icon: Network,
    accentBadge: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
  },
  {
    nodeId: 'node_lin_2',
    keywordTitle: 'LINUX PRIVILEGE ESCALATION',
    domainTag: 'LOW LEVEL',
    shortSubtitle: 'Misconfigurazioni sudo & GTFOBins',
    icon: Cpu,
    accentBadge: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30'
  },
  {
    nodeId: 'node_ad_kerberoast',
    keywordTitle: 'ACTIVE DIRECTORY ATTACK',
    domainTag: 'ENTERPRISE',
    shortSubtitle: 'Kerberoasting & crack ticket TGS',
    icon: Lock,
    accentBadge: 'bg-red-500/15 text-red-300 border-red-500/30'
  }
];

// Tactical reference cheat sheets
const CHAPTER_TOOLS: Record<string, {
  cheatSheetTitle: string;
  cheatSheetCommands: string[];
  keyTakeaway: string;
}> = {
  bash: {
    cheatSheetTitle: 'Bash Survival & FHS Navigation',
    cheatSheetCommands: [
      'pwd                         # Mostra percorso assoluto',
      'ls -la /var/log/            # File nascosti con permessi',
      'grep -in "error" app.log    # Ricerca case-insensitive',
      'chmod 600 id_rsa            # Permessi restrittivi chiave SSH',
      'chown root:root /etc/shadow # Proprietà root su shadow'
    ],
    keyTakeaway: 'Nello standard FHS, i file di configurazione risiedono in /etc/, i log in /var/log/. Mai memorizzare chiavi in world-readable /tmp/.'
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
    keyTakeaway: 'L\'unica difesa infallibile contro SQLi sono i Prepared Statements. Per XSS è obbligatorio il Context-Aware Output Encoding.'
  },
  net: {
    cheatSheetTitle: 'TCP/IP Handshake & Packet Dissection',
    cheatSheetCommands: [
      'tcp.flags.syn == 1 && tcp.flags.ack == 0  # Filtra pacchetti SYN',
      'http.request.method == "POST"             # Traffico credenziali',
      'nmap -sS -p 1-1000 -T4 target_ip          # TCP SYN Stealth Scan',
      'arp -a                                    # Tabella IP -> MAC',
      'netstat -tulpn                            # Porte TCP/UDP in ascolto'
    ],
    keyTakeaway: 'Il Three-Way Handshake TCP è composto da SYN -> SYN-ACK -> ACK. Un flag RST chiude bruscamente la connessione senza teardown.'
  },
  privesc: {
    cheatSheetTitle: 'Linux Privilege Escalation Vector',
    cheatSheetCommands: [
      'find / -perm -4000 -type f 2>/dev/null    # Cerca binari SUID',
      'sudo -l                                  # Comandi eseguibili root',
      'uname -a                                 # Versione kernel per exploit',
      'cat /etc/crontab                         # Task cron vulnerabili',
      'ls -ld /tmp /var/tmp                     # Sticky bit su temp'
    ],
    keyTakeaway: 'I binari SUID mantengono i privilegi del file owner. Se un binario SUID richiama script relativi o permette shell escape, root è immediato.'
  },
  ad: {
    cheatSheetTitle: 'Active Directory & Kerberos Lateral Movement',
    cheatSheetCommands: [
      'GetUserSPNs.py domain/user -request       # Kerberoasting TGS',
      'GetNPUsers.py domain/ -usersfile users.txt # AS-REP Roasting',
      'mimikatz # sekurlsa::logonpasswords       # Dump hash da LSASS',
      'bloodhound-python -d domain.local -u user # Grafo privilegi AD',
      'pth-winexe -U domain/admin%aad3... //host cmd.exe # Pass-The-Hash'
    ],
    keyTakeaway: 'Proteggi gli account di servizio enterprise disabilitando la cifratura RC4 su Kerberos e adottando password complesse contro l\'offline cracking.'
  }
};

export const TacticalSkillTree: React.FC<TacticalSkillTreeProps> = ({
  userState,
  onSelectNode,
  onOpenPaywall,
  onOpenDailyBreach
}) => {
  // Cheat Sheet Modal State
  const [activeToolKey, setActiveToolKey] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showToolsSection, setShowToolsSection] = useState<boolean>(false);

  // Daily Breach solved check
  const todayStr = new Date().toISOString().split('T')[0];
  const isBreachSolvedToday = userState.lastDailyBreachDate === todayStr;

  // Flatten all nodes from modules
  const allNodes = SKILL_MODULES.flatMap(m => m.nodes);

  const handleCopyCommand = (cmd: string, index: number) => {
    sound.playTap();
    navigator.clipboard.writeText(cmd.split('#')[0].trim());
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1800);
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-5 pb-28 space-y-6 sm:space-y-7">
      
      {/* ========================================================================= */}
      {/* 1. HERO BANNER: PERCORSO OPERATIVO & READINESS                            */}
      {/* ========================================================================= */}
      <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#111726] via-[#141d33] to-[#0d1424] border border-white/10 p-5 sm:p-6 shadow-cyber-glass overflow-hidden space-y-4">
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        {/* Top telemetry tags */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold uppercase tracking-wider">
            PERCORSO CERTIFICAZIONI
          </span>
          
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-slate-400">READINESS:</span>
            <span className="text-emerald-400 font-bold text-sm">{userState.readinessScore}%</span>
          </div>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
            PERCORSO OPERATIVO
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            8 Missioni Tattiche sul Campo · Dalle basi terminale al dominio Enterprise
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>PROGRESSO OPERAZIONI</span>
            <span className="text-slate-200 font-bold">
              {CORE_MISSIONS.filter(m => userState.completedNodeIds.includes(m.nodeId)).length} / {CORE_MISSIONS.length} COMPLETATE
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-900/90 border border-white/5 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full transition-all duration-500"
              style={{ 
                width: `${Math.max(
                  (CORE_MISSIONS.filter(m => userState.completedNodeIds.includes(m.nodeId)).length / CORE_MISSIONS.length) * 100, 
                  5
                )}%` 
              }}
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. DAILY 0xBREACH CHALLENGE (SPACIOUS & BREATHABLE)                      */}
      {/* ========================================================================= */}
      <div className="rounded-2xl bg-[#111420] border border-red-500/30 p-5 sm:p-6 relative overflow-hidden space-y-4 shadow-lg">
        {/* Top row: DEFCON, Title, 2X XP / Streak */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                  DEFCON 1
                </span>
                <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  Daily 0xBreach
                </h2>
              </div>
            </div>
          </div>

          {/* 2X XP Triggerable Pill */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              sound.playTap();
              if (!userState.isPro) {
                onOpenPaywall();
              }
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-mono font-bold text-xs transition-all cursor-pointer ${
              userState.isPro
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                : 'bg-zinc-800/90 hover:bg-zinc-750 text-amber-400 border-amber-500/40 hover:border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
            }`}
            title={userState.isPro ? '2x XP Boost Attivo' : 'Tocca per sbloccare 2x XP permanente con PRO'}
          >
            <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>2X XP {userState.isPro ? 'ATTIVO' : 'PRO'}</span>
          </button>
        </div>

        {/* Short, clear prompt */}
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          Analizza la vulnerabilità CVE quotidiana nel codice target e individua la root cause prima degli attaccanti.
        </p>

        {/* Action Button */}
        <div className="pt-1 space-y-2">
          <button
            onClick={() => {
              sound.playTap();
              if (onOpenDailyBreach) onOpenDailyBreach();
            }}
            className={`w-full py-3 px-5 rounded-xl font-mono font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 transform active:scale-98 cursor-pointer ${
              isBreachSolvedToday
                ? 'bg-zinc-800 border border-emerald-500/40 text-emerald-300 hover:bg-zinc-750'
                : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-md font-black'
            }`}
          >
            {isBreachSolvedToday ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>TRIAGE COMPLETATO OGGI (RIVEDI ANALISI)</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-slate-950 text-slate-950" />
                <span>AVVIA TRIAGE ZERO-DAY (+150 XP)</span>
              </>
            )}
          </button>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Nuovo breach alle 00:00</span>
            </span>
            <span>x{userState.dailyBreachStreak || 0} TRIAGE STREAK</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. CORE OPERATIONAL LESSONS (8 MISSIONS: BIG KEYWORDS & BREATHABLE)       */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
              LEZIONI OPERATIVE ({CORE_MISSIONS.length})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Tocca una lezione per aprire il briefing completo e iniziare l'operazione.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {CORE_MISSIONS.map((mission, index) => {
            const node = allNodes.find(n => n.id === mission.nodeId);
            const isCompleted = userState.completedNodeIds.includes(mission.nodeId);
            const isLocked = node?.status === 'locked' && !userState.isPro;
            const MissionIcon = mission.icon;

            return (
              <div
                key={mission.nodeId}
                onClick={() => {
                  sound.playTap();
                  if (node) {
                    onSelectNode(node);
                  }
                }}
                className={`group cursor-pointer rounded-2xl bg-[#0D1322] border transition-all duration-200 p-5 sm:p-6 shadow-cyber-glass hover:shadow-xl space-y-3.5 relative overflow-hidden ${
                  isCompleted
                    ? 'border-emerald-500/40 bg-gradient-to-r from-[#0D1322] to-[#0A1A1E]'
                    : isLocked
                    ? 'border-white/10 opacity-80 hover:opacity-100 hover:border-amber-500/40'
                    : 'border-white/10 hover:border-emerald-500/40 hover:bg-[#10172A]'
                }`}
              >
                {/* Top Row: Mission Number, Domain Badge, Rewards */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-white/10 font-bold">
                      MISSIONE 0{index + 1}
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${mission.accentBadge}`}>
                      {mission.domainTag}
                    </span>
                  </div>

                  {/* Rewards or Status Badge */}
                  <div className="flex items-center gap-2">
                    {isCompleted ? (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/40 flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-400" />
                        COMPLETATA
                      </span>
                    ) : isLocked ? (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        ZERO-DAY PRO
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-emerald-400">
                        <span>+{node?.xpReward || 80} XP</span>
                        <span className="text-slate-600">·</span>
                        <span className="text-indigo-400">+{node?.eloReward || 25} ELO</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Main Content: Big Keyword Title & Minimalist Subtitle */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#070B14] border border-white/15 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform text-emerald-400 shadow-sm">
                    <MissionIcon className="w-6 h-6" />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* BIG PUNCHY KEYWORD TITLE */}
                    <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-white group-hover:text-emerald-300 transition-colors leading-tight">
                      {mission.keywordTitle}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono mt-1">
                      {mission.shortSubtitle}
                    </p>
                  </div>

                  <div className="w-8 h-8 rounded-xl bg-slate-900/90 border border-white/10 flex items-center justify-center text-slate-400 group-hover:text-emerald-400 group-hover:border-emerald-500/40 group-hover:translate-x-1 transition-all shrink-0">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. STRUMENTI & CHEAT SHEET TATTICI (ACCORDION / SEZIONE ESPANDIBILE)      */}
      {/* ========================================================================= */}
      <div className="rounded-2xl bg-surface border border-white/10 p-5 space-y-4">
        <div 
          onClick={() => {
            sound.playTap();
            setShowToolsSection(prev => !prev);
          }}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-mono">
                Strumenti Tattici & Cheat Sheet
              </h3>
              <p className="text-xs text-slate-400">
                Comandi rapidi, payload e regole di riferimento per esami
              </p>
            </div>
          </div>

          <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${showToolsSection ? 'rotate-180 text-emerald-400' : ''}`} />
        </div>

        {showToolsSection && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/5 animate-fade-in">
            {Object.entries(CHAPTER_TOOLS).map(([key, tool]) => (
              <div
                key={key}
                onClick={() => {
                  sound.playTap();
                  setActiveToolKey(key);
                }}
                className="cursor-pointer p-3.5 rounded-xl bg-[#070B14] border border-white/10 hover:border-cyan-500/40 hover:bg-cyan-950/20 transition-all group space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white group-hover:text-cyan-300 font-mono">
                    {tool.cheatSheetTitle}
                  </span>
                  <FileText className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                </div>
                <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                  {tool.keyTakeaway}
                </p>
                <span className="text-[10px] font-mono text-cyan-400 font-bold inline-block pt-1">
                  APRI COMANDI →
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. MODALE: CHEAT SHEET TATTICO & COMANDI RAPIDI                          */}
      {/* ========================================================================= */}
      {activeToolKey && CHAPTER_TOOLS[activeToolKey] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-[#0B0F19] border border-white/15 p-5 sm:p-6 shadow-2xl space-y-4">
            
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center">
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-mono font-bold text-sm text-white">
                    {CHAPTER_TOOLS[activeToolKey].cheatSheetTitle}
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Tocca un comando per copiarlo
                  </span>
                </div>
              </div>

              <button
                onClick={() => setActiveToolKey(null)}
                className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Chiudi cheat sheet"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Commands List */}
            <div className="space-y-2 pt-1 max-h-72 overflow-y-auto">
              {CHAPTER_TOOLS[activeToolKey].cheatSheetCommands.map((cmd, idx) => {
                const isCopied = copiedIndex === idx;
                return (
                  <div 
                    key={idx}
                    onClick={() => handleCopyCommand(cmd, idx)}
                    className="cursor-pointer group flex items-center justify-between gap-2 p-2.5 rounded-lg bg-[#050811] border border-white/10 hover:border-cyan-500/50 hover:bg-cyan-950/20 transition-all font-mono text-xs"
                  >
                    <span className="text-slate-200 select-all font-mono break-all text-[11px]">
                      {cmd}
                    </span>
                    <button 
                      className="shrink-0 p-1.5 rounded bg-slate-900 border border-white/10 text-slate-400 group-hover:text-cyan-400"
                      title="Copia comando negli appunti"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Key Takeaway Banner */}
            <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-xs text-slate-300">
              <span className="font-mono font-bold text-cyan-400 block mb-1">
                REGOLA CHIAVE D'ESAME:
              </span>
              {CHAPTER_TOOLS[activeToolKey].keyTakeaway}
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setActiveToolKey(null)}
                className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-white/10 hover:bg-white/15 text-white transition-all cursor-pointer"
              >
                CHIUDI CHEAT SHEET
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
