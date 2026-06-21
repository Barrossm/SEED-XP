
DROP POLICY IF EXISTS "post-images public read" ON storage.objects;
DROP POLICY IF EXISTS "post-images authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "post-images owner delete" ON storage.objects;

CREATE POLICY "post-images authenticated read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'post-images');

CREATE POLICY "post-images authenticated upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "post-images owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);
