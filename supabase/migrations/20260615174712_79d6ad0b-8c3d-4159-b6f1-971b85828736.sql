
DROP POLICY IF EXISTS "avatars public read" ON storage.objects;
DROP POLICY IF EXISTS "avatars read" ON storage.objects;
DROP POLICY IF EXISTS "avatars upload" ON storage.objects;
DROP POLICY IF EXISTS "avatars update" ON storage.objects;
DROP POLICY IF EXISTS "avatars delete" ON storage.objects;
DROP POLICY IF EXISTS "habit-icons public read" ON storage.objects;
DROP POLICY IF EXISTS "habit-icons read" ON storage.objects;
DROP POLICY IF EXISTS "habit-icons upload" ON storage.objects;
DROP POLICY IF EXISTS "habit-icons update" ON storage.objects;
DROP POLICY IF EXISTS "habit-icons delete" ON storage.objects;

CREATE POLICY "avatars read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "habit-icons read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'habit-icons' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "habit-icons upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'habit-icons' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "habit-icons update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'habit-icons' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'habit-icons' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "habit-icons delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'habit-icons' AND auth.uid()::text = (storage.foldername(name))[1]);
