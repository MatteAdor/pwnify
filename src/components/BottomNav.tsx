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
      sublabel: t.navSkillTreeSub,
      icon: Layers,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'arena' as ActiveTab,
      label: t.navArena,
      sublabel: t.navArenaSub,
      icon: Swords,
      badge: winStreak > 0 ? `x${winStreak}` : 'LIVE',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    },
    {
      id: 'missions' as ActiveTab,
      label: t.navMissions,
      sublabel: t.navMissionsSub,
      icon: Target,
      badge: '3 TAGLIE',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    },
    {
      id: 'radar' as ActiveTab,
      label: t.navRadar,
      sublabel: t.navRadarSub,
      icon: Radar,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'certs' as ActiveTab,
      label: t.navCerts,
      sublabel: t.navCertsSub,
      icon: ShieldCheck,
      badge: 'PBQ',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    }
  ];

  return (
    <nav className="fixed bottom-1.5 sm:bottom-4 inset-x-2 sm:inset-x-0 z-40 flex justify-center pointer-events-none">
      <div 
        className="w-full max-w-lg bg-[#080D18]/90 backdrop-blur-2xl border border-white/10 rounded-xl sm:rounded-3xl p-1 sm:p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.1)] pointer-events-auto grid grid-cols-5 gap-0.5 sm:gap-1"
        style={{ paddingBottom: 'max(4px, env(safe-area-inset-bottom, 4px))' }}
      >
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
              className={`relative flex flex-col items-center justify-center py-1.5 px-0.5 sm:py-2 sm:px-1 rounded-lg sm:rounded-xl transition-all duration-300 cursor-pointer group ${
                isActive
                  ? 'bg-gradient-to-b from-white/10 to-transparent text-emerald-400 font-bold shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              {/* Optional Notification Badge */}
              {tab.badge && (
                <span className={`absolute -top-1.5 right-1 px-1.5 py-0.2 rounded-full text-[8px] font-mono font-bold border tracking-wider shadow-sm ${tab.badgeColor}`}>
                  {tab.badge}
                </span>
              )}

              {/* Icon with glowing active highlight */}
              <div className="relative mb-0.5">
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 group-hover:scale-110 ${
                  isActive ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'text-slate-400'
                }`} />
              </div>

              {/* Label */}
              <span className={`font-mono text-[10px] sm:text-[11px] leading-tight truncate transition-colors ${
                isActive ? 'text-white font-black' : 'text-slate-400 group-hover:text-slate-300'
              }`}>
                {tab.label}
              </span>

              {/* Active illuminated underline dot */}
              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10B981] mt-1 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
