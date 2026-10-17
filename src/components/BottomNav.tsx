import React from 'react';
import { Target, Swords, Trophy, Radar, ShieldCheck } from 'lucide-react';
import { sound } from '../utils/soundEngine';

export type ActiveTab = 'tree' | 'arena' | 'leagues' | 'radar' | 'certs';

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
  const tabs = [
    {
      id: 'tree' as ActiveTab,
      label: 'Skill Tree',
      sublabel: 'Campaign',
      icon: Target,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'arena' as ActiveTab,
      label: 'Arena 1v1',
      sublabel: 'Blitz PvP',
      icon: Swords,
      badge: winStreak > 0 ? `🔥x${winStreak}` : 'LIVE',
      badgeColor: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40',
    },
    {
      id: 'leagues' as ActiveTab,
      label: 'Leghe',
      sublabel: 'Top 3',
      icon: Trophy,
      badge: 'PROMO',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    },
    {
      id: 'radar' as ActiveTab,
      label: 'Readiness',
      sublabel: 'Analytics',
      icon: Radar,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'certs' as ActiveTab,
      label: 'Cert Prep',
      sublabel: 'Sec+/CCNA',
      icon: ShieldCheck,
      badge: null,
      badgeColor: '',
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#090D16]/95 backdrop-blur-lg border-t border-white/[0.08] px-1.5 py-1.5 md:py-2">
      <div className="max-w-lg mx-auto grid grid-cols-5 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => {
                sound.playTap();
                onSelectTab(tab.id);
              }}
              className={`relative flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-surface/90 text-emerald-400 border border-emerald-500/30 shadow-neon-emerald'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-surface/40'
              }`}
            >
              {tab.badge && (
                <span className={`absolute -top-1.5 right-0.5 px-1 py-0.2 rounded text-[8px] font-mono font-bold border ${tab.badgeColor}`}>
                  {tab.badge}
                </span>
              )}
              <Icon className={`w-4 h-4 sm:w-5 sm:h-5 mb-0.5 ${isActive ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
              <span className="font-mono text-[10px] sm:text-[11px] font-semibold leading-tight truncate">
                {tab.label}
              </span>
              <span className="text-[8px] sm:text-[9px] text-slate-500 hidden sm:block truncate">
                {tab.sublabel}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
