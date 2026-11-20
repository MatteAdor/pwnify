import React, { useState, useEffect } from 'react';
import { UserState } from '../../types';
import { sound } from '../../utils/soundEngine';
import { useLanguage, saveLanguage } from '../../utils/language';
import { getCachedVersionInfo, isNativeApp, openAppNotificationSettings } from '../../utils/platform';
import { 
  isStreakRemindersEnabled, 
  setStreakRemindersEnabled, 
  rescheduleStreakReminders, 
  cancelAllStreakReminders, 
  getNotificationPermissionStatus,
  requestNotificationPermission
} from '../../utils/streakReminders';
import { updateManager } from '../../utils/updateManager';
import { TerminalThemeId, ARSENAL_THEMES, ArsenalTheme } from '../Arsenal/CyberArsenalModal';
import { 
  ArrowLeft, Edit3, Check, Lock, Shield, Sparkles, 
  Volume2, VolumeX, Palette, Globe, RefreshCw, Trash2, 
  LogOut, LogIn, ExternalLink, ShieldCheck, Key, FileText,
  Cookie, AlertCircle, Play, Bell
} from 'lucide-react';

interface SettingsPageProps {
  isOpen: boolean;
  onClose: () => void;
  userState: UserState;
  onUpdateUsername?: (newUsername: string) => { success: boolean; error?: string };
  onUpdateBio?: (newBio: string) => { success: boolean; error?: string };
  onOpenPaywall: () => void;
  onOpenAuth?: () => void;
  onOpenArsenal?: () => void;
  onOpenLegal?: (tab: 'privacy' | 'terms' | 'refund' | 'cookies') => void;
  onOpenCookiePrefs?: () => void;
  onResetData?: () => void;
  currentTheme?: TerminalThemeId;
  onSelectTheme?: (themeId: TerminalThemeId) => void;
  currentTitle?: string;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  isOpen,
  onClose,
  userState,
  onUpdateUsername,
  onUpdateBio,
  onOpenPaywall,
  onOpenAuth,
  onOpenArsenal,
  onOpenLegal,
  onOpenCookiePrefs,
  onResetData,
  currentTheme = 'cyber_emerald',
  onSelectTheme,
  currentTitle
}) => {
  const { lang, setLanguage, t } = useLanguage();
  const isEn = lang === 'en';

  const [usernameInput, setUsernameInput] = useState<string>(userState.username);
  const [bioInput, setBioInput] = useState<string>(userState.bio || '');
  const [usernameSuccess, setUsernameSuccess] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [bioSuccess, setBioSuccess] = useState<string | null>(null);

  const [isMuted, setIsMuted] = useState<boolean>(sound.getMuted());
  const [remindersEnabled, setRemindersEnabled] = useState<boolean>(() => isStreakRemindersEnabled());
  const [systemPermState, setSystemPermState] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown');
  const [remindersFeedback, setRemindersFeedback] = useState<string | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState<boolean>(false);
  const [updateFeedback, setUpdateFeedback] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !isNativeApp()) return;
    let isSubscribed = true;

    const updateStatus = async () => {
      const status = await getNotificationPermissionStatus();
      if (isSubscribed) {
        setSystemPermState(status);
        if (status === 'denied') {
          setRemindersEnabled(false);
        }
      }
    };

    updateStatus();

    const handleFocus = () => {
      updateStatus();
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      isSubscribed = false;
      window.removeEventListener('focus', handleFocus);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const versionInfo = getCachedVersionInfo();
  const activeSha256 = updateManager.getState().apkSha256;

  const handleSaveUsername = () => {
    sound.playTap();
    setUsernameError(null);
    setUsernameSuccess(null);

    const trimmed = usernameInput.trim();
    if (trimmed.length < 3) {
      setUsernameError(isEn ? 'Callsign must be at least 3 characters.' : 'Il Callsign deve avere almeno 3 caratteri.');
      return;
    }

    if (onUpdateUsername) {
      const res = onUpdateUsername(trimmed);
      if (res.success) {
        setUsernameSuccess(isEn ? 'Callsign updated.' : 'Callsign aggiornato.');
        setTimeout(() => setUsernameSuccess(null), 3000);
      } else {
        setUsernameError(res.error || (isEn ? 'Failed to update callsign.' : 'Errore nell\'aggiornamento.'));
      }
    }
  };

  const handleSaveBio = () => {
    sound.playTap();
    setBioSuccess(null);
    if (onUpdateBio) {
      const res = onUpdateBio(bioInput.trim());
      if (res.success) {
        setBioSuccess(isEn ? 'Bio updated.' : 'Bio salvata.');
        setTimeout(() => setBioSuccess(null), 3000);
      }
    }
  };

  const handleToggleSound = () => {
    const nextMuted = sound.toggleMute();
    setIsMuted(nextMuted);
  };

  const handleTestSound = () => {
    if (!isMuted) {
      sound.playVictoryFanfare();
    }
  };

  const handleToggleReminders = async () => {
    sound.playTap();

    if (isNativeApp()) {
      const currentStatus = await getNotificationPermissionStatus();
      setSystemPermState(currentStatus);

      // Requirement 3: If permission is denied by system, open app settings directly without repetitive prompt
      if (currentStatus === 'denied') {
        setRemindersFeedback(
          isEn
            ? 'Notifications blocked by system. Opening App Settings...'
            : 'Notifiche disattivate dal sistema. Apertura impostazioni...'
        );
        setTimeout(() => setRemindersFeedback(null), 4000);
        await openAppNotificationSettings();
        return;
      }

      // If user wants to turn reminders ON
      if (!remindersEnabled) {
        if (currentStatus === 'prompt') {
          // Requirement 2 (a): request permission when user activates toggle in settings
          const granted = await requestNotificationPermission();
          if (!granted) {
            setSystemPermState('denied');
            setStreakRemindersEnabled(false);
            setRemindersEnabled(false);
            setRemindersFeedback(
              isEn
                ? 'Permission denied. You can enable it in device Settings.'
                : 'Permesso negato. Puoi abilitarlo nelle Impostazioni del telefono.'
            );
            setTimeout(() => setRemindersFeedback(null), 4000);
            return;
          }
          setSystemPermState('granted');
        }

        setStreakRemindersEnabled(true);
        setRemindersEnabled(true);
        await rescheduleStreakReminders(userState, { lang });
        setRemindersFeedback(
          isEn
            ? 'Streak reminders active (19:00 & 21:30)'
            : 'Promemoria streak attivi (19:00 & 21:30)'
        );
        setTimeout(() => setRemindersFeedback(null), 3000);
        return;
      } else {
        // Disabling reminders
        setStreakRemindersEnabled(false);
        setRemindersEnabled(false);
        await cancelAllStreakReminders();
        setRemindersFeedback(
          isEn ? 'Streak reminders disabled' : 'Promemoria streak disattivati'
        );
        setTimeout(() => setRemindersFeedback(null), 3000);
        return;
      }
    }

    // Web fallback
    const next = !remindersEnabled;
    setStreakRemindersEnabled(next);
    setRemindersEnabled(next);
    setRemindersFeedback(
      next
        ? (isEn ? 'Streak reminders active (19:00 & 21:30)' : 'Promemoria streak attivi (19:00 & 21:30)')
        : (isEn ? 'Streak reminders disabled' : 'Promemoria streak disattivati')
    );
    setTimeout(() => setRemindersFeedback(null), 3000);
  };

  const handleCheckUpdate = async () => {
    sound.playTap();
    setIsCheckingUpdate(true);
    setUpdateFeedback(null);
    try {
      await updateManager.checkForUpdates({ ignoreDebounce: true, forceImmediateCheck: true });
      const state = updateManager.getState();
      if (state.status === 'FLEXIBLE_AVAILABLE' || state.status === 'FORCE_REQUIRED') {
        setUpdateFeedback(isEn ? `New build v${state.latestVersionName} available!` : `Nuovo aggiornamento v${state.latestVersionName} disponibile!`);
      } else {
        setUpdateFeedback(isEn ? 'Pwnify is fully up to date.' : 'Pwnify è aggiornato all\'ultima versione.');
      }
    } catch {
      setUpdateFeedback(isEn ? 'Update check offline.' : 'Controllo aggiornamenti non disponibile.');
    } finally {
      setIsCheckingUpdate(false);
      setTimeout(() => setUpdateFeedback(null), 4000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#090D16] flex flex-col h-full w-full overflow-y-auto animate-fade-in font-sans text-zinc-100 select-none">
      
      {/* 1. STICKY TOP APP BAR */}
      <header className="sticky top-0 z-20 bg-[#090D16]/95 backdrop-blur-md border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            sound.playTap();
            onClose();
          }}
          className="flex items-center gap-2 p-1.5 -ml-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors cursor-pointer group"
          aria-label="Back to Profile"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-xs font-mono font-bold">
            {isEn ? 'Profile' : 'Profilo'}
          </span>
        </button>

        <h1 className="text-sm sm:text-base font-bold text-white font-mono tracking-tight">
          {isEn ? 'Settings & Preferences' : 'Impostazioni & Preferenze'}
        </h1>

        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
          v{versionInfo.versionName}
        </span>
      </header>

      {/* 2. MAIN SCROLLABLE CONTENT */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-8 pb-32">

        {/* SECTION 1: OPERATOR IDENTITY */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
            <Shield className="w-4 h-4" />
            <span>{isEn ? 'OPERATOR IDENTITY' : 'IDENTITÀ OPERATORE'}</span>
          </div>

          <div className="rounded-2xl bg-[#0D121D] border border-zinc-800 p-4 sm:p-5 space-y-4 shadow-lg">
            
            {/* Avatar & Callsign display */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500/20 via-zinc-900 to-zinc-950 border-2 border-emerald-500/60 flex items-center justify-center shrink-0">
                <span className="font-mono font-black text-xl text-emerald-400 uppercase">
                  {userState.username.slice(0, 2)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-base text-white truncate">
                    {userState.username}
                  </span>
                  {userState.isPro && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 fill-current" /> PRO
                    </span>
                  )}
                </div>
                <p className="text-xs font-mono text-zinc-400 truncate mt-0.5">
                  {currentTitle || userState.customTitle || 'Certified Operator'}
                </p>
              </div>
            </div>

            {/* Callsign Editor */}
            <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
              <div className="flex justify-between items-center text-xs font-mono">
                <label className="text-zinc-400 font-bold uppercase tracking-wider text-[11px]">
                  {isEn ? 'Edit Callsign' : 'Modifica Callsign'}
                </label>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {usernameInput.length}/30
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={30}
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-100 font-mono focus:outline-none focus:border-emerald-500/60"
                  placeholder="Callsign..."
                />
                {usernameInput !== userState.username && (
                  <button
                    type="button"
                    onClick={handleSaveUsername}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono text-xs transition-colors cursor-pointer shrink-0"
                  >
                    {isEn ? 'Save' : 'Salva'}
                  </button>
                )}
              </div>
              {usernameSuccess && (
                <p className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> {usernameSuccess}
                </p>
              )}
              {usernameError && (
                <p className="text-[11px] font-mono text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {usernameError}
                </p>
              )}
            </div>

            {/* Bio Editor */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-mono">
                <label className="text-zinc-400 font-bold uppercase tracking-wider text-[11px]">
                  {isEn ? 'Bio & Mission Statement' : 'Bio & Obiettivo'}
                </label>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {bioInput.length}/90
                </span>
              </div>
              <textarea
                maxLength={90}
                rows={2}
                value={bioInput}
                onChange={(e) => setBioInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 font-sans focus:outline-none focus:border-emerald-500/60 resize-none leading-relaxed"
                placeholder={isEn ? 'Describe your cyber expertise or current certification focus...' : 'Descrivi le tue competenze o l\'obiettivo di certificazione...'}
              />
              {bioInput !== (userState.bio || '') && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveBio}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono text-xs transition-colors cursor-pointer"
                  >
                    {isEn ? 'Save Bio' : 'Salva Bio'}
                  </button>
                </div>
              )}
              {bioSuccess && (
                <p className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> {bioSuccess}
                </p>
              )}
            </div>

            {/* Pro Upgrade Card */}
            {!userState.isPro ? (
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-zinc-900 to-zinc-900 border border-amber-500/30 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-amber-400 font-mono flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 fill-current" />
                    {isEn ? 'Upgrade to Pwnify PRO' : 'Passa a Pwnify PRO'}
                  </div>
                  <p className="text-[11px] text-zinc-400 font-sans">
                    {isEn ? 'Official exam labs, PBQ simulators & unlimited 1v1 Arena.' : 'Lab esami ufficiali, PBQ simulator e Arena 1v1 illimitata.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    sound.playTap();
                    onOpenPaywall();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs shrink-0 cursor-pointer shadow-md"
                >
                  PROVA PRO
                </button>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-xs font-mono text-emerald-400">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>{isEn ? 'Pwnify PRO Active: Full Enterprise Access' : 'Pwnify PRO Attivo: Accesso Completo Esami & Arena'}</span>
              </div>
            )}

          </div>
        </section>

        {/* SECTION 2: CRT THEMES & CUSTOMIZATION */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">
            <Palette className="w-4 h-4" />
            <span>{isEn ? 'TERMINAL HUD & PHOSPHOR THEMES' : 'TEMI TERMINALE & FOSFORI CRT'}</span>
          </div>

          <div className="rounded-2xl bg-[#0D121D] border border-zinc-800 p-4 sm:p-5 space-y-3 shadow-lg">
            <p className="text-xs text-zinc-400 font-sans">
              {isEn ? 'Choose the visual phosphor style for simulations, terminal popups, and quiz HUDs.' : 'Seleziona lo stile fosforo per simulazioni, prompt di comando e terminali.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {ARSENAL_THEMES.map((th: ArsenalTheme) => {
                const isSelected = currentTheme === th.id;
                return (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => {
                      sound.playTap();
                      onSelectTheme?.(th.id);
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-zinc-900 border-indigo-400 shadow-sm ring-1 ring-indigo-400/30'
                        : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: th.accentColor }} />
                      <div>
                        <div className="text-xs font-bold font-mono text-white">
                          {th.name}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono">
                          {th.description}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* SECTION 3: AUDIO & FEEDBACK FX */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
            <Volume2 className="w-4 h-4" />
            <span>{isEn ? 'AUDIO & SYNTHESIZED FX' : 'AUDIO & EFFETTI SONORI'}</span>
          </div>

          <div className="rounded-2xl bg-[#0D121D] border border-zinc-800 p-4 sm:p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-mono font-bold text-white block">
                  {isEn ? 'Synthesizer Audio Feedback' : 'Feedback Sonoro Sintetizzato'}
                </span>
                <span className="text-[11px] text-zinc-400 font-sans">
                  {isMuted 
                    ? (isEn ? 'Muted (silent operations)' : 'Disattivato (sessione silenziosa)') 
                    : (isEn ? 'Active (haptic audio oscillators)' : 'Attivo (oscillatori sintetizzati)')}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {!isMuted && (
                  <button
                    type="button"
                    onClick={handleTestSound}
                    className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 text-emerald-400 text-xs font-mono flex items-center gap-1 cursor-pointer"
                    title={isEn ? 'Test Sound' : 'Prova Suono'}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleToggleSound}
                  className={`w-12 h-7 rounded-full transition-colors relative cursor-pointer ${
                    !isMuted ? 'bg-emerald-500' : 'bg-zinc-700'
                  }`}
                  aria-label="Toggle Sound"
                >
                  <div 
                    className={`w-5 h-5 rounded-full bg-white transition-transform duration-150 absolute top-1 ${
                      !isMuted ? 'left-6' : 'left-1'
                    }`} 
                  />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: STREAK NOTIFICATIONS & REMINDERS */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
            <Bell className="w-4 h-4" />
            <span>{isEn ? 'STREAK NOTIFICATIONS' : 'NOTIFICHE & PROMEMORIA STREAK'}</span>
          </div>

          <div className="rounded-2xl bg-[#0D121D] border border-zinc-800 p-4 sm:p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 pr-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold text-white block">
                    {isEn ? 'Daily Training Reminders' : 'Promemoria Giornalieri'}
                  </span>
                  {isNativeApp() && systemPermState === 'denied' && (
                    <button
                      type="button"
                      onClick={async () => {
                        sound.playTap();
                        await openAppNotificationSettings();
                      }}
                      className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-rose-950/80 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 rounded cursor-pointer transition-colors"
                      title={isEn ? 'Open App Settings' : 'Apri Impostazioni app'}
                    >
                      {isEn ? 'DISABLED BY SYSTEM' : 'DISATTIVATE DAL SISTEMA'}
                    </button>
                  )}
                </div>
                <span className="text-[11px] text-zinc-400 font-sans block">
                  {isEn
                    ? 'Receive reminders at 19:00 and an urgent alert at 21:30 if your streak is at risk.'
                    : 'Ricevi un promemoria alle 19:00 e un avviso alle 21:30 se la tua serie di studio è a rischio.'}
                </span>
                {isNativeApp() && systemPermState === 'denied' ? (
                  <button
                    type="button"
                    onClick={async () => {
                      sound.playTap();
                      await openAppNotificationSettings();
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-400 hover:text-amber-300 underline pt-1 cursor-pointer"
                  >
                    <span>{isEn ? 'Open App Settings to enable' : 'Apri Impostazioni app per abilitarle'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                ) : !isNativeApp() ? (
                  <span className="text-[10px] text-zinc-500 font-mono block pt-0.5">
                    {isEn ? '(Available on Android native app)' : '(Disponibile sull\'App nativa Android)'}
                  </span>
                ) : null}
              </div>

              <button
                type="button"
                onClick={handleToggleReminders}
                className={`w-12 h-7 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                  isNativeApp() && systemPermState === 'denied'
                    ? 'bg-zinc-800 border border-zinc-700'
                    : remindersEnabled && (!isNativeApp() || systemPermState === 'granted')
                    ? 'bg-emerald-500'
                    : 'bg-zinc-700'
                }`}
                aria-label="Toggle Streak Reminders"
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform duration-150 absolute top-1 ${
                    remindersEnabled && (!isNativeApp() || systemPermState === 'granted')
                      ? 'left-6'
                      : 'left-1'
                  }`}
                />
              </button>
            </div>

            {remindersFeedback && (
              <div className="text-[11px] font-mono text-emerald-400 animate-fade-in flex items-center gap-1.5 pt-2 border-t border-zinc-800/80">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{remindersFeedback}</span>
              </div>
            )}
          </div>
        </section>

        {/* SECTION 5: LANGUAGE & LOCALE */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
            <Globe className="w-4 h-4" />
            <span>{isEn ? 'LANGUAGE & LOCALE' : 'LINGUA & REGIONE'}</span>
          </div>

          <div className="rounded-2xl bg-[#0D121D] border border-zinc-800 p-4 sm:p-5 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-zinc-200">
                {isEn ? 'Interface & Exam Language' : 'Lingua interfaccia & domande'}
              </span>

              <div className="flex rounded-xl bg-zinc-900 p-1 border border-zinc-800 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => {
                    sound.playTap();
                    setLanguage('it');
                    saveLanguage('it');
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    lang === 'it' 
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-sm' 
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  IT Italiano
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sound.playTap();
                    setLanguage('en');
                    saveLanguage('en');
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    lang === 'en' 
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-sm' 
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  EN English
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: ACCOUNT & AUTHENTICATION */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
            <Lock className="w-4 h-4" />
            <span>{isEn ? 'ACCOUNT & CLOUD PERSISTENCE' : 'ACCOUNT & SINCRONIZZAZIONE'}</span>
          </div>

          <div className="rounded-2xl bg-[#0D121D] border border-zinc-800 p-4 sm:p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 min-w-0 pr-3">
                <span className="text-xs font-mono font-bold text-white block">
                  {userState.isLoggedIn ? (isEn ? 'Connected Cloud Account' : 'Account Cloud Collegato') : (isEn ? 'Anonymous Guest Profile' : 'Profilo Ospite Anonimo')}
                </span>
                <span className="text-[11px] font-mono text-zinc-400 truncate block">
                  {userState.userEmail || (isEn ? 'Progress stored locally in device storage' : 'Progressi salvati localmente sul dispositivo')}
                </span>
              </div>

              {!userState.isLoggedIn ? (
                <button
                  type="button"
                  onClick={() => {
                    sound.playTap();
                    onOpenAuth?.();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs transition-colors shrink-0 cursor-pointer shadow-md"
                >
                  {isEn ? 'Sign in' : 'Accedi'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    sound.playTap();
                    onOpenAuth?.();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-red-400 font-mono font-bold text-xs transition-colors shrink-0 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 inline mr-1" />
                  Logout
                </button>
              )}
            </div>
          </div>
        </section>

        {/* SECTION 6: APP UPDATES & RUNTIME */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
            <RefreshCw className="w-4 h-4" />
            <span>{isEn ? 'MAINTENANCE & UPDATES' : 'MANUTENZIONE & AGGIORNAMENTI'}</span>
          </div>

          <div className="rounded-2xl bg-[#0D121D] border border-zinc-800 p-4 sm:p-5 space-y-4 shadow-lg">
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block uppercase">{isEn ? 'Version' : 'Versione'}</span>
                <span className="text-white font-bold">v{versionInfo.versionName}</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block uppercase">{isEn ? 'Distribution' : 'Canale'}</span>
                <span className="text-emerald-400 font-bold">{versionInfo.flavor === 'play' ? 'Play Store' : 'Direct APK'}</span>
              </div>
            </div>

            {activeSha256 && (
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-400 truncate">
                SHA-256: <span className="text-zinc-200">{activeSha256.slice(0, 16)}...{activeSha256.slice(-8)}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleCheckUpdate}
              disabled={isCheckingUpdate}
              className="w-full py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-emerald-500/40 text-white font-mono font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 text-emerald-400 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
              <span>{isCheckingUpdate ? (isEn ? 'Checking servers...' : 'Verifica in corso...') : (isEn ? 'Check for Updates' : 'Verifica Aggiornamenti')}</span>
            </button>

            {updateFeedback && (
              <p className="text-xs font-mono text-center text-emerald-400">
                {updateFeedback}
              </p>
            )}
          </div>
        </section>

        {/* SECTION 7: LEGAL & COMPLIANCE */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">
            <FileText className="w-4 h-4" />
            <span>{isEn ? 'LEGAL & COMPLIANCE' : 'NOTE LEGALI & PRIVACY'}</span>
          </div>

          <div className="rounded-2xl bg-[#0D121D] border border-zinc-800 divide-y divide-zinc-800/80 overflow-hidden shadow-lg">
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                onOpenLegal?.('privacy');
              }}
              className="w-full px-4 py-3 flex items-center justify-between text-xs font-mono text-zinc-300 hover:text-white hover:bg-zinc-900/50 transition-colors cursor-pointer"
            >
              <span>{isEn ? 'Privacy Policy (GDPR)' : 'Informativa Privacy (GDPR)'}</span>
              <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playTap();
                onOpenLegal?.('terms');
              }}
              className="w-full px-4 py-3 flex items-center justify-between text-xs font-mono text-zinc-300 hover:text-white hover:bg-zinc-900/50 transition-colors cursor-pointer"
            >
              <span>{isEn ? 'Terms of Service' : 'Termini di Servizio'}</span>
              <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playTap();
                onOpenLegal?.('refund');
              }}
              className="w-full px-4 py-3 flex items-center justify-between text-xs font-mono text-zinc-300 hover:text-white hover:bg-zinc-900/50 transition-colors cursor-pointer"
            >
              <span>{isEn ? 'Consumer Refund Policy' : 'Politica di Rimborso Consumatori'}</span>
              <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playTap();
                onOpenCookiePrefs?.();
              }}
              className="w-full px-4 py-3 flex items-center justify-between text-xs font-mono text-zinc-300 hover:text-white hover:bg-zinc-900/50 transition-colors cursor-pointer"
            >
              <span>{isEn ? 'Cookie Preferences' : 'Preferenze Cookie'}</span>
              <Cookie className="w-3.5 h-3.5 text-zinc-500" />
            </button>
          </div>
        </section>

        {/* SECTION 8: DANGER ZONE & DATA MANAGEMENT */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-red-400 uppercase tracking-wider">
            <Trash2 className="w-4 h-4" />
            <span>{isEn ? 'DANGER ZONE' : 'ZONA DI SICUREZZA'}</span>
          </div>

          <div className="rounded-2xl bg-red-950/20 border border-red-500/20 p-4 sm:p-5 space-y-3">
            <div className="space-y-1">
              <span className="text-xs font-mono font-bold text-white block">
                {isEn ? 'Reset Local Progress & Cache' : 'Ripristina Progressi & Cache'}
              </span>
              <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                {isEn ? 'Clears completed labs, local streaks, and telemetry cache on this device. Cloud accounts will resync on next login.' : 'Cancella lab completati, serie locale e cache di telemetria da questo dispositivo.'}
              </p>
            </div>

            {!showResetConfirm ? (
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setShowResetConfirm(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-mono font-bold text-xs transition-colors cursor-pointer"
              >
                {isEn ? 'Reset Local Data...' : 'Ripristina Dati Locali...'}
              </button>
            ) : (
              <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 space-y-2">
                <p className="text-xs font-mono text-red-300 font-bold">
                  {isEn ? 'Are you sure? This will reload the app with baseline state.' : 'Confermi? L\'app verrà ricaricata allo stato iniziale.'}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playTap();
                      setShowResetConfirm(false);
                      onResetData?.();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-400 text-white font-mono font-bold text-xs cursor-pointer"
                  >
                    {isEn ? 'Yes, Reset Data' : 'Sì, Cancella Tutto'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      sound.playTap();
                      setShowResetConfirm(false);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 font-mono text-xs cursor-pointer"
                  >
                    {isEn ? 'Cancel' : 'Annulla'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

      </main>

    </div>
  );
};

export default SettingsPage;
