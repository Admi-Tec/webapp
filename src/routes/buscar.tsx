import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { searchExercises } from "@/lib/exercises.functions";
import { ExerciseCard } from "@/components/exercise-card";
import { pageMeta } from "@/lib/site";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
});

const qo = (q: string) =>
  queryOptions({
    queryKey: ["search", q],
    queryFn: () => (q ? searchExercises({ data: { q } }) : Promise.resolve([])),
  });

export const Route = createFileRoute("/buscar")({
  validateSearch: zodValidator(searchSchema),
  loaderDeps: ({ search }) => ({ q: search.q }),
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(qo(deps.q)),
  // Search-result pages are unbounded (any ?q= combination) and low-value for
  // organic search — index the real content pages (temas/examenes) instead.
  head: () => pageMeta({ path: "/buscar", title: "Buscar", noindex: true }),
  component: SearchPage,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-destructive">
      {error.message}
    </div>
  ),
});

function SearchPage() {
  const { q } = Route.useSearch();
  const { data: results } = useSuspenseQuery(qo(q));
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold">Resultados de búsqueda</h1>
      <p className="mt-1 text-muted-foreground">
        {q ? (
          <>
            {results.length} resultado{results.length === 1 ? "" : "s"} para{" "}
            <strong className="text-foreground">"{q}"</strong>
          </>
        ) : (
          "Escribe un término en la barra de búsqueda para empezar."
        )}
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {results.map((ex: any) => (
          <ExerciseCard key={ex.id} ex={ex} />
        ))}
      </div>
    </div>
  );
}
