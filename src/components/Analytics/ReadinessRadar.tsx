import React from 'react';
import { UserState, SkillDomain } from '../../types';
import { calculateDynamicTelemetry } from '../../utils/readinessEngine';
import { useLanguage } from '../../utils/language';
import { 
  Radar as RadarIcon, Lock, Sparkles, AlertTriangle, 
  BarChart2, ShieldCheck, CheckCircle2, Info
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
  const { lang, t } = useLanguage();
  const isEn = lang === 'en';

  const telemetry = calculateDynamicTelemetry(
    userState.completedNodeIds, 
    userState.completedPbqIds, 
    userState.isPro
  );

  const radarScores = telemetry.radarScores;
  const readinessScore = telemetry.readinessScore;

  const domains: { name: string; key: SkillDomain }[] = [
    { name: 'Web Sec', key: 'Web Sec' },
    { name: 'Networking', key: 'Networking' },
    { name: 'Linux & Bash', key: 'Linux & Bash' },
    { name: 'Cryptography', key: 'Cryptography' },
    { name: 'Code Analysis', key: 'Code Analysis' },
    { name: 'Defense & SOC', key: 'Defense & SOC' }
  ];

  // Hexagonal radar mathematical coordinates
  const size = 280;
  const center = size / 2;
  const radius = 95;
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

  const isPassing = readinessScore >= 75;

  return (
    <div className="w-full max-w-xl mx-auto px-3.5 sm:px-4 py-4 pb-28 space-y-4 animate-fade-in font-sans">
      
      {/* 1. Header Banner */}
      <div className="rounded-2xl bg-[#0D121D] border border-zinc-800 p-5 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-zinc-400" />
            <span className="text-xs font-mono text-zinc-400 uppercase font-bold tracking-wider">
              Telemetry & Audit
            </span>
          </div>

          {onOpenHackerCard && (
            <button
              onClick={onOpenHackerCard}
              className="py-1 px-2.5 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-mono text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>HACKER ID</span>
            </button>
          )}
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {t.readinessRadarTitle}
          </h1>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            {t.readinessRadarSub}
          </p>
        </div>
      </div>

      {/* 2. Global Readiness Score Card */}
      <div className="rounded-2xl bg-[#0D121D] border border-zinc-800 p-5 sm:p-6 shadow-md">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          {/* Radial Donut Gauge */}
          <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="50"
                stroke="currentColor"
                strokeWidth="9"
                className="text-zinc-800"
                fill="transparent"
              />
              <circle
                cx="64"
                cy="64"
                r="50"
                stroke="currentColor"
                strokeWidth="9"
                strokeDasharray={314}
                strokeDashoffset={314 - (314 * readinessScore) / 100}
                className={isPassing ? 'text-emerald-400' : 'text-amber-400'}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl sm:text-3xl font-mono font-black ${isPassing ? 'text-emerald-400' : 'text-amber-400'}`}>
                {readinessScore}%
              </span>
              <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider font-bold">
                READINESS
              </span>
            </div>
          </div>

          {/* Diagnosis Summary */}
          <div className="text-left space-y-2 flex-1 min-w-0">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono font-bold border ${
              isPassing 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}>
              {isPassing ? (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>{isPassing ? t.abovePassingThreshold : t.belowPassingThreshold}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <h3 className="text-sm sm:text-base font-bold text-white">
                {t.passingProbabilityLabel}:{' '}
                <span className={`font-mono ${isPassing ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {isPassing ? t.probHigh : t.probLow}
                </span>
              </h3>
              <div className="relative group cursor-help" title={t.readinessFormulaTooltip}>
                <Info className="w-3.5 h-3.5 text-zinc-400 hover:text-zinc-200 transition-colors" />
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed italic border-l-2 border-zinc-700 pl-2">
              {t.readinessDisclaimer}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Hexagonal Radar Chart Display */}
      <div className="rounded-2xl bg-[#0D121D] border border-zinc-800 p-5 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-mono font-bold text-xs sm:text-sm text-white flex items-center gap-2">
            <RadarIcon className="w-4 h-4 text-emerald-400" />
            <span>{t.hexagonalRadarTitle}</span>
          </h3>
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              {t.yourLevel}
            </span>
            <span className="flex items-center gap-1.5 text-indigo-400 font-bold">
              <div className="w-2 h-2 rounded-full bg-indigo-500" />
              {t.proTarget}
            </span>
          </div>
        </div>

        {/* Radar SVG Visualizer */}
        <div className="flex justify-center my-2 overflow-x-auto">
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
              fill="rgba(99, 102, 241, 0.08)"
              stroke="#6366F1"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />

            {/* User Skill Polygon */}
            <polygon
              points={userPoints}
              fill="rgba(16, 185, 129, 0.2)"
              stroke="#10B981"
              strokeWidth="2"
            />

            {/* Domain Labels */}
            {domains.map((d, i) => {
              const { x, y } = getCoordinates(115, i);
              return (
                <text
                  key={d.key}
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-zinc-300 font-mono text-[9px] font-bold"
                >
                  {d.name}
                </text>
              );
            })}
          </svg>
        </div>
      </div>

      {/* 4. Domain-by-Domain Breakdown */}
      <div className="rounded-2xl bg-[#0D121D] border border-zinc-800 p-5 space-y-3.5 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-white">
              {isEn ? 'Domain Accuracy Breakdown' : 'Accuratezza per Dominio'}
            </h3>
            <p className="text-[11px] text-zinc-400">
              {isEn ? 'Granular competency telemetry per domain' : 'Dettaglio delle competenze maturate'}
            </p>
          </div>
          {!userState.isPro && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center gap-1 font-bold">
              <Lock className="w-3 h-3 text-amber-400" /> PRO
            </span>
          )}
        </div>

        {/* Free Tier Preview or Full Pro List */}
        {!userState.isPro ? (
          <div className="relative">
            <div className="filter blur-sm select-none opacity-40 space-y-2 pointer-events-none">
              {domains.map((d) => (
                <div key={d.key} className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                  <span className="font-mono text-xs text-white">{d.name}</span>
                  <span className="font-mono text-xs text-emerald-400">84% Accuracy</span>
                </div>
              ))}
            </div>

            {/* Crisp Lock Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 p-4 text-center rounded-xl border border-zinc-800">
              <Lock className="w-5 h-5 text-zinc-400 mb-2" />
              <h4 className="font-mono font-bold text-xs sm:text-sm text-white mb-1">
                {isEn ? 'WEAKNESS DRILL LOCKED' : 'ANALISI LACUNE BLOCCATA'}
              </h4>
              <p className="text-xs text-zinc-400 max-w-xs mb-3 leading-relaxed">
                {isEn 
                  ? 'Upgrade to Pwnify PRO to inspect granular domain accuracy and launch targeted drills.'
                  : 'Sblocca Pwnify PRO per esaminare l\'accuratezza dettagliata e avviare sessioni mirate.'}
              </p>
              <button
                onClick={() => onOpenPaywall('weakness_drill')}
                className="py-2.5 px-5 rounded-xl font-mono font-bold text-xs text-zinc-950 bg-emerald-500 hover:bg-emerald-400 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 fill-current" />
                <span>{isEn ? 'UNLOCK WITH PRO' : 'SBLOCCA CON PRO'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 animate-fade-in">
            {domains.map((d) => {
              const score = radarScores[d.key] || 0;
              const completedCount = telemetry.domainCounts[d.key]?.completed || 0;
              const totalCount = telemetry.domainCounts[d.key]?.total || 0;
              const isUntouched = score === 0;
              const isWeak = score > 0 && score < 60;

              return (
                <div 
                  key={d.key}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
                    isUntouched
                      ? 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
                      : isWeak 
                      ? 'bg-amber-950/20 border-amber-500/30 text-amber-200' 
                      : 'bg-zinc-900 border-emerald-500/30 text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      isUntouched ? 'bg-zinc-600' : isWeak ? 'bg-amber-400' : 'bg-emerald-400'
                    }`} />
                    <div>
                      <span className="font-mono font-bold text-xs text-white block">
                        {d.name}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {completedCount}/{totalCount} {isEn ? 'lessons' : 'lezioni'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`font-mono font-bold text-xs ${
                      isUntouched ? 'text-zinc-500' : isWeak ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {score}%
                    </span>
                    {isWeak && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                        REVIEW
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
