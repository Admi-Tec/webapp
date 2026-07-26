import { Loader2 } from "lucide-react";

export function TopicCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-border bg-card p-5 motion-reduce:animate-none">
      <div className="flex items-center justify-between">
        <div className="h-6 w-32 rounded bg-muted" />
        <div className="h-3.5 w-10 rounded bg-muted" />
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-3.5 w-full rounded bg-muted" />
        <div className="h-3.5 w-3/4 rounded bg-muted" />
      </div>
      <div className="mt-4 h-3.5 w-28 rounded bg-muted" />
    </div>
  );
}

export function ExerciseCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-border bg-card p-4 shadow-sm motion-reduce:animate-none sm:p-5">
      <div className="flex gap-2">
        <div className="h-5 w-14 rounded-md bg-muted" />
        <div className="h-5 w-20 rounded-md bg-muted" />
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-3.5 w-full rounded bg-muted" />
        <div className="h-3.5 w-full rounded bg-muted" />
        <div className="h-3.5 w-2/3 rounded bg-muted" />
      </div>
      <div className="mt-4 h-3.5 w-36 rounded bg-muted" />
    </div>
  );
}

/**
 * Visible "Cargando…" pill, announced to screen readers. Pass `label` without
 * a trailing ellipsis — the dots are rendered (and animated) by the component.
 */
export function LoadingNotice({ label = "Cargando" }: { label?: string }) {
  return (
    <p
      role="status"
      className="animate-fade-up inline-flex items-center gap-2.5 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-base font-medium text-primary"
      data-testid="loading-notice"
    >
      <Loader2
        className="h-5 w-5 shrink-0 animate-spin motion-reduce:animate-none"
        aria-hidden="true"
      />
      <span>
        {label}
        <span aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="animate-loading-dot inline-block"
              style={{ animationDelay: `${i * 150}ms` }}
            >
              .
            </span>
          ))}
        </span>
      </span>
    </p>
  );
}

/** Mirrors the exercise card in /ejercicio/$id and práctica: statement + choices + action. */
export function ExercisePlayerSkeleton() {
  return (
    <div
      className="animate-pulse rounded-xl border border-border bg-card p-4 shadow-sm motion-reduce:animate-none sm:p-6"
      aria-hidden="true"
    >
      <div className="space-y-2">
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-5/6 rounded bg-muted" />
        <div className="h-4 w-2/3 rounded bg-muted" />
      </div>
      <div className="mt-6 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 rounded-lg border border-border bg-muted/60" />
        ))}
      </div>
      <div className="mt-6 flex justify-end">
        <div className="h-11 w-full rounded-md bg-muted sm:w-44" />
      </div>
    </div>
  );
}

/** Full-page pending fallback for /ejercicio/$id (breadcrumb + badges + exercise card). */
export function ExercisePagePending() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <LoadingNotice label="Cargando ejercicio" />
      <div className="mt-4 animate-pulse motion-reduce:animate-none" aria-hidden="true">
        <div className="h-3.5 w-44 rounded bg-muted" />
        <div className="mt-3 flex gap-2">
          <div className="h-5 w-16 rounded-full bg-muted" />
          <div className="h-5 w-24 rounded-full bg-muted" />
          <div className="h-5 w-20 rounded-full bg-muted" />
        </div>
      </div>
      <div className="mt-4">
        <ExercisePlayerSkeleton />
      </div>
    </div>
  );
}

/**
 * Generic route-level pending fallback (router defaultPendingComponent): shown
 * on any navigation whose loader takes longer than defaultPendingMs and whose
 * route doesn't define its own pendingComponent.
 */
export function PagePending() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <LoadingNotice />
      <div className="mt-6 animate-pulse motion-reduce:animate-none" aria-hidden="true">
        <div className="h-8 w-64 max-w-full rounded bg-muted" />
        <div className="mt-3 h-4 w-96 max-w-full rounded bg-muted" />
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <TopicCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
