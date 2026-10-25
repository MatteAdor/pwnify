# ZeroDay Production Release Plan — Retention Engine B0

Questo documento definisce la sequenza operativa per il rilascio sicuro in produzione delle modifiche relative alla migrazione Retention Engine B0 (Fase A: Expand).

---

## Matrice Operativa delle Fasi

| Passo | Descrizione | Responsabile | Cosa controllare | Procedura di Rollback |
|---|---|---|---|---|
| **1. Backup DB** | Verifica ultimo run `db-backup.yml` e stato dump | AI / Operatore | Esito run su API pubblica GitHub e integrità del dump S3/R2 | Se fallito, non procedere: eseguire dump manuale da Dashboard Supabase |
| **2. Dry-Run Migrazione** | Dispatch `deploy-prod.yml` con `dry_run=true` | Operatore | Output `supabase db push --dry-run`: applica solo `20261024000001` - `04` | Nessuna modifica applicata: nessuna azione di rollback |
| **3. Applicazione Fase A** | Dispatch `deploy-prod.yml` con `dry_run=false` e conferma | Operatore | Approvazione Environment `production`, push migrazioni `20261024*` (A) | Ripristino dump backup o esecuzione script inverso di drop colonne/tabelle A |
| **4. Health Checks Fase A** | Esecuzione script di sola lettura `health_checks_phase_a.sql` | Operatore / AI | Tutti gli ASSERT superati (streaks, daily flash, view, backfill) | Se anomalie, verificare log Supabase prima del merge frontend |
| **5. Merge PR #5** | Rimozione stato Draft e merge PR #5 su `main` | Operatore | Build Vercel automatica completata con successo | Git revert commit di merge su `main` (trigger Vercel rollback) |
| **6. Rilascio APK** | Build e firma release Android (APK / AAB) | Operatore | Version code incrementato, verifica firma release | Mantenere versione corrente su Play Console |
| **7. Fase C (Contract)** | Esecuzione controllata contratti da `supabase/contract/` | Operatore | Pre-flight su nick duplicati (nessun abort su `lower(nick)`) | Rollback manuale: ripristino privilegi `GRANT UPDATE` da backup |

---

## Dettaglio dei Passi

### Passo 1: Audit Stato Backup Database
- **Azione**: Verificare tramite API pubblica GitHub l'esito dell'ultimo workflow `Database Automated Backup` (`.github/workflows/db-backup.yml`).
- **Cosa contiene il backup**:
  Dump PostgreSQL completo in formato custom (`pg_dump --format=custom --no-owner --no-privileges`), cifrato con AES-256-CBC (PBKDF2 iter 600.000) e archiviato su storage remoto S3/Cloudflare R2.
- **Verifica**: L'ultimo run schedulato (`40175984635`) è fallito per assenza/misconfigurazione del secret `SUPABASE_PROD_DB_URL`.
- **Bloccante**: Prima di procedere alla Fase A in produzione, l'operatore deve accertarsi di disporre di un backup fresco (tramite pulsante manuale "Backup" nella dashboard di Supabase o inserendo il secret corretto e rilanciando il workflow).

### Passo 2: Simulazione Rilascio (Dry-Run)
- **Azione**: L'operatore accede a GitHub Actions -> `Deploy Production` e seleziona "Run workflow":
  - **Branch**: `feature/retention-b0`
  - **dry_run**: `true` (default)
  - **confirm_prod_deploy**: (lasciare vuoto)
- **Cosa verificare**:
  1. Il job esegue solo `supabase link` e `supabase db push --dry-run`.
  2. Vengono elencate ESCLUSIVAMENTE le 4 migrazioni di `supabase/migrations/` (`20261024000001` - `20261024000004`).
  3. Nessuna migrazione di `supabase/contract/` (Fase C) viene rilevata o pianificata.
  4. Vengono saltati il deploy delle funzioni, il seed e l'hook Vercel.

### Passo 3: Esecuzione Rilascio Fase A in Produzione
- **Azione**: L'operatore avvia il workflow definitivo:
  - **Branch**: `feature/retention-b0`
  - **dry_run**: `false`
  - **confirm_prod_deploy**: `DEPLOY-PRODUCTION`
- **Autorizzazione**: Richiede l'approvazione manuale dell'ambiente `production` da parte dell'operatore autorizzato.
- **Cosa verificare**:
  1. Successo del comando `supabase db push --include-all`.
  2. Deploy della funzione Edge `get_turn_credentials`.
  3. Esecuzione seed protetto e chiamata al deploy hook frontend.

### Passo 4: Controlli di Salute Post-Fase A
- **Azione**: L'operatore esegue in console SQL di sola lettura il file `supabase/health_checks_phase_a.sql`.
- **Cosa verificare**:
  1. Tabelle `user_streaks` e `daily_flash_draws` presenti con RLS attivo.
  2. Vista `public_profiles` presente ed esportabile.
  3. Colonna `nick_updated_at` presente in `public.profiles`.
  4. Nessun vincolo di unicità `idx_profiles_nick_lower_unique` attivo (compatibilità vecchi client garantita).
  5. Esecuzione con successo di `get_server_time()`.

### Passo 5: Pubblicazione Frontend (Merge PR #5)
- **Azione**: L'operatore converte PR #5 da Draft a Ready for Review ed effettua il merge su `main`.
- **Cosa verificare**: Vercel riceve il webhook di merge, esegue build e unit test e promuove la produzione.
- **Rollback**: In caso di problemi di visualizzazione, Vercel permette l'instant rollback alla release precedente dal proprio dashboard con un click.

### Passo 6: Nuovo APK Android (Fase successiva)
- **Azione**: In un secondo momento, lancio di `.github/workflows/android.yml` con nuovo tag release o dispatch per generare l'APK con supporto alle nuove RPC server-authoritative.

### Passo 7: Fase C — Chiusura Contratti (Solo a traffico legacy estinto)
- **Pre-condizione**: I client 1.2.1 devono rappresentare < 1% delle sessioni attive.
- **Pre-flight obbligatorio**: Eseguire query di controllo duplicati su `lower(nick)` (nessun nickname collidente esistente).
- **Azione**: Applicare manualmente da dashboard Supabase o pipeline dedicata i file da `supabase/contract/`:
  - `20261024000005_contract_unique_nick.sql`
  - `20261024000006_contract_revoke_privileges.sql`
  - `20261024000007_contract_restrict_profiles_rls.sql`
- **Rollback Fase C**: Ripristinare `GRANT UPDATE, DELETE ON public.profiles TO authenticated;`.
