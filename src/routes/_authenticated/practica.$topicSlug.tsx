import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useState, useEffect } from "react";
import {
  getTopicBySlug,
  listExercises,
  getExercise,
  getSubtopicFrequency,
} from "@/lib/exercises.functions";
import { getFullProfile } from "@/lib/profile.functions";
import { recordAttempt } from "@/lib/attempts.functions";
import { MathText, ChoiceText } from "@/lib/math-render";
import { getExerciseImageUrl } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, ChevronRight, Shuffle, Info } from "lucide-react";
import { FavoriteButton } from "@/components/favorite-button";
import { ExerciseRating } from "@/components/exercise-rating";
import { ReportProblemDialog } from "@/components/report-problem-dialog";
import { ZoomableImage } from "@/components/zoomable-image";
import { ExercisePlayerSkeleton, LoadingNotice } from "@/components/skeletons";

const searchSchema = z.object({
  subtopic: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/practica/$topicSlug")({
  validateSearch: zodValidator(searchSchema),
  loader: async ({ params }) => {
    const topic = await getTopicBySlug({ data: { slug: params.topicSlug } });
    if (!topic) throw notFound();
    return { topic };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `Práctica: ${loaderData.topic.name} · MatePre` : "Práctica · MatePre" },
    ],
  }),
  component: PracticePage,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-destructive">
      {error.message}
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h2 className="font-display text-2xl font-bold">Curso no encontrado</h2>
      <Link to="/temas" className="mt-4 inline-block text-primary hover:underline">
        Volver a cursos
      </Link>
    </div>
  ),
});

function PracticePage() {
  const { topicSlug } = Route.useParams();
  const { subtopic } = Route.useSearch();
  const { topic } = Route.useLoaderData();
  const listFn = useServerFn(listExercises);
  const recordFn = useServerFn(recordAttempt);

  const q = useQuery({
    queryKey: ["practice-exercises", topicSlug, subtopic ?? "all"],
    queryFn: () =>
      listFn({ data: { topicSlug, subtopicSlug: subtopic, limit: subtopic ? 200 : 100 } }),
  });

  const profileFn = useServerFn(getFullProfile);
  const profileQ = useQuery({ queryKey: ["full-profile"], queryFn: () => profileFn() });
  const targetUniversity = (profileQ.data?.universities ?? [])
    .map((u: any) => u.university)
    .filter(Boolean)[0];

  const currentSubtopic = subtopic ? topic.subtopics.find((s) => s.slug === subtopic) : undefined;

  const freqFn = useServerFn(getSubtopicFrequency);
  const freqQ = useQuery({
    queryKey: ["subtopic-frequency", topicSlug, targetUniversity?.id],
    queryFn: () => freqFn({ data: { topicSlug, universityId: targetUniversity.id } }),
    enabled: !!currentSubtopic && !!targetUniversity?.id,
  });
  const subtopicFreqCount = currentSubtopic ? (freqQ.data?.[currentSubtopic.id] ?? 0) : 0;

  const [order, setOrder] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<{ isCorrect: boolean; correctChoice: number } | null>(null);
  const [stats, setStats] = useState({ correct: 0, done: 0 });
  const [startTime, setStartTime] = useState<number>(Date.now());

  useEffect(() => {
    if (q.data && order.length === 0) {
      const ids = q.data.map((e: any) => e.id);
      const shuffled = [...ids].sort(() => Math.random() - 0.5);
      // Practicing a specific subtopic is a focused round: 10 random exercises,
      // or fewer if the subtopic doesn't have that many.
      setOrder(subtopic ? shuffled.slice(0, 10) : shuffled);
    }
  }, [q.data, order.length, subtopic]);

  useEffect(() => {
    setSelected(null);
    setResult(null);
    setStartTime(Date.now());
  }, [idx]);

  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const currentImagePath = q.data?.find((e: any) => e.id === order[idx])?.statement_image_path;
  useEffect(() => {
    let alive = true;
    setImgUrl(null);
    if (currentImagePath) {
      getExerciseImageUrl(currentImagePath).then((url) => {
        if (alive) setImgUrl(url);
      });
    }
    return () => {
      alive = false;
    };
  }, [currentImagePath]);

  // Must run unconditionally, before the early returns below — calling a hook
  // only after `q.data` first arrives changes the hook count mid-mount and
  // throws React error #310 ("rendered more hooks than during the previous
  // render") on essentially every practice session start.
  const currentId = order[idx];
  const detailQ = useQuery({
    queryKey: ["exercise-detail", currentId],
    queryFn: () => getExercise({ data: { id: currentId! } }),
    enabled: !!currentId && !!result,
  });

  if (q.isLoading)
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <nav className="text-xs text-muted-foreground">
          <Link to="/temas" className="hover:underline">
            Cursos
          </Link>
          {" / "}
          <Link to="/temas/$slug" params={{ slug: topicSlug }} className="hover:underline">
            {topic.name}
          </Link>
          {" / "}
          <span className="text-foreground">Práctica</span>
        </nav>
        <h1 className="mt-3 font-display text-2xl font-bold">Práctica: {topic.name}</h1>
        <div className="mt-2">
          <LoadingNotice label="Cargando ejercicios" />
        </div>
        <div className="mt-5">
          <ExercisePlayerSkeleton />
        </div>
      </div>
    );
  if (!q.data || q.data.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-muted-foreground">No hay preguntas disponibles para este tema.</p>
        <Link to="/temas" className="mt-4 inline-block text-primary hover:underline">
          Volver a cursos
        </Link>
      </div>
    );
  }

  const current = q.data.find((e: any) => e.id === currentId);
  if (!current) return null;
  const total = order.length;

  async function submit() {
    if (selected === null || result || !current) return;
    const timeSpent = Math.min(Date.now() - startTime, 30 * 60 * 1000);
    try {
      const r = await recordFn({
        data: {
          exerciseId: current.id,
          selectedChoice: selected,
          timeSpentMs: timeSpent,
          examSessionId: null,
        },
      });
      setResult(r);
      setStats((s) => ({ correct: s.correct + (r.isCorrect ? 1 : 0), done: s.done + 1 }));
    } catch {}
  }

  function next() {
    if (idx < total - 1) setIdx(idx + 1);
    else {
      // reshuffle and restart
      const shuffled = [...order].sort(() => Math.random() - 0.5);
      setOrder(shuffled);
      setIdx(0);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <nav className="text-xs text-muted-foreground">
        <Link to="/temas" className="hover:underline">
          Cursos
        </Link>
        {" / "}
        <Link to="/temas/$slug" params={{ slug: topicSlug }} className="hover:underline">
          {topic.name}
        </Link>
        {" / "}
        <span className="text-foreground">Práctica</span>
      </nav>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Práctica: {topic.name}</h1>
          <p className="text-sm text-muted-foreground">
            Sin tiempo. Retroalimentación inmediata. Al terminar la ronda, se reordena.
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          <Badge variant="outline">
            Pregunta {idx + 1} / {total}
          </Badge>
          <Badge variant="outline" className="ml-2 border-success/40 text-success">
            {stats.correct}/{stats.done} correctas
          </Badge>
        </div>
      </div>

      {currentSubtopic && targetUniversity && (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {subtopicFreqCount > 0 ? (
              <>
                <strong className="font-medium text-foreground">{currentSubtopic.name}</strong> tuvo{" "}
                <strong className="font-medium text-foreground">{subtopicFreqCount}</strong>{" "}
                pregunta{subtopicFreqCount === 1 ? "" : "s"} en exámenes reales de{" "}
                {targetUniversity.short_name} en los últimos 10 años. Solo a título informativo.
              </>
            ) : (
              <>
                <strong className="font-medium text-foreground">{currentSubtopic.name}</strong> no
                registra preguntas en exámenes reales de {targetUniversity.short_name} en los
                últimos 10 años. Solo a título informativo.
              </>
            )}
          </p>
        </div>
      )}

      <article
        key={current.id}
        className="animate-card-swap mt-5 rounded-xl border border-border bg-card p-4 sm:p-6"
      >
        <div className="mb-3 flex items-center justify-between">
          <Badge variant="secondary" className="capitalize">
            {current.difficulty}
          </Badge>
          <FavoriteButton exerciseId={current.id} />
        </div>
        <MathText text={current.statement_md} />
        {imgUrl && <ZoomableImage src={imgUrl} alt="Diagrama del ejercicio" />}
        <ul className="mt-5 space-y-2">
          {(current.choices as string[]).map((c: string, i: number) => {
            const picked = selected === i;
            const isCorrectChoice = result && result.correctChoice === i;
            const isWrongPicked = result && picked && !result.isCorrect;
            return (
              <li key={i}>
                <button
                  type="button"
                  disabled={!!result}
                  onClick={() => setSelected((s) => (s === i ? null : i))}
                  className={`press w-full rounded-lg border px-4 py-3 text-left text-sm leading-relaxed transition ${
                    isCorrectChoice
                      ? "animate-flash-once border-success bg-success/10"
                      : isWrongPicked
                        ? "border-destructive bg-destructive/10"
                        : picked
                          ? "border-primary bg-primary/10 font-medium"
                          : "border-border bg-background hover:border-primary/40"
                  }`}
                >
                  <span className="mr-2 font-semibold">{String.fromCharCode(65 + i)}.</span>
                  <ChoiceText text={c} />
                </button>
              </li>
            );
          })}
        </ul>

        {result && (
          <div
            className={`animate-alert-in mt-4 rounded-md border p-3 text-sm ${result.isCorrect ? "border-success/40 bg-success/5" : "border-destructive/40 bg-destructive/5"}`}
          >
            <div className="flex items-center gap-2 font-semibold">
              {result.isCorrect ? (
                <>
                  <CheckCircle2 className="animate-icon-pop h-4 w-4 text-success" /> ¡Correcto!
                </>
              ) : (
                <>
                  <XCircle className="animate-icon-pop h-4 w-4 text-destructive" /> Incorrecto. La
                  respuesta era {String.fromCharCode(65 + result.correctChoice)}.
                </>
              )}
            </div>
            {detailQ.data?.solution_md && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs font-medium text-primary">
                  Ver solución
                </summary>
                <div className="mt-2">
                  <MathText text={detailQ.data.solution_md} />
                </div>
              </details>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
              <ExerciseRating exerciseId={current.id} />
              <ReportProblemDialog exerciseId={current.id} />
            </div>
          </div>
        )}

        <div className="mt-5 flex gap-2">
          {!result ? (
            <Button
              onClick={submit}
              disabled={selected === null}
              className="press w-full min-h-11 sm:w-auto"
            >
              Comprobar respuesta
            </Button>
          ) : (
            <Button onClick={next} className="press w-full min-h-11 sm:w-auto">
              {idx < total - 1 ? (
                <>
                  Siguiente <ChevronRight className="ml-1 h-4 w-4" />
                </>
              ) : (
                <>
                  Nueva ronda <Shuffle className="ml-1 h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </article>
    </div>
  );
}
