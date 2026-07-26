import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Timer, ListChecks, ArrowRight } from "lucide-react";
import { getUniversityBySlug } from "@/lib/exercises.functions";
import { listPublishedExams } from "@/lib/exams.functions";
import { pageMeta, absoluteUrl } from "@/lib/site";
import { JsonLd } from "@/components/json-ld";
import { PremiumLockChip } from "@/components/premium/premium-gate";
import { ComingSoonChip } from "@/components/coming-soon-chip";
import { usePlan } from "@/hooks/use-plan";

const uniQO = (slug: string) =>
  queryOptions({
    queryKey: ["university", slug],
    queryFn: () => getUniversityBySlug({ data: { slug } }),
  });

const examsQO = (slug: string) =>
  queryOptions({
    queryKey: ["published-exams", slug],
    queryFn: () => listPublishedExams({ data: { universitySlug: slug } }),
    staleTime: 1000 * 60 * 5,
  });

export const Route = createFileRoute("/examenes/$slug/")({
  loader: async ({ context, params }) => {
    // examsQO only needs params.slug, not the resolved university row — no
    // reason to wait for `u` before firing it.
    const [u] = await Promise.all([
      context.queryClient.ensureQueryData(uniQO(params.slug)),
      context.queryClient.ensureQueryData(examsQO(params.slug)),
    ]);
    if (!u) throw notFound();
    return { university: u };
  },
  head: ({ params, loaderData }) => {
    const name = loaderData?.university?.short_name ?? loaderData?.university?.name ?? params.slug;
    return pageMeta({
      path: `/examenes/${params.slug}`,
      title: `Exámenes de admisión ${name}`,
      description: `Exámenes oficiales de admisión pasados de ${name} y simulacros cronometrados, con solución paso a paso.`,
    });
  },
  component: UniPage,
  pendingComponent: UniPagePending,
  pendingMs: 150,
  pendingMinMs: 300,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-destructive">
      {error.message}
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h2 className="font-display text-2xl font-bold">Universidad no encontrada</h2>
      <Link to="/examenes" className="mt-4 inline-block text-primary hover:underline">
        Ver exámenes
      </Link>
    </div>
  ),
});

function UniPagePending() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="h-3.5 w-20 animate-pulse rounded bg-muted motion-reduce:animate-none" />
      <div className="mt-4 h-9 w-64 animate-pulse rounded bg-muted motion-reduce:animate-none sm:h-10" />
      <div className="mt-10">
        <div className="h-6 w-40 animate-pulse rounded bg-muted motion-reduce:animate-none" />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-border bg-card p-5 motion-reduce:animate-none"
            >
              <div className="h-4 w-2/3 rounded bg-muted" />
              <div className="mt-2 h-3.5 w-full rounded bg-muted" />
              <div className="mt-4 h-6 w-24 rounded-full bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function UniPage() {
  const { slug } = Route.useParams();
  const { data: u } = useSuspenseQuery(uniQO(slug));
  const { data: exams } = useSuspenseQuery(examsQO(slug));
  // Los exámenes oficiales son Premium: el chip lo anticipa aquí y el
  // desbloqueo real ocurre en la página del examen, al iniciar.
  const { isPremium, loading: planLoading } = usePlan();
  const showLock = !isPremium && !planLoading;

  if (!u) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Exámenes", item: absoluteUrl("/examenes") },
            {
              "@type": "ListItem",
              position: 2,
              name: u.short_name,
              item: absoluteUrl(`/examenes/${slug}`),
            },
          ],
        }}
      />
      <nav className="text-xs text-muted-foreground">
        <Link to="/examenes" className="hover:underline">
          Exámenes
        </Link>{" "}
        / <span className="text-foreground">{u.short_name}</span>
      </nav>

      <div className="mt-4">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">{u.name}</h1>
        {u.description && <p className="mt-2 max-w-2xl text-muted-foreground">{u.description}</p>}
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-xl font-bold">Exámenes oficiales</h2>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">
            {(exams ?? []).length} exámenes
          </span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Exámenes con preguntas fijas definidas por el equipo. Puedes rendir cada examen las veces
          que quieras.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(exams ?? []).length === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed border-border bg-background p-10 text-center text-sm text-muted-foreground">
              Aún no hay exámenes oficiales publicados para esta universidad.
            </div>
          ) : (
            (exams ?? []).map((exam: any, i: number) => {
              const comingSoon = exam.questionCount === 0;
              return (
                <div
                  key={exam.id}
                  className="animate-fade-up flex flex-col rounded-xl border border-border bg-card p-5 transition hover:border-primary/40 hover:shadow-md"
                  style={{ "--i": Math.min(i, 10) } as React.CSSProperties}
                >
                  <h3 className="font-display font-bold">{exam.title}</h3>
                  {exam.description && (
                    <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                      {exam.description}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <Badge variant="outline">
                      <Timer className="mr-1 h-3 w-3" /> {exam.time_limit_min} min
                    </Badge>
                    <Badge variant="outline">
                      <ListChecks className="mr-1 h-3 w-3" /> {exam.questionCount} preguntas
                    </Badge>
                    {comingSoon && <ComingSoonChip />}
                    {showLock && <PremiumLockChip />}
                  </div>
                  {comingSoon ? (
                    <Button size="sm" className="press mt-4 self-start" disabled>
                      Próximamente
                    </Button>
                  ) : (
                    <Button asChild size="sm" className="press mt-4 self-start">
                      <Link to="/examen/$id" params={{ id: exam.id }}>
                        Comenzar examen <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
