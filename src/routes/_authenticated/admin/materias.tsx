import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Fragment, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Trash2, Plus, Check, ChevronRight, Loader2, X } from "lucide-react";
import { useSaveFeedback } from "@/hooks/use-save-feedback";
import {
  listAdminTopics,
  createTopic,
  renameTopic,
  setTopicActive,
  deleteTopic,
  createSubtopic,
  renameSubtopic,
  deleteSubtopic,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/materias")({
  component: MateriasPage,
});

interface SubtopicRow {
  id: string;
  name: string;
  exerciseCount: number;
}

interface TopicRow {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  active: boolean;
  exerciseCount: number;
  subtopics: SubtopicRow[];
}

function MateriasPage() {
  const listFn = useServerFn(listAdminTopics);
  const createFn = useServerFn(createTopic);
  const renameFn = useServerFn(renameTopic);
  const setActiveFn = useServerFn(setTopicActive);
  const delFn = useServerFn(deleteTopic);
  const q = useQuery({ queryKey: ["admin-topics"], queryFn: () => listFn() });

  const [editing, setEditing] = useState<TopicRow | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#3B82F6");
  const [saving, setSaving] = useState(false);
  const [saveFeedback, flashSaveFeedback] = useSaveFeedback();

  function openNew() {
    setEditing(null);
    setName("");
    setDescription("");
    setColor("#3B82F6");
    setDialogOpen(true);
  }
  function openEdit(t: TopicRow) {
    setEditing(t);
    setName(t.name);
    setDescription(t.description ?? "");
    setColor(t.color ?? "#3B82F6");
    setDialogOpen(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) {
      toast.error("Nombre muy corto");
      flashSaveFeedback("refused");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await renameFn({
          data: {
            id: editing.id,
            name: name.trim(),
            description: description.trim() || null,
            color,
          },
        });
        toast.success("Curso actualizado");
      } else {
        const res = await createFn({
          data: { name: name.trim(), description: description.trim() || null, color },
        });
        toast[res.duplicated ? "info" : "success"](res.duplicated ? "Ya existía" : "Curso creado");
      }
      flashSaveFeedback("accepted");
      q.refetch();
      setTimeout(() => setDialogOpen(false), 550);
    } catch (e: any) {
      toast.error(e?.message ?? "Error");
      flashSaveFeedback("refused");
    } finally {
      setSaving(false);
    }
  }

  async function onToggle(t: TopicRow) {
    try {
      await setActiveFn({ data: { id: t.id, active: !t.active } });
      q.refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Error");
    }
  }
  async function onDelete(t: TopicRow) {
    if (!confirm(`¿Eliminar el curso "${t.name}"?`)) return;
    try {
      await delFn({ data: { id: t.id } });
      toast.success("Eliminada");
      q.refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Error");
    }
  }

  function toggleExpanded(id: string) {
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{q.data?.length ?? 0} cursos</p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openNew}>
              <Plus className="mr-1 h-4 w-4" /> Nuevo curso
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar curso" : "Nuevo curso"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-3">
              <div>
                <Label>Nombre *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={60}
                />
              </div>
              <div>
                <Label>Descripción</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  maxLength={300}
                />
              </div>
              <div>
                <Label>Color</Label>
                <Input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-10 w-20"
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setDialogOpen(false)}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className={`press ${saveFeedback === "refused" ? "animate-shake" : ""}`}
                  disabled={saving}
                >
                  {saveFeedback === "accepted" ? (
                    <span className="inline-flex items-center gap-2 animate-icon-pop">
                      <Check className="h-4 w-4" /> Guardado
                    </span>
                  ) : saving ? (
                    "Guardando…"
                  ) : (
                    "Guardar"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Ejercicios</TableHead>
              <TableHead>Activa</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                  Cargando…
                </TableCell>
              </TableRow>
            )}
            {q.data?.map((t: TopicRow) => (
              <Fragment key={t.id}>
                <TableRow>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleExpanded(t.id)}
                        aria-label={expanded.has(t.id) ? "Ocultar temas" : "Ver temas"}
                        aria-expanded={expanded.has(t.id)}
                        className="rounded p-0.5 text-muted-foreground hover:bg-muted"
                      >
                        <ChevronRight
                          className={`h-4 w-4 transition-transform ${
                            expanded.has(t.id) ? "rotate-90" : ""
                          }`}
                        />
                      </button>
                      <span
                        className="h-4 w-4 rounded"
                        style={{ background: t.color ?? "#e5e7eb" }}
                      />
                      <span className="font-medium">{t.name}</span>
                      {t.subtopics.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {t.subtopics.length} tema(s)
                        </span>
                      )}
                      {t.description && (
                        <span className="text-xs text-muted-foreground">{t.description}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{t.exerciseCount}</Badge>
                  </TableCell>
                  <TableCell>
                    <Switch checked={t.active} onCheckedChange={() => onToggle(t)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEdit(t)}
                        aria-label="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onDelete(t)}
                        aria-label="Eliminar"
                        disabled={t.exerciseCount > 0}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                {expanded.has(t.id) && (
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableCell colSpan={4} className="py-3 pl-10">
                      <SubtopicsPanel topic={t} onChanged={() => q.refetch()} />
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
            {q.data?.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                  Sin cursos.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function SubtopicsPanel({ topic, onChanged }: { topic: TopicRow; onChanged: () => void }) {
  const createFn = useServerFn(createSubtopic);
  const renameFn = useServerFn(renameSubtopic);
  const delFn = useServerFn(deleteSubtopic);

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (name.length < 2) {
      toast.error("Nombre muy corto");
      return;
    }
    setCreating(true);
    try {
      const res = await createFn({ data: { topic_id: topic.id, name } });
      toast[res.duplicated ? "info" : "success"](res.duplicated ? "Ya existía" : "Tema creado");
      setNewName("");
      onChanged();
    } catch (e: any) {
      toast.error(e?.message ?? "Error");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(s: SubtopicRow) {
    setEditingId(s.id);
    setEditName(s.name);
  }

  async function onRename(s: SubtopicRow) {
    const name = editName.trim();
    if (name.length < 2) {
      toast.error("Nombre muy corto");
      return;
    }
    if (name === s.name) {
      setEditingId(null);
      return;
    }
    setBusyId(s.id);
    try {
      await renameFn({ data: { id: s.id, name } });
      toast.success("Tema actualizado");
      setEditingId(null);
      onChanged();
    } catch (e: any) {
      toast.error(e?.message ?? "Error");
    } finally {
      setBusyId(null);
    }
  }

  async function onDelete(s: SubtopicRow) {
    const detail =
      s.exerciseCount > 0
        ? ` ${s.exerciseCount} ejercicio(s) quedarán sin tema (no se eliminan).`
        : "";
    if (!confirm(`¿Eliminar el tema "${s.name}"?${detail}`)) return;
    setBusyId(s.id);
    try {
      await delFn({ data: { id: s.id } });
      toast.success("Tema eliminado");
      onChanged();
    } catch (e: any) {
      toast.error(e?.message ?? "Error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-2">
      {topic.subtopics.length === 0 && (
        <p className="text-sm text-muted-foreground">Este curso aún no tiene temas.</p>
      )}
      {topic.subtopics.map((s) => (
        <div key={s.id} className="flex items-center gap-2">
          {editingId === s.id ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onRename(s);
              }}
              className="flex flex-1 items-center gap-2"
            >
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={60}
                autoFocus
                className="h-8 max-w-xs"
              />
              <Button type="submit" size="icon" variant="ghost" disabled={busyId === s.id}>
                {busyId === s.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setEditingId(null)}
                aria-label="Cancelar"
              >
                <X className="h-4 w-4" />
              </Button>
            </form>
          ) : (
            <>
              <span className="text-sm">{s.name}</span>
              <Badge variant="secondary">{s.exerciseCount}</Badge>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => startEdit(s)}
                aria-label={`Editar tema ${s.name}`}
                disabled={busyId !== null}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => onDelete(s)}
                aria-label={`Eliminar tema ${s.name}`}
                disabled={busyId !== null}
              >
                {busyId === s.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </Button>
            </>
          )}
        </div>
      ))}
      <form onSubmit={onCreate} className="flex items-center gap-2 pt-1">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nuevo tema…"
          maxLength={60}
          className="h-8 max-w-xs"
        />
        <Button type="submit" size="sm" variant="outline" disabled={creating}>
          {creating ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="mr-1 h-3.5 w-3.5" />
          )}
          Agregar
        </Button>
      </form>
    </div>
  );
}
