-- =====================================================================
-- PWNIFY CONTRACT (PROPOSAL, NOT APPLIED): POLAR WEBHOOK IDEMPOTENCY LEDGER
-- File: supabase/contract/20261122000001_contract_polar_webhook_events.sql
-- Status: review only. Do NOT `supabase db push` automatically; apply manually
--         (staging first) BEFORE deploying the polar_webhook Edge Function.
--         CI applies supabase/contract/*.sql to an ephemeral local Postgres only.
--
-- polar_webhook records each delivery's `webhook-id` (Standard Webhooks header,
-- unique per delivery and reused on retries) before acting on it:
--   * INSERT succeeds          -> process the event, then mark it 'processed'
--   * unique_violation (23505) -> duplicate delivery, acknowledge without acting
--   * processing fails         -> the row is deleted so Polar's retry can run
-- Ordering guard: for subscription events the webhook decides on the LIVE state re-read
-- from the Polar API and records that state's `modified_at` here. A later delivery whose
-- live state is older than the newest processed one for the same subscription is ignored.
-- No personal data is stored: only Polar delivery/subscription ids, event type and timestamps.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.polar_webhook_events (
    webhook_id   TEXT PRIMARY KEY CHECK (pg_catalog.char_length(webhook_id) BETWEEN 1 AND 200),
    event_type   TEXT NOT NULL CHECK (pg_catalog.char_length(event_type) BETWEEN 1 AND 100),
    status       TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'processed')),
    received_at  TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    processed_at TIMESTAMPTZ,
    -- Polar subscription the applied state belongs to (NULL for one-time orders / ignored events)
    subscription_id          TEXT CHECK (subscription_id IS NULL OR pg_catalog.char_length(subscription_id) BETWEEN 1 AND 200),
    -- `modified_at` of the live subscription state that was applied
    subscription_modified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_polar_webhook_events_received_at
    ON public.polar_webhook_events (received_at);

-- Newest applied state per subscription (ordering guard lookup)
CREATE INDEX IF NOT EXISTS idx_polar_webhook_events_sub_modified
    ON public.polar_webhook_events (subscription_id, subscription_modified_at DESC)
    WHERE status = 'processed' AND subscription_modified_at IS NOT NULL;

-- Server-only ledger: no client access at all (service_role bypasses RLS).
ALTER TABLE public.polar_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.polar_webhook_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.polar_webhook_events TO service_role;

-- Optional retention (run periodically, e.g. via pg_cron; not scheduled here):
-- DELETE FROM public.polar_webhook_events WHERE received_at < pg_catalog.now() - INTERVAL '90 days';

COMMIT;
