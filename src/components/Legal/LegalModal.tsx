import React, { useState, useEffect } from 'react';
import { X, Shield, FileText, RefreshCw, Cookie, User, Mail, ArrowLeft } from 'lucide-react';
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
      className="fixed inset-0 z-50 bg-[#090D16] flex flex-col w-full h-full overflow-y-auto animate-fade-in font-sans select-none text-zinc-100"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
    >
      <header className="sticky top-0 z-20 bg-[#090D16]/95 backdrop-blur-md border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              onClose();
            }}
            className="p-1.5 -ml-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 id="legal-modal-title" className="text-sm sm:text-base font-bold font-mono text-white">
              {isEn ? 'Legal Notice & Compliance' : 'Informativa Legale & Privacy'}
            </h2>
          </div>
        </div>

        <button
          onClick={() => {
            sound.playTap();
            onClose();
          }}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors cursor-pointer"
          aria-label={isEn ? 'Close legal modal' : 'Chiudi finestra note legali'}
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-4 flex flex-col pb-24 text-[#e6eefb]">

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 pt-4 pb-3 overflow-x-auto text-xs font-mono border-b border-[rgba(186,215,247,0.08)]">
          <button
            onClick={() => { sound.playTap(); setActiveTab('privacy'); }}
            className={`px-3 py-2 rounded-xl flex items-center gap-2 transition-all shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#98c0ef] ${
              activeTab === 'privacy' 
                ? 'bg-[rgba(102,58,243,0.22)] text-[#d1e4fa] border border-[rgba(102,58,243,0.55)] font-bold' 
                : 'text-[#9da7ba] hover:text-white hover:bg-[rgba(186,215,247,0.07)]'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Privacy Policy</span>
          </button>

          <button
            onClick={() => { sound.playTap(); setActiveTab('terms'); }}
            className={`px-3 py-2 rounded-xl flex items-center gap-2 transition-all shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#98c0ef] ${
              activeTab === 'terms' 
                ? 'bg-[rgba(102,58,243,0.22)] text-[#d1e4fa] border border-[rgba(102,58,243,0.55)] font-bold' 
                : 'text-[#9da7ba] hover:text-white hover:bg-[rgba(186,215,247,0.07)]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{isEn ? 'Terms of Service' : 'Termini di Servizio'}</span>
          </button>

          <button
            onClick={() => { sound.playTap(); setActiveTab('refund'); }}
            className={`px-3 py-2 rounded-xl flex items-center gap-2 transition-all shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#98c0ef] ${
              activeTab === 'refund' 
                ? 'bg-[rgba(102,58,243,0.22)] text-[#d1e4fa] border border-[rgba(102,58,243,0.55)] font-bold' 
                : 'text-[#9da7ba] hover:text-white hover:bg-[rgba(186,215,247,0.07)]'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{isEn ? 'Refund' : 'Rimborso'}</span>
          </button>

          <button
            onClick={() => { sound.playTap(); setActiveTab('cookies'); }}
            className={`px-3 py-2 rounded-xl flex items-center gap-2 transition-all shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#98c0ef] ${
              activeTab === 'cookies' 
                ? 'bg-[rgba(102,58,243,0.22)] text-[#d1e4fa] border border-[rgba(102,58,243,0.55)] font-bold' 
                : 'text-[#9da7ba] hover:text-white hover:bg-[rgba(186,215,247,0.07)]'
            }`}
          >
            <Cookie className="w-3.5 h-3.5" />
            <span>Cookie Policy</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="py-4 overflow-y-auto space-y-4 text-xs text-[#c7d3ea] leading-relaxed pr-2 font-sans">
          
          {/* TAB 1: PRIVACY POLICY */}
          {activeTab === 'privacy' && (
            <div className="space-y-4 animate-fade-in">
              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-white font-mono">
                  {isEn ? '1. Data Controller' : '1. Titolare del Trattamento'}
                </h3>
                <p>
                  {isEn 
                    ? 'The Data Controller is Matteo Adorni, natural person (persona fisica). For privacy and GDPR requests write to privacy@pwnify.xyz. For support, refunds and general enquiries write to support@pwnify.xyz.'
                    : 'Il Titolare del trattamento dei dati è Matteo Adorni, persona fisica. Per privacy e richieste GDPR scrivi a privacy@pwnify.xyz. Per assistenza, rimborsi e contatti generali scrivi a support@pwnify.xyz.'}
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
                <ul className="list-disc pl-5 space-y-1 text-[#9da7ba]">
                  <li>
                    <strong>{isEn ? 'Authentication Data:' : 'Dati di autenticazione:'}</strong>{' '}
                    {isEn 
                      ? 'Email address, provider account ID and profile name received via Google or GitHub sign-in (OAuth), plus the Callsign you choose. Guest sessions are stored only on your device.'
                      : 'Indirizzo email, ID account e nome profilo ricevuti tramite accesso con Google o GitHub (OAuth), oltre al Callsign scelto dall\'utente. Le sessioni ospite restano salvate solo sul dispositivo.'}
                  </li>
                  <li>
                    <strong>{isEn ? 'Learning Progress Telemetry:' : 'Dati di progressione operativa:'}</strong>{' '}
                    {isEn
                      ? 'XP points, ELO score, PBQ lab completions, exam simulations, and Arena round history.'
                      : 'Punti XP, punteggio ELO, completamento laboratori PBQ, certificazioni simulate e cronologia round Arena.'}
                  </li>
                  <li>
                    <strong>{isEn ? 'Checkout & Billing Data:' : 'Dati di Checkout & Fatturazione:'}</strong>{' '}
                    {isEn
                      ? 'When upgrading to PRO, your email and account ID are sent to Polar Software, Inc. (polar.sh), acting as Merchant of Record for payment processing, invoicing and taxes, to link the subscription to your account. Polar tells us the subscription status so PRO can be switched on or off. No card or banking details reach Pwnify servers.'
                      : 'Durante il passaggio a PRO, email e ID account vengono trasmessi a Polar Software, Inc. (polar.sh), che agisce come Merchant of Record per pagamenti, fatturazione e imposte, per collegare l\'abbonamento al tuo account. Polar ci comunica lo stato dell\'abbonamento per attivare o disattivare PRO. Nessun dato di carta o bancario arriva ai server di Pwnify.'}
                  </li>
                </ul>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-white font-mono">
                  {isEn ? '3. Peer-to-Peer Duels & IP Visibility' : '3. Duelli Peer-to-Peer & Visibilità Indirizzo IP'}
                </h3>
                <p>
                  {isEn
                    ? '1v1 matches in Cyber Arena use direct WebRTC peer connections for real-time low-latency gameplay. By nature of the peer-to-peer protocol, your public IP address is directly visible to your match opponent unless firewall or NAT conditions force traffic through a TURN relay.'
                    : 'Le partite 1v1 nella Cyber Arena utilizzano connessioni peer-to-peer dirette WebRTC per garantire bassa latenza. Per la natura del protocollo P2P, l\'indirizzo IP pubblico del tuo dispositivo è direttamente visibile all\'avversario durante il duello, salvo nei casi in cui restrizioni di rete impongano il passaggio da relay TURN.'}
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-white font-mono">
                  {isEn ? '4. Third-Party Infrastructure Providers' : '4. Fornitori Terzi e Infrastruttura'}
                </h3>
                <p>
                  {isEn
                    ? 'Pwnify relies on the following specialized technical service providers:'
                    : 'Pwnify si avvale dei seguenti fornitori tecnici di servizio:'}
                </p>
                <ul className="list-disc pl-5 space-y-1 text-[#9da7ba]">
                  <li><strong>Supabase Inc.:</strong> {isEn ? 'Cloud PostgreSQL database, token auth, and Edge Functions.' : 'Database cloud PostgreSQL, autenticazione e Edge Functions.'}</li>
                  <li><strong>Vercel Inc.:</strong> {isEn ? 'Web app hosting.' : 'Hosting dell\'applicazione web.'}</li>
                  <li><strong>Google LLC / GitHub Inc.:</strong> {isEn ? 'Sign-in via OAuth.' : 'Accesso tramite OAuth.'}</li>
                  <li><strong>Polar Software, Inc.:</strong> {isEn ? 'Merchant of Record for checkout, payments, invoicing, taxes and the PRO subscription.' : 'Merchant of Record per checkout, pagamenti, fatturazione, imposte e abbonamento PRO.'}</li>
                  <li><strong>Metered Video:</strong> {isEn ? 'TURN relay infrastructure credentials for WebRTC traversal.' : 'Infrastruttura relay TURN per instradamento WebRTC.'}</li>
                  <li><strong>Google LLC:</strong> {isEn ? 'Public STUN resolution (stun:stun.l.google.com:19302) for NAT traversal.' : 'Risoluzione STUN pubblica (stun:stun.l.google.com:19302) per NAT.'}</li>
                  <li><strong>PeerJS Cloud:</strong> {isEn ? 'Signaling cloud (0.peerjs.com) for WebRTC session handshake.' : 'Server cloud di segnalazione (0.peerjs.com) per handshake WebRTC.'}</li>
                </ul>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-white font-mono">
                  {isEn ? '5. User Rights & Data Deletion' : '5. Diritti dell\'Utente e Cancellazione dei Dati'}
                </h3>
                <p>
                  {isEn
                    ? 'Under the GDPR (arts. 15-22) you have the right to access your personal data and get a copy, to rectification, to erasure, to restriction of or objection to processing, and to data portability. To exercise any of these rights, email privacy@pwnify.xyz from the address linked to your account: we reply within 30 days. You may also lodge a complaint with the Italian Data Protection Authority (Garante per la protezione dei dati personali).'
                    : 'Ai sensi del GDPR (artt. 15-22) hai diritto di accedere ai tuoi dati personali e riceverne copia, di chiederne la rettifica, la cancellazione, la limitazione o di opporti al trattamento, e alla portabilità dei dati. Per esercitare questi diritti scrivi a privacy@pwnify.xyz dall\'indirizzo email associato all\'account: rispondiamo entro 30 giorni. Hai inoltre diritto di proporre reclamo al Garante per la protezione dei dati personali.'}
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-white font-mono">
                  {isEn ? '6. Age Verification & Minors' : '6. Consenso e Tutela dei Minori'}
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
                    ? 'Pwnify is an educational platform dedicated to cybersecurity certification training (CompTIA Security+, Cisco CCNA, CompTIA Network+, A+, and CEH). All PBQ labs, terminal challenges, and simulations operate inside virtualized sandboxes and defensive PoCs.'
                    : 'Pwnify è una piattaforma didattica per la preparazione agli esami di certificazione (CompTIA Security+, Cisco CCNA, CompTIA Network+, A+ e CEH) e la simulazione etica. Tutti i laboratori PBQ e le sfide si svolgono in ambienti sandbox virtualizzati o tramite PoC difensivi.'}
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-white font-mono">
                  {isEn ? '2. Acceptable Use Policy' : '2. Politica di Uso Accettabile'}
                </h3>
                <p>
                  {isEn
                    ? 'It is strictly forbidden to use educational scripts or commands learned on Pwnify to execute unauthorized attacks, hostile port scans, or denial-of-service operations against third-party systems without written authorization.'
                    : 'È severamente vietato utilizzare le nozioni e gli script didattici appresi sulla piattaforma per compiere intrusioni non autorizzate, scansioni ostili o attacchi contro infrastrutture terze sprovviste di espresso consenso scritto.'}
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-white font-mono">
                  {isEn ? '3. Account & PRO Subscription' : '3. Account & Abbonamento PRO'}
                </h3>
                <p>
                  {isEn
                    ? 'The Pwnify PRO subscription is tied to your account, is personal and non-transferable. You can manage or cancel it at any time from the Polar customer portal.'
                    : 'L\'abbonamento Pwnify PRO è legato al tuo account, è personale e non cedibile. Puoi gestirlo o annullarlo in qualsiasi momento dal portale clienti Polar.'}
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
                  <a href="mailto:support@pwnify.xyz" className="text-[#b6d9fc] underline font-mono">support@pwnify.xyz</a>{' '}
                  {isEn
                    ? 'from the email linked to your account. Refunds are issued by Polar, our Merchant of Record, to your original payment method.'
                    : 'dall\'indirizzo email associato al tuo account. Il rimborso viene emesso da Polar, nostro Merchant of Record, sullo stesso metodo di pagamento utilizzato.'}
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-white font-mono">
                  {isEn ? '3. Pricing Transparency (No Hidden Fees)' : '3. Trasparenza sui Prezzi (Nessun Costo Nascosto)'}
                </h3>
                <p>
                  {isEn
                    ? 'All prices displayed on Pwnify are all-inclusive with applicable taxes. There are no hidden activation, onboarding, or administrative fees.'
                    : 'Tutti i prezzi visualizzati su Pwnify sono comprensivi delle imposte applicabili. Non vi sono commissioni nascoste di attivazione, disattivazione o gestione.'}
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
                    ? 'Pwnify enforces a strict privacy policy with zero intrusive ad trackers. We utilize only:'
                    : 'Pwnify adotta una politica rigorosa priva di tracciatori invasivi. Utilizziamo esclusivamente:'}
                </p>
                <ul className="list-disc pl-5 space-y-1 text-[#9da7ba]">
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

        {/* Footer with Controller & Contacts */}
        <div className="pt-4 border-t border-[rgba(186,215,247,0.12)] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-mono text-[#9da7ba]">
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-[#9da7ba]" />
            <span>{isEn ? 'Matteo Adorni (natural person) · Last updated: 21 Nov 2026' : 'Matteo Adorni, persona fisica · Ultimo aggiornamento: 21/11/2026'}</span>
          </div>
          <div className="flex flex-col sm:items-end gap-1">
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-[#9da7ba]" />
              <a href="mailto:privacy@pwnify.xyz" className="text-[#b6d9fc] hover:underline">privacy@pwnify.xyz</a>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-[#9da7ba]" />
              <a href="mailto:support@pwnify.xyz" className="text-[#b6d9fc] hover:underline">support@pwnify.xyz</a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
