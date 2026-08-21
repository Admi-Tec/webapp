import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listMyPreparationCycles } from "@/lib/preparation.functions";

export const Route = createFileRoute("/_authenticated/preparacion/")({
  component: PreparationHome,
});

function PreparationHome() {
  const listFn = useServerFn(listMyPreparationCycles);
  const q = useQuery({ queryKey: ["my-preparation-cycles"], queryFn: () => listFn() });
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <div className="max-w-2xl">
        <h1 className="font-display text-3xl font-bold">Mi preparación</h1>
        <p className="mt-2 text-muted-foreground">
          Aprende la teoría, practica con preguntas reales y mide tu dominio por tema.
        </p>
      </div>
      {q.isLoading && (
        <p className="mt-8 text-sm text-muted-foreground">Cargando tu preparación…</p>
      )}
      {q.data?.length === 0 && (
        <div className="mt-8 rounded-lg border border-border bg-card p-8 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-primary" />
          <h2 className="mt-3 font-display text-xl font-bold">Aún no hay un ciclo disponible</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Todavía no hay un ciclo de preparación publicado para tu universidad.
          </p>
        </div>
      )}
      <div className="mt-8 space-y-4">
        {q.data?.map((cycle) => (
          <article key={cycle.id} className="rounded-lg border border-border bg-card p-5 sm:p-6">
            <p className="text-sm font-medium text-primary">{cycle.university?.name}</p>
            <h2 className="mt-1 font-display text-2xl font-bold">{cycle.name}</h2>
            {cycle.description && (
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{cycle.description}</p>
            )}
            <Button asChild className="mt-5">
              <Link to="/preparacion/$cycleSlug" params={{ cycleSlug: cycle.slug }}>
                Ver ruta de preparación <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </article>
        ))}
      </div>
    </main>
  );
}
