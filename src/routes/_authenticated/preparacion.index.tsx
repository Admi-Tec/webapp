import type { CSSProperties } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen } from "lucide-react";
import { listMyPreparationCycles } from "@/lib/preparation.functions";

export const Route = createFileRoute("/_authenticated/preparacion/")({
  component: PreparationHome,
});

function PreparationHome() {
  const listFn = useServerFn(listMyPreparationCycles);
  const q = useQuery({ queryKey: ["my-preparation-cycles"], queryFn: () => listFn() });
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="max-w-2xl">
        <h1 className="font-display text-3xl font-bold">Mi preparación</h1>
        <p className="mt-2 text-muted-foreground">
          Aprende la teoría, practica con preguntas reales y mide tu dominio por tema.
        </p>
      </div>
      {q.isLoading && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="animate-pulse rounded-xl border border-border bg-card p-5 motion-reduce:animate-none"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 rounded-xl bg-muted" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-muted" />
                  <div className="h-3 w-1/2 rounded bg-muted" />
                </div>
              </div>
              <div className="mt-4 h-3.5 w-full rounded bg-muted" />
            </div>
          ))}
        </div>
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
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {q.data?.map((cycle, index) => (
          <Link
            key={cycle.id}
            to="/preparacion/$cycleSlug"
            params={{ cycleSlug: cycle.slug }}
            className="press group animate-fade-up rounded-xl border border-border bg-card p-5 transition hover:border-primary/40 hover:shadow-md"
            style={{ "--i": Math.min(index, 10) } as CSSProperties}
          >
            <div className="flex items-center gap-3">
              {cycle.university?.logoUrl ? (
                <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-white">
                  <img
                    src={cycle.university.logoUrl}
                    alt=""
                    className="h-full w-full object-contain"
                  />
                </span>
              ) : (
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary px-1 text-center font-display text-xs font-bold text-primary-foreground">
                  {(cycle.university?.short_name ?? "Ciclo").slice(0, 5)}
                </span>
              )}
              <div className="min-w-0">
                <h2 className="truncate font-display text-lg font-bold">{cycle.name}</h2>
                <p className="truncate text-xs text-muted-foreground">
                  {cycle.university?.short_name}
                </p>
              </div>
            </div>
            {cycle.description && (
              <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{cycle.description}</p>
            )}
            <span className="mt-3 inline-block text-sm font-medium text-primary group-hover:underline">
              Ver ruta de preparación →
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
