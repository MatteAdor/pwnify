import React, { useState } from 'react';
import { SKILL_MODULES } from '../../data/curriculum';
import { SkillModule, SkillNode, UserState } from '../../types';
import { sound } from '../../utils/soundEngine';
import { 
  Lock, CheckCircle2, Play, Sparkles, Shield, 
  Terminal, Globe, Network, Cpu, Key, Server, 
  ArrowLeft, ChevronRight, Zap, BookOpen, 
  Check, Copy, FileText, Flame, Target,
  AlertTriangle, Clock, X
} from 'lucide-react';

interface TacticalSkillTreeProps {
  userState: UserState;
  onSelectNode: (node: SkillNode) => void;
  onOpenPaywall: () => void;
  onOpenDailyBreach?: () => void;
}

// Helper to strip redundant "Modulo X:" prefix when displaying chapter titles
const cleanModuleName = (title: string): string => {
  return title.replace(/^Modulo\s*\d+:\s*/i, '').trim();
};

// Icon and color mapper for chapters
const CHAPTER_METADATA: Record<string, { icon: React.ElementType; tag: string; label: string; accentColor: string }> = {
  mod_basics_0: {
    icon: Terminal,
    tag: 'FONDAMENTA',
    label: 'Terminale & Linux',
    accentColor: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/30 text-cyan-400'
  },
  mod_web_sqli: {
    icon: Globe,
    tag: 'OFFENSIVE WEB',
    label: 'Web Hacking & OWASP',
    accentColor: 'from-rose-500/20 to-orange-500/10 border-rose-500/30 text-rose-400'
  },
  mod_networking: {
    icon: Network,
    tag: 'NETWORKING',
    label: 'Packet Dissection & CCNA',
    accentColor: 'from-blue-500/20 to-indigo-500/10 border-blue-500/30 text-blue-400'
  },
  mod_linux: {
    icon: Cpu,
    tag: 'LOW LEVEL',
    label: 'Kernel & Linux PrivEsc',
    accentColor: 'from-amber-500/20 to-yellow-500/10 border-amber-500/30 text-amber-400'
  },
  mod_defense_soc: {
    icon: Shield,
    tag: 'BLUE TEAM',
    label: 'Threat Hunting & SIEM',
    accentColor: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400'
  },
  mod_api_jwt: {
    icon: Key,
    tag: 'API & AUTH',
    label: 'Token & JWT Exploitation',
    accentColor: 'from-purple-500/20 to-pink-500/10 border-purple-500/30 text-purple-400'
  },
  mod_active_directory: {
    icon: Server,
    tag: 'ENTERPRISE',
    label: 'Active Directory & Kerberos',
    accentColor: 'from-red-500/20 to-orange-500/10 border-red-500/30 text-red-400'
  }
};

// Chapter tactical cheat sheets & practical tools
const CHAPTER_TOOLS: Record<string, {
  cheatSheetTitle: string;
  cheatSheetCommands: string[];
  keyTakeaway: string;
  recommendedLab: string;
}> = {
  mod_basics_0: {
    cheatSheetTitle: 'Bash Survival & FHS Directory Mapping',
    cheatSheetCommands: [
      'pwd                         # Mostra percorso assoluto cartella corrente',
      'ls -la /var/log/            # Elenco file nascosti con permessi e timestamp',
      'grep -in "error" app.log    # Ricerca case-insensitive con numero riga',
      'chmod 600 id_rsa            # Permessi restrittivi (lettura/scrittura solo owner)',
      'chown root:root /etc/shadow # Assegna proprietà superuser'
    ],
    keyTakeaway: 'Nello standard FHS, i file di configurazione risiedono in /etc/, i log in /var/log/. Mai memorizzare chiavi in world-readable /tmp/.',
    recommendedLab: 'Sandbox Linux Shell: Navigazione permessi e ispezione log di sistema'
  },
  mod_web_sqli: {
    cheatSheetTitle: 'OWASP Top 10 Injection & XSS Payloads',
    cheatSheetCommands: [
      "' OR 1=1 -- -               # SQL Injection Auth Bypass universale",
      "' UNION SELECT null, user, password FROM users -- # Data Exfiltration",
      '<script>alert(document.cookie)</script>           # Classic Stored XSS',
      '"><img src=x onerror=alert(1)>                    # Filter Evasion XSS',
      'admin\' --                  # Comment-out password check in SQL queries'
    ],
    keyTakeaway: 'L\'unica difesa infallibile contro SQLi sono i Prepared Statements. Per XSS è obbligatorio il Context-Aware Output Encoding e CSP restrittivo.',
    recommendedLab: 'Web App Pentesting: Bypass del modulo di autenticazione e estrazione DB'
  },
  mod_networking: {
    cheatSheetTitle: 'TCP/IP Handshake & Wireshark Dissection',
    cheatSheetCommands: [
      'tcp.flags.syn == 1 && tcp.flags.ack == 0  # Filtra pacchetti SYN iniziali',
      'http.request.method == "POST"             # Isola traffico credenziali HTTP',
      'nmap -sS -p 1-1000 -T4 target_ip          # TCP SYN Stealth Scan veloce',
      'arp -a                                    # Tabella mappatura IP -> MAC locale',
      'netstat -tulpn                            # Porte TCP/UDP in ascolto e PID associati'
    ],
    keyTakeaway: 'Il Three-Way Handshake TCP è composto da SYN -> SYN-ACK -> ACK. Un flag RST chiude bruscamente la connessione senza teardown.',
    recommendedLab: 'Packet Capture Lab: Ispezione PCAP e ricostruzione flussi di sessione'
  },
  mod_linux: {
    cheatSheetTitle: 'Linux Kernel & Privilege Escalation Vector',
    cheatSheetCommands: [
      'find / -perm -4000 -type f 2>/dev/null    # Cerca tutti i file con bit SUID attivo',
      'sudo -l                                  # Verifica comandi eseguibili come root',
      'uname -a                                 # Info versione kernel per kernel exploit',
      'cat /etc/crontab                         # Ispezione task pianificati vulnerabili',
      'ls -ld /tmp /var/tmp                     # Verifica sticky bit su cartelle temporanee'
    ],
    keyTakeaway: 'I binari SUID mantengono i privilegi del file owner. Se un binario SUID richiama script relativi o permette shell escape, root è immediato.',
    recommendedLab: 'PrivEsc Arena: Sfruttamento misconfiguration SUID e GTFOBins'
  },
  mod_defense_soc: {
    cheatSheetTitle: 'SIEM Event Correlation & Threat Hunting',
    cheatSheetCommands: [
      'EventID 4624  # Logon completato con successo (Audit Success)',
      'EventID 4625  # Fallimento di autenticazione (Password Spray / Brute Force)',
      'EventID 7045  # Servizio di sistema creato (Spesso associato a Persistence)',
      'EventID 4688  # Nuovo processo creato (CommandLine auditing abilitato)',
      'EventID 1102  # Il registro Security Event Log è stato cancellato'
    ],
    keyTakeaway: 'Una raffica di EventID 4625 concentrata seguita da un 4624 dallo stesso IP segnala un attacco brute force / spray riuscito.',
    recommendedLab: 'SOC Triage: Analisi incident timeline e isolamento endpoint compromesso'
  },
  mod_api_jwt: {
    cheatSheetTitle: 'API REST & JSON Web Token Attack Patterns',
    cheatSheetCommands: [
      '{"alg": "none", "typ": "JWT"}            # Bypass firma con algoritmo None',
      'jwtcrack token.jwt -w rockyou.txt        # Brute-force HMAC SHA256 secret debole',
      'GET /api/v1/orders/1337 -> 1338          # BOLA / IDOR su parametri URL',
      'Authorization: Bearer <tampered_token>   # Test validazione server-side signature',
      'Content-Type: application/json; charset=utf-8'
    ],
    keyTakeaway: 'Non fidarsi mai dell\'header "alg" nel payload JWT. L\'algoritmo di firma deve essere forzato e controllato rigidamente sul backend.',
    recommendedLab: 'API Security Lab: Manipolazione JWT e BOLA IDOR Exploitation'
  },
  mod_active_directory: {
    cheatSheetTitle: 'Active Directory & Kerberos Lateral Movement',
    cheatSheetCommands: [
      'GetUserSPNs.py domain/user -request       # Kerberoasting: estrazione TGS cifrati',
      'GetNPUsers.py domain/ -usersfile users.txt # AS-REP Roasting senza pre-auth',
      'mimikatz # sekurlsa::logonpasswords       # Dump NTLM hash dalla memoria LSASS',
      'bloodhound-python -d domain.local -u user # Raccolta grafo privilegi AD',
      'pth-winexe -U domain/admin%aad3... //host cmd.exe # Pass-The-Hash'
    ],
    keyTakeaway: 'Proteggi gli account di servizio enterprise disabilitando la cifratura RC4 su Kerberos e adottando password lunghe contro l\'offline cracking.',
    recommendedLab: 'Active Directory Domain Dominion: Kerberoasting e privilege graph escalation'
  }
};

export const TacticalSkillTree: React.FC<TacticalSkillTreeProps> = ({
  userState,
  onSelectNode,
  onOpenPaywall,
  onOpenDailyBreach
}) => {
  // Navigation: null = Chapter Overview, string = Chapter Detail (Selected Module ID)
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  
  // Tactical Cheat Sheet Modal State
  const [activeCheatSheetModuleId, setActiveCheatSheetModuleId] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Daily Breach solved state check
  const todayStr = new Date().toISOString().split('T')[0];
  const isBreachSolvedToday = userState.lastDailyBreachDate === todayStr;

  // Selected module data
  const activeModule: SkillModule | undefined = SKILL_MODULES.find(m => m.id === selectedChapterId);

  // Helper to calculate module progress
  const getModuleStats = (module: SkillModule) => {
    const totalNodes = module.nodes.length;
    const completedCount = module.nodes.filter(n => userState.completedNodeIds.includes(n.id)).length;
    const progressPercent = totalNodes > 0 ? Math.round((completedCount / totalNodes) * 100) : 0;
    const totalXp = module.nodes.reduce((sum, n) => sum + n.xpReward, 0);
    const totalElo = module.nodes.reduce((sum, n) => sum + n.eloReward, 0);
    const isCompleted = completedCount === totalNodes && totalNodes > 0;
    const isInProgress = completedCount > 0 && !isCompleted;

    return { totalNodes, completedCount, progressPercent, totalXp, totalElo, isCompleted, isInProgress };
  };

  const handleCopyCommand = (cmd: string, index: number) => {
    sound.playTap();
    navigator.clipboard.writeText(cmd.split('#')[0].trim());
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1800);
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-3.5 sm:px-4 py-4 sm:py-6 pb-28 space-y-4 sm:space-y-6">
      
      {/* ========================================================================= */}
      {/* VISTA 1: DETTAGLIO CAPITOLO (DRILL-DOWN NELLE LEZIONI & POTENZIAMENTI)    */}
      {/* ========================================================================= */}
      {selectedChapterId && activeModule ? (
        <div className="space-y-4 sm:space-y-5 animate-fade-in">
          
          {/* Breadcrumb & Navigation Back Bar */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                sound.playTap();
                setSelectedChapterId(null);
              }}
              className="group flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-white/10 hover:border-emerald-500/40 text-slate-300 hover:text-white transition-all text-xs font-mono font-bold cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1 text-emerald-400" />
              <span>← Panoramica Capitoli</span>
            </button>

            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-white/10 text-slate-400">
              MODULO 0{SKILL_MODULES.findIndex(m => m.id === activeModule.id)}
            </span>
          </div>

          {/* Chapter Hero Card */}
          {(() => {
            const meta = CHAPTER_METADATA[activeModule.id] || {
              icon: Terminal,
              tag: 'CAPITOLO',
              label: activeModule.title,
              accentColor: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400'
            };
            const stats = getModuleStats(activeModule);
            const ChapterIcon = meta.icon;
            const cleanTitle = cleanModuleName(activeModule.title);

            return (
              <div className="rounded-2xl bg-gradient-to-r from-surface via-[#121929] to-[#0b121e] border border-white/15 p-4 sm:p-5 shadow-cyber-glass space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-slate-900/90 border border-white/15 flex items-center justify-center shrink-0 shadow text-emerald-400 mt-0.5">
                    <ChapterIcon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                        {meta.tag}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {activeModule.certificationFocus}
                      </span>
                    </div>

                    <h1 className="text-base sm:text-xl font-extrabold text-white leading-tight">
                      {cleanTitle}
                    </h1>
                  </div>
                </div>

                {/* Progress bar + Stats summary */}
                <div className="pt-2 border-t border-white/5 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-400">
                      Progresso: <strong className="text-emerald-400">{stats.completedCount}/{stats.totalNodes}</strong> ({stats.progressPercent}%)
                    </span>
                    <span className="text-slate-300">
                      +{stats.totalXp} XP · <span className="text-indigo-400">+{stats.totalElo} ELO</span>
                    </span>
                  </div>

                  <div className="w-full h-1.5 rounded-full bg-slate-800/80 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-500 shadow-neon-emerald"
                      style={{ width: `${stats.progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Section: Lezioni del Capitolo (Vertical Lesson Tree) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-emerald-400" />
                <span>Nodi & Lezioni ({activeModule.nodes.length})</span>
              </h2>
              <span className="text-[10px] font-mono text-slate-400">
                Tocca per avviare il quiz
              </span>
            </div>

            {/* Vertical Path Nodes */}
            <div className="relative flex flex-col items-center space-y-3.5 py-1">
              {/* Vertical connection bus */}
              <div className="absolute top-4 bottom-4 w-1 bg-gradient-to-b from-emerald-500/40 via-indigo-500/20 to-slate-800 -z-0" />

              {activeModule.nodes.map((node, nodeIdx) => {
                const isCompleted = userState.completedNodeIds.includes(node.id);
                const isLocked = !isCompleted && node.status === 'locked' && !userState.isPro;

                return (
                  <div 
                    key={node.id} 
                    className="relative z-10 w-full"
                  >
                    {/* Interactive Node Card */}
                    <div
                      onClick={() => {
                        sound.playTap();
                        if (isLocked) {
                          onOpenPaywall();
                        } else {
                          onSelectNode(node);
                        }
                      }}
                      className={`cursor-pointer group relative w-full p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 flex items-start gap-3.5 ${
                        isCompleted
                          ? 'bg-emerald-950/25 border-emerald-500/50 hover:border-emerald-400 shadow-neon-emerald'
                          : isLocked
                          ? 'bg-surface/50 border-white/5 opacity-80 hover:opacity-100 hover:border-amber-500/30'
                          : 'bg-surface border-white/10 hover:border-emerald-500/40 hover:shadow-neon-emerald'
                      }`}
                    >
                      {/* Node Index / Status Circle */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105 mt-0.5 ${
                        isCompleted
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                          : isLocked
                          ? 'bg-slate-900 border-slate-700 text-slate-500'
                          : 'bg-indigo-500/20 border-indigo-500 text-indigo-400 shadow-neon-indigo'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : isLocked ? (
                          <Lock className="w-4 h-4 text-amber-500/80" />
                        ) : (
                          <Play className="w-4 h-4 text-indigo-400 fill-indigo-400 ml-0.5" />
                        )}
                      </div>

                      {/* Node Content */}
                      <div className="flex-1 min-w-0 space-y-1">
                        {/* Badges + Rewards row */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-300 border border-white/5 font-semibold">
                              LEZIONE 0{nodeIdx + 1}
                            </span>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-cyan-300 border border-white/5">
                              {node.domain}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold shrink-0">
                            <span className="text-emerald-400">+{node.xpReward} XP</span>
                            <span className="text-slate-600">·</span>
                            <span className="text-indigo-400">+{node.eloReward} ELO</span>
                          </div>
                        </div>

                        {/* Title - Non-truncated, elegant multi-line */}
                        <h4 className="font-bold text-xs sm:text-sm text-white leading-snug">
                          {node.title}
                        </h4>

                        {/* Subtitle - Non-truncated readable explanation */}
                        <p className="text-[11px] text-slate-400 leading-normal">
                          {node.subtitle}
                        </p>

                        {/* Status tag */}
                        {(isCompleted || isLocked) && (
                          <div className="pt-1.5 flex items-center justify-between text-[10px] font-mono font-bold">
                            {isCompleted && (
                              <span className="text-emerald-400 flex items-center gap-1">
                                <Check className="w-3 h-3" /> COMPLETATO CON SUCCESSO
                              </span>
                            )}
                            {isLocked && (
                              <span className="text-amber-400 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> CONTENUTO ZERO-DAY PRO
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Potenziamenti & Laboratori Pratici del Capitolo */}
          <div className="rounded-2xl bg-surface border border-white/10 p-4 space-y-3">
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-white flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Tool & Potenziamenti del Capitolo</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Risorse tattiche per consolidare la preparazione all'esame.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              
              {/* Tool 1: Cheat Sheet & Comandi Rapidi */}
              <div 
                onClick={() => {
                  sound.playTap();
                  setActiveCheatSheetModuleId(activeModule.id);
                }}
                className="cursor-pointer p-3 rounded-xl bg-[#090D16] border border-white/10 hover:border-cyan-500/40 hover:bg-cyan-950/20 transition-all group space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <h4 className="font-bold text-xs text-white group-hover:text-cyan-300 transition-colors">
                      Cheat Sheet Comandi
                    </h4>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                    CHEAT SHEET
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  {CHAPTER_TOOLS[activeModule.id]?.cheatSheetTitle || 'Comandi rapidi, payload e regole.'}
                </p>
                <span className="text-[10px] font-mono text-cyan-400 font-bold inline-flex items-center gap-1 pt-0.5">
                  APRI COMANDI →
                </span>
              </div>

              {/* Tool 2: Laboratorio Pratico Sandbox */}
              <div 
                onClick={() => {
                  sound.playTap();
                  if (!userState.isPro) {
                    onOpenPaywall();
                  } else {
                    alert(`Laboratorio attivo: ${CHAPTER_TOOLS[activeModule.id]?.recommendedLab || 'Scenario pratico pronto'}`);
                  }
                }}
                className="cursor-pointer p-3 rounded-xl bg-[#090D16] border border-white/10 hover:border-emerald-500/40 hover:bg-emerald-950/20 transition-all group space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                      <Terminal className="w-3.5 h-3.5" />
                    </div>
                    <h4 className="font-bold text-xs text-white group-hover:text-emerald-300 transition-colors">
                      Lab Sandbox 0-Day
                    </h4>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    SANDBOX
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  {CHAPTER_TOOLS[activeModule.id]?.recommendedLab || 'Esercitazione guidata con validazione payload.'}
                </p>
                <span className="text-[10px] font-mono text-emerald-400 font-bold inline-flex items-center gap-1 pt-0.5">
                  {userState.isPro ? 'ACCEDI AL LAB →' : 'SBLOCCA CON PRO'}
                </span>
              </div>

            </div>
          </div>

        </div>
      ) : (

        /* ========================================================================= */
        /* VISTA 2: PANORAMICA GENERALE CAPITOLI (HOME CON SUDDIVISIONE IN CAPITOLI) */
        /* ========================================================================= */
        <div className="space-y-4 sm:space-y-5 animate-fade-in">

          {/* Tactical Header Banner - Clean, calm and breathable */}
          <div className="relative rounded-2xl bg-gradient-to-r from-surface to-[#151e33] border border-white/10 p-4 sm:p-5 shadow-cyber-glass overflow-hidden">
            <div className="absolute -top-12 -right-12 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                ROADMAP CERTIFICAZIONI
              </span>
              
              <div className="flex items-center gap-2 font-mono text-[10px]">
                <span className="text-slate-400">READINESS:</span>
                <span className="text-emerald-400 font-bold text-xs">{userState.readinessScore}%</span>
              </div>
            </div>

            <h1 className="text-lg sm:text-2xl font-black text-white leading-tight">
              Capitoli Tattici
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              Seleziona un capitolo operativo per affrontare le lezioni e i lab pratici.
            </p>
          </div>

          {/* Daily 0xBreach Challenge Hero Card - Clean, technical, and professional */}
          <div className="rounded-2xl bg-zinc-900/90 border border-red-500/30 p-4 sm:p-5 relative overflow-hidden space-y-3">
            {/* Top row: Status, Title, Streak */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                      DEFCON 1
                    </span>
                    <h2 className="text-xs sm:text-sm font-bold text-white">
                      Daily 0xBreach
                    </h2>
                  </div>
                </div>
              </div>

              {/* Triage streak */}
              <div className="font-mono text-right shrink-0">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  <Flame className="w-3 h-3 text-amber-400" />
                  <span>x{userState.dailyBreachStreak || 0} TRIAGE</span>
                </span>
              </div>
            </div>

            {/* Short, non-overwhelming summary */}
            <p className="text-[11px] sm:text-xs text-zinc-300 leading-relaxed">
              Analizza l'incidente CVE quotidiano nel frammento di codice e individua la root cause per ottenere XP doppi.
            </p>

            {/* Action CTA */}
            <div className="pt-0.5 space-y-2">
              <button
                onClick={() => {
                  sound.playTap();
                  if (onOpenDailyBreach) onOpenDailyBreach();
                }}
                className={`w-full py-2.5 px-4 rounded-xl font-mono font-bold text-xs transition-all flex items-center justify-center gap-2 transform active:scale-98 cursor-pointer ${
                  isBreachSolvedToday
                    ? 'bg-zinc-800 border border-emerald-500/40 text-emerald-300 hover:bg-zinc-750'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold'
                }`}
              >
                {isBreachSolvedToday ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>TRIAGE COMPLETATO OGGI (RIVEDI ANALISI)</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 fill-slate-950" />
                    <span>AVVIA TRIAGE ZERO-DAY (+150 XP)</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 px-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span>Nuovo breach alle 00:00</span>
                </span>
                <span>1 tentativo al giorno</span>
              </div>
            </div>
          </div>

          {/* Section Header */}
          <div className="flex items-center justify-between px-1 pt-1">
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              Capitoli Operativi ({SKILL_MODULES.length})
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Tocca per aprire →
            </span>
          </div>

          {/* Chapters Grid - Re-architected with calm whitespace & no collisions */}
          <div className="grid grid-cols-1 gap-3">
            {SKILL_MODULES.map((module, mIndex) => {
              const meta = CHAPTER_METADATA[module.id] || {
                icon: Terminal,
                tag: 'CAPITOLO',
                label: module.title,
                accentColor: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400'
              };
              const ChapterIcon = meta.icon;
              const stats = getModuleStats(module);
              const cleanTitle = cleanModuleName(module.title);

              return (
                <div
                  key={module.id}
                  onClick={() => {
                    sound.playTap();
                    setSelectedChapterId(module.id);
                  }}
                  className="cursor-pointer group relative rounded-2xl bg-surface border border-white/10 hover:border-emerald-500/40 p-4 transition-all duration-200 shadow-cyber-glass space-y-3"
                >
                  {/* Top Row: Chapter Badge, Domain Tag, Rewards */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-300 border border-white/10 font-bold">
                        CAPITOLO {mIndex}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 font-semibold">
                        {meta.tag}
                      </span>
                      {stats.isCompleted && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-bold flex items-center gap-1 border border-emerald-500/30">
                          <Check className="w-2.5 h-2.5" /> COMPLETATO
                        </span>
                      )}
                      {stats.isInProgress && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                          {stats.completedCount}/{stats.totalNodes} FATTE
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 font-mono text-[11px] font-bold text-emerald-400 shrink-0">
                      <span>+{stats.totalXp} XP</span>
                      <span className="text-slate-600">·</span>
                      <span className="text-indigo-400">+{stats.totalElo} ELO</span>
                    </div>
                  </div>

                  {/* Middle Row: Icon + Title + Certification */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#090D16] border border-white/15 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform text-emerald-400 shadow-sm">
                      <ChapterIcon className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 transition-colors leading-snug">
                        {cleanTitle}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-tight truncate">
                        {module.certificationFocus}
                      </p>
                    </div>

                    <div className="w-7 h-7 rounded-lg bg-slate-900 border border-white/10 flex items-center justify-center text-slate-400 group-hover:text-emerald-400 group-hover:border-emerald-500/40 shrink-0">
                      <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>

                  {/* Bottom Row: Progress Bar + Lessons Count */}
                  <div className="space-y-1.5 pt-1 border-t border-white/5">
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>{stats.totalNodes} LEZIONI OPERATIVE</span>
                      <span className="font-bold text-slate-300">{stats.progressPercent}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800/80 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          stats.isCompleted 
                            ? 'bg-emerald-400 shadow-neon-emerald' 
                            : stats.isInProgress 
                            ? 'bg-cyan-400' 
                            : 'bg-slate-700'
                        }`}
                        style={{ width: `${Math.max(stats.progressPercent, 4)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALE: CHEAT SHEET TATTICO & COMANDI RAPIDI                              */}
      {/* ========================================================================= */}
      {activeCheatSheetModuleId && CHAPTER_TOOLS[activeCheatSheetModuleId] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-[#0B0F19] border border-white/15 p-4 sm:p-6 shadow-2xl space-y-4">
            
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center">
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-mono font-bold text-xs sm:text-sm text-white">
                    {CHAPTER_TOOLS[activeCheatSheetModuleId].cheatSheetTitle}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Comandi ufficiali pronti per la copia
                  </span>
                </div>
              </div>

              <button
                onClick={() => setActiveCheatSheetModuleId(null)}
                className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Chiudi cheat sheet"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Commands List */}
            <div className="space-y-2 pt-1 max-h-72 overflow-y-auto">
              {CHAPTER_TOOLS[activeCheatSheetModuleId].cheatSheetCommands.map((cmd, idx) => {
                const isCopied = copiedIndex === idx;
                return (
                  <div 
                    key={idx}
                    onClick={() => handleCopyCommand(cmd, idx)}
                    className="cursor-pointer group flex items-center justify-between gap-2 p-2 rounded-lg bg-[#050811] border border-white/10 hover:border-cyan-500/50 hover:bg-cyan-950/20 transition-all font-mono text-xs"
                  >
                    <span className="text-slate-200 select-all font-mono break-all text-[11px]">
                      {cmd}
                    </span>
                    <button 
                      className="shrink-0 p-1 rounded bg-slate-900 border border-white/10 text-slate-400 group-hover:text-cyan-400"
                      title="Copia comando negli appunti"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Key Takeaway Banner */}
            <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-[11px] text-slate-300">
              <span className="font-mono font-bold text-cyan-400 block mb-0.5">
                REGOLA CHIAVE D'ESAME:
              </span>
              {CHAPTER_TOOLS[activeCheatSheetModuleId].keyTakeaway}
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setActiveCheatSheetModuleId(null)}
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
