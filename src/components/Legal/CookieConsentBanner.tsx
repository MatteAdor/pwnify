import React, { useState, useEffect } from 'react';
import { Cookie, Check, ShieldCheck, Settings2, X } from 'lucide-react';
import { sound } from '../../utils/soundEngine';

const COOKIE_CONSENT_KEY = 'zeroday_cookie_consent_v1';

export interface CookiePreferences {
  necessary: boolean;
  preferences: boolean;
  analytics: boolean;
  consentedAt: string;
}

interface CookieConsentBannerProps {
  onOpenCookiePolicy: () => void;
  forceOpen?: boolean;
  onCloseForce?: () => void;
}

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({
  onOpenCookiePolicy,
  forceOpen = false,
  onCloseForce
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [prefAnalytics, setPrefAnalytics] = useState(false);
  const [prefPreferences, setPrefPreferences] = useState(true);

  useEffect(() => {
    if (forceOpen) {
      setIsVisible(true);
      return;
    }

    try {
      const saved = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (!saved) {
        setIsVisible(true);
      } else {
        const parsed: CookiePreferences = JSON.parse(saved);
        setPrefAnalytics(Boolean(parsed.analytics));
        setPrefPreferences(Boolean(parsed.preferences));
      }
    } catch {
      setIsVisible(true);
    }
  }, [forceOpen]);

  const saveConsent = (prefs: CookiePreferences) => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(prefs));
    } catch (e) {
      console.warn('Unable to persist cookie consent to localStorage', e);
    }
    sound.playTap();
    setIsVisible(false);
    setIsCustomizeOpen(false);
    if (onCloseForce) onCloseForce();
  };

  const handleAcceptAll = () => {
    saveConsent({
      necessary: true,
      preferences: true,
      analytics: true,
      consentedAt: new Date().toISOString()
    });
  };

  const handleAcceptNecessary = () => {
    saveConsent({
      necessary: true,
      preferences: false,
      analytics: false,
      consentedAt: new Date().toISOString()
    });
  };

  const handleSaveCustom = () => {
    saveConsent({
      necessary: true,
      preferences: prefPreferences,
      analytics: prefAnalytics,
      consentedAt: new Date().toISOString()
    });
  };

  if (!isVisible) return null;

  return (
    <div 
      className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-4 animate-fade-in pointer-events-none"
      role="region"
      aria-label="Gestione del consenso sui cookie"
    >
      <div className="max-w-3xl mx-auto rounded-3xl p-4 sm:p-5 shadow-2xl bg-[#0D1424]/95 border border-white/15 backdrop-blur-xl text-slate-100 pointer-events-auto space-y-3">
        
        {/* Main Banner Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
              <Cookie className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Informativa sui Cookie & Privacy</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                  Zero Profilazione
                </span>
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Utilizziamo cookie tecnici essenziali per consentire l'accesso sicuro e il salvataggio dei progressi didattici. Non utilizziamo tracker di terze parti a fini pubblicitari.
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
            <button
              onClick={handleAcceptAll}
              className="flex-1 sm:flex-none py-2 px-3.5 rounded-xl font-mono font-bold text-xs text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-all flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Accetta tutti</span>
            </button>

            <button
              onClick={handleAcceptNecessary}
              className="flex-1 sm:flex-none py-2 px-3.5 rounded-xl font-mono font-bold text-xs text-slate-200 bg-[#162138] border border-white/10 hover:border-white/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              Solo necessari
            </button>

            <button
              onClick={() => {
                sound.playTap();
                setIsCustomizeOpen(!isCustomizeOpen);
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-white bg-[#162138] border border-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              aria-label="Personalizza preferenze cookie"
              title="Personalizza preferenze cookie"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Customization Drawer */}
        {isCustomizeOpen && (
          <div className="pt-3 border-t border-white/10 space-y-3 animate-fade-in text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              
              {/* Technical Cookies */}
              <div className="p-2.5 rounded-xl bg-[#090D17] border border-white/5 space-y-1">
                <div className="flex items-center justify-between font-mono font-bold text-emerald-300">
                  <span>Tecnici (Necessari)</span>
                  <span className="text-[10px] text-slate-400">Sempre Attivi</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Indispensabili per login 2FA, sessione protetta e crittografia.
                </p>
              </div>

              {/* Preference Cookies */}
              <div className="p-2.5 rounded-xl bg-[#090D17] border border-white/5 space-y-1">
                <div className="flex items-center justify-between font-mono font-bold text-slate-200">
                  <span>Preferenze & HUD</span>
                  <input
                    type="checkbox"
                    checked={prefPreferences}
                    onChange={(e) => setPrefPreferences(e.target.checked)}
                    className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Salva temi del terminale, preferenze audio e layout.
                </p>
              </div>

              {/* Analytics Cookies */}
              <div className="p-2.5 rounded-xl bg-[#090D17] border border-white/5 space-y-1">
                <div className="flex items-center justify-between font-mono font-bold text-slate-200">
                  <span>Metriche Anonime</span>
                  <input
                    type="checkbox"
                    checked={prefAnalytics}
                    onChange={(e) => setPrefAnalytics(e.target.checked)}
                    className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Rilevamento anonimo di bug e tempi di risposta dei server.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={onOpenCookiePolicy}
                className="text-[11px] text-emerald-400 hover:underline font-mono"
              >
                Consulta l'Informativa Estesa Cookie →
              </button>

              <button
                onClick={handleSaveCustom}
                className="py-1.5 px-3 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono font-bold text-[11px] hover:bg-emerald-500/30 transition-colors"
              >
                Salva Preferenze Selezionate
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
