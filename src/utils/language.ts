import { useState, useEffect } from 'react';

export type Language = 'en' | 'it';

const LANGUAGE_STORAGE_KEY = 'zeroday_language_v1';

export function getSavedLanguage(): Language {
  try {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved === 'it' || saved === 'en') return saved;
    }
  } catch {}
  return 'en'; // Default
}

export function saveLanguage(lang: Language): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      window.dispatchEvent(new CustomEvent('zeroday_language_change', { detail: lang }));
    }
  } catch {}
}

export const TRANSLATIONS = {
  en: {
    // Auth & Navigation
    authGateway: '0XDAY // AUTHENTICATION GATEWAY',
    academyTitle: 'Cyber Warfare Academy',
    academySubtitle: 'CompTIA Security+, Cisco CCNA & CEH Exam Simulator.',
    loginTab: 'LOG IN',
    signupTab: 'SIGN UP (2FA)',
    loginWithGoogle: 'Sign in with Google',
    loginWithGithub: 'Sign in with GitHub',
    orViaEmail: 'or via email',
    operatorCallsignOrEmail: 'Username or Email',
    operatorCallsignPlaceholder: 'user@example.com or GhostRider',
    password: 'Password',
    loginButton: 'ACCESS THE PLATFORM',
    forgotPassword: 'Forgot password? Log in with 2FA Email Code',
    exploreAsGuest: 'Explore as Anonymous Guest (Limited Sandbox Access) →',
    privacyPolicy: 'Privacy Policy',
    termsOfService: 'Terms of Service',
    refund: 'Refund',
    cookies: 'Cookie Policy',
    
    // Sign Up 2FA
    stepEmail: '1. Email',
    step2FA: '2. 2FA Code',
    stepPassword: '3. Password',
    enterEmailLabel: 'Email Address',
    send2FACodeBtn: 'SEND 2FA SECURITY CODE',
    enter2FACodeLabel: 'Enter 6-Digit 2FA Code',
    verify2FACodeBtn: 'VERIFY & PROCEED',
    callsignLabel: 'Username / Callsign',
    createPasswordLabel: 'Create Secure Password (min 6 chars)',
    confirmPasswordLabel: 'Confirm Password',
    termsConsentPrefix: 'I declare that I have read and agree to the',
    termsConsentAnd: 'and the',
    ageConsentLabel: 'I confirm that I am at least 16 years of age (or have parental consent) for learning data processing.',
    completeSignupBtn: 'COMPLETE REGISTRATION & ENTER',
    rateLimitWarning: 'Too many failed login attempts. Security lockout active:',
    secondsRemaining: 'seconds remaining',
    
    // Auth Profile Modal
    activeProfileTitle: 'Active Profile',
    activeProfileSubtitle: 'Manage your session and sync progress.',
    callsign: 'CALLSIGN:',
    rating: 'RATING:',
    status: 'STATUS:',
    statusFree: 'Standard Free Account',
    statusPro: 'PRO Active Member',
    logoutBtn: 'TERMINATE SESSION (LOGOUT)',
    deleteAccountBtn: 'Delete Account & Personal Data',
    deleteConfirmWarning: '[WARNING] Are you sure you want to permanently delete this account and all progress? This action is immediate and irreversible.',
    deleteConfirmYes: 'YES, DELETE EVERYTHING',
    deleteConfirmCancel: 'Cancel',

    // Settings Modal
    settingsConfig: 'CONFIGURATION // ACCOUNT',
    settingsSubtitle: 'Account parameters & settings',
    activeOperator: 'ACTIVE ACCOUNT',
    professionLabel: 'CHOSEN PROFESSION',
    rankTierLabel: 'RANK TIER',
    callsignTitleLabel: 'CALLSIGN TITLE',
    nextRankLabel: 'NEXT TIER',
    pointsToPromote: 'ELO to promote',
    apexRankAchieved: 'APEX RANK REACHED',
    changeCallsign: 'Edit',
    newCallsignPlaceholder: 'New Callsign (min 3 chars)',
    saveBtn: 'Save',
    cooldownNote: '*First change is immediate; subsequent edits have a 7-day cooldown.',
    languageSection: 'Language / Lingua',
    languageSub: 'Select interface & questions language',
    hudSection: 'CUSTOMIZATION & HUD',
    cyberArsenalTitle: 'Cyber Arsenal & Terminal Themes',
    cyberArsenalSub: 'Customize CRT phosphors and callsign badge',
    openBtn: 'Open',
    audioEffectsTitle: 'Web Audio Sound Effects',
    audioEffectsSub: 'Synthesized oscillators for tactile feedback',
    soundActive: 'ACTIVE',
    soundMuted: 'MUTED',
    proLicenseTitle: 'Pwnify License Status',
    proLicenseDesc: 'Full access to official CompTIA, CCNA, and CEH exam simulators, PBQ labs, and unlimited arena.',

    // Onboarding
    selectLanguageLabel: 'Language / Lingua:',
    diagPhaseTitle: 'PHASE 1: DIAGNOSTIC AUDIT',
    stepOf: 'STEP',
    of: 'OF 5',
    onboardingStep1Title: 'What is your primary cybersecurity goal?',
    onboardingStep1Desc: 'Pwnify adapts attack vectors and terminal simulations to your career path.',
    onboardingStep2Title: 'What is your current experience level?',
    onboardingStep2Desc: 'We calibrate the initial diagnostic benchmark challenge to your baseline.',
    onboardingStep3Title: 'How much time can you commit daily?',
    onboardingStep3Desc: 'Daily consistency builds automatic reflexes during live cybersecurity incidents.',
    onboardingStep4Title: 'Live Diagnostic Benchmark',
    onboardingStep4Desc: 'Solve these technical scenarios to measure your initial Cybersecurity Readiness Score.',
    onboardingStep5Title: 'Calculating Tactical Telemetry...',
    onboardingStep5Complete: 'Telemetry Calibration Complete!',
    enterAcademyBtn: 'ENTER CYBER WARFARE ACADEMY',
    continueBtn: 'CONTINUE',
    submitPayloadBtn: 'SUBMIT PAYLOAD',
    nextScenarioBtn: 'NEXT SCENARIO',

    // Goals
    goalSecPlusTitle: 'Pass CompTIA Security+ / CCNA / CEH',
    goalSecPlusDesc: 'IT Certification Goal: PBQ exam question simulations and hands-on labs',
    goalWebTitle: 'Web Hacking & Bug Bounty Hunter',
    goalWebDesc: 'OWASP Top 10, SQLi, XSS, SSRF, IDOR, and Web Application Firewall evasion',
    goalLinuxTitle: 'Linux Kernel & Bash Scripting Mastery',
    goalLinuxDesc: 'Privilege escalation, GTFOBins, cron automation, permissions analysis, and rootkits',
    goalSocTitle: 'SOC Analyst & Blue Team Defense',
    goalSocDesc: 'Threat hunting, Wireshark packet analysis, SIEM alert triage, and C2 detection',
    
    // Levels
    levelBeginnerTitle: 'Beginner / Script Kiddie',
    levelBeginnerDesc: 'Familiar with basic computer concepts, but have never run exploits or configured VLANs.',
    levelIntermediateTitle: 'Developer / Sysadmin / IT Student',
    levelIntermediateDesc: 'Regularly use Linux or write code, know TCP/IP protocols, but no formal red team practice.',
    levelAdvancedTitle: 'Junior Pentester / SOC Analyst',
    levelAdvancedDesc: 'Completed labs on TryHackMe / HackTheBox, aiming to maximize speed and exam accuracy.',

    // Commitments
    commit5Label: '5 min / day',
    commit5Desc: 'Quick Audit (1 module per day)',
    commit15Label: '15 min / day',
    commit15Desc: 'Red Teamer Drill (Recommended for certifications)',
    commit30Label: '30 min / day',
    commit30Desc: 'Pwnify Grind (Intensive 21-day boot camp)',

    // Navbar
    dailyStreak: 'Daily Streak',
    arenaTickets: 'Arena Tickets',
    tryPro: 'TRY PRO',
    proActiveBadge: 'PRO ACTIVE',
    logInNav: 'LOG IN',
    soundToggle: 'Toggle Sound FX',
    
    // BottomNav
    navSkillTree: 'Skill Tree',
    navSkillTreeSub: 'Missions',
    navArena: 'Arena 1v1',
    navArenaSub: 'Blitz PvP',
    navLeagues: 'Leagues',
    navLeaguesSub: 'Top 3',
    navMissions: 'Bounties',
    navMissionsSub: 'Challenges',
    navRadar: 'Readiness',
    navRadarSub: 'Analytics',
    navCerts: 'Cert Prep',
    navCertsSub: 'Sec+/CCNA',

    // Skill Tree & Missions Roadmap
    operationalRoadmap: 'OPERATIONAL ROADMAP',
    missionsTitle: 'Tactical Missions',
    missionsSubtitle: 'Each mission contains guided lessons + a final practical exam.',
    backToMissions: '← Back to Missions',
    missionProgress: 'Mission Progress',
    completed: 'COMPLETED',
    inProgress: 'IN PROGRESS',
    lockedPro: 'ZERO-DAY PRO',
    explanationBadge: 'EXPLANATION',
    finalTestBadge: 'FINAL TEST',
    lessonWord: 'LESSON',
    lessonsCountWord: 'Lessons',
    guidedLessonsWord: 'guided + 1 final test',
    startCheckpointBtn: 'START PRACTICAL CHECKPOINT',
    startTestBtn: 'START FINAL MISSION TEST',
    dailyBreachTitle: 'Daily 0xBreach',
    dailyBreachDesc: 'Analyze today\'s CVE code vulnerability and pinpoint the root cause before threat actors.',
    startDailyBreach: 'START ZERO-DAY TRIAGE (+150 XP)',
    triageCompletedToday: 'TRIAGE COMPLETED TODAY (REVIEW)',
    triageStreak: 'TRIAGE STREAK',
    tacticalToolsTitle: 'Tactical Reference & Cheat Sheets',
    tacticalToolsSub: 'Rapid commands, payloads, and exam reference rules',
    openCommands: 'OPEN COMMANDS →',
    closeCheatSheet: 'CLOSE CHEAT SHEET',
    copiedCmd: 'Copied!',

    // Readiness Radar
    readinessRadarTitle: 'Exam Readiness Radar',
    readinessRadarSub: 'Cognitive gap analysis for CompTIA Security+, CCNA, and CEH.',
    passingProbabilityLabel: 'Readiness Index',
    readinessDisclaimer: 'Estimate based on your lab and quiz performance; does not guarantee official exam certification.',
    readinessFormulaTooltip: 'Formula: (Completed Nodes + PBQ Labs x 1.5) / Total Curriculum Weight. Estimate based on your completed progress.',
    probLow: 'Low',
    probMed: 'Medium',
    probHigh: 'High',
    belowPassingThreshold: 'Below passing threshold (75%)',
    abovePassingThreshold: 'Exam Ready (Passed Threshold)',
    hexagonalRadarTitle: 'HEXAGONAL SKILL RADAR',
    yourLevel: 'Your Level',
    proTarget: 'PRO Target (92%)',
    hackerCardBtn: 'HACKER ID CARD (9:16)',

    // Arena 1v1
    blitzArenaTitle: 'Pwnify Cyber Arena',
    blitzArenaSub: 'Challenge training bots or hackers in real-time 60-second Blitz battles.',
    findOpponentBlitz: 'FIND OPPONENT (BLITZ)',
    survivalGauntlet: 'SURVIVAL GAUNTLET',
    leaguesTitle: 'Competitive Leagues',
    leaguesSub: 'Climb weekly divisions by winning arena matches',
    arenaTicketsLabel: 'Arena Tickets',
    unlimitedPro: 'UNLIMITED PRO',

    // Cert Prep
    certHeaderBadge: 'OFFICIAL CERTIFICATION ROADMAP',
    certHeaderSub: 'PBQ EXAM SIMULATOR',
    certHeaderTitle: 'Official Exam Simulator & Hands-On PBQs',
    certHeaderDesc: 'Certified preparation for CompTIA Security+, CCNA, Network+, and A+. Face authentic Performance-Based Questions (PBQs) and pass your exam on the first attempt.',
    passProbability: 'READINESS INDEX',
    quickCheckBtn: 'Quick Check (5 Real Questions)',
    pbqLabBtnPro: 'Hands-On PBQ Lab (PRO)',
    pbqLabBtnActive: 'Launch PBQ Lab',

    // OAuth & OTP Modals
    googleOAuthTitle: 'Sign in with Google',
    googleOAuthSubtitle: 'Pwnify Cyber Academy OAuth',
    googleOAuthDesc: 'Sign in with your Google account to synchronize your progress.',
    googleInstantAccess: 'Instant 1-Click Access',
    googleInstantBtn: 'Sign in with Google',
    orEnterGmail: 'Or enter your Gmail address:',
    confirmAndSignIn: 'Confirm & Sign In',
    githubOAuthTitle: 'Authorize with GitHub',
    githubOAuthSubtitle: 'Pwnify Developer OAuth',
    githubOAuthDesc: 'Connect your GitHub profile to sync your account and certifications.',
    githubInstantAccess: 'Quick Developer Access',
    githubInstantBtn: 'Authorize with GitHub',
    orEnterGithubHandle: 'Or enter your GitHub username:',
    authorizeGithubBtn: 'Authorize GitHub Username',
    emailOtpTitle: 'Quick 2FA Email Sign-In',
    emailOtpDesc: 'Log in instantly by entering the 6-digit security code dispatched to your inbox.',
    yourEmail: 'Your Email',
    sendOtpBtn: 'SEND 2FA OTP CODE',
    enterReceivedCode: 'Enter the 6-digit code received',
    verifyAndEnterBtn: 'VERIFY & ENTER',

    // Onboarding Steps & Diagnostic
    backBtn: 'Back',
    verifyAnswerBtn: 'VERIFY ANSWER',
    nextQuestionBtn: 'NEXT QUESTION',
    calcReadinessBtn: 'CALCULATE READINESS SCORE',
    attackSuccess: 'ATTACK SUCCESSFUL',
    payloadBlocked: 'PAYLOAD INTERCEPTED / INCORRECT',
    analyzingVulns: 'ANALYZING VULNERABILITIES...',
    scanningGaps: 'Scanning gaps on OWASP Top 10, TCP/IP, Linux Kernel',
    initialEvalComplete: 'INITIAL TECHNICAL EVALUATION COMPLETE',
    baseReadiness: 'BASE READINESS',
    certBenchmark: 'CERT BENCHMARK',
    onboardingSummaryText: 'The diagnostic test mapped your current technical baseline. Practical lab tracks on CompTIA Security+, CCNA, and CEH will guide you step by step to full certification readiness.',
    exploreProPlansBtn: 'EXPLORE TRACK & PRO PLANS',
    continueFreeBtn: 'Continue with Free Account',
    tapVulnerableLine: 'TERMINAL_VIEWER // TAP THE VULNERABLE LINE',
    clickToSelect: 'CLICK TO SELECT',
    liveScore: 'Live score:',
    challenge: 'Challenge',
    recommendedBadge: 'RECOMMENDED',

    // Cookie Banner
    cookieBannerTitle: 'Cookie Policy & Privacy',
    cookieZeroProfiling: 'Zero Profiling',
    cookieBannerDesc: 'We use strictly essential technical cookies to manage secure login sessions and persistent progress.',
    cookieAcceptAll: 'Accept All',
    cookieNecessaryOnly: 'Necessary Only',
    cookieCustomizeTitle: 'Customize Cookie Preferences',
    cookieTechnicalTitle: 'Technical (Strictly Necessary)',
    cookieTechnicalAlways: 'Always Active',
    cookieTechnicalDesc: 'Essential for cryptographic auth, session tokens, and security features.',
    cookiePrefTitle: 'Preferences & HUD',
    cookiePrefDesc: 'Saves your CRT phosphor theme and audio volume settings.',
    cookieAnalyticsTitle: 'Anonymous Metrics',
    cookieAnalyticsDesc: 'Detects technical crashes and system latency without personal data.',
    cookieReadPolicy: 'Read Full Cookie Policy →',
    cookieSaveCustom: 'Save Selected Preferences'
  },

  it: {
    // Auth & Navigation
    authGateway: '0XDAY // GATEWAY DI AUTENTICAZIONE',
    academyTitle: 'Accademia di Cyber Warfare',
    academySubtitle: 'Simulatore d\'esame CompTIA Security+, Cisco CCNA & CEH.',
    loginTab: 'ACCEDI',
    signupTab: 'REGISTRATI (2FA)',
    loginWithGoogle: 'Accedi con Google',
    loginWithGithub: 'Accedi con GitHub',
    orViaEmail: 'oppure via email',
    operatorCallsignOrEmail: 'Username o Email',
    operatorCallsignPlaceholder: 'email@dominio.it oppure GhostRider',
    password: 'Password',
    loginButton: 'ACCEDI ALLA PIATTAFORMA',
    forgotPassword: 'Password dimenticata? Accedi con Codice 2FA Email',
    exploreAsGuest: 'Esplora come Ospite Anonimo (Accesso Sandbox Limitato) →',
    privacyPolicy: 'Informativa Privacy',
    termsOfService: 'Termini di Servizio',
    refund: 'Rimborsi',
    cookies: 'Cookie Policy',
    
    // Sign Up 2FA
    stepEmail: '1. Email',
    step2FA: '2. Codice 2FA',
    stepPassword: '3. Password',
    enterEmailLabel: 'Indirizzo Email',
    send2FACodeBtn: 'INVIA CODICE DI SICUREZZA 2FA',
    enter2FACodeLabel: 'Inserisci Codice 2FA a 6 Cifre',
    verify2FACodeBtn: 'VERIFICA E PROCEDI',
    callsignLabel: 'Username / Callsign',
    createPasswordLabel: 'Crea Password Sicura (min 6 caratteri)',
    confirmPasswordLabel: 'Conferma Password',
    termsConsentPrefix: 'Dichiaro di aver letto e accettato i',
    termsConsentAnd: 'e l\'',
    ageConsentLabel: 'Confermo di avere almeno 16 anni (o consenso genitoriale) per il trattamento dei dati di apprendimento.',
    completeSignupBtn: 'COMPLETA REGISTRAZIONE ED ENTRA',
    rateLimitWarning: 'Troppi tentativi falliti. Blocco di sicurezza attivo:',
    secondsRemaining: 'secondi rimanenti',
    
    // Auth Profile Modal
    activeProfileTitle: 'Profilo Attivo',
    activeProfileSubtitle: 'Gestisci la tua sessione e sincronizza i progressi.',
    callsign: 'CALLSIGN:',
    rating: 'PUNTEGGIO:',
    status: 'STATO:',
    statusFree: 'Account Standard Free',
    statusPro: 'Membro PRO Attivo',
    logoutBtn: 'TERMINA SESSIONE (LOGOUT)',
    deleteAccountBtn: 'Elimina Account & Dati Personali',
    deleteConfirmWarning: '[ATTENZIONE] Sei sicuro di voler eliminare definitivamente questo account e tutti i progressi? L\'azione è immediata e irreversibile.',
    deleteConfirmYes: 'SÌ, ELIMINA DEFINITIVAMENTE',
    deleteConfirmCancel: 'Annulla',

    // Settings Modal
    settingsConfig: 'CONFIGURAZIONE // ACCOUNT',
    settingsSubtitle: 'Parametri account & impostazioni',
    activeOperator: 'ACCOUNT ATTIVO',
    professionLabel: 'PROFESSIONE SCELTA',
    rankTierLabel: 'GRADO TIER',
    callsignTitleLabel: 'TITOLO CALLSIGN',
    nextRankLabel: 'PROSSIMO GRADO',
    pointsToPromote: 'ELO per salire',
    apexRankAchieved: 'GRADO APEX RAGGIUNTO',
    changeCallsign: 'Modifica',
    newCallsignPlaceholder: 'Nuovo Callsign (min 3 car.)',
    saveBtn: 'Salva',
    cooldownNote: '*Il primo cambio è immediato; le modifiche successive richiedono 1 settimana di cooldown.',
    languageSection: 'Lingua / Language',
    languageSub: 'Seleziona lingua interfaccia & quiz',
    hudSection: 'PERSONALIZZAZIONE & HUD',
    cyberArsenalTitle: 'Cyber Arsenal & Temi Terminale',
    cyberArsenalSub: 'Personalizza fosfori CRT e callsign badge',
    openBtn: 'Apri',
    audioEffectsTitle: 'Effetti Sonori Web Audio',
    audioEffectsSub: 'Oscillatori sintetizzati per feedback tattile',
    soundActive: 'ATTIVO',
    soundMuted: 'MUTATO',
    proLicenseTitle: 'Stato Licenza Pwnify',
    proLicenseDesc: 'Accesso completo ai simulatori d\'esame ufficiali CompTIA, CCNA e CEH, laboratori PBQ e arena illimitata.',

    // Onboarding
    selectLanguageLabel: 'Lingua / Language:',
    diagPhaseTitle: 'FASE 1: AUDIT DIAGNOSTICO',
    stepOf: 'PASSO',
    of: 'DI 5',
    onboardingStep1Title: 'Qual è il tuo obiettivo primario in cybersecurity?',
    onboardingStep1Desc: 'Pwnify adatta vettori d\'attacco e simulazioni di terminale al tuo percorso professionale.',
    onboardingStep2Title: 'Qual è il tuo livello di esperienza attuale?',
    onboardingStep2Desc: 'Calibriamo la sfida diagnostica iniziale in base al tuo punto di partenza.',
    onboardingStep3Title: 'Quanto tempo puoi dedicare ogni giorno?',
    onboardingStep3Desc: 'La costanza quotidiana crea riflessi automatici durante incidenti di sicurezza reali.',
    onboardingStep4Title: 'Benchmark Diagnostico Live',
    onboardingStep4Desc: 'Risolvi questi scenari tecnici per misurare il tuo Punteggio di Readiness iniziale.',
    onboardingStep5Title: 'Calcolo Telemetria Tattica...',
    onboardingStep5Complete: 'Calibrazione Telemetria Completata!',
    enterAcademyBtn: 'ENTRA NELL\'ACCADEMIA PWNIFY',
    continueBtn: 'CONTINUA',
    submitPayloadBtn: 'INVIA PAYLOAD',
    nextScenarioBtn: 'PROSSIMO SCENARIO',

    // Goals
    goalSecPlusTitle: 'Superare CompTIA Security+ / CCNA / CEH',
    goalSecPlusDesc: 'Obiettivo Certificazioni IT: simulazioni domande PBQ ed esercitazioni pratiche',
    goalWebTitle: 'Web Hacking & Bug Bounty Hunter',
    goalWebDesc: 'OWASP Top 10, SQLi, XSS, SSRF, IDOR ed evasione Web Application Firewall',
    goalLinuxTitle: 'Padronanza Linux Kernel & Bash Scripting',
    goalLinuxDesc: 'Privilege escalation, GTFOBins, automazione cron, analisi permessi e rootkit',
    goalSocTitle: 'SOC Analyst & Difesa Blue Team',
    goalSocDesc: 'Threat hunting, analisi pacchetti Wireshark, triage alert SIEM e rilevamento C2',
    
    // Levels
    levelBeginnerTitle: 'Principiante / Script Kiddie',
    levelBeginnerDesc: 'Conosco le basi del computer, ma non ho mai eseguito exploit o configurato VLAN.',
    levelIntermediateTitle: 'Sviluppatore / Sysadmin / Studente IT',
    levelIntermediateDesc: 'Uso Linux regolarmente o programmo, conosco i protocolli TCP/IP, ma poca pratica red team.',
    levelAdvancedTitle: 'Junior Pentester / SOC Analyst',
    levelAdvancedDesc: 'Ho completato laboratori su TryHackMe / HackTheBox, voglio massimizzare velocità e precisione d\'esame.',

    // Commitments
    commit5Label: '5 min / giorno',
    commit5Desc: 'Audit Veloce (1 modulo al giorno)',
    commit15Label: '15 min / giorno',
    commit15Desc: 'Allenamento Red Teamer (Consigliato per certificazioni)',
    commit30Label: '30 min / giorno',
    commit30Desc: 'Pwnify Grind (Preparazione intensiva in 21 giorni)',

    // Navbar
    dailyStreak: 'Streak Giornaliera',
    arenaTickets: 'Ticket Arena',
    tryPro: 'PROVA PRO',
    proActiveBadge: 'PRO ATTIVO',
    logInNav: 'ACCEDI',
    soundToggle: 'Audio Effetti',

    // BottomNav
    navSkillTree: 'Skill Tree',
    navSkillTreeSub: 'Missioni',
    navArena: 'Arena 1v1',
    navArenaSub: 'Duelli Blitz',
    navLeagues: 'Leghe',
    navLeaguesSub: 'Classifica',
    navMissions: 'Taglie',
    navMissionsSub: 'Sfide',
    navRadar: 'Readiness',
    navRadarSub: 'Analitica',
    navCerts: 'Cert Prep',
    navCertsSub: 'Sec+/CCNA',

    // Skill Tree & Missions Roadmap
    operationalRoadmap: 'PERCORSO OPERATIVO',
    missionsTitle: 'Missioni Tattiche',
    missionsSubtitle: 'Ogni missione contiene lezioni guidate + un test pratico finale.',
    backToMissions: '← Torna alle Missioni',
    missionProgress: 'Progresso Missione',
    completed: 'COMPLETATA',
    inProgress: 'IN CORSO',
    lockedPro: 'ZERO-DAY PRO',
    explanationBadge: 'SPIEGAZIONE',
    finalTestBadge: 'TEST FINALE',
    lessonWord: 'LEZIONE',
    lessonsCountWord: 'Lezioni',
    guidedLessonsWord: 'guidate + 1 test finale',
    startCheckpointBtn: 'AVVIA CHECKPOINT PRATICO',
    startTestBtn: 'AVVIA TEST FINALE',
    dailyBreachTitle: 'Daily 0xBreach',
    dailyBreachDesc: 'Analizza la vulnerabilità CVE quotidiana nel codice target e individua la root cause prima degli attaccanti.',
    startDailyBreach: 'AVVIA TRIAGE ZERO-DAY (+150 XP)',
    triageCompletedToday: 'TRIAGE COMPLETATO OGGI (RIVEDI)',
    triageStreak: 'STREAK TRIAGE',
    tacticalToolsTitle: 'Strumenti Tattici & Cheat Sheet',
    tacticalToolsSub: 'Comandi rapidi, payload e regole di riferimento per esami',
    openCommands: 'APRI COMANDI →',
    closeCheatSheet: 'CHIUDI CHEAT SHEET',
    copiedCmd: 'Copiato!',

    // Readiness Radar
    readinessRadarTitle: 'Radar di Preparazione Esame',
    readinessRadarSub: 'Analisi delle lacune cognitive per CompTIA Security+, CCNA e CEH.',
    passingProbabilityLabel: 'Indice di Preparazione',
    readinessDisclaimer: 'Stima basata sulle risposte e sui lab completati; non garantisce il superamento dell\'esame ufficiale.',
    readinessFormulaTooltip: 'Formula: (Nodi Completati + Lab PBQ x 1.5) / Peso Totale Curriculum. Stima basata sui tuoi progressi.',
    probLow: 'Bassa',
    probMed: 'Media',
    probHigh: 'Alta',
    belowPassingThreshold: 'Sotto la soglia di idoneità (75%)',
    abovePassingThreshold: 'Idoneo all\'Esame Ufficiale',
    hexagonalRadarTitle: 'RADAR ESAGONALE DELLE COMPETENZE',
    yourLevel: 'Il Tuo Livello',
    proTarget: 'Obiettivo PRO (92%)',
    hackerCardBtn: 'HACKER ID CARD (9:16)',

    // Arena 1v1
    blitzArenaTitle: 'Pwnify Arena Blitz',
    blitzArenaSub: 'Sfida bot di addestramento o hacker in battaglie Blitz di 60 secondi.',
    findOpponentBlitz: 'TROVA AVVERSARIO (BLITZ)',
    survivalGauntlet: 'SFIDA SURVIVAL',
    leaguesTitle: 'Leghe Competitive',
    leaguesSub: 'Scala le divisioni settimanali vincendo match nell\'Arena',
    arenaTicketsLabel: 'Ticket Arena',
    unlimitedPro: 'PRO ILLIMITATO',

    // Cert Prep
    certHeaderBadge: 'OFFICIAL CERTIFICATION ROADMAP',
    certHeaderSub: 'SIMULATORE PBQ ESAME',
    certHeaderTitle: 'Simulatore Esami Ufficiali & Laboratori PBQ',
    certHeaderDesc: 'Addestramento certificato per CompTIA Security+, CCNA, Network+ e A+. Affronta le Performance-Based Questions (PBQs) e supera l\'esame al primo tentativo.',
    passProbability: 'INDICE DI PREPARAZIONE',
    quickCheckBtn: 'Quick Check (5 Domande Reali)',
    pbqLabBtnPro: 'Laboratorio PBQ Reale (PRO)',
    pbqLabBtnActive: 'Avvia Laboratorio PBQ Reale',

    // OAuth & OTP Modals
    googleOAuthTitle: 'Accedi con Google',
    googleOAuthSubtitle: 'Pwnify Cyber Academy OAuth',
    googleOAuthDesc: 'Accedi con il tuo account Google per sincronizzare i progressi.',
    googleInstantAccess: 'Accesso Rapido Istantaneo',
    googleInstantBtn: 'Accedi con Google',
    orEnterGmail: 'Oppure inserisci la tua Gmail:',
    confirmAndSignIn: 'Conferma e Accedi',
    githubOAuthTitle: 'Autorizza con GitHub',
    githubOAuthSubtitle: 'Pwnify Developer OAuth',
    githubOAuthDesc: 'Collega il tuo account GitHub per sincronizzare il tuo account e le certificazioni.',
    githubInstantAccess: 'Accesso Rapido Sviluppatore',
    githubInstantBtn: 'Autorizza con GitHub',
    orEnterGithubHandle: 'Oppure inserisci il tuo username GitHub:',
    authorizeGithubBtn: 'Autorizza Username GitHub',
    emailOtpTitle: 'Accesso Rapido Email 2FA',
    emailOtpDesc: 'Accedi inserendo il codice di sicurezza a 6 cifre inviato alla tua casella postale.',
    yourEmail: 'La tua Email',
    sendOtpBtn: 'INVIA CODICE OTP 2FA',
    enterReceivedCode: 'Inserisci il codice di 6 cifre ricevuto',
    verifyAndEnterBtn: 'VERIFICA ED ENTRA',

    // Onboarding Steps & Diagnostic
    backBtn: 'Indietro',
    verifyAnswerBtn: 'VERIFICA RISPOSTA',
    nextQuestionBtn: 'PROSSIMA DOMANDA',
    calcReadinessBtn: 'CALCOLA PUNTEGGIO READINESS',
    attackSuccess: 'ATTACCO RIUSCITO',
    payloadBlocked: 'PAYLOAD INTERCETTATO / ERRATO',
    analyzingVulns: 'ANALISI VULNERABILITÀ...',
    scanningGaps: 'Scansione gap su OWASP Top 10, TCP/IP, Linux Kernel',
    initialEvalComplete: 'VALUTAZIONE TECNICA INIZIALE COMPLETATA',
    baseReadiness: 'READINESS BASE',
    certBenchmark: 'BENCHMARK CERT',
    onboardingSummaryText: 'Il test diagnostico ha mappato le tue competenze attuali. I percorsi pratici su CompTIA Security+, CCNA e CEH ti guideranno passo dopo passo nel consolidamento di exploit, networking e contromisure difensive.',
    exploreProPlansBtn: 'ESPLORA IL PERCORSO & PIANI PRO',
    continueFreeBtn: 'Continua con l\'account Free',
    tapVulnerableLine: 'TERMINAL_VIEWER // TOCCA LA RIGA VULNERABILE',
    clickToSelect: 'CLICK TO SELECT',
    liveScore: 'Punteggio live:',
    challenge: 'Sfida',
    recommendedBadge: 'CONSIGLIATO',

    // Cookie Banner
    cookieBannerTitle: 'Informativa sui Cookie & Privacy',
    cookieZeroProfiling: 'Zero Profilazione',
    cookieBannerDesc: 'Utilizziamo cookie tecnici essenziali per consentire l\'accesso sicuro e il salvataggio dei progressi didattici. Non utilizziamo tracker di terze parti a fini pubblicitari.',
    cookieAcceptAll: 'Accetta tutti',
    cookieNecessaryOnly: 'Solo necessari',
    cookieCustomizeTitle: 'Personalizza preferenze cookie',
    cookieTechnicalTitle: 'Tecnici (Necessari)',
    cookieTechnicalAlways: 'Sempre Attivi',
    cookieTechnicalDesc: 'Indispensabili per login 2FA, sessione protetta e crittografia.',
    cookiePrefTitle: 'Preferenze & HUD',
    cookiePrefDesc: 'Salva temi del terminale, preferenze audio e layout.',
    cookieAnalyticsTitle: 'Metriche Anonime',
    cookieAnalyticsDesc: 'Rilevamento anonimo di bug e tempi di risposta dei server.',
    cookieReadPolicy: 'Consulta l\'Informativa Estesa Cookie →',
    cookieSaveCustom: 'Salva Preferenze Selezionate'
  }
};

export function useLanguage() {
  const [lang, setLang] = useState<Language>(getSavedLanguage);

  useEffect(() => {
    const handleLangChange = (e: Event) => {
      const customEvent = e as CustomEvent<Language>;
      if (customEvent.detail) {
        setLang(customEvent.detail);
      }
    };
    window.addEventListener('zeroday_language_change', handleLangChange);
    return () => window.removeEventListener('zeroday_language_change', handleLangChange);
  }, []);

  const changeLanguage = (newLang: Language) => {
    saveLanguage(newLang);
    setLang(newLang);
  };

  return {
    lang,
    setLanguage: changeLanguage,
    t: TRANSLATIONS[lang]
  };
}
