import React, { useState } from 'react';
import { UserState } from '../../types';
import { getRankFromElo } from '../../data/ranks';
import { sound } from '../../utils/soundEngine';
import { 
  X, Shield, Flame, Check, 
  Cpu, Zap, Edit3, Download 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sanitizeCallsign } from '../../utils/security';
import { downloadHackerCardImage } from '../../utils/cardCanvasRenderer';

interface HackerIDCardModalProps {
  userState: UserState;
  isOpen: boolean;
  onClose: () => void;
  customChallengeSeed?: string;
  onUpdateUsername?: (name: string) => void;
}

export const HackerIDCardModal: React.FC<HackerIDCardModalProps> = ({
  userState,
  isOpen,
  onClose,
  customChallengeSeed = 'duel_0x99a',
  onUpdateUsername
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const rank = getRankFromElo(userState.elo);

  // Find top radar skill
  const entries = Object.entries(userState.radarScores);
  entries.sort((a, b) => b[1] - a[1]);
  const [topSkillName, topSkillScore] = entries[0];

  const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://zeroday.gg';
  const challengeUrl = `${origin}/?seed=${customChallengeSeed}&elo=${userState.elo}&challenger=${encodeURIComponent(userState.username)}&score=4`;
  const challengeText = `[ZERODAY PROTOCOL] Match Blitz Concluded · ELO: ${userState.elo} · Streak: x${userState.winStreak}. Can you beat my time on this exploit? >> ${challengeUrl}`;

  const handleCopyChallenge = () => {
    sound.playExploitSuccess();
    navigator.clipboard.writeText(challengeText);
    setCopiedLink(true);
    confetti({
      particleCount: 40,
      spread: 50,
      origin: { y: 0.7 }
    });
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleDownloadCard = () => {
    sound.playVictoryFanfare();
    setIsExporting(true);
    try {
      downloadHackerCardImage(userState, topSkillName, topSkillScore);
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    } catch (e) {
      console.error('Failed to export card image:', e);
    } finally {
      setTimeout(() => setIsExporting(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-sm my-auto text-slate-100 flex flex-col items-center">
        {/* Close Button */}
        <button
          onClick={() => {
            sound.playTap();
            onClose();
          }}
          className="absolute -top-10 right-0 p-1.5 rounded-full text-slate-400 hover:text-white bg-surface/80 border border-white/10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 9:16 Vertical Cyber Operator ID Card */}
        <div 
          id="hacker-flex-card"
          className="w-full rounded-3xl bg-gradient-to-b from-[#131B2E] via-[#090D16] to-[#050811] border-2 border-emerald-500/40 p-6 shadow-2xl relative overflow-hidden"
          style={{ boxShadow: '0 0 40px -5px rgba(16, 185, 129, 0.35)' }}
        >
          {/* Holographic Watermark / Grid Background */}
          <div className="absolute inset-0 bg-grid-cyber opacity-40 pointer-events-none" />
          <div className="absolute -top-16 -right-16 w-36 h-36 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Card Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-xs font-mono font-bold text-emerald-400">
                0x
              </div>
              <span className="font-mono text-[11px] font-extrabold tracking-widest text-white">
                ZERODAY // OPERATOR ID
              </span>
            </div>
            <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 font-bold">
              VERIFIED
            </span>
          </div>

          {/* Hacker Avatar & Identity */}
          <div className="flex flex-col items-center text-center my-2">
            <div className="relative mb-3">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/30 to-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center shadow-neon-emerald">
                <Zap className="w-10 h-10 text-emerald-400" />
              </div>
              {userState.streakShieldActive && (
                <div 
                  className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-cyan-950 border border-cyan-400 text-cyan-300 text-[9px] font-mono font-bold shadow-sm flex items-center gap-0.5"
                  title="Streak Shield Pro Active"
                >
                  <Shield className="w-2.5 h-2.5 text-cyan-400" />
                  SHIELD
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-1.5">
              <h2 className="text-xl font-mono font-extrabold text-white tracking-wide">
                {userState.username}
              </h2>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border mt-1"
              style={{ 
                backgroundColor: `${rank.badgeColor}15`, 
                borderColor: `${rank.badgeColor}50`, 
                color: rank.badgeColor 
              }}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{rank.tier} · {userState.elo} ELO</span>
            </div>
          </div>

          {/* Tactical Stats Grid */}
          <div className="grid grid-cols-2 gap-2 my-4">
            {/* Win Streak */}
            <div className="p-3 rounded-xl bg-[#0F172A]/80 border border-white/10 text-center">
              <div className="flex items-center justify-center gap-1 text-amber-400 mb-0.5">
                <Flame className="w-4 h-4 fill-amber-500 animate-pulse" />
                <span className="font-mono font-black text-lg">x{userState.winStreak}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono uppercase">
                Win Streak PvP
              </span>
            </div>

            {/* Exam Readiness */}
            <div className="p-3 rounded-xl bg-[#0F172A]/80 border border-white/10 text-center">
              <div className="font-mono font-black text-lg text-emerald-400 mb-0.5">
                {userState.readinessScore}%
              </div>
              <span className="text-[10px] text-slate-400 font-mono uppercase">
                Exam Readiness
              </span>
            </div>
          </div>

          {/* Top Specialty Skill Card */}
          <div className="p-3 rounded-xl bg-surface/90 border border-white/10 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="text-[9px] text-slate-400 font-mono block">PRIMARY SPECIALIZATION</span>
                <span className="font-mono font-bold text-xs text-white">{topSkillName}</span>
              </div>
            </div>
            <span className="font-mono font-extrabold text-sm text-emerald-400">
              {topSkillScore}%
            </span>
          </div>

          {/* Cryptographic Hash & Barcode verification */}
          <div className="border-t border-white/10 pt-3 flex items-center justify-between font-mono text-[9px] text-slate-400">
            <div>
              <span className="text-slate-500 block">HASH_SIGNATURE</span>
              <span className="text-slate-300 font-mono">0x7F4A...B902_VALID</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block">NETWORK</span>
              <span className="text-emerald-400 font-bold">zeroday.gg/cert</span>
            </div>
          </div>
        </div>

        {/* Action Buttons below card */}
        <div className="w-full mt-4 space-y-2">
          {/* Copy Challenge Link */}
          <button
            onClick={handleCopyChallenge}
            className="w-full py-3.5 px-4 rounded-xl font-mono font-extrabold text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 transition-all shadow-neon-emerald flex items-center justify-center gap-2 transform active:scale-95"
          >
            {copiedLink ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>CHALLENGE LINK COPIED TO CLIPBOARD!</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-slate-950" />
                <span>CHALLENGE A FRIEND TO THIS MATCH (COPY LINK)</span>
              </>
            )}
          </button>

          {/* High-Resolution PNG 9:16 Image Export */}
          <button
            onClick={handleDownloadCard}
            disabled={isExporting}
            className="w-full py-2.5 px-3 rounded-xl font-mono text-xs text-slate-200 hover:text-white bg-surface border border-white/10 hover:border-emerald-500/40 transition-all flex items-center justify-center gap-1.5 active:scale-98"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isExporting ? 'Generating 9:16 PNG...' : 'Download Operator Card (.PNG for Stories/Discord)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
