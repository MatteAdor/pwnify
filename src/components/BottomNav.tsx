import React from 'react';
import { Layers, Target, Swords, ShieldCheck, UserCircle2 } from 'lucide-react';
import { sound } from '../utils/soundEngine';
import { useLanguage } from '../utils/language';
import { isBrowserEnvironment, SHOW_APK_DOWNLOAD } from '../utils/platform';

export type ActiveTab = 'tree' | 'quests' | 'arena' | 'certs' | 'profile' | 'missions' | 'radar';

interface BottomNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  winStreak: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  winStreak
}) => {
  const { t } = useLanguage();

  // Normalized active tab for aliases
  const normalizedActiveTab: ActiveTab = 
    activeTab === 'missions' ? 'quests' :
    activeTab === 'radar' ? 'profile' :
    activeTab;

  const tabs: {
    id: ActiveTab;
    label: string;
    icon: React.ElementType;
    badge: string | null;
    isCenter?: boolean;
  }[] = [
    {
      id: 'tree',
      label: t.navSkillTree || 'Skill Tree',
      icon: Layers,
      badge: null,
    },
    {
      id: 'quests',
      label: t.navQuests || 'Quests',
      icon: Target,
      badge: '3',
    },
    {
      id: 'arena',
      label: t.navArena || '1vs1',
      icon: Swords,
      badge: isBrowserEnvironment() ? (SHOW_APK_DOWNLOAD ? 'APK' : null) : (winStreak > 0 ? `x${winStreak}` : null),
      isCenter: true,
    },
    {
      id: 'certs',
      label: t.navCerts || 'Exam Labs',
      icon: ShieldCheck,
      badge: 'PBQ',
    },
    {
      id: 'profile',
      label: t.navProfile || 'Profile',
      icon: UserCircle2,
      badge: null,
    }
  ];

  return (
    <nav 
      aria-label="Navigation"
      className="fixed bottom-0 inset-x-0 z-40 bg-[#090D16] border-t border-zinc-800/90 shadow-[0_-4px_24px_rgba(0,0,0,0.6)] select-none pointer-events-auto"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="w-full max-w-lg mx-auto grid grid-cols-5 px-1 py-1 min-h-[62px] items-end">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = normalizedActiveTab === tab.id;

          // Elevated Center Button for 1vs1 Arena
          if (tab.isCenter) {
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  sound.playTap();
                  onSelectTab(tab.id);
                }}
                className="relative -top-3 flex flex-col items-center justify-center transition-all cursor-pointer select-none group focus-visible:outline-none"
              >
                {tab.badge && (
                  <span className="absolute -top-1 px-1.5 py-0.2 rounded text-[10px] font-mono font-black bg-zinc-900 text-emerald-400 border border-emerald-500/40 shadow-sm z-10">
                    {tab.badge}
                  </span>
                )}
                <div 
                  className={`w-13 h-13 rounded-2xl flex items-center justify-center transition-all duration-200 border shadow-lg ${
                    isActive
                      ? 'bg-gradient-to-tr from-emerald-500 to-emerald-400 text-slate-950 border-emerald-300 shadow-emerald-500/40 scale-105 ring-2 ring-emerald-400/30'
                      : 'bg-[#101726] hover:bg-[#162032] text-emerald-400 border-emerald-500/30 hover:border-emerald-400/60 shadow-black/60 group-active:scale-95'
                  }`}
                >
                  <Icon className={`w-6 h-6 transition-transform duration-200 ${isActive ? 'rotate-[-8deg] scale-110' : 'group-hover:scale-105'}`} />
                </div>
                <span className={`font-mono text-[11px] mt-1 leading-none tracking-tight transition-colors ${
                  isActive ? 'font-black text-emerald-400' : 'font-bold text-zinc-400 group-hover:text-zinc-200'
                }`}>
                  {tab.label}
                </span>
              </button>
            );
          }

          // Standard Navigation Tabs
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                sound.playTap();
                onSelectTab(tab.id);
              }}
              className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer select-none active:scale-95 focus-visible:outline-none ${
                isActive
                  ? 'text-emerald-400 bg-emerald-500/10'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02]'
              }`}
            >
              {tab.badge && (
                <span className="absolute top-1 right-2 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-200 border border-zinc-700">
                  {tab.badge}
                </span>
              )}
              <Icon className={`w-5 h-5 transition-transform duration-150 ${isActive ? 'scale-110' : ''}`} />
              <span className={`font-mono text-[11px] mt-1 leading-none tracking-tight transition-colors ${
                isActive ? 'font-black text-white' : 'font-bold text-zinc-400'
              }`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
