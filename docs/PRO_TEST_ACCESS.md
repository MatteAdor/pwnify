# Accesso PRO di test (server-side)

> ⚠️ **Proposta: NON eseguita.** Questo SQL va lanciato a mano dal proprietario del progetto
> (Supabase Dashboard → SQL Editor, che gira come `postgres`), solo quando serve.

## Perché
Il client non concede più PRO in nessun caso: niente liste di contributori (email/callsign),
niente chiavi dev, niente chiavi generate o verificate nel browser, niente fallback offline.
`isPro` dipende solo da `profiles.is_pro`, che un trigger lascia scrivere solo a `service_role`
(webhook Lemon Squeezy e Edge Function `validate_license`). Il client lo rilegge con `cloudSync`.

Per dare PRO a un account di test (o a un contributore) basta impostare quel flag lato server.

## Opzione A: usare la funzione esistente (nessuna migrazione)
`public.set_profile_pro_status` esiste già (migrazione `20261019000004_pro_license_system.sql`)
ed è eseguibile solo da `service_role` o da `postgres`.

```sql
-- NON ESEGUIRE AUTOMATICAMENTE. Sostituisci l'UUID con quello dell'utente (auth.users.id).
SELECT public.set_profile_pro_status(
  p_user_id => '00000000-0000-0000-0000-000000000000'::uuid,
  p_is_pro  => true
);

-- Revoca:
SELECT public.set_profile_pro_status(
  p_user_id => '00000000-0000-0000-0000-000000000000'::uuid,
  p_is_pro  => false
);
```

## Opzione B: grant di test tracciati e con scadenza (richiede una migrazione)
Utile per avere un registro di chi ha un accesso gratuito e perché.

```sql
-- NON ESEGUIRE AUTOMATICAMENTE.
CREATE TABLE IF NOT EXISTS public.pro_test_grants (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  reason     TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  expires_at TIMESTAMPTZ
);
ALTER TABLE public.pro_test_grants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pro_test_grants FROM PUBLIC, anon, authenticated;
-- Nessuna policy: solo service_role/postgres possono leggere o scrivere.

-- Concedi (poi imposta il flag autoritativo):
INSERT INTO public.pro_test_grants (user_id, reason, expires_at)
VALUES ('00000000-0000-0000-0000-000000000000', 'QA account', pg_catalog.now() + interval '30 days');
SELECT public.set_profile_pro_status('00000000-0000-0000-0000-000000000000'::uuid, true);
```

Per far scadere i grant in automatico servirebbe un job (es. `pg_cron`) che chiama
`set_profile_pro_status(user_id, false)` per le righe scadute. Non è incluso qui.
