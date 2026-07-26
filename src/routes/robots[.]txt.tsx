import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/site";

// Everything under _authenticated (panel, perfil, admin, practica, examen,
// examen-sesion, simulacro, favoritas, ranking, onboarding) requires a login
// anyway — an unauthenticated crawler just hits the auth redirect, so
// disallowing it outright saves crawl budget rather than relying on a
// noindex tag it would never get to see. /buscar and /restablecer-password
// use a noindex meta tag instead (see their route files) since Disallow
// would hide that tag from crawlers and can leave a bare URL indexed anyway.
const ROBOTS_TXT = `User-agent: *
Disallow: /panel
Disallow: /perfil
Disallow: /favoritas
Disallow: /ranking
Disallow: /onboarding
Disallow: /practica/
Disallow: /examen/
Disallow: /examen-sesion/
Disallow: /simulacro/
Disallow: /admin/

Sitemap: ${SITE_URL}/sitemap.xml
`;

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () =>
        new Response(ROBOTS_TXT, {
          headers: { "content-type": "text/plain; charset=utf-8" },
        }),
    },
  },
});
