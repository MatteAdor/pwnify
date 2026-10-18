import React, { useState } from 'react';
import { SKILL_MODULES } from '../../data/curriculum';
import { SkillModule, SkillNode, UserState } from '../../types';
import { sound } from '../../utils/soundEngine';
import { 
  Lock, CheckCircle2, Play, Sparkles, Shield, 
  Terminal, Globe, Network, Cpu, Key, Server, 
  ArrowLeft, ChevronRight, Zap, BookOpen, 
  Check, Copy, FileText, HelpCircle, Flame, Target
} from 'lucide-react';

interface TacticalSkillTreeProps {
  userState: UserState;
  onSelectNode: (node: SkillNode) => void;
  onOpenPaywall: () => void;
}

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
    tag: 'INFRASTRUTTURA',
    label: 'Packet Dissection & CCNA',
    accentColor: 'from-blue-500/20 to-indigo-500/10 border-blue-500/30 text-blue-400'
  },
  mod_linux: {
    icon: Cpu,
    tag: 'LOW LEVEL & OS',
    label: 'Kernel & Linux PrivEsc',
    accentColor: 'from-amber-500/20 to-yellow-500/10 border-amber-500/30 text-amber-400'
  },
  mod_defense_soc: {
    icon: Shield,
    tag: 'BLUE TEAM & SOC',
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
    tag: 'ENTERPRISE RED TEAM',
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
    keyTakeaway: 'Nello standard FHS, i file di configurazione risiedono in /etc/, i file variabili e log in /var/log/. Mai memorizzare chiavi in world-readable /tmp/.',
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
    keyTakeaway: 'L\'unica difesa infallibile contro SQLi sono i Prepared Statements (Query Parametrizzate). Per XSS è obbligatorio il Context-Aware Output Encoding e CSP restrittivo.',
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
    keyTakeaway: 'Il Three-Way Handshake TCP è composto da SYN -> SYN-ACK -> ACK. Un flag RST chiude bruscamente la connessione senza negoziazione di teardown.',
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
    keyTakeaway: 'I binari SUID mantengono i privilegi del file owner all\'esecuzione. Se un binario SUID richiama script relativi o permette shell escape, l\'escalation a root è immediata.',
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
    keyTakeaway: 'Una raffica di EventID 4625 concentrata seguita da un 4624 dallo stesso IP segnala un attacco di brute force o password spray andato a buon fine.',
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
    keyTakeaway: 'Non fidarsi mai dell\'header "alg" nel payload JWT. L\'algoritmo di firma deve essere forzato e controllato rigidamente sul backend, non scelto dal client.',
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
    keyTakeaway: 'Proteggi gli account di servizio enterprise disabilitando la cifratura RC4 su Kerberos e adottando password di almeno 25 caratteri per resistere al cracking offline dei ticket TGS.',
    recommendedLab: 'Active Directory Domain Dominion: Kerberoasting e privilege graph escalation'
  }
};

export const TacticalSkillTree: React.FC<TacticalSkillTreeProps> = ({
  userState,
  onSelectNode,
  onOpenPaywall
}) => {
  // Navigation: null = Chapter Overview, string = Chapter Detail (Selected Module ID)
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  
  // Tactical Cheat Sheet Modal State
  const [activeCheatSheetModuleId, setActiveCheatSheetModuleId] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

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
    <div className="w-full max-w-3xl mx-auto px-4 py-6 pb-28 space-y-6">
      
      {/* ========================================================================= */}
      {/* VISTA 1: DETTAGLIO CAPITOLO (DRILL-DOWN NELLE LEZIONI & POTENZIAMENTI)    */}
      {/* ========================================================================= */}
      {selectedChapterId && activeModule ? (
        <div className="space-y-6 animate-fade-in">
          
          {/* Breadcrumb & Navigation Back Bar */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                sound.playTap();
                setSelectedChapterId(null);
              }}
              className="group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface border border-white/10 hover:border-emerald-500/50 hover:bg-white/5 text-slate-300 hover:text-white transition-all text-xs font-mono font-bold cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1 text-emerald-400" />
              <span>← Panoramica Capitoli</span>
            </button>

            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-white/10 text-slate-400">
              MODULO: {activeModule.id.replace('mod_', '').toUpperCase()}
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

            return (
              <div className="relative rounded-2xl bg-gradient-to-r from-surface via-[#131c2e] to-[#0d1522] border border-white/15 p-5 sm:p-6 shadow-cyber-glass overflow-hidden">
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-900/90 border border-white/15 flex items-center justify-center shrink-0 shadow-lg text-emerald-400">
                      <ChapterIcon className="w-7 h-7" />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                          {meta.tag}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {activeModule.certificationFocus}
                        </span>
                      </div>

                      <h1 className="text-xl sm:text-2xl font-black text-white">
                        {activeModule.title}
                      </h1>
                      <p className="text-xs text-slate-300 mt-1 max-w-lg">
                        Completa tutte le lezioni, individua i bug nei sorgenti e sblocca i cheat sheet tattici per dominare l'esame.
                      </p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 border-white/10 pt-3 sm:pt-0">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] font-mono text-slate-400 block">PROGRESSO CAPITOLO</span>
                      <span className="text-xl sm:text-2xl font-mono font-extrabold text-emerald-400">
                        {stats.completedCount}/{stats.totalNodes} <span className="text-xs text-slate-400">({stats.progressPercent}%)</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1 font-mono text-[11px] text-slate-400">
                      <span className="text-emerald-400 font-bold">+{stats.totalXp} XP</span>
                      <span>·</span>
                      <span className="text-indigo-400 font-bold">+{stats.totalElo} ELO</span>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 rounded-full bg-slate-800/80 overflow-hidden mt-4">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-500 shadow-neon-emerald"
                    style={{ width: `${stats.progressPercent}%` }}
                  />
                </div>
              </div>
            );
          })()}

          {/* Section: Lezioni del Capitolo (Vertical Lesson Tree) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-400" />
                Nodi & Lezioni Operative ({activeModule.nodes.length})
              </h2>
              <span className="text-[11px] font-mono text-slate-400">
                Tocca una lezione per avviare il quiz
              </span>
            </div>

            {/* Vertical Path Nodes */}
            <div className="relative flex flex-col items-center space-y-5 py-2">
              {/* Vertical SVG connection line */}
              <div className="absolute top-6 bottom-6 w-1 bg-gradient-to-b from-emerald-500/50 via-indigo-500/30 to-slate-800 -z-0" />

              {activeModule.nodes.map((node, nodeIdx) => {
                const isCompleted = userState.completedNodeIds.includes(node.id);
                const isLocked = !isCompleted && node.status === 'locked' && !userState.isPro;

                return (
                  <div 
                    key={node.id} 
                    className="relative z-10 w-full flex flex-col items-center"
                  >
                    {/* Interactive Node Button */}
                    <div
                      onClick={() => {
                        sound.playTap();
                        if (isLocked) {
                          onOpenPaywall();
                        } else {
                          onSelectNode(node);
                        }
                      }}
                      className={`cursor-pointer group relative w-full p-4 rounded-2xl border transition-all duration-300 flex items-center gap-4 ${
                        isCompleted
                          ? 'bg-emerald-950/25 border-emerald-500/50 hover:border-emerald-400 shadow-neon-emerald'
                          : isLocked
                          ? 'bg-surface/50 border-white/5 opacity-75 hover:opacity-100 hover:border-amber-500/30'
                          : 'bg-surface border-white/15 hover:border-emerald-500/50 hover:shadow-neon-emerald'
                      }`}
                    >
                      {/* Node Index / Status Circle */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105 ${
                        isCompleted
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                          : isLocked
                          ? 'bg-slate-900 border-slate-700 text-slate-500'
                          : 'bg-indigo-500/20 border-indigo-500 text-indigo-400 shadow-neon-indigo'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                        ) : isLocked ? (
                          <Lock className="w-5 h-5 text-amber-500/80" />
                        ) : (
                          <Play className="w-5 h-5 text-indigo-400 fill-indigo-400 ml-0.5" />
                        )}
                      </div>

                      {/* Node Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900/80 text-slate-300 border border-white/5">
                            LEZIONE 0{nodeIdx + 1}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900/80 text-cyan-300 border border-white/5">
                            {node.domain}
                          </span>
                          {isCompleted && (
                            <span className="text-[10px] font-mono text-emerald-400 font-bold">
                              COMPLETATO
                            </span>
                          )}
                          {isLocked && (
                            <span className="text-[10px] font-mono text-amber-400 font-bold flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> PRO ONLY
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-sm sm:text-base text-white truncate">
                          {node.title}
                        </h4>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {node.subtitle}
                        </p>
                      </div>

                      {/* Rewards / Status Action */}
                      <div className="flex flex-col items-end shrink-0 font-mono text-right">
                        <span className="text-xs text-emerald-400 font-bold">
                          +{node.xpReward} XP
                        </span>
                        <span className="text-[10px] text-slate-400">
                          +{node.eloReward} ELO
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Potenziamenti & Laboratori Pratici del Capitolo */}
          <div className="rounded-2xl bg-surface border border-white/10 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Potenziamenti & Tool Tattici del Capitolo
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Cheat sheet, laboratori sandbox e simulazioni esame focalizzate su questo argomento.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              
              {/* Tool 1: Cheat Sheet & Comandi Rapidi */}
              <div 
                onClick={() => {
                  sound.playTap();
                  setActiveCheatSheetModuleId(activeModule.id);
                }}
                className="cursor-pointer p-3.5 rounded-xl bg-[#090D16] border border-white/10 hover:border-cyan-500/40 hover:bg-cyan-950/20 transition-all group"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                    CHEAT SHEET
                  </span>
                </div>
                <h4 className="font-bold text-xs text-white group-hover:text-cyan-300 transition-colors">
                  Cheat Sheet & Payload Tattico
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                  {CHAPTER_TOOLS[activeModule.id]?.cheatSheetTitle || 'Comandi rapidi, payload e regole di ingaggio.'}
                </p>
                <span className="text-[10px] font-mono text-cyan-400 font-bold mt-2.5 inline-flex items-center gap-1">
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
                className="cursor-pointer p-3.5 rounded-xl bg-[#090D16] border border-white/10 hover:border-emerald-500/40 hover:bg-emerald-950/20 transition-all group"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <Terminal className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    LAB SANDBOX
                  </span>
                </div>
                <h4 className="font-bold text-xs text-white group-hover:text-emerald-300 transition-colors">
                  Laboratorio Sandbox Zero-Day
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                  {CHAPTER_TOOLS[activeModule.id]?.recommendedLab || 'Esercitazione guidata con validazione payload in tempo reale.'}
                </p>
                <span className="text-[10px] font-mono text-emerald-400 font-bold mt-2.5 inline-flex items-center gap-1">
                  {userState.isPro ? 'ACCEDI AL LAB →' : 'SBLOCCA CON PRO 🔒'}
                </span>
              </div>

              {/* Tool 3: XP Booster x2 Capitolo */}
              <div 
                onClick={() => {
                  sound.playTap();
                  sound.playExploitSuccess();
                  alert(`Booster x2 XP per il Capitolo attivato per 30 minuti! I tuoi quiz assegneranno doppi punti.`);
                }}
                className="cursor-pointer p-3.5 rounded-xl bg-[#090D16] border border-white/10 hover:border-amber-500/40 hover:bg-amber-950/20 transition-all group"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                    <Flame className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                    BOOSTER
                  </span>
                </div>
                <h4 className="font-bold text-xs text-white group-hover:text-amber-300 transition-colors">
                  Booster XP x2 Modulo
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Raddoppia i punti XP guadagnati per le lezioni di questo modulo nelle prossime sessioni.
                </p>
                <span className="text-[10px] font-mono text-amber-400 font-bold mt-2.5 inline-flex items-center gap-1">
                  ATTIVA BOOSTER 🔥
                </span>
              </div>

              {/* Tool 4: Regola d'Oro di Sicurezza */}
              <div className="p-3.5 rounded-xl bg-[#090D16] border border-white/10">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                    ESAME TIPS
                  </span>
                </div>
                <h4 className="font-bold text-xs text-white">
                  Regola Chiave Esame
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  {CHAPTER_TOOLS[activeModule.id]?.keyTakeaway || 'Memorizza i vettori di attacco primari e i meccanismi di mitigazione consigliati da OWASP e NIST.'}
                </p>
              </div>

            </div>
          </div>

        </div>
      ) : (

        /* ========================================================================= */
        /* VISTA 2: PANORAMICA GENERALE CAPITOLI (HOME CON SUDDIVISIONE IN CAPITOLI) */
        /* ========================================================================= */
        <div className="space-y-6 animate-fade-in">

          {/* Tactical Header Banner */}
          <div className="relative rounded-2xl bg-gradient-to-r from-surface to-[#1B2640] border border-white/10 p-5 shadow-cyber-glass overflow-hidden">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                    ACTIVE_CAMPAIGN
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    CompTIA Security+ · CCNA · CEH · OSCP
                  </span>
                  {/* Cyber Streak Shield Indicator */}
                  <div 
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                      userState.streakShieldActive
                        ? 'bg-cyan-950/70 text-cyan-300 border-cyan-400/50 shadow-sm'
                        : 'bg-slate-900/60 text-slate-400 border-slate-700'
                    }`}
                    title="Protezione Streak Giornaliera anticaduta"
                  >
                    <Shield className="w-3 h-3 text-cyan-400" />
                    <span>{userState.streakShieldActive ? 'SHIELD ATTIVO' : 'SHIELD OFF'}</span>
                  </div>
                </div>

                <h1 className="text-xl sm:text-2xl font-extrabold text-white">
                  Capitoli Tattici & Roadmap
                </h1>
                <p className="text-xs text-slate-300 mt-1 max-w-md">
                  Seleziona un capitolo per esplorare le lezioni pratiche, i quiz "Spot the Zero-Day" e i potenziamenti dedicati.
                </p>
              </div>

              <div className="hidden sm:flex flex-col items-end text-right">
                <span className="text-[10px] font-mono text-slate-400">READINESS GLOBALE</span>
                <span className="text-2xl font-mono font-extrabold text-emerald-400">
                  {userState.readinessScore}%
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {userState.completedNodeIds.length} nodi completati
                </span>
              </div>
            </div>
          </div>

          {/* Quick Chapters Counter Header */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                Capitoli Operativi
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 border border-white/10 text-emerald-400 font-bold">
                {SKILL_MODULES.length}
              </span>
            </div>

            <span className="text-[11px] font-mono text-slate-400">
              Tocca per aprire →
            </span>
          </div>

          {/* Chapters Grid */}
          <div className="grid grid-cols-1 gap-4">
            {SKILL_MODULES.map((module, mIndex) => {
              const meta = CHAPTER_METADATA[module.id] || {
                icon: Terminal,
                tag: 'CAPITOLO',
                label: module.title,
                accentColor: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400'
              };
              const ChapterIcon = meta.icon;
              const stats = getModuleStats(module);

              return (
                <div
                  key={module.id}
                  onClick={() => {
                    sound.playTap();
                    setSelectedChapterId(module.id);
                  }}
                  className="cursor-pointer group relative rounded-2xl bg-surface border border-white/10 hover:border-emerald-500/50 p-5 transition-all duration-300 shadow-cyber-glass hover:shadow-neon-emerald"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    
                    {/* Chapter Icon & Info */}
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[#090D16] border border-white/15 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform text-emerald-400 shadow-sm">
                        <ChapterIcon className="w-6 h-6" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-slate-900 text-slate-300 border border-white/10 font-bold">
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
                              IN CORSO ({stats.completedCount}/{stats.totalNodes})
                            </span>
                          )}
                        </div>

                        <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                          {module.title}
                        </h3>

                        <p className="text-xs text-slate-400 mt-0.5 truncate max-w-md">
                          {module.certificationFocus}
                        </p>
                      </div>
                    </div>

                    {/* Stats & CTA */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-white/5">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] font-mono text-slate-400 block">
                          {stats.totalNodes} LEZIONI & LAB
                        </span>
                        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-emerald-400">
                          <span>+{stats.totalXp} XP</span>
                          <span className="text-slate-500">·</span>
                          <span className="text-indigo-400">+{stats.totalElo} ELO</span>
                        </div>
                      </div>

                      <div className="w-9 h-9 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-slate-400 group-hover:text-emerald-400 group-hover:border-emerald-500/40 group-hover:bg-emerald-950/30 transition-all">
                        <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>

                  </div>

                  {/* Module Progress Bar */}
                  <div className="w-full h-1.5 rounded-full bg-slate-800/80 overflow-hidden mt-4">
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
          <div className="relative w-full max-w-lg rounded-2xl bg-[#0B0F19] border border-white/15 p-5 sm:p-6 shadow-2xl space-y-4">
            
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-mono font-bold text-sm text-white">
                    {CHAPTER_TOOLS[activeCheatSheetModuleId].cheatSheetTitle}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Comandi ufficiali pronti per la copia
                  </span>
                </div>
              </div>

              <button
                onClick={() => setActiveCheatSheetModuleId(null)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                ✕
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
                    className="cursor-pointer group flex items-center justify-between gap-2 p-2.5 rounded-lg bg-[#050811] border border-white/10 hover:border-cyan-500/50 hover:bg-cyan-950/20 transition-all font-mono text-xs"
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

            <div className="flex justify-end pt-2">
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
