import React, { useState, useEffect } from 'react';
import { X, Shield, FileText, RefreshCw, Cookie, Building, Mail } from 'lucide-react';
import { sound } from '../../utils/soundEngine';
import { useLanguage } from '../../utils/language';

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
  const { lang } = useLanguage();

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

  const isEn = lang === 'en';

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
                {isEn ? 'Legal Notice & Privacy Compliance' : 'Informativa Legale & Conformità Normativa'}
              </h2>
              <span className="text-[11px] font-mono text-slate-400">
                {isEn ? 'ZeroDay Academy · Legal, Privacy & Consumer Protection' : 'ZeroDay Academy · Note Legali, Privacy & Tutela Consumatori'}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playTap();
              onClose();
            }}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 cursor-pointer"
            aria-label={isEn ? 'Close legal modal' : 'Chiudi finestra note legali'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 pt-4 pb-3 overflow-x-auto text-xs font-mono border-b border-white/5">
          <button
            onClick={() => { sound.playTap(); setActiveTab('privacy'); }}
            className={`px-3 py-2 rounded-xl flex items-center gap-2 transition-all shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
              activeTab === 'privacy' 
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Privacy Policy</span>
          </button>

          <button
            onClick={() => { sound.playTap(); setActiveTab('terms'); }}
            className={`px-3 py-2 rounded-xl flex items-center gap-2 transition-all shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
              activeTab === 'terms' 
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{isEn ? 'Terms of Service' : 'Termini di Servizio'}</span>
          </button>

          <button
            onClick={() => { sound.playTap(); setActiveTab('refund'); }}
            className={`px-3 py-2 rounded-xl flex items-center gap-2 transition-all shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
              activeTab === 'refund' 
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{isEn ? 'Refund' : 'Rimborso'}</span>
          </button>

          <button
            onClick={() => { sound.playTap(); setActiveTab('cookies'); }}
            className={`px-3 py-2 rounded-xl flex items-center gap-2 transition-all shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
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
              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-white font-mono">
                  {isEn ? '1. Data Controller' : '1. Titolare del Trattamento'}
                </h3>
                <p>
                  {isEn 
                    ? 'The Data Controller is ZeroDay Cyber Academy S.r.l., registered office in Via Giovanni Spadolini 7, 20141 Milan (MI), Italy. For privacy requests or to contact our Data Protection Officer (DPO), please reach out to '
                    : 'Il Titolare del trattamento dei dati è ZeroDay Cyber Academy S.r.l., con sede legale in Via Giovanni Spadolini 7, 20141 Milano (MI), Italia. Per qualsiasi richiesta relativa alla privacy o per contattare il Responsabile della Protezione dei Dati (DPO), è possibile scrivere a '}
                  <a href="mailto:dpo@zeroday.academy" className="text-emerald-400 underline font-mono">dpo@zeroday.academy</a>.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-white font-mono">
                  {isEn ? '2. Collected Data and Purpose' : '2. Dati Raccolti e Finalità'}
                </h3>
                <p>
                  {isEn
                    ? 'We collect only the strictly necessary information required to deliver cybersecurity training:'
                    : 'Raccogliamo esclusivamente i dati strettamente necessari per erogare i servizi di formazione:'}
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-400">
                  <li>
                    <strong>{isEn ? 'Authentication Data:' : 'Dati di autenticazione:'}</strong>{' '}
                    {isEn 
                      ? 'Email address and user-selected Callsign for account management and two-factor authentication (2FA).'
                      : 'Indirizzo email e Callsign scelto dall\'utente per la gestione dell\'account e l\'autenticazione a due fattori (2FA).'}
                  </li>
                  <li>
                    <strong>{isEn ? 'Learning Progress Telemetry:' : 'Dati di progressione operativa:'}</strong>{' '}
                    {isEn
                      ? 'XP points, ELO score, PBQ lab completions, exam simulations, and Arena round history.'
                      : 'Punti XP, punteggio ELO, completamento laboratori PBQ, certificazioni simulate e cronologia round Arena.'}
                  </li>
                  <li>
                    <strong>{isEn ? 'Billing Data:' : 'Dati di fatturazione:'}</strong>{' '}
                    {isEn
                      ? 'Securely tokenized through PCI-DSS certified payment processors (Lemon Squeezy). No credit card numbers are stored on our servers.'
                      : 'Gestiti in modo tokenizzato e sicuro tramite gateway certificato PCI-DSS (Lemon Squeezy). Nessun estremo di carta di credito viene mai memorizzato sui nostri server.'}
                  </li>
                </ul>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-white font-mono">
                  {isEn ? '3. User Rights & Data Deletion' : '3. Diritti dell\'Utente e Cancellazione dei Dati'}
                </h3>
                <p>
                  {isEn
                    ? 'Users hold the right to access their personal data, request rectification, data portability, and permanent deletion of their account and all stored history directly from their user profile with a single click.'
                    : 'Gli utenti godono del diritto di accedere ai propri dati personali, chiederne la rettifica, la portabilità e la cancellazione definitiva del proprio account e di tutti i progressi direttamente dal menu profilo utente con 1 clic.'}
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-white font-mono">
                  {isEn ? '4. Age Verification & Minors' : '4. Consenso e Tutela dei Minori'}
                </h3>
                <p>
                  {isEn
                    ? 'The platform is intended for students and professionals aged 16 and older. Registration for users under the age of 16 requires parental or legal guardian consent.'
                    : 'La piattaforma è destinata a studenti e professionisti con età pari o superiore a 16 anni. L\'iscrizione per utenti con età inferiore richiede il consenso verificato di chi esercita la responsabilità genitoriale.'}
                </p>
              </section>
            </div>
          )}

          {/* TAB 2: TERMS OF SERVICE */}
          {activeTab === 'terms' && (
            <div className="space-y-4 animate-fade-in">
              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-white font-mono">
                  {isEn ? '1. Educational & Simulation Scope' : '1. Scopo Didattico & Simulativo'}
                </h3>
                <p>
                  {isEn
                    ? 'ZeroDay is an educational platform dedicated to cybersecurity certification training (CompTIA Security+, Cisco CCNA, CompTIA Network+, A+, and CEH). All PBQ labs, terminal challenges, and simulations operate inside virtualized sandboxes and defensive PoCs.'
                    : 'ZeroDay è una piattaforma didattica per la preparazione agli esami di certificazione (CompTIA Security+, Cisco CCNA, CompTIA Network+, A+ e CEH) e la simulazione etica. Tutti i laboratori PBQ e le sfide si svolgono in ambienti sandbox virtualizzati o tramite PoC difensivi.'}
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-white font-mono">
                  {isEn ? '2. Acceptable Use Policy' : '2. Politica di Uso Accettabile'}
                </h3>
                <p>
                  {isEn
                    ? 'It is strictly forbidden to use educational scripts or commands learned on ZeroDay to execute unauthorized attacks, hostile port scans, or denial-of-service operations against third-party systems without written authorization.'
                    : 'È severamente vietato utilizzare le nozioni e gli script didattici appresi sulla piattaforma per compiere intrusioni non autorizzate, scansioni ostili o attacchi contro infrastrutture terze sprovviste di espresso consenso scritto.'}
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-white font-mono">
                  {isEn ? '3. Account & Cryptographic Licenses' : '3. Account & Licenze Crittografiche'}
                </h3>
                <p>
                  {isEn
                    ? 'Each ZeroDay PRO license key (e.g. 0xPRO-...) is strictly personal and non-transferable without prior authorization.'
                    : 'Ogni account e licenza crittografica ZeroDay PRO (formato 0xPRO-...) è strettamente personale e non trasferibile a terzi senza previa autorizzazione scritta.'}
                </p>
              </section>
            </div>
          )}

          {/* TAB 3: REFUND POLICY */}
          {activeTab === 'refund' && (
            <div className="space-y-4 animate-fade-in">
              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-white font-mono">
                  {isEn ? '1. 14-Day Cooling-Off Period' : '1. Diritto di Recesso di 14 Giorni'}
                </h3>
                <p>
                  {isEn
                    ? 'In accordance with consumer protection standards, you have the right to request a full refund for any PRO pass or subscription within 14 calendar days from the purchase date without providing any justification.'
                    : 'In conformità alle normative sui diritti dei consumatori, hai il diritto di richiedere il rimborso completo dell\'acquisto di un abbonamento PRO o pass entro 14 giorni di calendario dalla data di transazione senza dover fornire alcuna motivazione.'}
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-white font-mono">
                  {isEn ? '2. How to Request a Refund' : '2. Modalità di Esercizio del Rimborso'}
                </h3>
                <p>
                  {isEn
                    ? 'To request a refund, simply send an email to '
                    : 'Per esercitare il diritto di rimborso, è sufficiente inviare un\'email a '}
                  <a href="mailto:support@zeroday.academy" className="text-emerald-400 underline font-mono">support@zeroday.academy</a>{' '}
                  {isEn
                    ? 'specifying your Callsign, account email, and license key. The full refund will be processed back to your original payment method within 3 to 5 business days.'
                    : 'indicando il Callsign, l\'indirizzo email dell\'account e il codice di licenza. Il rimborso integrale dell\'importo versato verrà accreditato sullo stesso metodo di pagamento utilizzato entro 3-5 giorni lavorativi.'}
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-white font-mono">
                  {isEn ? '3. Pricing Transparency (No Hidden Fees)' : '3. Trasparenza sui Prezzi (Nessun Costo Nascosto)'}
                </h3>
                <p>
                  {isEn
                    ? 'All prices displayed on ZeroDay are all-inclusive with applicable taxes. There are no hidden activation, onboarding, or administrative fees.'
                    : 'Tutti i prezzi visualizzati su ZeroDay sono comprensivi delle imposte applicabili. Non vi sono commissioni nascoste di attivazione, disattivazione o gestione.'}
                </p>
              </section>
            </div>
          )}

          {/* TAB 4: COOKIE POLICY */}
          {activeTab === 'cookies' && (
            <div className="space-y-4 animate-fade-in">
              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-white font-mono">
                  {isEn ? '1. Types of Cookies Used' : '1. Tipologie di Cookie Utilizzati'}
                </h3>
                <p>
                  {isEn
                    ? 'ZeroDay enforces a strict privacy policy with zero intrusive ad trackers. We utilize only:'
                    : 'ZeroDay adotta una politica rigorosa priva di tracciatori invasivi. Utilizziamo esclusivamente:'}
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-400">
                  <li>
                    <strong>{isEn ? 'Essential Technical Cookies:' : 'Cookie Tecnici & di Sessione (Strettamente Necessari):'}</strong>{' '}
                    {isEn
                      ? 'Necessary for operator authentication, session maintenance, and local learning progress persistence.'
                      : 'Indispensabili per consentire l\'autenticazione, la conservazione della sessione attiva e il salvataggio dei progressi didattici in locale.'}
                  </li>
                  <li>
                    <strong>{isEn ? 'Preference Cookies:' : 'Cookie di Preferenza:'}</strong>{' '}
                    {isEn
                      ? 'Store customization settings (terminal HUD theme, synthesizer audio volume, chosen language).'
                      : 'Memorizzano le tue scelte di personalizzazione (tema grafico HUD, volume audio sintetizzatore, lingua preferita).'}
                  </li>
                  <li>
                    <strong>{isEn ? 'Zero Third-Party Advertising Pixels:' : 'Nessun Cookie Pubblicitario di Terze Parti:'}</strong>{' '}
                    {isEn
                      ? 'We do not sell personal data to data brokers nor embed third-party ad retargeting pixels.'
                      : 'Non cediamo i tuoi dati a broker pubblicitari né impieghiamo tracker invasivi.'}
                  </li>
                </ul>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-white font-mono">
                  {isEn ? '2. Consent Management' : '2. Gestione del Consenso'}
                </h3>
                <p>
                  {isEn
                    ? 'You can adjust or revoke your cookie choices at any time via the cookie banner or by clicking "Cookie Preferences" in the application settings.'
                    : 'Puoi modificare o revocare il tuo consenso in qualsiasi momento tramite il banner cookie o cliccando su "Cookie" nel piè di pagina dell\'applicazione.'}
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
