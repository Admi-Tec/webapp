import { useMemo, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Trash2, Plus, Search, Shuffle } from "lucide-react";
import {
  listAdminExercises,
  listAdminMeta,
  listExerciseYears,
  deleteExercise,
} from "@/lib/admin.functions";
import { reshuffleDailyExercise } from "@/lib/daily-exercise.functions";
import { MathText } from "@/lib/math-render";

export const Route = createFileRoute("/_authenticated/admin/ejercicios/")({
  component: AdminExercisesList,
});

function AdminExercisesList() {
  const router = useRouter();
  const fetchList = useServerFn(listAdminExercises);
  const metaFn = useServerFn(listAdminMeta);
  const yearsFn = useServerFn(listExerciseYears);
  const delFn = useServerFn(deleteExercise);
  const reshuffleFn = useServerFn(reshuffleDailyExercise);
  const meta = useQuery({ queryKey: ["admin-meta"], queryFn: () => metaFn() });
  const years = useQuery({ queryKey: ["exercise-years"], queryFn: () => yearsFn() });

  const [filter, setFilter] = useState("");
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [universityFilter, setUniversityFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [reshuffling, setReshuffling] = useState(false);
  // El banco puede tener cientos de ejercicios — no se lanza la búsqueda
  // automáticamente al entrar a la página; recién se dispara al presionar
  // "Buscar". Cambiar cualquier filtro exige un nuevo click para evitar
  // mostrar resultados de un filtro distinto al ya aplicado.
  const [hasSearched, setHasSearched] = useState(false);
  const q = useQuery({
    queryKey: ["admin-exercises"],
    queryFn: () => fetchList(),
    enabled: hasSearched,
  });

  const allTopics = meta.data?.topics ?? [];
  const allUniversities = meta.data?.universities ?? [];

  const filtered = useMemo(() => {
    return (q.data ?? []).filter((e) => {
      if (topicFilter !== "all" && e.topic?.id !== topicFilter) return false;
      if (universityFilter !== "all" && e.university?.id !== universityFilter) return false;
      if (yearFilter !== "all" && String(e.exam_year) !== yearFilter) return false;
      if (filter && !e.statement_md.toLowerCase().includes(filter.toLowerCase())) return false;
      return true;
    });
  }, [q.data, filter, topicFilter, universityFilter, yearFilter]);

  function resetSearch() {
    setHasSearched(false);
  }

  async function onDelete(id: string) {
    if (!confirm("¿Eliminar este ejercicio?")) return;
    try {
      await delFn({ data: { id } });
      toast.success("Ejercicio eliminado");
      router.invalidate();
      q.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  }

  async function onReshuffleDaily() {
    setReshuffling(true);
    try {
      await reshuffleFn();
      toast.success("Reto del día actualizado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setReshuffling(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {hasSearched
            ? `${filtered.length} de ${q.data?.length ?? 0} ejercicios`
            : "Ajusta los filtros y presiona Buscar"}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onReshuffleDaily}
            disabled={reshuffling}
            title="Escoge otro ejercicio al azar para el reto del día de la landing page"
          >
            <Shuffle className="mr-1 h-4 w-4" /> Cambiar reto del día
          </Button>
          <Button asChild size="sm">
            <Link to="/admin/ejercicios/nuevo">
              <Plus className="mr-1 h-4 w-4" /> Nuevo ejercicio
            </Link>
          </Button>
        </div>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        <Input
          placeholder="Buscar…"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            resetSearch();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              setHasSearched(true);
            }
          }}
          className="max-w-xs"
        />
        <Select
          value={topicFilter}
          onValueChange={(x) => {
            setTopicFilter(x);
            resetSearch();
          }}
        >
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los cursos</SelectItem>
            {allTopics.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={universityFilter}
          onValueChange={(x) => {
            setUniversityFilter(x);
            resetSearch();
          }}
        >
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las universidades</SelectItem>
            {allUniversities.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.short_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={yearFilter}
          onValueChange={(x) => {
            setYearFilter(x);
            resetSearch();
          }}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los años</SelectItem>
            {(years.data ?? []).map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" onClick={() => setHasSearched(true)}>
          <Search className="mr-1 h-4 w-4" /> Buscar
        </Button>
      </div>
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Enunciado</TableHead>
              <TableHead>Curso</TableHead>
              <TableHead>Universidad</TableHead>
              <TableHead>Dificultad</TableHead>
              <TableHead>Año</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!hasSearched && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                  Ajusta los filtros y presiona "Buscar" para ver ejercicios.
                </TableCell>
              </TableRow>
            )}
            {hasSearched && q.isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                  Cargando…
                </TableCell>
              </TableRow>
            )}
            {hasSearched &&
              !q.isLoading &&
              filtered.map((ex) => (
                <TableRow key={ex.id}>
                  <TableCell className="max-w-md">
                    <MathText text={ex.statement_md} clampLines={1} className="text-sm" />
                  </TableCell>
                  <TableCell>
                    {ex.topic?.name}
                    {ex.subtopic ? ` · ${ex.subtopic.name}` : ""}
                  </TableCell>
                  <TableCell>{ex.university?.short_name ?? "—"}</TableCell>
                  <TableCell className="capitalize">{ex.difficulty}</TableCell>
                  <TableCell>{ex.exam_year ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button asChild size="icon" variant="ghost">
                        <Link to="/admin/ejercicios/$id" params={{ id: ex.id }} aria-label="Editar">
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onDelete(ex.id)}
                        aria-label="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            {hasSearched && !q.isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                  {(q.data?.length ?? 0) === 0
                    ? "Sin ejercicios todavía."
                    : "Ningún ejercicio coincide con los filtros."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
