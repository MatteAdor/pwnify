import React, { useState } from 'react';
import { Download, RefreshCw, X, Sparkles, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { updateManager, type UpdateManagerState } from '../../utils/updateManager.ts';
import { useLanguage } from '../../utils/language.ts';

interface FlexibleUpdateBannerProps {
  state: UpdateManagerState;
}

export const FlexibleUpdateBanner: React.FC<FlexibleUpdateBannerProps> = ({ state }) => {
  const { lang } = useLanguage();
  const isEn = lang === 'en';
  const [isDismissed, setIsDismissed] = useState(false);

  // Show banner for available, downloading, downloaded, installing, or error states
  const isRelevant = 
    state.status === 'FLEXIBLE_AVAILABLE' ||
    state.status === 'DOWNLOADING' ||
    state.status === 'INSTALLING' ||
    state.status === 'DOWNLOADED' ||
    state.status === 'ERROR';

  if (isDismissed || !isRelevant) return null;

  const isDownloading = state.status === 'DOWNLOADING';
  const isInstalling = state.status === 'INSTALLING';
  const isReadyToRestart = state.status === 'DOWNLOADED';
  const isError = state.status === 'ERROR';

  const downloadedMb = (state.bytesDownloaded / (1024 * 1024)).toFixed(1);
  const totalMb = (state.totalBytes / (1024 * 1024)).toFixed(1);

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-slide-up font-mono">
      <div className={`border rounded-xl p-3.5 sm:p-4 shadow-2xl backdrop-blur-md space-y-3 transition-colors ${
        isError 
          ? 'bg-[#150A0E]/95 border-rose-500/40 text-rose-200'
          : 'bg-[#0C1322]/95 border-emerald-500/30 text-zinc-100'
      }`}>
        
        {/* Main Banner Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${
              isError
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : isDownloading || isInstalling
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}>
              {isError ? (
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              ) : isInstalling || isReadyToRestart ? (
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
              ) : isDownloading ? (
                <Download className="w-4 h-4 animate-bounce text-emerald-400" />
              ) : (
                <Sparkles className="w-4 h-4 text-emerald-400" />
              )}
            </div>

            <div className="space-y-0.5 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className={isError ? 'text-rose-400' : 'text-emerald-400'}>
                  {isError 
                    ? (isEn ? 'UPDATE ERROR' : 'ERRORE AGGIORNAMENTO')
                    : isInstalling
                    ? (isEn ? 'INSTALLING...' : 'INSTALLAZIONE IN CORSO...')
                    : isDownloading
                    ? (isEn ? `DOWNLOADING ${state.progressPercent}%` : `DOWNLOAD IN CORSO ${state.progressPercent}%`)
                    : isReadyToRestart 
                    ? (isEn ? 'UPDATE READY' : 'AGGIORNAMENTO PRONTO')
                    : (isEn ? 'UPDATE AVAILABLE' : 'AGGIORNAMENTO DISPONIBILE')}
                </span>
                <span className="text-zinc-500">v{state.latestVersionName}</span>
              </div>
              <p className="text-xs text-zinc-300 truncate font-sans">
                {isError
                  ? (state.errorMessage || (isEn ? 'Download failed. Tap retry.' : 'Download fallito. Tocca riprova.'))
                  : isInstalling
                  ? (isEn ? 'SHA-256 verified. Opening Android installer...' : 'SHA-256 verificato. Apertura installer...')
                  : isDownloading
                  ? (state.totalBytes > 0 
                      ? `${downloadedMb} MB / ${totalMb} MB` 
                      : (isEn ? 'Downloading update package...' : 'Scaricamento pacchetto...'))
                  : isReadyToRestart 
                  ? (isEn ? 'Restart now to complete installation.' : 'Riavvia per completare l\'aggiornamento.')
                  : (isEn ? 'A new optimized build is ready.' : 'Nuova build ottimizzata disponibile.')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isError ? (
              <button
                onClick={() => updateManager.executePrimaryUpdateAction()}
                className="py-1.5 px-3 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{isEn ? 'Retry' : 'Riprova'}</span>
              </button>
            ) : isReadyToRestart ? (
              <button
                onClick={() => updateManager.completeFlexibleUpdate()}
                className="py-1.5 px-3 rounded-lg text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{isEn ? 'Restart' : 'Riavvia'}</span>
              </button>
            ) : !isDownloading && !isInstalling ? (
              <button
                onClick={() => updateManager.executePrimaryUpdateAction()}
                className="py-1.5 px-3 rounded-lg text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isEn ? 'Update' : 'Aggiorna'}</span>
              </button>
            ) : null}

            {!isDownloading && !isInstalling && (
              <button
                onClick={() => setIsDismissed(true)}
                className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Real-Time Progress Bar while Downloading */}
        {isDownloading && (
          <div className="space-y-1 pt-1">
            <div className="w-full h-2 bg-zinc-900 border border-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-400 transition-all duration-200 shadow-neon-emerald"
                style={{ width: `${Math.max(5, state.progressPercent)}%` }}
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
