# Retention Engine B0 — Status, Runbook & Release Specification

## 1. Architettura di Rilascio in Due Tempi (Expand / Contract)

Le migrazioni sono strutturate per consentire un rollout a zero-downtime senza rompere i client attivi (sito web e APK 1.2.1):

### FASE A — EXPAND (Retrocompatibile con i client correnti)
Applicabile immediatamente in produzione senza interrompere l'APK 1.2.1 né il sito attuale:
- `20261024000001_server_validated_streak.sql`: Colonne streak server-authoritative (`streak_freeze_count`, `streak_protection_active`, `streak_freeze_used_at`), trigger validazione streak, RPC `record_user_streak_activity` e utility `get_server_time`.
- `20261024000002_public_profiles_view.sql`: Colonne opt-in (`is_public_profile`, `is_profession_public`, `profession`, `nick_updated_at`), creazione view `public.public_profiles` con pseudonimi salati `Operatore-XXXXXX` e `GRANT SELECT` ad `anon` e `authenticated`, RPC `is_nick_available`, `update_my_profile_preferences`, `update_my_inventory_cosmetics`. La tabella base `profiles` mantiene `SELECT` per `anon`.
- `20261024000003_daily_flash_draws.sql`: Tabella `daily_flash_draws` e vincolo `(user_id, draw_date)`. RPC `claim_daily_flash_draw` con lettura segreto da Supabase Vault o GUC (`app.settings.daily_flash_secret`), senza alcun fallback in chiaro (solleva `55000` se non configurato).
- `20261024000004_core_rpcs_security_definer.sql`: Versioni `SECURITY DEFINER SET search_path = ''` delle 5 RPC core (`find_or_create_match`, `submit_answer`, `forfeit_match`, `claim_daily_flash_draw`, `migrate_my_legacy_progress`), preservando algoritmi ELO, rotazione domande e anti-farming.

---

### FASE CLIENT — RILASCIO NUOVA BUILD
- Distribuzione del nuovo client web e della nuova applicazione mobile compilata con protocol headers (`X-Build`, `X-Platform`).
- I nuovi client interrogano `public_profiles` per le classifiche e inviano il codice build per il version gating.

---

### FASE C — CONTRACT (Restrittiva / Hardening)
Applicabile **SOLO DOPO** che le condizioni di migrazione client sono soddisfatte:
- `20261024000005_contract_unique_nick_lower.sql`: Pre-flight check anti-duplicati (`ERRCODE 23505`) e creazione indice univoco `idx_profiles_nick_lower` su `lower(nick)`.
- `20261024000006_contract_revoke_privileges.sql`: Trigger `protect_profiles_is_pro` convertito a `SECURITY INVOKER` con controllo `current_user IN ('anon','authenticated')`; `REVOKE DELETE, UPDATE ON public.profiles FROM anon, authenticated`; `REVOKE EXECUTE` su 13 RPC sensibili da `PUBLIC` e `anon`; assegnazione esplicita grant minimi.
- `20261024000007_contract_version_gate.sql`: `REVOKE SELECT ON public.profiles FROM anon` (obbliga i client non autenticati a usare `public_profiles`); RLS own-row su `profiles` (`auth.uid() = id`); policy `RESTRICTIVE` `"Enforce min version on profiles"` che attiva l'intercettazione globale `SQLSTATE PT426` per build obsolete.

---

## 2. Condizioni Operative per Applicare la FASE C
La Fase C non deve essere applicata prima di aver verificato:
1. **Adozione Client**: La quota di utenti attivi sul vecchio APK 1.2.1 è azzerata o ridotta sotto la soglia di tolleranza, oppure gli utenti residui sono stati avvisati tramite notifica in-app / kill-switch.
2. **Pre-flight Duplicati Nick**: Esecuzione della query di controllo duplicati in sola lettura:
   ```sql
   SELECT lower(nick) AS lower_nick, count(*), array_agg(id) AS profile_ids
   FROM public.profiles
   WHERE nick IS NOT NULL
   GROUP BY lower(nick)
   HAVING count(*) > 1;
   ```
   Nessun duplicato deve essere presente prima di lanciare la migrazione 05.

---

## 3. Gestione Secret HMAC Daily Flash (Supabase Vault)
URL documentazione ufficiale: `https://supabase.com/docs/guides/database/vault`
Il segreto dell'HMAC viene memorizzato nel Vault cifrato di Supabase o nei parametri protetti di Postgres:
```sql
-- Metodo 1: Supabase Vault
SELECT vault.create_secret('<CHIAVE_CRITTOGRAFICA_CASUALE_64_HEX>', 'daily_flash_secret');

-- Metodo 2: GUC di Database (alternativo)
ALTER DATABASE postgres SET app.settings.daily_flash_secret = '<CHIAVE_CRITTOGRAFICA_CASUALE_64_HEX>';
```

---

## 4. Applicazione Migrazioni in Produzione (`deploy-prod.yml`)
Come specificato in `.github/workflows/deploy-prod.yml`:
- **Trigger**: Push di un tag git con pattern `v*` (es. `v1.3.0`) oppure esecuzione manuale via `workflow_dispatch`.
- **Environment Protetto**: `production` (richiede approvazione manuale configurata nelle impostazioni ambiente di GitHub prima dell'esecuzione dei job).
- **Secret Necessari (Nomi)**:
  - `SUPABASE_PROD_PROJECT_ID`: ID del progetto Supabase di produzione.
  - `SUPABASE_ACCESS_TOKEN`: Token di gestione Supabase CLI per linkare ed eseguire migrazioni.
  - *(Opzionali per seed cifrato e deploy hook: `QUESTION_BANK_KEY`, `QUESTION_BANK_REMOTE_URL`, `QUESTION_BANK_AUTH_TOKEN`, `SUPABASE_PROD_URL`, `SUPABASE_PROD_SERVICE_ROLE_KEY`, `FRONTEND_DEPLOY_HOOK_URL`)*.
- **Comando di Migrazione Applicato**:
  ```bash
  supabase db push --include-all
  ```
  Applica tutte le migrazioni presenti in `supabase/migrations/` che non risultano ancora registrate nella tabella remota `supabase_migrations.schema_migrations`.
