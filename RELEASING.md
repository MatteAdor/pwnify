# ZeroDay — Android Release & In-App Update Runbook

Questo documento definisce le procedure operative standard per la gestione delle versioni, la compilazione dei due flavor nativi (`play` e `direct`), la firma crittografica, il rollout su Google Play e l'aggiornamento sicuro dei parametri di versione minima remota.

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
| **Firma Crittografica** | Gestita da **Google Play App Signing** | Firmata con keystore privato (`zeroDay_app/android.keystore`) |

---

## 2. Incompatibilità Firme tra Canali (Avviso Critico)

> [!WARNING]
> Gli APK installati dal sito web e i bundle installati dal Google Play Store sono firmati con **coppie di chiavi crittografiche differenti**.
> Su Android, il sistema operativo blocca qualsiasi tentativo di aggiornare un'app con una firma non corrispondente (`INSTALL_FAILED_UPDATE_INCOMPATIBLE`).
>
> **Comportamento per l'utente:**
> Se un utente passa da APK diretto a Play Store (o viceversa), deve **disinstallare manualmente** l'applicazione e reinstallarla dal nuovo canale.
> Tutti i progressi, le licenze PRO, le credenziali e l'ELO PvP sono salvati in cloud nel database PostgreSQL Supabase (`mhnalgbufdlnctwdxppb`), garantendo **zero perdita di dati**.

---

## 3. Singola Fonte di Verità per la Versione

La versione dell'applicazione è governata esclusivamente da `android/app/build.gradle`:

```groovy
defaultConfig {
    versionCode 2       // MONOTONICO: Unico criterio di confronto logico
    versionName "1.2.2" // SEMVER: Utilizzato unicamente per visualizzazione UI
}
```

* **`versionCode`**: intero incrementale (1, 2, 3...). Il client nativo lo legge a runtime tramite `@capacitor/app` (`App.getInfo().build`) e lo invia nell'header `X-Build`. Il server e l'update manager confrontano **solo** questo valore.
* **`versionName`**: stringa formattata per gli utenti (es. `1.2.2`).

---

## 4. Priorità di Aggiornamento Google Play (`inAppUpdatePriority`)

La Google Play Developer API consente di assegnare un valore di priorità intero da **0 a 5** a ciascuna release caricata sulle tracce di test o produzione.

* **Priorità 0 – 3 (Flexible Update):**
  * Il download avviene in background mentre l'utente naviga nell'app.
  * Al completamento, il client mostra il banner: *"Aggiornamento pronto. Riavvia per applicare."*
* **Priorità 4 – 5 (Immediate Update / Force Update):**
  * Google Play attiva la schermata a tutto schermo bloccante.
  * L'utente non può interagire con l'app finché l'aggiornamento non è installato e l'app riavviata.

### Come impostarla via Google Play Developer API
Se si effettua l'upload tramite CI/CD (es. Fastlane o script Node/Python con `google-api-python-client` / `googleapis`):

```json
{
  "releases": [
    {
      "name": "1.2.2 (Build 2)",
      "versionCodes": ["2"],
      "status": "completed",
      "inAppUpdatePriority": 5
    }
  ]
}
```

---

## 5. Procedura di Rilascio Passo-Passo

### Fase 1: Bump versione
1. Incrementa `versionCode` (+1) e imposta `versionName` in `android/app/build.gradle`.
2. Sincronizza i web assets con Capacitor:
   ```bash
   npm run build
   npx cap sync android
   ```

### Fase 2: Compilazione artefatti firmati

**Per Google Play:**
```bash
cd android
./gradlew bundlePlayRelease
```
*L'AAB generato si trova in `android/app/build/outputs/bundle/playRelease/app-play-release.aab`.*

**Per APK Diretto:**
```bash
cd android
./gradlew assembleDirectRelease
```
*L'APK generato si trova in `android/app/build/outputs/apk/direct/release/app-direct-release.apk`.*

### Fase 3: Calcolo Hash SHA-256 (per il flavor Direct)
```powershell
Get-FileHash android\app\build\outputs\apk\direct\release\app-direct-release.apk -Algorithm SHA256
```
Copia l'APK in `public/downloads/zeroday.apk` e aggiorna `apk_sha256` nella tabella remota.

### Fase 4: Caricamento su Google Play Console
1. Carica l'AAB sulla traccia **Internal Testing** (`Test interni`).
2. Verifica su dispositivi di test.
3. Promuovi a **Closed Testing** o **Production**.

---

## 6. Aggiornamento Sicuro di `min_supported_version` (Script `set-min-version`)

> [!CAUTION]
> **NON alzare MAI `min_supported_version` finché la nuova build non è pubblicata ed effettivamente scaricabile dai tuoi utenti.**
> Se alzi la versione minima mentre la build è ancora in fase di revisione Google, tutti gli utenti rimarranno bloccati senza poter aggiornare!

Per prevenire questo errore, è obbligatorio usare lo script protetto:

```bash
# Esempio: alzare la versione minima a build 2
npx tsx scripts/set-min-version.ts --version-code 2 --version 1.2.2 --confirm-published
```

* Se le credenziali della Google Play Developer API sono configurate in `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`, lo script verifica automaticamente che la build sia live.
* In assenza di API, lo script rifiuta di procedere a meno che non venga passato il flag `--confirm-published` e digitata la conferma esplicita `CONFIRM-PLAY-PUBLISHED`.

---

## 7. Come Testare i Due Canali

### Test Flavor `play` (Google Play Store)
1. Installa sul dispositivo di test una build con `versionCode: 1` dalla traccia **Internal Testing** di Google Play Console.
2. Carica sulla stessa traccia una nuova build con `versionCode: 2` (priorità 5 per immediate, priorità 2 per flexible).
3. Apri l'app sul telefono. Google Play In-App Updates intercetterà la disponibilità e mostrerà il flusso nativo a tutto schermo di Google.
4. Se simuli un'interruzione (es. premi Home durante il download immediato), alla riapertura dell'app il listener in foreground rilancia automaticamente il flusso.

### Test Flavor `direct` (APK Standalone)
1. Installa l'APK con `versionCode: 1`.
2. Esegui una chiamata locale o temporanea per impostare `min_supported_version_code: 2` su Supabase.
3. Apri l'app: compare la schermata bloccante *"AGGIORNAMENTO OBBLIGATORIO"*.
4. Clicca *"SCARICA E INSTALLA (IN-APP)"*.
5. La barra di avanzamento mostra la percentuale di download reale in tempo reale.
6. Al completamento, il plugin verifica l'hash SHA-256 e avvia il Package Installer nativo di Android chiedendo la conferma di aggiornamento.
