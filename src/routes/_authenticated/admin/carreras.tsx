import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Pencil, Trash2, Plus, Check } from "lucide-react";
import { useSaveFeedback } from "@/hooks/use-save-feedback";
import {
  listAdminCareers,
  createCareer,
  renameCareer,
  setCareerActive,
  deleteCareer,
} from "@/lib/admin.functions";
import { listAllUniversities } from "@/lib/profile.functions";

export const Route = createFileRoute("/_authenticated/admin/carreras")({
  component: CarrerasPage,
});

interface CareerRow {
  id: string;
  name: string;
  active: boolean;
  studentCount: number;
}

function CarrerasPage() {
  const unisFn = useServerFn(listAllUniversities);
  const listFn = useServerFn(listAdminCareers);
  const createFn = useServerFn(createCareer);
  const renameFn = useServerFn(renameCareer);
  const setActiveFn = useServerFn(setCareerActive);
  const delFn = useServerFn(deleteCareer);

  const unisQ = useQuery({ queryKey: ["all-universities"], queryFn: () => unisFn() });
  const [universityId, setUniversityId] = useState<string>("");

  useEffect(() => {
    if (!universityId && unisQ.data && unisQ.data.length > 0) {
      const firstActive = unisQ.data.find((u: any) => u.active) ?? unisQ.data[0];
      setUniversityId(firstActive.id);
    }
  }, [unisQ.data, universityId]);

  const q = useQuery({
    queryKey: ["admin-careers", universityId],
    queryFn: () => listFn({ data: { universityId } }),
    enabled: !!universityId,
  });

  const [editing, setEditing] = useState<CareerRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveFeedback, flashSaveFeedback] = useSaveFeedback();

  function openNew() {
    setEditing(null);
    setName("");
    setDialogOpen(true);
  }
  function openEdit(c: CareerRow) {
    setEditing(c);
    setName(c.name);
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
        await renameFn({ data: { id: editing.id, name: name.trim() } });
        toast.success("Carrera actualizada");
      } else {
        const res = await createFn({ data: { universityId, name: name.trim() } });
        toast[res.duplicated ? "info" : "success"](
          res.duplicated ? "Ya existía" : "Carrera creada",
        );
      }
      flashSaveFeedback("accepted");
      q.refetch();
      setTimeout(() => setDialogOpen(false), 550);
    } catch (err: any) {
      toast.error(err?.message ?? "Error");
      flashSaveFeedback("refused");
    } finally {
      setSaving(false);
    }
  }

  async function onToggle(c: CareerRow) {
    try {
      await setActiveFn({ data: { id: c.id, active: !c.active } });
      q.refetch();
    } catch (err: any) {
      toast.error(err?.message ?? "Error");
    }
  }
  async function onDelete(c: CareerRow) {
    if (!confirm(`¿Eliminar la carrera "${c.name}"?`)) return;
    try {
      await delFn({ data: { id: c.id } });
      toast.success("Eliminada");
      q.refetch();
    } catch (err: any) {
      toast.error(err?.message ?? "Error");
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={universityId} onValueChange={setUniversityId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Selecciona una universidad" />
            </SelectTrigger>
            <SelectContent>
              {(unisQ.data ?? []).map((u: any) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.short_name ?? u.name}
                  {!u.active ? " (inactiva)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">{q.data?.length ?? 0} carreras</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openNew} disabled={!universityId}>
              <Plus className="mr-1 h-4 w-4" /> Nueva carrera
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar carrera" : "Nueva carrera"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-3">
              <div>
                <Label>Nombre *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={120}
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
              <TableHead>Estudiantes</TableHead>
              <TableHead>Activa</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!universityId && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                  Selecciona una universidad para ver sus carreras.
                </TableCell>
              </TableRow>
            )}
            {universityId && q.isLoading && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                  Cargando…
                </TableCell>
              </TableRow>
            )}
            {q.data?.map((c: CareerRow) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{c.studentCount}</Badge>
                </TableCell>
                <TableCell>
                  <Switch checked={c.active} onCheckedChange={() => onToggle(c)} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEdit(c)}
                      aria-label="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onDelete(c)}
                      aria-label="Eliminar"
                      disabled={c.studentCount > 0}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {universityId && !q.isLoading && q.data?.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                  Sin carreras todavía.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
