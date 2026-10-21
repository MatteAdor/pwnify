import React, { useState } from 'react';
import { UserState } from '../types';
import { getRankFromElo } from '../data/ranks';
import { sound } from '../utils/soundEngine';
import { useLanguage, saveLanguage } from '../utils/language';
import { getCachedVersionInfo } from '../utils/platform';
import { 
  Flame, Ticket, Sparkles, Terminal, Smartphone, 
  Volume2, VolumeX, RotateCcw, Palette,
  LogIn, UserCheck, Settings, X, Shield,
  Globe, Edit3, Check, Zap, AlertCircle
} from 'lucide-react';

interface NavbarProps {
  userState: UserState;
  onTogglePro: () => void;
  onOpenPaywall: () => void;
  onResetData: () => void;
  isGodMode?: boolean;
  onOpenDailyBreach?: () => void;
  onOpenArsenal?: () => void;
  onOpenAuth?: () => void;
  onUpdateUsername?: (newUsername: string) => { success: boolean; error?: string };
  onUpdateLanguage?: (lang: 'it' | 'en') => void;
  onOpenPortal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  userState,
  onTogglePro,
  onOpenPaywall,
  onResetData,
  isGodMode = true,
  onOpenDailyBreach,
  onOpenArsenal,
  onOpenAuth,
  onUpdateUsername,
  onUpdateLanguage,
  onOpenPortal
}) => {
  const { lang, setLanguage, t } = useLanguage();
  const rank = getRankFromElo(userState.elo);
  const [isMuted, setIsMuted] = useState<boolean>(sound.getMuted());
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Username edit state in settings
  const [isEditingUsername, setIsEditingUsername] = useState<boolean>(false);
  const [usernameInput, setUsernameInput] = useState<string>(userState.username);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameSuccess, setUsernameSuccess] = useState<string | null>(null);

  // Calculate 7-day cooldown for username change
  const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
  const elapsedChange = userState.lastUsernameChangeTimestamp 
    ? Date.now() - userState.lastUsernameChangeTimestamp 
    : Infinity;
  const isUsernameCooldownActive = elapsedChange < COOLDOWN_MS;
  const cooldownDaysRemaining = isUsernameCooldownActive 
    ? Math.ceil((COOLDOWN_MS - elapsedChange) / (24 * 60 * 60 * 1000)) 
    : 0;

  // Chosen profession displayed above username
  const chosenProfession = userState.profession || (
    userState.goal === 'soc_blue' ? 'SOC Analyst' :
    userState.goal === 'web_hacking' ? 'Penetration Tester' :
    userState.goal === 'linux_bash' ? 'Linux Systems Specialist' :
    'Cyber Warfare Operator'
  );

  const handleToggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  const handleSaveUsername = () => {
    setUsernameError(null);
    setUsernameSuccess(null);

    if (isUsernameCooldownActive) {
      setUsernameError(
        lang === 'it' 
          ? `Puoi cambiare nome tra ${cooldownDaysRemaining} giorni.` 
          : `You can change your username in ${cooldownDaysRemaining} days.`
      );
      return;
    }

    if (!usernameInput || usernameInput.trim().length < 3) {
      setUsernameError(
        lang === 'it' 
          ? 'Il nome utente deve avere almeno 3 caratteri.' 
          : 'Username must be at least 3 characters.'
      );
      return;
    }

    if (onUpdateUsername) {
      const res = onUpdateUsername(usernameInput.trim());
      if (!res.success) {
        setUsernameError(res.error || (lang === 'it' ? 'Errore durante il salvataggio' : 'Failed to update username'));
        sound.playPayloadBlocked();
      } else {
        sound.playExploitSuccess();
        setUsernameSuccess(lang === 'it' ? 'Nome aggiornato con successo!' : 'Callsign updated successfully!');
        setIsEditingUsername(false);
      }
    } else {
      setIsEditingUsername(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-[#090D16] border-b border-zinc-800 px-3 sm:px-6 pt-safe pb-2.5 min-h-[56px] flex items-center">
        <div className="w-full max-w-6xl mx-auto flex items-center justify-between gap-2.5">
          {/* Brand Logo & Portal Navigation */}
          <div 
            onClick={() => {
              sound.playTap();
              if (onOpenPortal) onOpenPortal();
            }}
            className="flex items-center gap-2 cursor-pointer select-none shrink-0"
            title={lang === 'it' ? 'Torna al Portale & Download APK' : 'Back to Portal & Download APK'}
          >
            <img 
              src="/brand/zeroday_icon_192.png" 
              alt="ZeroDay" 
              className="w-6 h-6 rounded object-cover border border-emerald-500/30 shadow-sm" 
            />
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-base sm:text-lg tracking-tight text-white">
                Zero<span className="text-emerald-400">Day</span>
              </span>
              {/* PRO badge if user has PRO */}
              {userState.isPro && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-emerald-400 border border-emerald-500/30 font-bold">
                  PRO
                </span>
              )}
            </div>
          </div>

          {/* Minimalist Top Telemetry & Controls: Visible & High Contrast */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* 2x XP Telemetry Indicator / Paywall Trigger */}
            <div 
              onClick={() => {
                sound.playTap();
                if (!userState.isPro) onOpenPaywall();
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition-all cursor-pointer font-mono font-bold text-xs ${
                userState.isPro
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm'
                  : 'bg-zinc-900/90 border-zinc-800 hover:border-amber-500/50 text-zinc-400 hover:text-amber-300'
              }`}
              title={userState.isPro ? '2x XP Boost Attivo (PRO)' : 'Clicca per sbloccare 2x XP Boost permanente'}
            >
              <Zap className={`w-3.5 h-3.5 ${userState.isPro ? 'text-amber-400 fill-amber-400' : 'text-amber-400/70'}`} />
              <span className="text-[11px] font-mono">2x XP</span>
            </div>

            {/* Daily Streak Counter */}
            <div 
              onClick={() => sound.playTap()}
              className="flex items-center gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-800 hover:border-amber-500/40 transition-colors cursor-pointer"
              title={t.dailyStreak}
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-mono font-bold text-xs text-amber-300">
                {userState.streakDays}d
              </span>
            </div>

            {/* Arena Tickets Counter */}
            <div 
              className="flex items-center gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-800 hover:border-indigo-500/40 transition-colors"
              title={t.arenaTickets}
            >
              <Ticket className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-mono font-bold text-xs text-indigo-300">
                {userState.isPro ? (
                  <span className="text-emerald-400 font-bold text-xs">PRO</span>
                ) : (
                  <span>{userState.arenaTickets}/{userState.maxTickets}</span>
                )}
              </span>
            </div>

            {/* PRO Upgrade CTA (Only if free) */}
            {!userState.isPro && (
              <button
                onClick={() => {
                  sound.playTap();
                  onOpenPaywall();
                }}
                className="hidden xs:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-mono font-bold text-xs transition-all transform active:scale-95 cursor-pointer shadow-sm"
              >
                <Sparkles className="w-3 h-3 fill-zinc-950" />
                <span>PRO</span>
              </button>
            )}

            {/* Settings & Account Gear Button */}
            <button
              onClick={() => {
                sound.playTap();
                setUsernameInput(userState.username);
                setUsernameError(null);
                setUsernameSuccess(null);
                setIsSettingsOpen(true);
              }}
              className="flex items-center gap-1.5 p-1.5 sm:p-2 rounded-lg bg-zinc-900/90 border border-zinc-700/80 hover:border-emerald-500/50 text-zinc-300 hover:text-white transition-all active:scale-95 cursor-pointer shadow-sm"
              title="Impostazioni & Account"
              aria-label="Settings and Profile"
            >
              <Settings className="w-4 h-4 text-zinc-200" />
            </button>
          </div>
        </div>
      </header>

      {/* Tactical Settings & Profile Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 animate-fade-in">
          <div className="relative w-full max-w-md bg-[#0D121D] border border-zinc-800 rounded-2xl p-5 shadow-2xl text-zinc-100 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-zinc-400" />
                <div>
                  <h3 className="font-mono font-bold text-sm text-white">
                    {t.settingsConfig}
                  </h3>
                  <p className="text-[11px] font-mono text-zinc-400">
                    {t.settingsSubtitle}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  sound.playTap();
                  setIsSettingsOpen(false);
                }}
                className="p-1 rounded text-zinc-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Chiudi impostazioni"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Operator Account Section */}
            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider">
                  {t.activeOperator}
                </span>
              </div>

              {/* Profession Displayed Above Username */}
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 text-[11px] font-mono font-bold w-fit">
                <Shield className="w-3 h-3 text-emerald-400" />
                <span className="uppercase tracking-wide">{chosenProfession}</span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 truncate">
                  <div className="w-9 h-9 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center text-emerald-400 font-bold text-xs shrink-0 font-mono">
                    {userState.username.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <p className="font-mono font-bold text-sm text-white truncate">
                      {userState.username}
                    </p>
                    <p className="text-[10px] font-mono text-emerald-400">
                      {userState.elo} ELO · Streak {userState.streakDays}d
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Change username toggle */}
                  <button
                    onClick={() => {
                      sound.playTap();
                      setIsEditingUsername(!isEditingUsername);
                      setUsernameInput(userState.username);
                      setUsernameError(null);
                      setUsernameSuccess(null);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 hover:border-zinc-600 font-mono text-xs font-bold text-zinc-300 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                    title="Modifica Callsign"
                  >
                    <Edit3 className="w-3 h-3 text-zinc-300" />
                    <span className="hidden sm:inline">Modifica</span>
                  </button>

                  <button
                    onClick={() => {
                      sound.playTap();
                      setIsSettingsOpen(false);
                      onOpenAuth?.();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 hover:border-emerald-500/40 font-mono text-xs font-bold text-zinc-200 hover:text-emerald-300 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {userState.isLoggedIn ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Account</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{t.logInNav}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Username Edit Form with 1-Week Cooldown Enforcement */}
              {isEditingUsername && (
                <div className="pt-2 border-t border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase">
                      {lang === 'it' ? 'Cambia Username:' : 'Change Username:'}
                    </label>
                    {isUsernameCooldownActive && (
                      <span className="text-[10px] font-mono text-amber-400 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Attendi {cooldownDaysRemaining} giorni
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      disabled={isUsernameCooldownActive}
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      placeholder={t.newCallsignPlaceholder}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 focus:border-emerald-500 text-xs font-mono text-white disabled:opacity-50"
                    />
                    <button
                      disabled={isUsernameCooldownActive}
                      onClick={handleSaveUsername}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-mono font-bold text-xs transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                      <span>{t.saveBtn}</span>
                    </button>
                  </div>

                  {usernameError && (
                    <p className="text-[10px] font-mono text-red-400">{usernameError}</p>
                  )}
                  {usernameSuccess && (
                    <p className="text-[10px] font-mono text-emerald-400">{usernameSuccess}</p>
                  )}
                  <p className="text-[9px] text-zinc-500 font-mono">
                    {t.cooldownNote}
                  </p>
                </div>
              )}
            </div>

            {/* Language Switcher */}
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-zinc-400" />
                <div>
                  <span className="text-xs font-mono font-bold text-white block">
                    {t.languageSection}
                  </span>
                  <p className="text-[10px] text-zinc-400">
                    {t.languageSub}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                <button
                  onClick={() => {
                    sound.playTap();
                    setLanguage('it');
                    saveLanguage('it');
                    onUpdateLanguage?.('it');
                  }}
                  className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                    lang === 'it' 
                      ? 'bg-emerald-500 text-zinc-950 shadow-sm' 
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  IT
                </button>
                <button
                  onClick={() => {
                    sound.playTap();
                    setLanguage('en');
                    saveLanguage('en');
                    onUpdateLanguage?.('en');
                  }}
                  className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                    lang === 'en' 
                      ? 'bg-emerald-500 text-zinc-950 shadow-sm' 
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  EN
                </button>
              </div>
            </div>

            {/* Tactical Customization: Cyber Arsenal */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold tracking-wider px-1">
                {t.hudSection}
              </span>

              {/* Cyber Arsenal Customizer */}
              <button
                onClick={() => {
                  sound.playTap();
                  setIsSettingsOpen(false);
                  onOpenArsenal?.();
                }}
                className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-left flex items-center justify-between transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-zinc-400 group-hover:text-emerald-400" />
                  <div>
                    <span className="text-xs font-mono font-bold text-white group-hover:text-emerald-300 block">
                      {t.cyberArsenalTitle}
                    </span>
                    <p className="text-[10px] text-zinc-400">
                      {t.cyberArsenalSub}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono text-emerald-400 font-bold">
                  {t.openBtn}
                </span>
              </button>
            </div>

            {/* Audio Settings */}
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-zinc-400" />}
                <div>
                  <span className="text-xs font-mono font-bold text-white block">
                    {t.audioEffectsTitle}
                  </span>
                  <p className="text-[10px] text-zinc-400">
                    {t.audioEffectsSub}
                  </p>
                </div>
              </div>

              <button
                onClick={handleToggleSound}
                className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                  isMuted
                    ? 'bg-zinc-800 border border-red-500/40 text-red-300'
                    : 'bg-zinc-800 border border-zinc-700 text-zinc-200'
                }`}
              >
                {isMuted ? t.soundMuted : t.soundActive}
              </button>
            </div>

            {/* PRO Membership Section */}
            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  {t.proLicenseTitle}
                </span>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                  userState.isPro ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {userState.isPro ? 'PRO UNLOCKED' : 'FREE TIER'}
                </span>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                {t.proLicenseDesc}
              </p>

              {!userState.isPro && (
                <button
                  onClick={() => {
                    sound.playTap();
                    setIsSettingsOpen(false);
                    onOpenPaywall();
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-mono font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5 fill-zinc-950" />
                  <span>Passa a ZeroDay PRO</span>
                </button>
              )}
            </div>

            {/* Dedicated App Version Info Card */}
            <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-emerald-500/30 space-y-2 font-mono">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                  {lang === 'en' ? 'APP VERSION' : 'VERSIONE APPLICAZIONE'}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  v{getCachedVersionInfo().versionName} (build {getCachedVersionInfo().versionCode})
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-zinc-800/80">
                <span>{lang === 'en' ? 'Distribution Channel:' : 'Canale di Distribuzione:'}</span>
                <span className="text-zinc-300 font-bold uppercase">{getCachedVersionInfo().flavor}</span>
              </div>
            </div>

            {/* Developer God Mode (Only visible in Localhost / Godmode) */}
            {isGodMode && (
              <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-2">
                <div className="flex items-center gap-1.5 text-zinc-400 font-mono text-[11px] font-bold">
                  <Terminal className="w-3.5 h-3.5 text-zinc-400" />
                  <span>DEV TOOLS // MODALITÀ GOD</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      sound.playTap();
                      onTogglePro();
                    }}
                    className={`flex-1 py-1.5 px-2 rounded-lg border font-mono text-xs font-bold transition-all cursor-pointer ${
                      userState.isPro 
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' 
                        : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                    }`}
                  >
                    {userState.isPro ? 'Disattiva PRO' : 'Attiva PRO Test'}
                  </button>
                  <button
                    onClick={() => {
                      sound.playTap();
                      if (window.confirm('Vuoi azzerare tutti i dati locali e riavviare l\'app?')) {
                        setIsSettingsOpen(false);
                        onResetData();
                      }
                    }}
                    className="py-1.5 px-3 rounded-lg border border-red-500/30 bg-red-950/20 text-red-300 hover:bg-red-950/40 font-mono text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                    title="Azzera dati demo"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
