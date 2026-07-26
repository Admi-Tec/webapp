import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Star, Pencil, CheckCircle2, XCircle, Flag } from "lucide-react";
import {
  listExerciseReports,
  listLowRatedExercises,
  resolveExerciseReport,
} from "@/lib/exercise-review.functions";
import { EXERCISE_REPORT_REASONS } from "@/components/report-problem-dialog";
import { MathText } from "@/lib/math-render";

export const Route = createFileRoute("/_authenticated/admin/revisar")({
  component: RevisarPage,
});

const reasonLabel = (value: string) =>
  EXERCISE_REPORT_REASONS.find((r) => r.value === value)?.label ?? value;

function RevisarPage() {
  const listReportsFn = useServerFn(listExerciseReports);
  const listLowRatedFn = useServerFn(listLowRatedExercises);
  const resolveFn = useServerFn(resolveExerciseReport);
  const qc = useQueryClient();

  const [status, setStatus] = useState<"pendiente" | "resuelto" | "descartado" | "all">(
    "pendiente",
  );
  const [reasonFilter, setReasonFilter] = useState<string>("all");

  const reportsQ = useQuery({
    queryKey: ["admin-exercise-reports", status],
    queryFn: () => listReportsFn({ data: { status } }),
  });
  const lowRatedQ = useQuery({
    queryKey: ["admin-low-rated-exercises"],
    queryFn: () => listLowRatedFn(),
  });

  const filteredReports = useMemo(() => {
    const rows = reportsQ.data ?? [];
    if (reasonFilter === "all") return rows;
    return rows.filter((r: any) => r.reason === reasonFilter);
  }, [reportsQ.data, reasonFilter]);

  async function onAction(reportId: string, action: "resolve" | "dismiss") {
    try {
      await resolveFn({ data: { reportId, action } });
      toast.success(
        action === "resolve"
          ? "Marcado como resuelto — se notificó al estudiante."
          : "Reporte descartado.",
      );
      qc.invalidateQueries({ queryKey: ["admin-exercise-reports"] });
      qc.invalidateQueries({ queryKey: ["admin-exercise-review-badge"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Error");
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-xl font-bold">Ejercicios a revisar</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ejercicios reportados por estudiantes, y ejercicios sin reportes pero con calificación
          promedio baja — ambos son señales de que algo podría estar mal.
        </p>
      </div>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="inline-flex items-center gap-1.5 font-display text-lg font-bold">
            <Flag className="h-4 w-4" /> Reportados ({filteredReports.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            <Select value={status} onValueChange={(v: any) => setStatus(v)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendiente">Pendientes</SelectItem>
                <SelectItem value="resuelto">Resueltos</SelectItem>
                <SelectItem value="descartado">Descartados</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={reasonFilter} onValueChange={setReasonFilter}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los motivos</SelectItem>
                {EXERCISE_REPORT_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          {reportsQ.isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
          {!reportsQ.isLoading && filteredReports.length === 0 && (
            <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Sin reportes en este filtro.
            </p>
          )}
          {filteredReports.map((r: any) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="destructive">{reasonLabel(r.reason)}</Badge>
                    {r.exercise?.topic?.name && (
                      <Badge variant="secondary">{r.exercise.topic.name}</Badge>
                    )}
                    {r.exercise?.subtopic?.name && (
                      <Badge variant="outline">{r.exercise.subtopic.name}</Badge>
                    )}
                    {r.status !== "pendiente" && (
                      <Badge variant="outline" className="capitalize">
                        {r.status}
                      </Badge>
                    )}
                  </div>
                  <MathText
                    text={r.exercise?.statement_md ?? ""}
                    clampLines={2}
                    className="mt-2 text-sm"
                  />
                  {r.note && <p className="mt-1 text-sm text-muted-foreground">"{r.note}"</p>}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("es-PE")}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link to="/admin/ejercicios/$id" params={{ id: r.exercise_id }}>
                      <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                    </Link>
                  </Button>
                  {r.status === "pendiente" && (
                    <>
                      <Button size="sm" onClick={() => onAction(r.id, "resolve")}>
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Resuelto
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => onAction(r.id, "dismiss")}>
                        <XCircle className="mr-1 h-3.5 w-3.5" /> Descartar
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h3 className="inline-flex items-center gap-1.5 font-display text-lg font-bold">
          <Star className="h-4 w-4" /> Calificación baja, sin reporte (
          {(lowRatedQ.data ?? []).length})
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          No tienen un reporte puntual, pero su calificación promedio está por debajo de 2 estrellas
          — vale la pena revisarlos igual.
        </p>
        <div className="mt-3 space-y-2">
          {lowRatedQ.isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
          {!lowRatedQ.isLoading && (lowRatedQ.data ?? []).length === 0 && (
            <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Ningún ejercicio en esta categoría por ahora.
            </p>
          )}
          {(lowRatedQ.data ?? []).map((r: any) => (
            <div
              key={r.exercise_id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className="border-amber-500/40 text-amber-600">
                    <Star className="mr-1 h-3 w-3 fill-amber-400 text-amber-400" />
                    {r.avg_rating} ({r.rating_count})
                  </Badge>
                  {r.topic_name && <Badge variant="secondary">{r.topic_name}</Badge>}
                  {r.subtopic_name && <Badge variant="outline">{r.subtopic_name}</Badge>}
                </div>
                <MathText text={r.statement_md ?? ""} clampLines={2} className="mt-2 text-sm" />
              </div>
              <Button asChild size="sm" variant="outline" className="shrink-0">
                <Link to="/admin/ejercicios/$id" params={{ id: r.exercise_id }}>
                  <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
