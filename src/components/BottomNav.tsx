import React from 'react';
import { Layers, Swords, Target, Radar, ShieldCheck } from 'lucide-react';
import { sound } from '../utils/soundEngine';
import { useLanguage } from '../utils/language';

export type ActiveTab = 'tree' | 'arena' | 'missions' | 'radar' | 'certs';

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

  const tabs = [
    {
      id: 'tree' as ActiveTab,
      label: t.navSkillTree,
      icon: Layers,
      badge: null,
    },
    {
      id: 'arena' as ActiveTab,
      label: t.navArena,
      icon: Swords,
      badge: winStreak > 0 ? `x${winStreak}` : null,
    },
    {
      id: 'missions' as ActiveTab,
      label: t.navMissions,
      icon: Target,
      badge: '3',
    },
    {
      id: 'radar' as ActiveTab,
      label: t.navRadar,
      icon: Radar,
      badge: null,
    },
    {
      id: 'certs' as ActiveTab,
      label: t.navCerts,
      icon: ShieldCheck,
      badge: 'PBQ',
    }
  ];

  return (
    <nav 
      aria-label="Navigation"
      className="fixed bottom-0 inset-x-0 z-40 bg-[#090D16] border-t border-zinc-800"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="w-full max-w-lg mx-auto grid grid-cols-5 px-1 py-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                sound.playTap();
                onSelectTab(tab.id);
              }}
              className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400 ${
                isActive
                  ? 'text-emerald-400'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {/* Contextual Badge */}
              {tab.badge && (
                <span className="absolute top-1 right-2 px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {tab.badge}
                </span>
              )}

              {/* Icon */}
              <Icon className="w-4 h-4 sm:w-5 sm:h-5" />

              {/* Label */}
              <span className={`font-mono text-[10px] sm:text-[11px] mt-1 leading-none tracking-tight ${
                isActive ? 'font-bold text-white' : 'font-medium'
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
