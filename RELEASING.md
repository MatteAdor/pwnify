# ZeroDay — Android Release & In-App Update Runbook

Questo documento definisce le procedure operative standard per la gestione delle versioni, la compilazione dei due flavor nativi (`play` e `direct`), la firma crittografica, il rollout su Google Play e l'aggiornamento sicuro dei parametri di versione minima remota.

---

## 0. Sequenza Operativa di Deploy in Produzione (Ordine Rigoroso)

Seguire questa sequenza passo-passo senza invertire l'ordine:

### (a) Rotazione e Invalidazione Credenziali Metered
1. Accedi alla dashboard di Metered: https://dashboard.metered.ca
2. **Invalidazione credenziale statica compromessa**:
   - *Via Dashboard (percorso da verificare in base alla versione dell'interfaccia)*:
     Vai su *Developers* -> *TURN Credentials* (o sezione *Credentials*), individua l'utente con Username `7bf8***` e seleziona **Delete** / **Disable**.
   - *Via REST API ufficiale (documentata su https://www.metered.ca/docs/turn-rest-api/v1/delete-turn-credential/)*:
     ```bash
     curl -X DELETE "https://zeroday.metered.live/api/v1/turn/credential?secretKey=<METERED_SECRET_KEY>" \
       -H "Content-Type: application/json" \
       -d '{"username": "7bf8***"}'
     ```
     Risposta attesa: `200 OK` con `{"success": true, "message": "credential removed"}`.
3. Nella sezione *API Keys*, revoca la vecchia chiave esposta e genera una nuova **Secret Key**.

### (b) Configurazione Secret Supabase
Imposta i secret di backend sull'ambiente Supabase tramite CLI (senza committare mai credenziali in git):
```bash
supabase secrets set METERED_APP_NAME="zeroday" METERED_SECRET_KEY="<nuova_secret_key_da_metered>"
```

### (c) Deploy Edge Function `get_turn_credentials` & Test Manuale Ephemeral
1. Esegui il deploy mantenendo attiva la verifica JWT a livello gateway:
```bash
supabase functions deploy get_turn_credentials
```
2. **Verifica Post-Deploy Ephemeral Credentials (consecutività e scadenza)**:
   Esegui due chiamate consecutive con JWT autenticato alla funzione:
   ```bash
   curl -X POST https://<project-ref>.supabase.co/functions/v1/get_turn_credentials \
     -H "Authorization: Bearer <user_jwt>" \
     -H "apikey: <anon_key>"
   ```
   **Criteri di accettazione**:
   - Entrambe le chiamate restituiscono HTTP 200 con array di server STUN e TURN.
   - I campi `username` e `credential` restituiti nella prima chiamata sono **DIVERSI** da quelli della seconda (generate on-demand con `expiryInSeconds: 3600`).
   - Se `METERED_SECRET_KEY` non è impostata, la funzione restituisce HTTP 503 senza loggare parametri sensibili.

### (d) Test PvP Misto (Wi-Fi vs Rete Mobile 4G/5G)
1. Connetti un dispositivo a Wi-Fi domestico e un secondo a rete dati cellulare 4G/5G (sotto CGNAT).
2. Apri `chrome://webrtc-internals` nel browser collegato.
3. Avvia un match Arena 1v1: verifica che `iceConnectionState` transiti a `connected` e che la coppia candidata attiva sia di tipo `relay` (porta 80/443 o turns: 443 TCP).

### (e) Test Migrazione su STAGING con pgTAP
1. Fornisci il project reference del database di STAGING.
2. Applica la migrazione 5 (`20261019000005_app_versions_and_upgrade_required.sql`) **SOLO su STAGING**.
3. Esegui la suite pgTAP reale `supabase/tests/version_upgrade_system.sql` e verifica l'InitPlan di `EXPLAIN`.

### (f) Generazione Keystore & Compilazione Release Firmata
1. Crea la keystore locale in `%USERPROFILE%/.gradle/zeroday-release.keystore` (mai tracciata da git):
   ```bash
   keytool -genkeypair -v -keystore "%USERPROFILE%/.gradle/zeroday-release.keystore" -alias zeroday-direct -keyalg RSA -keysize 4096 -validity 10000
   ```
2. Configura i parametri di firma in `%USERPROFILE%/.gradle/gradle.properties`:
   ```properties
   ZERODAY_KEYSTORE_PATH=C:/Users/lenovo/.gradle/zeroday-release.keystore
   ZERODAY_KEYSTORE_PASSWORD=tua_password_keystore
   ZERODAY_KEY_ALIAS=zeroday-direct
   ZERODAY_KEY_PASSWORD=tua_password_chiave
   ```
3. Compila l'APK di release firmato:
   ```bash
   cd android
   ./gradlew assembleDirectRelease
   ```
4. Verifica con `apksigner`:
   ```bash
   apksigner verify --print-certs android/app/build/outputs/apk/direct/release/app-direct-release.apk
   ```

### (g) Hosting Esterno APK & Aggiornamento `app_versions`
1. Calcola l'hash SHA-256 reale dell'APK compilato:
   ```powershell
   Get-FileHash android\app\build\outputs\apk\direct\release\app-direct-release.apk -Algorithm SHA256
   ```
2. Carica l'APK sul canale di hosting scelto:
   - Se repo pubblico: GitHub Releases tag `v1.2.1`.
   - Se repo privato: bucket pubblico Supabase Storage (`/releases/zeroday-v1.2.1.apk`).
3. Aggiorna la riga `android` nella tabella `public.app_versions`:
   - `apk_download_url`: URL HTTPS assoluto dell'hosting.
   - `apk_hashes`: `'{"1": "<hash_sha256_reale>"}'::jsonb`.

### (h) Push del Client Web / App
Esegui il push dei commit approvati del client su `main` o branch di produzione.

### (i) Rimozione Definitiva Binari Debug
Solo dopo che il nuovo APK è ospitato e scaricabile, committa ed elimina definitivamente i vecchi binari `zeroday.apk` e `zeroday-app-debug.apk`.

### (j) Innalzamento Sicuro di `min_supported_version_code`
Per ultimo, dopo aver verificato che gli utenti possano effettivamente scaricare l'aggiornamento, alza la versione minima tramite lo script controllato:
```bash
npx tsx scripts/set-min-version.ts --version-code 2 --version 1.2.2 --confirm-published
```

---

## 1. Architettura dei Flavor Android

ZeroDay compila due varianti distinte di distribuzione nativa definite in `android/app/build.gradle`:

| Parametro | Flavor `play` (Google Play Store) | Flavor `direct` (APK Standalone / Sideload) |
|---|---|---|
| **Formato output** | Android App Bundle (`.aab`) o APK | APK (`.apk`) |
| **Comando build** | `./gradlew bundlePlayRelease` | `./gradlew assembleDirectRelease` |
| **Permesso Installazione** | **Assente** (Google Play rifiuta app con `REQUEST_INSTALL_PACKAGES` non autorizzato) | `android.permission.REQUEST_INSTALL_PACKAGES` incluso in `src/direct/AndroidManifest.xml` |
| **Meccanismo di Update** | **Google Play In-App Updates** (Immediate & Flexible via `@capawesome/capacitor-app-update`) | **Download nativo in-app** + verifica SHA-256 in streaming + PackageInstaller (`DirectUpdatePlugin`) |
| **Pulsante di Fallback** | Reindirizzamento allo store (`market://details?id=com.zeroday.academy`) | Download e installazione diretta del pacchetto APK in-app |
| **Firma Crittografica** | Gestita da **Google Play App Signing** | Firmata con keystore privato (`%USERPROFILE%/.gradle/zeroday-release.keystore`) |

---

## 2. Incompatibilità Firme tra Canali (Avviso Critico)

> [!WARNING]
> Gli APK installati dal sito web e i bundle installati dal Google Play Store sono firmati con **coppie di chiavi crittografiche differenti**.
> Su Android, il sistema operativo blocca qualsiasi tentativo di aggiornare un'app con una firma non corrispondente (`INSTALL_FAILED_UPDATE_INCOMPATIBLE`).
>
> **Comportamento per l'utente:**
> Se un utente passa da APK diretto a Play Store (o viceversa), deve **disinstallare manualmente** l'applicazione e reinstallarla dal nuovo canale.
> Tutti i progressi, le licenze PRO, le credenziali e l'ELO PvP sono salvati in cloud nel database PostgreSQL Supabase, garantendo **zero perdita di dati**.

---

## 3. Singola Fonte di Verità per la Versione

La versione dell'applicazione è governata esclusivamente da `android/app/build.gradle`:

```groovy
defaultConfig {
    versionCode 1       // MONOTONICO: Unico criterio di confronto logico
    versionName "1.2.1" // SEMVER: Utilizzato unicamente per visualizzazione UI
}
```

* **`versionCode`**: intero incrementale (1, 2, 3...). Il client nativo lo legge a runtime tramite `@capacitor/app` (`App.getInfo().build`) e lo invia nell'header `X-Build`. Il server e l'update manager confrontano **solo** questo valore.
* **`versionName`**: stringa formattata per gli utenti (es. `1.2.1`).

---

## 4. Priorità di Aggiornamento Google Play (`inAppUpdatePriority`)

La Google Play Developer API consente di assegnare un valore di priorità intero da **0 a 5** a ciascuna release caricata sulle tracce di test o produzione.

* **Priorità 0 – 3 (Flexible Update):**
  * Il download avviene in background mentre l'utente naviga nell'app.
  * Al completamento, il client mostra il banner: *"Aggiornamento pronto. Riavvia per applicare."*
* **Priorità 4 – 5 (Immediate Update / Force Update):**
  * Google Play attiva la schermata a tutto schermo bloccante.
  * L'utente non può interagire con l'app finché l'aggiornamento non è installato e l'app riavviata.

---

## 8. Impatto Operativo su Utenti v1.2.1 Debug & Piano di Transizione

Gli utenti che hanno attualmente installato l'APK debug (versione 1.2.1 distribuita prima della rotazione) subiranno due impatti immediati in produzione:

1. **Rotazione Chiave Metered**:
   - I client debug contenevano credenziali hardcoded disabilitate/ruotate.
   - Non appena la Secret Key viene ruotata e la vecchia credenziale eliminata, i client v1.2.1 debug non potranno stabilire relay TURN nei match PvP 1v1 su reti restrittive (es. dati mobili 4G/5G sotto CGNAT o firewall aziendali/scolastici).
   - Il matchmaking ripiegherà su soli server STUN pubblici: la connessione P2P riuscirà solo su reti senza symmetric NAT.

2. **Incompatibilità Firma Crittografica (Debug Keystore vs Release Keystore)**:
   - La build v1.2.1 distribuita sul sito era firmata con `Android Debug Keystore` (`CN=Android Debug, O=Android, C=US`).
   - La nuova build di produzione (flavor `direct`) è firmata con la keystore di release privata (`zeroday-direct`).
   - Il Package Manager di Android blocca categoricamente l'upgrade in-place con errore `INSTALL_FAILED_UPDATE_INCOMPATIBLE`.
   - **L'app non potrà aggiornarsi da sola tramite il plugin in-app**: l'utente che tenta l'aggiornamento riceverà un errore di installazione dal sistema operativo.

### Procedura per gli Utenti con APK Preview:
Gli utenti devono **disinstallare manualmente l'app ZeroDay** dal proprio dispositivo Android e riscaricare l'APK di release firmato dal portale.

> [!WARNING]
> **Audit Dati Locali vs Cloud:**
> - **Modalità Ospite (Guest)**: I progressi degli utenti senza account registrato risiedono solo in locale (`localStorage`) e andranno **PERSI** con la disinstallazione. Gli utenti devono associare un account prima della rimozione.
> - **Account Registrati**: Statistiche ELO, livello, XP e sblocco PRO sincronizzati su Supabase vengono preservati. Le preferenze locali (audio, tema, credenziali memorizzate) verranno resettate.
> 
> La bozza dell'avviso per gli utenti è archiviata in `docs/MIGRATION_NOTICE_V1_2_1.md` (flag disattivato: non pubblicata sul sito).
