import React, { useState } from 'react';
import { UserState } from '../types';
import { getRankFromElo, getNextRankProgress } from '../data/ranks';
import { sound } from '../utils/soundEngine';
import { useLanguage, saveLanguage } from '../utils/language';
import { getCachedVersionInfo } from '../utils/platform';
import { updateManager } from '../utils/updateManager';
import { 
  Flame, Ticket, Sparkles, Terminal, Smartphone, 
  Volume2, VolumeX, RotateCcw, Palette,
  LogIn, UserCheck, Settings, X, Shield,
  Globe, Edit3, Check, Zap, AlertCircle,
  Radio, Crosshair, ShieldAlert, Award, RefreshCw
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
  currentTitle?: string;
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
  onOpenPortal,
  currentTitle
}) => {
  const { lang, setLanguage, t } = useLanguage();
  const rank = getRankFromElo(userState.elo);
  const rankProgress = getNextRankProgress(userState.elo);
  const activeTitle = currentTitle || userState.customTitle || rank.tier;
  const [isMuted, setIsMuted] = useState<boolean>(sound.getMuted());
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState<boolean>(false);
  const [updateCheckFeedback, setUpdateCheckFeedback] = useState<string | null>(null);

  const renderRankIcon = (iconName: string, className = "w-3.5 h-3.5") => {
    switch (iconName) {
      case 'Terminal': return <Terminal className={className} />;
      case 'Radio': return <Radio className={className} />;
      case 'Crosshair': return <Crosshair className={className} />;
      case 'ShieldAlert': return <ShieldAlert className={className} />;
      case 'Zap': return <Zap className={className} />;
      default: return <Shield className={className} />;
    }
  };

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

  const handleCheckUpdates = async () => {
    sound.playTap();
    setIsCheckingUpdate(true);
    setUpdateCheckFeedback(null);
    try {
      await updateManager.checkForUpdates({ ignoreDebounce: true, forceImmediateCheck: true });
      const current = updateManager.getState();
      if (current.status === 'UP_TO_DATE' || current.clientVersionCode >= current.latestVersionCode) {
        setUpdateCheckFeedback(lang === 'en' ? 'App is up to date.' : 'App già aggiornata all\'ultima versione.');
      } else if (
        current.status === 'FORCE_REQUIRED' ||
        current.status === 'DOWNLOADING' ||
        current.status === 'DOWNLOADED' ||
        current.clientVersionCode < current.latestVersionCode
      ) {
        setIsSettingsOpen(false);
      }
    } catch {
      setUpdateCheckFeedback(lang === 'en' ? 'Check failed.' : 'Verifica non riuscita.');
    } finally {
      setIsCheckingUpdate(false);
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
            className="flex items-center gap-2.5 cursor-pointer select-none shrink-0"
            title={lang === 'it' ? 'Torna al Portale & Download APK' : 'Back to Portal & Download APK'}
          >
            <img 
              src="/zerox-rounded.png" 
              alt="ZeroDay" 
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-contain shadow-sm" 
            />
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-black text-base sm:text-lg tracking-tight text-white">
                Zero<span className="text-emerald-400">Day</span>
              </span>
              {/* PRO badge if user has PRO */}
              {userState.isPro && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-emerald-400 border border-emerald-500/30 font-black">
                  PRO
                </span>
              )}
            </div>
          </div>

          {/* Minimalist Top Telemetry & Controls: Visible & High Contrast */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Operator ELO Rank Badge */}
            <div 
              onClick={() => {
                sound.playTap();
                setUsernameInput(userState.username);
                setUsernameError(null);
                setUsernameSuccess(null);
                setIsSettingsOpen(true);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 min-h-[40px] rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer select-none"
              title={`${rank.tier} · ${userState.elo} ELO`}
            >
              <div style={{ color: rank.badgeColor }}>
                {renderRankIcon(rank.iconName, "w-4 h-4")}
              </div>
              <span className="font-mono font-black text-xs sm:text-sm" style={{ color: rank.badgeColor }}>
                {userState.elo} <span className="text-[10px] text-zinc-400 font-bold hidden sm:inline">ELO</span>
              </span>
            </div>

            {/* 2x XP Telemetry Indicator / Paywall Trigger */}
            <div 
              onClick={() => {
                sound.playTap();
                if (!userState.isPro) onOpenPaywall();
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 min-h-[40px] rounded-xl border transition-all cursor-pointer font-mono font-black text-xs ${
                userState.isPro
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm'
                  : 'bg-zinc-900 border-zinc-800 hover:border-amber-500/50 text-zinc-400 hover:text-amber-300'
              }`}
              title={userState.isPro ? '2x XP Boost Attivo (PRO)' : 'Clicca per sbloccare 2x XP Boost permanente'}
            >
              <Zap className={`w-3.5 h-3.5 ${userState.isPro ? 'text-amber-400 fill-amber-400' : 'text-amber-400/70'}`} />
              <span className="font-bold">2x XP</span>
            </div>

            {/* Daily Streak Counter */}
            <div 
              onClick={() => sound.playTap()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 min-h-[40px] rounded-xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/40 transition-colors cursor-pointer"
              title={t.dailyStreak}
            >
              <Flame className="w-4 h-4 text-amber-400" />
              <span className="font-mono font-black text-xs sm:text-sm text-amber-300">
                {userState.streakDays}d
              </span>
            </div>

            {/* Arena Tickets Counter */}
            <div 
              className="flex items-center gap-1.5 px-2.5 py-1.5 min-h-[40px] rounded-xl bg-zinc-900 border border-zinc-800 hover:border-indigo-500/40 transition-colors"
              title={t.arenaTickets}
            >
              <Ticket className="w-4 h-4 text-indigo-400" />
              <span className="font-mono font-black text-xs sm:text-sm text-indigo-300">
                {userState.isPro ? (
                  <span className="text-emerald-400 font-black">PRO</span>
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
                className="hidden xs:flex items-center gap-1.5 px-3.5 py-1.5 min-h-[40px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-mono font-black text-xs sm:text-sm transition-all transform active:scale-95 cursor-pointer shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 fill-zinc-950" />
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
              className="flex items-center justify-center p-2 sm:p-2.5 min-h-[40px] min-w-[40px] rounded-xl bg-zinc-900 border border-zinc-700/80 hover:border-emerald-500/50 text-zinc-300 hover:text-white transition-all active:scale-95 cursor-pointer shadow-sm"
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
                {/* Active Callsign Title */}
                <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-[10px] font-mono font-bold">
                  <Award className="w-3 h-3 text-indigo-400" />
                  <span>{activeTitle}</span>
                </div>
              </div>

              {/* Profession & Rank Tier Badges */}
              <div className="flex flex-wrap items-center gap-1.5">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 text-[11px] font-mono font-bold">
                  <Shield className="w-3 h-3 text-emerald-400" />
                  <span className="uppercase tracking-wide">{chosenProfession}</span>
                </div>
                <div 
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-mono font-bold"
                  style={{ 
                    backgroundColor: `${rank.badgeColor}15`, 
                    borderColor: `${rank.badgeColor}40`, 
                    color: rank.badgeColor 
                  }}
                >
                  {renderRankIcon(rank.iconName, "w-3 h-3")}
                  <span>{rank.tier}</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 truncate">
                  <div 
                    className="w-10 h-10 rounded-lg border flex items-center justify-center font-bold text-xs shrink-0 font-mono shadow-sm"
                    style={{ 
                      backgroundColor: `${rank.badgeColor}15`, 
                      borderColor: `${rank.badgeColor}40`, 
                      color: rank.badgeColor 
                    }}
                  >
                    {userState.username.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <p className="font-mono font-bold text-sm text-white truncate">
                      {userState.username}
                    </p>
                    <p className="text-[10px] font-mono text-zinc-400 flex items-center gap-1.5">
                      <span className="font-bold" style={{ color: rank.badgeColor }}>{userState.elo} ELO</span>
                      <span>·</span>
                      <span>Streak {userState.streakDays}d</span>
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
                    className="px-3 py-2 min-h-[42px] rounded-xl bg-zinc-800 border border-zinc-700 hover:border-zinc-600 font-mono text-xs font-black text-zinc-200 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    title="Modifica Callsign"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-zinc-300" />
                    <span className="hidden sm:inline">{t.changeCallsign}</span>
                  </button>

                  <button
                    onClick={() => {
                      sound.playTap();
                      setIsSettingsOpen(false);
                      onOpenAuth?.();
                    }}
                    className="px-3.5 py-2 min-h-[42px] rounded-xl bg-zinc-800 border border-zinc-700 hover:border-emerald-500/40 font-mono text-xs font-black text-zinc-100 hover:text-emerald-300 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
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

              {/* ELO Rank Progression Bar */}
              <div className="pt-2 border-t border-zinc-800 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-zinc-400 text-[11px] font-black uppercase">
                    {t.rankTierLabel}: <span style={{ color: rank.badgeColor }}>{rank.tier}</span>
                  </span>
                  {rankProgress.nextTier ? (
                    <span className="text-zinc-400 text-[11px] font-bold">
                      <strong className="text-white font-black">{rankProgress.pointsToNext}</strong> {t.pointsToPromote} ({rankProgress.nextTier})
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-black text-[11px]">
                      {t.apexRankAchieved}
                    </span>
                  )}
                </div>
                <div className="w-full h-2 bg-zinc-950 border border-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${rankProgress.progressPercent}%`, 
                      backgroundColor: rank.badgeColor 
                    }}
                  />
                </div>
              </div>

              {/* Username Edit Form */}
              {isEditingUsername && (
                <div className="pt-2 border-t border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-mono font-black text-zinc-300 uppercase">
                      {lang === 'it' ? 'Nuovo Username' : 'New Username'}
                    </label>
                    {isUsernameCooldownActive && (
                      <span className="text-[11px] font-mono text-amber-400 font-black flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Attendi {cooldownDaysRemaining}d
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
                      className="flex-1 px-3 py-2 min-h-[44px] rounded-xl bg-zinc-950 border border-zinc-700 focus:border-emerald-500 text-xs font-mono font-bold text-white disabled:opacity-50"
                    />
                    <button
                      disabled={isUsernameCooldownActive}
                      onClick={handleSaveUsername}
                      className="px-4 py-2 min-h-[44px] rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-mono font-black text-xs transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5" />
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
            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Globe className="w-4 h-4 text-zinc-400" />
                <span className="text-xs font-mono font-black text-white">
                  {t.languageSection}
                </span>
              </div>

              <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                <button
                  onClick={() => {
                    sound.playTap();
                    setLanguage('it');
                    saveLanguage('it');
                    onUpdateLanguage?.('it');
                  }}
                  className={`px-3.5 py-1.5 min-h-[38px] rounded-lg text-xs font-mono font-black transition-all cursor-pointer active:scale-95 ${
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
                  className={`px-3.5 py-1.5 min-h-[38px] rounded-lg text-xs font-mono font-black transition-all cursor-pointer active:scale-95 ${
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
            <div>
              <button
                onClick={() => {
                  sound.playTap();
                  setIsSettingsOpen(false);
                  onOpenArsenal?.();
                }}
                className="w-full p-3.5 min-h-[50px] rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-left flex items-center justify-between transition-all group cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center gap-2.5">
                  <Palette className="w-4 h-4 text-zinc-400 group-hover:text-emerald-400" />
                  <span className="text-xs font-mono font-black text-white group-hover:text-emerald-300">
                    {t.cyberArsenalTitle}
                  </span>
                </div>
                <span className="text-xs font-mono text-emerald-400 font-black">
                  {t.openBtn} →
                </span>
              </button>
            </div>

            {/* Audio Settings */}
            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-zinc-400" />}
                <span className="text-xs font-mono font-black text-white">
                  {t.audioEffectsTitle}
                </span>
              </div>

              <button
                onClick={handleToggleSound}
                className={`px-4 py-2 min-h-[40px] rounded-xl font-mono text-xs font-black transition-all cursor-pointer active:scale-95 ${
                  isMuted
                    ? 'bg-zinc-800 border border-red-500/40 text-red-300'
                    : 'bg-zinc-800 border border-zinc-700 text-zinc-200'
                }`}
              >
                {isMuted ? t.soundMuted : t.soundActive}
              </button>
            </div>

            {/* PRO Membership Section */}
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-black text-white flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  {t.proLicenseTitle}
                </span>
                <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded ${
                  userState.isPro ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {userState.isPro ? 'PRO UNLOCKED' : 'FREE TIER'}
                </span>
              </div>

              {!userState.isPro && (
                <button
                  onClick={() => {
                    sound.playTap();
                    setIsSettingsOpen(false);
                    onOpenPaywall();
                  }}
                  className="w-full min-h-[50px] py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-mono font-black text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95"
                >
                  <Sparkles className="w-4 h-4 fill-zinc-950" />
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

              {/* In-App Check Updates Trigger */}
              <button
                onClick={handleCheckUpdates}
                disabled={isCheckingUpdate}
                className="w-full mt-2 py-2.5 px-3 min-h-[42px] rounded-xl bg-zinc-800 hover:bg-zinc-700/80 border border-zinc-700/80 hover:border-emerald-500/40 text-xs text-emerald-400 hover:text-emerald-300 font-bold font-mono transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                <span>
                  {isCheckingUpdate 
                    ? (lang === 'en' ? 'Checking for updates...' : 'Verifica aggiornamenti...') 
                    : (lang === 'en' ? 'Check for Updates' : 'Verifica Aggiornamenti')}
                </span>
              </button>

              {updateCheckFeedback && (
                <p className="text-[11px] text-center text-zinc-300 pt-1 font-mono">
                  {updateCheckFeedback}
                </p>
              )}
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
