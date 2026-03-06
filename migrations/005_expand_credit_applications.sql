-- Migration 005: Expand credit_applications table and add document storage columns
-- Run in Supabase SQL Editor

ALTER TABLE credit_applications
    ADD COLUMN IF NOT EXISTS whatsapp            text,
    ADD COLUMN IF NOT EXISTS estado_civil        text,
    ADD COLUMN IF NOT EXISTS ocupacion           text,
    ADD COLUMN IF NOT EXISTS lugar_trabajo       text,
    ADD COLUMN IF NOT EXISTS tiempo_en_trabajo   text,
    ADD COLUMN IF NOT EXISTS referencia_personal text,
    ADD COLUMN IF NOT EXISTS entrada_inicial     numeric(10,2),
    ADD COLUMN IF NOT EXISTS cedula_frontal      text, -- Storage path
    ADD COLUMN IF NOT EXISTS cedula_reverso      text, -- Storage path
    ADD COLUMN IF NOT EXISTS selfie_cedula       text, -- Storage path
    ADD COLUMN IF NOT EXISTS planilla_servicios  text, -- Storage path
    ADD COLUMN IF NOT EXISTS certificado_laboral text; -- Storage path

-- Backfill data (if some records exist in old columns)
UPDATE credit_applications
SET
    whatsapp = COALESCE(whatsapp, phone),
    ocupacion = COALESCE(ocupacion, situacion_laboral),
    lugar_trabajo = COALESCE(lugar_trabajo, empleador),
    entrada_inicial = COALESCE(entrada_inicial, cuota_entrada);

-- Storage bucket for credit documents
-- (Note: Storage buckets are usually created via Supabase Dash, but this is a note)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('credit-docs', 'credit-docs', false) ON CONFLICT DO NOTHING;
