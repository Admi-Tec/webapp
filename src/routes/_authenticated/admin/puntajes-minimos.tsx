import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  listAdminMinScores,
  listExamsForMinScoreAdmin,
  listAdminCareers,
  createMinScore,
  updateMinScore,
  deleteMinScore,
} from "@/lib/admin.functions";
import { listAllUniversities } from "@/lib/profile.functions";

export const Route = createFileRoute("/_authenticated/admin/puntajes-minimos")({
  component: PuntajesMinimosPage,
});

interface MinScoreRow {
  id: string;
  min_score: number;
  updated_at: string;
  university: { id: string; short_name: string } | null;
  exam: { id: string; title: string } | null;
  career: { id: string; name: string } | null;
}

function CareerSelectForUniversity({
  universityId,
  value,
  onChange,
}: {
  universityId: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const listFn = useServerFn(listAdminCareers);
  const q = useQuery({
    queryKey: ["admin-careers", universityId],
    queryFn: () => listFn({ data: { universityId } }),
    enabled: !!universityId,
  });
  const careers = q.data ?? [];
  return (
    <Select value={value} onValueChange={onChange} disabled={!universityId}>
      <SelectTrigger>
        <SelectValue placeholder={universityId ? "Selecciona…" : "Elige primero la universidad"} />
      </SelectTrigger>
      <SelectContent>
        {careers.length === 0 && (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            Sin carreras registradas para esta universidad.
          </div>
        )}
        {careers.map((c: any) => (
          <SelectItem key={c.id} value={c.id}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function PuntajesMinimosPage() {
  const unisFn = useServerFn(listAllUniversities);
  const examsFn = useServerFn(listExamsForMinScoreAdmin);
  const listFn = useServerFn(listAdminMinScores);
  const createFn = useServerFn(createMinScore);
  const updateFn = useServerFn(updateMinScore);
  const delFn = useServerFn(deleteMinScore);

  const unisQ = useQuery({ queryKey: ["all-universities"], queryFn: () => unisFn() });
  const examsQ = useQuery({ queryKey: ["admin-exams-for-min-score"], queryFn: () => examsFn() });
  const q = useQuery({ queryKey: ["admin-min-scores"], queryFn: () => listFn() });

  const [editing, setEditing] = useState<MinScoreRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [universityId, setUniversityId] = useState("");
  const [examId, setExamId] = useState("");
  const [careerId, setCareerId] = useState("");
  const [minScore, setMinScore] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveFeedback, flashSaveFeedback] = useSaveFeedback();

  useEffect(() => {
    // Changing university invalidates whichever career/exam were picked for the previous one.
    setCareerId("");
    setExamId("");
  }, [universityId]);

  const examsForUniversity = (examsQ.data ?? []).filter(
    (e: any) => e.university?.id === universityId,
  );

  function openNew() {
    setEditing(null);
    setUniversityId("");
    setExamId("");
    setCareerId("");
    setMinScore("");
    setDialogOpen(true);
  }
  function openEdit(r: MinScoreRow) {
    setEditing(r);
    setUniversityId(r.university?.id ?? "");
    setExamId(r.exam?.id ?? "");
    setCareerId(r.career?.id ?? "");
    setMinScore(String(r.min_score));
    setDialogOpen(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!universityId || !examId || !careerId) {
      toast.error("Selecciona universidad, examen y carrera");
      flashSaveFeedback("refused");
      return;
    }
    const minScoreNum = Number(minScore);
    if (minScore.trim() === "" || minScoreNum < 0) {
      toast.error("Completa un puntaje mínimo válido");
      flashSaveFeedback("refused");
      return;
    }
    setSaving(true);
    try {
      const payload = { universityId, examId, careerId, minScore: minScoreNum };
      if (editing) {
        await updateFn({ data: { ...payload, id: editing.id } });
        toast.success("Puntaje mínimo actualizado — se notificó a los estudiantes afectados");
      } else {
        await createFn({ data: payload });
        toast.success("Puntaje mínimo creado — se notificó a los estudiantes afectados");
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

  async function onDelete(r: MinScoreRow) {
    const label = [r.exam?.title, r.career?.name, r.university?.short_name]
      .filter(Boolean)
      .join(" — ");
    if (!confirm(`¿Eliminar el puntaje mínimo de "${label || "este registro"}"?`)) return;
    try {
      await delFn({ data: { id: r.id } });
      toast.success("Eliminado");
      q.refetch();
    } catch (err: any) {
      toast.error(err?.message ?? "Error");
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{q.data?.length ?? 0} registros</p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openNew}>
              <Plus className="mr-1 h-4 w-4" /> Nuevo registro
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editing ? "Editar puntaje mínimo" : "Nuevo puntaje mínimo"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Un puntaje mínimo siempre se define para una universidad, un examen y una carrera
                específicos — los tres son obligatorios.
              </p>
              <div>
                <Label>Universidad *</Label>
                <Select value={universityId} onValueChange={setUniversityId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(unisQ.data ?? []).map((u: any) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.short_name ?? u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Carrera *</Label>
                <CareerSelectForUniversity
                  universityId={universityId}
                  value={careerId}
                  onChange={setCareerId}
                />
              </div>
              <div>
                <Label>Examen *</Label>
                <Select value={examId} onValueChange={setExamId} disabled={!universityId}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={universityId ? "Selecciona…" : "Elige primero la universidad"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {examsForUniversity.length === 0 && (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                        Sin exámenes registrados para esta universidad.
                      </div>
                    )}
                    {examsForUniversity.map((e: any) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Puntaje mínimo *</Label>
                <Input
                  type="number"
                  min={0}
                  value={minScore}
                  onChange={(e) => setMinScore(e.target.value)}
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Al guardar, se notificará dentro de la app a los estudiantes que ya rindieron este
                examen.
              </p>
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
              <TableHead>Universidad</TableHead>
              <TableHead>Examen</TableHead>
              <TableHead>Carrera</TableHead>
              <TableHead>Puntaje mínimo</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  Cargando…
                </TableCell>
              </TableRow>
            )}
            {q.data?.map((r: MinScoreRow) => (
              <TableRow key={r.id}>
                <TableCell>{r.university?.short_name ?? "—"}</TableCell>
                <TableCell>{r.exam?.title ?? "—"}</TableCell>
                <TableCell>{r.career?.name ?? "—"}</TableCell>
                <TableCell className="font-medium">{r.min_score}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEdit(r)}
                      aria-label="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onDelete(r)}
                      aria-label="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!q.isLoading && q.data?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  Sin registros todavía.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
