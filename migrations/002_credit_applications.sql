-- Migration 002: credit_applications table
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS credit_applications (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    status          text NOT NULL DEFAULT 'pendiente'
                    CHECK (status IN ('pendiente', 'en_revision', 'aprobado', 'rechazado')),

    -- Personal data
    nombres         text,
    apellidos       text,
    cedula          text,
    fecha_nacimiento date,
    phone           text,
    email           text,
    provincia       text,
    ciudad          text,
    direccion       text,

    -- Economic data
    situacion_laboral  text,
    empleador          text,
    ingresos_mensuales numeric(10,2),
    gastos_mensuales   numeric(10,2),

    -- Product & credit terms
    product_name    text,
    product_price   numeric(10,2),
    cuota_entrada   numeric(10,2),
    monto_financiar numeric(10,2),
    plazo_meses     int,
    cuota_mensual   numeric(10,2),
    total_pagar     numeric(10,2),

    -- Admin
    admin_note      text,
    reviewed_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,

    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_credit_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_credit_updated_at ON credit_applications;
CREATE TRIGGER trg_credit_updated_at
    BEFORE UPDATE ON credit_applications
    FOR EACH ROW EXECUTE FUNCTION update_credit_updated_at();

-- RLS: only service_role and admin can read/write
ALTER TABLE credit_applications ENABLE ROW LEVEL SECURITY;

-- Service role has full access (used by API)
CREATE POLICY "service_role all" ON credit_applications
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated admins can read and update
CREATE POLICY "admin read" ON credit_applications
    FOR SELECT TO authenticated
    USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "admin update" ON credit_applications
    FOR UPDATE TO authenticated
    USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Index for status filter
CREATE INDEX IF NOT EXISTS idx_credit_apps_status ON credit_applications(status);
CREATE INDEX IF NOT EXISTS idx_credit_apps_created_at ON credit_applications(created_at DESC);
