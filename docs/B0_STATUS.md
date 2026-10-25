# Retention Engine B0 — Status, Runbook & Release Specification

## 1. Migrazioni Database (20261024000001 – 20261024000007)

| Ordine | File di Migrazione | Scopo Architetturale | Rollback SQL |
|---|---|---|---|
| **1** | `20261024000001_server_validated_streak.sql` | Colonne streak server-authoritative (`streak_freeze_count`, `streak_protection_active`, `streak_freeze_used_at`), trigger e RPC `record_user_streak_activity` | `DROP FUNCTION IF EXISTS public.record_user_streak_activity; ALTER TABLE public.profiles DROP COLUMN IF EXISTS streak_freeze_count, DROP COLUMN IF EXISTS streak_protection_active, DROP COLUMN IF EXISTS streak_freeze_used_at;` |
| **2** | `20261024000002_public_profiles_view.sql` | Creazione view `public_profiles` e concessione `GRANT SELECT` a `anon` e `authenticated` | `DROP VIEW IF EXISTS public.public_profiles;` |
| **3** | `20261024000003_daily_flash_draws.sql` | Tabella `daily_flash_draws`, vincolo di unicità `(user_id, draw_date)` e RPC `claim_daily_flash_draw` | `DROP FUNCTION IF EXISTS public.claim_daily_flash_draw; DROP TABLE IF EXISTS public.daily_flash_draws CASCADE;` |
| **4** | `20261024000004_opt_in_public_profiles.sql` | Trigger `protect_profiles_is_pro` convertito a `SECURITY INVOKER` con controllo `current_user IN ('anon','authenticated')`; view pseudonimizzata con hash salato `Operatore-XXXXXX`; `REVOKE DELETE` su `profiles`; RPC `is_nick_available` | `DROP FUNCTION IF EXISTS public.is_nick_available; DROP VIEW IF EXISTS public.public_profiles; -- ripristino view standard` |
| **5** | `20261024000005_revoke_public_rpc_privileges.sql` | Principio del minimo privilegio: `REVOKE EXECUTE ON ALL FUNCTIONS FROM PUBLIC, anon, authenticated` su 13 RPC sensibili e riassegnazione esplicita per ruolo | `GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;` |
| **6** | `20261024000006_profile_update_rpcs.sql` | Pre-flight check anti-duplicati (`ERRCODE 23505`), indice univoco `idx_profiles_nick_lower` su `lower(nick)`; RPC controllate `update_my_profile_preferences` e `update_my_inventory_cosmetics` | `DROP FUNCTION IF EXISTS public.update_my_profile_preferences; DROP FUNCTION IF EXISTS public.update_my_inventory_cosmetics; DROP INDEX IF EXISTS public.idx_profiles_nick_lower;` |
| **7** | `20261024000007_harden_core_rpcs_security_definer.sql` | Elevazione a `SECURITY DEFINER SET search_path = ''` per `find_or_create_match`, `submit_answer`, `forfeit_match`, `claim_daily_flash_draw`, `migrate_my_legacy_progress` | Eseguire script inverso ripristinando `SECURITY INVOKER` senza clause `SET search_path = ''`. |

---

## 2. Ordine di Rilascio in Produzione

1. **Pre-flight & Backup**:
   - Eseguire backup snapshot manuale dell'istanza Postgres prima di qualsiasi migrazione.
   - Eseguire query read-only di verifica collisioni su `lower(nick)` (vedere punto 4).
2. **Merge Client & Distribuzione Nuova Build**:
   - Merge PR #5 su branch `main`.
   - Distribuzione automatica bundle Web su Vercel.
   - Generazione e pubblicazione nuovo build Android APK/AAB su Google Play Console con header `X-Build` e `X-Platform`.
3. **Applicazione Migrazioni Sequenziale**:
   - Applicare migrazioni in ordine rigoroso (01 → 07) tramite CLI Supabase o SQL Editor.
   - Verificare l'esito di ciascun file prima di passare al successivo.

---

## 3. Gestione Secret HMAC Daily Flash (Sicurezza Repository Pubblico)

Nel repository pubblico la migrazione contiene un fallback stringa. Per isolare crittograficamente la chiave:
1. **Configurazione Secret a livello Database**:
   ```sql
   ALTER DATABASE postgres SET app.settings.daily_flash_secret = 'INSERIRE_CHIAVE_CRITTOGRAFICA_CASUALE_64_HEX';
   ```
2. **Rimozione del Fallback in Produzione**:
   La funzione `claim_daily_flash_draw` solleva eccezione `55000` se `app.settings.daily_flash_secret` non è valorizzata.

---

## 4. Checklist Azioni Operatore (Richiede Account Proprietario)

1. **Supabase Dashboard**:
   - Navigare su `Database` -> `Backups` ed eseguire **Take manual backup**.
   - Eseguire la query di controllo duplicati in sola lettura:
     ```sql
     SELECT lower(nick) AS lower_nick, count(*), array_agg(id) AS profile_ids
     FROM public.profiles
     WHERE nick IS NOT NULL
     GROUP BY lower(nick)
     HAVING count(*) > 1;
     ```
   - Se `count > 0`, bonificare i nick duplicati prima di procedere alla migrazione 6.
2. **SQL Editor Supabase**:
   - Impostare il secret HMAC del database:
     ```sql
     ALTER DATABASE postgres SET app.settings.daily_flash_secret = '<32-byte-hex-secret>';
     ```
3. **Google Play Console**:
   - Caricare il bundle generato (versione build >= 100) nella traccia di produzione/open testing.
4. **GitHub**:
   - Rivedere la PR #5 e confermare il squash/merge su `main` solo a build approvata.
