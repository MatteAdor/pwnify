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
    question: 'Quale comando Linux visualizza il percorso assoluto della directory di lavoro corrente?',
    codeSnippet: '$ [COMANDO]\n/var/www/html/zeroDay_app',
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
    question: 'Quale porta TCP standard è utilizzata dal protocollo HTTPS crittografato?',
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
    question: 'Quale codice di stato HTTP indica che la risorsa richiesta non è stata trovata sul server?',
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
    question: 'Quale porta standard è assegnata al servizio SSH (Secure Shell) per l\'amministrazione remota sicura?',
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
    question: 'Quale comando Linux elenca tutti i file di una directory inclusi i file nascosti (dotfiles)?',
    codeSnippet: '$ [COMANDO]\n.  ..  .bash_history  .env  main.py',
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
    question: 'Quale range di indirizzi IPv4 appartiene alle reti private non instradabili su Internet (RFC 1918)?',
    codeSnippet: 'Subnet privata ad uso locale LAN:',
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
    question: 'Nel modello di sicurezza CIA Triad, quale pilastro garantisce che i dati non vengano alterati o manomessi?',
    codeSnippet: 'C (Confidentiality) - I ([???]) - A (Availability)',
    options: [
      { id: 'b7_1', text: 'Integrity (Integrità)', isCorrect: true },
      { id: 'b7_2', text: 'Identification (Identificazione)', isCorrect: false },
      { id: 'b7_3', text: 'Isolation (Isolamento)', isCorrect: false },
      { id: 'b7_4', text: 'Interception (Intercettazione)', isCorrect: false }
    ],
    timeLimitSec: 10
  },
  {
    id: 'pvp_b8',
    tier: 'beginner',
    minElo: 0,
    question: 'Quale utility a riga di comando verifica la raggiungibilità di rete di un host remoto tramite pacchetti ICMP Echo Request?',
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
    question: 'Quale attacco di Social Engineering prende di mira un individuo o dirigente specifico con email personalizzate credibili?',
    codeSnippet: 'Target: CFO dell\'azienda · Oggetto: "Fattura urgente da autorizzare"',
    options: [
      { id: 'b9_1', text: 'Spear Phishing (o Whaling)', isCorrect: true },
      { id: 'b9_2', text: 'DDoS Volumetrico', isCorrect: false },
      { id: 'b9_3', text: 'Port Scanning passivo', isCorrect: false },
      { id: 'b9_4', text: 'SYN Flooding', isCorrect: false }
    ],
    timeLimitSec: 10
  },
  {
    id: 'pvp_b10',
    tier: 'beginner',
    minElo: 0,
    question: 'Quale comando Linux cambia i permessi di un file impostando lettura, scrittura ed esecuzione per il proprietario (rwx)?',
    codeSnippet: '$ [COMANDO] 700 /home/operator/exploit.sh',
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
    question: 'Quale protocollo risolve i nomi a dominio (es. google.com) nei rispettivi indirizzi IP numerici (porta UDP 53)?',
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
    question: 'Quale comando Linux stampa l\'identità dell\'utente attualmente connesso nella sessione corrente?',
    codeSnippet: '$ [COMANDO]\nroot',
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
    question: 'Quale comando Nmap esegue una scansione TCP SYN stealth senza completare l\'handshake a 3 vie?',
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
    question: 'Quale header HTTP protegge da attacchi Clickjacking impedendo il rendering all\'interno di iframe?',
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
    question: 'Quale sequenza di pacchetti completa il Three-Way Handshake per stabilire una connessione TCP affidabile?',
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
    question: 'Quale permesso speciale Linux consente a un utente non-root di eseguire un file con i privilegi del proprietario?',
    codeSnippet: '-rwsr-xr-x 1 root root 88240 /usr/bin/passwd',
    options: [
      { id: 'm4_1', text: 'Bit SUID (Set User ID)', isCorrect: true },
      { id: 'm4_2', text: 'Bit SGID (Set Group ID)', isCorrect: false },
      { id: 'm4_3', text: 'Sticky Bit', isCorrect: false },
      { id: 'm4_4', text: 'Immutable Attribute (+i)', isCorrect: false }
    ],
    timeLimitSec: 10
  },
  {
    id: 'pvp_m5',
    tier: 'intermediate',
    minElo: 1200,
    question: 'Durante un attacco Man-in-the-Middle sulla LAN, quale protocollo viene avvelenato per legare l\'IP gateway al MAC dell\'attaccante?',
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
    question: 'Quale payload di injection provoca un comment-out dei controlli successivi in una query MySQL/PostgreSQL?',
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
    question: 'In un token JWT (JSON Web Token), quante parti separate da punti formano la struttura standard?',
    codeSnippet: 'eyJhbGci... . eyJzdWIi... . SflKxwRJ...',
    options: [
      { id: 'm7_1', text: '3 parti: Header, Payload, Signature', isCorrect: true },
      { id: 'm7_2', text: '2 parti: Payload, Hash', isCorrect: false },
      { id: 'm7_3', text: '4 parti: Header, Body, IV, Key', isCorrect: false },
      { id: 'm7_4', text: '1 blocco cifrato AES-CBC', isCorrect: false }
    ],
    timeLimitSec: 10
  },
  {
    id: 'pvp_m8',
    tier: 'intermediate',
    minElo: 1200,
    question: 'Quale flag del cookie impedisce l\'accesso al valore del cookie tramite script JavaScript lato client (`document.cookie`)?',
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
    question: 'Quale parametro del kernel Linux garantisce la difesa contro attacchi SYN Flood generando token nel Sequence Number?',
    codeSnippet: 'sysctl -w net.ipv4.tcp_syncookies = 1',
    options: [
      { id: 'm9_1', text: 'SYN Cookies crittografici nel Sequence Number iniziale (ISN)', isCorrect: true },
      { id: 'm9_2', text: 'TCP Window Scaling', isCorrect: false },
      { id: 'm9_3', text: 'Selective Acknowledgment (SACK)', isCorrect: false },
      { id: 'm9_4', text: 'Jumbo Frames a 9000 MTU', isCorrect: false }
    ],
    timeLimitSec: 10
  },
  {
    id: 'pvp_m10',
    tier: 'intermediate',
    minElo: 1200,
    question: 'In una connessione Reverse Shell, quale entità avvia attivamente la connessione di rete?',
    codeSnippet: 'Target Machine -> Attacker Listening Port',
    options: [
      { id: 'm10_1', text: 'Il target compromesso avvia la connessione verso l\'ascoltatore dell\'attaccante', isCorrect: true },
      { id: 'm10_2', text: 'L\'attaccante si connette direttamente a una porta aperta sul firewall del target', isCorrect: false },
      { id: 'm10_3', text: 'Il router gateway esegue una redirezione ICMP', isCorrect: false },
      { id: 'm10_4', text: 'Un server DNS intermedio instrada i pacchetti di shell', isCorrect: false }
    ],
    timeLimitSec: 10
  },
  {
    id: 'pvp_m11',
    tier: 'intermediate',
    minElo: 1200,
    question: 'Quale payload di Directory Traversal permette di risalire l\'albero delle cartelle per leggere il database locale degli account Linux?',
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
    question: 'Quale comando Wireshark / TShark filtra esclusivamente il traffico HTTP con metodo POST verso server remoti?',
    codeSnippet: 'Filtro di visualizzazione pacchetti:',
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
    question: 'In architettura x86_64, quale registro CPU memorizza l\'indirizzo della prossima istruzione da eseguire?',
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
    question: 'In crittografia asimmetrica RSA, quale problema matematico garantisce la sicurezza della funzione botola?',
    codeSnippet: 'C = (M ^ e) mod n · Trovare d tale che (e * d) ≡ 1 (mod φ(n))',
    options: [
      { id: 'a2_1', text: 'La complessità di fattorizzazione del prodotto di numeri primi elevati', isCorrect: true },
      { id: 'a2_2', text: 'Il calcolo del logaritmo in base e', isCorrect: false },
      { id: 'a2_3', text: 'La computazione di XOR a 256 bit', isCorrect: false },
      { id: 'a2_4', text: 'La moltiplicazione matriciale non commutativa', isCorrect: false }
    ],
    timeLimitSec: 12
  },
  {
    id: 'pvp_a3',
    tier: 'advanced',
    minElo: 1600,
    question: 'Quale indirizzo link-local AWS EC2 viene bersagliato tramite SSRF per estrarre chiavi IAM temporanee da IMDSv1?',
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
    question: 'Quale mitigazione moderna del sistema operativo randomizza le posizioni di Stack, Heap e Librerie in memoria?',
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
    question: 'Nella tecnica ROP (Return-Oriented Programming), cosa rappresenta un "Gadget"?',
    codeSnippet: '0x000000000040115e: pop rdi ; ret',
    options: [
      { id: 'a5_1', text: 'Una sequenza breve di istruzioni terminante con RET situata in codice già eseguibile', isCorrect: true },
      { id: 'a5_2', text: 'Uno shellcode iniettato nello stack con permessi RWX', isCorrect: false },
      { id: 'a5_3', text: 'Una funzione del kernel richiamata tramite int 0x80', isCorrect: false },
      { id: 'a5_4', text: 'Un payload di crittografia polimorfica', isCorrect: false }
    ],
    timeLimitSec: 12
  },
  {
    id: 'pvp_a6',
    tier: 'advanced',
    minElo: 1600,
    question: 'Quale tipo di vulnerabilità temporale si verifica quando il controllo di autorizzazione precede l\'operazione senza lock atomico?',
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
    question: 'Quale binario standard Linux catalogato su GTFOBins consente l\'esecuzione diretta di comandi root quando configurato con SUID?',
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
    question: 'Quale attacco crittografico sfrutta messaggi di errore differenziati sul padding PKCS#7 in modalità AES-CBC?',
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
    question: 'Quale tecnica di lateral movement inoltra una sessione di autenticazione NTLMv2 catturata via SMB verso un secondo host privo di SMB Signing?',
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
    question: 'Quale protocollo di routing inter-dominio può essere alterato tramite annunci BGP malevoli (AS Path Poisoning) per intercettare traffico globale?',
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
    avatar: '👾',
    elo: 1040,
    rank: 'Script Kiddie',
    winStreak: 2,
    isBot: true
  },
  {
    id: 'bot_null',
    name: 'null_ptr_exception',
    avatar: '💀',
    elo: 1275,
    rank: 'Red Teamer',
    winStreak: 4,
    isBot: true
  },
  {
    id: 'bot_kernel',
    name: 'Kernel_Pan1c',
    avatar: '⚡',
    elo: 1390,
    rank: 'Red Teamer',
    winStreak: 3,
    isBot: true
  },
  {
    id: 'bot_cipher',
    name: 'Gh0st_APT',
    avatar: '🕶️',
    elo: 1680,
    rank: 'APT Operator',
    winStreak: 6,
    isBot: true
  },
  {
    id: 'bot_zero',
    name: '0xDAY_Striker',
    avatar: '🎯',
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
