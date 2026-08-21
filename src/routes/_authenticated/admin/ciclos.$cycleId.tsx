import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDown, ArrowLeft, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  addCourseToPreparationCycle,
  addTopicToPreparationCourse,
  getPreparationCycleAdmin,
  movePreparationItem,
  removeCourseFromPreparationCycle,
  removeTopicFromPreparationCourse,
  savePreparationCycle,
  updatePreparationCycleTopic,
} from "@/lib/preparation.functions";

export const Route = createFileRoute("/_authenticated/admin/ciclos/$cycleId")({
  component: PreparationCycleBuilder,
});

type EditableUnit = {
  id: string;
  name: string;
  titleOverride: string;
  youtubeUrl: string;
  durationMinutes: string;
  questionCount: number;
  isPublished: boolean;
};

type EditableCycle = {
  name: string;
  slug: string;
};

function PreparationCycleBuilder() {
  const { cycleId } = Route.useParams();
  const getFn = useServerFn(getPreparationCycleAdmin);
  const addCourseFn = useServerFn(addCourseToPreparationCycle);
  const removeCourseFn = useServerFn(removeCourseFromPreparationCycle);
  const addTopicFn = useServerFn(addTopicToPreparationCourse);
  const removeTopicFn = useServerFn(removeTopicFromPreparationCourse);
  const moveFn = useServerFn(movePreparationItem);
  const updateUnitFn = useServerFn(updatePreparationCycleTopic);
  const saveCycleFn = useServerFn(savePreparationCycle);
  const queryClient = useQueryClient();
  const queryKey = ["admin-preparation-cycle", cycleId];
  const q = useQuery({ queryKey, queryFn: () => getFn({ data: { id: cycleId } }) });
  const [courseId, setCourseId] = useState("");
  const [topicSelections, setTopicSelections] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<EditableUnit | null>(null);
  const [editingCycle, setEditingCycle] = useState<EditableCycle | null>(null);

  const renameCycleM = useMutation({
    mutationFn: ({ name, slug }: EditableCycle) =>
      saveCycleFn({
        data: {
          id: cycleId,
          name,
          slug,
          universityId: q.data!.cycle.university_id,
          description: q.data!.cycle.description,
          status: q.data!.cycle.status as "draft" | "published" | "archived",
        },
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey }),
        queryClient.invalidateQueries({ queryKey: ["admin-preparation-cycles"] }),
      ]);
      setEditingCycle(null);
      toast.success("Datos del ciclo actualizados");
    },
    onError: (error) => toast.error(error.message),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey });
  const act = async (work: () => Promise<unknown>, success?: string) => {
    try {
      await work();
      await refresh();
      if (success) toast.success(success);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar");
    }
  };

  if (q.isLoading) return <p className="text-sm text-muted-foreground">Cargando constructor…</p>;
  if (!q.data) return <p className="text-sm text-destructive">No se pudo cargar el ciclo.</p>;
  const { cycle, courses, catalogTopics, catalogSubtopics } = q.data;
  const usedCourseIds = new Set(courses.map((course) => course.topic_id));
  const availableCourses = catalogTopics.filter((topic) => !usedCourseIds.has(topic.id));

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
          <Link to="/admin/ciclos">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver a ciclos
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-2xl font-bold">{cycle.name}</h2>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            aria-label="Editar nombre y slug del ciclo"
            onClick={() => setEditingCycle({ name: cycle.name, slug: cycle.slug })}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Badge variant={cycle.status === "published" ? "default" : "secondary"}>
            {cycle.status === "published" ? "Publicado" : "Borrador"}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {cycle.university?.name} · Construye la ruta en el orden en que estudiará el alumno.
        </p>
      </div>

      <Dialog open={editingCycle !== null} onOpenChange={(open) => !open && setEditingCycle(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar ciclo</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              const name = editingCycle?.name.trim();
              const slug = editingCycle?.slug.trim();
              if (name && slug) renameCycleM.mutate({ name, slug });
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="cycle-edit-name">Nombre</Label>
              <Input
                id="cycle-edit-name"
                value={editingCycle?.name ?? ""}
                onChange={(event) =>
                  setEditingCycle((current) =>
                    current ? { ...current, name: event.target.value } : current,
                  )
                }
                minLength={2}
                maxLength={120}
                autoFocus
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cycle-edit-slug">Slug</Label>
              <Input
                id="cycle-edit-slug"
                value={editingCycle?.slug ?? ""}
                onChange={(event) =>
                  setEditingCycle((current) =>
                    current
                      ? {
                          ...current,
                          slug: event.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, "-")
                            .replace(/(^-|-$)/g, ""),
                        }
                      : current,
                  )
                }
                minLength={2}
                maxLength={70}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                required
              />
              <p className="text-xs text-muted-foreground">
                Cambiarlo también modifica la URL pública del ciclo.
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingCycle(null)}
                disabled={renameCycleM.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={
                  renameCycleM.isPending ||
                  !editingCycle?.name.trim() ||
                  !editingCycle.slug.trim() ||
                  (editingCycle.name.trim() === cycle.name && editingCycle.slug === cycle.slug)
                }
              >
                {renameCycleM.isPending ? "Guardando…" : "Guardar nombre"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <section className="rounded-lg border border-border bg-card p-4 sm:p-5">
        <h3 className="font-semibold">Añadir curso</h3>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <select
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
            className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Selecciona un curso existente</option>
            {availableCourses.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.name}
              </option>
            ))}
          </select>
          <Button
            disabled={!courseId}
            onClick={() =>
              act(
                () => addCourseFn({ data: { cycleId, topicId: courseId } }),
                "Curso añadido",
              ).then(() => setCourseId(""))
            }
          >
            <Plus className="mr-2 h-4 w-4" /> Añadir
          </Button>
        </div>
      </section>

      {courses.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Este ciclo todavía no tiene cursos.
        </div>
      )}

      <div className="space-y-4">
        {courses.map((course, courseIndex) => {
          const availableSubtopics = catalogSubtopics.filter(
            (subtopic) =>
              subtopic.topic_id === course.topic_id &&
              !course.units.some((unit) => unit.subtopic_id === subtopic.id),
          );
          return (
            <section key={course.id} className="rounded-lg border border-border bg-card">
              <header className="flex flex-wrap items-center gap-2 border-b border-border p-4">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-secondary text-sm font-semibold">
                  {courseIndex + 1}
                </span>
                <h3 className="min-w-0 flex-1 font-semibold">{course.topic?.name}</h3>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={courseIndex === 0}
                  aria-label="Subir curso"
                  onClick={() =>
                    act(() => moveFn({ data: { kind: "course", id: course.id, direction: "up" } }))
                  }
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={courseIndex === courses.length - 1}
                  aria-label="Bajar curso"
                  onClick={() =>
                    act(() =>
                      moveFn({ data: { kind: "course", id: course.id, direction: "down" } }),
                    )
                  }
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Quitar curso"
                  onClick={() =>
                    act(() => removeCourseFn({ data: { id: course.id } }), "Curso retirado")
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </header>

              <div className="space-y-3 p-4">
                {course.units.map((unit, unitIndex) => (
                  <div
                    key={unit.id}
                    className="flex flex-col gap-3 rounded-md border border-border bg-background p-3 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">
                          {unitIndex + 1}. {unit.title_override || unit.subtopic?.name}
                        </span>
                        <Badge variant={unit.is_published ? "default" : "secondary"}>
                          {unit.is_published ? "Visible" : "Oculto"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {unit.youtube_video_id ? "Video configurado" : "Sin video"} ·{" "}
                        {unit.practice_question_count} preguntas
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={unitIndex === 0}
                        aria-label="Subir tema"
                        onClick={() =>
                          act(() =>
                            moveFn({ data: { kind: "topic", id: unit.id, direction: "up" } }),
                          )
                        }
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={unitIndex === course.units.length - 1}
                        aria-label="Bajar tema"
                        onClick={() =>
                          act(() =>
                            moveFn({ data: { kind: "topic", id: unit.id, direction: "down" } }),
                          )
                        }
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Editar unidad"
                        onClick={() =>
                          setEditing({
                            id: unit.id,
                            name: unit.subtopic?.name ?? "Tema",
                            titleOverride: unit.title_override ?? "",
                            youtubeUrl: unit.youtube_url ?? "",
                            durationMinutes: unit.video_duration_seconds
                              ? String(Math.round(unit.video_duration_seconds / 60))
                              : "",
                            questionCount: unit.practice_question_count,
                            isPublished: unit.is_published,
                          })
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Quitar tema"
                        onClick={() =>
                          act(() => removeTopicFn({ data: { id: unit.id } }), "Tema retirado")
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="flex flex-col gap-2 border-t border-border pt-3 sm:flex-row">
                  <select
                    value={topicSelections[course.id] ?? ""}
                    onChange={(event) =>
                      setTopicSelections((current) => ({
                        ...current,
                        [course.id]: event.target.value,
                      }))
                    }
                    className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Añadir un tema de {course.topic?.name}</option>
                    {availableSubtopics.map((subtopic) => (
                      <option key={subtopic.id} value={subtopic.id}>
                        {subtopic.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    disabled={!topicSelections[course.id]}
                    onClick={() =>
                      act(
                        () =>
                          addTopicFn({
                            data: {
                              cycleCourseId: course.id,
                              subtopicId: topicSelections[course.id],
                            },
                          }),
                        "Tema añadido",
                      ).then(() =>
                        setTopicSelections((current) => ({ ...current, [course.id]: "" })),
                      )
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" /> Añadir tema
                  </Button>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <Dialog open={!!editing} onOpenChange={(value) => !value && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar {editing?.name}</DialogTitle>
          </DialogHeader>
          {editing && (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                act(
                  () =>
                    updateUnitFn({
                      data: {
                        id: editing.id,
                        titleOverride: editing.titleOverride || null,
                        youtubeUrl: editing.youtubeUrl || null,
                        videoDurationMinutes: editing.durationMinutes
                          ? Number(editing.durationMinutes)
                          : null,
                        practiceQuestionCount: editing.questionCount,
                        isPublished: editing.isPublished,
                      },
                    }),
                  "Unidad guardada",
                ).then(() => setEditing(null));
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="unit-title">Título visible (opcional)</Label>
                <Input
                  id="unit-title"
                  value={editing.titleOverride}
                  onChange={(event) =>
                    setEditing({ ...editing, titleOverride: event.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unit-youtube">URL de YouTube</Label>
                <Input
                  id="unit-youtube"
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=…"
                  value={editing.youtubeUrl}
                  onChange={(event) => setEditing({ ...editing, youtubeUrl: event.target.value })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="unit-duration">Duración (minutos)</Label>
                  <Input
                    id="unit-duration"
                    type="number"
                    min={1}
                    value={editing.durationMinutes}
                    onChange={(event) =>
                      setEditing({ ...editing, durationMinutes: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="unit-count">Preguntas</Label>
                  <Input
                    id="unit-count"
                    type="number"
                    min={1}
                    max={20}
                    value={editing.questionCount}
                    onChange={(event) =>
                      setEditing({ ...editing, questionCount: Number(event.target.value) })
                    }
                  />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <div>
                  <Label htmlFor="unit-published">Visible para estudiantes</Label>
                  <p className="text-xs text-muted-foreground">
                    Solo aparece cuando el ciclo está publicado.
                  </p>
                </div>
                <Switch
                  id="unit-published"
                  checked={editing.isPublished}
                  onCheckedChange={(checked) => setEditing({ ...editing, isPublished: checked })}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                  Cancelar
                </Button>
                <Button type="submit">Guardar unidad</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
