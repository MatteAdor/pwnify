/**
 * ZeroDay Simulated Bash Engine
 * Provides authentic Linux terminal command evaluation, realistic stdout/stderr,
 * and command parsing for interactive cyber challenge execution.
 */

export interface TerminalExecutionResult {
  output: string;
  isError: boolean;
  exitCode: number;
}

export function executeVirtualCommand(commandString: string): TerminalExecutionResult {
  if (typeof commandString !== 'string') {
    return { output: '', isError: false, exitCode: 0 };
  }

  // Defend against input overflow / ReDoS: Clamp to 512 chars and strip control characters
  // eslint-disable-next-line no-control-regex
  const sanitized = commandString.slice(0, 512).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');
  const trimmed = sanitized.trim();
  if (!trimmed) {
    return { output: '', isError: false, exitCode: 0 };
  }

  const parts = trimmed.split(/\s+/);
  const baseCmd = parts[0].toLowerCase().slice(0, 64);
  const args = parts.slice(1).map(a => a.slice(0, 128));
  const fullArgs = args.join(' ');

  switch (baseCmd) {
    case 'help':
      return {
        output: `Comandi shell supportati:
  ls, pwd, whoami, id, uname -a, cat, grep, sudo -l,
  curl, nmap, find, chmod, env, clear`,
        isError: false,
        exitCode: 0
      };

    case 'pwd':
      return {
        output: '/root/pwnify-lab',
        isError: false,
        exitCode: 0
      };

    case 'whoami':
      return {
        output: 'root',
        isError: false,
        exitCode: 0
      };

    case 'id':
      return {
        output: 'uid=0(root) gid=0(root) groups=0(root),4(adm),27(sudo)',
        isError: false,
        exitCode: 0
      };

    case 'uname':
      if (args.includes('-a') || args.includes('-r')) {
        return {
          output: 'Linux pwnify-lab 6.8.0-45-generic #45-Ubuntu SMP PREEMPT_DYNAMIC x86_64 GNU/Linux',
          isError: false,
          exitCode: 0
        };
      }
      return { output: 'Linux', isError: false, exitCode: 0 };

    case 'ls':
      if (fullArgs.includes('-l') || fullArgs.includes('-la')) {
        return {
          output: `total 48
drwxr-xr-x 4 root root 4096 Oct 17 20:30 .
drwxr-xr-x 3 root root 4096 Oct 17 20:20 ..
-rwsr-xr-x 1 root root 55288 Feb 12 2024 /usr/bin/find (SUID)
-rw-r--r-- 1 root root  1420 Oct 17 20:25 backup.sh
-rwxr-xr-x 1 root root  3490 Oct 17 20:26 exploit.py
-rw------- 1 root root   640 Oct 17 20:28 flag_root.txt
-rw-r--r-- 1 root root   890 Oct 17 20:22 payload.req`,
          isError: false,
          exitCode: 0
        };
      }
      return {
        output: 'backup.sh  exploit.py  flag_root.txt  payload.req',
        isError: false,
        exitCode: 0
      };

    case 'cat':
      if (fullArgs.includes('/etc/passwd')) {
        return {
          output: `root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
operator:x:1000:1000:Pwnify Operator:/home/operator:/bin/bash
mysql:x:114:120:MySQL Server,,,:/nonexistent:/bin/false`,
          isError: false,
          exitCode: 0
        };
      }
      if (fullArgs.includes('flag_root.txt')) {
        return {
          output: '0xDAY{z3r0_d4y_pr1v_3sc_c0mpl3t3_f0und4t10n}',
          isError: false,
          exitCode: 0
        };
      }
      if (fullArgs.includes('backup.sh')) {
        return {
          output: `#!/bin/bash\ntar -czf /var/backups/web.tar.gz /var/www/html/*\n# Executed periodically via crontab`,
          isError: false,
          exitCode: 0
        };
      }
      return {
        output: `[cat] Contenuto di ${args[0] || 'file'}: visualizzazione output completata.`,
        isError: false,
        exitCode: 0
      };

    case 'sudo':
      if (args.includes('-l')) {
        return {
          output: `Matching Defaults entries for root on pwnify-lab:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\\:/usr/local/bin

User operator may run the following commands on pwnify-lab:
    (root) NOPASSWD: /usr/bin/find, /usr/bin/python3, /usr/bin/tar`,
          isError: false,
          exitCode: 0
        };
      }
      return {
        output: `sudo: ${fullArgs}: comando eseguito con privilegi root.`,
        isError: false,
        exitCode: 0
      };

    case 'curl':
      if (fullArgs.includes('-i') || fullArgs.includes('-I') || fullArgs.includes('--head')) {
        return {
          output: `HTTP/1.1 200 OK
Date: Sat, 17 Oct 2026 20:30:00 GMT
Server: nginx/1.24.0 (Ubuntu)
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Content-Type: text/html; charset=UTF-8
Content-Length: 4820`,
          isError: false,
          exitCode: 0
        };
      }
      return {
        output: `HTTP/1.1 200 OK\n<!DOCTYPE html><html><head><title>Pwnify Lab Target</title></head><body><h1>API Gateway Active</h1></body></html>`,
        isError: false,
        exitCode: 0
      };

    case 'nmap':
      return {
        output: `Starting Nmap 7.94SVN ( https://nmap.org )
Nmap scan report for target.internal (192.168.1.10)
Host is up (0.00042s latency).
PORT     STATE SERVICE  VERSION
22/tcp   open  ssh      OpenSSH 8.9p1 Ubuntu
80/tcp   open  http     nginx 1.24.0
443/tcp  open  ssl/http nginx 1.24.0
3306/tcp open  mysql    MySQL 8.0.36
Service detection performed. 4 open ports found.`,
        isError: false,
        exitCode: 0
      };

    case 'find':
      if (fullArgs.includes('-perm') || fullArgs.includes('suid')) {
        return {
          output: `/usr/bin/find
/usr/bin/sudo
/usr/bin/pkexec
/usr/bin/chfn
/usr/bin/newgrp
/usr/bin/passwd`,
          isError: false,
          exitCode: 0
        };
      }
      return {
        output: `/root/pwnify-lab/exploit.py\n/root/pwnify-lab/backup.sh`,
        isError: false,
        exitCode: 0
      };

    case 'grep':
      return {
        output: `config.json:4:    "DATABASE_URL": "mysql://db_admin:P@ssw0rd123!@10.0.0.50:3306/prod"\nauth.py:18:    JWT_SECRET = "supersecret_hmac_key_2026"`,
        isError: false,
        exitCode: 0
      };

    case 'chmod':
      return {
        output: `chmod: permessi aggiornati con successo per ${fullArgs || 'file'}.`,
        isError: false,
        exitCode: 0
      };

    case 'env':
      return {
        output: `SHELL=/bin/bash
USER=root
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
PWD=/root/pwnify-lab
HISTSIZE=1000
LANG=en_US.UTF-8`,
        isError: false,
        exitCode: 0
      };

    case 'ping':
      return {
        output: `PING 8.8.8.8 (8.8.8.8) 56(84) bytes of data.
64 bytes from 8.8.8.8: icmp_seq=1 ttl=118 time=12.4 ms
64 bytes from 8.8.8.8: icmp_seq=2 ttl=118 time=11.9 ms
64 bytes from 8.8.8.8: icmp_seq=3 ttl=118 time=12.1 ms
64 bytes from 8.8.8.8: icmp_seq=4 ttl=118 time=12.0 ms

--- 8.8.8.8 ping statistics ---
4 packets transmitted, 4 received, 0% packet loss, time 3004ms
rtt min/avg/max/mdev = 11.912/12.100/12.405/0.187 ms`,
        isError: false,
        exitCode: 0
      };

    case 'ipcalc':
      return {
        output: `Address:   192.168.1.0          11000000.10101000.00000001. 00000000
Netmask:   255.255.255.0 = 24   11111111.11111111.11111111. 00000000
Wildcard:  0.0.0.255            00000000.00000000.00000000. 11111111
=>
Network:   192.168.1.0/24       11000000.10101000.00000001. 00000000
HostMin:   192.168.1.1          11000000.10101000.00000001. 00000001
HostMax:   192.168.1.254        11000000.10101000.00000001. 11111110
Broadcast: 192.168.1.255        11000000.10101000.00000001. 11111111
Hosts/Net: 254                   (Class C, Private Internet)`,
        isError: false,
        exitCode: 0
      };

    case 'base64':
      if (fullArgs.includes('-d') || fullArgs.includes('--decode')) {
        return {
          output: `{"alg":"none","typ":"JWT"}\n{"user":"admin","role":"root"}`,
          isError: false,
          exitCode: 0
        };
      }
      return {
        output: `eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0K`,
        isError: false,
        exitCode: 0
      };

    case 'echo':
      if (fullArgs.includes('sha256sum')) {
        return {
          output: `d04b5f9e8a71a938c5d1...  -`,
          isError: false,
          exitCode: 0
        };
      }
      if (fullArgs.includes('ip_forward')) {
        return {
          output: `[+] IPv4 packet forwarding enabled in /proc/sys/net/ipv4/ip_forward`,
          isError: false,
          exitCode: 0
        };
      }
      return {
        output: fullArgs.replace(/['"]/g, ''),
        isError: false,
        exitCode: 0
      };

    case 'sqlmap':
      return {
        output: `[+] fetching database names
[+] production_db
[+] dumping table 'users'
+----+----------+------------------------------------+
| id | username | password_hash                      |
+----+----------+------------------------------------+
| 1  | admin    | $2y$10$e8vK1zK8... (SqlAdmin2024!) |
| 2  | operator | $2y$10$9x0M2...   (User123!)       |
+----+----------+------------------------------------+
[INFO] table 'production_db.users' dumped to CSV`,
        isError: false,
        exitCode: 0
      };

    case 'impacket-getnpusers':
      return {
        output: `[*] Getting TGT for user corp.local/operator
$krb5asrep$23$operator@CORP.LOCAL:...
[+] Output saved to asrep.hashes (Hashcat format 18200)`,
        isError: false,
        exitCode: 0
      };

    case 'arpspoof':
      return {
        output: `0:c:29:4f:8e:12 0:50:56:c0:0:8 0806 42: arp reply 192.168.1.1 is-at 0:c:29:4f:8e:12
0:c:29:4f:8e:12 0:50:56:c0:0:9 0806 42: arp reply 192.168.1.50 is-at 0:c:29:4f:8e:12`,
        isError: false,
        exitCode: 0
      };

    default:
      return {
        output: `bash: ${baseCmd}: command not found. Digita 'help' per la lista dei comandi.`,
        isError: true,
        exitCode: 127
      };
  }
}
