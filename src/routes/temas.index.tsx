import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listTopics } from "@/lib/exercises.functions";
import { LoadingNotice, TopicCardSkeleton } from "@/components/skeletons";
import { pageMeta } from "@/lib/site";

const topicsQO = queryOptions({ queryKey: ["topics"], queryFn: () => listTopics() });

export const Route = createFileRoute("/temas/")({
  head: () =>
    pageMeta({
      path: "/temas",
      title: "Cursos de práctica",
      description:
        "Explora ejercicios resueltos paso a paso, organizados por curso y tema, para tu examen de admisión.",
    }),
  loader: ({ context }) => context.queryClient.ensureQueryData(topicsQO),
  component: TopicsIndex,
  pendingComponent: TopicsIndexPending,
  pendingMs: 150,
  pendingMinMs: 300,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-destructive">
      {error.message}
    </div>
  ),
});

function TopicsIndexPending() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Cursos</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Elige un curso para ver sus temas y practicar ejercicios.
        </p>
      </header>
      <div className="mt-6">
        <LoadingNotice label="Cargando cursos disponibles ..." />
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <TopicCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

function TopicsIndex() {
  const { data: topics } = useSuspenseQuery(topicsQO);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Cursos</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Elige un curso para ver sus temas y practicar ejercicios.
        </p>
      </header>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map((t, i) => (
          <Link
            key={t.id}
            to="/temas/$slug"
            params={{ slug: t.slug }}
            className="press group animate-fade-up rounded-xl border border-border bg-card p-5 transition hover:border-primary/40 hover:shadow-md"
            style={{ "--i": Math.min(i, 10) } as React.CSSProperties}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold">{t.name}</h2>
              <span className="text-xs text-muted-foreground">{t.exerciseCount} ej.</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{t.description}</p>
            <span className="mt-3 inline-block text-sm font-medium text-primary group-hover:underline">
              Ver temas →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
