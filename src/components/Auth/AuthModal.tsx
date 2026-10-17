import React, { useState } from 'react';
import { UserState } from '../../types';
import { sound } from '../../utils/soundEngine';
import { sanitizeCallsign } from '../../utils/security';
import { 
  registerAccount, 
  loginAccount, 
  UserAccount,
  deleteUserAccount,
  getCurrentSession
} from '../../utils/userDatabase';
import { 
  X, Lock, Mail, User, ShieldCheck, 
  ArrowRight, LogIn, UserPlus, LogOut, CheckCircle2, Trash2 
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  userState: UserState;
  onLoginSuccess: (account: UserAccount) => void;
  onLogout: () => void;
  onOpenLegal?: (tab: 'privacy' | 'terms' | 'refund' | 'cookies') => void;
  onOpenCookiePrefs?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  userState,
  onLoginSuccess,
  onLogout,
  onOpenLegal,
  onOpenCookiePrefs
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [callsign, setCallsign] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  if (!isOpen) return null;

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const safeName = sanitizeCallsign(callsign);
    if (!safeName || safeName.length < 3) {
      setErrorMsg('Il Callsign deve contenere almeno 3 caratteri alfanumerici.');
      sound.playPayloadBlocked();
      return;
    }

    if (!email || !email.includes('@') || !email.includes('.')) {
      setErrorMsg('Inserisci un indirizzo email valido.');
      sound.playPayloadBlocked();
      return;
    }

    if (password.length < 6) {
      setErrorMsg('La password deve contenere almeno 6 caratteri.');
      sound.playPayloadBlocked();
      return;
    }

    const res = registerAccount(safeName, email, password);
    if (!res.success || !res.account) {
      setErrorMsg(res.error || 'Errore durante la registrazione.');
      sound.playPayloadBlocked();
      return;
    }

    sound.playVictoryFanfare();
    confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    onLoginSuccess(res.account);
    setSuccessMsg(`Profilo operatore ${res.account.username} creato con successo!`);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const identifier = callsign.trim();
    if (!identifier) {
      setErrorMsg('Inserisci il tuo Callsign o la tua Email.');
      sound.playPayloadBlocked();
      return;
    }

    if (!password) {
      setErrorMsg('Inserisci la password di autenticazione.');
      sound.playPayloadBlocked();
      return;
    }

    const res = loginAccount(identifier, password);
    if (!res.success || !res.account) {
      setErrorMsg(res.error || 'Credenziali non valide.');
      sound.playPayloadBlocked();
      return;
    }

    sound.playExploitSuccess();
    onLoginSuccess(res.account);
    setSuccessMsg(`Accesso autorizzato. Benvenuto, operatore ${res.account.username}.`);
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in font-sans">
      <div 
        className="relative w-full max-w-md my-auto rounded-3xl bg-[#0C1220] border border-white/10 p-6 sm:p-7 shadow-2xl text-slate-100 overflow-hidden"
        style={{ boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.7), 0 0 35px -5px rgba(16, 185, 129, 0.15)' }}
      >
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={() => {
            sound.playTap();
            onClose();
          }}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors z-20"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-5 text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider inline-block mb-1.5">
            0xDAY // AUTHENTICATION_GATEWAY
          </span>
          <h2 className="text-xl font-extrabold text-white">
            {userState.isLoggedIn ? 'Profilo Operatore Attivo' : mode === 'login' ? 'Accedi al Tuo Account' : 'Registra Nuovo Operatore'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {userState.isLoggedIn 
              ? 'Gestisci la tua sessione crittografica e sincronizza i progressi.'
              : mode === 'login'
              ? 'Inserisci le tue credenziali per riprendere streak, ELO e laboratori.'
              : 'Crea il tuo profilo cyber e unisciti alla community di ZeroDay.'}
          </p>
        </div>

        {/* ALREADY LOGGED IN VIEW */}
        {userState.isLoggedIn ? (
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-2xl bg-[#090D16] border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">CALLSIGN:</span>
                <span className="font-bold text-emerald-400">{userState.username}</span>
              </div>
              {userState.userEmail && (
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">EMAIL:</span>
                  <span className="text-slate-200">{userState.userEmail}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">RATING:</span>
                <span className="text-indigo-400 font-bold">{userState.elo} ELO</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">STATUS:</span>
                <span className={userState.isPro ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
                  {userState.isPro ? 'ZeroDay PRO Active' : 'Account Standard Free'}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                sound.playTap();
                onLogout();
                onClose();
              }}
              className="w-full py-2.5 px-4 rounded-xl border border-white/10 bg-[#141C2E] hover:bg-white/5 text-slate-300 font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-98"
            >
              <LogOut className="w-4 h-4" />
              <span>TERMINA SESSIONE (LOGOUT)</span>
            </button>

            {/* GDPR Art. 17 - Right to Erasure / Cancellazione Account */}
            <div className="pt-2 border-t border-white/5 space-y-2">
              {!isConfirmingDelete ? (
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="w-full py-2 px-3 rounded-xl border border-red-500/20 bg-red-950/20 hover:bg-red-950/40 text-red-400 font-mono text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  <span>Elimina Account & Dati Personali (Art. 17 GDPR)</span>
                </button>
              ) : (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 space-y-2 font-mono text-xs animate-fade-in">
                  <span className="text-red-300 font-bold block text-[11px] leading-tight">
                    ⚠️ Confermi la cancellazione definitiva di questo account e di tutti i progressi? L'operazione è immediata e irreversibile.
                  </span>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const session = getCurrentSession();
                        if (session) {
                          deleteUserAccount(session.id);
                        }
                        sound.playExploitSuccess();
                        onLogout();
                        setIsConfirmingDelete(false);
                        onClose();
                      }}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-[10px]"
                    >
                      SÌ, CANCELLA TUTTO
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsConfirmingDelete(false)}
                      className="py-1.5 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 text-[10px]"
                    >
                      Annulla
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Legal & Compliance Quick Links */}
            <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] font-mono text-slate-400">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLegal?.('privacy');
                }}
                className="hover:text-emerald-400 underline transition-colors"
              >
                Privacy Policy
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLegal?.('terms');
                }}
                className="hover:text-emerald-400 underline transition-colors"
              >
                Termini di Servizio
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLegal?.('refund');
                }}
                className="hover:text-emerald-400 underline transition-colors"
              >
                Rimborso 14gg
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCookiePrefs?.();
                }}
                className="hover:text-emerald-400 underline transition-colors"
              >
                Cookie
              </button>
            </div>
          </div>
        ) : (
          /* LOGIN / SIGNUP FORM */
          <div>
            {/* Mode Tabs */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-[#090D16] border border-white/10 mb-4 font-mono text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setMode('login');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  mode === 'login'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>ACCEDI</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setMode('signup');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  mode === 'signup'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>REGISTRATI</span>
              </button>
            </div>

            {/* Error or Success notification */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs font-mono mb-3 animate-shake">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-mono mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={mode === 'login' ? handleLogin : handleSignup} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-mono text-slate-300 block mb-1">
                  {mode === 'login' ? 'Callsign Hacker o Email' : 'Scegli il tuo Callsign Operatore'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={24}
                    value={callsign}
                    onChange={(e) => setCallsign(e.target.value)}
                    placeholder={mode === 'login' ? 'es. 0x_GhostRider' : 'es. 0x_DarkKnight'}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#090D16] border border-white/10 focus:border-emerald-500/60 text-slate-100 font-mono text-xs outline-none transition-colors"
                  />
                </div>
              </div>

              {mode === 'signup' && (
                <div>
                  <label className="text-[11px] font-mono text-slate-300 block mb-1">
                    Indirizzo Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="operatore@dominio.it"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#090D16] border border-white/10 focus:border-emerald-500/60 text-slate-100 font-mono text-xs outline-none transition-colors"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-[11px] font-mono text-slate-300 block mb-1">
                  Password di Accesso
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#090D16] border border-white/10 focus:border-emerald-500/60 text-slate-100 font-mono text-xs outline-none transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-3 px-4 rounded-xl font-mono font-bold text-xs text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-all flex items-center justify-center gap-2 shadow-neon-emerald transform active:scale-98"
              >
                <span>{mode === 'login' ? 'ACCEDI ALLA CYBER ACADEMY' : 'CREA PROFILO OPERATORE'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Legal footer links */}
            <div className="pt-3 mt-3 border-t border-white/5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] font-mono text-slate-400">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLegal?.('privacy');
                }}
                className="hover:text-emerald-400 underline transition-colors"
              >
                Privacy
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLegal?.('terms');
                }}
                className="hover:text-emerald-400 underline transition-colors"
              >
                Termini
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLegal?.('refund');
                }}
                className="hover:text-emerald-400 underline transition-colors"
              >
                Rimborso
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCookiePrefs?.();
                }}
                className="hover:text-emerald-400 underline transition-colors"
              >
                Cookie
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
