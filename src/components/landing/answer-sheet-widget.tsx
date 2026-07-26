import { useEffect, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Timer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MathText, ChoiceText } from "@/lib/math-render";
import { dailyExerciseQO, submitDailyExerciseAnswer } from "@/lib/daily-exercise.functions";
import { useInViewOnce } from "@/hooks/use-in-view-once";

const difficultyLabel = { facil: "Fácil", medio: "Medio", dificil: "Difícil" } as const;

type StoredDaily = {
  exerciseId: string;
  startedAt: number;
  answer?: {
    selectedChoice: number;
    isCorrect: boolean;
    correctChoice: number;
    elapsedSeconds: number;
  };
};

function readStoredDaily(exerciseId: string): StoredDaily | null {
  try {
    const raw = localStorage.getItem("admitec_daily");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDaily;
    return parsed.exerciseId === exerciseId ? parsed : null;
  } catch {
    return null;
  }
}

function writeStoredDaily(entry: StoredDaily) {
  try {
    localStorage.setItem("admitec_daily", JSON.stringify(entry));
  } catch {
    // best-effort only — the widget still works without persistence, it just
    // won't remember the timer/answer across a reload on this visit
  }
}

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * The landing page's one bold, signature moment: a real exercise pulled from
 * the database, the same for every visitor on a given day (see get_daily_exercise
 * in the DB — deterministic per calendar date, no cron needed) and answerable
 * in place. The accuracy readout reflects everyone who answered today's exercise.
 */
export function AnswerSheetWidget() {
  const { data: daily } = useSuspenseQuery(dailyExerciseQO);
  const submitAnswer = useServerFn(submitDailyExerciseAnswer);

  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [alreadyResolved, setAlreadyResolved] = useState(false);
  // The exercise stays blurred behind an invitation panel until the visitor
  // explicitly starts — the clock must never run before they've read the deal.
  const [covered, setCovered] = useState(true);
  const [result, setResult] = useState<{
    isCorrect: boolean;
    correctChoice: number;
    totalAnswers: number;
    correctAnswers: number;
  } | null>(null);
  const { ref: rootRef, visible } = useInViewOnce<HTMLDivElement>();

  // Resume where this visitor left off for today's exercise: already answered
  // (freeze the clock, show the "ya resuelto" message), mid-attempt (keep the
  // clock counting from the real start time instead of resetting on refresh),
  // or brand new (stay covered until they press "Comenzar el reto").
  useEffect(() => {
    if (!daily) return;
    const stored = readStoredDaily(daily.exerciseId);
    if (stored?.answer) {
      setSelected(stored.answer.selectedChoice);
      setResult({
        isCorrect: stored.answer.isCorrect,
        correctChoice: stored.answer.correctChoice,
        totalAnswers: daily.totalAnswers,
        correctAnswers: daily.correctAnswers,
      });
      setElapsedSeconds(stored.answer.elapsedSeconds);
      setAlreadyResolved(true);
      setCovered(false);
    } else if (stored) {
      setStartedAt(stored.startedAt);
      setCovered(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daily?.exerciseId]);

  // Ticks only while the question is still open — once answered (this visit or a
  // past one), the clock freezes at the time it actually took to solve it.
  useEffect(() => {
    if (startedAt === null || result) return;
    const tick = () => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [startedAt, result]);

  if (!daily) return null;

  function handleStart() {
    if (!daily || !covered) return;
    const now = Date.now();
    writeStoredDaily({ exerciseId: daily.exerciseId, startedAt: now });
    setStartedAt(now);
    setCovered(false);
  }

  async function handleSelect(i: number) {
    if (result || submitting || !daily || startedAt === null) return;
    setSelected(i);
    setSubmitting(true);
    try {
      const res = await submitAnswer({ data: { selectedChoice: i } });
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setResult(res);
      setElapsedSeconds(elapsed);
      writeStoredDaily({
        exerciseId: daily.exerciseId,
        startedAt,
        answer: {
          selectedChoice: i,
          isCorrect: res.isCorrect,
          correctChoice: res.correctChoice,
          elapsedSeconds: elapsed,
        },
      });
    } catch {
      setSelected(null);
    } finally {
      setSubmitting(false);
    }
  }

  const accuracy = result
    ? result.totalAnswers > 0
      ? Math.round((result.correctAnswers / result.totalAnswers) * 100)
      : 0
    : null;

  return (
    <div
      ref={rootRef}
      className="relative overflow-hidden rounded-lg border border-border bg-card shadow-[0_0_0_1px_rgba(0,0,0,0.2)]"
    >
      <div
        aria-hidden
        className="animate-glow pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full bg-primary/15 blur-3xl"
      />

      {/* Sheet header */}
      <div className="relative flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
          <span className="font-data text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Reto del día{daily.topicName ? ` · ${daily.topicName}` : ""}
          </span>
        </div>
        <div className="flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1">
          <span
            className="font-data text-sm font-semibold tabular-nums text-foreground"
            aria-live="off"
          >
            {formatTime(elapsedSeconds)}
          </span>
        </div>
      </div>

      {alreadyResolved && (
        <div className="animate-alert-in relative mx-5 mt-4 flex items-center gap-2 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm font-medium text-success">
          <Check className="h-4 w-4 shrink-0" strokeWidth={3} />
          Ya resolviste el reto de hoy. Vuelve mañana por uno nuevo.
        </div>
      )}

      {/* Question */}
      <div className="relative px-5 py-5">
        {/* Invitation panel: the exercise waits blurred underneath until the
            visitor starts, and only then does the clock begin. */}
        {covered && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-b-lg bg-card/60 px-6 text-center backdrop-blur-[2px]">
            <span className="grid h-11 w-11 place-items-center rounded-full border border-primary/40 bg-primary/10 text-primary">
              <Timer className="h-5 w-5" aria-hidden />
            </span>
            <p className="max-w-xs text-balance text-sm font-semibold text-foreground">
              Un ejercicio real de examen de admision.
            </p>
            <Button type="button" onClick={handleStart} className="press min-h-10">
              Comenzar el reto del día
            </Button>
            <p className="max-w-xs text-xs text-muted-foreground">
              Al comenzar se revela el ejercicio y el cronómetro empieza a correr.
            </p>
          </div>
        )}

        <div
          aria-hidden={covered}
          className={cn(
            "transition-[filter,opacity] duration-500",
            covered && "pointer-events-none select-none opacity-60 blur-md",
          )}
        >
          <p className="font-data text-[0.7rem] uppercase tracking-[0.12em] text-muted-foreground">
            {difficultyLabel[daily.difficulty]}
          </p>
          <MathText
            text={daily.statementMd}
            className="mt-2 text-pretty text-sm font-medium leading-snug text-foreground"
          />

          <ul className="mt-5 flex flex-col gap-2" role="radiogroup" aria-label="Alternativas">
            {daily.choices.map((choiceText, i) => {
              const isPicked = selected === i;
              const isAnswerRow = result && i === result.correctChoice;
              const isWrongPick = result && isPicked && !result.isCorrect;
              return (
                <li key={i}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={isPicked}
                    disabled={!!result || submitting}
                    onClick={() => handleSelect(i)}
                    className={cn(
                      visible && "animate-reveal-row",
                      "press flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors duration-300 disabled:cursor-default",
                      isAnswerRow
                        ? "border-success/60 bg-success/10"
                        : isWrongPick
                          ? "border-destructive/60 bg-destructive/10"
                          : isPicked
                            ? "border-primary bg-primary/10"
                            : "border-border bg-transparent hover:border-primary/40",
                    )}
                    style={visible ? { animationDelay: `${i * 70}ms` } : undefined}
                  >
                    <span
                      className={cn(
                        "font-data grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-semibold transition-colors duration-300",
                        isAnswerRow
                          ? "border-success bg-success text-success-foreground"
                          : isWrongPick
                            ? "border-destructive bg-destructive text-destructive-foreground"
                            : "border-border text-muted-foreground",
                      )}
                    >
                      {isAnswerRow ? (
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      ) : isWrongPick ? (
                        <X className="h-3.5 w-3.5" strokeWidth={3} />
                      ) : (
                        String.fromCharCode(65 + i)
                      )}
                    </span>
                    <span
                      className={cn(
                        "text-xs",
                        isAnswerRow || isWrongPick
                          ? "font-semibold text-foreground"
                          : "text-foreground/85",
                      )}
                    >
                      <ChoiceText text={choiceText} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Score readout */}
      <div className="relative flex items-center justify-between gap-3 border-t border-border bg-muted/40 px-5 py-4">
        <div>
          <p className="font-data text-[0.7rem] uppercase tracking-[0.12em] text-muted-foreground">
            Aciertos de hoy
          </p>
          <p className="font-data mt-0.5 text-2xl font-bold tabular-nums text-foreground">
            {accuracy ?? "—"}
            {accuracy !== null && <span className="text-base text-muted-foreground">%</span>}
          </p>
        </div>
        <span
          className={cn(
            "font-data rounded-md border px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.1em] transition-colors duration-500",
            result
              ? "border-success/50 bg-success/10 text-success"
              : "border-border text-muted-foreground",
          )}
        >
          {result ? "Resuelto" : "Sin resolver"}
        </span>
      </div>
    </div>
  );
}
