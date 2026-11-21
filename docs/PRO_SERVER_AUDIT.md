# Audit server PRO e profili (sola lettura)

Data: 21/11/2026 · Ambito: `supabase/migrations`, `supabase/contract`, `supabase/functions`.
Nessun comando Supabase eseguito. La migrazione proposta è in
`supabase/contract/20261121000001_contract_profiles_privileged_columns.sql` (**NON applicata**).

Stato assunto: le migrazioni in `supabase/migrations/` sono applicate; i file in `supabase/contract/` no.

Nota: la CI (`ci.yml`, `db-tests.yml`) applica `supabase/contract/*.sql` solo a un Postgres locale effimero ed esegue i pgTAP sul DB "contratto"; non è un deploy remoto. Il nuovo trigger si chiama `trg_protect_profiles_privileged_columns`, così scatta dopo `trg_protect_profiles_is_pro` e il messaggio d'errore su `is_pro` atteso dai test resta invariato.

## 1. Licenze PRO: validate_license e webhook Lemon Squeezy

| Esito | File:riga | Dettaglio |
|---|---|---|
| ok | `functions/validate_license/index.ts:129` | Lato client c'è solo un controllo di lunghezza (8-128 caratteri). Nessun prefisso `0xPRO-`/`0xDEV-`, nessuna chiave dev, nessun checksum. |
| ok | `functions/validate_license/index.ts:141-191` | La chiave è validata solo dall'API License di Lemon Squeezy (`activate`, poi `validate`); serve `status === "active"` (`:193`). |
| ok | `functions/validate_license/index.ts:111-123, 211` | JWT verificato con `auth.getUser()`; PRO scritto solo sull'`user.id` del chiamante via `service_role` RPC. |
| ok | `functions/lemonsqueezy_webhook/index.ts:82-94` | HMAC-SHA256 sul raw body, confronto timing-safe. |
| ok | cronologia git | `git log --all -S` non trova le 4 chiavi dev né prefissi `0xPRO/0xDEV` in nessuna versione di `supabase/`. Le chiavi erano solo nel client (rimosse in PR #14). |
| **problema (alto)** | `functions/validate_license/index.ts:161-191` | Manca il controllo `meta.store_id` / `meta.product_id`. L'API License di Lemon Squeezy accetta chiavi di **qualsiasi store**: una chiave di un altro store (anche un prodotto gratuito creato dall'attaccante) attiva PRO. Fix: confrontare `meta.store_id` con `LEMONSQUEEZY_STORE_ID` (env) e `meta.product_id`/`variant_id` con una allowlist; altrimenti `valid:false`. |
| problema (basso) | `functions/validate_license/index.ts:176-179` | Il fallback `validate` passa `instance_id: user.id`, ma Lemon Squeezy si aspetta l'ID istanza restituito da `activate`. Fallisce in modo sicuro, però blocca il riattivo legittimo. Fix: salvare e riusare `instance_id` (già in `user_licenses`). |
| problema (medio) | `functions/lemonsqueezy_webhook/index.ts:150` | Ricerca `profiles.nick = customerEmail`. Oggi è codice morto (i nick ammettono solo `[A-Za-z0-9_-]`), ma se cambiassero le regole un utente potrebbe intercettare l'acquisto di un altro. Fix: rimuovere. |
| problema (medio) | `functions/lemonsqueezy_webhook/index.ts:157` | `listUsers({ perPage: 1000 })`: oltre 1000 utenti l'acquirente non viene trovato. Fix: RPC `service_role` che cerca in `auth.users` per email, oppure richiedere `custom_data.user_id`. |
| problema (basso) | `functions/lemonsqueezy_webhook/index.ts:195` | `order_created` attiva PRO senza verificare `attributes.status === "paid"`. Fix: controllare lo status. |
| info | `functions/lemonsqueezy_webhook/index.ts:131-144` | `custom_data.user_id` è scelto da chi paga: si può solo "regalare" PRO a un altro account pagando, non è un'escalation. |
| info | `functions/lemonsqueezy_webhook/index.ts:112` | L'email del cliente finisce nei log (PII). Fix: loggare solo l'ID. |

## 2. Scritture su profiles (is_pro, xp, elo, streak, nick)

| Esito | File:riga | Dettaglio |
|---|---|---|
| ok | `migrations/20261019000004_pro_license_system.sql:85-139` | `set_profile_pro_status`: SECURITY DEFINER, `search_path=''`, `REVOKE ... FROM PUBLIC, anon, authenticated` e `GRANT ... TO service_role` (`:138-139`). |
| ok | `migrations/20261019000004_pro_license_system.sql:29-47` | Trigger `protect_profiles_is_pro`: blocca le modifiche a `is_pro` se `auth.role()` è anon/authenticated, anche dentro RPC definer. |
| ok | `migrations/20261019000001_ranked_system.sql:106-116` | RLS attivo su `profiles`, nessuna policy permissiva di INSERT/UPDATE/DELETE: le scritture dirette via PostgREST sono negate. |
| ok | tutte le funzioni che scrivono `profiles` | Sono SECURITY DEFINER con `auth.uid()`: `submit_answer`, `finalize_*`, `forfeit_match`, `claim_daily_flash_draw` (segreto in Vault), `update_my_profile_preferences` (nick: regex, 3-24 caratteri, cooldown di 7 giorni, unicità), `update_my_inventory_cosmetics`, `import_legacy_progress`. |
| ok | `migrations/20261024000001_server_validated_streak.sql:284-373, 378-385` | Streak in `user_streaks`: RLS read-own; l'import legacy è una tantum, limitato a 30 giorni, solo per account creati prima del cutoff. |
| **problema (medio)** | `migrations/20261019000001_ranked_system.sql` (assenza di REVOKE) | I GRANT di tabella di default di Supabase (ALL ad anon/authenticated) restano: le scritture sono bloccate **solo** dall'assenza di policy. Una policy di scrittura aggiunta per errore (es. dalla dashboard) aprirebbe xp/elo/rank/flagged/nick. Il client prova già `insert` su `profiles` (`src/components/Auth/AuthPage.tsx:655, 795`). Fix nella migrazione proposta: REVOKE INSERT/UPDATE/DELETE + trigger sulle colonne privilegiate. |
| problema (basso) | `migrations/20261019000004_pro_license_system.sql:29-47` | Il trigger copre solo `is_pro` e solo UPDATE (non INSERT). Coperto dal nuovo trigger. |
| problema (medio) | `migrations/20261019000001_ranked_system.sql:737-775`, `migrations/20261024000004_core_rpcs_security_definer.sql:457-518` | `migrate_my_legacy_progress`: lo XP è **dichiarato dal client** (fino a 15.000, una volta sola). Ogni nuovo account può darsi 15.000 XP e salire in classifica. Fix suggerito (non incluso): disattivare la RPC dopo la finestra di migrazione o limitarla agli account creati prima del cutoff, come per le streak. |
| problema (basso) | `migrations/20261024000002_public_profiles_view.sql:127,134` | `profession` scritta senza limiti di lunghezza o caratteri. Fix: CHECK `<= 60` caratteri (NOT VALID) nella migrazione proposta, più validazione nella RPC. |
| info | `contract/20261024000006_contract_revoke_privileges.sql:8-24` | Questa versione del trigger `is_pro` usa `current_user` invece di `auth.role()`, quindi è **più debole** (permetterebbe `is_pro` da RPC definer). Se si applica il contract, mantenere la versione `auth.role()`. |

## 3. Colonne di profiles leggibili con la anon key (Phase C)

Stato attuale: policy `profiles_read_all` `FOR SELECT TO authenticated, anon USING (true)`
(`migrations/20261019000001_ranked_system.sql:113-116`). **Tutte le colonne di tutti gli utenti sono leggibili da anon**,
e questo aggira la pseudonimizzazione di `public_profiles` (`migrations/20261024000002_public_profiles_view.sql:15-33`).

| Colonna | Oggi (anon) | Dopo Phase C |
|---|---|---|
| `id` | visibile | solo via view (necessario per i match) |
| `nick` | **visibile in chiaro anche se non pubblico** | pseudonimo `Operatore-XXXXXX` salvo opt-in |
| `elo`, `rank`, `xp` | visibili | via view (classifica) |
| `profession` | **visibile anche se non pubblica** | solo con opt-in |
| `is_public_profile` | visibile | via view |
| `is_profession_public` | visibile | nascosta |
| `is_pro` | **visibile** | nascosta |
| `flagged` | **visibile** (flag anti-cheat) | nascosta |
| `inventory` | visibile | nascosta |
| `legacy_imported` | visibile | nascosta |
| `matchmaking_cooldown_until` | visibile | nascosta |
| `last_ranked_at`, `created_at`, `updated_at`, `nick_updated_at` | visibili (metadati di attività) | nascoste |

Impatto sul client: il client legge la tabella base solo per il proprio profilo (`src/utils/cloudSync.ts:304,320`,
`src/components/Auth/AuthPage.tsx:212`) e gli altri utenti tramite `public_profiles` (`cloudSync.ts:387`,
`rankedController.ts:250`, `userDatabase.ts:788`). La policy `profiles_read_own` non rompe nulla.

## Altro emerso durante l'audit
- Il commit `2a71ea1` (`src/utils/turnService.ts`) conteneva credenziali TURN Metered statiche, poi rimosse, ma sono ancora nella cronologia pubblica. Vanno **ruotate** in Metered se non è già stato fatto.
