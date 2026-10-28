/**
 * ZeroDay Hacker ID Card Canvas Renderer
 * Renders a crisp 9:16 high-resolution operator card directly to HTML5 Canvas
 * and exports as a shareable PNG image for Discord, WhatsApp, and Instagram Stories.
 */

import { UserState } from '../types';
import { getRankFromElo } from '../data/ranks';
import { sanitizeCallsign, sanitizeAlphanumeric } from './security';

export function renderHackerCardToCanvas(
  canvas: HTMLCanvasElement,
  userState: UserState,
  topSkillName: string,
  topSkillScore: number
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = 1080;
  const height = 1920;
  canvas.width = width;
  canvas.height = height;

  const rank = getRankFromElo(userState.elo);

  // 1. Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#0f172a');
  bgGrad.addColorStop(0.3, '#090d16');
  bgGrad.addColorStop(0.7, '#050811');
  bgGrad.addColorStop(1, '#020408');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Ambient neon glow orbs
  const glow1 = ctx.createRadialGradient(200, 300, 50, 200, 300, 600);
  glow1.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
  glow1.addColorStop(1, 'rgba(16, 185, 129, 0)');
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, width, height);

  const glow2 = ctx.createRadialGradient(880, 1400, 50, 880, 1400, 700);
  glow2.addColorStop(0, 'rgba(99, 102, 241, 0.25)');
  glow2.addColorStop(1, 'rgba(99, 102, 241, 0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, width, height);

  // 3. Cyber Matrix Grid Lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
  ctx.lineWidth = 2;
  const gridSize = 60;
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // 4. Outer Glowing Frame
  const margin = 70;
  const cardW = width - margin * 2;
  const cardH = height - margin * 2;
  const radius = 48;

  ctx.save();
  ctx.shadowColor = 'rgba(16, 185, 129, 0.5)';
  ctx.shadowBlur = 40;
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.7)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(margin, margin, cardW, cardH, radius);
  ctx.stroke();
  ctx.restore();

  // 5. Header Banner
  ctx.font = 'bold 36px "JetBrainsMono Nerd Font Mono", "JetBrains Mono", monospace';
  ctx.fillStyle = '#10b981';
  ctx.fillText('0xDAY // CYBER WARFARE ACADEMY', margin + 60, margin + 110);

  ctx.font = '600 24px "JetBrainsMono Nerd Font Mono", "JetBrains Mono", monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('CYBERSECURITY DOSSIER', margin + 60, margin + 155);

  // Header Status Tag
  ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
  ctx.fillRect(width - margin - 260, margin + 80, 200, 60);
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 2;
  ctx.strokeRect(width - margin - 260, margin + 80, 200, 60);

  ctx.font = 'bold 26px "JetBrainsMono Nerd Font Mono", "JetBrains Mono", monospace';
  ctx.fillStyle = '#34d399';
  ctx.fillText('AUTHENTIC', width - margin - 235, margin + 120);

  // Horizontal Divider
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(margin + 50, margin + 200);
  ctx.lineTo(width - margin - 50, margin + 200);
  ctx.stroke();

  // 6. Central Avatar Frame
  const avatarSize = 240;
  const avatarX = width / 2 - avatarSize / 2;
  const avatarY = margin + 270;

  ctx.save();
  ctx.shadowColor = 'rgba(16, 185, 129, 0.6)';
  ctx.shadowBlur = 50;
  ctx.fillStyle = 'rgba(19, 27, 46, 0.9)';
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.roundRect(avatarX, avatarY, avatarSize, avatarSize, 40);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Tactical Avatar Insignia (Vector Lightning)
  ctx.save();
  ctx.fillStyle = '#10b981';
  ctx.shadowColor = 'rgba(16, 185, 129, 0.8)';
  ctx.shadowBlur = 25;
  ctx.beginPath();
  const boltCx = width / 2;
  const boltCy = avatarY + avatarSize / 2;
  ctx.moveTo(boltCx + 8, boltCy - 65);
  ctx.lineTo(boltCx - 36, boltCy + 5);
  ctx.lineTo(boltCx - 2, boltCy + 5);
  ctx.lineTo(boltCx - 16, boltCy + 65);
  ctx.lineTo(boltCx + 38, boltCy - 8);
  ctx.lineTo(boltCx + 6, boltCy - 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 7. Operator Callsign / Username
  ctx.font = 'bold 72px "JetBrainsMono Nerd Font Mono", "JetBrains Mono", monospace';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(sanitizeCallsign(userState.username), width / 2, avatarY + 340);

  // Rank Pill
  ctx.font = 'bold 36px "JetBrainsMono Nerd Font Mono", "JetBrains Mono", monospace';
  const rankText = `${rank.tier} · ${userState.elo} ELO`;
  const rankPillW = 460;
  const rankPillH = 70;
  const rankPillX = width / 2 - rankPillW / 2;
  const rankPillY = avatarY + 380;

  ctx.fillStyle = 'rgba(99, 102, 241, 0.2)';
  ctx.strokeStyle = rank.badgeColor || '#6366f1';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(rankPillX, rankPillY, rankPillW, rankPillH, 35);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = rank.badgeColor || '#a5b4fc';
  ctx.fillText(rankText, width / 2, rankPillY + 47);

  // 8. Stats Grid (2 Large Metric Cards)
  const statBoxY = rankPillY + 130;
  const statBoxW = (cardW - 160) / 2;
  const statBoxH = 220;

  // Stat Box 1: Win Streak
  const box1X = margin + 60;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(box1X, statBoxY, statBoxW, statBoxH, 28);
  ctx.fill();
  ctx.stroke();

  ctx.font = 'bold 64px "JetBrainsMono Nerd Font Mono", "JetBrains Mono", monospace';
  ctx.fillStyle = '#fbbf24';
  ctx.fillText(`x${userState.winStreak}`, box1X + statBoxW / 2, statBoxY + 110);

  ctx.font = '600 26px "JetBrainsMono Nerd Font Mono", "JetBrains Mono", monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('WIN STREAK BLITZ', box1X + statBoxW / 2, statBoxY + 165);

  // Stat Box 2: Exam Readiness
  const box2X = width - margin - 60 - statBoxW;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(box2X, statBoxY, statBoxW, statBoxH, 28);
  ctx.fill();
  ctx.stroke();

  ctx.font = 'bold 64px "JetBrainsMono Nerd Font Mono", "JetBrains Mono", monospace';
  ctx.fillStyle = '#34d399';
  ctx.fillText(`${userState.readinessScore}%`, box2X + statBoxW / 2, statBoxY + 110);

  ctx.font = '600 26px "JetBrainsMono Nerd Font Mono", "JetBrains Mono", monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('EXAM READINESS', box2X + statBoxW / 2, statBoxY + 165);

  // 9. Specialty Skill Box
  const skillBoxY = statBoxY + 260;
  const skillBoxW = cardW - 120;
  const skillBoxH = 160;
  const skillBoxX = margin + 60;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(skillBoxX, skillBoxY, skillBoxW, skillBoxH, 28);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.font = 'bold 24px "JetBrainsMono Nerd Font Mono", "JetBrains Mono", monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('PRIMARY OPERATIONAL DOMAIN', skillBoxX + 40, skillBoxY + 60);

  ctx.font = 'bold 44px "JetBrainsMono Nerd Font Mono", "JetBrains Mono", monospace';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(topSkillName, skillBoxX + 40, skillBoxY + 115);

  ctx.textAlign = 'right';
  ctx.font = 'bold 54px "JetBrainsMono Nerd Font Mono", "JetBrains Mono", monospace';
  ctx.fillStyle = '#10b981';
  ctx.fillText(`${topSkillScore}%`, skillBoxX + skillBoxW - 40, skillBoxY + 100);

  // 10. Footer Cryptographic Signature & Barcode Simulation
  const footerY = height - margin - 150;
  ctx.textAlign = 'left';
  ctx.font = 'bold 22px "JetBrainsMono Nerd Font Mono", "JetBrains Mono", monospace';
  ctx.fillStyle = '#64748b';
  ctx.fillText('HASH_SIGNATURE:', margin + 60, footerY);

  ctx.font = '22px "JetBrainsMono Nerd Font Mono", "JetBrains Mono", monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('0x7F4A-B902-E81C-0xDAY-VERIFIED-MEMBER', margin + 60, footerY + 36);

  ctx.textAlign = 'right';
  ctx.font = 'bold 26px "JetBrainsMono Nerd Font Mono", "JetBrains Mono", monospace';
  ctx.fillStyle = '#10b981';
  ctx.fillText('pwnify.app // PWNIFY', width - margin - 60, footerY + 20);

  ctx.font = '20px "JetBrainsMono Nerd Font Mono", "JetBrains Mono", monospace';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Official Cybersecurity Battleground', width - margin - 60, footerY + 50);

  // Simulated Barcode
  const barY = footerY + 70;
  const barW = cardW - 120;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  let currentX = margin + 60;
  while (currentX < margin + 60 + barW) {
    const bitWidth = Math.floor(Math.random() * 6) + 2;
    const space = Math.floor(Math.random() * 5) + 3;
    ctx.fillRect(currentX, barY, bitWidth, 24);
    currentX += bitWidth + space;
  }
}

/**
 * Downloads the rendered card directly as a 9:16 PNG image
 */
export function downloadHackerCardImage(
  userState: UserState,
  topSkillName: string,
  topSkillScore: number
): void {
  const canvas = document.createElement('canvas');
  renderHackerCardToCanvas(canvas, userState, topSkillName, topSkillScore);

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const safeName = sanitizeAlphanumeric(userState.username, 24, 'user');
    const link = document.createElement('a');
    link.href = url;
    link.download = `pwnify_id_${safeName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 'image/png');
}
