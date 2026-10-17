import React, { useState, useEffect } from 'react';
import { ShieldCheck, Zap, Award, Flame, Users } from 'lucide-react';

export interface SocialProofEvent {
  id: string;
  icon: 'shield' | 'zap' | 'rank' | 'streak';
  operator: string;
  location: string;
  action: string;
  timeAgo: string;
}

const EVENTS: SocialProofEvent[] = [
  {
    id: '1',
    icon: 'shield',
    operator: '0x_Viper',
    location: 'Milano, IT',
    action: 'ha sbloccato il simulatore Security+ PRO',
    timeAgo: '1m fa'
  },
  {
    id: '2',
    icon: 'zap',
    operator: 'R00t_Kit',
    location: 'Roma, IT',
    action: 'ha raggiunto il rango APT Operator con 2x XP',
    timeAgo: '3m fa'
  },
  {
    id: '3',
    icon: 'rank',
    operator: 'CyberGhost',
    location: 'Zurigo, CH',
    action: 'ha completato il lab PBQ Firewall Hardening al 100%',
    timeAgo: '4m fa'
  },
  {
    id: '4',
    icon: 'streak',
    operator: 'NullByte',
    location: 'Torino, IT',
    action: 'ha attivato il Cyber Streak Shield (Streak x12 🔥)',
    timeAgo: '6m fa'
  },
  {
    id: '5',
    icon: 'shield',
    operator: 'PacketLord',
    location: 'Bologna, IT',
    action: 'ha sbloccato la prova gratuita di 7 giorni PRO',
    timeAgo: '8m fa'
  }
];

interface SocialProofBannerProps {
  variant?: 'compact' | 'full';
  className?: string;
}

export const SocialProofBanner: React.FC<SocialProofBannerProps> = ({
  variant = 'compact',
  className = ''
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [onlineCount, setOnlineCount] = useState(482);
  const [isVisible, setIsVisible] = useState(true);

  // Cycle notification every 6 seconds with fade animation
  useEffect(() => {
    const timer = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % EVENTS.length);
        setIsVisible(true);
      }, 400);
    }, 6000);

    return () => clearInterval(timer);
  }, []);

  // Subtle natural fluctuation of online users
  useEffect(() => {
    const counterInterval = setInterval(() => {
      setOnlineCount(prev => prev + (Math.random() > 0.5 ? 1 : -1));
    }, 9000);

    return () => clearInterval(counterInterval);
  }, []);

  const event = EVENTS[currentIndex];

  const getIcon = () => {
    switch (event.icon) {
      case 'shield':
        return <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      case 'zap':
        return <Zap className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400 shrink-0" />;
      case 'rank':
        return <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case 'streak':
        return <Flame className="w-3.5 h-3.5 text-rose-400 fill-rose-400 shrink-0" />;
    }
  };

  if (variant === 'compact') {
    return (
      <div className={`w-full py-1.5 px-3 rounded-lg bg-[#090D16]/80 border border-white/5 flex items-center justify-between gap-2 text-[10px] font-mono ${className}`}>
        <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold text-white">{onlineCount}</span>
          <span className="hidden sm:inline">online</span>
        </div>

        <div className={`flex items-center gap-1.5 overflow-hidden transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
          {getIcon()}
          <span className="text-white font-semibold truncate">{event.operator}</span>
          <span className="text-slate-400 truncate">{event.action}</span>
          <span className="text-slate-500 text-[9px] shrink-0 font-light">· {event.timeAgo}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full p-2.5 rounded-xl bg-surface/90 border border-white/10 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono ${className}`}>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <Users className="w-3.5 h-3.5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-bold text-white">{onlineCount} Operatori Cyber Attivi</span>
          </div>
          <span className="text-[10px] text-slate-400">Matchmaking Arena e laboratori PBQ in tempo reale</span>
        </div>
      </div>

      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#090D16] border border-white/5 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
        {getIcon()}
        <div className="text-[11px] truncate">
          <span className="font-bold text-emerald-400">{event.operator}</span>
          <span className="text-slate-400 text-[10px]"> ({event.location}): </span>
          <span className="text-slate-200">{event.action}</span>
          <span className="text-slate-500 text-[10px]"> · {event.timeAgo}</span>
        </div>
      </div>
    </div>
  );
};
