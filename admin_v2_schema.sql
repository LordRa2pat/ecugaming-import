-- ============================================================
-- ECUGAMING MEGA ADMIN v3.5 — Expansion Schema
-- ============================================================

-- Security: IP Banning
CREATE TABLE IF NOT EXISTS banned_ips (
    ip_address  TEXT PRIMARY KEY,
    reason      TEXT,
    banned_by   UUID REFERENCES profiles(id),
    banned_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics & Tracking: User Activity / Audit Trail
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id    UUID REFERENCES profiles(id),
    action      TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'BAN'
    entity      TEXT NOT NULL, -- 'product', 'order', 'coupon', 'ip'
    entity_id   TEXT,
    old_data    JSONB,
    new_data    JSONB,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Marketing: Hero Banners
CREATE TABLE IF NOT EXISTS banners (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title       TEXT,
    image_url   TEXT NOT NULL,
    link_url    TEXT,
    is_active   BOOLEAN DEFAULT TRUE,
    sort_order  INTEGER DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Content: Global FAQ / News
CREATE TABLE IF NOT EXISTS store_news (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title       TEXT NOT NULL,
    content     TEXT NOT NULL,
    image_url   TEXT,
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- User Experience: Reviews & Ratings
CREATE TABLE IF NOT EXISTS product_reviews (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id  UUID REFERENCES products(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
    rating      INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment     TEXT,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Add Columns to existing tables
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_ip TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;

-- Helper RLS Function for IP Banning
CREATE OR REPLACE FUNCTION is_request_banned(req_ip TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM banned_ips WHERE ip_address = req_ip);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
