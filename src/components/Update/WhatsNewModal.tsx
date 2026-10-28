import React from 'react';
import { Sparkles, Check, ArrowRight } from 'lucide-react';
import { updateManager, type UpdateManagerState } from '../../utils/updateManager.ts';
import { useLanguage } from '../../utils/language.ts';

interface WhatsNewModalProps {
  state: UpdateManagerState;
}

export const WhatsNewModal: React.FC<WhatsNewModalProps> = ({ state }) => {
  const { lang } = useLanguage();
  const isEn = lang === 'en';

  if (!state.showWhatsNew || !state.changelog) return null;

  const notes = state.changelog[lang] || state.changelog['en'] || [];
  if (notes.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#060A12]/85 backdrop-blur-md flex items-center justify-center p-4 font-mono animate-fade-in">
      <div className="w-full max-w-md bg-[#0C1322] border border-emerald-500/30 rounded-2xl p-6 shadow-2xl space-y-5">
        
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">
              {isEn ? "WHAT'S NEW" : "COSA C'È DI NUOVO"}
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Pwnify v{state.clientVersionName}
            </h2>
          </div>
        </div>

        <div className="bg-[#060A12] border border-zinc-800 rounded-xl p-4 space-y-2.5">
          {notes.map((note, index) => (
            <div key={index} className="flex items-start gap-2.5 text-xs text-zinc-300 font-sans leading-relaxed">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>{note}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => updateManager.dismissWhatsNew()}
          className="w-full py-3 px-4 rounded-xl font-bold text-xs text-slate-950 bg-emerald-500 hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10"
        >
          <span>{isEn ? 'CONTINUE TO OPERATING SYSTEM' : 'ACCEDI ALLA PIATTAFORMA'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>

      </div>
    </div>
  );
};
