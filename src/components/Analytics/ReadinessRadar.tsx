import React from 'react';
import { UserState, SkillDomain } from '../../types';
import { calculateDynamicTelemetry } from '../../utils/readinessEngine';
import { 
  Radar as RadarIcon, Lock, Sparkles, AlertTriangle, 
  Zap, BarChart2 
} from 'lucide-react';

interface ReadinessRadarProps {
  userState: UserState;
  onOpenPaywall: (context: 'weakness_drill') => void;
  onOpenHackerCard?: () => void;
}

export const ReadinessRadar: React.FC<ReadinessRadarProps> = ({
  userState,
  onOpenPaywall,
  onOpenHackerCard
}) => {
  const telemetry = calculateDynamicTelemetry(
    userState.completedNodeIds, 
    userState.completedPbqIds, 
    userState.isPro
  );

  const radarScores = telemetry.radarScores;
  const readinessScore = telemetry.readinessScore;

  const domains: { name: SkillDomain; key: SkillDomain }[] = [
    { name: 'Web Sec', key: 'Web Sec' },
    { name: 'Networking', key: 'Networking' },
    { name: 'Linux & Bash', key: 'Linux & Bash' },
    { name: 'Cryptography', key: 'Cryptography' },
    { name: 'Code Analysis', key: 'Code Analysis' },
    { name: 'Defense & SOC', key: 'Defense & SOC' }
  ];

  // Hexagonal radar mathematical coordinates
  const size = 300;
  const center = size / 2;
  const radius = 110;
  const angleStep = (Math.PI * 2) / 6;

  // Generate radar polygon points
  const getCoordinates = (value: number, index: number) => {
    const angle = index * angleStep - Math.PI / 2;
    const r = (value / 100) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  // User polygon coordinates
  const userPoints = domains.map((d, i) => {
    const score = radarScores[d.key] || 0;
    const { x, y } = getCoordinates(score, i);
    return `${x},${y}`;
  }).join(' ');

  // Target Pro 92% polygon coordinates
  const proTargetPoints = domains.map((_, i) => {
    const { x, y } = getCoordinates(92, i);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 pb-28 space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-surface to-[#1B2640] border border-white/10 p-5 shadow-cyber-glass">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1.5">
            <BarChart2 className="w-3.5 h-3.5" />
            DIAGNOSTIC TELEMETRY & AUDIT
          </span>
          <span className="text-xs font-mono text-slate-400">
            Pocket Prep & CyberClash Architecture
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white">
          Exam Readiness Radar
        </h1>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-2 pt-2 border-t border-white/5">
          <p className="text-xs text-slate-300">
            Analisi delle lacune cognitive su CompTIA Security+, CCNA e CEH. Individua i tuoi punti deboli prima di sostenere l'esame ufficiale.
          </p>
          {onOpenHackerCard && (
            <button
              onClick={onOpenHackerCard}
              className="self-start sm:self-auto py-1.5 px-3 rounded-lg border border-emerald-500/30 bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 font-mono text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-98 shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>HACKER ID CARD (9:16)</span>
            </button>
          )}
        </div>
      </div>

      {/* Global Readiness Score Card */}
      <div className="bg-surface border border-white/10 rounded-2xl p-6 text-center space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          {/* Radial Readiness Gauge */}
          <div className="relative w-36 h-36 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="72"
                cy="72"
                r="58"
                stroke="currentColor"
                strokeWidth="10"
                className="text-slate-800"
                fill="transparent"
              />
              <circle
                cx="72"
                cy="72"
                r="58"
                stroke="currentColor"
                strokeWidth="10"
                strokeDasharray={364}
                strokeDashoffset={364 - (364 * readinessScore) / 100}
                className={readinessScore < 50 ? 'text-red-500' : 'text-emerald-400'}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-mono font-black ${readinessScore < 50 ? 'text-red-400' : 'text-emerald-400'}`}>
                {readinessScore}%
              </span>
              <span className="text-[9px] font-mono text-slate-400 uppercase">
                READINESS
              </span>
            </div>
          </div>

          {/* Diagnosis Summary */}
          <div className="text-left space-y-2 max-w-sm">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-mono font-bold">
              <AlertTriangle className="w-3.5 h-3.5" />
              Sotto la soglia di superamento (75%)
            </div>
            <h3 className="text-base font-bold text-white">
              Probabilità di Superamento: <span className="text-red-400 font-mono">Bassa</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Hai evidenziato vulnerabilità critiche nella configurazione <span className="text-white font-mono">Linux & Bash</span> e nel subnetting <span className="text-white font-mono">Networking</span>.
            </p>
          </div>
        </div>
      </div>

      {/* Hexagonal Radar Chart Display */}
      <div className="bg-surface border border-white/10 rounded-2xl p-5 shadow-cyber-glass">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-mono font-bold text-sm text-white flex items-center gap-2">
            <RadarIcon className="w-4 h-4 text-emerald-400" />
            RADAR ESAGONALE DELLE COMPETENZE
          </h3>
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Tuo Livello
            </span>
            <span className="flex items-center gap-1.5 text-indigo-400">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              Target PRO (92%)
            </span>
          </div>
        </div>

        {/* Radar SVG Visualizer */}
        <div className="flex justify-center my-2">
          <svg width={size} height={size} className="overflow-visible">
            {/* Hexagonal grid levels (20%, 40%, 60%, 80%, 100%) */}
            {[20, 40, 60, 80, 100].map((level) => {
              const points = domains.map((_, i) => {
                const { x, y } = getCoordinates(level, i);
                return `${x},${y}`;
              }).join(' ');

              return (
                <polygon
                  key={level}
                  points={points}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth="1"
                />
              );
            })}

            {/* Axis lines */}
            {domains.map((_, i) => {
              const { x, y } = getCoordinates(100, i);
              return (
                <line
                  key={i}
                  x1={center}
                  y1={center}
                  x2={x}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.1)"
                  strokeWidth="1"
                />
              );
            })}

            {/* Target 92% Pro Polygon */}
            <polygon
              points={proTargetPoints}
              fill="rgba(99, 102, 241, 0.1)"
              stroke="#6366F1"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />

            {/* User Skill Polygon */}
            <polygon
              points={userPoints}
              fill="rgba(16, 185, 129, 0.25)"
              stroke="#10B981"
              strokeWidth="2.5"
            />

            {/* Domain Labels */}
            {domains.map((d, i) => {
              const { x, y } = getCoordinates(125, i);
              return (
                <text
                  key={d.key}
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-slate-300 font-mono text-[10px] font-semibold"
                >
                  {d.name}
                </text>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Trigger Paywall 4: Domain Details & Weakness Drill Lock */}
      <div className="bg-surface border border-white/10 rounded-2xl p-5 shadow-cyber-glass space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-white">
              Analisi di Dettaglio per Singolo Dominio
            </h3>
            <p className="text-xs text-slate-400">
              Metriche di accuratezza e vulnerabilità specifiche
            </p>
          </div>
          {!userState.isPro && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1 font-bold">
              <Lock className="w-3 h-3" /> PRO ONLY
            </span>
          )}
        </div>

        {/* Free User: Domain List Blurred + CTA */}
        {!userState.isPro ? (
          <div className="relative">
            <div className="filter blur-sm select-none opacity-40 space-y-3 pointer-events-none">
              {domains.map((d) => (
                <div key={d.key} className="p-3 rounded-xl bg-[#090D16] border border-white/5 flex items-center justify-between">
                  <span className="font-mono text-xs text-white">{d.name}</span>
                  <span className="font-mono text-xs text-emerald-400">84% Accuratezza</span>
                </div>
              ))}
            </div>

            {/* Lock Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-center rounded-xl">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-2">
                <Lock className="w-5 h-5" />
              </div>
              <h4 className="font-mono font-bold text-sm text-white mb-1">
                ANALISI FORENSE & DRILL DEI PUNTI DEBOLI BLOCCATI
              </h4>
              <p className="text-xs text-slate-300 max-w-sm mb-4">
                Gli utenti Free visualizzano solo il punteggio globale. Passa a PRO per vedere le percentuali per singolo dominio e avviare sessioni mirate sui tuoi errori.
              </p>
              <button
                onClick={() => onOpenPaywall('weakness_drill')}
                className="py-3 px-5 rounded-xl font-mono font-extrabold text-xs text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 shadow-neon-emerald flex items-center gap-2 transition-all transform active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>SBLOCCA WEAKNESS DRILL CON ZERODAY PRO</span>
              </button>
            </div>
          </div>
        ) : (
          /* Pro User: Full Domain Drilldown and Weakness Drill Action */
          <div className="space-y-3 animate-fade-in">
            {domains.map((d) => {
              const score = radarScores[d.key] || 0;
              const completedCount = telemetry.domainCounts[d.key]?.completed || 0;
              const totalCount = telemetry.domainCounts[d.key]?.total || 0;
              const isUntouched = score === 0;
              const isWeak = score > 0 && score < 60;

              return (
                <div 
                  key={d.key}
                  className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
                    isUntouched
                      ? 'bg-[#090D16]/60 border-white/5 text-slate-400'
                      : isWeak 
                      ? 'bg-amber-950/20 border-amber-500/30 text-amber-200' 
                      : 'bg-[#090D16] border-emerald-500/30 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${
                      isUntouched ? 'bg-slate-600' : isWeak ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
                    }`} />
                    <div>
                      <span className="font-mono font-bold text-xs text-white block">
                        {d.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {isUntouched 
                          ? `Non ancora avviato (0/${totalCount} quest)` 
                          : isWeak 
                          ? `In addestramento (${completedCount}/${totalCount} quest)` 
                          : `Competenza consolidata (${completedCount}/${totalCount} quest)`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`font-mono font-bold text-sm ${
                      isUntouched ? 'text-slate-500' : isWeak ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {score}%
                    </span>
                    {isWeak && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        ATTENZIONE
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            <button
              onClick={() => alert('Avvio sessione Weakness Drill tattica sui domini critici... Caricamento 5 scenari PoC!')}
              className="w-full mt-4 py-3.5 px-4 rounded-xl font-mono font-extrabold text-xs sm:text-sm text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-all shadow-neon-emerald flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 fill-slate-950" />
              <span>AVVIA WEAKNESS DRILL MIRATO SUI PUNTI DEBOLI</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
