import React, { useState } from 'react';
import { SKILL_MODULES } from '../../data/curriculum';
import { SkillModule, SkillNode, UserState } from '../../types';
import { sound } from '../../utils/soundEngine';
import { useLanguage } from '../../utils/language';
import { 
  Terminal, Globe, Key, Shield, Server, Network, Cpu, Lock, 
  ArrowLeft, Check, Sparkles, AlertTriangle, Zap, Clock, 
  BookOpen, ChevronRight, Copy, ChevronDown, Award
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
      '# Memory Dump Tool: Estrazione hash NTLM da processo LSASS',
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
    <div className="w-full max-w-xl mx-auto px-3.5 sm:px-4 py-4 pb-28 space-y-5 animate-fade-in font-sans">
      
      {/* ========================================================================= */}
      {/* VIEW A: MISSION DRILL-DOWN (LIST OF 6 LESSONS INSIDE CLICKED MISSION)     */}
      {/* ========================================================================= */}
      {activeModule ? (
        <div className="space-y-4 animate-fade-in">
          {/* Back to Missions Button */}
          <button
            onClick={() => {
              sound.playTap();
              setSelectedModuleId(null);
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white font-mono text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
            <span>{t.backToMissions}</span>
          </button>

          {/* Mission Header Card */}
          <div className="rounded-2xl bg-[#0D121D] border border-zinc-800 p-5 space-y-3 shadow-lg">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 font-bold uppercase tracking-wider">
                {activeModule.certificationFocus}
              </span>
              <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-emerald-400">
                <span>
                  {activeModule.nodes.filter(n => userState.completedNodeIds.includes(n.id)).length} / {activeModule.nodes.length} {t.completed}
                </span>
              </div>
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                {activeModule.title}
              </h1>
              <p className="text-xs text-zinc-400 mt-1">
                {t.missionsSubtitle}
              </p>
            </div>

            {/* Mission Progress Bar */}
            <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{
                  width: `${(activeModule.nodes.filter(n => userState.completedNodeIds.includes(n.id)).length / activeModule.nodes.length) * 100}%`
                }}
              />
            </div>
          </div>

          {/* List of 6 Lessons (5 Guided Explanations + 1 Final Test) */}
          <div className="space-y-2.5">
            {activeModule.nodes.map((node, index) => {
              const isCompleted = userState.completedNodeIds.includes(node.id);
              const isLocked = node.status === 'locked' && !userState.isPro;
              const isFinal = node.isFinalTest;

              return (
                <div
                  key={node.id}
                  onClick={() => {
                    sound.playTap();
                    onSelectNode(node);
                  }}
                  className={`group rounded-xl border p-4 transition-all duration-150 cursor-pointer ${
                    isFinal
                      ? isCompleted
                        ? 'bg-[#101726] border-emerald-500/50 hover:border-emerald-400'
                        : 'bg-[#151224] border-purple-500/40 hover:border-purple-400 shadow-md'
                      : isCompleted
                      ? 'bg-[#0E1420] border-emerald-500/30 hover:border-emerald-500/50'
                      : 'bg-[#0D121D] border-zinc-800 hover:border-zinc-700 hover:bg-[#121622]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      {/* Badge row: Lesson Index, Explanation / Final Test */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                          isFinal 
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' 
                            : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                        }`}>
                          {isFinal ? t.finalTestBadge : `${t.lessonWord} 0${index + 1}`}
                        </span>

                        {!isFinal && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase">
                            {t.explanationBadge}
                          </span>
                        )}

                        {isCompleted && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold flex items-center gap-1 border border-emerald-500/30">
                            <Check className="w-3 h-3 text-emerald-400" />
                            {t.completed}
                          </span>
                        )}
                      </div>

                      {/* Lesson Title */}
                      <h3 className={`font-mono font-bold text-sm truncate ${
                        isFinal ? 'text-purple-200 group-hover:text-white' : 'text-zinc-100 group-hover:text-emerald-300'
                      }`}>
                        {node.title}
                      </h3>

                      {/* Brief Explanation Preview or Subtitle */}
                      <p className="text-[11px] text-zinc-400 line-clamp-1">
                        {node.lessonExplanation?.keyTakeaway || node.subtitle}
                      </p>
                    </div>

                    {/* Right side: Rewards & Arrow Button */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <div className="text-[11px] font-mono font-bold text-emerald-400">
                        +{node.xpReward} XP
                      </div>
                      <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-emerald-400 group-hover:border-emerald-500/40 transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (

        /* ========================================================================= */
        /* VIEW B: MAIN MISSIONS CONTAINERS OVERVIEW (8 CORE MISSIONS)               */
        /* ========================================================================= */
        <>
          {/* 1. Header Banner: Compact, Solid, Professional */}
          <div className="rounded-2xl bg-[#0D121D] border border-zinc-800 p-5 space-y-3.5 shadow-lg">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 font-bold uppercase tracking-wider">
                {t.operationalRoadmap}
              </span>
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-zinc-400">READINESS:</span>
                <span className="text-emerald-400 font-bold text-sm">{userState.readinessScore}%</span>
              </div>
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                {t.missionsTitle}
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                {isEn 
                  ? '8 Field Missions · Minimum 5 to 10 guided lessons per mission + 1 final practical test.'
                  : '8 Missioni Tattiche · Da 5 a 10 lezioni guidate per missione + 1 test finale pratico.'}
              </p>
            </div>

            {/* Overall Progress */}
            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span>{t.missionProgress}</span>
                <span className="text-zinc-200 font-bold">
                  {completedMissionsCount} / {totalMissions} {t.completed}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.max((completedMissionsCount / totalMissions) * 100, 4)}%` 
                  }}
                />
              </div>
            </div>
          </div>

          {/* 2. Daily 0xBreach CVE Triage: Solid, Crisp, Breathable */}
          <div className="rounded-2xl bg-[#0F1420] border border-zinc-800 p-4 sm:p-5 space-y-3 shadow-md">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-rose-400 shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30">
                      DEFCON 1
                    </span>
                    <h2 className="text-sm font-bold text-white tracking-wide">
                      {t.dailyBreachTitle}
                    </h2>
                  </div>
                </div>
              </div>

              {/* 2X XP Pill Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  sound.playTap();
                  if (!userState.isPro) onOpenPaywall();
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-mono font-bold text-xs transition-all cursor-pointer ${
                  userState.isPro
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    : 'bg-zinc-800 text-amber-400 border-amber-500/30 hover:border-amber-400'
                }`}
                title={userState.isPro ? '2x XP Boost Active' : 'Unlock 2x XP with PRO'}
              >
                <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>2X XP {userState.isPro ? (isEn ? 'ACTIVE' : 'ATTIVO') : 'PRO'}</span>
              </button>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              {t.dailyBreachDesc}
            </p>

            <button
              onClick={() => {
                sound.playTap();
                if (onOpenDailyBreach) onOpenDailyBreach();
              }}
              className={`w-full py-2.5 px-4 rounded-xl font-mono font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isBreachSolvedToday
                  ? 'bg-zinc-800 border border-emerald-500/40 text-emerald-300 hover:bg-zinc-750'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black'
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

          {/* 3. The 8 Core Mission Containers */}
          <div className="space-y-3">
            <div className="px-1">
              <h2 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">
                {isEn ? `TACTICAL MISSION CONTAINERS (${SKILL_MODULES.length})` : `CONTENITORI MISSIONI TATTICHE (${SKILL_MODULES.length})`}
              </h2>
            </div>

            <div className="space-y-3">
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
                    className={`group rounded-xl border p-4 sm:p-5 transition-all duration-150 cursor-pointer ${
                      isAllCompleted
                        ? 'bg-[#0E1420] border-emerald-500/40 hover:border-emerald-400'
                        : 'bg-[#0D121D] border-zinc-800 hover:border-zinc-700 hover:bg-[#111624] shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Left: Icon, Number, Title, Subtitle */}
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 shrink-0 group-hover:border-zinc-700 transition-colors">
                          <IconComponent className="w-5 h-5" />
                        </div>

                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800 font-bold uppercase">
                              {isEn ? `MISSION 0${index + 1}` : `MISSIONE 0${index + 1}`}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-400 truncate">
                              {module.certificationFocus}
                            </span>
                          </div>

                          <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-tight group-hover:text-emerald-300 transition-colors truncate">
                            {module.title}
                          </h3>

                          {/* Lessons count indicator */}
                          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 pt-0.5">
                            <span>{completedCount} / {totalLessons} {t.lessonsCountWord}</span>
                            <span className="text-zinc-600">·</span>
                            <span className="text-zinc-400 text-[11px]">{t.guidedLessonsWord}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Status badge or Explore Button */}
                      <div className="flex flex-col items-end gap-2 shrink-0 pt-1">
                        {isAllCompleted ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-400" />
                            {t.completed}
                          </span>
                        ) : (
                          <div className="flex items-center gap-1 text-xs font-mono font-bold text-zinc-300 group-hover:text-emerald-400 transition-colors">
                            <span className="hidden xs:inline">{isEn ? 'Open' : 'Apri'}</span>
                            <ChevronRight className="w-4 h-4 text-emerald-400" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Mission Micro Progress Bar */}
                    <div className="w-full h-1 rounded-full bg-zinc-800 overflow-hidden mt-3">
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

          {/* 4. Tactical Reference Cheat Sheets Drawer */}
          <div className="rounded-xl bg-[#0D121D] border border-zinc-800 p-4 space-y-3">
            <button
              onClick={() => {
                sound.playTap();
                setShowToolsSection(!showToolsSection);
              }}
              className="w-full flex items-center justify-between text-left cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 group-hover:text-white">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-mono font-bold text-xs sm:text-sm text-zinc-200 group-hover:text-white">
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
              <div className="pt-2 border-t border-zinc-800 space-y-2.5 animate-fade-in">
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(CHAPTER_TOOLS).map(([key, data]) => (
                    <button
                      key={key}
                      onClick={() => {
                        sound.playTap();
                        setActiveToolKey(activeToolKey === key ? null : key);
                      }}
                      className={`px-2.5 py-1 rounded text-xs font-mono font-bold border transition-colors cursor-pointer ${
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
                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2 text-xs font-mono animate-fade-in">
                    <p className="text-emerald-400 font-bold">
                      {CHAPTER_TOOLS[activeToolKey].cheatSheetTitle}
                    </p>
                    <div className="space-y-1">
                      {CHAPTER_TOOLS[activeToolKey].cheatSheetCommands.map((cmd, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleCopyCommand(cmd, idx)}
                          className="p-1.5 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700 flex items-center justify-between text-zinc-300 hover:text-white cursor-pointer group"
                        >
                          <span className="truncate">{cmd}</span>
                          <span className="text-[10px] text-zinc-400 shrink-0 ml-2">
                            {copiedIndex === idx ? (isEn ? 'Copied!' : 'Copiato!') : (isEn ? 'Copy' : 'Copia')}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-zinc-400 pt-1 border-t border-zinc-800">
                      💡 {CHAPTER_TOOLS[activeToolKey].keyTakeaway}
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
