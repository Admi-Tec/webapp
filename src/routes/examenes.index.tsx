import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listUniversities } from "@/lib/exercises.functions";
import { pageMeta } from "@/lib/site";

const qo = queryOptions({ queryKey: ["universities"], queryFn: () => listUniversities() });

export const Route = createFileRoute("/examenes/")({
  head: () =>
    pageMeta({
      path: "/examenes",
      title: "Exámenes de admisión por universidad",
      description:
        "Rinde exámenes de admisión oficiales pasados de la UNI, San Marcos, PUCP, UNALM, UNFV y más, en las condiciones reales del examen.",
    }),
  loader: ({ context }) => context.queryClient.ensureQueryData(qo),
  component: ExamHub,
  pendingComponent: ExamHubPending,
  pendingMs: 150,
  pendingMinMs: 300,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-destructive">
      {error.message}
    </div>
  ),
});

function ExamHubPending() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Exámenes de admisión</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Elige una universidad para acceder a sus exámenes oficiales cronometrados.
        </p>
      </header>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-border bg-card p-5 motion-reduce:animate-none"
          >
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 shrink-0 rounded-xl bg-muted" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-16 rounded bg-muted" />
                <div className="h-3 w-28 rounded bg-muted" />
              </div>
            </div>
            <div className="mt-3 h-3.5 w-full rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ExamHub() {
  const { data: unis } = useSuspenseQuery(qo);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Exámenes de admisión</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Elige una universidad para acceder a sus exámenes oficiales cronometrados.
        </p>
      </header>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {unis.map((u, i) => (
          <Link
            key={u.id}
            to="/examenes/$slug"
            params={{ slug: u.slug }}
            className="press group animate-fade-up rounded-xl border border-border bg-card p-5 transition hover:border-primary/40 hover:shadow-md"
            style={{ "--i": Math.min(i, 10) } as React.CSSProperties}
          >
            <div className="flex items-center gap-3">
              {u.logoUrl ? (
                <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-white">
                  <img src={u.logoUrl} alt="" className="h-full w-full object-contain" />
                </span>
              ) : (
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground font-display text-sm font-bold">
                  {u.short_name.slice(0, 4)}
                </span>
              )}
              <div className="min-w-0">
                <h2 className="truncate font-display text-lg font-bold">{u.short_name}</h2>
                <p className="truncate text-xs text-muted-foreground">{u.name}</p>
              </div>
            </div>
            {u.description && <p className="mt-3 text-sm text-muted-foreground">{u.description}</p>}
            <span className="mt-3 inline-block text-sm font-medium text-primary group-hover:underline">
              Ver exámenes →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
