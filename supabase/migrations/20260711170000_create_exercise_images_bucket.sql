-- The "exercise-images public read"/"admin insert"/etc. policies
-- (20260630193643_...) reference bucket_id = 'exercise-images', but never
-- actually created the bucket itself — it was likely provisioned by hand in
-- a previous Supabase project via the old Lovable Cloud sync, which this app
-- no longer connects to (see CLAUDE.md). Recreating it here so uploads work
-- in any environment this migration runs against ("Bucket not found").
--
-- public = false: reads only ever happen through the existing RLS-gated
-- signed-URL flow (getExerciseImageUrl → createSignedUrl), matching how the
-- app already accesses these images — not through the bucket's separate
-- always-open getPublicUrl path.
--
-- file_size_limit / allowed_mime_types mirror MAX_IMAGE_BYTES and
-- ALLOWED_IMAGE_TYPES in src/lib/storage.ts server-side: the admin-insert
-- policy only checks bucket_id + role, not file type/size, so without this
-- the client-side validation was the only check in place.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exercise-images',
  'exercise-images',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;
