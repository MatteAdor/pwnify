# Pwnify Production Merge & Release Checklist

Questo documento stabilisce l'ordine operativo rigoroso per il completamento del ciclo di rilascio di **PR #5** (Retention Engine B0, Pwnify Rebranding, Hardening & Security Guardrails).

---

## Sequenza Operativa di Rilascio

```
[1. Deploy Funzioni] ──> [2. Vault Daily Flash] ──> [3. Review Giacomo] ──> [4. Merge PR #5] ──> [5. Release & Tag] ──> [6. SQL Remote Config] ──> [7. Test Telefono]
```

---

### Passo 1: Pubblicazione Edge Functions Supabase
- **Azione**:
  Eseguire il deploy delle due funzioni approvate (`get_turn_credentials` e `validate_license`) tramite il workflow `deploy-prod.yml` (`deploy_functions=true`, `confirm_prod_deploy="DEPLOY-PRODUCTION"`) oppure via Supabase CLI autorizzata:
  ```bash
  supabase functions deploy get_turn_credentials --project-ref $SUPABASE_PROD_PROJECT_ID
  supabase functions deploy validate_license --project-ref $SUPABASE_PROD_PROJECT_ID
  ```
  *(Nota: `lemonsqueezy_webhook` NON deve essere pubblicata con JWT attivo).*
- **Cosa verificare**:
  1. **Preflight CORS**: Richiesta `OPTIONS` con `Origin: https://pwnify.xyz` risponde `200 OK` con header `Access-Control-Allow-Origin: https://pwnify.xyz`.
  2. **Origini non ammesse**: Richiesta con `Origin: https://evil.example` o `https://zeroday.gg` risponde `403 Forbidden`.
  3. **Verifica JWT**: Richiesta `POST` senza token Bearer restituisce `401 Unauthorized` (la verifica JWT è attiva e non bypassata).

---

### Passo 2: Inizializzazione Segreto Daily Flash nel Vault
- **Azione**:
  Creare il secret `daily_flash_seed` all'interno di `vault.secrets` generando l'entropia direttamente sul database, senza far transitare la chiave nel client o nei log:
  ```sql
  SELECT vault.create_secret(
      encode(gen_random_bytes(32), 'hex'),
      'daily_flash_seed',
      'Daily Flash RFC HMAC-SHA256 deterministic seed'
  );
  ```
- **Cosa verificare**:
  1. **Controllo esistenza (sola lettura)**:
     ```sql
     SELECT id, name, description, created_at 
     FROM vault.secrets 
     WHERE name = 'daily_flash_seed';
     ```
     Verificare che restituisca esattamente 1 riga (senza stampare `decrypted_secret`).
  2. **Comportamento fail-open**: Se il secret non è configurato o la chiamata al Vault fallisce, la funzione `claim_daily_flash_draw` effettua il fallback trasparente al Daily base (+150 XP) senza generare errori o bloccare l'utente.

---

### Passo 3: Revisione Finale e Approvazione di Giacomo
- **Azione**:
  Richiedere la revisione formale della PR #5 a Giacomo (@giacomo).
- **Cosa verificare**:
  1. **CI Checks**: Tutti i controlli su GitHub Actions e Vercel devono essere verdi.
  2. **Perimetro Git**: Nessun file estraneo presente nel diff (72 file totali, escluse cartelle `scratch/`, `openui-agent/` e `wip/`).
  3. **Security Audit**: Gitleaks pulito, rimozione del fallback hardcoded di download APK, permessi Android minimi.

---

### Passo 4: Merge di PR #5 su `main`
- **Azione**:
  Eseguire il merge della PR #5 su `main` (tramite interfaccia GitHub con opzione *Rebase and merge* o *Squash and merge*, oppure tramite CLI):
  ```bash
  gh pr merge 5 --merge
  ```
- **Cosa verificare**:
  1. Il workflow CI su `main` viene completato senza errori.
  2. Vercel effettua il deploy automatico in produzione sui domini `https://pwnify.xyz` e `https://zeroday-app.vercel.app`.
  3. Navigazione web: apertura della landing page Midnight Cathedral, verifica dei metatag Open Graph Pwnify, e verifica assenza del modale di update forzato nativo sulla piattaforma web.

---

### Passo 5: Pubblicazione Release e Creazione Tag Git
- **Azione**:
  Promuovere la bozza release `v1.2.7` da DRAFT a PUBLISHED associando il tag `v1.2.7`:
  ```bash
  gh release edit v1.2.7 --draft=false
  ```
- **Cosa verificare**:
  1. Il tag `v1.2.7` compare nei tag ufficiali del repository `MatteAdor/pwnify`.
  2. L'asset `pwnify-1.2.7.apk` è scaricabile dall'URL pubblico:
     `https://github.com/MatteAdor/pwnify/releases/download/v1.2.7/pwnify-1.2.7.apk`
  3. L'hash del binario scaricato corrisponde esattamente al valore auditato:
     `24b945a864570e1b6fc34f0634aa5bc20955708358e0e5fe872566d379ecf7f3`

---

### Passo 6: Applicazione Configurazione Remota (`app_versions_update.sql`)
- **Azione**:
  Eseguire lo script `scratch/app_versions_update.sql` nell'editor SQL della dashboard Supabase di produzione:
  ```sql
  UPDATE public.app_versions
  SET 
      store_url = 'https://pwnify.xyz/#download',
      latest_version = '1.2.7',
      latest_version_code = 7,
      apk_download_url = 'https://github.com/MatteAdor/pwnify/releases/download/v1.2.7/pwnify-1.2.7.apk',
      apk_sha256 = '24b945a864570e1b6fc34f0634aa5bc20955708358e0e5fe872566d379ecf7f3',
      apk_hashes = jsonb_set(
          COALESCE(apk_hashes, '{}'::jsonb),
          '{7}',
          '"24b945a864570e1b6fc34f0634aa5bc20955708358e0e5fe872566d379ecf7f3"'
      ),
      force_message = '{"it": "Aggiornamento di sicurezza critico richiesto per accedere a Pwnify.", "en": "Critical security and protocol update required to access Pwnify."}'::jsonb,
      updated_at = pg_catalog.now()
  WHERE platform = 'android';
  ```
- **Cosa verificare**:
  1. La riga `android` della tabella `public.app_versions` riporta i nuovi parametri di release.
  2. `min_supported_version_code` rimane non toccato per non causare lock-out prematuri ai client correnti prima dell'aggiornamento.

---

### Passo 7: Verifica Funzionale su Telefono Fisico (Release Smoke Test)
- **Azione**:
  Scaricare e installare `pwnify-1.2.7.apk` su un dispositivo Android reale.
- **Cosa verificare**:
  1. **Identità e Firma**: L'icona dell'app riflette il nuovo logo Pwnify, il nome visualizzato è "Pwnify", e l'aggiornamento si installa sopra le release precedenti firmate con la stessa chiave `CN=matteo adorni`.
  2. **Avvio & Rete**: Connessione a Supabase corretta, sessione utente preservata, navigazione tra i tab attiva.
  3. **Direct Update**: L'aggiornamento in-app riconosce l'URL `https://github.com/MatteAdor/pwnify/...` come consentito e non solleva eccezioni di sicurezza sull'allowlist.
  4. **Duelli & Realtime**: Accesso alla modalità Arena PvP / Ranked con connessione WebRTC stabilita o fallback su Supabase Realtime senza crash.
