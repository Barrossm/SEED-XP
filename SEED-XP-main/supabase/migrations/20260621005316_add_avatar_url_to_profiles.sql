-- ========================================
-- FOTO DE PERFIL - VERSÃO LIMPA
-- ========================================

-- Adiciona coluna avatar_url
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Cria bucket de avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Remove policies antigas (se existirem)
DROP POLICY IF EXISTS "Avatars públicos" ON storage.objects;
DROP POLICY IF EXISTS "Upload avatar próprio" ON storage.objects;
DROP POLICY IF EXISTS "Update avatar próprio" ON storage.objects;

-- Cria policies novas
CREATE POLICY "Avatars públicos" 
  ON storage.objects FOR SELECT 
  USING ( bucket_id = 'avatars' );

CREATE POLICY "Upload avatar próprio" 
  ON storage.objects FOR INSERT 
  WITH CHECK ( bucket_id = 'avatars' );

CREATE POLICY "Update avatar próprio" 
  ON storage.objects FOR UPDATE 
  USING ( bucket_id = 'avatars' );