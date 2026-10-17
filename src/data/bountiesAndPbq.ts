import { DailyBounty, PbqLab } from '../types';

export const INITIAL_DAILY_BOUNTIES: DailyBounty[] = [
  {
    id: 'bounty_terminal',
    title: 'Terminal Injection Specialist',
    description: 'Completa con successo 1 sfida a riga di comando nel Terminal Sandbox',
    progress: 1,
    target: 1,
    isCompleted: true,
    freeClaimed: false,
    proClaimed: false,
    freeXp: 50,
    proXp: 150,
    proTickets: 2
  },
  {
    id: 'bounty_pvp',
    title: 'ZeroDay Arena Gladiator',
    description: 'Trionfa in un match Blitz 1v1 nella Cyber Arena contro un altro operatore o bot',
    progress: 1,
    target: 1,
    isCompleted: true,
    freeClaimed: false,
    proClaimed: false,
    freeXp: 50,
    proXp: 150,
    proTickets: 2
  },
  {
    id: 'bounty_zeroday',
    title: '0-Day Code Inspector',
    description: 'Individua 2 righe di codice difettose nella modalità Spot the Zero-Day',
    progress: 1,
    target: 2,
    isCompleted: false,
    freeClaimed: false,
    proClaimed: false,
    freeXp: 50,
    proXp: 150,
    proTickets: 2
  }
];

export const OFFICIAL_PBQ_LABS: PbqLab[] = [
  {
    id: 'pbq_secplus_firewall',
    title: 'PBQ Lab 1: Stateful Firewall ACL Hardening',
    certification: 'CompTIA Security+',
    scenarioDescription: 'Un server Web pubblico (192.168.1.10) e un database interno (10.0.0.50) si trovano dietro un firewall perimetrale. Gli analisti hanno rilevato tentativi di connessione SSH e Telnet diretti dalla WAN.',
    targetObjective: 'Configura la tabella delle Access Control List (ACL) per consentire solo HTTPS sicuro alla DMZ, permettere al Web Server di interrogare la porta MySQL del Database, e applicare la regola di Deny implicito.',
    steps: [
      {
        id: 'rule_1',
        instruction: 'Regola 1 (Web Inbound): Consenti traffico web crittografato dall\'esterno (Any WAN) verso il Web Server (192.168.1.10).',
        scenario: 'Permettere agli utenti legittimi di accedere al portale via porta 443.',
        ruleAction: 'ALLOW',
        sourceIp: '0.0.0.0/0 (ANY)',
        destinationPort: '443 (HTTPS)',
        protocol: 'TCP'
      },
      {
        id: 'rule_2',
        instruction: 'Regola 2 (Database Backend): Consenti la replica solo tra Web Server (192.168.1.10) e DB interno (10.0.0.50).',
        scenario: 'Bloccare qualsiasi accesso diretto dall\'esterno alla porta database 3306.',
        ruleAction: 'ALLOW',
        sourceIp: '192.168.1.10/32',
        destinationPort: '3306 (MySQL)',
        protocol: 'TCP'
      },
      {
        id: 'rule_3',
        instruction: 'Regola 3 (Management Hardening): Blocca protocolli non crittografati Telnet (porta 23) da qualsiasi sorgente.',
        scenario: 'Conformità NIST SP 800-53: divieto assoluto di credenziali in chiaro.',
        ruleAction: 'DENY',
        sourceIp: '0.0.0.0/0 (ANY)',
        destinationPort: '23 (Telnet)',
        protocol: 'TCP'
      },
      {
        id: 'rule_4',
        instruction: 'Regola 4 (Default Posture): Applica la regola di chiusura implicita su tutto il traffico non specificato.',
        scenario: 'Principio di Least Privilege e Zero Trust Architecture.',
        ruleAction: 'DENY',
        sourceIp: '0.0.0.0/0 (ANY)',
        destinationPort: 'ANY (*)',
        protocol: 'TCP'
      }
    ],
    solutionExplanation: 'Configurazione conforme a CompTIA Security+ SY0-701 Domain 3 (Security Architecture). L\'impiego della regola deny implicito finale e la segmentazione tra DMZ e rete database interna impedisce il movimento laterale in caso di web shell.',
    xpReward: 250,
    eloReward: 50
  },
  {
    id: 'pbq_ceh_killchain',
    title: 'PBQ Lab 2: Ransomware Kill-Chain Forensic Reconstruction',
    certification: 'CEH v13',
    scenarioDescription: 'Un endpoint aziendale ha subito crittografia da parte del gruppo BlackCat/ALPHV. Devi ricostruire la sequenza cronologica corretta dell\'intrusione analizzando i tre artefatti digitali estratti.',
    targetObjective: 'Associa ciascun artefatto alla rispettiva fase del MITRE ATT&CK Framework: Infiltrazione Iniziale -> Credential Dumping -> C2 Exfiltration.',
    steps: [
      {
        id: 'kc_1',
        instruction: 'Artefatto A: Word document con macro VBA invocante PowerShell con flag -ExecutionPolicy Bypass.',
        scenario: 'MITRE T1566: Phishing Attachment.',
        ruleAction: 'ALLOW',
        sourceIp: 'FIN_REPORT_Q3.docm',
        destinationPort: 'PowerShell.exe',
        protocol: 'TCP'
      },
      {
        id: 'kc_2',
        instruction: 'Artefatto B: Processo rundll32.exe che inietta comsvcs.dll per creare il minidump di LSASS in C:\\temp\\lsass.dmp.',
        scenario: 'MITRE T1003.001: OS Credential Dumping: LSASS Memory.',
        ruleAction: 'DENY',
        sourceIp: 'lsass.exe',
        destinationPort: 'comsvcs.dll',
        protocol: 'TCP'
      },
      {
        id: 'kc_3',
        instruction: 'Artefatto C: Connessione DNS con query Base64 verso *.update-auth-telemetry.xyz a intervalli di 60s con 10% Jitter.',
        scenario: 'MITRE T1071.004: C2 Communication via DNS Tunneling.',
        ruleAction: 'DENY',
        sourceIp: '192.168.10.14',
        destinationPort: '53 (DNS)',
        protocol: 'UDP'
      }
    ],
    solutionExplanation: 'Ricostruzione della sequenza MITRE ATT&CK: Esecuzione iniziale tramite Macro Office malevola, estrazione delle credenziali in memoria da LSASS per escalation dei privilegi, e stabilizzazione del canale di Comando e Controllo tramite DNS tunneling.',
    xpReward: 300,
    eloReward: 60
  }
];
