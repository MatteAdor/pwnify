# ZeroDay Engineering & Product Standards (Antigravity Ruleset)

This ruleset binds all development, architecture, content creation, and refactoring within `zeroDay_app`.

---

## 1. CRO, Onboarding & Paywalls (`coreyhaines31/marketingskills`)

- **Onboarding CRO**:
  - The first 5 steps must deliver instant value and immediate positive dopamine feedback.
  - Never present complex exploits or opaque terminology (e.g., SUID binary abuse, ROP chains) in initial diagnostic checks for beginners.
  - First-time user experience (FTUE) must be calibrated to the user's declared knowledge level (`Script Kiddie` vs `Red Teamer`).
- **Paywall Architecture**:
  - Use contextual triggers (`blurred_breakdown`, `win_streak_trap`, `exam_simulator_lock`, `loss_aversion_bounty`).
  - Never use artificial scarcity timers, fake countdowns, fake reviews, or exit-intent downsell traps.
  - Support authentic Stripe checkout and offline cryptographic license key validation.

---

## 2. React 19 Best Practices & Mobile Touch Targets (`vercel-labs/agent-skills`)

- **State & Shuffling Stability**:
  - When shuffling question options or command chips (`shuffleArray`), NEVER execute shuffles inside inline render functions.
  - In `useMemo`, bind dependencies to primitive question IDs (`[currentQ?.id]`), NOT whole object references, preventing unwanted re-shuffles during timer ticks, input typing, or option selection.
  - In PvP timer intervals, ensure question options remain strictly immutable for the duration of the round.
- **Mobile Touch Targets (`web-design-guidelines`)**:
  - Interactive elements (especially code lines in "Spot the Zero-Day" and terminal command chips) MUST have a minimum touch target of 44x44px (or min-h-[40px] with adequate hit padding).
  - Code lines must have `select-none` and generous horizontal padding to prevent selection gestures from interfering with taps on mobile devices.

---

## 3. UI Polish & Playwright Testing (`anthropics/skills`)

- **Cyber-HUD Visual Hierarchy**:
  - High-contrast, dark-mode-first aesthetic with glowing phosphor accents (`#10B981` emerald, `#06B6D4` cyan, `#F59E0B` amber).
  - Audio-tactile feedback: pair every user action (tap, correct exploit, blocked payload, radar ping) with synthetic Web Audio API frequencies.
- **Test Automation (`webapp-testing`)**:
  - Ensure automated verification of question variability, avoiding duplicate challenges and confirming answer position randomness.

---

## 4. Systematic Debugging (`obra/superpowers`)

- **Root Cause First**:
  - Before modifying matchmaking algorithms or state persistence, analyze the root cause (e.g., token passing in git remotes, dependency triggers in React hooks).
  - Maintain defensive sanitization (`sanitizeCallsign`, `sanitizeAlphanumeric`, `clampNumber`, `safeJsonParse`) across all user-controlled inputs and URL parameters.

---

## 5. Content Generation Benchmark: `tldr-pages/tldr` & `OWASP/CheatSheetSeries`

- **Beginner & Modulo 0 Grounding**:
  - For all foundational / beginner modules (Modulo 0, IT Fundamentals, Day 1 onboarding):
    * **DO NOT** extrapolate or pull high-level zero-day exploits from raw LLM weights.
    * **MANDATORY SOURCE**: Anchor questions directly to standard 1-line command examples from **`tldr-pages/tldr`** (`ls`, `cd`, `pwd`, `cat`, `chmod`, `curl`, `ping`, `grep`, `ssh`, `ip`, `netstat`, `find`).
    * Keep questions focused on practical utility (e.g., "how to view hidden dotfiles", "how to follow redirects with curl", "how to inspect open listening ports").
- **Web Security & Defense Grounding**:
  - Anchor intermediate and advanced web security topics directly to the **OWASP Cheat Sheet Series**:
    * SQL Injection Prevention (Parameterized queries & ORM boundaries)
    * Cross-Site Scripting (Context-aware output escaping & CSP)
    * Authentication, Session Management & Password Storage (Argon2id/bcrypt)
    * CSRF Prevention (SameSite cookies & anti-forgery tokens)
    * Security Headers (HSTS, Content-Security-Policy, X-Content-Type-Options)
