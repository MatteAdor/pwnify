import React, { useState, useEffect } from 'react';
import { UserState } from '../../types';
import { 
  send2FACode, 
  verify2FACode, 
  completeEmailRegistration, 
  loginEmailAccount, 
  loginWithOAuth, 
  loginWithEmailOtp,
  getRegisteredAccounts,
  syncDatabaseWithBackend,
  getCurrentSession,
  UserAccount 
} from '../../utils/userDatabase';
import { supabase, isSupabaseConfigured } from '../../config/supabase';
import { isNativeApp } from '../../utils/platform';
import { sound } from '../../utils/soundEngine';
import { useLanguage } from '../../utils/language';
import { 
  Lock, Mail, KeyRound, User, 
  ArrowRight, CheckCircle2, AlertTriangle, 
  Sparkles, Terminal, Check, X,
  ShieldCheck, Globe
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AuthPageProps {
  onLoginSuccess: (account: UserAccount) => void;
  onGuestAccess?: () => void;
  onOpenLegal?: (tab: 'privacy' | 'terms' | 'refund' | 'cookies') => void;
  currentUserState?: UserState;
  onBackToPortal?: () => void;
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
  onGuestAccess,
  onOpenLegal,
  currentUserState,
  onBackToPortal
}) => {
  const { lang, setLanguage, t } = useLanguage();
  const isEn = lang === 'en';

  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [signupStep, setSignupStep] = useState<SignupStep>('email');

  // Form Fields for Signup
  const [email, setEmail] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [callsign, setCallsign] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Mandatory Form Consents (GDPR & Minor Protection)
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [ageAccepted, setAgeAccepted] = useState(false);

  // Form Fields for Standard Login
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Rate Limiting on Login (Security Defense against Brute Force)
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  // Countdown timer for lockout
  useEffect(() => {
    let interval: any;
    if (lockoutTimer > 0) {
      interval = setInterval(() => {
        setLockoutTimer(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  // OAuth Modals
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [googleInputEmail, setGoogleInputEmail] = useState('');
  const [googleInputCallsign, setGoogleInputCallsign] = useState('');

  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);
  const [githubInputHandle, setGithubInputHandle] = useState('');
  const [githubInputCallsign, setGithubInputCallsign] = useState('');
  const [githubVerifiedEmail, setGithubVerifiedEmail] = useState('');

  // Passwordless Email OTP Login Modal
  const [isEmailOtpModalOpen, setIsEmailOtpModalOpen] = useState(false);
  const [otpLoginEmail, setOtpLoginEmail] = useState('');
  const [otpLoginCode, setOtpLoginCode] = useState('');
  const [otpStep, setOtpStep] = useState<'request' | 'verify'>('request');

  // Registered Accounts in Database (for this device only)
  const [savedAccounts, setSavedAccounts] = useState<UserAccount[]>([]);

  // Feedback State
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [simulatedRelayCode, setSimulatedRelayCode] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Load registered accounts on mount, sync with disk database/logins.json, and parse OAuth redirects
  useEffect(() => {
    let unsubscribeSupabase: (() => void) | undefined;

    try {
      // 1. Initial cached accounts
      setSavedAccounts(getRegisteredAccounts());

      // 2. Synchronize with physical file database/logins.json
      syncDatabaseWithBackend().then(accs => {
        if (accs && accs.length > 0) {
          setSavedAccounts(accs);
        }
      }).catch(() => {});

      // 3. Listen for Supabase OAuth login events (Google & GitHub)
      if (isSupabaseConfigured) {
        const handleSupabaseUser = (user: any) => {
          const provider = (user.app_metadata?.provider as 'google' | 'github') || 'google';
          const rawEmail = (user.email as string) || (user.user_metadata?.email as string) || '';
          const gitHandle = (user.user_metadata?.user_name as string) || 
                           (user.user_metadata?.preferred_username as string) || 
                           (user.user_metadata?.name as string) || 
                           (rawEmail ? rawEmail.split('@')[0] : '');
          const effectiveEmail = rawEmail || (gitHandle ? `${gitHandle.toLowerCase()}@users.noreply.github.com` : '');
          const metaName = (user.user_metadata?.full_name as string) || 
                           (user.user_metadata?.name as string) || 
                           gitHandle || 
                           (effectiveEmail ? effectiveEmail.split('@')[0] : 'Operator');

          const accounts = getRegisteredAccounts();
          const existing = accounts.find(a => 
            (effectiveEmail && a.email && a.email.toLowerCase() === effectiveEmail.toLowerCase()) ||
            (provider === 'github' && gitHandle && a.username && a.username.toLowerCase() === gitHandle.toLowerCase())
          );

          if (existing) {
            const res = loginWithOAuth(provider, { 
              name: metaName, 
              email: effectiveEmail,
              customUsername: existing.username 
            }, currentUserState);
            sound.playVictoryFanfare();
            confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
            onLoginSuccess(res.account);
          } else {
            // Brand new OAuth registration: allow user to select and confirm callsign
            if (provider === 'google') {
              setGoogleInputEmail(effectiveEmail);
              const suggested = metaName.split(' ')[0].replace(/[^a-zA-Z0-9_]/g, '') || effectiveEmail.split('@')[0];
              setGoogleInputCallsign(suggested);
              setIsGoogleModalOpen(true);
            } else {
              setGithubInputHandle(gitHandle || metaName);
              const suggested = (gitHandle || metaName.split(' ')[0]).replace(/[^a-zA-Z0-9_]/g, '') || 'Operator_0x';
              setGithubInputCallsign(suggested);
              setGithubVerifiedEmail(effectiveEmail);
              setIsGitHubModalOpen(true);
            }
          }
        };

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            handleSupabaseUser(session.user);
          }
        });

        if (authListener?.subscription) {
          unsubscribeSupabase = () => authListener.subscription.unsubscribe();
        }

        // Check if session was already established on initial load
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) {
            const activeSession = getCurrentSession();
            if (!activeSession) {
              handleSupabaseUser(session.user);
            }
          }
        }).catch(() => {});
      }

      // 4. Check for direct Google OAuth Token in URL hash (#access_token=...)
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
                const mail = data.email || 'user.google@gmail.com';
                const name = data.name || mail.split('@')[0];
                const res = loginWithOAuth('google', { name, email: mail }, currentUserState);
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
              setErrorMsg(isEn ? 'Error validating Google token.' : 'Errore durante la convalida del token Google.');
            })
            .finally(() => setIsProcessing(false));
          return;
        }
      }
    } catch {
      setSavedAccounts([]);
    }

    return () => {
      if (unsubscribeSupabase) {
        unsubscribeSupabase();
      }
    };
  }, [onLoginSuccess, isEn, currentUserState]);

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
      setErrorMsg(isEn ? 'Please enter a valid email address.' : 'Inserisci un indirizzo email valido.');
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
      setSuccessMsg(isEn ? `2FA code generated and transmitted to ${cleanEmail}.` : `Codice 2FA generato e trasmesso all'indirizzo ${cleanEmail}.`);
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
      setErrorMsg(isEn ? 'Please enter the 6-digit security code.' : 'Inserisci il codice di sicurezza a 6 cifre.');
      sound.playPayloadBlocked();
      return;
    }

    const result = verify2FACode(email, twoFactorCode);
    if (!result.valid) {
      setErrorMsg(result.error || (isEn ? 'Invalid or expired 2FA code.' : 'Codice 2FA errato o scaduto.'));
      sound.playPayloadBlocked();
      return;
    }

    sound.playExploitSuccess();
    setSuccessMsg(isEn ? 'Two-Factor Authentication (2FA) completed successfully!' : 'Autenticazione a due fattori (2FA) completata con successo!');
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

    if (!termsAccepted) {
      setErrorMsg(isEn ? 'You must accept the Terms of Service and Privacy Policy to continue.' : 'Devi accettare i Termini di Servizio e la Privacy Policy per continuare.');
      sound.playPayloadBlocked();
      return;
    }

    if (!ageAccepted) {
      setErrorMsg(isEn ? 'You must confirm that you are at least 16 years old.' : 'Devi confermare di avere almeno 16 anni per l\'elaborazione dei dati.');
      sound.playPayloadBlocked();
      return;
    }

    if (callsign.trim().length < 3) {
      setErrorMsg(isEn ? 'Callsign must contain at least 3 characters.' : 'Il Callsign deve contenere almeno 3 caratteri.');
      sound.playPayloadBlocked();
      return;
    }

    if (password.length < 6) {
      setErrorMsg(isEn ? 'Password must contain at least 6 characters.' : 'La password deve contenere almeno 6 caratteri.');
      sound.playPayloadBlocked();
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg(isEn ? 'Passwords do not match.' : 'Le password non coincidono.');
      sound.playPayloadBlocked();
      return;
    }

    setIsProcessing(true);
    sound.playTap();

    setTimeout(() => {
      const res = completeEmailRegistration(email, callsign, password, currentUserState);
      setIsProcessing(false);

      if (!res.success || !res.account) {
        setErrorMsg(res.error || (isEn ? 'Error creating account.' : 'Errore durante la creazione dell\'account.'));
        sound.playPayloadBlocked();
        return;
      }

      sound.playVictoryFanfare();
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
      setSuccessMsg(isEn ? `Account ${res.account.username} created successfully!` : `Account per ${res.account.username} creato con successo!`);
      
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

    // Rate Limiting Defense
    if (lockoutTimer > 0) {
      setErrorMsg(isEn ? `Login temporarily locked for security. Try again in ${lockoutTimer} seconds.` : `Accesso temporaneamente bloccato per sicurezza. Riprova tra ${lockoutTimer} secondi.`);
      sound.playPayloadBlocked();
      return;
    }

    if (!loginIdentifier.trim()) {
      setErrorMsg(isEn ? 'Please enter your email or callsign.' : 'Inserisci la tua email o il tuo callsign.');
      sound.playPayloadBlocked();
      return;
    }

    if (!loginPassword) {
      setErrorMsg(isEn ? 'Please enter your password.' : 'Inserisci la tua password.');
      sound.playPayloadBlocked();
      return;
    }

    setIsProcessing(true);
    sound.playTap();

    setTimeout(() => {
      const res = loginEmailAccount(loginIdentifier, loginPassword, currentUserState);
      setIsProcessing(false);

      if (!res.success || !res.account) {
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);

        if (nextAttempts >= 5) {
          setLockoutTimer(60);
          setErrorMsg(isEn ? 'Too many consecutive failed attempts. Login locked for 60 seconds.' : 'Troppi tentativi falliti consecutivi. Accesso bloccato per 60 secondi.');
        } else {
          setErrorMsg(isEn ? `Invalid credentials (${nextAttempts}/5 attempts remaining).` : `Credenziali non valide (${nextAttempts}/5 tentativi rimasti).`);
        }
        sound.playPayloadBlocked();
        return;
      }

      // Successful login resets rate limiter
      setFailedAttempts(0);
      setLockoutTimer(0);
      sound.playExploitSuccess();
      setSuccessMsg(isEn ? `Welcome back, ${res.account.username}. Access granted.` : `Bentornato, ${res.account.username}. Accesso eseguito.`);
      setTimeout(() => {
        onLoginSuccess(res.account!);
      }, 600);
    }, 400);
  };

  // ---------------------------------------------------------------------------
  // GOOGLE OAUTH TRIGGERS & HANDLERS
  // ---------------------------------------------------------------------------
  const handleGoogleClick = async () => {
    sound.playTap();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (isSupabaseConfigured) {
      setIsProcessing(true);
      try {
        const redirectUrl = isNativeApp()
          ? 'https://zeroday-app.vercel.app/'
          : `${window.location.origin}/`;

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: isNativeApp()
          }
        });

        if (error) {
          console.warn('Supabase Google OAuth error:', error.message);
          setErrorMsg(error.message);
          setIsProcessing(false);
          return;
        }

        if (data?.url) {
          if (isNativeApp()) {
            const { Browser } = await import('@capacitor/browser');
            await Browser.open({ url: data.url, windowName: '_self' });
            setIsProcessing(false);
          } else {
            window.location.href = data.url;
          }
          return;
        }
      } catch (err: unknown) {
        setIsProcessing(false);
        const msg = err instanceof Error ? err.message : 'Google OAuth failed';
        setErrorMsg(msg);
        return;
      }
    }

    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (googleClientId && googleClientId.trim()) {
      const redirectUri = `${window.location.origin}/`;
      const scope = encodeURIComponent('email profile openid');
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(googleClientId.trim())}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${scope}&prompt=select_account`;
      if (isNativeApp()) {
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({ url: authUrl, windowName: '_self' });
      } else {
        window.location.href = authUrl;
      }
      return;
    }

    setIsGoogleModalOpen(true);
  };

  const handleGoogleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMail = googleInputEmail.trim().toLowerCase();
    if (!cleanMail || !cleanMail.includes('@') || !cleanMail.includes('.')) {
      setErrorMsg(isEn ? 'Please enter a valid Gmail address.' : 'Inserisci un indirizzo Gmail valido.');
      sound.playPayloadBlocked();
      return;
    }

    const cleanCallsign = googleInputCallsign.trim();
    if (!cleanCallsign || cleanCallsign.length < 3 || cleanCallsign.length > 20) {
      setErrorMsg(isEn ? 'Callsign must be 3-20 characters.' : 'Il Callsign deve contenere tra 3 e 20 caratteri.');
      sound.playPayloadBlocked();
      return;
    }

    setIsProcessing(true);
    sound.playTap();
    setErrorMsg(null);

    setTimeout(() => {
      const res = loginWithOAuth('google', { 
        name: cleanCallsign, 
        email: cleanMail,
        customUsername: cleanCallsign
      }, currentUserState);
      
      // Ensure new account begins at OnboardingFunnel
      if (res.account.userState) {
        res.account.userState.onboardingCompleted = false;
      }
      
      setIsProcessing(false);
      setIsGoogleModalOpen(false);
      sound.playVictoryFanfare();
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
      onLoginSuccess(res.account);
    }, 300);
  };

  // ---------------------------------------------------------------------------
  // GITHUB OAUTH TRIGGERS & HANDLERS
  // ---------------------------------------------------------------------------
  const handleGitHubClick = async () => {
    sound.playTap();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (isSupabaseConfigured) {
      setIsProcessing(true);
      try {
        const redirectUrl = isNativeApp()
          ? 'https://zeroday-app.vercel.app/'
          : `${window.location.origin}/`;

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'github',
          options: {
            redirectTo: redirectUrl,
            scopes: 'read:user user:email',
            skipBrowserRedirect: isNativeApp()
          }
        });

        if (error) {
          console.warn('Supabase GitHub OAuth error:', error.message);
          setErrorMsg(error.message);
          setIsProcessing(false);
          return;
        }

        if (data?.url) {
          if (isNativeApp()) {
            const { Browser } = await import('@capacitor/browser');
            await Browser.open({ url: data.url, windowName: '_self' });
            setIsProcessing(false);
          } else {
            window.location.href = data.url;
          }
          return;
        }
      } catch (err: unknown) {
        setIsProcessing(false);
        const msg = err instanceof Error ? err.message : 'GitHub OAuth failed';
        setErrorMsg(msg);
        return;
      }
    }

    setIsGitHubModalOpen(true);
  };

  const handleGitHubSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanHandle = githubInputHandle.trim().replace(/^@/, '');
    if (!cleanHandle || cleanHandle.length < 2) {
      setErrorMsg(isEn ? 'Please enter a valid GitHub username.' : 'Inserisci un username GitHub valido.');
      sound.playPayloadBlocked();
      return;
    }

    const cleanCallsign = (githubInputCallsign.trim() || cleanHandle).replace(/[^a-zA-Z0-9_]/g, '');
    if (!cleanCallsign || cleanCallsign.length < 3 || cleanCallsign.length > 20) {
      setErrorMsg(isEn ? 'Callsign must be 3-20 characters.' : 'Il Callsign deve contenere tra 3 e 20 caratteri.');
      sound.playPayloadBlocked();
      return;
    }

    setIsProcessing(true);
    sound.playTap();
    setErrorMsg(null);

    setTimeout(() => {
      const gitEmail = githubVerifiedEmail.trim() || `${cleanHandle.toLowerCase()}@users.noreply.github.com`;
      const res = loginWithOAuth('github', { 
        name: cleanCallsign, 
        email: gitEmail,
        customUsername: cleanCallsign
      }, currentUserState);

      // Ensure new account begins at OnboardingFunnel
      if (res.account.userState) {
        res.account.userState.onboardingCompleted = false;
      }

      setIsProcessing(false);
      setIsGitHubModalOpen(false);
      sound.playVictoryFanfare();
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
      onLoginSuccess(res.account);
    }, 300);
  };


  // ---------------------------------------------------------------------------
  // EMAIL PASSWORDLESS OTP LOGIN HANDLER
  // ---------------------------------------------------------------------------
  const handleOtpLoginRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMail = otpLoginEmail.trim().toLowerCase();
    if (!cleanMail || !cleanMail.includes('@')) {
      setErrorMsg(isEn ? 'Please enter a valid email address.' : 'Inserisci un indirizzo email valido.');
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
      setSuccessMsg(isEn ? `Temporary 2FA code sent to ${cleanMail}.` : `Codice 2FA temporaneo inviato a ${cleanMail}.`);
    }, 500);
  };

  const handleOtpLoginVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpLoginCode.trim().length !== 6) {
      setErrorMsg(isEn ? 'Please enter the 6-digit security code.' : 'Inserisci il codice di sicurezza a 6 cifre.');
      sound.playPayloadBlocked();
      return;
    }

    const verification = verify2FACode(otpLoginEmail, otpLoginCode);
    if (!verification.valid) {
      setErrorMsg(verification.error || (isEn ? 'Invalid 2FA code.' : 'Codice 2FA non valido.'));
      sound.playPayloadBlocked();
      return;
    }

    setIsProcessing(true);
    sound.playTap();

    setTimeout(() => {
      // Authenticate via email OTP (logs in or initializes account with current progress)
      const res = loginWithEmailOtp(otpLoginEmail, currentUserState);
      setIsProcessing(false);

      if (!res.success || !res.account) {
        // If account doesn't exist, create it on the fly with current progress
        const cleanName = otpLoginEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
        const created = completeEmailRegistration(otpLoginEmail, cleanName, 'Pass_' + Math.random().toString(36).substring(2, 8), currentUserState);
        if (created.success && created.account) {
          sound.playVictoryFanfare();
          setIsEmailOtpModalOpen(false);
          onLoginSuccess(created.account);
          return;
        }
        setErrorMsg(res.error || (isEn ? 'Error during login.' : 'Errore durante l\'accesso.'));
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
    <div className="min-h-screen w-full bg-[#060A12] text-zinc-100 flex flex-col justify-center items-center px-4 py-8 sm:py-12 relative font-sans select-none safe-top safe-bottom">
      {/* Main Authentication Card */}
      <div 
        className="w-full max-w-sm sm:max-w-md bg-[#0D121D] border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-xl relative z-10 space-y-6"
      >
        {/* Header with Brand & Language Switcher */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            {onBackToPortal && (
              <button
                type="button"
                onClick={onBackToPortal}
                className="text-[11px] font-mono text-zinc-400 hover:text-white flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded hover:bg-zinc-800"
                title={isEn ? 'Back to Portal' : 'Torna al Portale'}
              >
                ← {isEn ? 'Portal' : 'Portale'}
              </button>
            )}
            <span className="font-mono text-xs font-bold text-emerald-400 tracking-wider">
              0xDAY
            </span>
          </div>

          <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-lg border border-zinc-800">
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                setLanguage('en');
              }}
              className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold transition-colors ${
                lang === 'en'
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-500 hover:text-white'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                setLanguage('it');
              }}
              className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold transition-colors ${
                lang === 'it'
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-500 hover:text-white'
              }`}
            >
              IT
            </button>
          </div>
        </div>

        {/* Clean Header */}
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {authMode === 'login' 
              ? (isEn ? 'Log in' : 'Accedi') 
              : (isEn ? 'Create Account' : 'Crea Account')}
          </h1>
        </div>

        {/* Global Notifications */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-zinc-900 border border-zinc-800 font-mono text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              setAuthMode('login');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`py-2 rounded-lg transition-colors flex items-center justify-center cursor-pointer ${
              authMode === 'login'
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span>{t.loginTab}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              setAuthMode('signup');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`py-2 rounded-lg transition-colors flex items-center justify-center cursor-pointer ${
              authMode === 'signup'
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span>{t.signupTab}</span>
          </button>
        </div>

        {/* Fast Authentication: Google & GitHub */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={handleGoogleClick}
            disabled={isProcessing}
            className="w-full h-11 px-3 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-200 font-medium text-xs flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
          >
            <GoogleIcon className="w-4 h-4" />
            <span>{t.loginWithGoogle}</span>
          </button>

          <button
            type="button"
            onClick={handleGitHubClick}
            disabled={isProcessing}
            className="w-full h-11 px-3 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-200 font-medium text-xs flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
          >
            <GitHubIcon className="w-4 h-4 text-white" />
            <span>{t.loginWithGithub}</span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-zinc-800 w-full" />
          <span className="bg-[#0D121D] px-3 font-mono text-[10px] text-zinc-500 uppercase tracking-widest absolute">
            {isEn ? 'or with email' : 'oppure con email'}
          </span>
        </div>

        {/* TAB 1: STANDARD LOGIN */}
        {authMode === 'login' && (
          <div className="space-y-4 animate-fade-in">
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-mono text-zinc-400 block mb-1.5">
                  {isEn ? 'Email or Username' : 'Email o Username'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder={isEn ? 'user@domain.com' : 'utente@dominio.it'}
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-zinc-900/60 border border-zinc-800 focus:border-emerald-500 text-sm text-white placeholder-zinc-600 font-mono transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-mono text-zinc-400 block mb-1.5">
                  {t.password}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-zinc-900/60 border border-zinc-800 focus:border-emerald-500 text-sm text-white placeholder-zinc-600 font-mono transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-3.5 px-4 rounded-xl font-mono font-bold text-xs text-zinc-950 bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center gap-2 transition-colors cursor-pointer mt-1"
              >
                <span>{t.loginButton}</span>
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
                className="text-xs font-mono text-zinc-400 hover:text-white transition-colors"
              >
                {t.forgotPassword}
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
                {t.stepEmail}
              </span>
              <span className="text-slate-600">→</span>
              <span className={`flex items-center gap-1 ${signupStep === '2fa' ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                {t.step2FA}
              </span>
              <span className="text-slate-600">→</span>
              <span className={`flex items-center gap-1 ${signupStep === 'password' ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                {t.stepPassword}
              </span>
            </div>

            {/* STEP 1: ENTER EMAIL */}
            {signupStep === 'email' && (
              <form onSubmit={handleRequest2FA} className="space-y-4">
                <div>
                  <label className="text-[11px] font-mono text-slate-300 block mb-1">
                    {t.enterEmailLabel}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      placeholder={isEn ? 'user@example.com' : 'utente@dominio.it'}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-[#090D17] border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm text-white placeholder-slate-600 font-mono transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-3 px-4 rounded-xl font-mono font-bold text-xs text-zinc-950 bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <span>{t.send2FACodeBtn}</span>
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
                      Dispatched security token to <strong className="text-cyan-200">{email}</strong>:
                    </p>
                    <div className="inline-block py-1 px-3 rounded-lg bg-black/60 border border-cyan-400/50 font-mono text-lg font-black text-cyan-300 tracking-widest">
                      {simulatedRelayCode}
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-mono text-slate-300">
                      {t.enter2FACodeLabel}
                    </label>
                    <span className="text-[10px] font-mono text-emerald-400">
                      Sent to {email}
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
                    ← Edit email
                  </button>
                  <button
                    type="button"
                    disabled={resendCooldown > 0}
                    onClick={(e) => handleRequest2FA(e as any)}
                    className="text-cyan-400 hover:text-cyan-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-3 px-4 rounded-xl font-mono font-bold text-xs text-zinc-950 bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <span>{t.verify2FACodeBtn}</span>
                  <Check className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* STEP 3: CREATE PASSWORD & CALLSIGN */}
            {signupStep === 'password' && (
              <form onSubmit={handleCompleteRegistration} className="space-y-3.5 animate-fade-in">
                <div>
                  <label className="text-[11px] font-mono text-slate-300 block mb-1">
                    {t.callsignLabel}
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
                    {t.createPasswordLabel}
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
                    {t.confirmPasswordLabel}
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

                {/* Mandatory Form Consents */}
                <div className="space-y-2 pt-2 border-t border-white/5 text-xs text-slate-300">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-0.5 rounded border-slate-700 bg-[#090D17] text-emerald-500 focus:ring-emerald-500"
                    />
                    <span>
                      {t.termsConsentPrefix}{' '}
                      <button
                        type="button"
                        onClick={() => onOpenLegal && onOpenLegal('terms')}
                        className="text-emerald-400 hover:underline inline font-mono"
                      >
                        {t.termsOfService}
                      </button>{' '}
                      {t.termsConsentAnd}{' '}
                      <button
                        type="button"
                        onClick={() => onOpenLegal && onOpenLegal('privacy')}
                        className="text-emerald-400 hover:underline inline font-mono"
                      >
                        {t.privacyPolicy}
                      </button>
                      .
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ageAccepted}
                      onChange={(e) => setAgeAccepted(e.target.checked)}
                      className="mt-0.5 rounded border-slate-700 bg-[#090D17] text-emerald-500 focus:ring-emerald-500"
                    />
                    <span>{t.ageConsentLabel}</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full mt-2 py-3 px-4 rounded-xl font-mono font-bold text-xs text-zinc-950 bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 fill-current" />
                  <span>{t.completeSignupBtn}</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* Optional Sandbox / Guest Access link */}
        {onGuestAccess && (
          <div className="pt-3 text-center border-t border-zinc-800">
            <button
              type="button"
              onClick={onGuestAccess}
              className="text-xs font-mono text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              {isEn ? 'Continue as Guest →' : 'Continua come Ospite →'}
            </button>
          </div>
        )}

        {/* Footer Legal Links */}
        <div className="pt-1 text-center flex flex-wrap items-center justify-center gap-2 text-[10px] font-mono text-zinc-600">
          <button
            type="button"
            onClick={() => onOpenLegal && onOpenLegal('privacy')}
            className="hover:text-zinc-400 transition-colors"
          >
            {t.privacyPolicy}
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => onOpenLegal && onOpenLegal('terms')}
            className="hover:text-zinc-400 transition-colors"
          >
            {t.termsOfService}
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => onOpenLegal && onOpenLegal('refund')}
            className="hover:text-zinc-400 transition-colors"
          >
            {t.refund}
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => onOpenLegal && onOpenLegal('cookies')}
            className="hover:text-zinc-400 transition-colors"
          >
            {t.cookies}
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: GOOGLE AUTHENTICATION MODAL */}
      {/* ============================================================== */}
      {isGoogleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in font-sans">
          <div className="relative w-full max-w-sm bg-[#0C1322] border border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-4 text-zinc-100 font-mono">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0">
                  <GoogleIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white leading-tight">
                    {googleInputEmail ? (isEn ? 'GOOGLE CONNECTED' : 'ACCOUNT GOOGLE COLLEGATO') : t.googleOAuthTitle}
                  </h3>
                  <p className="text-[10px] text-emerald-400 font-bold">
                    {googleInputEmail ? (isEn ? 'CHOOSE YOUR CALLSIGN' : 'SCEGLI IL TUO NOME UTENTE') : t.googleOAuthSubtitle}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsGoogleModalOpen(false)} 
                className="text-zinc-400 hover:text-white p-1 rounded-lg cursor-pointer transition-colors"
                aria-label="Chiudi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error banner */}
            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 font-mono">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleGoogleSubmit} className="space-y-3.5">
              {/* Email display or input */}
              {googleInputEmail ? (
                <div className="p-3 rounded-xl bg-zinc-900 border border-emerald-500/30 flex items-center justify-between">
                  <div className="truncate">
                    <span className="text-[10px] text-zinc-400 uppercase block">Email Verificata</span>
                    <span className="text-xs font-bold text-emerald-400 truncate block">{googleInputEmail}</span>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                </div>
              ) : (
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1 uppercase font-bold">
                    {isEn ? 'Google Account Email:' : 'Email Account Google:'}
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="your.email@gmail.com"
                    value={googleInputEmail}
                    onChange={(e) => setGoogleInputEmail(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-emerald-500 text-xs text-white font-mono"
                  />
                </div>
              )}

              {/* Callsign / Username Input */}
              <div>
                <label className="text-[10px] text-zinc-300 block mb-1 uppercase font-bold tracking-wider">
                  {isEn ? 'Choose Your Callsign / Username:' : 'Scegli il tuo Callsign / Nome Operatore:'}
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  minLength={3}
                  maxLength={20}
                  placeholder={isEn ? 'e.g. DarkGhost_0x' : 'es. DarkGhost_0x'}
                  value={googleInputCallsign}
                  onChange={(e) => setGoogleInputCallsign(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-xl bg-zinc-950 border border-emerald-500/40 focus:border-emerald-400 text-sm text-white font-mono shadow-inner focus:outline-none"
                />
                <p className="text-[10px] text-zinc-400 mt-1.5 font-mono">
                  {isEn 
                    ? '3-20 characters · Required before continuing to onboarding' 
                    : '3-20 caratteri · Necessario prima di accedere all\'addestramento'}
                </p>
              </div>

              {/* Action Button */}
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-3.5 rounded-xl font-mono font-bold text-xs uppercase tracking-wider text-slate-950 bg-emerald-400 hover:bg-emerald-300 border border-emerald-400/30 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/25 active:scale-98"
              >
                <span>{isEn ? 'CONFIRM & START ONBOARDING' : 'CONFERMA E INIZIA ADDESTRAMENTO'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: GITHUB AUTHENTICATION MODAL */}
      {/* ============================================================== */}
      {isGitHubModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in font-sans">
          <div className="relative w-full max-w-sm bg-[#0C1322] border border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-4 text-zinc-100 font-mono">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center shadow-sm shrink-0">
                  <GitHubIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white leading-tight">
                    {githubInputHandle ? (isEn ? 'GITHUB CONNECTED' : 'ACCOUNT GITHUB COLLEGATO') : t.githubOAuthTitle}
                  </h3>
                  <p className="text-[10px] text-emerald-400 font-bold">
                    {githubInputHandle ? (isEn ? 'CHOOSE YOUR CALLSIGN' : 'SCEGLI IL TUO NOME UTENTE') : t.githubOAuthSubtitle}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsGitHubModalOpen(false)} 
                className="text-zinc-400 hover:text-white p-1 rounded-lg cursor-pointer transition-colors"
                aria-label="Chiudi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error banner */}
            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 font-mono">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleGitHubSubmit} className="space-y-3.5">
              {/* GitHub Handle / Identity Badge */}
              {githubInputHandle ? (
                <div className="p-3 rounded-xl bg-zinc-900 border border-emerald-500/30 flex items-center justify-between">
                  <div className="truncate">
                    <span className="text-[10px] text-zinc-400 uppercase block font-bold">
                      {isEn ? 'Verified GitHub Identity' : 'Profilo GitHub Verificato'}
                    </span>
                    <span className="text-xs font-bold text-emerald-400 truncate block font-mono">
                      @{githubInputHandle.replace(/^@/, '')}
                    </span>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                </div>
              ) : (
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1 uppercase font-bold">
                    {isEn ? 'GitHub Username:' : 'Username GitHub:'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="octocat"
                    value={githubInputHandle}
                    onChange={(e) => setGithubInputHandle(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-emerald-500 text-xs text-white font-mono"
                  />
                </div>
              )}

              {/* Callsign / Username Input */}
              <div>
                <label className="text-[10px] text-zinc-300 block mb-1 uppercase font-bold tracking-wider">
                  {isEn ? 'Choose Your Callsign / Username:' : 'Scegli il tuo Callsign / Nome Operatore:'}
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  minLength={3}
                  maxLength={20}
                  placeholder={isEn ? 'e.g. DarkGhost_0x' : 'es. DarkGhost_0x'}
                  value={githubInputCallsign}
                  onChange={(e) => setGithubInputCallsign(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-xl bg-zinc-950 border border-emerald-500/40 focus:border-emerald-400 text-sm text-white font-mono shadow-inner focus:outline-none"
                />
                <p className="text-[10px] text-zinc-400 mt-1.5 font-mono">
                  {isEn 
                    ? '3-20 characters · Required before continuing to onboarding' 
                    : '3-20 caratteri · Necessario prima di accedere all\'addestramento'}
                </p>
              </div>

              {/* Action Button */}
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-3.5 rounded-xl font-mono font-bold text-xs uppercase tracking-wider text-slate-950 bg-emerald-400 hover:bg-emerald-300 border border-emerald-400/30 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/25 active:scale-98"
              >
                <span>{isEn ? 'CONFIRM & START ONBOARDING' : 'CONFERMA E INIZIA ADDESTRAMENTO'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
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
                <h3 className="font-bold text-sm text-white">{t.emailOtpTitle}</h3>
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
              {t.emailOtpDesc}
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
                    {t.yourEmail}
                  </label>
                  <input
                    type="email"
                    required
                    placeholder={isEn ? 'user@example.com' : 'utente@dominio.it'}
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
                  <span>{t.sendOtpBtn}</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleOtpLoginVerify} className="space-y-3">
                <div>
                  <label className="text-[11px] font-mono text-slate-300 block mb-1">
                    {t.enterReceivedCode}
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
                  <span>{t.verifyAndEnterBtn}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}


    </div>
  );
};

export default AuthPage;
