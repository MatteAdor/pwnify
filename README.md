# ZeroDay (0xDAY) 🛡️⚡
> **Gamified Cybersecurity, Web Hacking & IT Certification Training Platform**  
> *A high-velocity hybrid between CyberClash, Mimo, and Chess.com engineered for elite Red & Blue teamers.*

---

## ⚡ Overview
**ZeroDay** (`0xDAY`) is an interactive, gamified learning platform designed to prepare operators and engineers for top-tier cybersecurity certifications (**CompTIA Security+ SY0-701**, **Cisco CCNA 200-301**, **CEH v13**) and real-world penetration testing scenarios.

---

## 🎮 Core Pillars & Features

### 1. Tactical Skill Tree & Dynamic Difficulty
- **Modulo 0 (Fondamenta Cyber & Terminale Operativo):** Terminal navigation (`pwd`, `ls -la`, FHS hierarchy), HTTP status codes (200, 404), HTTPS port 443 vs 80, and one-way cryptographic hashing (SHA-256 vs plaintext).
- **OWASP Top 10 & Advanced Exploits:** SQL Injection, SSRF AWS IMDSv1 token exfiltration, Linux Privilege Escalation (SUID, GTFOBins), and Network Packet Dissection.
- **Interactive Challenges:**
  - *Spot the Zero-Day:* Touch/click the exact vulnerable line in raw source code.
  - *Interactive Terminal Sandbox:* Real simulated shell prompt (`root@zeroday-lab:~#`) with clickable command chips and raw keyboard typing.
  - *Packet Analysis:* Header inspection and Wireshark protocol filters.

### 2. 1v1 Blitz Arena (Chess.com Style Matchmaking)
- **ELO Rating Engine:** Real ELO progression system (0 to 2000+) across 5 tiers:
  - `Script Kiddie` (0 - 1199 ELO)
  - `Packet Sniffer` (1200 - 1399 ELO)
  - `Red Teamer` (1400 - 1599 ELO)
  - `APT Operator` (1600 - 1899 ELO)
  - `ZeroDay Hunter` (1900+ ELO)
- **Dynamic 34-Challenge Pool:** Matches draw 5 distinct challenges weighted by operator ELO.
- **Fisher-Yates Shuffle Engine:** All multiple-choice options and terminal chips are randomly permuted on every single turn to eliminate predictable patterns.
- **Deep-Linked Duel Challenges:** Share URL challenges (`?seed=...&elo=...&challenger=...&score=...`) to face ghost opponents with synchronized scores.

### 3. Exam Boss Simulator & PBQ Labs
- Official exam simulations for CompTIA Security+, CCNA, and CEH.
- **Interactive Performance-Based Questions (PBQs):** Configure stateful firewall ACL tables (ALLOW/DENY rules, IP subnets, port ranges) and trace ransomware kill chains across timeline logs.

### 4. Zero-Dependency Web Audio Engine
- Built directly on the native **Web Audio API** (synthesized dual-oscillator frequencies, cyber-chords, ping sonars, and tick counters). Zero external audio dependencies.

---

## 🛠️ Tech Stack
- **Framework:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler:** [Vite 8](https://vitejs.dev/)
- **Styling:** [Tailwind CSS 3](https://tailwindcss.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Visuals:** [Canvas Confetti](https://www.npmjs.com/package/canvas-confetti)
- **Audio:** Native Web Audio API (`AudioContext`)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or pnpm

### Installation
```bash
# Clone the repository
git clone https://github.com/DarkMatteo/zeroday_app.git

# Navigate to project directory
cd zeroday_app

# Install dependencies
npm install

# Start development server
npm run dev
```

### Production Build
```bash
# Compile TypeScript and bundle assets
npm run build

# Preview production build locally
npm run preview
```

---

## 🔐 License & Production Modes
- Built with God Mode testing hooks (`?godmode=0xadmin`).
- Offline cryptographic license validation (`0xPRO-...`).

---

*Engineered by DarkMatteo, FortuJack09 & Ritmada.*
