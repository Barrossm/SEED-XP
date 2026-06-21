
-- Add category to missions
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'geral';

-- Add proof image URL to mission_completions
ALTER TABLE public.mission_completions ADD COLUMN IF NOT EXISTS proof_image_url text;

-- Create storage bucket for mission proofs
INSERT INTO storage.buckets (id, name, public) VALUES ('mission-proofs', 'mission-proofs', true);

-- Storage policies
CREATE POLICY "Authenticated users can upload proofs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'mission-proofs' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'mission-proofs');

CREATE POLICY "Users can update their own proofs"
ON storage.objects FOR UPDATE
USING (bucket_id = 'mission-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);
