# Pwnify Production Merge & Release Checklist

Questo documento stabilisce l'ordine operativo rigoroso per il completamento del ciclo di rilascio di **PR #5** (Retention Engine B0, Pwnify Rebranding, Hardening & Security Guardrails).

---

## Sequenza Operativa di Rilascio

```
[1. Deploy Funzioni] ──> [2. Vault Daily Flash] ──> [3. Squash & Merge PR #5] ──> [4. Build APK da main] ──> [5. Tag & Release su main] ──> [6. Hash & SQL Remote Config] ──> [7. Prova Telefono]
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
  Creare il secret `daily_flash_secret` (nome esatto letto da `claim_daily_flash_draw`) all'interno di `vault.secrets` generando l'entropia direttamente sul database tramite `extensions.gen_random_bytes(32)`:
  ```sql
  SELECT vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'daily_flash_secret',
      'Daily Flash RFC HMAC-SHA256 deterministic seed'
  );
  ```
- **Cosa verificare**:
  1. **Controllo esistenza (sola lettura)**:
     ```sql
     SELECT id, name, description, created_at 
     FROM vault.secrets 
     WHERE name = 'daily_flash_secret';
     ```
     Verificare che restituisca esattamente 1 riga (senza stampare `decrypted_secret`).
  2. **Comportamento fail-open**: Se il secret non è configurato o la chiamata al Vault fallisce, la funzione `claim_daily_flash_draw` effettua il fallback trasparente al Daily base (+150 XP) senza generare errori o bloccare l'utente.

---

### Passo 3: Transizione PR #5 e Squash & Merge su `main`
- **Azione**:
  1. Segnare la PR #5 da Draft a **Ready for review**:
     ```bash
     gh pr ready 5
     ```
  2. Richiedere la revisione e approvazione a Giacomo (@giacomo).
  3. Effettuare il merge con **Squash and merge** su `main`:
     ```bash
     gh pr merge 5 --squash
     ```
- **Cosa verificare**:
  1. Il workflow CI su `main` viene completato con esito verde.
  2. Vercel effettua il deploy automatico di produzione sui domini `https://pwnify.xyz` e `https://zeroday-app.vercel.app`.
  3. Navigazione web: apertura della landing page Midnight Cathedral, verifica dei metatag Open Graph Pwnify, e verifica assenza del modale di update forzato nativo sulla piattaforma web.

---

### Passo 4: Ricostruzione APK da `main` in Worktree Pulito
- **Azione**:
  Dopo il merge, creare un worktree git pulito allineato a `origin/main` ed eseguire la build release dell'APK (versionCode 7, firmato con la keystore dell'operatore):
  ```bash
  git fetch origin
  git worktree add ../clean-pwnify-release origin/main
  cd ../clean-pwnify-release
  cp ../zeroDay_app/android/local.properties android/local.properties
  npm ci
  npx tsc -b
  npm test
  npm run build
  npx cap sync android
  cd android && ./gradlew assembleDirectRelease --no-daemon
  ```
- **Cosa verificare**:
  1. Build completata con successo (`BUILD SUCCESSFUL`).
  2. Package: `com.pwnify.app`, `versionCode 7`, `versionName 1.2.7`.
  3. Firma: `CN=matteo adorni...` certificato release corretto.
  4. Gitleaks: 0 leak nel worktree.

---

### Passo 5: Tag e Pubblicazione Release sul Commit di `main`
- **Azione**:
  Creare il tag `v1.2.7` e pubblicare la release ufficiale direttamente sul commit di merge su `main` allegando l'APK compilato al passo 4:
  ```bash
  gh release create v1.2.7 scratch/pwnify-1.2.7.apk \
    --target main \
    --title "v1.2.7" \
    --notes "Pwnify 1.2.7 — Retention Engine B0 & Rebranding"
  ```
- **Cosa verificare**:
  1. Il tag `v1.2.7` punta al commit di merge su `main`.
  2. L'asset `pwnify-1.2.7.apk` è scaricabile dall'URL pubblico:
     `https://github.com/MatteAdor/pwnify/releases/download/v1.2.7/pwnify-1.2.7.apk`

---

### Passo 6: Calcolo Hash SHA-256 e Aggiornamento Configurazione Remota
- **Azione**:
  1. Calcolare l'hash SHA-256 effettivo del binario appena generato da `main`:
     ```powershell
     (Get-FileHash scratch/pwnify-1.2.7.apk -Algorithm SHA256).Hash.ToLower()
     ```
  2. Sostituire l'hash risultante `<SHA256_APK_CALCOLATO>` in `scratch/app_versions_update.sql` ed eseguirlo nell'editor SQL di Supabase:
     ```sql
     UPDATE public.app_versions
     SET 
         store_url = 'https://pwnify.xyz/#download',
         latest_version = '1.2.7',
         latest_version_code = 7,
         apk_download_url = 'https://github.com/MatteAdor/pwnify/releases/download/v1.2.7/pwnify-1.2.7.apk',
         apk_sha256 = '<SHA256_APK_CALCOLATO>',
         apk_hashes = jsonb_set(
             COALESCE(apk_hashes, '{}'::jsonb),
             '{7}',
             '"<SHA256_APK_CALCOLATO>"'
         ),
         force_message = '{"it": "Aggiornamento critico di sicurezza richiesto per accedere a Pwnify.", "en": "Critical security and protocol update required to access Pwnify."}'::jsonb,
         updated_at = pg_catalog.now()
     WHERE platform = 'android';
     ```
- **Cosa verificare**:
  1. La riga `android` di `public.app_versions` contiene l'hash SHA-256 esatto dell'APK su GitHub.
  2. `min_supported_version_code` rimane invariato per evitare lock-out prematuro dei client attivi.

---

### Passo 7: Verifica Funzionale su Telefono Fisico (Smoke Test)
- **Azione**:
  Installare `pwnify-1.2.7.apk` scaricato dalla release GitHub su un dispositivo Android reale.
- **Cosa verificare**:
  1. **Identità e Firma**: Icona e splash screen con brand Pwnify, nome app "Pwnify", aggiornamento trasparente sopra le build precedenti.
  2. **Avvio & Rete**: Connessione a Supabase e autenticazione attive.
  3. **Direct Update**: Verifica aggiornamenti in-app valida senza eccezioni di sicurezza.
  4. **Duelli & Realtime**: Accesso alla modalità Arena PvP / Ranked con match WebRTC/Realtime funzionante.
