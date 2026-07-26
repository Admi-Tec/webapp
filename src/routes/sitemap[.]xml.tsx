import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { absoluteUrl } from "@/lib/site";

function publicClient() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

type UrlEntry = { loc: string; changefreq: string; priority: string };

function toXml(urls: UrlEntry[]): string {
  const body = urls
    .map(
      (u) =>
        `  <url><loc>${u.loc}</loc><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

async function buildSitemap(): Promise<string> {
  const sb = publicClient();

  const [{ data: topics }, { data: subtopics }, { data: universities }, { data: exercises }] =
    await Promise.all([
      sb.from("topics").select("slug").eq("active", true),
      sb.from("subtopics").select("slug, topic:topics!inner(slug)"),
      sb.from("universities").select("slug").eq("active", true),
      sb.from("exercises").select("id"),
    ]);

  const urls: UrlEntry[] = [
    { loc: absoluteUrl("/"), changefreq: "daily", priority: "1.0" },
    { loc: absoluteUrl("/temas"), changefreq: "weekly", priority: "0.8" },
    { loc: absoluteUrl("/examenes"), changefreq: "weekly", priority: "0.8" },
    { loc: absoluteUrl("/examenes-oficiales"), changefreq: "weekly", priority: "0.6" },
    { loc: absoluteUrl("/simulacros"), changefreq: "weekly", priority: "0.6" },
  ];

  for (const t of topics ?? []) {
    urls.push({ loc: absoluteUrl(`/temas/${t.slug}`), changefreq: "weekly", priority: "0.7" });
  }
  for (const s of subtopics ?? []) {
    const topicSlug = (s.topic as { slug: string } | null)?.slug;
    if (!topicSlug) continue;
    urls.push({
      loc: absoluteUrl(`/temas/${topicSlug}/${s.slug}`),
      changefreq: "weekly",
      priority: "0.6",
    });
  }
  for (const u of universities ?? []) {
    urls.push({ loc: absoluteUrl(`/examenes/${u.slug}`), changefreq: "weekly", priority: "0.7" });
  }
  for (const e of exercises ?? []) {
    urls.push({ loc: absoluteUrl(`/ejercicio/${e.id}`), changefreq: "monthly", priority: "0.5" });
  }

  return toXml(urls);
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const xml = await buildSitemap();
        return new Response(xml, {
          headers: { "content-type": "application/xml; charset=utf-8" },
        });
      },
    },
  },
});
