-- Migration 003: Add security/tracking columns missing from initial schema
-- Run in Supabase SQL Editor
-- This fixes the admin-orders page not loading (columns were selected but didn't exist)

-- ── profiles: is_banned + last_ip ──────────────────────────
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS is_banned  BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS last_ip    TEXT;

-- ── orders: ip_address ──────────────────────────────────────
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS ip_address TEXT;

-- ── banned_ips table (used by security middleware) ──────────
CREATE TABLE IF NOT EXISTS banned_ips (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ip         TEXT NOT NULL UNIQUE,
    reason     TEXT,
    banned_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_banned_ips_ip ON banned_ips(ip);

-- RLS for banned_ips
ALTER TABLE banned_ips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "banned_ips_service_all" ON banned_ips
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "banned_ips_admin_all" ON banned_ips
    FOR ALL TO authenticated
    USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
    WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ── payment_method: allow 'paypal' ──────────────────────────
-- (checkout added PayPal but schema constraint only allows transferencia/cripto)
ALTER TABLE orders
    DROP CONSTRAINT IF EXISTS orders_payment_method_check;

ALTER TABLE orders
    ADD CONSTRAINT orders_payment_method_check
    CHECK (payment_method IN ('transferencia', 'cripto', 'paypal'));
