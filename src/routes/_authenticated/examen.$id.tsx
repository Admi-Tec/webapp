import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Timer,
  Play,
  RotateCcw,
  Loader2,
  Lock,
  Shuffle,
  VolumeX,
  Save,
  History,
  ChevronDown,
} from "lucide-react";
import { getExamPreview, getMyExamAttempts, startExamSession } from "@/lib/exams.functions";
import { requestExamFullscreen } from "@/lib/exam-fullscreen";
import { ExamAttemptRow } from "@/components/exam-attempt-row";
import { PremiumLockChip, usePremiumGate } from "@/components/premium/premium-gate";
import { ComingSoonChip } from "@/components/coming-soon-chip";

export const Route = createFileRoute("/_authenticated/examen/$id")({
  component: ExamPreview,
});

function ExamPreview() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const previewFn = useServerFn(getExamPreview);
  const attemptsFn = useServerFn(getMyExamAttempts);
  const startFn = useServerFn(startExamSession);
  const [starting, setStarting] = useState(false);
  const [showAttempts, setShowAttempts] = useState(false);
  // Los exámenes oficiales completos son parte de Premium (gating visual de
  // esta fase: la puerta de entrada es este botón de inicio).
  const premium = usePremiumGate("los exámenes oficiales");
  const showLock = premium.locked && !premium.loading;

  const preview = useQuery({
    queryKey: ["exam-preview", id],
    queryFn: () => previewFn({ data: { id } }),
  });
  const attempts = useQuery({
    queryKey: ["exam-attempts", id],
    queryFn: () => attemptsFn({ data: { examId: id } }),
  });

  async function onStart() {
    setStarting(true);
    try {
      const { sessionId } = await startFn({ data: { examId: id } });
      navigate({ to: "/examen-sesion/$sessionId", params: { sessionId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo iniciar");
    } finally {
      setStarting(false);
    }
  }

  if (preview.isLoading)
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="h-3.5 w-24 animate-pulse rounded bg-muted motion-reduce:animate-none" />
        <div className="mt-3 h-9 w-72 animate-pulse rounded bg-muted motion-reduce:animate-none sm:h-10" />
        <div className="mt-4 flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-6 w-20 animate-pulse rounded-full bg-muted motion-reduce:animate-none"
            />
          ))}
        </div>
        <div className="mt-6 h-64 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
      </div>
    );
  if (preview.isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-destructive">No se pudo cargar este examen.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {preview.error instanceof Error ? preview.error.message : null}
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Button variant="outline" className="press" onClick={() => preview.refetch()}>
            Reintentar
          </Button>
          <Button asChild variant="outline" className="press">
            <Link to="/examenes">Volver</Link>
          </Button>
        </div>
      </div>
    );
  }
  if (!preview.data)
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p>Examen no disponible.</p>
        <Link to="/examenes" className="mt-4 inline-block text-primary hover:underline">
          Volver
        </Link>
      </div>
    );

  const e = preview.data;
  const done = (attempts.data ?? []).filter(
    (a) => a.status === "graded" || a.status === "submitted",
  );
  const inProgressRaw = (attempts.data ?? []).find((a) => a.status === "in_progress");
  // Mirrors the expiry check in startExamSession: una sesión in_progress cuyo
  // tiempo límite ya pasó no debe bloquear un intento nuevo con "Reanudar" —
  // dejamos que el flujo de "Iniciar examen" la cierre y cree una fresca.
  const inProgressExpired =
    !!inProgressRaw &&
    !!e.time_limit_min &&
    Date.now() - new Date(inProgressRaw.started_at).getTime() >= e.time_limit_min * 60000;
  const inProgress = inProgressExpired ? undefined : inProgressRaw;
  // Mirrors the server-side rule in startExamSession: sin max_attempts, intentos ilimitados.
  const reachedMax = e.max_attempts ? done.length >= e.max_attempts : false;
  const comingSoon = e.questionCount === 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <nav className="text-xs text-muted-foreground">
        <Link to="/examenes" className="hover:underline">
          Exámenes
        </Link>{" "}
        / <span className="text-foreground">{e.title}</span>
      </nav>
      <h1 className="mt-3 font-display text-3xl font-bold">{e.title}</h1>
      {e.description && <p className="mt-2 text-muted-foreground">{e.description}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant="outline">
          <Timer className="mr-1 h-3 w-3" /> {e.time_limit_min} min
        </Badge>
        <Badge variant="outline">{e.questionCount} preguntas</Badge>
        <Badge variant="outline">Aprobación: {e.passing_score} pts</Badge>
        <Badge variant="outline">Máx: {e.maxScore} pts</Badge>
        {e.max_attempts && (
          <Badge variant="outline">
            Intentos: {done.length}/{e.max_attempts}
          </Badge>
        )}
        <Badge variant="outline" className="capitalize">
          Orden: {e.question_order === "random" ? "aleatorio" : "fijo"}
        </Badge>
        {comingSoon && <ComingSoonChip />}
        {showLock && <PremiumLockChip />}
      </div>

      <div className="animate-card-swap mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="font-display text-lg font-bold">Antes de comenzar</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <Timer className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            Al iniciar comienza el cronómetro de{" "}
            <strong className="text-foreground">&nbsp;{e.time_limit_min} minutos&nbsp;</strong>. Si
            el tiempo termina, el examen se envía automáticamente.
          </li>
          <li className="flex items-start gap-2">
            <VolumeX className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            Busca un lugar silencioso y sin distracciones para concentrarte, igual que en un examen
            real.
          </li>
          <li className="flex items-start gap-2">
            <Shuffle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            Puedes marcar preguntas para revisarlas después.
          </li>
          <li className="flex items-start gap-2">
            <Save className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            Tus respuestas se guardan automáticamente.
          </li>
          <li className="flex items-start gap-2">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            El examen se rinde en pantalla completa. Puedes ausentarte un máximo acumulado de 5
            minutos; si superas ese tiempo, el examen se envía automáticamente con tus respuestas
            hasta ese momento.
          </li>
        </ul>

        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <Badge variant="outline" className="border-success/40 text-success">
            Correcta: {e.points_correct >= 0 ? "+" : ""}
            {e.points_correct} pts
          </Badge>
          <Badge variant="outline" className="border-destructive/40 text-destructive">
            Incorrecta: {e.points_incorrect >= 0 ? "+" : ""}
            {e.points_incorrect} pts
          </Badge>
          <Badge variant="outline">
            Vacía: {e.points_empty >= 0 ? "+" : ""}
            {e.points_empty} pts
          </Badge>
        </div>

        {e.topicBreakdown?.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Preguntas por curso
            </p>
            <ul className="mt-2 space-y-1.5 text-sm">
              {e.topicBreakdown.map((tb, i) => (
                <li
                  key={`${tb.name}-${i}`}
                  className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2"
                >
                  <span>{tb.name}</span>
                  <Badge variant="secondary">{tb.count}</Badge>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {inProgress ? (
            <Button
              size="lg"
              className="press"
              onClick={() => {
                requestExamFullscreen();
                navigate({ to: "/examen-sesion/$sessionId", params: { sessionId: inProgress.id } });
              }}
            >
              <RotateCcw className="mr-2 h-4 w-4" /> Reanudar intento
            </Button>
          ) : (
            <Button
              size="lg"
              className="press"
              onClick={() => {
                requestExamFullscreen();
                premium.gate(onStart);
              }}
              disabled={starting || reachedMax || comingSoon}
            >
              {starting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : showLock ? (
                <Lock className="mr-2 h-4 w-4" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              {starting
                ? "Iniciando…"
                : comingSoon
                  ? "Próximamente"
                  : reachedMax
                    ? "Sin intentos disponibles"
                    : "Iniciar examen"}
            </Button>
          )}
        </div>
        {showLock && (
          <p className="mt-3 text-xs text-muted-foreground">
            Los exámenes oficiales completos son parte de Premium. Puedes activar tu prueba gratuita
            de 7 días al iniciar.
          </p>
        )}
      </div>
      {premium.gateDialog}

      {done.length > 0 && (
        <div className="mt-8">
          <button
            type="button"
            onClick={() => setShowAttempts((v) => !v)}
            className="inline-flex items-center gap-1.5 font-display text-lg font-bold hover:text-primary"
          >
            <History className="h-4 w-4" />
            Intentos anteriores ({done.length})
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${showAttempts ? "rotate-180" : ""}`}
            />
          </button>
          <div className="collapsible" data-open={showAttempts}>
            <div className="mt-3 space-y-2">
              {done.map((a) => (
                <ExamAttemptRow
                  key={a.id}
                  sessionId={a.id}
                  startedAt={a.started_at}
                  score={a.score}
                  maxScore={a.max_score}
                  total={a.total ?? 0}
                  onDeleted={() => attempts.refetch()}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
