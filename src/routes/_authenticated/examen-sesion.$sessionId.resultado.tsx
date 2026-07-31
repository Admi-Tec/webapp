import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, MinusCircle, Clock, Users } from "lucide-react";
import { MathText, ChoiceText } from "@/lib/math-render";
import { getExamResult } from "@/lib/exams.functions";
import { exitExamFullscreen } from "@/lib/exam-fullscreen";
import { groupQuestionsByTopic } from "@/lib/group-questions-by-topic";
import { getExerciseImageUrl } from "@/lib/storage";
import { ZoomableImage } from "@/components/zoomable-image";
import { getExamStats } from "@/lib/goals.functions";
import { getPostExamRecommendations } from "@/lib/recommendations.functions";
import { InfoTooltip } from "@/components/info-tooltip";
import { ExerciseRating } from "@/components/exercise-rating";
import { ReportProblemDialog } from "@/components/report-problem-dialog";
import { DeleteExamAttemptButton } from "@/components/delete-exam-attempt-button";
import { PremiumOverlay } from "@/components/premium/premium-gate";
import { usePlan } from "@/hooks/use-plan";

export const Route = createFileRoute("/_authenticated/examen-sesion/$sessionId/resultado")({
  component: ResultPage,
});

// Counts up from 0 to `target` on mount/change — the score reveal should feel
// like a result landing, not a static label. Skips the animation entirely
// under prefers-reduced-motion.
function useCountUp(target: number, durationMs = 700) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    function tick(now: number) {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(eased * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return value;
}

function ResultPage() {
  const { sessionId } = Route.useParams();
  const navigate = useNavigate();

  // Al llegar a resultados el examen ya terminó (envío manual o automático
  // por tiempo/ausencia); no tiene sentido seguir en pantalla completa.
  useEffect(() => {
    exitExamFullscreen();
  }, []);

  const fn = useServerFn(getExamResult);
  const statsFn = useServerFn(getExamStats);
  const q = useQuery({
    queryKey: ["exam-result", sessionId],
    queryFn: () => fn({ data: { sessionId } }),
  });

  const examId: string | null = q.data?.session?.exam_id ?? null;
  const myScorePct: number | null = q.data?.session?.score ?? null;
  const statsQ = useQuery({
    queryKey: ["exam-stats", examId, myScorePct],
    queryFn: () => statsFn({ data: { examId: examId as string, myScorePct } }),
    enabled: !!examId,
  });

  // These hooks must run unconditionally on every render, before either of
  // the early returns below — calling them after a conditional `return`
  // (as `useState` used to be, further down) throws a "rendered fewer/more
  // hooks than expected" crash on the exact render where `q.data` first
  // arrives, i.e. the moment a student's result becomes available.
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
  const score: number = q.data?.session?.score ?? 0;
  const displayScore = useCountUp(score);
  // La comparación con el promedio (de puntaje y de tiempo por pregunta) es
  // Premium; el resultado propio y la revisión completa siguen siendo libres.
  const { isPremium } = usePlan();
  // A diferencia de "Comparación con otros" (getExamStats, sin gating
  // server-side), getPostExamRecommendations exige Premium en el servidor
  // (assertPremium) — así que a un usuario Gratuito ni se le llama, y la
  // sección "Para reforzar" completa queda oculta en vez de mostrarse
  // difuminada. Es la consecuencia directa de cerrar ese gap de seguridad.
  const postExamRecsFn = useServerFn(getPostExamRecommendations);
  const postExamRecsQ = useQuery({
    queryKey: ["post-exam-recommendations", sessionId],
    queryFn: () => postExamRecsFn({ data: { sessionId } }),
    enabled: isPremium,
  });
  const topicGroups = useMemo(
    () => groupQuestionsByTopic(q.data?.questions ?? []),
    [q.data?.questions],
  );
  const [imgUrls, setImgUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    let alive = true;
    (async () => {
      const map: Record<string, string> = {};
      await Promise.all(
        (q.data?.questions ?? [])
          .filter((qz) => qz?.statement_image_path)
          .map(async (qz) => {
            const u = await getExerciseImageUrl(qz.statement_image_path);
            if (u) map[qz.id] = u;
          }),
      );
      if (alive) setImgUrls(map);
    })();
    return () => {
      alive = false;
    };
  }, [q.data?.questions]);

  if (q.isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-muted-foreground">
        Calculando tu resultado…
      </div>
    );
  }
  if (!q.data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-muted-foreground">No pudimos cargar tu resultado todavía.</p>
        <Button className="press mt-4" onClick={() => q.refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  const s = q.data.session;
  const questions = q.data.questions;
  const answers = (s.answers as Record<string, number>) ?? {};
  const passing = s.exam?.passing_score ?? 0;
  const passed = score >= passing;
  // Correct/incorrect/empty counts and the max possible score are snapshotted
  // at grading time (submitExamSession) using that exam's own points config —
  // read them back directly rather than re-deriving from questions/answers,
  // so a later edit to the exam's scoring config or an exercise's
  // correct_choice never silently rewrites an already-graded result.
  const correctCount =
    s.correct_count ?? questions.filter((ex) => answers[ex.id] === ex.correct_choice).length;
  const totalQuestions = questions.length;
  const emptyCount = s.empty_count ?? questions.filter((ex) => answers[ex.id] === undefined).length;
  const incorrectCount = s.incorrect_count ?? totalQuestions - correctCount - emptyCount;
  const maxScore: number = s.max_score ?? totalQuestions * (s.exam?.points_correct ?? 1);
  const timeLimitMin = s.time_limit_min ?? s.exam?.time_limit_min ?? null;
  const timeTakenSeconds =
    s.finished_at && s.started_at
      ? (new Date(s.finished_at).getTime() - new Date(s.started_at).getTime()) / 1000
      : null;
  const selectedQuestion = questions[selectedQuestionIndex];
  const selectedAnswer = answers[selectedQuestion.id];
  const selectedCorrect = selectedQuestion.correct_choice;
  const selectedUnanswered = selectedAnswer === undefined;
  const scoreRatio = maxScore > 0 ? score / maxScore : 0;
  const scoreStyle =
    scoreRatio >= 0.75 ? "text-success" : scoreRatio >= 0.2 ? "text-amber-500" : "text-destructive";
  const scorePanelStyle =
    scoreRatio >= 0.75
      ? "border-success/40 bg-success/5"
      : scoreRatio >= 0.2
        ? "border-amber-400/40 bg-amber-400/10"
        : "border-destructive/40 bg-destructive/5";
  function formatDuration(sec: number | null) {
    if (sec === null || sec === undefined) return "-";
    const s = Math.max(0, Math.round(sec));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <nav className="text-xs text-muted-foreground">
        <Link to="/examenes" className="hover:underline">
          Exámenes
        </Link>
      </nav>
      <h1 className="mt-3 font-display text-3xl font-bold">Resultado</h1>
      <p className="text-muted-foreground">{s.exam?.title}</p>

      <div className={`animate-score-in mt-4 rounded-xl border p-6 ${scorePanelStyle}`}>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          Puntaje
          <InfoTooltip>
            Sumas puntos por cada respuesta correcta y pierdes puntos por cada incorrecta; las que
            dejaste sin responder no suman ni restan. El máximo posible ({maxScore} pts) es lo que
            obtendrías si todas fueran correctas.
          </InfoTooltip>
        </p>
        <p className={`mt-1 font-display text-5xl font-bold tabular-nums ${scoreStyle}`}>
          {displayScore} <span className="text-2xl text-muted-foreground">/ {maxScore} pts</span>
        </p>
        <p className="mt-1 text-sm">
          {correctCount} de {totalQuestions} correctas ·{" "}
          {passed ? "Aprobado" : `Aprobación: ${passing} pts`}
        </p>
        <div className="mt-2 text-sm text-muted-foreground grid grid-cols-2 gap-4">
          <div>
            <div>
              Correctas: <strong className="text-success">{correctCount}</strong>
            </div>
            <div>
              Incorrectas: <strong className="text-destructive">{incorrectCount}</strong>
            </div>
            <div>
              Sin responder: <strong>{emptyCount}</strong>
            </div>
          </div>
          <div>
            <div>
              Tiempo límite: <strong>{timeLimitMin ? `${timeLimitMin} min` : "-"}</strong>
            </div>
            <div>
              Tiempo tomado: <strong>{formatDuration(timeTakenSeconds)}</strong>
            </div>
          </div>
        </div>
      </div>

      {statsQ.data && statsQ.data.sessions_count > 0 && (
        <PremiumOverlay
          feature="la comparación con otros postulantes"
          title="Compararte con el resto es parte de Premium"
          className="mt-4"
        >
          <div className="animate-alert-in rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">
                Comparación con otros estudiantes
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <div>
                <p className="text-muted-foreground">Tu puntaje</p>
                <p className="font-display text-xl font-bold">{score} pts</p>
              </div>
              <div>
                <p className="flex items-center gap-1 text-muted-foreground">
                  Promedio general
                  <InfoTooltip>
                    Es el puntaje promedio entre todos los estudiantes que ya rindieron este mismo
                    examen. Te sirve para ver si tu resultado quedó por encima o por debajo del
                    resto.
                  </InfoTooltip>
                </p>
                <p className="font-display text-xl font-bold">{statsQ.data.avg_score} pts</p>
              </div>
              {statsQ.data.my_percentile !== null && (
                <div>
                  <p className="flex items-center gap-1 text-muted-foreground">
                    Tu percentil
                    <InfoTooltip>
                      Indica qué porcentaje de estudiantes obtuvo un puntaje igual o menor al tuyo.
                      Por ejemplo, un percentil de 80 significa que superaste al 80% de quienes
                      rindieron este examen.
                    </InfoTooltip>
                  </p>
                  <p className="font-display text-xl font-bold">{statsQ.data.my_percentile}</p>
                </div>
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Basado en {statsQ.data.sessions_count} intento
              {statsQ.data.sessions_count !== 1 ? "s" : ""} de este examen. La comparación es
              anónima.
            </p>
          </div>
        </PremiumOverlay>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-display text-xl font-bold">Revisión</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Selecciona la pregunta que quieras revisar.
          </p>
          <div className="mt-4 space-y-3">
            {topicGroups.map((group) => (
              <div key={group.name}>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                  {group.name}
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {group.items.map(({ question: ex, index: i }) => {
                    const selected = answers[ex.id];
                    const correct = ex.correct_choice;
                    const isCorrect = selected === correct;
                    const isAnswered = selected !== undefined;
                    const isSelected = i === selectedQuestionIndex;
                    return (
                      <button
                        key={ex.id}
                        type="button"
                        onClick={() => setSelectedQuestionIndex(i)}
                        className={`press h-10 rounded-md border text-sm font-semibold transition ${
                          isSelected
                            ? "border-primary bg-primary/10 text-primary"
                            : isCorrect
                              ? "border-success/50 bg-success/10 text-success"
                              : isAnswered
                                ? "border-destructive/50 bg-destructive/10 text-destructive"
                                : "border-border bg-background hover:border-primary/40"
                        }`}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-success" /> Correcta
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-destructive" /> Incorrecta
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-slate-400" /> Sin responder
            </div>
          </div>
        </aside>

        <section className="space-y-4">
          <div
            key={selectedQuestion.id}
            className="animate-card-swap rounded-xl border border-border bg-card p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">Pregunta {selectedQuestionIndex + 1}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedUnanswered
                    ? "Sin responder"
                    : selectedAnswer === selectedCorrect
                      ? "Correcta"
                      : "Incorrecta"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {selectedQuestion.time_spent_ms !== null &&
                  selectedQuestion.time_spent_ms !== undefined &&
                  (() => {
                    // El "Lento" compara contra el tiempo promedio de todos los
                    // estudiantes — parte del análisis Premium. El tiempo propio
                    // siempre se muestra.
                    const isSlow =
                      isPremium &&
                      !!selectedQuestion.avg_time_ms &&
                      selectedQuestion.time_spent_ms > selectedQuestion.avg_time_ms * 1.5;
                    return (
                      <>
                        <Badge
                          variant="outline"
                          className={isSlow ? "border-amber-500/40 text-amber-600" : ""}
                        >
                          <Clock className="mr-1 h-3 w-3" />
                          {formatDuration(selectedQuestion.time_spent_ms / 1000)}
                          {isSlow ? " · Lento" : ""}
                        </Badge>
                        {isSlow && (
                          <InfoTooltip>
                            Te demoraste más de lo esperado en esta pregunta, comparado con el
                            tiempo promedio de otros estudiantes para el nivel de dificultad de esta
                            pregunta.
                          </InfoTooltip>
                        )}
                      </>
                    );
                  })()}
                <Badge
                  variant="outline"
                  className={
                    selectedUnanswered
                      ? "border-muted-foreground text-muted-foreground"
                      : selectedAnswer === selectedCorrect
                        ? "border-success/40 text-success"
                        : "border-destructive/40 text-destructive"
                  }
                >
                  {selectedUnanswered
                    ? "No respondida"
                    : selectedAnswer === selectedCorrect
                      ? "Correcta"
                      : "Incorrecta"}
                </Badge>
              </div>
            </div>
            <div className="mt-3 text-sm">
              <MathText text={selectedQuestion.statement_md} />
            </div>
            {imgUrls[selectedQuestion.id] && (
              <ZoomableImage src={imgUrls[selectedQuestion.id]} alt="Enunciado" />
            )}
            <ul className="mt-4 space-y-2 text-sm">
              {(selectedQuestion.choices as string[]).map((c, ci) => {
                const isSelectedChoice = selectedAnswer === ci;
                const isCorrectChoice = selectedCorrect === ci;
                return (
                  <li
                    key={ci}
                    className={`rounded-md border px-3 py-2 ${
                      isCorrectChoice
                        ? "border-success/50 bg-success/10 text-success"
                        : isSelectedChoice
                          ? "border-destructive/50 bg-destructive/10 text-destructive"
                          : "border-border bg-background text-foreground"
                    }`}
                  >
                    <span className="mr-2 font-semibold">{String.fromCharCode(65 + ci)}.</span>
                    <ChoiceText text={c} />
                  </li>
                );
              })}
            </ul>

            <details className="mt-3" open>
              <summary className="cursor-pointer text-sm font-medium text-primary">
                Solución paso a paso
              </summary>
              <div className="mt-2 rounded-md bg-muted p-3 text-sm">
                {selectedQuestion.solution_md ? (
                  <MathText text={selectedQuestion.solution_md} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No hay solución disponible para esta pregunta.
                  </p>
                )}
              </div>
            </details>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
              <ExerciseRating exerciseId={selectedQuestion.id} />
              <ReportProblemDialog exerciseId={selectedQuestion.id} />
            </div>
          </div>
        </section>
      </div>

      {postExamRecsQ.data && postExamRecsQ.data.length > 0 && (
        <PremiumOverlay
          feature="las recomendaciones de refuerzo"
          title="Las sugerencias de refuerzo son Premium"
          className="mt-8"
        >
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-display text-lg font-bold">Para reforzar</h2>
            <ul className="mt-3 divide-y divide-border">
              {postExamRecsQ.data.map((r) => (
                <li
                  key={r.subtopicId}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <p className="text-sm text-muted-foreground">{r.reason}</p>
                  <Button asChild size="sm" variant="outline" className="press shrink-0">
                    <Link
                      to="/temas/$slug/$subtopic"
                      params={{ slug: r.topicSlug, subtopic: r.subtopicSlug }}
                    >
                      Practicar
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        </PremiumOverlay>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button asChild variant="outline" className="press">
            <Link to="/examenes">Volver a exámenes</Link>
          </Button>
          <Button asChild className="press">
            <Link to="/panel">Ir a mi panel</Link>
          </Button>
        </div>
        <DeleteExamAttemptButton
          sessionId={sessionId}
          onDeleted={() => navigate({ to: "/panel" })}
        />
      </div>
    </div>
  );
}
