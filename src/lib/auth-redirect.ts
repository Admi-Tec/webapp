// Supabase redirects the browser back here with auth state encoded either in the URL
// hash (implicit flow: `#access_token=...&type=signup`, or `#error=...&error_description=...`
// on failure) or in the query string (PKCE flow: `?code=...`, or `?error=...` on failure).
// We check both instead of assuming one, since supabase-js's own `detectSessionInUrl`
// consumes/clears whichever one applies asynchronously — we capture both once at module
// load (before anything else can touch them) purely to show the student what happened;
// we never re-read or clear the URL ourselves.
function readParams(raw: string): URLSearchParams | null {
  return raw.length > 1 ? new URLSearchParams(raw.slice(1)) : null;
}

const hashParams = typeof window !== "undefined" ? readParams(window.location.hash) : null;
const queryParams = typeof window !== "undefined" ? readParams(window.location.search) : null;

const hashHasSignal = !!hashParams && (hashParams.has("error") || hashParams.has("access_token"));
const queryHasSignal = !!queryParams && (queryParams.has("error") || queryParams.has("code"));

export const capturedAuthParams: URLSearchParams | null = hashHasSignal
  ? hashParams
  : queryHasSignal
    ? queryParams
    : null;

// Which signal proves this redirect actually carries auth state (as opposed to some
// unrelated `?code=` or `#...` on the URL) — `access_token` for the hash/implicit flow,
// `code` for the query/PKCE flow.
export const capturedAuthHasSession: boolean = hashHasSignal
  ? !!hashParams?.has("access_token")
  : queryHasSignal
    ? !!queryParams?.has("code")
    : false;

export function translateHashAuthError(params: URLSearchParams): string {
  const code = params.get("error_code") ?? "";
  const error = params.get("error") ?? "";
  const description = params.get("error_description");

  if (code === "otp_expired") {
    return "El enlace de confirmación expiró. Inicia sesión con tu correo y contraseña; si no puedes, contáctanos para reenviarlo.";
  }
  if (error === "access_denied") {
    return "Ese enlace de confirmación ya no es válido (puede que ya se haya usado antes), o cancelaste el acceso con Google.";
  }
  if (description) {
    return decodeURIComponent(description.replace(/\+/g, " "));
  }
  return "No se pudo confirmar tu correo. Inténtalo de nuevo.";
}
