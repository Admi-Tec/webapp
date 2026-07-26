import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Pencil, Trash2, Plus, Search, Check } from "lucide-react";
import { useSaveFeedback } from "@/hooks/use-save-feedback";
import {
  listAdminUniversities,
  createUniversity,
  updateUniversity,
  setUniversityActive,
  deleteUniversity,
} from "@/lib/admin.functions";
import { ImageUpload } from "@/components/image-upload";
import { uploadUniversityLogo, getExerciseImageUrl } from "@/lib/storage";

export const Route = createFileRoute("/_authenticated/admin/universidades")({
  component: UniversidadesPage,
});

interface UniversityRow {
  id: string;
  name: string;
  short_name: string;
  slug: string;
  description: string | null;
  logo_path: string | null;
  exam_date: string | null;
  active: boolean;
  studentCount: number;
  examCount: number;
  templateCount: number;
  exerciseCount: number;
}

function UniversidadesPage() {
  const listFn = useServerFn(listAdminUniversities);
  const createFn = useServerFn(createUniversity);
  const updateFn = useServerFn(updateUniversity);
  const setActiveFn = useServerFn(setUniversityActive);
  const delFn = useServerFn(deleteUniversity);
  const q = useQuery({ queryKey: ["admin-universities"], queryFn: () => listFn() });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [editing, setEditing] = useState<UniversityRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [description, setDescription] = useState("");
  const [examDate, setExamDate] = useState("");
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveFeedback, flashSaveFeedback] = useSaveFeedback();

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (q.data ?? []).filter((u: UniversityRow) => {
      if (statusFilter === "active" && !u.active) return false;
      if (statusFilter === "inactive" && u.active) return false;
      if (
        term &&
        !u.name.toLowerCase().includes(term) &&
        !u.short_name.toLowerCase().includes(term)
      )
        return false;
      return true;
    });
  }, [q.data, search, statusFilter]);

  function openNew() {
    setEditing(null);
    setName("");
    setShortName("");
    setDescription("");
    setExamDate("");
    setLogoPath(null);
    setDialogOpen(true);
  }
  function openEdit(u: UniversityRow) {
    setEditing(u);
    setName(u.name);
    setShortName(u.short_name);
    setDescription(u.description ?? "");
    setExamDate(u.exam_date ?? "");
    setLogoPath(u.logo_path);
    setDialogOpen(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) {
      toast.error("Nombre muy corto");
      flashSaveFeedback("refused");
      return;
    }
    if (!shortName.trim()) {
      toast.error("Falta el nombre corto");
      flashSaveFeedback("refused");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        short_name: shortName.trim(),
        description: description.trim() || null,
        logo_path: logoPath,
        exam_date: examDate || null,
      };
      if (editing) {
        await updateFn({ data: { id: editing.id, ...payload } });
        toast.success("Universidad actualizada");
      } else {
        await createFn({ data: payload });
        toast.success("Universidad creada");
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

  async function onToggle(u: UniversityRow) {
    try {
      await setActiveFn({ data: { id: u.id, active: !u.active } });
      q.refetch();
    } catch (err: any) {
      toast.error(err?.message ?? "Error");
    }
  }

  async function onDelete(u: UniversityRow) {
    if (!confirm(`¿Eliminar la universidad "${u.name}"?`)) return;
    try {
      await delFn({ data: { id: u.id } });
      toast.success("Eliminada");
      q.refetch();
    } catch (err: any) {
      toast.error(err?.message ?? "Error");
    }
  }

  const hasReferences = (u: UniversityRow) =>
    u.studentCount + u.examCount + u.templateCount + u.exerciseCount > 0;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre…"
              className="w-56 pl-8"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="active">Activas</SelectItem>
              <SelectItem value="inactive">Inactivas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openNew}>
              <Plus className="mr-1 h-4 w-4" /> Nueva universidad
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar universidad" : "Nueva universidad"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-3">
              <div>
                <Label>Nombre *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={150}
                />
              </div>
              <div>
                <Label>Nombre corto *</Label>
                <Input
                  value={shortName}
                  onChange={(e) => setShortName(e.target.value)}
                  required
                  maxLength={40}
                  placeholder="ej. UNMSM"
                />
              </div>
              <div>
                <Label>Descripción</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  maxLength={500}
                />
              </div>
              <div>
                <Label>Fecha del examen de admisión</Label>
                <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
                <p className="mt-1 text-xs text-muted-foreground">
                  Opcional — si ya se conoce, se usa como valor por defecto de la cuenta regresiva.
                </p>
              </div>
              <ImageUpload
                label="Logo (opcional)"
                value={logoPath}
                onChange={setLogoPath}
                uploadFn={uploadUniversityLogo}
              />
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
              <TableHead>Exámenes</TableHead>
              <TableHead>Simulacros</TableHead>
              <TableHead>Ejercicios</TableHead>
              <TableHead>Activa</TableHead>
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
            {filtered.map((u: UniversityRow) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <UniversityLogo path={u.logo_path} />
                    <div>
                      <p className="font-medium">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.short_name}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{u.studentCount}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{u.examCount}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{u.templateCount}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{u.exerciseCount}</Badge>
                </TableCell>
                <TableCell>
                  <Switch checked={u.active} onCheckedChange={() => onToggle(u)} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEdit(u)}
                      aria-label="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onDelete(u)}
                      aria-label="Eliminar"
                      disabled={hasReferences(u)}
                      title={
                        hasReferences(u)
                          ? "Tiene referencias asociadas — desactívala en su lugar"
                          : undefined
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!q.isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                  Sin resultados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function UniversityLogo({ path }: { path: string | null }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (!path) {
      setUrl(null);
      return;
    }
    getExerciseImageUrl(path).then((u) => {
      if (alive) setUrl(u);
    });
    return () => {
      alive = false;
    };
  }, [path]);
  return url ? (
    <img
      src={url}
      alt=""
      className="h-8 w-8 shrink-0 rounded-md border border-border object-cover"
    />
  ) : (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-dashed border-border text-[10px] text-muted-foreground">
      —
    </span>
  );
}
