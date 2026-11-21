CREATE TABLE public.user_notes (
  user_id uuid PRIMARY KEY,
  notes jsonb NOT NULL DEFAULT '[]'::jsonb,
  connections jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_notes TO authenticated;
GRANT ALL ON public.user_notes TO service_role;

ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read their notes" ON public.user_notes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners create their notes" ON public.user_notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update their notes" ON public.user_notes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners delete their notes" ON public.user_notes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Owners read their media" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'note-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Owners upload their media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'note-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Owners update their media" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'note-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Owners delete their media" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'note-media' AND (storage.foldername(name))[1] = auth.uid()::text);