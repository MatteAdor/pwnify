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
  const trimmed = commandString.trim();
  if (!trimmed) {
    return { output: '', isError: false, exitCode: 0 };
  }

  const parts = trimmed.split(/\s+/);
  const baseCmd = parts[0].toLowerCase();
  const args = parts.slice(1);
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
        output: '/root/zeroday-lab',
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
          output: 'Linux zeroday-lab 6.8.0-45-generic #45-Ubuntu SMP PREEMPT_DYNAMIC x86_64 GNU/Linux',
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
operator:x:1000:1000:ZeroDay Operator:/home/operator:/bin/bash
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
          output: `Matching Defaults entries for root on zeroday-lab:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\\:/usr/local/bin

User operator may run the following commands on zeroday-lab:
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
        output: `HTTP/1.1 200 OK\n<!DOCTYPE html><html><head><title>ZeroDay Lab Target</title></head><body><h1>API Gateway Active</h1></body></html>`,
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
        output: `/root/zeroday-lab/exploit.py\n/root/zeroday-lab/backup.sh`,
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
PWD=/root/zeroday-lab
HISTSIZE=1000
LANG=en_US.UTF-8`,
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
