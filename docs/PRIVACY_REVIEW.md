# Pwnify — Scheda Tecnica di Revisione Privacy (Trattamento Dati)

> **Documento a uso interno e revisione legale professionale.**
> Questa scheda elenca in modo oggettivo e fattuale l'inventario dei dati personali e tecnici trattati dalla piattaforma Pwnify (applicazione web e Android nativa via Capacitor), per consentire la redazione e l'audit di conformità GDPR/ePrivacy da parte di un professionista legale.

---

## 1. Titolare del Trattamento e Canali di Contatto
- **Titolare dichiarato:** Pwnify Cyber Academy
- **Contatto primario per l'esercizio dei diritti (DPO / Privacy):** `privacy@pwnify.xyz`
- **Dominio web principale:** `pwnify.xyz` (con redirect da `www.pwnify.xyz`)
- **Package Android:** `com.pwnify.app` (versionCode 7, versionName 1.2.7)

---

## 2. Tipologie di Dati Trattati e Finalità Tecniche

### 2.1 Autenticazione e Gestione Profilo Operatore
| Dato | Origine | Finalità | Luogo di Conservazione |
|---|---|---|---|
| **Indirizzo Email** | Google OAuth, GitHub OAuth, o input utente | Identificatore univoco account, recupero accesso, sincronizzazione multi-device | Supabase `auth.users` e database account |
| **Callsign / Username** | Input utente o profilo OAuth | Identificativo visibile in classifica, duelli e attestati | Supabase `profiles` e `localStorage` |
| **User ID univoco (`id`)** | Generato da sistema / Supabase UUID | Chiave primaria relazionale e associazione licenze PRO | Supabase e `localStorage` |
| **Token di Sessione JWT** | Supabase Auth | Validazione delle chiamate API e Edge Functions | `localStorage` / memory client |

### 2.2 Telemetria Formativa e Gamification (Skill Tree & Arena)
| Dato | Descrizione | Visibilità |
|---|---|---|
| **Punti XP e Livello** | Punteggio cumulativo delle lezioni e triage completati | Pubblico in classifica se opt-in attivo |
| **Punteggio ELO e Match History** | Calcolo rating competitivo (Arena 1v1) e log vittorie/sconfitte | Pubblico in classifica e profilo duello |
| **Streak Giornaliero e Freeze** | Contatore giorni consecutivi di addestramento | Privato / Profilo utente |
| **Completamento Nodi e PBQ** | ID dei moduli di certificazione risolti (CompTIA, CCNA) | Privato / Calcolo Readiness Score radar |
| **Radar Scores (6 vettori)** | Punteggi percentuali di competenza per dominio | Profilo e scheda telemetrica |

---

## 3. Checkout e Gestione Pagamenti (Merchant of Record)

Pwnify **non elabora né memorizza** numeri di carta di credito, scadenze, codici CVV o IBAN.
- **Fornitore incaricato:** **Lemon Squeezy LLC** (opera come *Merchant of Record* indipendente).
- **Parametri passati nell'URL di checkout:**
  - `checkout[email]`: email dell'operatore connesso
  - `checkout[custom][user_id]`: ID univoco dell'account utente
  - `checkout[custom][username]`: Callsign dell'operatore
- **Ricezione e attivazione licenza:**
  - Webhook HTTPS firmato crittograficamente con HMAC-SHA256 (`/functions/v1/lemonsqueezy_webhook`).
  - L'Edge Function verifica la firma dell'evento e aggiorna lo stato licenza (`isPro: true`, `licenseKey`) sul database associato a `user_id`.

---

## 4. Partite 1v1 Cyber Arena (WebRTC) ed Esposizione Indirizzo IP

Le partite multigiocatore 1v1 utilizzano lo stack WebRTC (libreria PeerJS):
- **Architettura di connessione:** Peer-to-peer diretta tramite `RTCDataChannel`.
- **Impatto privacy su indirizzo IP:** Nello stabilire la connessione diretta P2P tra due browser/dispositivi, i candidati ICE scambiati contengono gli **indirizzi IP pubblici** dei due contendenti. L'indirizzo IP di ciascun operatore è pertanto direttamente rilevabile dall'avversario tramite strumenti di analisi traffico (es. Wireshark, browser developer tools), fatto connaturato al protocollo WebRTC standard.
- **Relay di riserva:** Qualora NAT simmetrici o firewall blocchino la connessione diretta, il traffico dati viene instradato attraverso server TURN forniti da Metered Video, dove l'IP di destinazione visto dal peer è quello del relay.

---

## 5. Elenco Fornitori Terzi e Sub-responsabili Tecnici

1. **Supabase Inc. (USA / UE):**
   - Servizi: Database PostgreSQL, Autenticazione OAuth e Edge Functions Deno.
   - Dati: Email, profili, tabelle di progressione, token JWT.
2. **Vercel Inc. (USA / Globale):**
   - Servizi: Hosting statico frontend, serverless rendering, Edge CDN.
   - Dati: Log di richiesta HTTP, indirizzo IP client, User-Agent.
3. **Lemon Squeezy LLC (USA):**
   - Servizi: Merchant of Record, elaborazione checkout, gestione imposte e ricevute.
   - Dati: Email, user_id, callsign, dettagli di fatturazione del cliente.
4. **Metered Video (Giappone / Globale):**
   - Servizi: Fornitura credenziali TURN temporanee e relay dati WebRTC.
   - Dati: Indirizzo IP client durante le sessioni duello con relay.
5. **Google LLC (USA / Globale):**
   - Servizi: STUN pubblico (`stun:stun.l.google.com:19302`) per risoluzione NAT e Google OAuth per accesso operatore.
   - Dati: Indirizzo IP client (STUN) e scope profilo/email (OAuth).
6. **PeerJS Cloud (`0.peerjs.com`):**
   - Servizi: Server di segnalazione WebRTC pubblico per handshake iniziale.
   - Dati: Peer ID temporaneo, indirizzo IP client durante la negoziazione.

---

## 6. Cookie e Archiviazione Locale (Client Storage)

La piattaforma adotta una politica a tracciamento zero per fini pubblicitari:
- **Nessun cookie di terze parti a scopo di profilazione o retargeting.**
- **Cookie / LocalStorage Essenziali di Funzionamento:**
  - `zeroday_database_session_v1`: sessione utente attiva e token crittografico
  - `zeroday_cookie_consent_v1`: stato del consenso cookie
  - `sb-<ref>-auth-token`: token di autenticazione gestito da Supabase JS SDK
- **Banner di Consenso (ePrivacy/GDPR):**
  - Implementato con opt-in esplicito preventivo per analitiche facoltative e gestione preferenze in ogni momento.
