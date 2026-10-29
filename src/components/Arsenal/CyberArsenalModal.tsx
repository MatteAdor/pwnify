import React, { useState } from 'react';
import { UserState } from '../../types';
import { sound } from '../../utils/soundEngine';
import { 
  X, Palette, Sparkles, Check, Lock, Terminal, 
  Volume2, Shield, Flame, Award, Zap 
} from 'lucide-react';
import confetti from 'canvas-confetti';

export type TerminalThemeId = 
  | 'cyber_emerald' 
  | 'matrix_phosphor' 
  | 'cyberpunk_neon' 
  | 'amber_crt' 
  | 'stealth_oled';

export interface ArsenalTheme {
  id: TerminalThemeId;
  name: string;
  previewColor: string;
  accentColor: string;
  bgStyle: string;
  isProOnly: boolean;
  minElo: number;
  description: string;
}

export const ARSENAL_THEMES: ArsenalTheme[] = [
  {
    id: 'cyber_emerald',
    name: 'Cyber Emerald (Default)',
    previewColor: '#10B981',
    accentColor: 'text-emerald-400',
    bgStyle: 'from-emerald-950/40 to-slate-900',
    isProOnly: false,
    minElo: 0,
    description: 'The classic Pwnify tactical theme: high dark contrast and emerald phosphor glow.'
  },
  {
    id: 'matrix_phosphor',
    name: 'Matrix Monochrome 1999',
    previewColor: '#22C55E',
    accentColor: 'text-green-400',
    bgStyle: 'from-green-950/50 to-black',
    isProOnly: false,
    minElo: 1100,
    description: 'Inspired by green mainframe consoles with CRT phosphor glow.'
  },
  {
    id: 'cyberpunk_neon',
    name: 'Cyberpunk Night City',
    previewColor: '#06B6D4',
    accentColor: 'text-cyan-400',
    bgStyle: 'from-purple-950/40 via-cyan-950/30 to-slate-950',
    isProOnly: false,
    minElo: 1300,
    description: 'Cyan blue neon and magenta accents for high-contrast Red Teaming.'
  },
  {
    id: 'amber_crt',
    name: 'Amber CRT Vintage 1984',
    previewColor: '#F59E0B',
    accentColor: 'text-amber-400',
    bgStyle: 'from-amber-950/40 to-black',
    isProOnly: true,
    minElo: 0,
    description: 'Warm amber glow of DEC VT220 mainframe terminals. Zero eye fatigue.'
  },
  {
    id: 'stealth_oled',
    name: 'Stealth Blackout OLED',
    previewColor: '#E2E8F0',
    accentColor: 'text-slate-100',
    bgStyle: 'from-black to-slate-950',
    isProOnly: true,
    minElo: 1600,
    description: 'True #000000 black for OLED displays and stealth low-light operations.'
  }
];

export const CALLSIGN_TITLES = [
  { id: 't_skid', title: 'Script Kiddie', minElo: 0, proOnly: false },
  { id: 't_packet_sniffer', title: 'Packet Sniffer', minElo: 1200, proOnly: false },
  { id: 't_red_teamer', title: 'Red Teamer', minElo: 1400, proOnly: false },
  { id: 't_apt_operator', title: 'APT Operator', minElo: 1600, proOnly: true },
  { id: 't_zeroday_hunter', title: 'ZeroDay Hunter', minElo: 1900, proOnly: true },
  { id: 't_packet', title: 'Packet Whisperer', minElo: 1200, proOnly: false },
  { id: 't_kernel', title: 'Kernel Spectre', minElo: 1400, proOnly: false },
  { id: 't_c2', title: 'C2 Architect', minElo: 1600, proOnly: true },
  { id: 't_zeroday', title: '0xDAY Sovereign', minElo: 1900, proOnly: true }
];

interface CyberArsenalModalProps {
  isOpen: boolean;
  onClose: () => void;
  userState: UserState;
  currentTheme: TerminalThemeId;
  onSelectTheme: (themeId: TerminalThemeId) => void;
  currentTitle: string;
  onSelectTitle: (title: string) => void;
  onOpenPaywallContext: (context: 'manual_upgrade') => void;
}

export const CyberArsenalModal: React.FC<CyberArsenalModalProps> = ({
  isOpen,
  onClose,
  userState,
  currentTheme,
  onSelectTheme,
  currentTitle,
  onSelectTitle,
  onOpenPaywallContext
}) => {
  const [activeTab, setActiveTab] = useState<'themes' | 'titles'>('themes');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-xl my-auto bg-[#101726] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl text-slate-100 overflow-hidden shadow-neon-indigo">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-indigo-400 font-bold block uppercase">
                CUSTOMIZER HUD & ARSENAL
              </span>
              <h3 className="font-extrabold text-base text-white">
                Customize Your Tactical Terminal
              </h3>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playTap();
              onClose();
            }}
            className="p-1 rounded text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 p-1 bg-[#090D16] rounded-xl border border-white/5 mb-5 font-mono text-xs">
          <button
            onClick={() => {
              sound.playTap();
              setActiveTab('themes');
            }}
            className={`flex-1 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'themes' 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Terminal HUD Themes</span>
          </button>
          <button
            onClick={() => {
              sound.playTap();
              setActiveTab('titles');
            }}
            className={`flex-1 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'titles' 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Titles & Callsign Badges</span>
          </button>
        </div>

        {/* TAB 1: THEMES */}
        {activeTab === 'themes' && (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {ARSENAL_THEMES.map((theme) => {
              const isSelected = currentTheme === theme.id;
              const isLocked = theme.isProOnly ? !userState.isPro : userState.elo < theme.minElo;

              return (
                <div
                  key={theme.id}
                  onClick={() => {
                    if (isLocked) {
                      sound.playTap();
                      if (!userState.isPro && theme.isProOnly) {
                        onOpenPaywallContext('manual_upgrade');
                      } else {
                        sound.playPayloadBlocked();
                      }
                      return;
                    }
                    sound.playTap();
                    onSelectTheme(theme.id);
                    confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500 shadow-neon-indigo'
                      : 'bg-surface/70 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center border shadow-inner"
                      style={{ 
                        backgroundColor: `${theme.previewColor}20`, 
                        borderColor: theme.previewColor,
                        color: theme.previewColor 
                      }}
                    >
                      <Terminal className="w-4 h-4" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-mono font-bold text-sm text-white">
                          {theme.name}
                        </h4>
                        {theme.isProOnly && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                            PRO EXCLUSIVE
                          </span>
                        )}
                        {!theme.isProOnly && theme.minElo > 0 && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                            {theme.minElo} ELO
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{theme.description}</p>
                    </div>
                  </div>

                  <div className="shrink-0 ml-2">
                    {isLocked ? (
                      <div className="flex items-center gap-1 text-slate-500 font-mono text-xs">
                        <Lock className="w-4 h-4 text-amber-400" />
                        <span className="text-[10px] text-amber-400 hidden sm:inline">LOCKED</span>
                      </div>
                    ) : isSelected ? (
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500 text-emerald-400 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <span className="text-xs font-mono text-slate-400 hover:text-white">
                        Equip
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: CALLSIGN TITLES */}
        {activeTab === 'titles' && (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {CALLSIGN_TITLES.map((t) => {
              const isSelected = currentTitle === t.title;
              const isLocked = t.proOnly ? !userState.isPro : userState.elo < t.minElo;

              return (
                <div
                  key={t.id}
                  onClick={() => {
                    if (isLocked) {
                      sound.playTap();
                      if (!userState.isPro && t.proOnly) {
                        onOpenPaywallContext('manual_upgrade');
                      } else {
                        sound.playPayloadBlocked();
                      }
                      return;
                    }
                    sound.playTap();
                    onSelectTitle(t.title);
                    confetti({ particleCount: 25, spread: 50, origin: { y: 0.7 } });
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500 shadow-neon-indigo'
                      : 'bg-surface/70 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-mono font-bold text-sm text-white">
                          [{t.title}]
                        </h4>
                        {t.proOnly && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                            PRO
                          </span>
                        )}
                        {!t.proOnly && t.minElo > 0 && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                            {t.minElo} ELO
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        Displayed on Hacker ID Card and in Arena PvP
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 ml-2">
                    {isLocked ? (
                      <Lock className="w-4 h-4 text-amber-400" />
                    ) : isSelected ? (
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500 text-emerald-400 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <span className="text-xs font-mono text-slate-400 hover:text-white">
                        Select
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
