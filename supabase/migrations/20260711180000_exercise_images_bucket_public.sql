-- The "exercise-images public read" policy (20260630193643_...) already grants
-- anon + authenticated unconditional SELECT on every object in this bucket —
-- there's no per-row check, so an unauthenticated caller can already generate
-- a signed URL (and therefore read) any object here today. Flipping the
-- bucket's own public flag doesn't open anything that RLS wasn't already
-- exposing; it just lets the app use getPublicUrl() (a stable, cacheable URL
-- with no signing round-trip and no expiring token) instead of
-- createSignedUrl(), which regenerates a different token — and therefore a
-- different URL, defeating HTTP caching — on every single request.
UPDATE storage.buckets SET public = true WHERE id = 'exercise-images';
