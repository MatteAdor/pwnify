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
  return 'en'; // English is the primary default language
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
    operatorCallsignOrEmail: 'Operator Callsign or Email',
    operatorCallsignPlaceholder: 'operator@redteam.org or 0x_GhostRider',
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
    enterEmailLabel: 'Operator Email Address',
    send2FACodeBtn: 'SEND 2FA SECURITY CODE',
    enter2FACodeLabel: 'Enter 6-Digit 2FA Code',
    verify2FACodeBtn: 'VERIFY & PROCEED',
    callsignLabel: 'Public Operator Callsign',
    createPasswordLabel: 'Create Secure Password (min 6 chars)',
    confirmPasswordLabel: 'Confirm Password',
    termsConsentPrefix: 'I declare that I have read and agree to the',
    termsConsentAnd: 'and the',
    ageConsentLabel: 'I confirm that I am at least 16 years of age (or have parental consent) for learning data processing.',
    completeSignupBtn: 'COMPLETE REGISTRATION & ENTER',
    rateLimitWarning: 'Too many failed login attempts. Security lockout active:',
    secondsRemaining: 'seconds remaining',
    
    // Auth Profile Modal
    activeProfileTitle: 'Active Operator Profile',
    activeProfileSubtitle: 'Manage your cryptographic session and sync progress.',
    callsign: 'CALLSIGN:',
    rating: 'RATING:',
    status: 'STATUS:',
    statusFree: 'Standard Free Account',
    statusPro: 'PRO Active Member',
    logoutBtn: 'TERMINATE SESSION (LOGOUT)',
    deleteAccountBtn: 'Delete Account & Personal Data',
    deleteConfirmWarning: '⚠️ Are you sure you want to permanently delete this account and all progress? This action is immediate and irreversible.',
    deleteConfirmYes: 'YES, DELETE EVERYTHING',
    deleteConfirmCancel: 'Cancel',

    // Onboarding
    selectLanguageLabel: 'Language / Lingua:',
    diagPhaseTitle: 'PHASE 1: DIAGNOSTIC AUDIT',
    stepOf: 'STEP',
    of: 'OF 5',
    onboardingStep1Title: 'What is your primary cybersecurity goal?',
    onboardingStep1Desc: 'ZeroDay adapts attack vectors and terminal simulations to your career path.',
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
    commit30Desc: 'ZeroDay Grind (Intensive 21-day boot camp)',

    // Navbar
    dailyStreak: 'Daily Streak',
    arenaTickets: 'Arena Tickets',
    tryPro: 'TRY PRO',
    proActiveBadge: 'PRO ACTIVE',
    logInNav: 'LOG IN',
    soundToggle: 'Toggle Sound FX',
    
    // BottomNav
    navSkillTree: 'Skill Tree',
    navSkillTreeSub: 'Campaign',
    navArena: 'Arena 1v1',
    navArenaSub: 'Blitz PvP',
    navLeagues: 'Leagues',
    navLeaguesSub: 'Top 3',
    navMissions: 'Missions',
    navMissionsSub: 'Bounties',
    navRadar: 'Readiness',
    navRadarSub: 'Analytics',
    navCerts: 'Cert Prep',
    navCertsSub: 'Sec+/CCNA',

    // Cert Prep
    certHeaderBadge: 'OFFICIAL CERTIFICATION ROADMAP',
    certHeaderSub: 'PBQ EXAM SIMULATOR',
    certHeaderTitle: 'Official Exam Simulator & Hands-On PBQs',
    certHeaderDesc: 'Certified preparation for CompTIA Security+, CCNA, Network+, and A+. Face authentic Performance-Based Questions (PBQs) and pass your exam on the first attempt.',
    passProbability: 'PASS PROBABILITY',
    quickCheckBtn: 'Quick Check (5 Real Questions)',
    pbqLabBtnPro: 'Hands-On PBQ Lab (PRO)',
    pbqLabBtnActive: 'Launch PBQ Lab',

    // OAuth & OTP Modals
    googleOAuthTitle: 'Sign in with Google',
    googleOAuthSubtitle: '0xDAY Cyber Academy OAuth',
    googleOAuthDesc: 'Select an account or proceed with 1-click to synchronize your operator credentials.',
    googleInstantAccess: 'Instant 1-Click Access',
    googleInstantBtn: 'Sign in as Google Operator',
    orEnterGmail: 'Or enter your Gmail address:',
    confirmAndSignIn: 'Confirm & Sign In',
    githubOAuthTitle: 'Authorize with GitHub',
    githubOAuthSubtitle: 'ZeroDay Developer OAuth',
    githubOAuthDesc: 'Connect your GitHub profile to sync your hacker status and security certifications.',
    githubInstantAccess: 'Quick Developer Access',
    githubInstantBtn: 'Authorize as GitHub Hacker',
    orEnterGithubHandle: 'Or enter your GitHub username:',
    authorizeGithubBtn: 'Authorize GitHub Username',
    emailOtpTitle: 'Quick 2FA Email Sign-In',
    emailOtpDesc: 'Log in instantly by entering the 6-digit security code dispatched to your inbox.',
    yourOperatorEmail: 'Your Operator Email',
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
    cookieZeroProfiling: 'Zero Tracking',
    cookieBannerDesc: 'We use strictly necessary technical cookies to enable secure authentication and didactic progress synchronization. No third-party ad trackers.',
    cookieAcceptAll: 'Accept all',
    cookieNecessaryOnly: 'Necessary only',
    cookieCustomizeTitle: 'Customize cookie preferences',
    cookieTechnicalTitle: 'Technical (Required)',
    cookieTechnicalAlways: 'Always Active',
    cookieTechnicalDesc: 'Essential for 2FA login, authenticated sessions and encryption.',
    cookiePrefTitle: 'Preferences & HUD',
    cookiePrefDesc: 'Stores terminal color themes, sound FX settings, and UI layout.',
    cookieAnalyticsTitle: 'Anonymous Diagnostics',
    cookieAnalyticsDesc: 'Telemetry for crash reports and endpoint response times.',
    cookieReadPolicy: 'Read Full Cookie Policy →',
    cookieSaveCustom: 'Save Selected Preferences'
  },
  it: {
    // Auth & Navigation
    authGateway: '0XDAY // GATEWAY DI AUTENTICAZIONE',
    academyTitle: 'Cyber Warfare Academy',
    academySubtitle: 'Simulatore Esami CompTIA Security+, Cisco CCNA & CEH.',
    loginTab: 'ACCEDI',
    signupTab: 'REGISTRATI (2FA)',
    loginWithGoogle: 'Accedi con Google',
    loginWithGithub: 'Accedi con GitHub',
    orViaEmail: 'oppure via email',
    operatorCallsignOrEmail: 'Callsign Operatore o Email',
    operatorCallsignPlaceholder: 'operatore@redteam.org o 0x_GhostRider',
    password: 'Password',
    loginButton: 'ACCEDI ALLA PIATTAFORMA',
    forgotPassword: 'Non ricordi la password? Accedi con Codice 2FA via Email',
    exploreAsGuest: 'Esplora come Ospite Anonimo (Accesso Sandbox Limitato) →',
    privacyPolicy: 'Privacy Policy',
    termsOfService: 'Termini di Servizio',
    refund: 'Rimborso',
    cookies: 'Cookie Policy',

    // Sign Up 2FA
    stepEmail: '1. Email',
    step2FA: '2. Codice 2FA',
    stepPassword: '3. Password',
    enterEmailLabel: 'Indirizzo Email Operatore',
    send2FACodeBtn: 'INVIA CODICE 2FA DI SICUREZZA',
    enter2FACodeLabel: 'Inserisci Codice 2FA a 6 cifre',
    verify2FACodeBtn: 'VERIFICA & PROCEDI',
    callsignLabel: 'Callsign Operatore (Nome Pubblico)',
    createPasswordLabel: 'Crea Password Sicura (min 6 caratteri)',
    confirmPasswordLabel: 'Conferma Password',
    termsConsentPrefix: 'Dichiaro di aver letto e accettare i',
    termsConsentAnd: 'e la',
    ageConsentLabel: 'Confermo di avere almeno 16 anni compiuti (o consenso genitoriale) per l\'elaborazione dei dati didattici.',
    completeSignupBtn: 'COMPLETA ISCRIZIONE & ENTRA',
    rateLimitWarning: 'Troppi tentativi falliti. Blocco temporaneo di sicurezza attivo:',
    secondsRemaining: 'secondi rimanenti',

    // Auth Profile Modal
    activeProfileTitle: 'Profilo Operatore Attivo',
    activeProfileSubtitle: 'Gestisci la tua sessione crittografica e sincronizza i progressi.',
    callsign: 'CALLSIGN:',
    rating: 'RATING:',
    status: 'STATUS:',
    statusFree: 'Account Standard Free',
    statusPro: 'Membro PRO Attivo',
    logoutBtn: 'TERMINA SESSIONE (LOGOUT)',
    deleteAccountBtn: 'Elimina Account & Dati Personali',
    deleteConfirmWarning: '⚠️ Confermi la cancellazione definitiva di questo account e di tutti i progressi? L\'operazione è immediata e irreversibile.',
    deleteConfirmYes: 'SÌ, CANCELLA TUTTO',
    deleteConfirmCancel: 'Annulla',

    // Onboarding
    selectLanguageLabel: 'Lingua / Language:',
    diagPhaseTitle: 'FASE 1: DIAGNOSTIC AUDIT',
    stepOf: 'STEP',
    of: 'DI 5',
    onboardingStep1Title: 'Qual è il tuo obiettivo primario di sicurezza?',
    onboardingStep1Desc: 'ZeroDay adatterà i vettori di attacco e le simulazioni di terminale al tuo percorso.',
    onboardingStep2Title: 'Qual è il tuo livello attuale di esperienza?',
    onboardingStep2Desc: 'Calibriamo la difficoltà della prima sfida diagnostica sul terminale.',
    onboardingStep3Title: 'Quanto tempo puoi dedicare ogni giorno?',
    onboardingStep3Desc: 'La costanza quotidiana crea riflessi automatici negli scenari di emergenza.',
    onboardingStep4Title: 'Sfida Diagnostica Benchmark',
    onboardingStep4Desc: 'Risolvi questi scenari reali per calibrare il tuo Readiness Score iniziale.',
    onboardingStep5Title: 'Elaborazione Telemetria Tattica...',
    onboardingStep5Complete: 'Calibrazione Completata!',
    enterAcademyBtn: 'ENTRA NELLA CYBER ACADEMY',
    continueBtn: 'CONTINUA',
    submitPayloadBtn: 'INVIA PAYLOAD',
    nextScenarioBtn: 'PROSSIMA SFIDA',

    // Goals
    goalSecPlusTitle: 'Passare CompTIA Security+ / CCNA / CEH',
    goalSecPlusDesc: 'Obiettivo certificazione IT: simulazione domande d\'esame PBQs e laboratori pratici',
    goalWebTitle: 'Web Hacking & Bug Bounty Hunter',
    goalWebDesc: 'OWASP Top 10, SQLi, XSS, SSRF, IDOR e bypass di Web Application Firewall',
    goalLinuxTitle: 'Linux Kernel & Bash Scripting Mastery',
    goalLinuxDesc: 'Privilege escalation, GTFOBins, automazione cron, analisi dei permessi e rootkit',
    goalSocTitle: 'SOC Analyst & Blue Team Defense',
    goalSocDesc: 'Threat hunting, analisi pacchetti Wireshark, SIEM alert e rilevamento C2 beacon',

    // Levels
    levelBeginnerTitle: 'Script Kiddie / Principiante',
    levelBeginnerDesc: 'Conosco le basi del computer, ma non ho mai eseguito exploit né configurato VLAN.',
    levelIntermediateTitle: 'Sysadmin / Sviluppatore / Studente',
    levelIntermediateDesc: 'Uso regolarmente Linux o programmo, conosco i protocolli TCP/IP ma non ho esperienza di hacking offensivo.',
    levelAdvancedTitle: 'Junior Pentester / SOC Analyst',
    levelAdvancedDesc: 'Ho già fatto lab su TryHackMe / HackTheBox e voglio massimizzare velocità e accuratezza.',

    // Commitments
    commit5Label: '5 min / giorno',
    commit5Desc: 'Audit Rapido (1 modulo al giorno)',
    commit15Label: '15 min / giorno',
    commit15Desc: 'Red Teamer Drill (Consigliato per certificazioni)',
    commit30Label: '30 min / giorno',
    commit30Desc: 'ZeroDay Grind (Preparazione intensiva in 21 giorni)',

    // Navbar
    dailyStreak: 'Streak Giornaliera',
    arenaTickets: 'Ticket Arena',
    tryPro: 'PROVA PRO',
    proActiveBadge: 'PRO ATTIVO',
    logInNav: 'ACCEDI',
    soundToggle: 'Audio Effetti',

    // BottomNav
    navSkillTree: 'Skill Tree',
    navSkillTreeSub: 'Campagna',
    navArena: 'Arena 1v1',
    navArenaSub: 'Duelli Blitz',
    navLeagues: 'Leghe',
    navLeaguesSub: 'Classifica',
    navMissions: 'Missioni',
    navMissionsSub: 'Taglie',
    navRadar: 'Readiness',
    navRadarSub: 'Analitica',
    navCerts: 'Cert Prep',
    navCertsSub: 'Sec+/CCNA',

    // Cert Prep
    certHeaderBadge: 'OFFICIAL CERTIFICATION ROADMAP',
    certHeaderSub: 'SIMULATORE PBQ ESAME',
    certHeaderTitle: 'Simulatore Esami Ufficiali & Laboratori PBQ',
    certHeaderDesc: 'Addestramento certificato per CompTIA Security+, CCNA, Network+ e A+. Affronta le Performance-Based Questions (PBQs) e supera l\'esame al primo tentativo.',
    passProbability: 'PROBABILITÀ SUPERAMENTO',
    quickCheckBtn: 'Quick Check (5 Domande Reali)',
    pbqLabBtnPro: 'Laboratorio PBQ Reale (PRO)',
    pbqLabBtnActive: 'Avvia Laboratorio PBQ Reale',

    // OAuth & OTP Modals
    googleOAuthTitle: 'Accedi con Google',
    googleOAuthSubtitle: '0xDAY Cyber Academy OAuth',
    googleOAuthDesc: 'Seleziona un account o procedi con 1 click per sincronizzare il tuo profilo operatore.',
    googleInstantAccess: 'Accesso Rapido Istantaneo',
    googleInstantBtn: 'Accedi come Operatore Google',
    orEnterGmail: 'Oppure inserisci la tua Gmail:',
    confirmAndSignIn: 'Conferma e Accedi',
    githubOAuthTitle: 'Autorizza con GitHub',
    githubOAuthSubtitle: 'ZeroDay Developer OAuth',
    githubOAuthDesc: 'Collega il tuo account GitHub per sincronizzare il tuo status hacker e le certificazioni.',
    githubInstantAccess: 'Accesso Rapido Sviluppatore',
    githubInstantBtn: 'Autorizza come GitHub Hacker',
    orEnterGithubHandle: 'Oppure inserisci il tuo username GitHub:',
    authorizeGithubBtn: 'Autorizza Username GitHub',
    emailOtpTitle: 'Accesso Rapido via 2FA Email',
    emailOtpDesc: 'Accedi istantaneamente inserendo il codice di sicurezza a 6 cifre inviato alla tua email.',
    yourOperatorEmail: 'La tua Email Operatore',
    sendOtpBtn: 'INVIA CODICE OTP 2FA',
    enterReceivedCode: 'Inserisci il codice a 6 cifre ricevuto',
    verifyAndEnterBtn: 'VERIFICA & ENTRA',

    // Onboarding Steps & Diagnostic
    backBtn: 'Indietro',
    verifyAnswerBtn: 'VERIFICA RISPOSTA',
    nextQuestionBtn: 'PROSSIMA DOMANDA',
    calcReadinessBtn: 'CALCOLA READINESS SCORE',
    attackSuccess: 'ATTACCO RIUSCITO',
    payloadBlocked: 'PAYLOAD INTERCEPTATO / RISPOSTA ERRATA',
    analyzingVulns: 'ANALISI VULNERABILITÀ IN CORSO...',
    scanningGaps: 'Scansione lacune su OWASP Top 10, TCP/IP, Linux Kernel',
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
