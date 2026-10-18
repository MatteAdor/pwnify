export interface LessonBriefing {
  nodeId: string;
  badge: string;
  objective: string;
  coreConcept: string;
  keyPoints: string[];
  syntaxExample?: {
    type: 'terminal' | 'code' | 'http';
    title: string;
    code: string;
    explanation: string;
  };
  goldenRule: string;
  examRelevance: string;
}

export const LESSON_BRIEFINGS_IT: Record<string, LessonBriefing> = {
  node_basics_1: {
    nodeId: 'node_basics_1',
    badge: 'LINUX & BASH // FONDAMENTA',
    objective: 'Padroneggiare la navigazione del filesystem Linux e l\'ispezione dei permessi dei file.',
    coreConcept: 'In Linux ogni processo opera all\'interno di una "Current Working Directory" (CWD). Muoversi senza verificare il percorso corrente rischia di eseguire comandi errati o distruttivi su cartelle di sistema.',
    keyPoints: [
      'pwd (Print Working Directory): stampa il percorso assoluto a partire dalla radice /.',
      'ls -la: elenca tutti i file inclusi quelli nascosti (dotfiles come .bash_history o .env) e i permessi rwx.',
      'I percorsi globali di configurazione su standard FHS risiedono in /etc/, i log in /var/log/.'
    ],
    syntaxExample: {
      type: 'terminal',
      title: 'Comandi Base di Navigazione',
      code: '$ pwd\n/home/operator/lab\n$ ls -la\ndrwxr-xr-x 2 operator operator 4096 Oct 18 10:00 .\n-rw------- 1 operator operator  512 Oct 18 10:05 .env',
      explanation: 'ls con flag -la rivela il file nascosto .env con permessi restrittivi 600.'
    },
    goldenRule: 'Prima di lanciare qualsiasi script di rimozione o esecuzione, verifica sempre il percorso con "pwd".',
    examRelevance: 'CompTIA Security+ SY0-701 & Linux Professional Institute LPIC-1'
  },
  node_basics_2: {
    nodeId: 'node_basics_2',
    badge: 'NETWORKING // PROTOCOLLI WEB',
    objective: 'Comprendere il transito dei dati web, le porte standard e l\'interpretazione dei codici HTTP.',
    coreConcept: 'Il web si basa sul protocollo client-server HTTP. Il traffico in chiaro viaggia su porta 80 ed è intercettabile con un semplice sniffer di rete; HTTPS usa TLS/SSL su porta 443 per garantire cifratura e integrità.',
    keyPoints: [
      'Porta 80 = HTTP non cifrato (vulnerabile a sniffing Wi-Fi e MitM).',
      'Porta 443 = HTTPS cifrato con certificato X.509 e cifratura simmetrica AES.',
      'Codici 2xx = Successo (200 OK), 4xx = Errore Client (404 Non Trovato), 5xx = Errore Server (500).'
    ],
    syntaxExample: {
      type: 'terminal',
      title: 'Ispezione Header con Curl',
      code: '$ curl -I https://zeroday.gg\nHTTP/2 200\nserver: cloudflare\nstrict-transport-security: max-age=31536000',
      explanation: 'Il flag -I richiede solo gli header HTTP di risposta senza scaricare il corpo HTML.'
    },
    goldenRule: 'Forza sempre HTTPS e reindirizza la porta 80 alla 443 abilitando l\'header HSTS (Strict-Transport-Security).',
    examRelevance: 'CompTIA Network+ & Security+ // RFC 9110 HTTP Standards'
  },
  node_basics_3: {
    nodeId: 'node_basics_3',
    badge: 'CRITTOGRAFIA // PROTEZIONE DATI',
    objective: 'Distinguere tra cifratura reversibile e hashing unidirezionale salato per le credenziali.',
    coreConcept: 'Una funzione di hash crittografico mappa un input di lunghezza arbitraria in un digest a lunghezza fissa. È una funzione unidirezionale irreversibile: non esiste una "chiave di decifratura" per riottenere la password.',
    keyPoints: [
      'Hashing unidirezionale: da "Password123" si calcola l\'hash SHA-256, ma dall\'hash è impossibile risalire matematicamente al testo.',
      'Salting: aggiunta di una stringa casuale univoca per utente che neutralizza le tabelle Rainbow e attacchi a dizionario.',
      'Memorizzare password in chiaro nel database (CWE-256) espone gli utenti a credential stuffing immediato in caso di dump.'
    ],
    syntaxExample: {
      type: 'code',
      title: 'Hashing Sicuro con Bcrypt (Node.js)',
      code: '// ERRATO: db.query("INSERT INTO users (pwd) VALUES (?)", [rawPassword]);\n// CORRETTO:\nconst saltRounds = 12;\nconst hash = await bcrypt.hash(rawPassword, saltRounds);\nawait db.query("INSERT INTO users (pwd_hash) VALUES (?)", [hash]);',
      explanation: 'Bcrypt genera un salt crittografico univoco ed applica un fattore di costo computazionale.'
    },
    goldenRule: 'Mai usare algoritmi veloci come MD5 o SHA-1 per le password: usa algoritmi lenti come Argon2id o Bcrypt con salt.',
    examRelevance: 'OWASP Top 10 A02: Cryptographic Failures & CWE-256'
  },
  node_sqli_1: {
    nodeId: 'node_sqli_1',
    badge: 'WEB EXPLOITATION // OWASP A03',
    objective: 'Riconoscere ed evitare l\'iniezione di metacaratteri SQL nella logica di autenticazione.',
    coreConcept: 'La SQL Injection classica si verifica quando l\'input utente non validato viene concatenato direttamente in una stringa di query SQL. I metacaratteri come l\'apice singolo (\') rompono la sintassi consentendo di inserire tautologie logiche.',
    keyPoints: [
      'Il metacarattere apice singolo (\') chiude il delimitatore di stringa.',
      'La condizione "OR 1=1" trasforma qualsiasi clausola WHERE in un\'espressione sempre VERA.',
      'I caratteri di commento (-- in SQL/PostgreSQL, # in MySQL) annullano il controllo della password.',
      'Il payload \' OR \'1\'=\'1 bypassa il controllo credenziali restituendo il primo record (spesso l\'admin).'
    ],
    syntaxExample: {
      type: 'code',
      title: 'Anatomia di una Query Vulnerabile vs Protetta',
      code: '// VULNERABILE (Concatenazione):\nconst sql = `SELECT * FROM users WHERE user=\'${user}\' AND pass=\'${pass}\'`;\n\n// DIFESA (Parametrizzazione Prepared Statement):\nconst sql = "SELECT * FROM users WHERE user = ? AND pass = ?";\ndb.query(sql, [user, pass]);',
      explanation: 'Con le query parametrizzate, i caratteri speciali vengono trattati come testo letterale, mai come codice SQL.'
    },
    goldenRule: 'Mai fidarsi dell\'input utente: usa sempre Prepared Statements e query parametrizzate.',
    examRelevance: 'OWASP Top 10 A03: Injection & CompTIA PenTest+'
  },
  node_sqli_2: {
    nodeId: 'node_sqli_2',
    badge: 'DATABASE RECON // UNION EXTRACTION',
    objective: 'Estrarre dati riservati da tabelle arbitrarie combinando i resultset con l\'operatore UNION.',
    coreConcept: 'L\'operatore UNION di SQL consente di concatenare l\'output della query legittima con una seconda query controllata dall\'attaccante, permettendo di estrarre utenti, hash e tabelle di sistema.',
    keyPoints: [
      'Regola UNION 1: entrambe le query devono restituire esattamente lo stesso numero di colonne.',
      'Regola UNION 2: i tipi di dato delle colonne devono essere compatibili tra le due query.',
      'Tecnica ORDER BY N: incrementare N finché non si genera un errore permette di identificare il numero esatto di colonne.',
      'Tecnica UNION SELECT NULL, NULL...: sonda quali posizioni accettano stringhe e possono visualizzare dati.'
    ],
    syntaxExample: {
      type: 'terminal',
      title: 'Fasi di un Attacco UNION-Based',
      code: '1. Identificazione Colonne: \' ORDER BY 3-- (se 4 fallisce, le colonne sono 3)\n2. Test DataType: \' UNION SELECT NULL, \'test\', NULL--\n3. Dump Tabella: \' UNION SELECT id, username, password_hash FROM admin_users--',
      explanation: 'Una volta determinate le colonne compatibili, è possibile estrarre qualsiasi tabella del database.'
    },
    goldenRule: 'Disabilita la visualizzazione dettagliata degli errori database e adotta account DB a privilegi minimi.',
    examRelevance: 'Certified Ethical Hacker (CEH) & OffSec OSCP'
  },
  node_sqli_3: {
    nodeId: 'node_sqli_3',
    badge: 'ADVANCED WEB // INFERENCE & TIMING',
    objective: 'Estrarre dati carattere per carattere quando l\'applicazione non mostra output a schermo.',
    coreConcept: 'Nelle Blind SQLi l\'applicazione non restituisce dati della query né messaggi di errore. L\'attaccante deduce le informazioni ponendo domande vero/falso e misurando il tempo di risposta del server (Time-Based) o la variazione del body (Boolean-Based).',
    keyPoints: [
      'Boolean-Based: la pagina mostra contenuti diversi a seconda che una condizione sia VERA o FALSA.',
      'Time-Based: usa funzioni di sleep (pg_sleep, WAITFOR DELAY, SLEEP(5)) che ritardano la risposta solo se la condizione è vera.',
      'Estrazione tramite SUBSTRING(): testa il primo carattere con codice ASCII, poi il secondo, fino a ricostruire la stringa.',
      'La funzione ASCII(\'A\') = 65 consente di fare ricerca binaria su ogni lettera.'
    ],
    syntaxExample: {
      type: 'terminal',
      title: 'Payload Time-Based in PostgreSQL',
      code: '\' || (SELECT CASE WHEN (SELECT SUBSTRING(password,1,1) FROM users WHERE username=\'admin\')=\'s\' THEN pg_sleep(5) ELSE pg_sleep(0) END)--',
      explanation: 'Se la risposta impiega 5 secondi, il primo carattere della password è confermato essere "s".'
    },
    goldenRule: 'Le difese perimetrali non bastano: l\'unica soluzione reale alle SQLi sono le query parametrizzate a livello di codice.',
    examRelevance: 'OffSec Certified Professional (OSCP) & PortSwigger Certified'
  },
  node_net_1: {
    nodeId: 'node_net_1',
    badge: 'NETWORK ARCHITECTURE // TCP/IP',
    objective: 'Analizzare il Three-Way Handshake TCP e riconoscere anomalie nei flag dei pacchetti.',
    coreConcept: 'Il protocollo TCP è orientato alla connessione e garantisce il recapito affidabile dei dati. Prima di scambiare dati, client e server negoziano parametri e numeri di sequenza tramite la sequenza SYN -> SYN-ACK -> ACK.',
    keyPoints: [
      'SYN (Synchronize): il client invia il pacchetto iniziale con il proprio Sequence Number.',
      'SYN-ACK: il server accetta la connessione e risponde confermando (ACK = seq+1).',
      'ACK (Acknowledge): il client conferma l\'apertura della sessione e inizia lo scambio dati.',
      'Flag RST (Reset): chiusura immediata e anomala del socket, usata per rifiutare porte chiuse.'
    ],
    syntaxExample: {
      type: 'terminal',
      title: 'Flusso Handshake in Tcpdump',
      code: '$ tcpdump -i eth0 \'tcp[tcpflags] & (tcp-syn|tcp-ack) != 0\'\n10.0.0.5.54321 > 10.0.0.1.80: Flags [S], seq 1000\n10.0.0.1.80 > 10.0.0.5.54321: Flags [S.], seq 2000, ack 1001\n10.0.0.5.54321 > 10.0.0.1.80: Flags [.], ack 2001',
      explanation: 'I flag [S], [S.] e [.] rappresentano esattamente SYN, SYN-ACK e ACK.'
    },
    goldenRule: 'Configura protezioni SYN Cookie a livello di kernel per proteggere i server da attacchi DoS SYN Flood.',
    examRelevance: 'Cisco CCNA & CompTIA Security+ Network Infrastructure'
  },
  node_net_2: {
    nodeId: 'node_net_2',
    badge: 'RECONNAISSANCE // NETWORK AUDIT',
    objective: 'Effettuare scansioni stealth con Nmap ed estrarre i banner per identificare software vulnerabili.',
    coreConcept: 'La fase di reconnaissance mappa la superficie d\'attacco della rete. Nmap invia sonde TCP/UDP per identificare porte aperte, versioni dei servizi in ascolto e sistemi operativi sottostanti.',
    keyPoints: [
      'SYN Stealth Scan (-sS): invia solo pacchetti SYN. Non completa l\'handshake (evita la registrazione nei log applicativi).',
      'Service & Version Detection (-sV): interroga le porte per leggere i banner e le firme di versione.',
      'Default Scripts (-sC): esegue gli script sicuri del Nmap Scripting Engine (NSE) per raccogliere informazioni chiave.',
      'Banner Grabbing: leggere stringhe come "Apache/2.4.41 (Ubuntu)" rivela le CVE note associate alla versione.'
    ],
    syntaxExample: {
      type: 'terminal',
      title: 'Comando Audit Nmap Consigliato',
      code: '$ sudo nmap -sS -sV -sC -T4 -p- target.corp\nPORT   STATE SERVICE VERSION\n22/tcp open  ssh     OpenSSH 8.2p1\n80/tcp open  http    Apache httpd 2.4.41',
      explanation: 'Scansione stealth (-sS) con identificazione versioni (-sV) su tutte le porte (-p-).'
    },
    goldenRule: 'Disabilita i banner verbosi sui server web e disattiva tutti i servizi non strettamente necessari.',
    examRelevance: 'CompTIA PenTest+ PT0-002 & CEH Network Reconnaissance'
  },
  node_lin_1: {
    nodeId: 'node_lin_1',
    badge: 'LINUX SECURITY // PRIVILEGE ESCALATION',
    objective: 'Individuare binari con bit SUID attivo e sfruttare vulnerabilità per ottenere la shell di root.',
    coreConcept: 'Il bit SUID (Set User ID) consente a un programma di essere eseguito con i privilegi del proprietario del file (spesso root), indipendentemente dall\'utente che lo lancia. Se un programma con SUID permette shell escape o esecuzione di comandi, l\'escalation a root è immediata.',
    keyPoints: [
      'Permessi SUID: indicati dalla lettera "s" nei permessi utente (es. -rwsr-xr-x).',
      'GTFOBins: repository curato di binari Unix legittimi che possono essere abusati se provvisti di SUID.',
      'Comando di ricerca: find / -perm -4000 -type f 2>/dev/null individua tutti i binari con SUID nel sistema.',
      'Binari pericolosi: bash, find, vim, cp, nmap con SUID permettono lettura/scrittura arbitraria o shell root.'
    ],
    syntaxExample: {
      type: 'terminal',
      title: 'Escalation tramite SUID con "find"',
      code: '$ ls -la /usr/bin/find\n-rwsr-xr-x 1 root root 220000 May 10 10:00 /usr/bin/find\n$ find . -exec /bin/sh -p \\; -quit\n# whoami\nroot',
      explanation: 'Il parametro -exec di un binario find con SUID genera una shell mantenendo i privilegi di root (-p).'
    },
    goldenRule: 'Rimuovi il bit SUID da qualsiasi binario che non lo richieda esplicitamente (chmod u-s /path/to/binary).',
    examRelevance: 'OffSec OSCP Linux PrivEsc & Linux Foundation LFCS'
  },
  node_lin_2: {
    nodeId: 'node_lin_2',
    badge: 'LINUX INTERNALS // SCHEDULED TASKS',
    objective: 'Identificare cron job eseguiti con permessi elevati e sfruttare percorsi o permessi deboli.',
    coreConcept: 'I cron job sono attività pianificate dal demone cron. Se un cron job eseguito da root richiama uno script scrivibile da utenti standard o usa wildcard (*) non sanificate, l\'attaccante può iniettare comandi arbitrari eseguiti come root.',
    keyPoints: [
      'Verifica /etc/crontab e /etc/cron.* per script eseguiti periodicamente da root.',
      'File permission check: se lo script eseguito da root ha permessi di scrittura per "others" (w), è modificabile.',
      'Wildcard Injection con tar (*): tar interpreta file denominati con flag di riga comando come opzioni valide.',
      'Sfruttamento: iniettare una reverse shell o aggiungere un utente sudoer in /etc/sudoers.'
    ],
    syntaxExample: {
      type: 'terminal',
      title: 'Ispezione Cron Job Vulnerabile',
      code: '$ cat /etc/crontab\n* * * * * root /opt/backup/cleanup.sh\n$ ls -la /opt/backup/cleanup.sh\n-rwxrwxrwx 1 root root 84 Oct 18 10:00 cleanup.sh\n$ echo "chmod +s /bin/bash" >> /opt/backup/cleanup.sh',
      explanation: 'Poiché lo script è scrivibile (777), l\'attaccante inietta un comando eseguito al minuto successivo da root.'
    },
    goldenRule: 'Assicurati che gli script eseguiti da root appartengano a root e abbiano permessi restrittivi (chmod 700 o 750).',
    examRelevance: 'CompTIA Linux+ & OSCP Host Hardening'
  },
  node_soc_1: {
    nodeId: 'node_soc_1',
    badge: 'DEFENSE & SOC // THREAT HUNTING',
    objective: 'Correlare i Windows Event ID nel SIEM per rilevare attacchi di password spray e brute force.',
    coreConcept: 'I Security Operations Center (SOC) monitorano i log generati dagli endpoint. Il Security Log di Windows registra tentativi di autenticazione, creazioni di processi e servizi tramite Event ID standardizzati.',
    keyPoints: [
      'EventID 4625: Fallimento di logon (Audit Failure) con codice di errore (es. 0xC000006A = password errata).',
      'EventID 4624: Logon riuscito (Audit Success) con LogonType (Tipo 3 = Rete, Tipo 10 = RDP).',
      'Pattern di Brute Force: una raffica di centinaia di EventID 4625 concentrati contro un account in pochi secondi.',
      'Pattern di Password Spray: un EventID 4625 distribuito su centinaia di account diversi con la stessa password comune.',
      'EventID 7045: Creazione di un nuovo servizio Windows (spesso indice di persistenza o esecuzione malware).'
    ],
    syntaxExample: {
      type: 'terminal',
      title: 'Query SIEM per Rilevamento Attacchi',
      code: 'index=windows EventCode=4625 \n| stats count by src_ip, TargetUserName \n| where count > 10\n| sort -count',
      explanation: 'Raggruppa i fallimenti di logon per IP sorgente e nome utente evidenziando anomalie massive.'
    },
    goldenRule: 'Abilita il lockout temporaneo degli account dopo 5 tentativi errati e attiva l\'MFA su tutti gli accessi RDP e VPN.',
    examRelevance: 'Microsoft SC-200 Security Operations Analyst & Blue Team Level 1 (BTL1)'
  },
  node_api_jwt_1: {
    nodeId: 'node_api_jwt_1',
    badge: 'API SECURITY // AUTHENTICATION TOKENS',
    objective: 'Analizzare la struttura del JSON Web Token (JWT) e sfruttare la vulnerabilità dell\'algoritmo None.',
    coreConcept: 'Un JWT è composto da 3 parti separate da punti: Header.Payload.Signature codificati in Base64Url. Se il backend non convalida rigidamente l\'algoritmo di firma, un attaccante può impostare alg="none" per bypassare la verifica.',
    keyPoints: [
      'Struttura JWT: Header (tipo e algoritmo), Payload (claims e ruolo utente), Signature (hash crittografico).',
      'Algorithm None Attack: l\'attaccante modifica "alg": "HS256" in "alg": "none" e rimuove la firma finale.',
      'Vulnerabilità server: alcune librerie vulnerabili accettano token senza firma se alg è dichiarato come "none".',
      'Modifica privilegi: cambiare "role": "user" in "role": "admin" nel payload codificato.'
    ],
    syntaxExample: {
      type: 'code',
      title: 'Token JWT Manomesso con Algoritmo None',
      code: '// Header: {"alg":"none","typ":"JWT"} -> eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0\n// Payload: {"user":"victim","role":"admin"} -> eyJ1c2VyIjoidmljdGltIiwicm9sZSI6ImFkbWluIn0\n// Token finale con firma vuota (nota il punto finale):\neyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJ1c2VyIjoidmljdGltIiwicm9sZSI6ImFkbWluIn0.',
      explanation: 'La firma dopo il secondo punto viene rimossa lasciando solo il punto finale.'
    },
    goldenRule: 'Imponi l\'algoritmo di firma sul server e rifiuta categoricamente qualsiasi token con alg="none".',
    examRelevance: 'OWASP API Security Top 10 API2: Broken Authentication'
  },
  node_ad_kerberoast: {
    nodeId: 'node_ad_kerberoast',
    badge: 'ACTIVE DIRECTORY // KERBEROS EXPLOITATION',
    objective: 'Estrarre i ticket TGS associati a Service Principal Names (SPN) ed effettuare il cracking offline.',
    coreConcept: 'In Active Directory qualsiasi utente di dominio autenticato può richiedere un ticket di servizio Kerberos (TGS) per qualsiasi account associato a un SPN. Poiché il TGS è cifrato con l\'hash NTLM dell\'account di servizio, può essere craccato offline senza generare allarmi in rete.',
    keyPoints: [
      'SPN (Service Principal Name): identificatore che associa un servizio di rete (es. MSSQL, HTTP) a un account AD.',
      'Richiesta TGS: l\'attaccante usa GetUserSPNs.py o Rubeus per richiedere i ticket TGS degli account con SPN.',
      'Cracking Offline con Hashcat: estrazione dell\'hash in formato Kerberos 5 TGS-REP (tipo 13100) e brute-force con rockyou.txt.',
      'Nessun lockout: il cracking avviene sul computer locale dell\'attaccante, senza tentativi sul Domain Controller.'
    ],
    syntaxExample: {
      type: 'terminal',
      title: 'Fasi di un Attacco Kerberoasting',
      code: '$ python3 GetUserSPNs.py corp.local/jdoe:Password123 -request -outputfile hashes.kerberoast\n$ hashcat -m 13100 -a 0 hashes.kerberoast /usr/share/wordlists/rockyou.txt',
      explanation: 'Hashcat effettua il cracking offline del digest Kerberos TGS-REP sfruttando le GPU.'
    },
    goldenRule: 'Utilizza account di servizio gestiti di gruppo (gMSA) con password complesse di 128 caratteri ruotate automaticamente.',
    examRelevance: 'OffSec PEN-300 / OSEP & Active Directory Attacks'
  }
};

/**
 * Returns the guided briefing for a given node, or generates a structured
 * fallback briefing from the node's properties and first question breakdown.
 */
export function getLessonBriefing(nodeId: string, nodeTitle?: string, domain?: string): LessonBriefing {
  if (LESSON_BRIEFINGS_IT[nodeId]) {
    return LESSON_BRIEFINGS_IT[nodeId];
  }

  // Generative fallback for any dynamic node
  return {
    nodeId: nodeId || 'generic_node',
    badge: `${domain?.toUpperCase() || 'CYBER LAB'} // GUIDA PRATICA`,
    objective: `Acquisire le competenze operative fondamentali su ${nodeTitle || 'questo modulo'}.`,
    coreConcept: `Questa lezione ti guida passo-passo attraverso le tecniche di sicurezza, l'analisi del vettore di attacco e le contromisure di difesa certificate per ${nodeTitle || 'l\'argomento'}.`,
    keyPoints: [
      'Comprensione approfondita del meccanismo e dell\'architettura sottostante.',
      'Identificazione tempestiva della configurazione vulnerabile o del metacarattere non sanificato.',
      'Applicazione delle linee guida di mitigazione e hardening conformi agli standard industriali.'
    ],
    goldenRule: 'Applica sempre il principio del minimo privilegio e convalida rigorosamente tutti gli input prima dell\'esecuzione.',
    examRelevance: 'Certificazioni Cyber Security (CompTIA Security+, CEH, OWASP)'
  };
}
