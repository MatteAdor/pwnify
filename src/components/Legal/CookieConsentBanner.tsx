import React, { useState, useEffect } from 'react';
import { Cookie, Check, ShieldCheck, Settings2, X } from 'lucide-react';
import { sound } from '../../utils/soundEngine';
import { useLanguage } from '../../utils/language';

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
  const { t } = useLanguage();
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
      aria-label={t.cookieBannerTitle || "Cookie Consent Management"}
    >
      <div className="max-w-3xl mx-auto rounded-2xl p-4 sm:p-5 shadow-2xl bg-[#05060f]/95 border border-[rgba(186,215,247,0.16)] sm:backdrop-blur-xl text-[#e6eefb] pointer-events-auto space-y-3">
        
        {/* Main Banner Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[rgba(102,58,243,0.15)] border border-[rgba(102,58,243,0.35)] flex items-center justify-center text-[#b6d9fc] shrink-0 mt-0.5">
              <Cookie className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>{t.cookieBannerTitle}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[rgba(102,58,243,0.22)] text-[#d1e4fa] border border-[rgba(102,58,243,0.35)] font-semibold">
                  {t.cookieZeroProfiling}
                </span>
              </h3>
              <p className="text-xs text-[#c7d3ea] mt-1 leading-relaxed">
                {t.cookieBannerDesc}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
            <button
              onClick={handleAcceptAll}
              className="flex-1 sm:flex-none py-2 px-3.5 rounded-xl font-mono font-bold text-xs text-white bg-[#663af3] hover:bg-[#7b53f7] transition-all flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#98c0ef] cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{t.cookieAcceptAll}</span>
            </button>

            <button
              onClick={handleAcceptNecessary}
              className="flex-1 sm:flex-none py-2 px-3.5 rounded-xl font-mono font-bold text-xs text-[#d1e4fa] bg-[rgba(186,215,247,0.06)] border border-[rgba(186,215,247,0.12)] hover:border-[rgba(186,215,247,0.28)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#98c0ef] cursor-pointer"
            >
              {t.cookieNecessaryOnly}
            </button>

            <button
              onClick={() => {
                sound.playTap();
                setIsCustomizeOpen(!isCustomizeOpen);
              }}
              className="p-2 rounded-xl text-[#9da7ba] hover:text-white bg-[rgba(186,215,247,0.06)] border border-[rgba(186,215,247,0.12)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#98c0ef] cursor-pointer"
              aria-label={t.cookieCustomizeTitle}
              title={t.cookieCustomizeTitle}
            >
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Customization Drawer */}
        {isCustomizeOpen && (
          <div className="pt-3 border-t border-[rgba(186,215,247,0.12)] space-y-3 animate-fade-in text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              
              {/* Technical Cookies */}
              <div className="p-2.5 rounded-xl bg-[rgba(186,215,247,0.04)] border border-[rgba(186,215,247,0.08)] space-y-1">
                <div className="flex items-center justify-between font-mono font-bold text-[#d1e4fa]">
                  <span>{t.cookieTechnicalTitle}</span>
                  <span className="text-[10px] text-[#9da7ba]">{t.cookieTechnicalAlways}</span>
                </div>
                <p className="text-[11px] text-[#9da7ba] leading-normal">
                  {t.cookieTechnicalDesc}
                </p>
              </div>

              {/* Preference Cookies */}
              <div className="p-2.5 rounded-xl bg-[rgba(186,215,247,0.04)] border border-[rgba(186,215,247,0.08)] space-y-1">
                <div className="flex items-center justify-between font-mono font-bold text-[#d1e4fa]">
                  <span>{t.cookiePrefTitle}</span>
                  <input
                    type="checkbox"
                    checked={prefPreferences}
                    onChange={(e) => setPrefPreferences(e.target.checked)}
                    className="rounded border-[rgba(186,215,247,0.25)] text-[#663af3] focus:ring-[#663af3]"
                  />
                </div>
                <p className="text-[11px] text-[#9da7ba] leading-normal">
                  {t.cookiePrefDesc}
                </p>
              </div>

              {/* Analytics Cookies */}
              <div className="p-2.5 rounded-xl bg-[rgba(186,215,247,0.04)] border border-[rgba(186,215,247,0.08)] space-y-1">
                <div className="flex items-center justify-between font-mono font-bold text-[#d1e4fa]">
                  <span>{t.cookieAnalyticsTitle}</span>
                  <input
                    type="checkbox"
                    checked={prefAnalytics}
                    onChange={(e) => setPrefAnalytics(e.target.checked)}
                    className="rounded border-[rgba(186,215,247,0.25)] text-[#663af3] focus:ring-[#663af3]"
                  />
                </div>
                <p className="text-[11px] text-[#9da7ba] leading-normal">
                  {t.cookieAnalyticsDesc}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={onOpenCookiePolicy}
                className="text-[11px] text-[#b6d9fc] hover:underline font-mono cursor-pointer"
              >
                {t.cookieReadPolicy}
              </button>

              <button
                onClick={handleSaveCustom}
                className="py-1.5 px-3 rounded-lg bg-[rgba(102,58,243,0.22)] border border-[rgba(102,58,243,0.55)] text-[#d1e4fa] font-mono font-bold text-[11px] hover:bg-[rgba(102,58,243,0.32)] transition-colors cursor-pointer"
              >
                {t.cookieSaveCustom}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
