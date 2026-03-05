-- Migration 003 v2: Fix security columns (corrected column names to match API)
-- Run this in Supabase SQL Editor (replaces 003_security_columns.sql)

-- ── profiles: is_banned + last_ip ──────────────────────────
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS is_banned  BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS last_ip    TEXT;

-- ── orders: ip_address ──────────────────────────────────────
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS ip_address TEXT;

-- ── banned_ips: drop and recreate with correct column names ─
-- The API uses: ip_address, reason, banned_by, banned_at
DROP TABLE IF EXISTS banned_ips CASCADE;

CREATE TABLE banned_ips (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address  TEXT NOT NULL UNIQUE,
    reason      TEXT,
    banned_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    banned_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_banned_ips_ip ON banned_ips(ip_address);

ALTER TABLE banned_ips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "banned_ips_service_all" ON banned_ips
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "banned_ips_admin_all" ON banned_ips
    FOR ALL TO authenticated
    USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
    WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ── payment_method: allow 'paypal' ──────────────────────────
ALTER TABLE orders
    DROP CONSTRAINT IF EXISTS orders_payment_method_check;

ALTER TABLE orders
    ADD CONSTRAINT orders_payment_method_check
    CHECK (payment_method IN ('transferencia', 'cripto', 'paypal'));
