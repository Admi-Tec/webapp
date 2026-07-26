// Central place for the site's public identity — SEO metadata (canonical URLs,
// Open Graph, sitemap, robots.txt) all read from here so there's one spot to
// update once a production domain exists.
//
// No custom domain is configured yet, so this falls back to a placeholder.
// Set VITE_SITE_URL (in .env and in the deploy platform's env vars) to the
// real production origin once one exists — everything else picks it up
// automatically, no other code changes needed.
const rawSiteUrl = import.meta.env.VITE_SITE_URL || "https://admi-tec.com";
export const SITE_URL = rawSiteUrl.replace(/\/$/, "");
export const SITE_NAME = "Admi-Tec";
// Correo de contacto mostrado donde aún no hay flujo automatizado (ej. el
// botón "Suscribirme" antes de integrar la pasarela de pago). Configura
// VITE_CONTACT_EMAIL en .env con el correo real cuando exista.
export const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || "contact@admi-tec.com";
// Redes sociales y WhatsApp de contacto. Igual que CONTACT_EMAIL: valores
// placeholder hasta que existan las cuentas reales — configura las VITE_* en
// .env y en el entorno de deploy y todo el sitio las toma automáticamente.
export const SOCIAL_LINKS = {
  instagram: import.meta.env.VITE_INSTAGRAM_URL || "https://instagram.com/admitec.pe",
  tiktok: import.meta.env.VITE_TIKTOK_URL || "https://tiktok.com/@admitec.pe",
  // Número en formato internacional sin "+" (51 = Perú) para el enlace wa.me.
  whatsapp: import.meta.env.VITE_WHATSAPP_URL || "https://wa.me/51999999999",
} as const;
export const SITE_DESCRIPTION =
  "Exámenes oficiales, simulacros ilimitados de todos tus cursos y ranking anónimo para tu admisión a la UNI, San Marcos, PUCP, UNALM y más.";

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function pageTitle(pageTitleText: string): string {
  return `${pageTitleText} · ${SITE_NAME}`;
}

// Standard bundle of per-page SEO tags (title, description, Open Graph,
// Twitter Card, canonical link) so every route's head() stays a one-liner
// instead of repeating the same eight tags. Pass noindex for pages that
// shouldn't be crawled (auth screens, search results, redirect stubs).
export function pageMeta({
  path,
  title,
  description,
  noindex,
  rawTitle = false,
}: {
  path: string;
  title: string;
  description?: string;
  noindex?: boolean;
  /** Use `title` verbatim instead of appending " · Admi-Tec" — for the homepage,
   * where the brand belongs first (and search engines truncate the tail anyway). */
  rawTitle?: boolean;
}) {
  const fullTitle = rawTitle ? title : pageTitle(title);
  const url = absoluteUrl(path);
  const meta: Array<Record<string, string>> = [{ title: fullTitle }];
  if (description) {
    meta.push({ name: "description", content: description });
    meta.push({ property: "og:description", content: description });
    meta.push({ name: "twitter:description", content: description });
  }
  meta.push({ property: "og:title", content: fullTitle });
  meta.push({ property: "og:url", content: url });
  meta.push({ name: "twitter:title", content: fullTitle });
  if (noindex) meta.push({ name: "robots", content: "noindex, nofollow" });
  return {
    meta,
    links: [{ rel: "canonical", href: url }],
  };
}
