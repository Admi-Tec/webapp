import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Timer, Flag, CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import {
  getExamSession,
  saveExamAnswers,
  submitExamSession,
  getExamResult,
} from "@/lib/exams.functions";
import { getExerciseImageUrl } from "@/lib/storage";
import { ExamQuestionCard } from "@/components/exam-question-card";
import { useExamAwayGuard } from "@/hooks/use-exam-away-guard";
import { groupQuestionsByTopic } from "@/lib/group-questions-by-topic";
import { pageMeta } from "@/lib/site";

export const Route = createFileRoute("/_authenticated/examen-sesion/$sessionId/")({
  head: ({ params }) =>
    pageMeta({
      path: `/examen-sesion/${params.sessionId}`,
      title: "Rindiendo examen",
      description: "Examen en curso.",
    }),
  component: TakeExam,
});

function TakeExam() {
  const { sessionId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const getFn = useServerFn(getExamSession);
  const saveFn = useServerFn(saveExamAnswers);
  const submitFn = useServerFn(submitExamSession);
  const resultFn = useServerFn(getExamResult);

  const q = useQuery({
    queryKey: ["exam-session", sessionId],
    queryFn: () => getFn({ data: { sessionId } }),
    staleTime: Infinity,
  });

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [idx, setIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [imgUrls, setImgUrls] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [grading, setGrading] = useState(false);
  const savedRef = useRef({ answers: "", flagged: "" });

  const session = q.data?.session;
  const questions = useMemo(() => q.data?.questions ?? [], [q.data?.questions]);

  // Per-question time tracking: accumulate elapsed ms per exercise id as the student navigates.
  const timeSpentRef = useRef<Record<string, number>>({});
  const activeSegmentRef = useRef<{ exerciseId: string | null; startedAt: number }>({
    exerciseId: null,
    startedAt: Date.now(),
  });
  function flushActiveSegment() {
    const { exerciseId, startedAt } = activeSegmentRef.current;
    if (!exerciseId) return;
    const elapsed = Date.now() - startedAt;
    timeSpentRef.current[exerciseId] = (timeSpentRef.current[exerciseId] ?? 0) + elapsed;
  }
  const currentExerciseId: string | undefined = questions[idx]?.id;
  useEffect(() => {
    flushActiveSegment();
    activeSegmentRef.current = { exerciseId: currentExerciseId ?? null, startedAt: Date.now() };
  }, [currentExerciseId]);

  // Init from session
  useEffect(() => {
    if (!session) return;
    setAnswers((session.answers as unknown as Record<string, number>) ?? {});
    setFlagged(new Set((session.flagged as unknown as string[]) ?? []));
    const timeLimitMs = (session.time_limit_min ?? 60) * 60 * 1000;
    const elapsed = Date.now() - new Date(session.started_at).getTime();
    setSecondsLeft(Math.max(0, Math.floor((timeLimitMs - elapsed) / 1000)));
    if (session.status !== "in_progress") {
      navigate({ to: "/examen-sesion/$sessionId/resultado", params: { sessionId }, replace: true });
    }
  }, [session, navigate, sessionId]);

  // Preload image URLs
  useEffect(() => {
    let alive = true;
    (async () => {
      const map: Record<string, string> = {};
      await Promise.all(
        questions
          .filter((qz) => qz.statement_image_path)
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
  }, [questions]);

  const doSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    flushActiveSegment();
    activeSegmentRef.current = { exerciseId: null, startedAt: Date.now() };
    try {
      await submitFn({ data: { sessionId, answers, timeSpentMs: timeSpentRef.current } });

      // Warm the results page's query cache with the same key it uses, and
      // retry briefly if the graded session isn't readable yet. This is what
      // used to show a transient "not found" on /resultado right after
      // finishing (fixed on a manual refresh, since by then the row was
      // visible) — we now only navigate once the result is confirmed
      // fetchable, or after a few short retries as a last resort.
      setGrading(true);
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          await queryClient.fetchQuery({
            queryKey: ["exam-result", sessionId],
            queryFn: () => resultFn({ data: { sessionId } }),
          });
          break;
        } catch {
          if (attempt === 3) break;
          await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
        }
      }

      navigate({ to: "/examen-sesion/$sessionId/resultado", params: { sessionId }, replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al enviar");
      setSubmitting(false);
      setGrading(false);
    }
  }, [answers, sessionId, submitFn, resultFn, queryClient, navigate, submitting]);

  const awayGuard = useExamAwayGuard({
    active: session?.status === "in_progress",
    onBudgetExceeded: doSubmit,
  });

  const lowTime = secondsLeft !== null && secondsLeft > 0 && secondsLeft <= 300;
  const timeUp = secondsLeft !== null && secondsLeft <= 0;
  const minutes = secondsLeft === null ? 0 : Math.floor(secondsLeft / 60);
  const seconds = secondsLeft === null ? 0 : secondsLeft % 60;

  // Timer
  useEffect(() => {
    if (!session || session.status !== "in_progress" || secondsLeft === null) return;
    if (secondsLeft <= 0) {
      doSubmit();
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => (s === null ? null : s - 1)), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft, session, doSubmit]);

  // Autosave debounced
  useEffect(() => {
    const flag = Array.from(flagged);
    const a = JSON.stringify(answers);
    const f = JSON.stringify(flag);
    if (a === savedRef.current.answers && f === savedRef.current.flagged) return;
    const t = setTimeout(() => {
      saveFn({ data: { sessionId, answers, flagged: flag } })
        .then(() => {
          savedRef.current = { answers: a, flagged: f };
        })
        .catch(() => {});
    }, 800);
    return () => clearTimeout(t);
  }, [answers, flagged, saveFn, sessionId]);

  const answered = useMemo(() => Object.keys(answers).length, [answers]);
  const topicGroups = useMemo(() => groupQuestionsByTopic(questions), [questions]);

  if (q.isLoading || !session)
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-sm text-muted-foreground">Cargando…</div>
    );
  if (questions.length === 0)
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-destructive">
        Examen sin preguntas.
      </div>
    );

  const ex = questions[idx];
  const isLastQuestion = idx === questions.length - 1;
  // Students may finish with unanswered questions — those just grade as empty.
  const canSubmit = isLastQuestion;

  function pick(i: number) {
    setAnswers((a) => {
      // Clicking the already-selected choice again undoes it, letting the
      // student go back to unanswered instead of being stuck once picked.
      if (a[ex.id] === i) {
        const next = { ...a };
        delete next[ex.id];
        return next;
      }
      return { ...a, [ex.id]: i };
    });
  }
  function toggleFlag() {
    setFlagged((s) => {
      const next = new Set(s);
      if (next.has(ex.id)) next.delete(ex.id);
      else next.add(ex.id);
      return next;
    });
  }

  const awayMin = Math.floor(awayGuard.remainingMs / 60000);
  const awaySec = Math.floor((awayGuard.remainingMs % 60000) / 1000);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
          <img src="/brand/icon.svg" alt="" aria-hidden className="h-7 w-7 shrink-0" />
          <p className="truncate font-display text-base font-bold sm:text-lg">
            {session.exam?.title ?? "Examen"}
          </p>
        </div>
      </header>
      <AlertDialog open={awayGuard.isAway && !submitting}>
        <AlertDialogContent onEscapeKeyDown={(e) => e.preventDefault()}>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-warning" />
            Saliste de la pantalla del examen
          </AlertDialogTitle>
          <AlertDialogDescription>
            Puedes ausentarte un máximo acumulado de 5 minutos durante todo el examen. Te queda(n){" "}
            <strong className="text-foreground">
              {String(awayMin).padStart(2, "0")}:{String(awaySec).padStart(2, "0")}
            </strong>{" "}
            de ese presupuesto. Si se agota, el examen se envía automáticamente con tus respuestas
            hasta ese momento.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <Button className="press" onClick={awayGuard.resume}>
              Reanudar examen
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[1fr_260px]">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">
                Pregunta <strong>{idx + 1}</strong> de {questions.length}
              </p>
              <p className="text-xs text-muted-foreground">
                Respondidas: {answered}/{questions.length}
              </p>
            </div>
            <div
              className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold transition-colors duration-300 ${lowTime ? "animate-flash-once bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}
            >
              <Timer className="h-4 w-4" />
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </div>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${((idx + 1) / questions.length) * 100}%` }}
            />
          </div>

          <ExamQuestionCard
            exercise={{ ...ex, choices: ex.choices as string[] }}
            selectedIndex={answers[ex.id]}
            flagged={flagged.has(ex.id)}
            disabled={timeUp}
            imageUrl={imgUrls[ex.id]}
            onSelect={pick}
            onToggleFlag={toggleFlag}
          />

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={idx === 0}
              onClick={() => setIdx((i) => i - 1)}
              className="press min-h-11"
            >
              Anterior
            </Button>
            {idx < questions.length - 1 ? (
              <Button type="button" onClick={() => setIdx((i) => i + 1)} className="press min-h-11">
                Siguiente
              </Button>
            ) : (
              <Button
                type="button"
                onClick={doSubmit}
                disabled={submitting || !canSubmit}
                className="press min-h-11"
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                {grading
                  ? "Calculando tu resultado…"
                  : submitting
                    ? "Enviando…"
                    : "Finalizar examen"}
              </Button>
            )}
          </div>
        </div>

        <aside className="rounded-xl border border-border bg-card p-4 lg:sticky lg:top-4 lg:h-fit">
          <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">Preguntas</p>
          <div className="space-y-3">
            {topicGroups.map((group) => (
              <div key={group.name}>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                  {group.name}
                </p>
                <div className="grid grid-cols-6 gap-2 lg:grid-cols-5">
                  {group.items.map(({ question: qz, index: i }) => {
                    const isAnswered = answers[qz.id] !== undefined;
                    const isFlagged = flagged.has(qz.id);
                    const isCurrent = i === idx;
                    return (
                      <button
                        key={qz.id}
                        type="button"
                        onClick={() => setIdx(i)}
                        className={`press relative h-9 rounded-md border text-xs font-semibold transition ${
                          isCurrent
                            ? "border-primary ring-2 ring-primary/40"
                            : isAnswered
                              ? "border-success/50 bg-success/10 text-success"
                              : "border-border bg-background hover:border-primary/40"
                        }`}
                        aria-label={`Ir a pregunta ${i + 1}`}
                      >
                        {i + 1}
                        {isFlagged && (
                          <Flag className="absolute right-0 top-0 h-2.5 w-2.5 text-warning" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-1 text-xs text-muted-foreground">
            <p>
              <span className="inline-block h-3 w-3 rounded-sm border border-success/50 bg-success/10 align-middle" />{" "}
              Respondida
            </p>
            <p>
              <Flag className="inline h-3 w-3 text-warning" /> Marcada
            </p>
          </div>
          <Button
            type="button"
            className="press mt-4 w-full"
            onClick={() => {
              if (!isLastQuestion) {
                setIdx(questions.length - 1);
                return;
              }
              doSubmit();
            }}
            disabled={submitting || (isLastQuestion && !canSubmit)}
            size="sm"
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLastQuestion
              ? grading
                ? "Calculando…"
                : submitting
                  ? "Enviando…"
                  : "Finalizar"
              : "Ir a la última pregunta"}
          </Button>
        </aside>
      </div>
    </>
  );
}
