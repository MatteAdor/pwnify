-- =====================================================================
-- ZERODAY PRO LICENSE SYSTEM & AUTHORITATIVE SERVER STATUS
-- Migration: 20261019000004_pro_license_system.sql
-- =====================================================================
-- 1. Adds `is_pro` column to public.profiles (default FALSE).
-- 2. Strictly enforces that `is_pro` can ONLY be written by `service_role`.
-- 3. Creates `public.user_licenses` for Lemon Squeezy subscription/license binding.
-- 4. Exposes `set_profile_pro_status` strictly to `service_role`.
-- =====================================================================

-- 1. Add is_pro column to public.profiles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_pro'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN is_pro BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_is_pro ON public.profiles(is_pro);

-- ---------------------------------------------------------------------
-- 2. HARDENED TRIGGER: PREVENT CLIENT-SIDE MODIFICATION OF is_pro
-- Even if an authenticated user has an UPDATE policy on other fields,
-- altering is_pro throws an insufficient_privilege exception (42501).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_profiles_is_pro()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_pro IS DISTINCT FROM OLD.is_pro THEN
        -- Allow only service_role (or superuser/internal postgres) to modify is_pro
        IF auth.role() = 'authenticated' OR auth.role() = 'anon' THEN
            RAISE EXCEPTION 'Access denied: profiles.is_pro is server-authoritative and can only be modified by the service_role.'
                USING ERRCODE = '42501';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS trg_protect_profiles_is_pro ON public.profiles;
CREATE TRIGGER trg_protect_profiles_is_pro
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_profiles_is_pro();

-- ---------------------------------------------------------------------
-- 3. USER LICENSES TRACKING TABLE (BOUND TO LEMON SQUEEZY)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_licenses (
    id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    license_key_hash TEXT NOT NULL,
    lemon_order_id TEXT,
    lemon_subscription_id TEXT,
    lemon_customer_id TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    instance_id TEXT,
    activated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    expires_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    CONSTRAINT user_licenses_user_key_unique UNIQUE (user_id, license_key_hash)
);

CREATE INDEX IF NOT EXISTS idx_user_licenses_user_id ON public.user_licenses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_licenses_status ON public.user_licenses(status);

ALTER TABLE public.user_licenses ENABLE ROW LEVEL SECURITY;

-- Deny all by default, allow authenticated users to SELECT only their own active licenses
REVOKE ALL ON public.user_licenses FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.user_licenses TO authenticated;

DROP POLICY IF EXISTS "user_licenses_read_own" ON public.user_licenses;
CREATE POLICY "user_licenses_read_own" ON public.user_licenses
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 4. SERVICE-ROLE RPC: SET PRO STATUS & SYNC LICENSE
-- SECURITY DEFINER, search_path='', executable ONLY by service_role
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_profile_pro_status(
    p_user_id UUID,
    p_is_pro BOOLEAN,
    p_license_key_hash TEXT DEFAULT NULL,
    p_lemon_order_id TEXT DEFAULT NULL,
    p_lemon_sub_id TEXT DEFAULT NULL,
    p_lemon_cust_id TEXT DEFAULT NULL,
    p_instance_id TEXT DEFAULT NULL,
    p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles
    SET is_pro = p_is_pro,
        updated_at = pg_catalog.now()
    WHERE id = p_user_id;

    IF p_license_key_hash IS NOT NULL THEN
        INSERT INTO public.user_licenses (
            user_id,
            license_key_hash,
            lemon_order_id,
            lemon_subscription_id,
            lemon_customer_id,
            status,
            instance_id,
            activated_at,
            expires_at,
            updated_at
        ) VALUES (
            p_user_id,
            p_license_key_hash,
            p_lemon_order_id,
            p_lemon_sub_id,
            p_lemon_cust_id,
            CASE WHEN p_is_pro THEN 'active' ELSE 'revoked' END,
            p_instance_id,
            pg_catalog.now(),
            p_expires_at,
            pg_catalog.now()
        )
        ON CONFLICT (user_id, license_key_hash) DO UPDATE
        SET status = CASE WHEN p_is_pro THEN 'active' ELSE 'revoked' END,
            lemon_order_id = COALESCE(EXCLUDED.lemon_order_id, user_licenses.lemon_order_id),
            lemon_subscription_id = COALESCE(EXCLUDED.lemon_subscription_id, user_licenses.lemon_subscription_id),
            lemon_customer_id = COALESCE(EXCLUDED.lemon_customer_id, user_licenses.lemon_customer_id),
            instance_id = COALESCE(EXCLUDED.instance_id, user_licenses.instance_id),
            expires_at = COALESCE(EXCLUDED.expires_at, user_licenses.expires_at),
            updated_at = pg_catalog.now();
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION public.set_profile_pro_status FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_profile_pro_status TO service_role;
