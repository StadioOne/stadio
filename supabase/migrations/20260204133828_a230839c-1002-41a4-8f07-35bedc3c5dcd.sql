-- Create bucket for event images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('event-images', 'event-images', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Policy: public read access
CREATE POLICY "Public read access for event images"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-images');

-- Policy: authenticated users can upload (admins verified in edge function)
CREATE POLICY "Authenticated users can upload event images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'event-images' 
  AND auth.role() = 'authenticated'
);

-- Policy: authenticated users can update their uploads
CREATE POLICY "Authenticated users can update event images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'event-images' AND auth.role() = 'authenticated');

-- Policy: authenticated users can delete
CREATE POLICY "Authenticated users can delete event images"
ON storage.objects FOR DELETE
USING (bucket_id = 'event-images' AND auth.role() = 'authenticated');