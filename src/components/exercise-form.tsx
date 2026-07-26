import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus, Check } from "lucide-react";
import { MathText, ChoiceText } from "@/lib/math-render";
import { ImageUpload } from "@/components/image-upload";
import { NewTopicDialog } from "@/components/new-topic-dialog";
import { useSaveFeedback } from "@/hooks/use-save-feedback";
import { listAdminMeta, createExercise, updateExercise } from "@/lib/admin.functions";

type Difficulty = "facil" | "medio" | "dificil";

export interface ExerciseFormValues {
  id?: string;
  topic_id: string;
  subtopic_id: string | null;
  university_id: string | null;
  exam_year: number | null;
  difficulty: Difficulty;
  statement_md: string;
  statement_image_path: string | null;
  solution_image_path: string | null;
  choices: string[];
  correct_choice: number;
  solution_md: string;
  tags: string[];
}

const empty: ExerciseFormValues = {
  topic_id: "",
  subtopic_id: null,
  university_id: null,
  exam_year: null,
  difficulty: "medio",
  statement_md: "",
  statement_image_path: null,
  solution_image_path: null,
  choices: ["", ""],
  correct_choice: 0,
  solution_md: "",
  tags: [],
};

export function ExerciseForm({ initial }: { initial?: ExerciseFormValues }) {
  const navigate = useNavigate();
  const fetchMeta = useServerFn(listAdminMeta);
  const createFn = useServerFn(createExercise);
  const updateFn = useServerFn(updateExercise);
  const meta = useQuery({ queryKey: ["admin-meta"], queryFn: () => fetchMeta() });

  const [v, setV] = useState<ExerciseFormValues>(initial ?? empty);
  const [tagsInput, setTagsInput] = useState((initial?.tags ?? []).join(", "));
  const [saving, setSaving] = useState(false);
  const [saveFeedback, flashSaveFeedback] = useSaveFeedback();
  const [uploading, setUploading] = useState({ stmt: false, sol: false });

  const handleStatementUploadingChange = useCallback((stmt: boolean) => {
    setUploading((s) => (s.stmt !== stmt ? { ...s, stmt } : s));
  }, []);

  const handleSolutionUploadingChange = useCallback((sol: boolean) => {
    setUploading((s) => (s.sol !== sol ? { ...s, sol } : s));
  }, []);

  useEffect(() => {
    if (initial) {
      setV(initial);
      setTagsInput(initial.tags.join(", "));
    }
    // Only reset when the record id changes (avoid wiping edits when parent re-renders).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.id]);

  const [topicDialogOpen, setTopicDialogOpen] = useState(false);
  const [subtopicDialogOpen, setSubtopicDialogOpen] = useState(false);

  const subtopicsForTopic = useMemo(
    () => (meta.data?.subtopics ?? []).filter((s: any) => s.topic_id === v.topic_id),
    [meta.data, v.topic_id],
  );

  function setChoice(i: number, val: string) {
    setV((s) => ({ ...s, choices: s.choices.map((c, j) => (j === i ? val : c)) }));
  }
  function addChoice() {
    setV((s) => ({ ...s, choices: [...s.choices, ""] }));
  }
  function removeChoice(i: number) {
    setV((s) => {
      const choices = s.choices.filter((_, j) => j !== i);
      const correct =
        s.correct_choice >= choices.length ? Math.max(0, choices.length - 1) : s.correct_choice;
      return { ...s, choices, correct_choice: correct };
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!v.topic_id) {
      toast.error("Selecciona un curso");
      flashSaveFeedback("refused");
      return;
    }
    if (v.choices.some((c) => !c.trim())) {
      toast.error("Completa todas las alternativas o elimina las vacías");
      flashSaveFeedback("refused");
      return;
    }
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const payload = { ...v, tags };
    setSaving(true);
    try {
      if (initial?.id) {
        await updateFn({ data: { id: initial.id, ...payload } });
        toast.success("Ejercicio actualizado");
      } else {
        await createFn({ data: payload });
        toast.success("Ejercicio creado");
      }
      flashSaveFeedback("accepted");
      setTimeout(() => navigate({ to: "/admin/ejercicios" }), 550);
    } catch (err: any) {
      toast.error(err?.message ?? "Error al guardar");
      flashSaveFeedback("refused");
    } finally {
      setSaving(false);
    }
  }

  if (meta.isLoading) return <p className="text-sm text-muted-foreground">Cargando…</p>;

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Curso *</Label>
            <Select
              value={v.topic_id}
              onValueChange={(val) => {
                if (val === "__new_topic__") {
                  setTopicDialogOpen(true);
                  return;
                }
                setV((s) => ({ ...s, topic_id: val, subtopic_id: null }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__new_topic__">+ Agregar nuevo curso</SelectItem>
                <SelectSeparator />
                {meta.data?.topics.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <NewTopicDialog
              type="topic"
              open={topicDialogOpen}
              onOpenChange={(open) => setTopicDialogOpen(open)}
              showTrigger={false}
              onCreated={(id) => setV((s) => ({ ...s, topic_id: id, subtopic_id: null }))}
            />
          </div>
          <div>
            <Label>Tema</Label>
            <Select
              value={v.subtopic_id ?? "__none"}
              onValueChange={(val) => {
                if (val === "__new_subtopic__") {
                  setSubtopicDialogOpen(true);
                  return;
                }
                setV((s) => ({ ...s, subtopic_id: val === "__none" ? null : val }));
              }}
              disabled={!v.topic_id}
            >
              <SelectTrigger>
                <SelectValue placeholder="(opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">— ninguno —</SelectItem>
                <SelectItem value="__new_subtopic__" disabled={!v.topic_id}>
                  + Agregar nuevo tema
                </SelectItem>
                <SelectSeparator />
                {subtopicsForTopic.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <NewTopicDialog
              type="subtopic"
              topicId={v.topic_id}
              open={subtopicDialogOpen}
              onOpenChange={(open) => setSubtopicDialogOpen(open)}
              showTrigger={false}
              onCreated={(id) => setV((s) => ({ ...s, subtopic_id: id }))}
            />
          </div>
          <div>
            <Label>Universidad</Label>
            <Select
              value={v.university_id ?? "__none"}
              onValueChange={(val) =>
                setV((s) => ({ ...s, university_id: val === "__none" ? null : val }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Genérico (todas las universidades)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Genérico — todas las universidades</SelectItem>
                {meta.data?.universities.map((u: any) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.short_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              Déjalo en "Genérico" si el ejercicio no es propio de un examen específico — se
              mostrará a estudiantes de cualquier universidad.
            </p>
          </div>
          <div>
            <Label>Año examen</Label>
            <Input
              type="number"
              value={v.exam_year ?? ""}
              onChange={(e) =>
                setV((s) => ({ ...s, exam_year: e.target.value ? Number(e.target.value) : null }))
              }
              placeholder="2024"
            />
          </div>
          <div>
            <Label>Dificultad *</Label>
            <Select
              value={v.difficulty}
              onValueChange={(val) => setV((s) => ({ ...s, difficulty: val as Difficulty }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="facil">Fácil</SelectItem>
                <SelectItem value="medio">Medio</SelectItem>
                <SelectItem value="dificil">Difícil</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Etiquetas (separadas por coma)</Label>
            <Input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="ecuaciones, polinomios"
            />
          </div>
        </div>

        <div>
          <Label>
            Enunciado *{" "}
            <span className="text-xs text-muted-foreground">
              (Markdown + LaTeX: $x^2$, $$\int$$)
            </span>
          </Label>
          <Textarea
            value={v.statement_md}
            onChange={(e) => setV((s) => ({ ...s, statement_md: e.target.value }))}
            rows={5}
            required
          />
          <div className="mt-3">
            <ImageUpload
              label="Imagen del enunciado (opcional)"
              value={v.statement_image_path}
              onChange={(p) => setV((s) => ({ ...s, statement_image_path: p }))}
              onUploadingChange={handleStatementUploadingChange}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label>Alternativas *</Label>
            <Button type="button" variant="ghost" size="sm" onClick={addChoice}>
              <Plus className="mr-1 h-3 w-3" /> Añadir
            </Button>
          </div>
          <div className="mt-2 space-y-2">
            {v.choices.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correct"
                  checked={v.correct_choice === i}
                  onChange={() => setV((s) => ({ ...s, correct_choice: i }))}
                  aria-label={`Marcar alternativa ${String.fromCharCode(65 + i)} como correcta`}
                />
                <span className="w-5 text-sm font-semibold">{String.fromCharCode(65 + i)}.</span>
                <Input value={c} onChange={(e) => setChoice(i, e.target.value)} required />
                {v.choices.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeChoice(i)}
                    aria-label="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Marca con el radio la alternativa correcta.
          </p>
        </div>

        <div>
          <Label>Solución paso a paso *</Label>
          <Textarea
            value={v.solution_md}
            onChange={(e) => setV((s) => ({ ...s, solution_md: e.target.value }))}
            rows={6}
            required
          />
          <div className="mt-3">
            <ImageUpload
              label="Imagen de la solución (opcional)"
              value={v.solution_image_path}
              onChange={(p) => setV((s) => ({ ...s, solution_image_path: p }))}
              onUploadingChange={handleSolutionUploadingChange}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            type="submit"
            className={`press ${saveFeedback === "refused" ? "animate-shake" : ""}`}
            disabled={saving || uploading.stmt || uploading.sol}
          >
            {saveFeedback === "accepted" ? (
              <span className="inline-flex items-center gap-2 animate-icon-pop">
                <Check className="h-4 w-4" /> Guardado
              </span>
            ) : saving ? (
              "Guardando…"
            ) : uploading.stmt || uploading.sol ? (
              "Subiendo imagen…"
            ) : initial?.id ? (
              "Actualizar"
            ) : (
              "Crear ejercicio"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: "/admin/ejercicios" })}
          >
            Cancelar
          </Button>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
            Vista previa enunciado
          </p>
          <MathText text={v.statement_md || "_(vacío)_"} className="text-sm" />
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Alternativas</p>
          <ul className="space-y-1 text-sm">
            {v.choices.map((c, i) => (
              <li key={i} className={i === v.correct_choice ? "font-semibold text-success" : ""}>
                {String.fromCharCode(65 + i)}.{" "}
                {c ? <ChoiceText text={c} /> : <em className="text-muted-foreground">vacío</em>}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
            Vista previa solución
          </p>
          <MathText text={v.solution_md || "_(vacío)_"} className="text-sm" />
        </div>
      </aside>
    </form>
  );
}
