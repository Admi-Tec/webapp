import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil, Trash2, Plus, Archive } from "lucide-react";
import { listAdminExams, deleteExam, archiveExam } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/examenes/")({
  component: AdminExamsList,
});

type Filter = "all" | "standard" | "template";

function AdminExamsList() {
  const router = useRouter();
  const listFn = useServerFn(listAdminExams);
  const del = useServerFn(deleteExam);
  const archive = useServerFn(archiveExam);
  const q = useQuery({ queryKey: ["admin-exams"], queryFn: () => listFn() });
  const [filter, setFilter] = useState<Filter>("all");

  async function onDelete(id: string) {
    if (!confirm("¿Eliminar este examen definitivamente?")) return;
    try {
      await del({ data: { id } });
      toast.success("Examen eliminado");
      router.invalidate();
      q.refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Error");
    }
  }

  async function onArchive(id: string) {
    if (
      !confirm(
        "¿Archivar este examen? Dejará de aparecer para los estudiantes, pero se conserva el historial.",
      )
    )
      return;
    try {
      await archive({ data: { id } });
      toast.success("Examen archivado");
      q.refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Error");
    }
  }

  const rows = useMemo(
    () =>
      (q.data ?? []).filter((e: any) =>
        filter === "all" ? true : (e.exam_type ?? "standard") === filter,
      ),
    [q.data, filter],
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">{rows.length} exámenes</p>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <TabsList>
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="standard">Estándar</TabsTrigger>
              <TabsTrigger value="template">Plantillas</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <Button asChild size="sm">
          <Link to="/admin/examenes/nuevo">
            <Plus className="mr-1 h-4 w-4" /> Nuevo examen
          </Link>
        </Button>
      </div>
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Preguntas</TableHead>
              <TableHead>Tiempo</TableHead>
              <TableHead>Intentos</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                  Cargando…
                </TableCell>
              </TableRow>
            )}
            {rows.map((e: any) => {
              const isTemplate = (e.exam_type ?? "standard") === "template";
              const hasAttempts = (e.attemptCount ?? 0) > 0;
              return (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.title}</TableCell>
                  <TableCell>
                    <Badge variant={isTemplate ? "secondary" : "outline"}>
                      {isTemplate ? "Plantilla" : "Estándar"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={e.status === "published" ? "default" : "outline"}
                      className="capitalize"
                    >
                      {e.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{e.questionCount}</TableCell>
                  <TableCell>{e.time_limit_min} min</TableCell>
                  <TableCell>{e.attemptCount ?? 0}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button asChild size="icon" variant="ghost">
                        <Link to="/admin/examenes/$id" params={{ id: e.id }} aria-label="Editar">
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      {e.status !== "archived" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onArchive(e.id)}
                          aria-label="Archivar"
                          title="Archivar"
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onDelete(e.id)}
                        aria-label="Eliminar"
                        disabled={hasAttempts}
                        title={
                          hasAttempts ? "Archivar en su lugar: hay intentos generados" : "Eliminar"
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && !q.isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                  Sin exámenes.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
