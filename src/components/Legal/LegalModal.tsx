import React, { useState, useEffect } from 'react';
import { X, Shield, FileText, RefreshCw, Cookie, Building, Mail, CheckCircle2 } from 'lucide-react';
import { sound } from '../../utils/soundEngine';

export type LegalTabType = 'privacy' | 'terms' | 'refund' | 'cookies';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: LegalTabType;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'privacy'
}) => {
  const [activeTab, setActiveTab] = useState<LegalTabType>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
    >
      <div className="relative w-full max-w-3xl my-auto rounded-3xl p-5 sm:p-7 shadow-2xl bg-[#101726] border border-white/10 text-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Header & Close */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 id="legal-modal-title" className="text-base sm:text-lg font-bold text-white">
                Informativa Legale & Conformità Normativa
              </h2>
              <span className="text-[11px] font-mono text-slate-400">
                ZeroDay Academy · GDPR & Direttiva UE 2011/83
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playTap();
              onClose();
            }}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            aria-label="Chiudi finestra note legali"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 pt-4 pb-3 overflow-x-auto text-xs font-mono border-b border-white/5">
          <button
            onClick={() => { sound.playTap(); setActiveTab('privacy'); }}
            className={`px-3 py-2 rounded-xl flex items-center gap-2 transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
              activeTab === 'privacy' 
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Privacy Policy (GDPR)</span>
          </button>

          <button
            onClick={() => { sound.playTap(); setActiveTab('terms'); }}
            className={`px-3 py-2 rounded-xl flex items-center gap-2 transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
              activeTab === 'terms' 
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Termini di Servizio</span>
          </button>

          <button
            onClick={() => { sound.playTap(); setActiveTab('refund'); }}
            className={`px-3 py-2 rounded-xl flex items-center gap-2 transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
              activeTab === 'refund' 
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Diritto di Recesso & Rimborsi</span>
          </button>

          <button
            onClick={() => { sound.playTap(); setActiveTab('cookies'); }}
            className={`px-3 py-2 rounded-xl flex items-center gap-2 transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
              activeTab === 'cookies' 
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Cookie className="w-3.5 h-3.5" />
            <span>Cookie Policy</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="py-4 overflow-y-auto space-y-4 text-xs text-slate-300 leading-relaxed pr-2 font-sans">
          
          {/* TAB 1: PRIVACY POLICY */}
          {activeTab === 'privacy' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-emerald-200">
                  Questa applicazione rispetta rigorosamente il Regolamento Generale sulla Protezione dei Dati (GDPR - Regolamento UE 2016/679) e applica il principio di <strong>minimizzazione dei dati</strong> (Art. 5 GDPR).
                </p>
              </div>

              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-white font-mono">1. Titolare del Trattamento</h3>
                <p>
                  Il Titolare del trattamento dei dati è <strong>ZeroDay Cyber Academy S.r.l.</strong>, con sede legale in Via Giovanni Spadolini 7, 20141 Milano (MI), Italia. Per qualsiasi richiesta relativa alla privacy o per contattare il Responsabile della Protezione dei Dati (DPO), è possibile scrivere a <a href="mailto:dpo@zeroday.academy" className="text-emerald-400 underline font-mono">dpo@zeroday.academy</a>.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-white font-mono">2. Dati Raccolti e Finalità</h3>
                <p>
                  Raccogliamo esclusivamente i dati strettamente necessari per erogare i servizi di formazione:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-400">
                  <li><strong>Dati di autenticazione:</strong> Indirizzo email e Callsign scelto dall'utente per la gestione dell'account e l'autenticazione a due fattori (2FA).</li>
                  <li><strong>Dati di progressione operativa:</strong> Punti XP, punteggio ELO, completamento laboratori PBQ, certificazioni simulate e cronologia round Arena.</li>
                  <li><strong>Dati di fatturazione:</strong> Gestiti in modo tokenizzato e sicuro tramite gateway certificato PCI-DSS (Stripe). Nessun estremo di carta di credito viene mai memorizzato sui nostri server.</li>
                </ul>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-white font-mono">3. Diritti dell'Interessato (Artt. 15-22 GDPR)</h3>
                <p>
                  Gli utenti godono del diritto di accedere ai propri dati personali, chiederne la rettifica, la portabilità, la limitazione del trattamento e la <strong>cancellazione definitiva (Diritto all'Oblio - Art. 17 GDPR)</strong>. La cancellazione dell'account e di tutti i dati memorizzati può essere eseguita direttamente dal menu profilo utente con 1 clic.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-white font-mono">4. Tutela dei Minori (Art. 8 GDPR)</h3>
                <p>
                  La piattaforma è destinata a studenti e professionisti con età pari o superiore a 16 anni. L'iscrizione per utenti di età compresa tra 14 e 16 anni richiede il consenso verificato di chi esercita la responsabilità genitoriale.
                </p>
              </section>
            </div>
          )}

          {/* TAB 2: TERMINI DI SERVIZIO */}
          {activeTab === 'terms' && (
            <div className="space-y-4 animate-fade-in">
              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-white font-mono">1. Scopo Didattico & Simulativo</h3>
                <p>
                  ZeroDay è una piattaforma didattica per la preparazione agli esami di certificazione (CompTIA Security+, Cisco CCNA, EC-Council CEH) e la simulazione etica di incidenti informatici. Tutti i laboratori PBQ e le sfide si svolgono in ambienti sandbox virtualizzati o tramite PoC difensivi conformi ai programmi ufficiali di certificazione.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-white font-mono">2. Politica di Uso Accettabile (AUP)</h3>
                <p>
                  È severamente vietato utilizzare le nozioni e gli script didattici appresi sulla piattaforma per compiere intrusioni non autorizzate, scansioni ostili o attacchi denial-of-service contro infrastrutture terze sprovviste di espresso consenso scritto. La violazione comporterà la cessazione immediata dell'account.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-white font-mono">3. Account & Licenze</h3>
                <p>
                  Ogni account e licenza crittografica ZeroDay PRO (formato 0xPRO-...) è strettamente personale e non trasferibile a terzi senza previa autorizzazione scritta.
                </p>
              </section>
            </div>
          )}

          {/* TAB 3: DIRITTO DI RECESSO & RIMBORSI */}
          {activeTab === 'refund' && (
            <div className="space-y-4 animate-fade-in">
              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-white font-mono">1. Diritto di Recesso di 14 Giorni</h3>
                <p>
                  In conformità alla Direttiva Europea sui Diritti dei Consumatori (Direttiva 2011/83/UE e Codice del Consumo D.Lgs. 206/2005), hai il diritto di recedere dall'acquisto di un abbonamento PRO o starter pass entro <strong>14 giorni di calendario</strong> dalla data di transazione senza dover fornire alcuna motivazione.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-white font-mono">2. Modalità di Esercizio e Rimborso</h3>
                <p>
                  Per esercitare il diritto di recesso, è sufficiente inviare un'email a <a href="mailto:support@zeroday.academy" className="text-emerald-400 underline font-mono">support@zeroday.academy</a> indicando il Callsign, l'indirizzo email dell'account e il codice di licenza. Il rimborso integrale dell'importo versato verrà accreditato sullo stesso metodo di pagamento utilizzato entro 5 giorni lavorativi.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-white font-mono">3. Trasparenza sui Prezzi (Nessun Costo Nascosto)</h3>
                <p>
                  Tutti i prezzi visualizzati su ZeroDay (es. €5.75/mese con fatturazione annuale a €69.00/anno, o €14.99/mese) sono <strong>comprensivi di IVA e imposte vigenti</strong>. Non vi sono commissioni nascoste di attivazione, disattivazione o gestione.
                </p>
              </section>
            </div>
          )}

          {/* TAB 4: COOKIE POLICY */}
          {activeTab === 'cookies' && (
            <div className="space-y-4 animate-fade-in">
              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-white font-mono">1. Tipologie di Cookie Utilizzati</h3>
                <p>
                  ZeroDay adotta una politica rigorosa priva di tracciatori invasivi. Utilizziamo esclusivamente:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-400">
                  <li><strong>Cookie Tecnici & di Sessione (Strettamente Necessari):</strong> Indispensabili per consentire l'autenticazione, la conservazione della sessione attiva e il salvataggio dei progressi didattici in locale.</li>
                  <li><strong>Cookie di Preferenza:</strong> Memorizzano le tue scelte di personalizzazione (tema grafico HUD, volume del sintetizzatore audio Web Audio API, lingua preferita).</li>
                  <li><strong>Nessun Cookie di Profilazione Pubblicitaria di Terze Parti:</strong> Non cediamo i tuoi dati a broker pubblicitari né impieghiamo tracker invasivi (Google Tag Manager, Facebook Pixel o simili).</li>
                </ul>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-white font-mono">2. Gestione del Consenso</h3>
                <p>
                  Puoi modificare o revocare il tuo consenso in qualsiasi momento tramite il banner cookie o cliccando su "Impostazioni Cookie" nel piè di pagina dell'applicazione.
                </p>
              </section>
            </div>
          )}
        </div>

        {/* Footer with Business Details */}
        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <Building className="w-3.5 h-3.5 text-slate-400" />
            <span>ZeroDay Cyber Academy S.r.l. · P.IVA: IT01234567890</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            <a href="mailto:legal@zeroday.academy" className="text-emerald-400 hover:underline">
              legal@zeroday.academy
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};
