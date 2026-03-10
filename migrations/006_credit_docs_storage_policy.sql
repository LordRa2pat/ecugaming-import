-- Migration 006: Allow anonymous uploads to credit-docs storage bucket
-- Run in Supabase SQL Editor
-- This enables the frontend (using anon key) to upload documents directly
-- to Supabase Storage, bypassing the Vercel 4.5MB body size limit.

-- 1. Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('credit-docs', 'credit-docs', false)
ON CONFLICT DO NOTHING;

-- 2. Allow anyone to upload (insert) files into credit-docs/applications/
-- Documents are private (not publicly readable) but anyone can submit
CREATE POLICY "allow_anon_upload_credit_docs"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'credit-docs');

-- 3. Only service_role and authenticated admins can read documents
CREATE POLICY "admin_read_credit_docs"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'credit-docs'
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- 4. Service role always has full access (used by API server)
CREATE POLICY "service_role_credit_docs"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'credit-docs')
WITH CHECK (bucket_id = 'credit-docs');
