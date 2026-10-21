import React, { useState } from 'react';
import { Download, X, Sparkles } from 'lucide-react';
import { updateManager, type UpdateManagerState } from '../../utils/updateManager.ts';
import { useLanguage } from '../../utils/language.ts';

interface FlexibleUpdateBannerProps {
  state: UpdateManagerState;
}

export const FlexibleUpdateBanner: React.FC<FlexibleUpdateBannerProps> = ({ state }) => {
  const { lang } = useLanguage();
  const isEn = lang === 'en';
  const [isDismissed, setIsDismissed] = useState(false);

  // When downloading/downloaded/installing, the centered UpdateProgressModal is displayed instead
  if (isDismissed || state.status !== 'FLEXIBLE_AVAILABLE') return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-slide-up font-mono">
      <div className="bg-[#0C1322]/95 border border-emerald-500/40 rounded-xl p-3.5 sm:p-4 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 text-zinc-100">
        
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span>{isEn ? 'UPDATE AVAILABLE' : 'AGGIORNAMENTO DISPONIBILE'}</span>
              <span className="text-zinc-500">v{state.latestVersionName}</span>
            </div>
            <p className="text-xs text-zinc-300 truncate font-sans">
              {isEn ? 'A new optimized build is ready.' : 'Nuova build ottimizzata disponibile.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => updateManager.executePrimaryUpdateAction()}
            className="py-1.5 px-3 rounded-lg text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isEn ? 'Update' : 'Aggiorna'}</span>
          </button>

          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
