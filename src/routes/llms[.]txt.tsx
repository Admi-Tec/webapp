import { createFileRoute } from "@tanstack/react-router";
import { SITE_NAME, SITE_DESCRIPTION, absoluteUrl } from "@/lib/site";

// Context file for AI systems (ChatGPT, Claude, Perplexity, ...) per the llms.txt
// convention (https://llmstxt.org). Only links public, indexable pages — nothing
// behind auth (see robots.txt for what's disallowed there and why.)
const LLMS_TXT = `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

${SITE_NAME} es una plataforma de preparación para exámenes de admisión de universidades
peruanas (UNI, San Marcos/UNMSM, PUCP, UNALM, UNFV y más). Los estudiantes practican
ejercicios resueltos paso a paso organizados por curso y tema, rinden exámenes oficiales
pasados bajo condiciones reales de tiempo, generan simulacros con la distribución de
cursos de su universidad objetivo, y comparan su desempeño de forma anónima con otros
postulantes.

## Páginas principales

- [Inicio](${absoluteUrl("/")}): presentación del producto y propuesta de valor.
- [Cursos de práctica](${absoluteUrl("/temas")}): ejercicios resueltos por curso y tema.
- [Exámenes por universidad](${absoluteUrl("/examenes")}): exámenes oficiales pasados agrupados por universidad.
- [Exámenes cronometrados](${absoluteUrl("/examenes-oficiales")}): exámenes bajo tiempo real con corrección automática.
- [Simulacros](${absoluteUrl("/simulacros")}): simulacros generados con la distribución real de cursos del examen.
- [Planes y precios](${absoluteUrl("/planes")}): planes gratis y Premium.
- [Libro de Reclamaciones](${absoluteUrl("/libro-de-reclamaciones")}): canal formal de quejas y reclamos.

## Notas

- Las páginas de práctica, exámenes en curso y panel del estudiante requieren una cuenta
  y no son indexables (ver ${absoluteUrl("/robots.txt")}).
- Sitemap completo: ${absoluteUrl("/sitemap.xml")}
`;

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: () =>
        new Response(LLMS_TXT, {
          headers: { "content-type": "text/plain; charset=utf-8" },
        }),
    },
  },
});
