import { HardcoreQuestion } from '../types';
import { shuffleArray } from '../utils/shuffle';

export const BEGINNER_DIAGNOSTIC_QUESTIONS: HardcoreQuestion[] = [
  {
    id: 'diag_beg_1_terminal',
    title: 'Fondamenta Terminale: Navigazione & Shell',
    type: 'multiple_choice',
    domain: 'Linux & Bash',
    difficulty: 'Beginner',
    prompt: 'Nel terminale di comando (Linux/macOS), quale istruzione restituisce il percorso assoluto della cartella corrente (Current Working Directory)?',
    codeSnippet: 'user@zeroday-lab:~$ [COMANDO_SCONOSCIUTO]\n/home/user/workspace',
    options: [
      {
        id: 'b1_opt1',
        text: 'pwd (Print Working Directory)',
        isCorrect: true,
        explanation: 'Il comando pwd stampa a schermo il percorso completo della directory di lavoro corrente.'
      },
      {
        id: 'b1_opt2',
        text: 'ls (List files)',
        isCorrect: false,
        explanation: 'ls elenca i file e le cartelle presenti, ma non stampa il percorso corrente.'
      },
      {
        id: 'b1_opt3',
        text: 'cd (Change Directory)',
        isCorrect: false,
        explanation: 'cd serve per cambiare directory, non per stamparla.'
      },
      {
        id: 'b1_opt4',
        text: 'mkdir (Make Directory)',
        isCorrect: false,
        explanation: 'mkdir crea una nuova cartella nel filesystem.'
      }
    ],
    rootCauseBreakdown: {
      cveOrTopic: 'Principi Fondamentali della Shell Bash & POSIX',
      whyItWorks: 'Il terminale è l\'interfaccia primaria per qualsiasi operazione cyber offensiva o difensiva. Sapere dove ci si trova prima di eseguire script o payload previene errori critici sul sistema.',
      patchRecommendation: 'Memorizzare la triade fondamentale: pwd (dove sono), ls (cosa c\'è qui), cd (dove voglio andare).',
      terminalProof: '$ pwd\n/home/user/workspace'
    },
    xpReward: 30,
    eloReward: 15
  },
  {
    id: 'diag_beg_2_http',
    title: 'Architettura Web: Significato dei Codici di Stato HTTP',
    type: 'multiple_choice',
    domain: 'Web Sec',
    difficulty: 'Beginner',
    prompt: 'Durante la navigazione su un server Web, il browser riceve una risposta "HTTP 404 Not Found". Che cosa indica esattamente questo codice?',
    codeSnippet: 'GET /secret-admin-portal.php HTTP/1.1\nHost: target.corp\n\nHTTP/1.1 404 Not Found\nContent-Length: 0',
    options: [
      {
        id: 'b2_opt1',
        text: 'Il server ha compreso la richiesta, ma la risorsa o il file specificato non esiste in quell\'URI',
        isCorrect: true,
        explanation: 'La famiglia 4xx indica errori lato client; il 404 specifica che il file non è stato trovato sul server.'
      },
      {
        id: 'b2_opt2',
        text: 'Il server Web è crashato e non può elaborare alcuna richiesta fino al riavvio',
        isCorrect: false,
        explanation: 'I crash e i guasti interni del server sono identificati dalla famiglia 5xx (es. 500 Internal Server Error).'
      },
      {
        id: 'b2_opt3',
        text: 'La password inviata nel modulo di login è errata o l\'accesso è negato',
        isCorrect: false,
        explanation: 'La mancata autenticazione è indicata dal codice 401 Unauthorized o 403 Forbidden.'
      },
      {
        id: 'b2_opt4',
        text: 'La connessione crittografata HTTPS è scaduta a causa del certificato TLS',
        isCorrect: false,
        explanation: 'Gli errori di certificato impediscono il completamento dell\'handshake TLS prima ancora di trasmettere codici HTTP.'
      }
    ],
    rootCauseBreakdown: {
      cveOrTopic: 'Standard HTTP/1.1 RFC 9110 Status Codes',
      whyItWorks: 'Gli hacker e i pentester analizzano i codici HTTP (200, 301, 403, 404, 500) per mappare risorse nascoste ed endpoint vulnerabili durante la fase di ricognizione (Reconnaissance).',
      patchRecommendation: 'Configurare pagine 404 generiche personalizzate per evitare l\'information disclosure sulla versione del server (es. Apache/2.4.52).',
      terminalProof: '$ curl -I https://target.corp/test\nHTTP/1.1 404 Not Found'
    },
    xpReward: 30,
    eloReward: 15
  },
  {
    id: 'diag_beg_3_passwords',
    title: 'Sicurezza Dati: Plaintext vs Hashing Crittografico',
    type: 'multiple_choice',
    domain: 'Cryptography',
    difficulty: 'Beginner',
    prompt: 'Perché in cybersecurity è vietato salvare le password degli utenti in "testo in chiaro" (Plaintext) all\'interno di un database?',
    codeSnippet: 'DATABASE_USERS (Tabella Vulnerabile):\nID | Username | Password_Plaintext\n1  | admin    | Password123!\n2  | ceo      | Secret2026',
    options: [
      {
        id: 'b3_opt1',
        text: 'In caso di data breach o accesso non autorizzato al DB, chiunque può leggere istantaneamente le credenziali senza dover decifrare nulla',
        isCorrect: true,
        explanation: 'Le password devono essere sempre trasformate in hash crittografici non reversibili (es. Argon2, bcrypt) con salt casuale.'
      },
      {
        id: 'b3_opt2',
        text: 'Perché i testi in chiaro occupano troppa memoria RAM durante le query SQL',
        isCorrect: false,
        explanation: 'La memoria occupata non è la motivazione di sicurezza; un hash a 64 caratteri occupa addirittura più byte di una breve password.'
      },
      {
        id: 'b3_opt3',
        text: 'Perché i browser web rifiutano di inviare password che contengono caratteri alfabetici non crittografati',
        isCorrect: false,
        explanation: 'I browser inviano i dati compilati dall\'utente tramite richieste HTTP/HTTPS standard senza validare la logica del DB.'
      },
      {
        id: 'b3_opt4',
        text: 'Perché i sistemi operativi moderni impediscono l\'avvio di database senza certificati SSL attivi',
        isCorrect: false,
        explanation: 'I motori di database (MySQL, PostgreSQL) consentono configurazioni locali senza SSL; la protezione delle password è una best practice applicativa.'
      }
    ],
    rootCauseBreakdown: {
      cveOrTopic: 'CWE-256: Plaintext Storage of a Password',
      whyItWorks: 'Se il database viene esposto tramite SQL Injection o leak di backup, le password in chiaro permettono il credential stuffing su tutti gli altri account della vittima.',
      patchRecommendation: 'Utilizzare algoritmi di key derivation lenti e sicuri come Argon2id o bcrypt con un fattore di costo (work factor) adeguato.',
      terminalProof: '$ cat /etc/shadow | grep admin\nadmin:$6$rounds=5000$saltsalt$hAsH3dP4sSw0rD...'
    },
    xpReward: 30,
    eloReward: 15
  }
];

export const INTERMEDIATE_DIAGNOSTIC_QUESTIONS: HardcoreQuestion[] = [
  {
    id: 'diag_int_1_sqli',
    title: 'Analisi HTTP Raw: Iniezione SQL & Bypass WAF',
    type: 'multiple_choice',
    domain: 'Web Sec',
    difficulty: 'Intermediate',
    prompt: 'Analizza la richiesta HTTP grezza intercettata verso l\'endpoint di autenticazione. Quale stringa provoca il bypass del controllo logico?',
    codeSnippet: `POST /api/v1/auth/session HTTP/1.1
Host: target-internal.corp:8443
Content-Type: application/json
Content-Length: 68

{
  "username": "admin' OR 1=1-- -",
  "auth_token": "null"
}`,
    options: [
      {
        id: 'i1_opt1',
        text: 'La sequenza "admin\' OR 1=1-- -" forza la clausola WHERE a restituire sempre VERO per il primo utente',
        isCorrect: true,
        explanation: 'La tautologia OR 1=1 annulla il controllo della password e il commento SQL tronca il resto della query.'
      },
      {
        id: 'i1_opt2',
        text: 'Il token "auth_token": "null" disattiva la sessione e concede i privilegi di root',
        isCorrect: false
      },
      {
        id: 'i1_opt3',
        text: 'L\'header Content-Length causa un HTTP Request Smuggling verso il reverse proxy',
        isCorrect: false
      },
      {
        id: 'i1_opt4',
        text: 'La porta 8443 trasmette le credenziali in chiaro senza certificato TLS',
        isCorrect: false
      }
    ],
    rootCauseBreakdown: {
      cveOrTopic: 'CWE-89: SQL Injection (Auth Bypass)',
      whyItWorks: 'Il backend concatena direttamente la stringa ricevuta senza prepared statement: SELECT * FROM accounts WHERE user = \'$user\' AND pass = \'$pass\'.',
      patchRecommendation: 'Utilizzare query parametrizzate (Prepared Statements) con PDO o ORM.',
      terminalProof: '$ curl -k -X POST -H "Content-Type: application/json" -d \'{"username":"admin\'\\\'\' OR 1=1-- -"}\' https://target-internal.corp:8443/api/v1/auth/session\nHTTP/1.1 200 OK'
    },
    xpReward: 50,
    eloReward: 25
  },
  {
    id: 'diag_int_2_networking',
    title: 'Dissezione Pacchetto: Analisi Handshake TCP & Firewall Scan',
    type: 'multiple_choice',
    domain: 'Networking',
    difficulty: 'Intermediate',
    prompt: 'Durante una scansione stealth Nmap (SYN Scan -sS) su porta 443, lo sniffer registra il frame TCP sottostante. Quale stato del servizio indica questa risposta?',
    codeSnippet: `FRAME 42: TCP 10.10.10.50:443 -> 192.168.1.15:48212
[TCP Flags: RST, ACK]
Seq=0, Ack=1, Win=0, Len=0`,
    options: [
      {
        id: 'i2_opt1',
        text: 'La porta 443 è CHIUSA (Closed): l\'host di destinazione è attivo ma rifiuta la connessione inviando RST/ACK',
        isCorrect: true,
        explanation: 'Un pacchetto con flag RST/ACK in risposta a un SYN indica che il sistema operativo ha ricevuto la richiesta ma nessun processo è in ascolto su quella porta.'
      },
      {
        id: 'i2_opt2',
        text: 'La porta 443 è APERTA (Open) e in attesa del payload TLS ClientHello',
        isCorrect: false
      },
      {
        id: 'i2_opt3',
        text: 'La porta 443 è FILTRATA (Filtered) da un firewall perimetrale stateful che scarta i pacchetti (DROP)',
        isCorrect: false
      },
      {
        id: 'i2_opt4',
        text: 'Il frame indica un attacco Man-in-the-Middle con spoofing dell\'indirizzo MAC',
        isCorrect: false
      }
    ],
    rootCauseBreakdown: {
      cveOrTopic: 'TCP/IP RFC 793 Connection Teardown & Port States',
      whyItWorks: 'Nella scansione SYN, una porta aperta risponde con SYN/ACK. Una porta chiusa risponde con RST/ACK. Nessuna risposta o ICMP Unreachable indica uno stato filtered.',
      patchRecommendation: 'Configurare il firewall perimetrale per eseguire il DROP silenzioso delle porte non esposte anziché il REJECT con RST.',
      terminalProof: '$ nmap -sS -p 443 10.10.10.50\nPORT    STATE  SERVICE\n443/tcp closed https'
    },
    xpReward: 50,
    eloReward: 25
  },
  {
    id: 'diag_int_3_linux',
    title: 'Linux PrivEsc: Analisi Bit SUID & Permessi di Sistema',
    type: 'multiple_choice',
    domain: 'Linux & Bash',
    difficulty: 'Intermediate',
    prompt: 'Ispezionando un sistema Linux, trovi il binario seguente con permessi speciali. Perché questo file consente una privilege escalation a root?',
    codeSnippet: `$ ls -la /usr/bin/find
-rwsr-xr-x 1 root root 224840 May 12 14:22 /usr/bin/find`,
    options: [
      {
        id: 'i3_opt1',
        text: 'Ha il bit SUID attivo (permesso "s") appartenente a root, permettendo l\'esecuzione di comandi con privilegi elevati (es. find -exec /bin/sh)',
        isCorrect: true,
        explanation: 'Il bit SUID forza il binario a girare con i privilegi dell\'owner (root) per chiunque lo esegua.'
      },
      {
        id: 'i3_opt2',
        text: 'Chiunque può sovrascrivere il file perché il gruppo root ha permessi di lettura globale',
        isCorrect: false
      },
      {
        id: 'i3_opt3',
        text: 'Il binario è un link simbolico non protetto che punta a /etc/shadow',
        isCorrect: false
      },
      {
        id: 'i3_opt4',
        text: 'La dimensione del file supera il limite consentito da AppArmor',
        isCorrect: false
      }
    ],
    rootCauseBreakdown: {
      cveOrTopic: 'CWE-250: Execution with Unnecessary Privileges (SUID GTFOBins)',
      whyItWorks: 'I binari standard con parametro exec o shell escape (come find, vim, bash) non devono mai avere il bit SUID assegnato.',
      patchRecommendation: 'Rimuovere il bit SUID con: chmod u-s /usr/bin/find.',
      terminalProof: '$ /usr/bin/find . -exec /bin/sh -p \\; -quit\n# whoami\nroot'
    },
    xpReward: 50,
    eloReward: 25
  }
];

export const ADVANCED_DIAGNOSTIC_QUESTIONS: HardcoreQuestion[] = [
  {
    id: 'diag_adv_1_ssrf',
    title: 'Cloud Security: SSRF su AWS Instance Metadata Service',
    type: 'multiple_choice',
    domain: 'Web Sec',
    difficulty: 'Hardcore',
    prompt: 'Un\'applicazione esegue un curl lato server su un endpoint fornitoci. Quale indirizzo IPv4 locale speciale consente di sottrarre i token temporanei IAM dell\'istanza EC2?',
    codeSnippet: 'GET /fetch-avatar?url=http://[IP_METADATA]/latest/meta-data/iam/security-credentials/ec2-role HTTP/1.1',
    options: [
      {
        id: 'a1_opt1',
        text: '169.254.169.254 (AWS IMDSv1 Link-Local Address)',
        isCorrect: true,
        explanation: 'L\'indirizzo link-local 169.254.169.254 espone le credenziali IAM senza autenticazione in IMDSv1.'
      },
      {
        id: 'a1_opt2',
        text: '127.0.0.1 (Loopback standard dell\'host)',
        isCorrect: false
      },
      {
        id: 'a1_opt3',
        text: '192.168.1.1 (Gateway del router locale)',
        isCorrect: false
      },
      {
        id: 'a1_opt4',
        text: '10.0.0.1 (Subnet predefinita della VPC)',
        isCorrect: false
      }
    ],
    rootCauseBreakdown: {
      cveOrTopic: 'AWS IMDSv1 SSRF Vulnerability',
      whyItWorks: 'L\'applicazione non applica una allowlist sugli IP di destinazione e consente al client di interrogare l\'interfaccia link-local interna.',
      patchRecommendation: 'Forzare l\'adozione di AWS IMDSv2 con token di sessione obbligatorio (PUT request).',
      terminalProof: '$ curl http://169.254.169.254/latest/meta-data/iam/security-credentials/Role\n{"AccessKeyId":"ASIA..."}'
    },
    xpReward: 70,
    eloReward: 35
  },
  {
    id: 'diag_adv_2_jwt',
    title: 'Identity & Tokens: Bypass Firma JWT (Algoritmo None)',
    type: 'multiple_choice',
    domain: 'Web Sec',
    difficulty: 'Hardcore',
    prompt: 'Come può un attaccante forgiare un token JSON Web Token valido se la libreria lato server accetta l\'algoritmo "none"?',
    codeSnippet: 'Header: {"alg":"none","typ":"JWT"}\nPayload: {"user":"admin","role":"root"}\nSignature: [VUOTA]',
    options: [
      {
        id: 'a2_opt1',
        text: 'Modificando il payload con ruolo root e rimuovendo completamente la parte di firma dal token',
        isCorrect: true,
        explanation: 'Se il verificatore accetta alg: none, considera autentico qualsiasi payload senza verificare alcuna firma crittografica.'
      },
      {
        id: 'a2_opt2',
        text: 'Forzando una collisione MD5 sui primi 16 byte del token',
        isCorrect: false
      },
      {
        id: 'a2_opt3',
        text: 'Invertendo la chiave pubblica RSA tramite attacco di Bleichenbacher',
        isCorrect: false
      },
      {
        id: 'a2_opt4',
        text: 'Inviando il token due volte nella stessa richiesta HTTP',
        isCorrect: false
      }
    ],
    rootCauseBreakdown: {
      cveOrTopic: 'CWE-347: Improper Verification of Cryptographic Signature',
      whyItWorks: 'L\'algoritmo "none" è previsto dallo standard RFC 7515 per ambienti sicuri non firmati, ma non deve mai essere consentito nei flussi di autenticazione.',
      patchRecommendation: 'Impostare algoritmi di verifica espliciti e rigidi (es. solo RS256 o HS256) scartando a priori alg: none.',
      terminalProof: 'jwt.verify(token, secret, { algorithms: ["HS256"] });'
    },
    xpReward: 70,
    eloReward: 35
  },
  {
    id: 'diag_adv_3_pwn',
    title: 'Binary Exploitation: Corruzione dello Stack x86_64 & Hijacking RIP',
    type: 'multiple_choice',
    domain: 'Code Analysis',
    difficulty: 'Zero-Day',
    prompt: 'In un attacco classico di buffer overflow su architettura x86_64, quale registro della CPU viene sovrascritto per deviare il flusso di esecuzione verso lo shellcode o un gadget ROP?',
    codeSnippet: '[Buffer 64 bytes] -> [Saved RBP 8 bytes] -> [RET_ADDR (RIP) 8 bytes]',
    options: [
      {
        id: 'a3_opt1',
        text: 'RIP (Instruction Pointer / Return Address)',
        isCorrect: true,
        explanation: 'Sovrascrivendo l\'indirizzo di ritorno sullo stack, l\'istruzione RET caricherà nel registro RIP il nuovo indirizzo controllato dall\'attaccante.'
      },
      {
        id: 'a3_opt2',
        text: 'RSP (Stack Pointer)',
        isCorrect: false
      },
      {
        id: 'a3_opt3',
        text: 'RAX (General Purpose Accumulator)',
        isCorrect: false
      },
      {
        id: 'a3_opt4',
        text: 'RFLAGS (Flag Register)',
        isCorrect: false
      }
    ],
    rootCauseBreakdown: {
      cveOrTopic: 'CWE-121: Stack-based Buffer Overflow',
      whyItWorks: 'Funzioni insicure come gets() o strcpy() non controllano i confini del buffer, permettendo di corrompere l\'indirizzo di ritorno posizionato sopra lo stack frame.',
      patchRecommendation: 'Compilare con Stack Canaries (-fstack-protector-all), ASLR attivo e W^X/DEP (NX bit).',
      terminalProof: 'Program received signal SIGSEGV, Segmentation fault.\n0x4141414141414141 in ?? ()'
    },
    xpReward: 70,
    eloReward: 35
  }
];

/**
 * Returns calibrated diagnostic questions based on user's selected level,
 * with Fisher-Yates shuffled options on every load to eliminate predictable patterns.
 */
export function getDiagnosticQuestionsForLevel(level: string): HardcoreQuestion[] {
  let sourceQuestions: HardcoreQuestion[];

  if (level === 'beginner') {
    sourceQuestions = BEGINNER_DIAGNOSTIC_QUESTIONS;
  } else if (level === 'advanced') {
    sourceQuestions = ADVANCED_DIAGNOSTIC_QUESTIONS;
  } else {
    sourceQuestions = INTERMEDIATE_DIAGNOSTIC_QUESTIONS;
  }

  // Deep clone and shuffle options with Fisher-Yates
  return sourceQuestions.map(q => ({
    ...q,
    options: shuffleArray(q.options)
  }));
}

// Default export fallback for backward compatibility
export const DIAGNOSTIC_QUESTIONS = INTERMEDIATE_DIAGNOSTIC_QUESTIONS;
