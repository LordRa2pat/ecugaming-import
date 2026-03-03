-- ============================================================
-- ECUGAMING IMPORT v2.0 — Full Migration
-- Run in Supabase SQL Editor (Frankfurt / eu-central-1)
-- WARNING: Drops and recreates products, users, orders tables
-- ============================================================

-- Step 0: Preserve existing products data before dropping
CREATE TABLE IF NOT EXISTS _products_backup AS
  SELECT * FROM products;

-- Step 1: Drop old tables (CASCADE removes dependent foreign keys)
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS products CASCADE;

-- Step 2: Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES (mirrors auth.users — never store passwords here)
-- ============================================================
CREATE TABLE profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name  TEXT NOT NULL DEFAULT '',
    last_name   TEXT NOT NULL DEFAULT '',
    email       TEXT NOT NULL,
    phone       TEXT NOT NULL DEFAULT '',
    cedula      TEXT NOT NULL DEFAULT '',
    role        TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ADDRESSES (customer shipping addresses book)
-- ============================================================
CREATE TABLE addresses (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    label       TEXT NOT NULL DEFAULT 'Casa',
    province    TEXT NOT NULL DEFAULT '',
    city        TEXT NOT NULL DEFAULT '',
    address1    TEXT NOT NULL DEFAULT '',
    address2    TEXT NOT NULL DEFAULT '',
    reference   TEXT NOT NULL DEFAULT '',
    is_default  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_addresses_user ON addresses(user_id);

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE categories (
    id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name    TEXT NOT NULL,
    slug    TEXT UNIQUE NOT NULL,
    sort    INTEGER NOT NULL DEFAULT 0
);

INSERT INTO categories (name, slug, sort) VALUES
    ('iPhone',      'iphone',      1),
    ('Consolas',    'consolas',    2),
    ('Juegos',      'juegos',      3),
    ('Accesorios',  'accesorios',  4),
    ('Laptops',     'laptops',     5),
    ('Retro',       'retro',       6),
    ('General',     'general',     99);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE products (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL,
    slug        TEXT UNIQUE,
    category_id UUID REFERENCES categories(id),
    brand       TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    specs       JSONB NOT NULL DEFAULT '{}',
    price       NUMERIC(10,2) NOT NULL DEFAULT 0,
    sale_price  NUMERIC(10,2),
    stock       INTEGER NOT NULL DEFAULT 0,
    badge       TEXT CHECK (badge IN ('Súper OFERTA', 'Remate', 'Nuevo')),
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active   ON products(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_products_badge    ON products(badge) WHERE badge IS NOT NULL;

-- ============================================================
-- PRODUCT IMAGES (Supabase Storage paths — NO base64)
-- ============================================================
CREATE TABLE product_images (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    storage_path    TEXT NOT NULL,
    sort            INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_product_images_product ON product_images(product_id);

-- ============================================================
-- COUPONS
-- ============================================================
CREATE TABLE coupons (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code                TEXT UNIQUE NOT NULL,
    type                TEXT NOT NULL CHECK (type IN ('percent', 'fixed')),
    value               NUMERIC(10,2) NOT NULL DEFAULT 0,
    free_shipping       BOOLEAN NOT NULL DEFAULT FALSE,
    starts_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ends_at             TIMESTAMPTZ,
    max_redemptions     INTEGER,
    redemption_count    INTEGER NOT NULL DEFAULT 0,
    min_subtotal        NUMERIC(10,2) NOT NULL DEFAULT 0,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE
);

-- Seed: ECU10 (10% descuento + envio gratis, siempre activo)
INSERT INTO coupons (code, type, value, free_shipping, is_active)
VALUES ('ECU10', 'percent', 10, TRUE, TRUE);

-- ============================================================
-- SETTINGS (key-value store for store configuration)
-- ============================================================
CREATE TABLE settings (
    key     TEXT PRIMARY KEY,
    value   JSONB NOT NULL DEFAULT '{}'
);

INSERT INTO settings (key, value) VALUES
    ('free_shipping_threshold', '500'),
    ('shipping_cost',           '5.00'),
    ('bank_accounts', '[{"bank":"Banco Pichincha","type":"Ahorro","number":"2215246840","cedula":"1714003660","beneficiary":"Morocho Acosta Luis Eduardo"}]'),
    ('crypto_wallets', '[{"network":"Binance Pay","address":"","qr":""},{"network":"USDT TRC20","address":"","qr":""},{"network":"Bitcoin","address":"","qr":""}]'),
    ('whatsapp',               '"+593962609951"'),
    ('store_name',             '"EcuGaming Import"'),
    ('shipping_topbar_text',   '"Envío gratis en pedidos sobre $500 · Servientrega & Tramaco Express"'),
    ('n8n_news_webhook',       '"https://n8n-n8n.tlsfxv.easypanel.host/webhook/get-news"');

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE orders (
    id                  TEXT PRIMARY KEY,
    user_id             UUID REFERENCES profiles(id),
    status              TEXT NOT NULL DEFAULT 'confirmando_pago'
                            CHECK (status IN (
                                'confirmando_pago',
                                'orden_confirmada',
                                'empacando',
                                'enviado',
                                'recibido',
                                'cancelado'
                            )),
    payment_method      TEXT NOT NULL DEFAULT 'transferencia'
                            CHECK (payment_method IN ('transferencia', 'cripto')),
    payment_status      TEXT NOT NULL DEFAULT 'pending'
                            CHECK (payment_status IN ('pending', 'paid', 'failed')),
    coupon_code         TEXT,
    discount_total      NUMERIC(10,2) NOT NULL DEFAULT 0,
    shipping_total      NUMERIC(10,2) NOT NULL DEFAULT 0,
    subtotal            NUMERIC(10,2) NOT NULL DEFAULT 0,
    total               NUMERIC(10,2) NOT NULL DEFAULT 0,
    carrier             TEXT CHECK (carrier IN ('Servientrega', 'Tramaco Express', 'Cooperativa')),
    carrier_agency_name TEXT NOT NULL DEFAULT '',
    tracking_code       TEXT NOT NULL DEFAULT '',
    shipping_address    JSONB NOT NULL DEFAULT '{}',
    notes               TEXT NOT NULL DEFAULT '',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_orders_user    ON orders(user_id);
CREATE INDEX idx_orders_status  ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

-- ============================================================
-- ORDER ITEMS
-- ============================================================
CREATE TABLE order_items (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id            TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id          UUID REFERENCES products(id),
    product_snapshot    JSONB NOT NULL,
    unit_price          NUMERIC(10,2) NOT NULL,
    qty                 INTEGER NOT NULL DEFAULT 1,
    line_total          NUMERIC(10,2) NOT NULL
);
CREATE INDEX idx_order_items_order ON order_items(order_id);

-- ============================================================
-- ORDER STATUS EVENTS (audit trail / timeline)
-- ============================================================
CREATE TABLE order_status_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id        TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status          TEXT NOT NULL,
    note            TEXT NOT NULL DEFAULT '',
    actor_user_id   UUID REFERENCES profiles(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_status_events_order ON order_status_events(order_id);

-- ============================================================
-- PAYMENT PROOFS
-- ============================================================
CREATE TABLE payment_proofs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id    TEXT NOT NULL REFERENCES orders(id),
    method      TEXT NOT NULL,
    bank        TEXT NOT NULL DEFAULT '',
    txid        TEXT NOT NULL DEFAULT '',
    proof_path  TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_payment_proofs_order ON payment_proofs(order_id);

-- ============================================================
-- TRIGGERS: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TRIGGER: auto-create profile on Supabase Auth signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, first_name, last_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', '')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses            ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories           ENABLE ROW LEVEL SECURITY;
ALTER TABLE products             ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images       ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons              ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders               ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_proofs       ENABLE ROW LEVEL SECURITY;

-- Helper: check if the calling user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---- PROFILES ----
CREATE POLICY "profiles_owner_select" ON profiles
    FOR SELECT USING (auth.uid() = id OR is_admin());
CREATE POLICY "profiles_owner_update" ON profiles
    FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_service_all" ON profiles
    FOR ALL USING (auth.role() = 'service_role');

-- ---- ADDRESSES ----
CREATE POLICY "addresses_owner_all" ON addresses
    FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "addresses_admin_all" ON addresses
    FOR ALL USING (is_admin());
CREATE POLICY "addresses_service_all" ON addresses
    FOR ALL USING (auth.role() = 'service_role');

-- ---- CATEGORIES ----
CREATE POLICY "categories_public_select" ON categories
    FOR SELECT USING (true);
CREATE POLICY "categories_admin_all" ON categories
    FOR ALL USING (is_admin() OR auth.role() = 'service_role');

-- ---- PRODUCTS ----
CREATE POLICY "products_public_select_active" ON products
    FOR SELECT USING (is_active = true OR is_admin() OR auth.role() = 'service_role');
CREATE POLICY "products_admin_all" ON products
    FOR ALL USING (is_admin() OR auth.role() = 'service_role');

-- ---- PRODUCT IMAGES ----
CREATE POLICY "product_images_public_select" ON product_images
    FOR SELECT USING (true);
CREATE POLICY "product_images_admin_all" ON product_images
    FOR ALL USING (is_admin() OR auth.role() = 'service_role');

-- ---- COUPONS ----
CREATE POLICY "coupons_admin_all" ON coupons
    FOR ALL USING (is_admin() OR auth.role() = 'service_role');

-- ---- SETTINGS ----
CREATE POLICY "settings_public_select" ON settings
    FOR SELECT USING (true);
CREATE POLICY "settings_admin_insert" ON settings
    FOR INSERT WITH CHECK (is_admin() OR auth.role() = 'service_role');
CREATE POLICY "settings_admin_update" ON settings
    FOR UPDATE USING (is_admin() OR auth.role() = 'service_role');

-- ---- ORDERS ----
CREATE POLICY "orders_owner_select" ON orders
    FOR SELECT USING (auth.uid() = user_id OR is_admin() OR auth.role() = 'service_role');
CREATE POLICY "orders_service_insert" ON orders
    FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "orders_admin_update" ON orders
    FOR UPDATE USING (is_admin() OR auth.role() = 'service_role');

-- ---- ORDER ITEMS ----
CREATE POLICY "order_items_owner_select" ON order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_items.order_id
              AND (orders.user_id = auth.uid() OR is_admin())
        )
        OR auth.role() = 'service_role'
    );
CREATE POLICY "order_items_service_insert" ON order_items
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ---- ORDER STATUS EVENTS ----
CREATE POLICY "events_owner_select" ON order_status_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_status_events.order_id
              AND (orders.user_id = auth.uid() OR is_admin())
        )
        OR auth.role() = 'service_role'
    );
CREATE POLICY "events_admin_insert" ON order_status_events
    FOR INSERT WITH CHECK (is_admin() OR auth.role() = 'service_role');

-- ---- PAYMENT PROOFS ----
CREATE POLICY "proofs_owner_select" ON payment_proofs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = payment_proofs.order_id
              AND orders.user_id = auth.uid()
        )
        OR is_admin() OR auth.role() = 'service_role'
    );
CREATE POLICY "proofs_owner_insert" ON payment_proofs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = payment_proofs.order_id
              AND orders.user_id = auth.uid()
        )
        OR auth.role() = 'service_role'
    );
CREATE POLICY "proofs_admin_all" ON payment_proofs
    FOR ALL USING (is_admin() OR auth.role() = 'service_role');

-- ============================================================
-- POST-MIGRATION INSTRUCTIONS
-- ============================================================
-- 1. Set admin user:
--    UPDATE profiles SET role = 'admin' WHERE email = 'your_admin@email.com';
--
-- 2. Migrate existing products:
--    node scripts/migrate_products_v2.js
--
-- 3. Supabase Dashboard:
--    a) Storage > New Bucket: 'product-images'  (Public = ON)
--    b) Storage > New Bucket: 'payment-proofs'  (Public = OFF)
--    c) Authentication > Settings: Disable email confirmations (for dev)
--    d) Authentication > URL Configuration: Add your Vercel domain
--
-- 4. Storage RLS for 'product-images':
--    Allow public SELECT (policy: true)
--    Allow service_role/admin INSERT, UPDATE, DELETE
--
-- 5. Storage RLS for 'payment-proofs':
--    Allow authenticated users INSERT (to their own path)
--    Allow admin/service_role all
-- ============================================================
