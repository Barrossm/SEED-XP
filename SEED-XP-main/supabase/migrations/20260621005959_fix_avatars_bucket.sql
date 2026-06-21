-- ========================================
-- FIX BUCKET AVATARS
-- ========================================

-- Garante que a coluna existe
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Cria o bucket de avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Garante que o bucket está público
UPDATE storage.buckets 
SET public = true 
WHERE id = 'avatars';

-- Remove policies antigas para evitar conflito
DROP POLICY IF EXISTS "Avatars públicos" ON storage.objects;
DROP POLICY IF EXISTS "Upload avatar próprio" ON storage.objects;
DROP POLICY IF EXISTS "Update avatar próprio" ON storage.objects;

-- Cria as policies
CREATE POLICY "Avatars públicos" 
  ON storage.objects FOR SELECT 
  USING ( bucket_id = 'avatars' );

CREATE POLICY "Upload avatar próprio" 
  ON storage.objects FOR INSERT 
  WITH CHECK ( bucket_id = 'avatars' );

CREATE POLICY "Update avatar próprio" 
  ON storage.objects FOR UPDATE 
  USING ( bucket_id = 'avatars' );