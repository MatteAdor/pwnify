import React, { useEffect } from 'react';
import { 
  ShieldAlert, 
  Download, 
  ExternalLink, 
  RefreshCw, 
  AlertTriangle, 
  Smartphone,
  Lock,
  CheckCircle2
} from 'lucide-react';
import { App } from '@capacitor/app';
import { updateManager, type UpdateManagerState } from '../../utils/updateManager.ts';
import { useLanguage } from '../../utils/language.ts';
import { isNativeApp } from '../../utils/platform.ts';

interface ForceUpdateModalProps {
  state: UpdateManagerState;
}

export const ForceUpdateModal: React.FC<ForceUpdateModalProps> = ({ state }) => {
  const { lang } = useLanguage();
  const isEn = lang === 'en';

  // Intercept and disable back button on Android
  useEffect(() => {
    let handle: { remove: () => void } | null = null;
    if (isNativeApp()) {
      App.addListener('backButton', () => {
        // Trap back button — do not allow dismissing force update
        console.log('[ForceUpdate] Back button trapped by mandatory update gate.');
      }).then((h) => {
        handle = h;
      });
    }

    return () => {
      handle?.remove();
    };
  }, []);

  const reason = state.forceMessage?.[lang] || (
    isEn 
      ? 'A critical security and protocol update is required to access Pwnify network.'
      : 'Un aggiornamento critico di sicurezza e protocollo è necessario per accedere alla rete Pwnify.'
  );

  const isDownloading = state.status === 'DOWNLOADING';
  const isInstalling = state.status === 'INSTALLING';

  return (
    <div className="fixed inset-0 z-[99999] bg-[#060A12]/95 backdrop-blur-xl flex items-center justify-center p-4 select-none font-mono">
      {/* Tactical Glow Effect */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-lg bg-[#0C1322] border border-rose-500/40 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        
        {/* Top Header Badge */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-rose-400 uppercase tracking-widest font-bold">
                {isEn ? 'ZERO-KNOWLEDGE GATE' : 'BLOCCO PROTOCOLLO CRITICO'}
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {isEn ? 'Update Required' : 'Aggiornamento Obbligatorio'}
              </h2>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono">
            {state.flavor === 'play' ? 'GOOGLE PLAY' : 'DIRECT APK'}
          </span>
        </div>

        {/* Reason */}
        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
          {reason}
        </p>

        {/* Version Matrix Box */}
        <div className="bg-[#060A12] border border-zinc-800/80 rounded-xl p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between text-zinc-400">
            <span>{isEn ? 'Current Build:' : 'Versione in uso:'}</span>
            <span className="font-bold text-rose-400">
              v{state.clientVersionName} (build {state.clientVersionCode})
            </span>
          </div>
          <div className="flex items-center justify-between text-zinc-400">
            <span>{isEn ? 'Required Minimum:' : 'Minima supportata:'}</span>
            <span className="font-bold text-emerald-400">
              v{state.minSupportedVersion} (build {state.minSupportedVersionCode})
            </span>
          </div>
          {state.latestVersionCode > state.minSupportedVersionCode && (
            <div className="flex items-center justify-between text-zinc-500 text-[11px] pt-1 border-t border-zinc-900">
              <span>{isEn ? 'Latest Available:' : 'Ultima disponibile:'}</span>
              <span className="text-zinc-300">
                v{state.latestVersionName} (build {state.latestVersionCode})
              </span>
            </div>
          )}
        </div>

        {/* Downloading Progress Bar (Direct Flavor) */}
        {isDownloading && (
          <div className="space-y-2 bg-[#060A12] border border-emerald-500/30 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                {isEn ? 'Downloading update...' : 'Download aggiornamento...'}
              </span>
              <span className="text-zinc-300 font-mono">{state.progressPercent}%</span>
            </div>
            <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-800">
              <div 
                className="bg-emerald-500 h-full transition-all duration-200"
                style={{ width: `${Math.max(5, state.progressPercent)}%` }}
              />
            </div>
            {state.totalBytes > 0 && (
              <div className="text-[10px] text-zinc-500 text-right">
                {(state.bytesDownloaded / (1024 * 1024)).toFixed(1)} MB / {(state.totalBytes / (1024 * 1024)).toFixed(1)} MB
              </div>
            )}
          </div>
        )}

        {/* Downloaded Ready Notice */}
        {state.status === 'DOWNLOADED' && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {isEn 
                ? 'Package downloaded and SHA-256 verified. Click below to install and restart.' 
                : 'Pacchetto scaricato e verificato con successo. Clicca sotto per installare e riavviare.'}
            </span>
          </div>
        )}

        {/* Installing Notice */}
        {isInstalling && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 animate-pulse" />
            <span>{isEn ? 'Launching Android Package Installer...' : 'Avvio del Package Installer di Android...'}</span>
          </div>
        )}

        {/* Error Notification */}
        {state.errorMessage && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-xs text-rose-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold">{isEn ? 'Update Issue' : 'Errore Aggiornamento'}</div>
              <div className="text-[11px] leading-relaxed text-rose-300/90">{state.errorMessage}</div>
            </div>
          </div>
        )}

        {/* Primary Action Button */}
        <div className="space-y-3 pt-2">
          {state.flavor === 'play' ? (
            <button
              onClick={() => updateManager.executePrimaryUpdateAction()}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-slate-950 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <ExternalLink className="w-4 h-4" />
              <span>{isEn ? 'UPDATE ON GOOGLE PLAY' : 'AGGIORNA SU GOOGLE PLAY'}</span>
            </button>
          ) : state.status === 'DOWNLOADED' ? (
            <button
              onClick={() => updateManager.completeDirectUpdate()}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-slate-950 bg-emerald-400 hover:bg-emerald-300 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 animate-pulse cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-slate-950" />
              <span>{isEn ? 'INSTALL & RESTART APP' : 'INSTALLA & RIAVVIA APP'}</span>
            </button>
          ) : (
            <button
              onClick={() => updateManager.executePrimaryUpdateAction()}
              disabled={isDownloading || isInstalling}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-slate-950 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <Download className="w-4 h-4" />
              <span>
                {isDownloading 
                  ? (isEn ? 'DOWNLOADING...' : 'DOWNLOAD IN CORSO...') 
                  : state.status === 'ERROR'
                  ? (isEn ? 'RETRY DOWNLOAD' : 'RIPROVA DOWNLOAD')
                  : (isEn ? 'DOWNLOAD & INSTALL UPDATE' : 'SCARICA E INSTALLA (IN-APP)')}
              </span>
            </button>
          )}

          {/* Signature Warning Note */}
          <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-3 text-[10px] text-zinc-400 space-y-1">
            <div className="font-bold text-zinc-300 flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-amber-400" />
              <span>{isEn ? 'Cryptographic Signature Notice' : 'Firme Crittografiche di Canale'}</span>
            </div>
            <p className="leading-relaxed">
              {isEn 
                ? 'Direct APKs and Google Play builds use distinct signing certificates. Switching channels requires uninstalling and reinstalling. All your account progress, licenses, and ELO remain permanently saved on Pwnify cloud servers.'
                : 'I canali APK diretto e Google Play possiedono certificati di firma differenti. Il passaggio da un canale all\'altro richiede disinstallazione e reinstallazione manuale. Progressi, licenze ed ELO sono sincronizzati al sicuro nel cloud Pwnify.'}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
