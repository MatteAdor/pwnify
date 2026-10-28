# ZeroDay (`0xDAY`)

**Gamified cybersecurity, web hacking, and IT certification training.**

![React](https://img.shields.io/badge/React_19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite_8-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_3-06B6D4?logo=tailwindcss&logoColor=white)

## Overview

ZeroDay (`0xDAY`) is an interactive, gamified learning platform that prepares security practitioners and engineers for leading industry certifications and real-world penetration-testing scenarios. It pairs the structured, bite-sized progression of modern learning apps with chess-style competitive matchmaking, and is built for Red and Blue Team professionals.

**Supported certification tracks**

- CompTIA Security+ (SY0-701)
- Cisco Certified Network Associate, CCNA (200-301)
- EC-Council Certified Ethical Hacker, CEH (v13)

## Key Features

### 1. Tactical Skill Tree & Dynamic Difficulty

A structured curriculum that progresses from core fundamentals to advanced exploitation techniques:

- **Module 0 — Cyber Fundamentals & Operational Terminal:** command-line navigation (`pwd`, `ls -la`, Filesystem Hierarchy Standard), HTTP status codes (`200`, `404`), HTTP vs. HTTPS (ports `80` and `443`), and one-way cryptographic hashing (SHA-256 vs. plaintext storage).
- **OWASP Top 10 & Advanced Exploitation:** SQL injection, SSRF targeting the AWS instance metadata service (IMDSv1) for token exfiltration, Linux privilege escalation (SUID binaries, GTFOBins), and network packet dissection.

**Interactive challenge formats**

| Challenge | Description |
|---|---|
| **Spot the Zero-Day** | Tap or click the exact vulnerable line in raw source code. |
| **Interactive Terminal Sandbox** | A simulated shell (`root@zeroday-lab:~#`) supporting both clickable command chips and free keyboard input. |
| **Packet Analysis** | Header inspection and Wireshark display-filter exercises. |

### 2. 1v1 Blitz Arena

Competitive duels with chess-style, rating-based matchmaking.

**ELO rating engine** — a full progression system from 0 to 2000+ across five ranked tiers:

| Tier | ELO Range |
|---|---|
| Script Kiddie | 0 – 1199 |
| Packet Sniffer | 1200 – 1399 |
| Red Teamer | 1400 – 1599 |
| APT Operator | 1600 – 1899 |
| ZeroDay Hunter | 1900+ |

**Additional capabilities**

- **Dynamic challenge pool:** each match draws five distinct challenges from a pool of 34, weighted by the player's ELO.
- **Fisher–Yates randomization:** answer options and terminal command chips are reshuffled on every turn to eliminate predictable patterns.
- **Deep-linked duels:** share a challenge URL (`?seed=…&elo=…&challenger=…&score=…`) to face a ghost opponent with a synchronized score.

### 3. Exam Boss Simulator & PBQ Labs

- **Exam-style simulations** for CompTIA Security+, Cisco CCNA, and CEH.
- **Interactive Performance-Based Questions (PBQs):** configure stateful firewall ACL tables (ALLOW/DENY rules, IP subnets, port ranges) and reconstruct ransomware kill chains from timeline logs.

### 4. Zero-Dependency Audio Engine

Built directly on the native Web Audio API, with synthesized dual-oscillator tones, cyber-style chords, sonar pings, and countdown ticks. No external audio libraries or assets required.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| Build tool | [Vite 8](https://vite.dev/) |
| Styling | [Tailwind CSS 3](https://tailwindcss.com/) |
| Icons | [Lucide React](https://lucide.dev/) |
| Visual effects | [canvas-confetti](https://www.npmjs.com/package/canvas-confetti) |
| Audio | Native Web Audio API (`AudioContext`) |

## Getting Started

### Prerequisites

- Node.js 20.19+ or 22.12+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/DarkMatteo/zeroday_app.git

# Navigate to the project directory
cd zeroday_app

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Production build

```bash
# Type-check and bundle for production
npm run build

# Preview the production build locally
npm run preview
```

## Licensing

PRO access is activated through offline cryptographic license validation. Internal testing utilities are available in development builds only.

## Disclaimer

ZeroDay is an independent educational project and is not affiliated with, endorsed by, or sponsored by CompTIA, Cisco, or EC-Council. All trademarks are the property of their respective owners. The offensive techniques covered by this platform must only be applied in environments you own or are explicitly authorized to test.

## Authors

Developed by [DarkMatteo](https://github.com/MatteAdor), [FortuJack09](https://github.com/GiacomoFortunati), and Antigravity.
