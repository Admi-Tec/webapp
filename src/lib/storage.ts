import { supabase } from "@/integrations/supabase/client";

export const EXERCISE_IMAGES_BUCKET = "exercise-images";

// crypto.randomUUID() only exists in secure contexts (HTTPS, or the literal
// host "localhost") — it's undefined when the admin panel is opened over
// plain HTTP via a LAN IP or a non-localhost hostname, which throws
// "crypto.randomUUID is not a function" and breaks every upload.
//
// The "exercise-images public read" storage policy grants anon+authenticated
// SELECT on every object in this bucket with no per-row check (see
// 20260630193643_...sql) — the filename is the *only* thing standing between
// "you have the link" and "you can list every exercise's solution image," so
// it must stay unguessable. crypto.getRandomValues() gives the same
// cryptographic strength as randomUUID() (here, more: 128 random bits vs
// UUIDv4's 122) without the secure-context restriction — unlike
// Math.random(), which is a non-cryptographic PRNG with recoverable internal
// state and must never back an access-control-relevant identifier.
function uniqueFileId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/svg+xml",
];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return "Formato no permitido. Usa JPG, PNG, WebP o SVG.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `La imagen excede 5MB (${(file.size / 1024 / 1024).toFixed(1)}MB).`;
  }
  return null;
}

export async function uploadExerciseImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `${uniqueFileId()}.${ext}`;
  const { error } = await supabase.storage
    .from(EXERCISE_IMAGES_BUCKET)
    .upload(path, file, { cacheControl: "31536000", upsert: false, contentType: file.type });
  if (error) throw new Error(error.message);
  return path;
}

export async function uploadUniversityLogo(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `logos/${uniqueFileId()}.${ext}`;
  const { error } = await supabase.storage
    .from(EXERCISE_IMAGES_BUCKET)
    .upload(path, file, { cacheControl: "31536000", upsert: false, contentType: file.type });
  if (error) throw new Error(error.message);
  return path;
}

// The bucket is public (its RLS policy already grants anon+authenticated
// unconditional read, so a signed URL added no real access control — see
// 20260711180000_exercise_images_bucket_public.sql), so this is a stable,
// cacheable URL rather than a signed one carrying a fresh, expiring token on
// every call: a signed URL's token changes on every request, which defeats
// HTTP caching and means every page load re-downloads every image.
export async function getExerciseImageUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { data } = supabase.storage.from(EXERCISE_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteExerciseImage(path: string): Promise<void> {
  await supabase.storage.from(EXERCISE_IMAGES_BUCKET).remove([path]);
}
