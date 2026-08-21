import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TheoryVideoPlayer } from "@/components/preparation/theory-video-player";
import { getMyPreparationUnit, markPreparationTheoryCompleted } from "@/lib/preparation.functions";

export const Route = createFileRoute("/_authenticated/preparacion/$cycleSlug/$cycleTopicId")({
  component: PreparationUnitPage,
});

function PreparationUnitPage() {
  const { cycleSlug, cycleTopicId } = Route.useParams();
  const getFn = useServerFn(getMyPreparationUnit);
  const markFn = useServerFn(markPreparationTheoryCompleted);
  const queryClient = useQueryClient();
  const queryKey = ["preparation-unit", cycleSlug, cycleTopicId];
  const q = useQuery({ queryKey, queryFn: () => getFn({ data: { cycleSlug, cycleTopicId } }) });
  const markM = useMutation({
    mutationFn: () => markFn({ data: { cycleTopicId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
  if (q.isLoading)
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 text-sm text-muted-foreground">
        Cargando clase…
      </main>
    );
  if (!q.data)
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 text-sm text-destructive">
        Unidad no encontrada.
      </main>
    );
  const { unit, progress } = q.data;
  const title = unit.title_override || unit.subtopic?.name || "Clase teórica";
  const theoryCompleted = !!progress?.theory_completed_at;
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
      <Link
        to="/preparacion/$cycleSlug"
        params={{ cycleSlug }}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Volver al ciclo
      </Link>
      <nav className="mt-6 text-sm text-muted-foreground">
        {unit.course.topic?.name} · {unit.course.cycle.university?.short_name}
      </nav>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-bold">{title}</h1>
        {progress?.mastery_status === "mastered" && <Badge>Dominado</Badge>}
        {progress?.mastery_status === "needs_review" && (
          <Badge variant="secondary">Necesita refuerzo</Badge>
        )}
      </div>
      {unit.video_duration_seconds && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock3 className="h-4 w-4" /> {Math.round(unit.video_duration_seconds / 60)} min
        </p>
      )}
      <section className="mt-6">
        <TheoryVideoPlayer videoId={unit.youtube_video_id} title={`Clase: ${title}`} />
      </section>
      <section className="mt-6 rounded-lg border border-border bg-card p-5">
        {!theoryCompleted ? (
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-semibold">Cuando termines la clase</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Confirma que revisaste la teoría para pasar a la práctica.
              </p>
            </div>
            <Button onClick={() => markM.mutate()} disabled={markM.isPending}>
              {markM.isPending ? "Guardando…" : "Marcar teoría como completada"}
            </Button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-5 w-5" />
              <h2 className="font-semibold">Teoría completada</h2>
            </div>
            {progress?.last_score != null && (
              <p className="mt-3 text-sm text-muted-foreground">
                Último resultado:{" "}
                <strong className="text-foreground">{progress.last_score}%</strong>
                {progress.best_score != null && (
                  <>
                    {" "}
                    · Mejor: <strong className="text-foreground">{progress.best_score}%</strong>
                  </>
                )}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild>
                <Link
                  to="/practica/$topicSlug"
                  params={{ topicSlug: unit.course.topic?.slug ?? "" }}
                  search={{ subtopic: unit.subtopic?.slug, cycleTopic: unit.id, cycleSlug }}
                >
                  {progress?.practice_completed_at ? "Practicar nuevamente" : "Practicar este tema"}{" "}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <span className="self-center text-sm text-muted-foreground">
                {unit.practice_question_count} preguntas
              </span>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
