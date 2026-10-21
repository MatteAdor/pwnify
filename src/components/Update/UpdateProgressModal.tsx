import React from 'react';
import { Download, RefreshCw, X, AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { updateManager, type UpdateManagerState } from '../../utils/updateManager.ts';
import { useLanguage } from '../../utils/language.ts';

interface UpdateProgressModalProps {
  state: UpdateManagerState;
}

export const UpdateProgressModal: React.FC<UpdateProgressModalProps> = ({ state }) => {
  const { lang } = useLanguage();
  const isEn = lang === 'en';

  // Only show when downloading, downloaded, installing, or error during download
  const isVisible =
    state.status === 'DOWNLOADING' ||
    state.status === 'DOWNLOADED' ||
    state.status === 'INSTALLING' ||
    (state.status === 'ERROR' && state.progressPercent > 0);

  if (!isVisible) return null;

  const isDownloading = state.status === 'DOWNLOADING';
  const isDownloaded = state.status === 'DOWNLOADED';
  const isInstalling = state.status === 'INSTALLING';
  const isError = state.status === 'ERROR';

  const downloadedMb = (state.bytesDownloaded / (1024 * 1024)).toFixed(1);
  const totalMb = (state.totalBytes / (1024 * 1024)).toFixed(1);

  return (
    <div className="fixed inset-0 z-[99998] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in font-mono select-none">
      {/* Background Cyber Ambient Glow */}
      <div className="absolute w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Centered Modal Container */}
      <div className={`relative w-full max-w-sm rounded-2xl p-5 sm:p-6 shadow-2xl border text-center space-y-4 transition-all ${
        isError 
          ? 'bg-[#150A0E] border-rose-500/50 text-rose-100 shadow-rose-950/50' 
          : 'bg-[#0C1322] border-emerald-500/40 text-zinc-100 shadow-emerald-950/50'
      }`}>
        
        {/* Top Status Icon */}
        <div className="flex justify-center pt-1">
          {isError ? (
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-7 h-7 text-rose-400" />
            </div>
          ) : isDownloaded ? (
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-neon-emerald">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-pulse" />
            </div>
          ) : isInstalling ? (
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <RefreshCw className="w-7 h-7 text-emerald-400 animate-spin" />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Download className="w-7 h-7 text-emerald-400 animate-bounce" />
            </div>
          )}
        </div>

        {/* Header Titles */}
        <div className="space-y-1">
          <div className="text-[10px] uppercase font-bold tracking-widest text-emerald-400/90 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>ZeroDay Security OS // OTA</span>
          </div>

          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
            {isError
              ? (isEn ? 'UPDATE FAILED' : 'AGGIORNAMENTO NON RIUSCITO')
              : isDownloaded
              ? (isEn ? 'DOWNLOAD COMPLETED' : 'DOWNLOAD COMPLETATO')
              : isInstalling
              ? (isEn ? 'INSTALLING...' : 'INSTALLAZIONE IN CORSO')
              : (isEn ? 'DOWNLOADING UPDATE' : 'AGGIORNAMENTO IN CORSO')}
          </h3>

          <div className="inline-block px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] font-bold text-emerald-400">
            Target: v{state.latestVersionName} (build {state.latestVersionCode})
          </div>
        </div>

        {/* Phase 1: Downloading State */}
        {isDownloading && (
          <div className="space-y-3 pt-2">
            <div className="flex items-baseline justify-between px-1">
              <span className="text-2xl font-bold text-emerald-400">
                {state.progressPercent}%
              </span>
              <span className="text-xs text-zinc-400 font-sans">
                {state.totalBytes > 0 ? `${downloadedMb} MB / ${totalMb} MB` : 'Connessione...'}
              </span>
            </div>

            {/* Glowing Tactical Progress Bar */}
            <div className="w-full h-3 bg-zinc-900 rounded-full border border-zinc-800 overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-200 shadow-neon-emerald"
                style={{ width: `${Math.max(6, state.progressPercent)}%` }}
              />
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
              {isEn 
                ? 'Downloading release APK package & calculating SHA-256 integrity...'
                : 'Scaricamento pacchetto APK e calcolo integrità crittografica SHA-256...'}
            </p>
          </div>
        )}

        {/* Phase 2: Downloaded State — Ready to Install & Restart */}
        {isDownloaded && (
          <div className="space-y-3 pt-2">
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-xs text-emerald-300 font-sans leading-relaxed">
              {isEn 
                ? 'Integrity check verified 100%. The update package is ready to be applied.'
                : 'Integrità crittografica verificata con successo. Il pacchetto è pronto per l\'installazione.'}
            </div>

            <button
              onClick={() => updateManager.completeFlexibleUpdate()}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 cursor-pointer font-mono"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{isEn ? 'INSTALL & RESTART APP' : 'INSTALLA E RIAVVIA APP'}</span>
            </button>
          </div>
        )}

        {/* Phase 3: Installing State */}
        {isInstalling && (
          <div className="space-y-3 pt-2">
            <p className="text-xs text-zinc-300 font-sans leading-relaxed">
              {isEn 
                ? 'Confirm the installation in Android system prompt. The app will reload automatically.'
                : 'Conferma l\'installazione nel prompt di sistema di Android. L\'app si aggiornerà senza perdere dati.'}
            </p>
          </div>
        )}

        {/* Phase 4: Error State */}
        {isError && (
          <div className="space-y-3 pt-2">
            <p className="text-xs text-rose-300 font-sans leading-relaxed">
              {state.errorMessage || (isEn ? 'Network error occurred during download.' : 'Errore durante il download del pacchetto.')}
            </p>

            <button
              onClick={() => updateManager.executePrimaryUpdateAction()}
              className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer font-mono"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{isEn ? 'RETRY' : 'RIPROVA'}</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
