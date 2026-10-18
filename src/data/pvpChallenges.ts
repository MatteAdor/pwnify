import { PvPChallenge, PvPPlayer } from '../types';
import { shuffleArray } from '../utils/shuffle';

export const PVP_CHALLENGES: PvPChallenge[] = [
  // ==========================================
  // TIER 1: BEGINNER / SCRIPT KIDDIE (0 - 1199 ELO)
  // ==========================================
  {
    id: 'pvp_b1',
    tier: 'beginner',
    minElo: 0,
    question: 'Which Linux command displays the absolute path of the current working directory?',
    codeSnippet: '$ [COMMAND]\n/var/www/html/zeroDay_app',
    options: [
      { id: 'b1_1', text: 'pwd', isCorrect: true },
      { id: 'b1_2', text: 'cd', isCorrect: false },
      { id: 'b1_3', text: 'ls -d', isCorrect: false },
      { id: 'b1_4', text: 'whoami', isCorrect: false }
    ],
    timeLimitSec: 10
  },
  {
    id: 'pvp_b2',
    tier: 'beginner',
    minElo: 0,
    question: 'Which standard TCP port is utilized by the encrypted HTTPS protocol?',
    codeSnippet: 'CONNECT target.corp:[PORT] HTTP/1.1 (TLS 1.3)',
    options: [
      { id: 'b2_1', text: '443', isCorrect: true },
      { id: 'b2_2', text: '80', isCorrect: false },
      { id: 'b2_3', text: '8080', isCorrect: false },
      { id: 'b2_4', text: '22', isCorrect: false }
    ],
    timeLimitSec: 10
  },
  {
    id: 'pvp_b3',
    tier: 'beginner',
    minElo: 0,
    question: 'Which HTTP status code indicates that the requested resource was not found on the server?',
    codeSnippet: 'HTTP/1.1 [STATUS] Not Found\nContent-Length: 0',
    options: [
      { id: 'b3_1', text: '404', isCorrect: true },
      { id: 'b3_2', text: '200', isCorrect: false },
      { id: 'b3_3', text: '500', isCorrect: false },
      { id: 'b3_4', text: '403', isCorrect: false }
    ],
    timeLimitSec: 10
  },
  {
    id: 'pvp_b4',
    tier: 'beginner',
    minElo: 0,
    question: 'Which standard port is assigned to SSH (Secure Shell) for secure remote system administration?',
    codeSnippet: '$ ssh operator@192.168.1.50 -p [PORT]',
    options: [
      { id: 'b4_1', text: '22', isCorrect: true },
      { id: 'b4_2', text: '21', isCorrect: false },
      { id: 'b4_3', text: '23', isCorrect: false },
      { id: 'b4_4', text: '25', isCorrect: false }
    ],
    timeLimitSec: 10
  },
  {
    id: 'pvp_b5',
    tier: 'beginner',
    minElo: 0,
    question: 'Which Linux command lists all files in a directory including hidden dotfiles (.bash_history)?',
    codeSnippet: '$ [COMMAND]\n.  ..  .bash_history  .env  main.py',
    options: [
      { id: 'b5_1', text: 'ls -la', isCorrect: true },
      { id: 'b5_2', text: 'dir -h', isCorrect: false },
      { id: 'b5_3', text: 'cat -a', isCorrect: false },
      { id: 'b5_4', text: 'show --hidden', isCorrect: false }
    ],
    timeLimitSec: 10
  },
  {
    id: 'pvp_b6',
    tier: 'beginner',
    minElo: 0,
    question: 'Which IPv4 address range is designated for private non-routable local networks (RFC 1918)?',
    codeSnippet: 'Private subnet for local LAN usage:',
    options: [
      { id: 'b6_1', text: '192.168.0.0/16', isCorrect: true },
      { id: 'b6_2', text: '8.8.8.0/24', isCorrect: false },
      { id: 'b6_3', text: '1.1.1.0/24', isCorrect: false },
      { id: 'b6_4', text: '208.67.222.0/24', isCorrect: false }
    ],
    timeLimitSec: 10
  },
  {
    id: 'pvp_b7',
    tier: 'beginner',
    minElo: 0,
    question: 'In the CIA Triad security model, which pillar guarantees that data has not been altered or tampered with?',
    codeSnippet: 'C (Confidentiality) - I ([???]) - A (Availability)',
    options: [
      { id: 'b7_1', text: 'Integrity', isCorrect: true },
      { id: 'b7_2', text: 'Identification', isCorrect: false },
      { id: 'b7_3', text: 'Isolation', isCorrect: false },
      { id: 'b7_4', text: 'Interception', isCorrect: false }
    ],
    timeLimitSec: 10
  },
  {
    id: 'pvp_b8',
    tier: 'beginner',
    minElo: 0,
    question: 'Which command-line utility tests network reachability to a remote host using ICMP Echo Request packets?',
    codeSnippet: '$ [UTILITY] 8.8.8.8\n64 bytes from 8.8.8.8: icmp_seq=1 ttl=118 time=14.2 ms',
    options: [
      { id: 'b8_1', text: 'ping', isCorrect: true },
      { id: 'b8_2', text: 'traceroute', isCorrect: false },
      { id: 'b8_3', text: 'netstat', isCorrect: false },
      { id: 'b8_4', text: 'curl', isCorrect: false }
    ],
    timeLimitSec: 10
  },
  {
    id: 'pvp_b9',
    tier: 'beginner',
    minElo: 0,
    question: 'Which Social Engineering attack targets a specific executive or individual with highly customized emails?',
    codeSnippet: 'Target: Corporate CFO · Subject: "Urgent vendor wire transfer authorization"',
    options: [
      { id: 'b9_1', text: 'Spear Phishing (or Whaling)', isCorrect: true },
      { id: 'b9_2', text: 'Volumetric DDoS', isCorrect: false },
      { id: 'b9_3', text: 'Passive Port Scanning', isCorrect: false },
      { id: 'b9_4', text: 'SYN Flooding', isCorrect: false }
    ],
    timeLimitSec: 10
  },
  {
    id: 'pvp_b10',
    tier: 'beginner',
    minElo: 0,
    question: 'Which Linux command modifies file permissions to grant read, write, and execute permissions to the owner (rwx)?',
    codeSnippet: '$ [COMMAND] 700 /home/operator/exploit.sh',
    options: [
      { id: 'b10_1', text: 'chmod', isCorrect: true },
      { id: 'b10_2', text: 'chown', isCorrect: false },
      { id: 'b10_3', text: 'ps aux', isCorrect: false },
      { id: 'b10_4', text: 'passwd', isCorrect: false }
    ],
    timeLimitSec: 10
  },
  {
    id: 'pvp_b11',
    tier: 'beginner',
    minElo: 0,
    question: 'Which protocol resolves human-friendly domain names (e.g. google.com) into numerical IP addresses (UDP 53)?',
    codeSnippet: 'Query: zeroday.gg -> 104.21.48.12',
    options: [
      { id: 'b11_1', text: 'DNS (Domain Name System)', isCorrect: true },
      { id: 'b11_2', text: 'DHCP', isCorrect: false },
      { id: 'b11_3', text: 'FTP', isCorrect: false },
      { id: 'b11_4', text: 'SNMP', isCorrect: false }
    ],
    timeLimitSec: 10
  },
  {
    id: 'pvp_b12',
    tier: 'beginner',
    minElo: 0,
    question: 'Which Linux command prints the effective username of the currently active terminal session?',
    codeSnippet: '$ [COMMAND]\nroot',
    options: [
      { id: 'b12_1', text: 'whoami', isCorrect: true },
      { id: 'b12_2', text: 'hostname', isCorrect: false },
      { id: 'b12_3', text: 'uname -a', isCorrect: false },
      { id: 'b12_4', text: 'uptime', isCorrect: false }
    ],
    timeLimitSec: 10
  },

  // ==========================================
  // TIER 2: INTERMEDIATE / RED TEAMER (1200 - 1599 ELO)
  // ==========================================
  {
    id: 'pvp_m1',
    tier: 'intermediate',
    minElo: 1200,
    question: 'Which Nmap flag executes a stealth TCP SYN scan without completing the full 3-way handshake?',
    codeSnippet: '$ nmap [FLAG] -p 1-65535 10.10.10.24',
    options: [
      { id: 'm1_1', text: '-sS', isCorrect: true },
      { id: 'm1_2', text: '-sT', isCorrect: false },
      { id: 'm1_3', text: '-sU', isCorrect: false },
      { id: 'm1_4', text: '-sA', isCorrect: false }
    ],
    timeLimitSec: 10
  },
  {
    id: 'pvp_m2',
    tier: 'intermediate',
    minElo: 1200,
    question: 'Which HTTP response header mitigates Clickjacking attacks by prohibiting rendering inside an iframe?',
    codeSnippet: 'HTTP/1.1 200 OK\n[SECURITY-HEADER]: DENY\nContent-Type: text/html',
    options: [
      { id: 'm2_1', text: 'X-Frame-Options', isCorrect: true },
      { id: 'm2_2', text: 'X-XSS-Protection', isCorrect: false },
      { id: 'm2_3', text: 'Strict-Transport-Security', isCorrect: false },
      { id: 'm2_4', text: 'Access-Control-Allow-Origin', isCorrect: false }
    ],
    timeLimitSec: 10
  },
  {
    id: 'pvp_m3',
    tier: 'intermediate',
    minElo: 1200,
    question: 'Which sequence of packets completes the TCP Three-Way Handshake to establish a reliable connection?',
    codeSnippet: 'Client -> Server -> Client',
    options: [
      { id: 'm3_1', text: 'SYN -> SYN-ACK -> ACK', isCorrect: true },
      { id: 'm3_2', text: 'SYN -> ACK -> SYN-ACK', isCorrect: false },
      { id: 'm3_3', text: 'FIN -> ACK -> FIN-ACK', isCorrect: false },
      { id: 'm3_4', text: 'RST -> SYN -> ACK', isCorrect: false }
    ],
    timeLimitSec: 10
  },
  {
    id: 'pvp_m4',
    tier: 'intermediate',
    minElo: 1200,
    question: 'Which special Linux permission allows a non-root user to execute a binary with the permissions of its owner?',
    codeSnippet: '-rwsr-xr-x 1 root root 88240 /usr/bin/passwd',
    options: [
      { id: 'm4_1', text: 'SUID Bit (Set User ID)', isCorrect: true },
      { id: 'm4_2', text: 'SGID Bit (Set Group ID)', isCorrect: false },
      { id: 'm4_3', text: 'Sticky Bit', isCorrect: false },
      { id: 'm4_4', text: 'Immutable Attribute (+i)', isCorrect: false }
    ],
    timeLimitSec: 10
  },
  {
    id: 'pvp_m5',
    tier: 'intermediate',
    minElo: 1200,
    question: 'During a local LAN Man-in-the-Middle attack, which protocol cache is poisoned to map the router IP to the attacker MAC?',
    codeSnippet: 'Gratuitous [PROTOCOL] Reply: 192.168.1.1 is-at 00:0c:29:4f:8e:12',
    options: [
      { id: 'm5_1', text: 'ARP (Address Resolution Protocol)', isCorrect: true },
      { id: 'm5_2', text: 'BGP (Border Gateway Protocol)', isCorrect: false },
      { id: 'm5_3', text: 'DNS (Domain Name System)', isCorrect: false },
      { id: 'm5_4', text: 'ICMP Redirect', isCorrect: false }
    ],
    timeLimitSec: 10
  },
  {
    id: 'pvp_m6',
    tier: 'intermediate',
    minElo: 1200,
    question: 'Which injection payload comments out remainder clauses in a vulnerable SQL query?',
    codeSnippet: 'SELECT * FROM users WHERE user=\'admin\' [PAYLOAD]',
    options: [
      { id: 'm6_1', text: '\' OR 1=1 -- -', isCorrect: true },
      { id: 'm6_2', text: '<script>alert(1)</script>', isCorrect: false },
      { id: 'm6_3', text: '../../../../etc/shadow', isCorrect: false },
      { id: 'm6_4', text: '; system("id");', isCorrect: false }
    ],
    timeLimitSec: 10
  },
  {
    id: 'pvp_m7',
    tier: 'intermediate',
    minElo: 1200,
    question: 'How many period-separated parts comprise a standard JSON Web Token (JWT) structure?',
    codeSnippet: 'eyJhbGci... . eyJzdWIi... . SflKxwRJ...',
    options: [
      { id: 'm7_1', text: '3 parts: Header, Payload, Signature', isCorrect: true },
      { id: 'm7_2', text: '2 parts: Payload, Hash', isCorrect: false },
      { id: 'm7_3', text: '4 parts: Header, Body, IV, Key', isCorrect: false },
      { id: 'm7_4', text: '1 AES-CBC encrypted block', isCorrect: false }
    ],
    timeLimitSec: 10
  },
  {
    id: 'pvp_m8',
    tier: 'intermediate',
    minElo: 1200,
    question: 'Which cookie attribute prevents client-side JavaScript scripts from accessing the cookie via `document.cookie`?',
    codeSnippet: 'Set-Cookie: session_id=0x98AF; Secure; [FLAG]',
    options: [
      { id: 'm8_1', text: 'HttpOnly', isCorrect: true },
      { id: 'm8_2', text: 'SameSite=None', isCorrect: false },
      { id: 'm8_3', text: 'Domain=.corp.internal', isCorrect: false },
      { id: 'm8_4', text: 'Max-Age=3600', isCorrect: false }
    ],
    timeLimitSec: 10
  },
  {
    id: 'pvp_m9',
    tier: 'intermediate',
    minElo: 1200,
    question: 'Which Linux kernel feature mitigates SYN Flood attacks by encoding cryptographic tokens into the Initial Sequence Number (ISN)?',
    codeSnippet: 'sysctl -w net.ipv4.tcp_syncookies = 1',
    options: [
      { id: 'm9_1', text: 'Cryptographic SYN Cookies in Initial Sequence Number (ISN)', isCorrect: true },
      { id: 'm9_2', text: 'TCP Window Scaling', isCorrect: false },
      { id: 'm9_3', text: 'Selective Acknowledgment (SACK)', isCorrect: false },
      { id: 'm9_4', text: 'Jumbo Frames at 9000 MTU', isCorrect: false }
    ],
    timeLimitSec: 10
  },
  {
    id: 'pvp_m10',
    tier: 'intermediate',
    minElo: 1200,
    question: 'In a Reverse Shell connection, which entity actively initiates the outbound network connection?',
    codeSnippet: 'Target Machine -> Attacker Listening Port',
    options: [
      { id: 'm10_1', text: 'The compromised target machine initiates outbound connection to the attacker listener', isCorrect: true },
      { id: 'm10_2', text: 'The attacker connects directly to an open port on the target firewall', isCorrect: false },
      { id: 'm10_3', text: 'The default gateway router triggers an ICMP redirection', isCorrect: false },
      { id: 'm10_4', text: 'An intermediate DNS resolver forwards shell packets', isCorrect: false }
    ],
    timeLimitSec: 10
  },
  {
    id: 'pvp_m11',
    tier: 'intermediate',
    minElo: 1200,
    question: 'Which Directory Traversal payload climbs the folder hierarchy to inspect the local Linux user account file?',
    codeSnippet: 'GET /download.php?file=[PAYLOAD]',
    options: [
      { id: 'm11_1', text: '../../../../etc/passwd', isCorrect: true },
      { id: 'm11_2', text: '/proc/cpuinfo', isCorrect: false },
      { id: 'm11_3', text: 'C:\\Windows\\System32\\cmd.exe', isCorrect: false },
      { id: 'm11_4', text: '\' UNION SELECT NULL--', isCorrect: false }
    ],
    timeLimitSec: 10
  },
  {
    id: 'pvp_m12',
    tier: 'intermediate',
    minElo: 1200,
    question: 'Which Wireshark / TShark display filter isolates outgoing HTTP POST requests to remote servers?',
    codeSnippet: 'Packet capture display filter:',
    options: [
      { id: 'm12_1', text: 'http.request.method == "POST"', isCorrect: true },
      { id: 'm12_2', text: 'tcp.port == 80 && ip.post', isCorrect: false },
      { id: 'm12_3', text: 'filter: http_post_only', isCorrect: false },
      { id: 'm12_4', text: 'ssl.handshake.type == 1', isCorrect: false }
    ],
    timeLimitSec: 10
  },

  // ==========================================
  // TIER 3: ADVANCED / APT OPERATOR (1600+ ELO)
  // ==========================================
  {
    id: 'pvp_a1',
    tier: 'advanced',
    minElo: 1600,
    question: 'In x86_64 CPU architecture, which register stores the memory address of the next instruction to execute?',
    codeSnippet: 'RIP (Instruction Pointer) vs RSP (Stack Pointer) vs RBP (Base Pointer)',
    options: [
      { id: 'a1_1', text: 'RIP (Instruction Pointer)', isCorrect: true },
      { id: 'a1_2', text: 'RSP (Stack Pointer)', isCorrect: false },
      { id: 'a1_3', text: 'RAX (Accumulator)', isCorrect: false },
      { id: 'a1_4', text: 'RDI (Destination Index)', isCorrect: false }
    ],
    timeLimitSec: 10
  },
  {
    id: 'pvp_a2',
    tier: 'advanced',
    minElo: 1600,
    question: 'In RSA asymmetric public-key cryptography, which mathematical problem underpins the one-way trapdoor security?',
    codeSnippet: 'C = (M ^ e) mod n · Find d such that (e * d) ≡ 1 (mod φ(n))',
    options: [
      { id: 'a2_1', text: 'Computational difficulty of prime factorization for large semi-prime moduli', isCorrect: true },
      { id: 'a2_2', text: 'Calculating natural logarithms in base e', isCorrect: false },
      { id: 'a2_3', text: '256-bit XOR matrix computation', isCorrect: false },
      { id: 'a2_4', text: 'Non-commutative matrix multiplication', isCorrect: false }
    ],
    timeLimitSec: 12
  },
  {
    id: 'pvp_a3',
    tier: 'advanced',
    minElo: 1600,
    question: 'Which AWS EC2 link-local address is targeted via SSRF to exfiltrate temporary IAM role tokens from IMDSv1?',
    codeSnippet: 'POST /fetch?url=http://[IP_METADATA]/latest/meta-data/iam/security-credentials/',
    options: [
      { id: 'a3_1', text: '169.254.169.254', isCorrect: true },
      { id: 'a3_2', text: '127.0.0.1', isCorrect: false },
      { id: 'a3_3', text: '192.168.1.254', isCorrect: false },
      { id: 'a3_4', text: '10.0.0.1', isCorrect: false }
    ],
    timeLimitSec: 10
  },
  {
    id: 'pvp_a4',
    tier: 'advanced',
    minElo: 1600,
    question: 'Which modern OS security mitigation randomizes the virtual memory addresses of Stack, Heap, and shared libraries?',
    codeSnippet: 'Kernel Security Mitigation: Randomized Virtual Address Space',
    options: [
      { id: 'a4_1', text: 'ASLR (Address Space Layout Randomization)', isCorrect: true },
      { id: 'a4_2', text: 'DEP / NX (Data Execution Prevention)', isCorrect: false },
      { id: 'a4_3', text: 'Stack Canaries (Guard Pages)', isCorrect: false },
      { id: 'a4_4', text: 'SafeSEH', isCorrect: false }
    ],
    timeLimitSec: 10
  },
  {
    id: 'pvp_a5',
    tier: 'advanced',
    minElo: 1600,
    question: 'In Return-Oriented Programming (ROP), what constitutes a "Gadget"?',
    codeSnippet: '0x000000000040115e: pop rdi ; ret',
    options: [
      { id: 'a5_1', text: 'A short sequence of machine instructions ending with RET located in executable memory', isCorrect: true },
      { id: 'a5_2', text: 'Shellcode injected directly into an RWX stack frame', isCorrect: false },
      { id: 'a5_3', text: 'A kernel syscall invoked via int 0x80', isCorrect: false },
      { id: 'a5_4', text: 'A polymorphic encryption stub', isCorrect: false }
    ],
    timeLimitSec: 12
  },
  {
    id: 'pvp_a6',
    tier: 'advanced',
    minElo: 1600,
    question: 'Which race condition vulnerability occurs when authorization validation precedes resource consumption without an atomic lock?',
    codeSnippet: 'if (access(file, W_OK) == 0) { fd = open(file, O_WRONLY); }',
    options: [
      { id: 'a6_1', text: 'TOCTOU (Time-of-Check to Time-of-Use Race Condition)', isCorrect: true },
      { id: 'a6_2', text: 'Use-After-Free (UAF)', isCorrect: false },
      { id: 'a6_3', text: 'Double Free', isCorrect: false },
      { id: 'a6_4', text: 'Out-of-Bounds Write', isCorrect: false }
    ],
    timeLimitSec: 12
  },
  {
    id: 'pvp_a7',
    tier: 'advanced',
    minElo: 1600,
    question: 'Which standard Linux binary listed on GTFOBins enables root command execution when configured with the SUID bit?',
    codeSnippet: '$ find . -exec /bin/sh -p \\; -quit',
    options: [
      { id: 'a7_1', text: '/usr/bin/find', isCorrect: true },
      { id: 'a7_2', text: '/usr/bin/ping', isCorrect: false },
      { id: 'a7_3', text: '/usr/bin/uptime', isCorrect: false },
      { id: 'a7_4', text: '/usr/bin/wc', isCorrect: false }
    ],
    timeLimitSec: 10
  },
  {
    id: 'pvp_a8',
    tier: 'advanced',
    minElo: 1600,
    question: 'Which cryptographic oracle attack exploits differing padding error messages under PKCS#7 in AES-CBC mode?',
    codeSnippet: 'Decryption Error: Invalid Padding vs Decryption OK',
    options: [
      { id: 'a8_1', text: 'Padding Oracle Attack', isCorrect: true },
      { id: 'a8_2', text: 'Meet-in-the-Middle Attack', isCorrect: false },
      { id: 'a8_3', text: 'Length Extension Attack', isCorrect: false },
      { id: 'a8_4', text: 'Birthday Collision Attack', isCorrect: false }
    ],
    timeLimitSec: 12
  },
  {
    id: 'pvp_a9',
    tier: 'advanced',
    minElo: 1600,
    question: 'Which lateral movement technique forwards captured NTLMv2 SMB authentication to a secondary server lacking SMB Signing?',
    codeSnippet: 'Victim -> MitM Responder -> Target Server (psexec/impacket)',
    options: [
      { id: 'a9_1', text: 'SMB Relay Attack', isCorrect: true },
      { id: 'a9_2', text: 'Kerberoasting', isCorrect: false },
      { id: 'a9_3', text: 'Pass-the-Ticket (Golden Ticket)', isCorrect: false },
      { id: 'a9_4', text: 'AS-REP Roasting', isCorrect: false }
    ],
    timeLimitSec: 12
  },
  {
    id: 'pvp_a10',
    tier: 'advanced',
    minElo: 1600,
    question: 'Which inter-domain routing protocol is vulnerable to malicious route announcements (AS Path Poisoning) to hijack global traffic?',
    codeSnippet: 'BGP Autonomous System (AS) Path Hijacking',
    options: [
      { id: 'a10_1', text: 'BGP (Border Gateway Protocol)', isCorrect: true },
      { id: 'a10_2', text: 'OSPF (Open Shortest Path First)', isCorrect: false },
      { id: 'a10_3', text: 'RIPv2', isCorrect: false },
      { id: 'a10_4', text: 'EIGRP', isCorrect: false }
    ],
    timeLimitSec: 12
  }
];

export const SMART_BOTS: PvPPlayer[] = [
  {
    id: 'bot_spectre',
    name: '0x_Spectre',
    avatar: 'SP',
    elo: 1040,
    rank: 'Script Kiddie',
    winStreak: 2,
    isBot: true
  },
  {
    id: 'bot_null',
    name: 'null_ptr_exception',
    avatar: 'NP',
    elo: 1275,
    rank: 'Red Teamer',
    winStreak: 4,
    isBot: true
  },
  {
    id: 'bot_kernel',
    name: 'Kernel_Pan1c',
    avatar: 'KP',
    elo: 1390,
    rank: 'Red Teamer',
    winStreak: 3,
    isBot: true
  },
  {
    id: 'bot_cipher',
    name: 'Gh0st_APT',
    avatar: 'GH',
    elo: 1680,
    rank: 'APT Operator',
    winStreak: 6,
    isBot: true
  },
  {
    id: 'bot_zero',
    name: '0xDAY_Striker',
    avatar: 'ZD',
    elo: 2040,
    rank: 'ZeroDay Hunter',
    winStreak: 8,
    isBot: true
  }
];

/**
 * Dynamic match question generator calibrated to user ELO.
 * Samples distinct challenges across relevant skill tiers and applies
 * a full Fisher-Yates shuffle to each challenge's options.
 */
export function generatePvPMatchChallenges(userElo: number, count = 5): PvPChallenge[] {
  const beginners = PVP_CHALLENGES.filter(c => c.tier === 'beginner');
  const intermediates = PVP_CHALLENGES.filter(c => c.tier === 'intermediate');
  const advanceds = PVP_CHALLENGES.filter(c => c.tier === 'advanced');

  let selected: PvPChallenge[] = [];

  if (userElo < 1200) {
    // Beginner bracket: 4 beginner + 1 intermediate
    const shuffledBeg = shuffleArray(beginners);
    const shuffledInt = shuffleArray(intermediates);
    selected = [...shuffledBeg.slice(0, 4), ...shuffledInt.slice(0, 1)];
  } else if (userElo < 1600) {
    // Intermediate bracket: 1 beginner + 3 intermediate + 1 advanced
    const shuffledBeg = shuffleArray(beginners);
    const shuffledInt = shuffleArray(intermediates);
    const shuffledAdv = shuffleArray(advanceds);
    selected = [
      ...shuffledBeg.slice(0, 1),
      ...shuffledInt.slice(0, 3),
      ...shuffledAdv.slice(0, 1)
    ];
  } else {
    // Advanced bracket: 1 intermediate + 4 advanced
    const shuffledInt = shuffleArray(intermediates);
    const shuffledAdv = shuffleArray(advanceds);
    selected = [...shuffledInt.slice(0, 1), ...shuffledAdv.slice(0, 4)];
  }

  // Fallback if somehow count is not met
  if (selected.length < count) {
    const remaining = shuffleArray(PVP_CHALLENGES).filter(c => !selected.some(s => s.id === c.id));
    selected = [...selected, ...remaining.slice(0, count - selected.length)];
  }

  // Final shuffle of the questions themselves, and Fisher-Yates shuffle of each question's options
  return shuffleArray(selected).slice(0, count).map(q => ({
    ...q,
    options: shuffleArray(q.options)
  }));
}
