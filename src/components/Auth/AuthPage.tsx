import React, { useState, useEffect } from 'react';
import { 
  send2FACode, 
  verify2FACode, 
  completeEmailRegistration, 
  loginEmailAccount, 
  loginWithOAuth, 
  loginWithEmailOtp,
  getRegisteredAccounts,
  syncDatabaseWithBackend,
  UserAccount 
} from '../../utils/userDatabase';
import { sound } from '../../utils/soundEngine';
import { 
  Lock, Mail, KeyRound, User, 
  ArrowRight, CheckCircle2, AlertTriangle, 
  Sparkles, Terminal, Check, X,
  Database, RefreshCw, Copy, ShieldCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AuthPageProps {
  onLoginSuccess: (account: UserAccount) => void;
  onGuestAccess?: () => void;
}

type AuthMode = 'login' | 'signup';
type SignupStep = 'email' | '2fa' | 'password';

const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

const GitHubIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

export const AuthPage: React.FC<AuthPageProps> = ({
  onLoginSuccess,
  onGuestAccess
}) => {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [signupStep, setSignupStep] = useState<SignupStep>('email');

  // Form Fields for Signup
  const [email, setEmail] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [callsign, setCallsign] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Form Fields for Standard Login
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // OAuth Modals
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [googleInputEmail, setGoogleInputEmail] = useState('');

  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);
  const [githubInputHandle, setGithubInputHandle] = useState('');

  // Passwordless Email OTP Login Modal
  const [isEmailOtpModalOpen, setIsEmailOtpModalOpen] = useState(false);
  const [otpLoginEmail, setOtpLoginEmail] = useState('');
  const [otpLoginCode, setOtpLoginCode] = useState('');
  const [otpStep, setOtpStep] = useState<'request' | 'verify'>('request');

  // Database Inspector State
  const [isDbInspectorOpen, setIsDbInspectorOpen] = useState(false);
  const [rawDbContent, setRawDbContent] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  // Registered Accounts in Database
  const [savedAccounts, setSavedAccounts] = useState<UserAccount[]>([]);

  // Feedback State
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [simulatedRelayCode, setSimulatedRelayCode] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Load registered accounts on mount, sync with disk database/logins.json, and parse OAuth redirects
  useEffect(() => {
    try {
      // 1. Initial cached accounts
      setSavedAccounts(getRegisteredAccounts());

      // 2. Synchronize with physical file database/logins.json
      syncDatabaseWithBackend().then(accs => {
        if (accs && accs.length > 0) {
          setSavedAccounts(accs);
        }
      }).catch(() => {});

      // 3. Check for Google OAuth Token in URL hash (#access_token=...)
      if (typeof window !== 'undefined' && window.location.hash.includes('access_token=')) {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const token = hashParams.get('access_token');
        if (token) {
          setIsProcessing(true);
          fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${token}` }
          })
            .then(r => r.json())
            .then(data => {
              if (data && (data.email || data.sub)) {
                const mail = data.email || 'operatore.google@gmail.com';
                const name = data.name || mail.split('@')[0];
                const res = loginWithOAuth('google', { name, email: mail });
                sound.playVictoryFanfare();
                confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
                if (window.history) {
                  window.history.replaceState({}, '', window.location.pathname);
                }
                onLoginSuccess(res.account);
              }
            })
            .catch(err => {
              console.error('Google OAuth token fetch error:', err);
              setErrorMsg('Errore durante la convalida del token Google.');
            })
            .finally(() => setIsProcessing(false));
          return;
        }
      }
    } catch {
      setSavedAccounts([]);
    }
  }, [onLoginSuccess]);

  // Timer for 2FA resend cooldown
  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // ---------------------------------------------------------------------------
  // SIGNUP STEP 1: Send 2FA Code
  // ---------------------------------------------------------------------------
  const handleRequest2FA = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMsg('Inserisci un indirizzo email valido.');
      sound.playPayloadBlocked();
      return;
    }

    setIsProcessing(true);
    sound.playTap();

    setTimeout(() => {
      const { code } = send2FACode(cleanEmail);
      setIsProcessing(false);
      setSimulatedRelayCode(code);
      setResendCooldown(60);
      setSignupStep('2fa');
      sound.playRadarPing();
      setSuccessMsg(`Codice 2FA generato e trasmesso all'indirizzo ${cleanEmail}.`);
    }, 500);
  };

  // ---------------------------------------------------------------------------
  // SIGNUP STEP 2: Verify 2FA Code
  // ---------------------------------------------------------------------------
  const handleVerify2FA = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (twoFactorCode.trim().length !== 6) {
      setErrorMsg('Inserisci il codice di sicurezza a 6 cifre.');
      sound.playPayloadBlocked();
      return;
    }

    const result = verify2FACode(email, twoFactorCode);
    if (!result.valid) {
      setErrorMsg(result.error || 'Codice 2FA errato o scaduto.');
      sound.playPayloadBlocked();
      return;
    }

    sound.playExploitSuccess();
    setSuccessMsg('Autenticazione a due fattori (2FA) completata con successo!');
    setSimulatedRelayCode(null);
    setSignupStep('password');
  };

  // ---------------------------------------------------------------------------
  // SIGNUP STEP 3: Create Password & Complete Account
  // ---------------------------------------------------------------------------
  const handleCompleteRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (callsign.trim().length < 3) {
      setErrorMsg('Il Callsign deve contenere almeno 3 caratteri.');
      sound.playPayloadBlocked();
      return;
    }

    if (password.length < 6) {
      setErrorMsg('La password deve contenere almeno 6 caratteri.');
      sound.playPayloadBlocked();
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Le password non coincidono.');
      sound.playPayloadBlocked();
      return;
    }

    setIsProcessing(true);
    sound.playTap();

    setTimeout(() => {
      const res = completeEmailRegistration(email, callsign, password);
      setIsProcessing(false);

      if (!res.success || !res.account) {
        setErrorMsg(res.error || 'Errore durante la creazione dell\'account.');
        sound.playPayloadBlocked();
        return;
      }

      sound.playVictoryFanfare();
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
      setSuccessMsg(`Account per l'operatore ${res.account.username} creato con successo!`);
      
      setTimeout(() => {
        onLoginSuccess(res.account!);
      }, 700);
    }, 400);
  };

  // ---------------------------------------------------------------------------
  // EXISTING USER LOGIN (Email/Callsign + Password)
  // ---------------------------------------------------------------------------
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!loginIdentifier.trim()) {
      setErrorMsg('Inserisci la tua email o il tuo callsign.');
      sound.playPayloadBlocked();
      return;
    }

    if (!loginPassword) {
      setErrorMsg('Inserisci la tua password.');
      sound.playPayloadBlocked();
      return;
    }

    setIsProcessing(true);
    sound.playTap();

    setTimeout(() => {
      const res = loginEmailAccount(loginIdentifier, loginPassword);
      setIsProcessing(false);

      if (!res.success || !res.account) {
        setErrorMsg(res.error || 'Credenziali non valide.');
        sound.playPayloadBlocked();
        return;
      }

      sound.playExploitSuccess();
      setSuccessMsg(`Bentornato, operatore ${res.account.username}. Accesso eseguito.`);
      setTimeout(() => {
        onLoginSuccess(res.account!);
      }, 600);
    }, 400);
  };

  // ---------------------------------------------------------------------------
  // GOOGLE OAUTH TRIGGERS & HANDLERS
  // ---------------------------------------------------------------------------
  const handleGoogleClick = () => {
    sound.playTap();
    setErrorMsg(null);
    setSuccessMsg(null);

    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (googleClientId && googleClientId.trim()) {
      const redirectUri = window.location.origin;
      const scope = encodeURIComponent('email profile openid');
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(googleClientId.trim())}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${scope}&prompt=select_account`;
      window.location.href = authUrl;
      return;
    }

    setIsGoogleModalOpen(true);
  };

  const handleGoogleInstantLogin = (name?: string, email?: string) => {
    setIsProcessing(true);
    sound.playTap();
    setErrorMsg(null);

    setTimeout(() => {
      const mail = email || 'operatore.zeroday@gmail.com';
      const defaultName = name || 'Google_Operatore';
      const res = loginWithOAuth('google', { name: defaultName, email: mail });
      setIsProcessing(false);
      setIsGoogleModalOpen(false);
      sound.playVictoryFanfare();
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.5 } });
      onLoginSuccess(res.account);
    }, 400);
  };

  const handleGoogleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMail = googleInputEmail.trim().toLowerCase();
    if (!cleanMail || !cleanMail.includes('@')) {
      setErrorMsg('Inserisci un indirizzo Gmail valido.');
      sound.playPayloadBlocked();
      return;
    }

    setIsProcessing(true);
    sound.playTap();
    setErrorMsg(null);

    setTimeout(() => {
      const defaultName = cleanMail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
      const finalName = `Google_${defaultName}`;
      const res = loginWithOAuth('google', { name: finalName, email: cleanMail });
      setIsProcessing(false);
      setIsGoogleModalOpen(false);
      sound.playVictoryFanfare();
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.5 } });
      onLoginSuccess(res.account);
    }, 400);
  };

  // ---------------------------------------------------------------------------
  // GITHUB OAUTH TRIGGERS & HANDLERS
  // ---------------------------------------------------------------------------
  const handleGitHubClick = () => {
    sound.playTap();
    setErrorMsg(null);
    setSuccessMsg(null);

    const githubClientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    if (githubClientId && githubClientId.trim()) {
      const redirectUri = window.location.origin;
      const authUrl = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(githubClientId.trim())}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user,user:email`;
      window.location.href = authUrl;
      return;
    }

    setIsGitHubModalOpen(true);
  };

  const handleGitHubInstantLogin = (handle?: string) => {
    setIsProcessing(true);
    sound.playTap();
    setErrorMsg(null);

    setTimeout(() => {
      const name = handle || 'GitHub_Hacker';
      const mail = `${name.toLowerCase()}@users.noreply.github.com`;
      const res = loginWithOAuth('github', { name, email: mail });
      setIsProcessing(false);
      setIsGitHubModalOpen(false);
      sound.playVictoryFanfare();
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.5 } });
      onLoginSuccess(res.account);
    }, 400);
  };

  const handleGitHubSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanHandle = githubInputHandle.trim().replace(/^@/, '');
    if (!cleanHandle || cleanHandle.length < 2) {
      setErrorMsg('Inserisci un username GitHub valido.');
      sound.playPayloadBlocked();
      return;
    }

    setIsProcessing(true);
    sound.playTap();
    setErrorMsg(null);

    setTimeout(() => {
      const gitEmail = `${cleanHandle.toLowerCase()}@users.noreply.github.com`;
      const res = loginWithOAuth('github', { name: cleanHandle, email: gitEmail });
      setIsProcessing(false);
      setIsGitHubModalOpen(false);
      sound.playVictoryFanfare();
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.5 } });
      onLoginSuccess(res.account);
    }, 400);
  };

  // ---------------------------------------------------------------------------
  // DATABASE INSPECTOR HANDLERS (database/logins.json)
  // ---------------------------------------------------------------------------
  const handleOpenDbInspector = async () => {
    sound.playTap();
    try {
      const res = await fetch('/api/database');
      if (res.ok) {
        const data = await res.json();
        setRawDbContent(JSON.stringify(data, null, 2));
      } else {
        setRawDbContent(JSON.stringify(getRegisteredAccounts(), null, 2));
      }
    } catch {
      setRawDbContent(JSON.stringify(getRegisteredAccounts(), null, 2));
    }
    setIsDbInspectorOpen(true);
  };

  const handleCopyDatabaseJson = () => {
    if (!rawDbContent) return;
    sound.playTap();
    navigator.clipboard.writeText(rawDbContent);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleReloadDatabase = async () => {
    sound.playTap();
    const updated = await syncDatabaseWithBackend();
    setSavedAccounts(updated);
    setRawDbContent(JSON.stringify(updated, null, 2));
    setSuccessMsg('Database sincronizzato e ricaricato dal file su disco (database/logins.json).');
  };

  // ---------------------------------------------------------------------------
  // EMAIL PASSWORDLESS OTP LOGIN HANDLER
  // ---------------------------------------------------------------------------
  const handleOtpLoginRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMail = otpLoginEmail.trim().toLowerCase();
    if (!cleanMail || !cleanMail.includes('@')) {
      setErrorMsg('Inserisci un indirizzo email valido.');
      sound.playPayloadBlocked();
      return;
    }

    setIsProcessing(true);
    sound.playTap();

    setTimeout(() => {
      const { code } = send2FACode(cleanMail);
      setIsProcessing(false);
      setSimulatedRelayCode(code);
      setOtpStep('verify');
      sound.playRadarPing();
      setSuccessMsg(`Codice 2FA temporaneo inviato a ${cleanMail}.`);
    }, 500);
  };

  const handleOtpLoginVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpLoginCode.trim().length !== 6) {
      setErrorMsg('Inserisci il codice di sicurezza a 6 cifre.');
      sound.playPayloadBlocked();
      return;
    }

    const verification = verify2FACode(otpLoginEmail, otpLoginCode);
    if (!verification.valid) {
      setErrorMsg(verification.error || 'Codice 2FA non valido.');
      sound.playPayloadBlocked();
      return;
    }

    setIsProcessing(true);
    sound.playTap();

    setTimeout(() => {
      // Authenticate via email OTP (logs in or initializes clean account if not present)
      const res = loginWithEmailOtp(otpLoginEmail);
      setIsProcessing(false);

      if (!res.success || !res.account) {
        // If account doesn't exist, create it clean on the fly
        const cleanName = otpLoginEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
        const created = completeEmailRegistration(otpLoginEmail, cleanName, 'Pass_' + Math.random().toString(36).substring(2, 8));
        if (created.success && created.account) {
          sound.playVictoryFanfare();
          setIsEmailOtpModalOpen(false);
          onLoginSuccess(created.account);
          return;
        }
        setErrorMsg(res.error || 'Errore durante l\'accesso.');
        sound.playPayloadBlocked();
        return;
      }

      sound.playExploitSuccess();
      setIsEmailOtpModalOpen(false);
      onLoginSuccess(res.account);
    }, 400);
  };

  // ---------------------------------------------------------------------------
  // 1-CLICK INSTANT LOGIN FOR SAVED LOCAL ACCOUNTS
  // ---------------------------------------------------------------------------
  const handleSelectSavedAccount = (acc: UserAccount) => {
    sound.playExploitSuccess();
    onLoginSuccess(acc);
  };

  return (
    <div className="min-h-screen w-full bg-[#080C15] text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden font-sans select-none">
      {/* Background Cyber Ambient Grid & Glows */}
      <div className="absolute inset-0 bg-[radial-gradient(#142036_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-tr from-emerald-500/10 via-cyan-500/10 to-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Authentication Card */}
      <div 
        className="w-full max-w-md bg-[#0D1424] border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl relative z-10 space-y-5"
        style={{ boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px -5px rgba(16, 185, 129, 0.12)' }}
      >
        {/* Branding Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold uppercase tracking-wider">
            <Terminal className="w-3.5 h-3.5" />
            <span>0xDAY // AUTHENTICATION GATEWAY</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Cyber Warfare Academy
          </h1>
          <p className="text-xs text-slate-400">
            CompTIA Security+, Cisco CCNA & CEH Exam Simulator.
          </p>
        </div>

        {/* Global Notifications */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs font-mono flex items-start gap-2.5 animate-shake">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Mode Selector Tabs: Accedi vs Registrati */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#090D17] border border-white/10 font-mono text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              setAuthMode('login');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === 'login'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>ACCEDI</span>
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              setAuthMode('signup');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === 'signup'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>REGISTRATI (2FA)</span>
          </button>
        </div>

        {/* ============================================================== */}
        {/* FAST 1-CLICK AUTHENTICATION BUTTONS: GOOGLE & GITHUB */}
        {/* ============================================================== */}
        <div className="space-y-2">
          {/* Google Button */}
          <button
            type="button"
            onClick={handleGoogleClick}
            disabled={isProcessing}
            className="w-full py-3 px-4 rounded-xl border border-white/10 bg-[#121B30] hover:bg-[#16223D] hover:border-emerald-500/40 text-slate-200 font-bold text-xs flex items-center justify-center gap-3 transition-all active:scale-98 shadow-sm cursor-pointer group"
          >
            <GoogleIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>Accedi con Google</span>
          </button>

          {/* GitHub Button */}
          <button
            type="button"
            onClick={handleGitHubClick}
            disabled={isProcessing}
            className="w-full py-3 px-4 rounded-xl border border-white/10 bg-[#121B30] hover:bg-[#16223D] hover:border-emerald-500/40 text-slate-200 font-bold text-xs flex items-center justify-center gap-3 transition-all active:scale-98 shadow-sm cursor-pointer group"
          >
            <GitHubIcon className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
            <span>Accedi con GitHub</span>
          </button>
        </div>

        {/* Database Explorer Trigger Badge */}
        <div>
          <button
            type="button"
            onClick={handleOpenDbInspector}
            className="w-full py-2 px-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-mono text-[11px] flex items-center justify-between transition-all cursor-pointer group shadow-sm"
            title="Visualizza e ispeziona il database dei login salvati su disco (database/logins.json)"
          >
            <div className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-emerald-400 group-hover:rotate-12 transition-transform" />
              <span className="font-bold">Database Logins: <span className="underline decoration-emerald-500/40">database/logins.json</span></span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-[10px] font-bold">
              {savedAccounts.length} {savedAccounts.length === 1 ? 'account' : 'account'}
            </span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-white/10 w-full" />
          <span className="bg-[#0D1424] px-3 font-mono text-[10px] text-slate-500 uppercase tracking-widest absolute">
            oppure via email
          </span>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: STANDARD ACCEDI (LOGIN FOR EXISTING ACCOUNTS) */}
        {/* ============================================================== */}
        {authMode === 'login' && (
          <div className="space-y-4 animate-fade-in">
            {/* Quick 1-Click Access to Saved Accounts on this Device */}
            {savedAccounts.length > 0 && (
              <div className="p-3 rounded-2xl bg-[#090D17] border border-white/10 space-y-2">
                <span className="text-[10px] font-mono text-slate-400 block font-semibold uppercase tracking-wider">
                  ⚡ Account memorizzati su questa postazione:
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {savedAccounts.map((acc) => (
                    <div 
                      key={acc.id}
                      onClick={() => handleSelectSavedAccount(acc)}
                      className="p-2 rounded-xl bg-[#121B30] hover:bg-[#182542] border border-white/5 hover:border-emerald-500/40 cursor-pointer flex items-center justify-between text-xs transition-all"
                    >
                      <div className="flex items-center gap-2">
                        {acc.provider === 'google' ? (
                          <GoogleIcon className="w-3.5 h-3.5" />
                        ) : acc.provider === 'github' ? (
                          <GitHubIcon className="w-3.5 h-3.5" />
                        ) : (
                          <Mail className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                        <div>
                          <strong className="text-white font-mono block text-xs">{acc.username}</strong>
                          <span className="text-[10px] text-slate-400 font-mono">{acc.email}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30">
                        Entra →
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Standard Email / Callsign + Password Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-mono text-slate-300 block mb-1">
                  Callsign Operatore o Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="operatore@redteam.org o 0x_GhostRider"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#090D17] border border-white/10 focus:border-emerald-500 text-sm text-white placeholder-slate-600 font-mono transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-300 block mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#090D17] border border-white/10 focus:border-emerald-500 text-sm text-white placeholder-slate-600 font-mono transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-3.5 px-4 rounded-xl font-mono font-black text-xs text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 shadow-neon-emerald flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
              >
                <span>ACCEDI ALLA PIATTAFORMA</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Quick Link for Passwordless 2FA Login via Email */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setIsEmailOtpModalOpen(true);
                  setErrorMsg(null);
                }}
                className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 underline"
              >
                🔑 Non ricordi la password? Accedi con Codice 2FA via Email
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: SIGN UP VIA EMAIL (2FA -> PASSWORD -> ACCOUNT CREATION) */}
        {/* ============================================================== */}
        {authMode === 'signup' && (
          <div className="space-y-4 animate-fade-in">
            {/* Step Progress Tracker */}
            <div className="flex items-center justify-between px-2 text-[11px] font-mono">
              <span className={`flex items-center gap-1 ${signupStep === 'email' ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                1. Email
              </span>
              <span className="text-slate-600">→</span>
              <span className={`flex items-center gap-1 ${signupStep === '2fa' ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                2. Codice 2FA
              </span>
              <span className="text-slate-600">→</span>
              <span className={`flex items-center gap-1 ${signupStep === 'password' ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                3. Password
              </span>
            </div>

            {/* STEP 1: ENTER EMAIL */}
            {signupStep === 'email' && (
              <form onSubmit={handleRequest2FA} className="space-y-4">
                <div>
                  <label className="text-[11px] font-mono text-slate-300 block mb-1">
                    Indirizzo Email Operatore
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      placeholder="operatore@redteam.org"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-[#090D17] border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm text-white placeholder-slate-600 font-mono transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-3.5 px-4 rounded-xl font-mono font-black text-xs text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400 hover:from-emerald-300 hover:to-teal-300 shadow-neon-emerald flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
                >
                  <span>INVIA CODICE 2FA DI SICUREZZA</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* STEP 2: VERIFY 2FA CODE */}
            {signupStep === '2fa' && (
              <form onSubmit={handleVerify2FA} className="space-y-4 animate-fade-in">
                {/* Simulated Terminal Cyber Relay Toast */}
                {simulatedRelayCode && (
                  <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 space-y-1">
                    <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold">
                      <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                      <span>[CYBER RELAY 2FA TRANSMISSION]</span>
                    </div>
                    <p className="text-xs font-mono text-slate-300">
                      Codice crittografico inviato a <strong className="text-cyan-200">{email}</strong>:
                    </p>
                    <div className="inline-block py-1 px-3 rounded-lg bg-black/60 border border-cyan-400/50 font-mono text-lg font-black text-cyan-300 tracking-widest">
                      {simulatedRelayCode}
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-mono text-slate-300">
                      Inserisci Codice 2FA a 6 cifre
                    </label>
                    <span className="text-[10px] font-mono text-emerald-400">
                      Inviato a {email}
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="123456"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-[#090D17] border border-white/10 focus:border-emerald-500 text-base tracking-widest text-emerald-300 placeholder-slate-600 font-mono transition-colors text-center font-bold"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <button
                    type="button"
                    onClick={() => setSignupStep('email')}
                    className="hover:text-white underline cursor-pointer"
                  >
                    ← Modifica email
                  </button>
                  <button
                    type="button"
                    disabled={resendCooldown > 0}
                    onClick={(e) => handleRequest2FA(e as any)}
                    className="text-cyan-400 hover:text-cyan-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {resendCooldown > 0 ? `Rinvio tra ${resendCooldown}s` : 'Reinvia codice'}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-3.5 px-4 rounded-xl font-mono font-black text-xs text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 shadow-neon-emerald flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
                >
                  <span>VERIFICA CODICE 2FA</span>
                  <Check className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* STEP 3: CREATE PASSWORD & CALLSIGN */}
            {signupStep === 'password' && (
              <form onSubmit={handleCompleteRegistration} className="space-y-3.5 animate-fade-in">
                <div>
                  <label className="text-[11px] font-mono text-slate-300 block mb-1">
                    Callsign Operatore (Nome Pubblico)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="0x_GhostRider"
                      value={callsign}
                      onChange={(e) => setCallsign(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#090D17] border border-white/10 focus:border-emerald-500 text-sm text-white placeholder-slate-600 font-mono transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-300 block mb-1">
                    Crea Password Sicura (min 6 caratteri)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#090D17] border border-white/10 focus:border-emerald-500 text-sm text-white placeholder-slate-600 font-mono transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-300 block mb-1">
                    Conferma Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#090D17] border border-white/10 focus:border-emerald-500 text-sm text-white placeholder-slate-600 font-mono transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full mt-2 py-4 px-4 rounded-xl font-mono font-black text-xs text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-400 to-indigo-400 hover:from-emerald-300 hover:to-indigo-300 shadow-neon-emerald flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>CREA ACCOUNT & ENTRA NELLA PIATTAFORMA</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* Optional Sandbox / Guest Access link */}
        {onGuestAccess && (
          <div className="pt-2 text-center border-t border-white/5">
            <button
              type="button"
              onClick={onGuestAccess}
              className="text-[11px] font-mono text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            >
              Esplora come Ospite Anonimo (Accesso Sandbox Limitato) →
            </button>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: GOOGLE AUTHENTICATION MODAL */}
      {/* ============================================================== */}
      {isGoogleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-sans">
          <div className="relative w-full max-w-sm bg-[#0E1526] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                  <GoogleIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white leading-tight">Accedi con Google</h3>
                  <p className="text-[10px] text-slate-400 font-mono">0xDAY Cyber Academy OAuth</p>
                </div>
              </div>
              <button 
                onClick={() => setIsGoogleModalOpen(false)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Scegli un account o accedi con 1 click per sincronizzare il tuo profilo operatore e la progressione esami.
            </p>

            {/* 1-CLICK INSTANT GOOGLE LOGIN */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border border-blue-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-blue-300 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-blue-400" /> Accesso Rapido Istantaneo
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">1-CLICK</span>
              </div>
              <button
                type="button"
                onClick={() => handleGoogleInstantLogin('Google_Operatore', 'operatore.zeroday@gmail.com')}
                disabled={isProcessing}
                className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 cursor-pointer"
              >
                <GoogleIcon className="w-4 h-4" />
                <span>Accedi come Operatore Google</span>
              </button>
            </div>

            {/* List existing Google accounts if any */}
            {savedAccounts.filter(a => a.provider === 'google').length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-mono text-slate-400 font-bold block uppercase tracking-wider">
                  Account Google Salvati:
                </span>
                {savedAccounts.filter(a => a.provider === 'google').map(acc => (
                  <div
                    key={acc.id}
                    onClick={() => {
                      setIsGoogleModalOpen(false);
                      handleSelectSavedAccount(acc);
                    }}
                    className="p-2.5 rounded-xl bg-[#131D33] hover:bg-[#1a2847] border border-white/10 hover:border-blue-500/40 cursor-pointer flex items-center justify-between text-xs transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center justify-center font-mono font-bold text-xs">
                        G
                      </div>
                      <div>
                        <strong className="text-white font-mono block group-hover:text-blue-300 transition-colors">{acc.username}</strong>
                        <span className="text-[10px] text-slate-400 font-mono">{acc.email}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-blue-400 font-bold">Entra →</span>
                  </div>
                ))}
              </div>
            )}

            {/* Custom Google account input form */}
            <div className="border-t border-white/5 pt-3">
              <span className="text-[10px] font-mono text-slate-400 block mb-2 uppercase tracking-wider">
                Oppure inserisci la tua Gmail:
              </span>
              <form onSubmit={handleGoogleSubmit} className="space-y-2.5">
                <input
                  type="email"
                  required
                  placeholder="tua.email@gmail.com"
                  value={googleInputEmail}
                  onChange={(e) => setGoogleInputEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#090D17] border border-white/10 focus:border-blue-500 text-xs text-white font-mono"
                />
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-2.5 rounded-xl font-mono font-bold text-xs text-white bg-slate-800 hover:bg-slate-700 border border-white/10 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <GoogleIcon className="w-3.5 h-3.5" />
                  <span>Conferma e Accedi</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: GITHUB AUTHENTICATION MODAL */}
      {/* ============================================================== */}
      {isGitHubModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-sans">
          <div className="relative w-full max-w-sm bg-[#0E1526] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/20 flex items-center justify-center">
                  <GitHubIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white leading-tight">Autorizza con GitHub</h3>
                  <p className="text-[10px] text-slate-400 font-mono">ZeroDay Developer OAuth</p>
                </div>
              </div>
              <button 
                onClick={() => setIsGitHubModalOpen(false)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Collega il tuo account GitHub per sincronizzare il tuo status hacker e i certificati di sicurezza.
            </p>

            {/* 1-CLICK INSTANT GITHUB LOGIN */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" /> Accesso Rapido Sviluppatore
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">1-CLICK</span>
              </div>
              <button
                type="button"
                onClick={() => handleGitHubInstantLogin('GitHub_Hacker')}
                disabled={isProcessing}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 cursor-pointer font-mono"
              >
                <GitHubIcon className="w-4 h-4 text-slate-950" />
                <span>Autorizza come GitHub Hacker</span>
              </button>
            </div>

            {/* List existing GitHub accounts if any */}
            {savedAccounts.filter(a => a.provider === 'github').length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-mono text-slate-400 font-bold block uppercase tracking-wider">
                  Account GitHub Salvati:
                </span>
                {savedAccounts.filter(a => a.provider === 'github').map(acc => (
                  <div
                    key={acc.id}
                    onClick={() => {
                      setIsGitHubModalOpen(false);
                      handleSelectSavedAccount(acc);
                    }}
                    className="p-2.5 rounded-xl bg-[#131D33] hover:bg-[#1a2847] border border-white/10 hover:border-emerald-500/40 cursor-pointer flex items-center justify-between text-xs transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-800 text-white border border-white/20 flex items-center justify-center font-mono font-bold text-xs">
                        GH
                      </div>
                      <div>
                        <strong className="text-white font-mono block group-hover:text-emerald-400 transition-colors">{acc.username}</strong>
                        <span className="text-[10px] text-slate-400 font-mono">{acc.email}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">Entra →</span>
                  </div>
                ))}
              </div>
            )}

            {/* Custom GitHub handle form */}
            <div className="border-t border-white/5 pt-3">
              <span className="text-[10px] font-mono text-slate-400 block mb-2 uppercase tracking-wider">
                Oppure inserisci il tuo username GitHub:
              </span>
              <form onSubmit={handleGitHubSubmit} className="space-y-2.5">
                <input
                  type="text"
                  required
                  placeholder="es. octocat o tuo-handle"
                  value={githubInputHandle}
                  onChange={(e) => setGithubInputHandle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#090D17] border border-white/10 focus:border-white text-xs text-white font-mono"
                />
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-2.5 rounded-xl font-mono font-bold text-xs text-white bg-slate-800 hover:bg-slate-700 border border-white/10 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <GitHubIcon className="w-3.5 h-3.5" />
                  <span>Autorizza Username GitHub</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: PASSWORDLESS 2FA EMAIL LOGIN MODAL */}
      {/* ============================================================== */}
      {isEmailOtpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-sans">
          <div className="relative w-full max-w-sm bg-[#0E1526] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-sm text-white">Accesso Rapido via 2FA Email</h3>
              </div>
              <button 
                onClick={() => {
                  setIsEmailOtpModalOpen(false);
                  setOtpStep('request');
                  setSimulatedRelayCode(null);
                }} 
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Accedi istantaneamente al tuo profilo inserendo il codice di sicurezza a 6 cifre inviato alla tua email.
            </p>

            {/* Simulated Terminal Toast for Relay */}
            {simulatedRelayCode && (
              <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 space-y-1">
                <span className="text-[10px] font-mono block">[CYBER RELAY DISPATCHED CODE]:</span>
                <span className="font-mono text-lg font-black text-cyan-300 tracking-widest">{simulatedRelayCode}</span>
              </div>
            )}

            {otpStep === 'request' ? (
              <form onSubmit={handleOtpLoginRequest} className="space-y-3">
                <div>
                  <label className="text-[11px] font-mono text-slate-300 block mb-1">
                    La tua Email Operatore
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="operatore@redteam.org"
                    value={otpLoginEmail}
                    onChange={(e) => setOtpLoginEmail(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#090D17] border border-white/10 focus:border-cyan-500 text-xs text-white font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-3 rounded-xl font-mono font-bold text-xs text-slate-950 bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Mail className="w-4 h-4" />
                  <span>INVIA CODICE OTP 2FA</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleOtpLoginVerify} className="space-y-3">
                <div>
                  <label className="text-[11px] font-mono text-slate-300 block mb-1">
                    Inserisci il codice a 6 cifre ricevuto
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={otpLoginCode}
                    onChange={(e) => setOtpLoginCode(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#090D17] border border-cyan-500 text-center tracking-widest text-base font-black text-cyan-300 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-3 rounded-xl font-mono font-bold text-xs text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>VERIFICA & ENTRA</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: DATABASE INSPECTOR MODAL (database/logins.json) */}
      {/* ============================================================== */}
      {isDbInspectorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in font-sans">
          <div className="relative w-full max-w-2xl bg-[#0D1424] border border-emerald-500/30 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-100 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white flex items-center gap-2">
                    Database Logins Operatori
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-[10px]">
                      database/logins.json
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Posizione e sincronizzazione in tempo reale degli account registrati.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsDbInspectorOpen(false)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Storage Path Info Card */}
            <div className="p-3.5 rounded-2xl bg-[#080C15] border border-white/10 space-y-2 shrink-0 text-xs font-mono">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
                <span className="text-slate-400 font-bold uppercase tracking-wider">📁 File su Disco:</span>
                <span className="text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30 select-all break-all">
                  c:\Users\Admin\Documents\ProgettiVari\zeroday_app\database\logins.json
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
                <span className="text-slate-400 font-bold uppercase tracking-wider">💾 Storage Browser:</span>
                <span className="text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30 select-all">
                  localStorage.getItem('zeroday_database_accounts_v1')
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px]">
                <span className="text-slate-400 font-bold">Account Registrati:</span>
                <span className="text-white font-bold px-2 py-0.5 rounded bg-white/10">
                  {savedAccounts.length} Operatori
                </span>
              </div>
            </div>

            {/* Scrollable Database Accounts & JSON View */}
            <div className="overflow-y-auto space-y-4 pr-1 flex-1 font-mono text-xs">
              {/* Accounts Cards */}
              <div className="space-y-2">
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">
                  Account Trovati nel Database:
                </span>
                {savedAccounts.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5 text-center text-slate-400 text-xs">
                    Nessun account attualmente memorizzato. Crea un account o accedi per vederlo qui!
                  </div>
                ) : (
                  savedAccounts.map((acc, index) => (
                    <div 
                      key={acc.id} 
                      className="p-3 rounded-xl bg-[#121B30] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 text-[10px]">#{index + 1}</span>
                          <strong className="text-white text-xs">{acc.username}</strong>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${
                            acc.provider === 'google' 
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                              : acc.provider === 'github'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          }`}>
                            {acc.provider}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Email: <span className="text-slate-300">{acc.email || 'N/A'}</span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Creato: {new Date(acc.createdAt).toLocaleString()} | Ultimo Login: {new Date(acc.lastLoginAt).toLocaleString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] shrink-0">
                        <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300">
                          XP: {acc.userState.xp} | Streak: {acc.userState.streakDays}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsDbInspectorOpen(false);
                            handleSelectSavedAccount(acc);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold cursor-pointer transition-colors"
                        >
                          Accedi →
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Raw JSON Preview */}
              <div className="space-y-1 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                    Contenuto JSON Raw (database/logins.json):
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyDatabaseJson}
                    className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {copySuccess ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copySuccess ? 'Copiato!' : 'Copia JSON'}</span>
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-[#060911] border border-white/10 text-emerald-400/90 overflow-x-auto text-[10px] max-h-48 leading-relaxed">
                  {rawDbContent || '[]'}
                </pre>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between shrink-0 font-mono text-xs">
              <button
                type="button"
                onClick={handleReloadDatabase}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Ricarica dal Disco</span>
              </button>
              <button
                type="button"
                onClick={() => setIsDbInspectorOpen(false)}
                className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold cursor-pointer transition-colors"
              >
                Chiudi Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthPage;
