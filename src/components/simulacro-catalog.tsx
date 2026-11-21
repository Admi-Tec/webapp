import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Timer, Play, ChevronDown, History, Lock, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExamAttemptRow } from "@/components/exam-attempt-row";
import { PremiumLockChip, usePremiumGate } from "@/components/premium/premium-gate";
import { ComingSoonChip } from "@/components/coming-soon-chip";
import { useSignedIn } from "@/hooks/use-signed-in";
import { listMyTemplateSessions } from "@/lib/exams.functions";
import { publishedTemplatesQO } from "@/lib/exam-catalog";

type TemplateSession = Awaited<ReturnType<typeof listMyTemplateSessions>>[number];

/** University templates live with their official exams; general ones live in the hub. */
export function SimulacroCatalog({ universitySlug }: { universitySlug?: string }) {
  const { data } = useSuspenseQuery(publishedTemplatesQO);
  const templates = data.filter((template) =>
    universitySlug ? template.university?.slug === universitySlug : !template.university,
  );
  const navigate = useNavigate();
  const signedIn = useSignedIn();
  const sessionsFn = useServerFn(listMyTemplateSessions);
  const sessionsQ = useQuery({
    queryKey: ["my-template-sessions"],
    queryFn: () => sessionsFn(),
    enabled: signedIn === true && templates.length > 0,
  });
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set());
  const premium = usePremiumGate("los simulacros específicos por universidad");

  const sessionsByExam = new Map<string, TemplateSession[]>();
  (signedIn === true ? (sessionsQ.data ?? []) : []).forEach((session) => {
    if (!session.exam_id) return;
    const attempts = sessionsByExam.get(session.exam_id) ?? [];
    attempts.push(session);
    sessionsByExam.set(session.exam_id, attempts);
  });

  function toggleHistory(id: string) {
    setExpandedHistory((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onGenerateClick() {
    toast("Inicia sesión para generar un simulacro", {
      description: "Crea una cuenta gratis para guardar tu progreso.",
    });
    void navigate({ to: "/auth" });
  }

  if (!universitySlug && templates.length === 0) return null;

  return (
    <section id="simulacros" className="mt-10 scroll-mt-24" aria-labelledby="simulacros-heading">
      <div className="flex items-center justify-between gap-4">
        <h2 id="simulacros-heading" className="font-display text-xl font-bold">
          {universitySlug ? "Simulacros" : "Simulacros generales"}
        </h2>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">
          {templates.length} {templates.length === 1 ? "simulacro" : "simulacros"}
        </span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Practica con tiempo y una distribución de cursos definida. Las preguntas se eligen al azar
        en cada intento.
      </p>

      {templates.length === 0 && (
        <p className="mt-5 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Aún no hay simulacros publicados para esta universidad.
        </p>
      )}
      {signedIn === true && sessionsQ.isError && templates.length > 0 && (
        <p className="mt-4 text-sm text-muted-foreground" role="status">
          No se pudo cargar tu historial.{" "}
          <button
            type="button"
            onClick={() => {
              void sessionsQ.refetch();
            }}
            className="text-primary hover:underline"
          >
            Reintentar
          </button>
        </p>
      )}

      <div className="mt-5 grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => {
          const attempts = sessionsByExam.get(template.id) ?? [];
          const isExpanded = expandedHistory.has(template.id);
          const isUniTemplate = !!template.university;
          const locked = isUniTemplate && premium.locked && !premium.loading;
          const comingSoon = template.totalQuestions === 0;
          const historyId = `simulacro-history-${template.id}`;
          return (
            <article key={template.id} className="rounded-xl border border-border bg-card">
              <div className="p-5">
                <h3 className="font-display font-bold">{template.title}</h3>
                {template.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{template.description}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {template.university && (
                    <Badge variant="secondary">{template.university.short_name}</Badge>
                  )}
                  {locked && <PremiumLockChip />}
                  <Badge variant="outline">
                    <Timer className="mr-1 h-3 w-3" aria-hidden /> {template.time_limit_min} min
                  </Badge>
                  <Badge variant="outline">{template.totalQuestions} preguntas</Badge>
                  <Badge variant="outline">
                    {template.ruleCount} {template.ruleCount === 1 ? "curso" : "cursos"}
                  </Badge>
                  {comingSoon && <ComingSoonChip />}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {comingSoon ? (
                    <Button size="sm" className="press" disabled>
                      Próximamente
                    </Button>
                  ) : signedIn === true ? (
                    isUniTemplate ? (
                      <Button
                        size="sm"
                        className="press"
                        disabled={premium.loading}
                        onClick={() =>
                          premium.gate(() => {
                            void navigate({ to: "/simulacro/$id", params: { id: template.id } });
                          })
                        }
                      >
                        {locked ? (
                          <Lock className="h-4 w-4" aria-hidden />
                        ) : (
                          <Play className="h-4 w-4" aria-hidden />
                        )}
                        Generar nuevo simulacro
                      </Button>
                    ) : (
                      <Button asChild size="sm" className="press">
                        <Link to="/simulacro/$id" params={{ id: template.id }}>
                          <Play className="h-4 w-4" aria-hidden /> Generar nuevo simulacro
                        </Link>
                      </Button>
                    )
                  ) : (
                    <Button
                      size="sm"
                      className="press"
                      onClick={onGenerateClick}
                      disabled={signedIn === null}
                    >
                      <LogIn className="h-4 w-4" aria-hidden /> Ingresar para generar
                    </Button>
                  )}
                  {attempts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleHistory(template.id)}
                      aria-expanded={isExpanded}
                      aria-controls={historyId}
                      className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <History className="h-4 w-4" aria-hidden />
                      {attempts.length} {attempts.length === 1 ? "intento" : "intentos"}
                      <ChevronDown
                        className={`h-3.5 w-3.5 ${isExpanded ? "rotate-180" : ""}`}
                        aria-hidden
                      />
                    </button>
                  )}
                </div>
              </div>
              {attempts.length > 0 && (
                <div
                  id={historyId}
                  hidden={!isExpanded}
                  className="border-t border-border px-5 pb-4 pt-3"
                >
                  <p className="mb-2 text-sm font-medium text-muted-foreground">Historial</p>
                  <div className="space-y-2">
                    {attempts.map((attempt) => (
                      <ExamAttemptRow
                        key={attempt.id}
                        sessionId={attempt.id}
                        startedAt={attempt.started_at}
                        score={attempt.score}
                        maxScore={attempt.max_score}
                        total={attempt.total ?? 0}
                        onDeleted={() => {
                          void sessionsQ.refetch();
                        }}
                        compact
                      />
                    ))}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
      {premium.gateDialog}
    </section>
  );
}
