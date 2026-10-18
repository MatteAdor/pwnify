import { DailyBounty, PbqLab } from '../types';

export const INITIAL_DAILY_BOUNTIES: DailyBounty[] = [
  {
    id: 'bounty_terminal',
    title: 'Terminal Injection Specialist',
    description: 'Successfully complete 1 command line challenge in the Terminal Sandbox',
    progress: 0,
    target: 1,
    isCompleted: false,
    freeClaimed: false,
    proClaimed: false,
    freeXp: 50,
    proXp: 150,
    proTickets: 2
  },
  {
    id: 'bounty_pvp',
    title: 'ZeroDay Arena Gladiator',
    description: 'Win 1 Blitz 1v1 match in the Cyber Arena against another operator or bot',
    progress: 0,
    target: 1,
    isCompleted: false,
    freeClaimed: false,
    proClaimed: false,
    freeXp: 50,
    proXp: 150,
    proTickets: 2
  },
  {
    id: 'bounty_zeroday',
    title: '0-Day Code Inspector',
    description: 'Identify 2 flawed lines of code in Spot the Zero-Day mode',
    progress: 0,
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
    scenarioDescription: 'A public Web Server (192.168.1.10) and an internal Database (10.0.0.50) are positioned behind a perimeter firewall. Analysts have detected direct SSH and Telnet probe connection attempts arriving from the WAN.',
    targetObjective: 'Configure Access Control Lists (ACLs) to allow secure HTTPS inbound to DMZ, permit the Web Server to query the Database MySQL port, and apply an explicit implicit Deny rule.',
    steps: [
      {
        id: 'rule_1',
        instruction: 'Rule 1 (Web Inbound): Allow encrypted web traffic from external networks (Any WAN) to Web Server (192.168.1.10).',
        scenario: 'Permit legitimate external users to access the portal via port 443.',
        ruleAction: 'ALLOW',
        sourceIp: '0.0.0.0/0 (ANY)',
        destinationPort: '443 (HTTPS)',
        protocol: 'TCP'
      },
      {
        id: 'rule_2',
        instruction: 'Rule 2 (Database Backend): Allow database traffic exclusively between Web Server (192.168.1.10) and internal DB (10.0.0.50).',
        scenario: 'Block any direct access from the external internet to database port 3306.',
        ruleAction: 'ALLOW',
        sourceIp: '192.168.1.10/32',
        destinationPort: '3306 (MySQL)',
        protocol: 'TCP'
      },
      {
        id: 'rule_3',
        instruction: 'Rule 3 (Management Hardening): Deny unencrypted Telnet protocols (port 23) from all sources.',
        scenario: 'NIST SP 800-53 Compliance: absolute prohibition of plaintext remote administration credentials.',
        ruleAction: 'DENY',
        sourceIp: '0.0.0.0/0 (ANY)',
        destinationPort: '23 (Telnet)',
        protocol: 'TCP'
      },
      {
        id: 'rule_4',
        instruction: 'Rule 4 (Default Posture): Apply implicit Deny rule on all remaining unspecified traffic.',
        scenario: 'Principle of Least Privilege and Zero Trust Architecture.',
        ruleAction: 'DENY',
        sourceIp: '0.0.0.0/0 (ANY)',
        destinationPort: 'ANY (*)',
        protocol: 'TCP'
      }
    ],
    solutionExplanation: 'Compliant with CompTIA Security+ SY0-701 Domain 3 (Security Architecture). Applying an implicit deny-all rule and isolating DMZ from internal database subnets prevents lateral movement in the event of web shell compromise.',
    xpReward: 250,
    eloReward: 50
  },
  {
    id: 'pbq_ceh_killchain',
    title: 'PBQ Lab 2: Ransomware Kill-Chain Forensic Reconstruction',
    certification: 'CEH v13',
    scenarioDescription: 'An enterprise endpoint was encrypted by BlackCat/ALPHV ransomware. Reconstruct the correct chronological intrusion sequence by analyzing three recovered forensic artifacts.',
    targetObjective: 'Map each artifact to its corresponding phase of the MITRE ATT&CK Framework: Initial Access -> Credential Dumping -> C2 Exfiltration.',
    steps: [
      {
        id: 'kc_1',
        instruction: 'Artifact A: Word document containing VBA macro invoking PowerShell with -ExecutionPolicy Bypass flag.',
        scenario: 'MITRE T1566: Phishing Attachment.',
        ruleAction: 'ALLOW',
        sourceIp: 'FIN_REPORT_Q3.docm',
        destinationPort: 'PowerShell.exe',
        protocol: 'TCP'
      },
      {
        id: 'kc_2',
        instruction: 'Artifact B: rundll32.exe process executing comsvcs.dll to generate an LSASS memory minidump in C:\\temp\\lsass.dmp.',
        scenario: 'MITRE T1003.001: OS Credential Dumping: LSASS Memory.',
        ruleAction: 'DENY',
        sourceIp: 'lsass.exe',
        destinationPort: 'comsvcs.dll',
        protocol: 'TCP'
      },
      {
        id: 'kc_3',
        instruction: 'Artifact C: DNS beaconing connection with Base64 queries to *.update-auth-telemetry.xyz at 60s intervals with 10% Jitter.',
        scenario: 'MITRE T1071.004: C2 Communication via DNS Tunneling.',
        ruleAction: 'DENY',
        sourceIp: '192.168.10.14',
        destinationPort: '53 (DNS)',
        protocol: 'UDP'
      }
    ],
    solutionExplanation: 'MITRE ATT&CK kill-chain reconstruction: Initial Execution via malicious Office Macro, memory extraction of LSASS credentials for privilege escalation, and establishing Command and Control persistence via DNS tunneling.',
    xpReward: 300,
    eloReward: 60
  },
  {
    id: 'pbq_ids_c2_mitigation',
    title: 'PBQ Lab 3: Snort / Suricata IDS Rule & C2 Beacon Mitigation',
    certification: 'CompTIA Security+',
    scenarioDescription: 'Corporate hosts are transmitting anomalous HTTP requests to suspicious external endpoints. Configure IDS/IPS rules to intercept C2 beaconing and enforce signature dropping.',
    targetObjective: 'Configure IDS rule action (ALERT / DROP), protocol (TCP/UDP), destination port, and protected internal subnet to neutralize C2 malware communications.',
    steps: [
      {
        id: 'ids_rule_1',
        instruction: 'Rule 1 (IPS Drop Signature): Configure rule action to immediately drop outbound C2 traffic towards proxy port 8443.',
        scenario: 'Inline automated blocking: drop the packet and inject TCP Reset.',
        ruleAction: 'DENY',
        sourceIp: '192.168.1.0/24 ($HOME_NET)',
        destinationPort: '8443 (C2 Proxy)',
        protocol: 'TCP'
      },
      {
        id: 'ids_rule_2',
        instruction: 'Rule 2 (DNS Exfiltration Alert): Generate priority SIEM alert for DNS queries directed at external unauthorized resolvers (port 53).',
        scenario: 'Anomaly detection: only enterprise resolver 192.168.1.2 may contact external DNS root servers.',
        ruleAction: 'ALLOW',
        sourceIp: '192.168.1.2/32 (DNS Resolver)',
        destinationPort: '53 (DNS)',
        protocol: 'UDP'
      },
      {
        id: 'ids_rule_3',
        instruction: 'Rule 3 (Compromised Host Quarantine): Block all SMB traffic (port 445) from infected workstation (192.168.1.88) to halt EternalBlue lateral movement.',
        scenario: 'Immediate containment: prevent worm propagation across the local subnet.',
        ruleAction: 'DENY',
        sourceIp: '192.168.1.88/32',
        destinationPort: '445 (SMB)',
        protocol: 'TCP'
      }
    ],
    solutionExplanation: 'Cisco CCNA Security and CompTIA Security+ SY0-701 aligned configuration. Inline blocking of non-standard port traffic (8443) and quarantining SMB 445 prevents lateral movement while preserving overall enterprise network availability.',
    xpReward: 320,
    eloReward: 65
  }
];
