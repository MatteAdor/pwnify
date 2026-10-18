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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-sm my-auto text-slate-100 flex flex-col items-center">
        {/* Close Button */}
        <button
          onClick={() => {
            sound.playTap();
            onClose();
          }}
          className="absolute -top-10 right-0 p-1.5 rounded-full text-slate-400 hover:text-white bg-zinc-900 border border-zinc-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 9:16 Vertical Cyber Operator ID Card */}
        <div 
          id="hacker-flex-card"
          className="w-full rounded-2xl bg-[#0D121D] border border-zinc-800 p-6 relative overflow-hidden"
        >
          {/* Card Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-emerald-400">0x</span>
              <span className="font-mono text-[11px] font-extrabold tracking-widest text-zinc-200">
                ZERODAY // OPERATOR ID
              </span>
            </div>
            <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 font-bold">
              VERIFIED
            </span>
          </div>

          {/* Hacker Avatar & Identity */}
          <div className="flex flex-col items-center text-center my-2">
            <div className="relative mb-3">
              <div className="w-16 h-16 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <Zap className="w-8 h-8 text-emerald-400" />
              </div>
              {userState.streakShieldActive && (
                <div 
                  className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 text-[9px] font-mono font-bold flex items-center gap-0.5"
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
            <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 text-center">
              <div className="flex items-center justify-center gap-1 text-amber-400 mb-0.5">
                <Flame className="w-4 h-4 fill-amber-500" />
                <span className="font-mono font-black text-lg">x{userState.winStreak}</span>
              </div>
              <span className="text-[10px] text-zinc-400 font-mono uppercase">
                Win Streak PvP
              </span>
            </div>

            {/* Exam Readiness */}
            <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 text-center">
              <div className="font-mono font-black text-lg text-emerald-400 mb-0.5">
                {userState.readinessScore}%
              </div>
              <span className="text-[10px] text-zinc-400 font-mono uppercase">
                Exam Readiness
              </span>
            </div>
          </div>

          {/* Top Specialty Skill Card */}
          <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="text-[9px] text-zinc-400 font-mono block">PRIMARY SPECIALIZATION</span>
                <span className="font-mono font-bold text-xs text-white">{topSkillName}</span>
              </div>
            </div>
            <span className="font-mono font-extrabold text-sm text-emerald-400">
              {topSkillScore}%
            </span>
          </div>

          {/* Cryptographic Hash & Barcode verification */}
          <div className="border-t border-zinc-800 pt-3 flex items-center justify-between font-mono text-[9px] text-zinc-400">
            <div>
              <span className="text-zinc-500 block">HASH_SIGNATURE</span>
              <span className="text-zinc-300 font-mono">0x7F4A...B902_VALID</span>
            </div>
            <div className="text-right">
              <span className="text-zinc-500 block">NETWORK</span>
              <span className="text-emerald-400 font-bold">zeroday.gg/cert</span>
            </div>
          </div>
        </div>

        {/* Action Buttons below card */}
        <div className="w-full mt-4 space-y-2">
          {/* Copy Challenge Link */}
          <button
            onClick={handleCopyChallenge}
            className="w-full py-3 px-4 rounded-lg font-mono font-bold text-xs sm:text-sm text-zinc-950 bg-emerald-500 hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2 active:scale-95"
          >
            {copiedLink ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>CHALLENGE LINK COPIED TO CLIPBOARD!</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-zinc-950" />
                <span>CHALLENGE A FRIEND TO THIS MATCH (COPY LINK)</span>
              </>
            )}
          </button>

          {/* High-Resolution PNG 9:16 Image Export */}
          <button
            onClick={handleDownloadCard}
            disabled={isExporting}
            className="w-full py-2.5 px-3 rounded-lg font-mono text-xs text-zinc-200 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isExporting ? 'Generating 9:16 PNG...' : 'Download Operator Card (.PNG)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
