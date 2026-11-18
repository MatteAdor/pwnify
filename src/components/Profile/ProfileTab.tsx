import React from 'react';
import { UserState, PaywallContext } from '../../types';
import { getRankFromElo } from '../../data/ranks';
import { ReadinessRadar } from '../Analytics/ReadinessRadar';
import { sound } from '../../utils/soundEngine';
import { useLanguage } from '../../utils/language';
import { 
  Settings, Flame, Zap, Trophy, Share2, Shield, ShieldCheck, 
  Sparkles, Award, ChevronRight, CheckCircle2, Lock
} from 'lucide-react';

interface ProfileTabProps {
  userState: UserState;
  onOpenPaywall: (context: PaywallContext) => void;
  onOpenHackerCard: () => void;
  onOpenSettings: () => void;
  onNavigateToCerts?: () => void;
  currentTheme?: string;
  currentTitle?: string;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  userState,
  onOpenPaywall,
  onOpenHackerCard,
  onOpenSettings,
  onNavigateToCerts,
  currentTheme,
  currentTitle
}) => {
  const { lang, t } = useLanguage();
  const isEn = lang === 'en';

  const rank = getRankFromElo(userState.elo);
  const activeTitle = currentTitle || userState.customTitle || rank.tier;

  // Authentic certification tracks progress
  const certTracks = [
    {
      id: 'comptia_sec',
      title: 'CompTIA Security+ SY0-701',
      domain: 'Core Enterprise Security',
      totalLabs: 6,
      completedLabs: (userState.completedPbqIds || []).filter(id => id.startsWith('pbq_sec_')).length,
      isHot: true
    },
    {
      id: 'cisco_ccna',
      title: 'Cisco CCNA 200-301',
      domain: 'Network Engineering & Routing',
      totalLabs: 4,
      completedLabs: (userState.completedPbqIds || []).filter(id => id.startsWith('pbq_ccna_')).length,
      isHot: false
    },
    {
      id: 'ceh_v12',
      title: 'Certified Ethical Hacker (CEH)',
      domain: 'Offensive Penetration Testing',
      totalLabs: 4,
      completedLabs: (userState.completedPbqIds || []).filter(id => id.startsWith('pbq_ceh_')).length,
      isHot: false
    },
    {
      id: 'owasp_web',
      title: 'OWASP Web Defense Specialist',
      domain: 'AppSec & Injection Mitigation',
      totalLabs: 5,
      completedLabs: (userState.completedNodeIds || []).filter(id => id.includes('web') || id.includes('sqli') || id.includes('ssrf')).length,
      isHot: false
    }
  ];

  // Milestone Streak Titles & Achievements (Mimo Style)
  const milestones = [
    { days: 7, title: 'Ghost Operator', earned: userState.streakDays >= 7 },
    { days: 30, title: 'Persistent Threat', earned: userState.streakDays >= 30 },
    { days: 60, title: 'Zero-Day Architect', earned: userState.streakDays >= 60 },
    { days: 100, title: 'Cyber Centurion', earned: userState.streakDays >= 100 },
  ];

  const earnedTrophiesCount = milestones.filter(m => m.earned).length;

  return (
    <div className="w-full max-w-xl mx-auto px-3.5 sm:px-4 py-4 pb-28 space-y-6 animate-fade-in font-sans">
      
      {/* 1. Top Header Bar: Title + Settings Action */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight font-mono">
          {t.navProfile || (isEn ? 'Profile' : 'Profilo')}
        </h1>

        <button
          type="button"
          onClick={() => {
            sound.playTap();
            onOpenSettings();
          }}
          className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-all active:scale-95 cursor-pointer shadow-sm"
          title={isEn ? 'Settings' : 'Impostazioni'}
          aria-label="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Operator Identity Card (Avatar, Callsign, Bio, Pro Badge) */}
      <div className="rounded-2xl bg-[#0D121D] border border-zinc-800 p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
          
          {/* Circular Cyber Avatar */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-500/20 via-zinc-900 to-zinc-950 border-2 border-emerald-500/60 flex items-center justify-center overflow-hidden shadow-lg shadow-emerald-950/40">
              <span className="font-mono font-black text-2xl text-emerald-400 uppercase tracking-widest">
                {userState.username.slice(0, 2)}
              </span>
            </div>
            {userState.isPro && (
              <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-amber-500 text-slate-950 shadow-md">
                <Sparkles className="w-3.5 h-3.5 fill-current" />
              </div>
            )}
          </div>

          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-lg sm:text-xl font-black text-white font-mono truncate">
                {userState.username}
              </h2>
              {userState.isPro ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1 shadow-sm">
                  <Sparkles className="w-2.5 h-2.5 fill-current" /> PRO
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
                  FREE
                </span>
              )}
            </div>

            <p className="text-xs font-mono text-emerald-400 font-semibold truncate">
              {activeTitle}
            </p>

            {userState.bio ? (
              <p className="text-xs text-zinc-400 font-sans line-clamp-2 leading-relaxed">
                "{userState.bio}"
              </p>
            ) : (
              <p className="text-xs text-zinc-500 font-sans italic">
                {isEn ? 'Cyber operator training on CompTIA Sec+, CCNA & CEH.' : 'Operatore cyber in addestramento su CompTIA Sec+, CCNA & CEH.'}
              </p>
            )}
          </div>
        </div>

        {/* Free user upgrade prompt */}
        {!userState.isPro && (
          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-3">
            <div className="text-[11px] font-mono text-zinc-400">
              {isEn ? 'Unlock full certifications & unlimited duel access' : 'Sblocca tutte le certificazioni e l\'accesso illimitato'}
            </div>
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                onOpenPaywall('pro_badge');
              }}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-mono font-bold text-xs transition-transform active:scale-95 shadow-md shrink-0 cursor-pointer"
            >
              PROVA PRO
            </button>
          </div>
        )}
      </div>

      {/* 3. Three-Card Stats Grid (Mimo Inspired: Streak, XP, League) */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        
        {/* Streak Card */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-[#0D121D] border border-zinc-800 flex flex-col items-center justify-center text-center space-y-1 shadow-sm">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 mb-0.5">
            <Flame className="w-5 h-5 fill-amber-400/20" />
          </div>
          <span className="text-lg sm:text-xl font-black font-mono text-white leading-tight">
            {userState.streakDays}
          </span>
          <span className="text-[10px] sm:text-[11px] font-mono text-zinc-400 font-medium">
            {isEn ? 'Day Streak' : 'Giorni Streak'}
          </span>
        </div>

        {/* Total XP Card */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-[#0D121D] border border-zinc-800 flex flex-col items-center justify-center text-center space-y-1 shadow-sm">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 mb-0.5">
            <Zap className="w-5 h-5 fill-emerald-400/20" />
          </div>
          <span className="text-lg sm:text-xl font-black font-mono text-white leading-tight">
            {userState.xp.toLocaleString()}
          </span>
          <span className="text-[10px] sm:text-[11px] font-mono text-zinc-400 font-medium">
            {isEn ? 'Total XP' : 'XP Totali'}
          </span>
        </div>

        {/* League / Rank Card */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-[#0D121D] border border-zinc-800 flex flex-col items-center justify-center text-center space-y-1 shadow-sm">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 mb-0.5">
            <Shield className="w-5 h-5" />
          </div>
          <span className="text-lg sm:text-xl font-black font-mono text-white leading-tight truncate max-w-full px-1">
            {userState.elo}
          </span>
          <span className="text-[10px] sm:text-[11px] font-mono text-zinc-400 font-medium truncate max-w-full px-1">
            {rank.tier}
          </span>
        </div>

      </div>

      {/* 4. Best Streak Highlight Banner (Mimo Style) */}
      <div className="p-4 rounded-2xl bg-[#0D121D] border border-zinc-800 flex items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
            <Flame className="w-5 h-5 fill-amber-400" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-white font-mono">
              {isEn ? 'Best streak record' : 'Miglior serie completata'}
            </div>
            <div className="text-[11px] text-zinc-400 font-sans">
              {isEn ? `${userState.streakDays} consecutive training days active` : `${userState.streakDays} giorni consecutivi di addestramento`}
            </div>
          </div>
        </div>
        <div className="px-3 py-1 rounded-xl bg-zinc-900 border border-zinc-800 font-mono font-black text-amber-400 text-sm shrink-0">
          {userState.streakDays}d
        </div>
      </div>

      {/* 5. Share Operator ID Card Action Button */}
      <button
        type="button"
        onClick={() => {
          sound.playTap();
          onOpenHackerCard();
        }}
        className="w-full py-3.5 px-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-emerald-500/40 text-white font-mono font-bold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2.5 shadow-md active:scale-95 cursor-pointer group"
      >
        <Share2 className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
        <span>{isEn ? 'SHARE OPERATOR HACKER ID CARD (9:16)' : 'CONDIVIDI SCHEDA HACKER ID (9:16)'}</span>
      </button>

      {/* 6. INTEGRATED READINESS RADAR & DOMAIN MASTERY */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-400" />
            {t.readinessRadarTitle || (isEn ? 'Exam Readiness Radar' : 'Readiness Radar Esami')}
          </h3>
          <span className="text-[11px] font-mono text-emerald-400 font-bold">
            CompTIA / CCNA / CEH
          </span>
        </div>

        {/* Embedded ReadinessRadar Component */}
        <div className="rounded-2xl bg-[#0D121D] border border-zinc-800 p-2 sm:p-3 overflow-hidden shadow-xl">
          <ReadinessRadar
            userState={userState}
            onOpenPaywall={(ctx) => onOpenPaywall(ctx)}
            onOpenHackerCard={onOpenHackerCard}
          />
        </div>
      </div>

      {/* 7. Certification Tracks Progress (Mimo Style List) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
            {isEn ? 'Certification Roadmaps' : 'Percorsi & Certificazioni'}
          </h3>
          <span className="text-[11px] font-mono text-zinc-400">
            {certTracks.length} {isEn ? 'tracks' : 'percorsi'}
          </span>
        </div>

        <div className="space-y-2">
          {certTracks.map((cert) => {
            const percent = cert.totalLabs > 0 
              ? Math.min(100, Math.round((cert.completedLabs / cert.totalLabs) * 100))
              : 0;

            return (
              <div
                key={cert.id}
                onClick={() => {
                  sound.playTap();
                  onNavigateToCerts?.();
                }}
                className="p-3.5 rounded-xl bg-[#0D121D] border border-zinc-800 hover:border-zinc-700 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 text-zinc-400 group-hover:text-emerald-400 transition-colors">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white truncate font-mono group-hover:text-emerald-400 transition-colors">
                      {cert.title}
                    </h4>
                    <p className="text-[10px] text-zinc-400 truncate font-mono">
                      {cert.domain}
                    </p>
                  </div>
                </div>

                {/* Badge Progress */}
                <div className="flex items-center gap-2 shrink-0 font-mono">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${
                    percent > 0 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                      : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                  }`}>
                    {percent}%
                  </span>
                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 8. Class League Milestone Trophies (Mimo Style) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
            {isEn ? 'Class League Trophies' : 'Trofei della Classifica'}
          </h3>
          <span className="text-[11px] font-mono text-zinc-400">
            {earnedTrophiesCount}/{milestones.length}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 font-mono">
          {milestones.map((m) => (
            <div
              key={m.days}
              className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${
                m.earned
                  ? 'bg-[#0D121D] border-emerald-500/30 text-white'
                  : 'bg-zinc-900/40 border-zinc-800/80 text-zinc-600 opacity-60'
              }`}
            >
              <div className={`p-2 rounded-lg ${m.earned ? 'bg-amber-500/10 text-amber-400' : 'bg-zinc-800 text-zinc-600'}`}>
                <Trophy className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h5 className="text-xs font-bold truncate">
                  {m.title}
                </h5>
                <span className="text-[10px] text-zinc-500">
                  {m.days} {isEn ? 'days' : 'giorni'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default ProfileTab;
