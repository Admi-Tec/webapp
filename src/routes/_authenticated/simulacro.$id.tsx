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
  ListChecks,
  Lock,
  VolumeX,
  Shuffle,
  Save,
  History,
  ChevronDown,
} from "lucide-react";
import { getTemplatePreview, getMyExamAttempts, startExamSession } from "@/lib/exams.functions";
import { requestExamFullscreen } from "@/lib/exam-fullscreen";
import { ExamAttemptRow } from "@/components/exam-attempt-row";
import { PremiumLockChip, usePremiumGate } from "@/components/premium/premium-gate";
import { ComingSoonChip } from "@/components/coming-soon-chip";

export const Route = createFileRoute("/_authenticated/simulacro/$id")({
  component: SimulacroPreview,
});

function SimulacroPreview() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const previewFn = useServerFn(getTemplatePreview);
  const attemptsFn = useServerFn(getMyExamAttempts);
  const startFn = useServerFn(startExamSession);
  const [starting, setStarting] = useState(false);
  const [showAttempts, setShowAttempts] = useState(false);
  // Las plantillas generales son gratis; las específicas de una universidad
  // (t.university presente) son parte de Premium.
  const premium = usePremiumGate("los simulacros específicos de tu universidad");

  const preview = useQuery({
    queryKey: ["template-preview", id],
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
      toast.error(e instanceof Error ? e.message : "No se pudo generar el simulacro");
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
        <p className="text-destructive">No se pudo cargar este simulacro.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {preview.error instanceof Error ? preview.error.message : null}
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Button variant="outline" className="press" onClick={() => preview.refetch()}>
            Reintentar
          </Button>
          <Button asChild variant="outline" className="press">
            <Link to="/simulacros">Volver</Link>
          </Button>
        </div>
      </div>
    );
  }
  if (!preview.data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p>Este simulacro no está disponible.</p>
        <Link to="/simulacros" className="mt-4 inline-block text-primary hover:underline">
          Volver
        </Link>
      </div>
    );
  }

  const t = preview.data;
  const isUniTemplate = !!t.university;
  const showLock = isUniTemplate && premium.locked && !premium.loading;
  const comingSoon = t.totalQuestions === 0;
  const done = (attempts.data ?? []).filter(
    (a) => a.status === "graded" || a.status === "submitted",
  );
  const inProgress = (attempts.data ?? []).find((a) => a.status === "in_progress");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <nav className="text-xs text-muted-foreground">
        <Link to="/simulacros" className="hover:underline">
          Simulacros
        </Link>{" "}
        / <span className="text-foreground">{t.title}</span>
      </nav>
      <h1 className="mt-3 font-display text-3xl font-bold">{t.title}</h1>
      {t.description && <p className="mt-2 text-muted-foreground">{t.description}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {t.university && <Badge variant="secondary">{t.university.short_name}</Badge>}
        {showLock && <PremiumLockChip />}
        <Badge variant="outline">
          <Timer className="mr-1 h-3 w-3" /> {t.time_limit_min} min
        </Badge>
        <Badge variant="outline">
          <ListChecks className="mr-1 h-3 w-3" /> {t.totalQuestions} preguntas
        </Badge>
        {t.passing_score != null && (
          <Badge variant="outline">Aprobación: {t.passing_score} pts</Badge>
        )}
        <Badge variant="outline">Máx: {t.maxScore} pts</Badge>
        {comingSoon && <ComingSoonChip />}
      </div>

      <div className="animate-card-swap mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="font-display text-lg font-bold">Antes de comenzar</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <Timer className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            Tendrás{" "}
            <strong className="text-foreground">&nbsp;{t.time_limit_min} minutos&nbsp;</strong>{" "}
            desde que inicies. Si el tiempo se agota, el simulacro se envía automáticamente.
          </li>
          <li className="flex items-start gap-2">
            <Shuffle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            Las preguntas se eligen al azar según el banco de cada curso — si repites el simulacro,
            obtendrás una combinación distinta.
          </li>
          <li className="flex items-start gap-2">
            <VolumeX className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            Busca un lugar silencioso y sin distracciones para concentrarte, igual que en un examen
            real.
          </li>
          <li className="flex items-start gap-2">
            <Save className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            Puedes marcar preguntas para revisarlas después; tus respuestas se guardan
            automáticamente.
          </li>
          <li className="flex items-start gap-2">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            El simulacro se rinde en pantalla completa. Puedes ausentarte un máximo acumulado de 5
            minutos; si superas ese tiempo, se envía automáticamente con tus respuestas hasta ese
            momento.
          </li>
        </ul>

        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <Badge variant="outline" className="border-success/40 text-success">
            Correcta: {t.points_correct >= 0 ? "+" : ""}
            {t.points_correct} pts
          </Badge>
          <Badge variant="outline" className="border-destructive/40 text-destructive">
            Incorrecta: {t.points_incorrect >= 0 ? "+" : ""}
            {t.points_incorrect} pts
          </Badge>
          <Badge variant="outline">
            Vacía: {t.points_empty >= 0 ? "+" : ""}
            {t.points_empty} pts
          </Badge>
        </div>

        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Preguntas por curso
          </p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {t.topicBreakdown.map((tb: { name: string; count: number }, i: number) => (
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
                if (isUniTemplate) premium.gate(onStart);
                else onStart();
              }}
              disabled={starting || comingSoon}
            >
              {starting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : showLock ? (
                <Lock className="mr-2 h-4 w-4" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              {starting ? "Generando…" : comingSoon ? "Próximamente" : "Comenzar simulacro"}
            </Button>
          )}
        </div>
        {showLock && (
          <p className="mt-3 text-xs text-muted-foreground">
            Los simulacros específicos de {t.university!.short_name} son parte de Premium. Puedes
            activar tu prueba gratuita de 7 días al comenzar.
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
