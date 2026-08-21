import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, CheckCircle2, Circle, PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getMyPreparationCycle } from "@/lib/preparation.functions";

export const Route = createFileRoute("/_authenticated/preparacion/$cycleSlug/")({
  component: PreparationCyclePage,
});

const statusLabel: Record<string, string> = {
  not_started: "No iniciado",
  theory_completed: "Teoría completada",
  practice_completed: "Práctica realizada",
  needs_review: "Necesita refuerzo",
  mastered: "Dominado",
};

function PreparationCyclePage() {
  const { cycleSlug } = Route.useParams();
  const getFn = useServerFn(getMyPreparationCycle);
  const q = useQuery({
    queryKey: ["my-preparation-cycle", cycleSlug],
    queryFn: () => getFn({ data: { slug: cycleSlug } }),
  });
  if (q.isLoading)
    return (
      <main className="mx-auto max-w-5xl px-4 py-10 text-sm text-muted-foreground">
        Cargando ruta…
      </main>
    );
  if (!q.data)
    return (
      <main className="mx-auto max-w-5xl px-4 py-10 text-sm text-destructive">
        No se pudo cargar el ciclo.
      </main>
    );
  const total = q.data.courses.reduce((sum, course) => sum + course.units.length, 0);
  const mastered = q.data.courses.reduce(
    (sum, course) =>
      sum + course.units.filter((unit) => unit.progress?.mastery_status === "mastered").length,
    0,
  );
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <Link
        to="/preparacion"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Mi preparación
      </Link>
      <p className="mt-6 text-sm font-medium text-primary">{q.data.cycle.university?.name}</p>
      <h1 className="mt-1 font-display text-3xl font-bold">{q.data.cycle.name}</h1>
      <div className="mt-6 max-w-xl rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Tu progreso</span>
          <span>
            {mastered} / {total} temas dominados
          </span>
        </div>
        <Progress className="mt-3" value={total ? (mastered / total) * 100 : 0} />
      </div>
      <div className="mt-8 space-y-5">
        {q.data.courses.map((course) => {
          const courseMastered = course.units.filter(
            (unit) => unit.progress?.mastery_status === "mastered",
          ).length;
          return (
            <section
              key={course.id}
              className="overflow-hidden rounded-lg border border-border bg-card"
            >
              <header className="border-b border-border px-4 py-4 sm:px-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-display text-xl font-bold">{course.topic?.name}</h2>
                  <span className="text-sm text-muted-foreground">
                    {courseMastered} / {course.units.length} dominados
                  </span>
                </div>
              </header>
              <ul className="divide-y divide-border">
                {course.units.map((unit) => {
                  const status = unit.progress?.mastery_status ?? "not_started";
                  return (
                    <li key={unit.id}>
                      <Link
                        to="/preparacion/$cycleSlug/$cycleTopicId"
                        params={{ cycleSlug, cycleTopicId: unit.id }}
                        className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-secondary/60 sm:px-5"
                      >
                        {status === "mastered" ? (
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                        ) : status === "not_started" ? (
                          <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
                        ) : (
                          <PlayCircle className="h-5 w-5 shrink-0 text-primary" />
                        )}
                        <span className="min-w-0 flex-1 font-medium">
                          {unit.title_override || unit.subtopic?.name}
                        </span>
                        <Badge variant="secondary" className="hidden sm:inline-flex">
                          {statusLabel[status]}
                        </Badge>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </main>
  );
}
