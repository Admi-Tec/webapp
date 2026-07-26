import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FolderUp,
  FileUp,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Plus,
  Trash2,
  Pencil,
} from "lucide-react";
import { MathText, ChoiceText } from "@/lib/math-render";
import {
  listAdminMeta,
  listAdminExams,
  bulkImportExercises,
  createTopic,
  createSubtopic,
} from "@/lib/admin.functions";
import { uploadExerciseImage, validateImageFile } from "@/lib/storage";
import {
  parseExerciseMarkdown,
  normalizeForMatch,
  type ParsedExercise,
  type ParsedDifficulty,
} from "@/lib/markdown-exercise-parser";

export const Route = createFileRoute("/_authenticated/admin/importar")({
  component: AdminImportExercises,
});

type Override = {
  topicId?: string | null;
  subtopicId?: string | null;
  universityId?: string | null;
  difficulty?: ParsedDifficulty | null;
  statementMd?: string;
  choices?: string[];
  correctChoiceIndex?: number | null;
  solutionMd?: string;
  examYear?: number | null;
  tags?: string[];
  // `undefined` = use the file auto-matched from the selected folder (if any);
  // `null` = admin explicitly removed it; a File = admin explicitly replaced it.
  statementImageOverride?: File | null;
  solutionImageOverride?: File | null;
};

interface ImportResult {
  insertedCount: number;
  failed: Array<{ filename: string; message: string }>;
  linkedToExamCount?: number;
  examLinkError?: string | null;
}

interface ResolvedRow extends ParsedExercise {
  topicId: string | null;
  subtopicId: string | null;
  universityId: string | null;
  difficulty: ParsedDifficulty | null;
  statement_md: string | null;
  choices: string[];
  choiceLetters: string[];
  correctChoiceIndex: number | null;
  solution_md: string | null;
  examYear: number | null;
  tags: string[];
  statementImageFile: File | null;
  solutionImageFile: File | null;
  subtopicsForTopic: any[];
  blockingErrors: string[];
  warnings: string[];
  isValid: boolean;
}

// Messages produced by parseExerciseMarkdown for content that IS editable in
// this screen (enunciado/alternativas/solución/respuesta_correcta) — filtered
// out of the frozen parse-time errors so edits get fresh validation instead of
// being stuck on the original file's mistake forever.
const EDITABLE_CONTENT_ERROR_MARKERS = [
  "Enunciado",
  "Alternativas",
  "alternativas",
  "Solución",
  "respuesta_correcta",
];

function findImageFile(files: File[], refPath: string | null): File | null {
  if (!refPath) return null;
  const norm = refPath.replace(/^\.?\//, "").toLowerCase();
  const base = norm.split("/").pop()!;
  const bySuffix = files.find((f) => {
    const rel = ((f as any).webkitRelativePath || f.name).toLowerCase();
    return rel.endsWith(norm);
  });
  if (bySuffix) return bySuffix;
  return files.find((f) => f.name.toLowerCase() === base) ?? null;
}

function AdminImportExercises() {
  const fetchMeta = useServerFn(listAdminMeta);
  const fetchExams = useServerFn(listAdminExams);
  const importFn = useServerFn(bulkImportExercises);
  const meta = useQuery({ queryKey: ["admin-meta"], queryFn: () => fetchMeta() });
  const exams = useQuery({ queryKey: ["admin-exams"], queryFn: () => fetchExams() });
  // Only standard exams have a fixed question list; template exams generate
  // questions per attempt from rules, so there's nothing to append to.
  const standardExams = (exams.data ?? []).filter(
    (e: any) => (e.exam_type ?? "standard") === "standard" && e.status !== "archived",
  );

  const folderInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);

  const createTopicFn = useServerFn(createTopic);
  const createSubtopicFn = useServerFn(createSubtopic);

  const [rawFiles, setRawFiles] = useState<File[]>([]);
  const [parsedRows, setParsedRows] = useState<ParsedExercise[]>([]);
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [examId, setExamId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  // Tracks in-flight quick-create requests (keyed by normalized name) so
  // clicking the same "Crear tema" button from several rows at once doesn't
  // fire duplicate creates while waiting for the first one to finish.
  const [creatingNames, setCreatingNames] = useState<Set<string>>(new Set());

  function setOverride(filename: string, patch: Override) {
    setOverrides((o) => ({ ...o, [filename]: { ...o[filename], ...patch } }));
  }

  async function quickCreateTopic(name: string) {
    const key = `topic:${normalizeForMatch(name)}`;
    if (creatingNames.has(key)) return;
    setCreatingNames((s) => new Set(s).add(key));
    try {
      const res = await createTopicFn({ data: { name } });
      toast[res.duplicated ? "info" : "success"](
        res.duplicated ? `El curso "${name}" ya existía — aplicado.` : `Curso "${name}" creado.`,
      );
      await meta.refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo crear el curso");
    } finally {
      setCreatingNames((s) => {
        const n = new Set(s);
        n.delete(key);
        return n;
      });
    }
  }

  async function quickCreateSubtopic(topicId: string, name: string) {
    const key = `subtopic:${topicId}:${normalizeForMatch(name)}`;
    if (creatingNames.has(key)) return;
    setCreatingNames((s) => new Set(s).add(key));
    try {
      const res = await createSubtopicFn({ data: { topic_id: topicId, name } });
      toast[res.duplicated ? "info" : "success"](
        res.duplicated ? `El tema "${name}" ya existía — aplicado.` : `Tema "${name}" creado.`,
      );
      await meta.refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo crear el tema");
    } finally {
      setCreatingNames((s) => {
        const n = new Set(s);
        n.delete(key);
        return n;
      });
    }
  }

  async function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const mdFiles = files.filter((f) => f.name.toLowerCase().endsWith(".md"));
    if (mdFiles.length === 0) {
      toast.error("No se encontraron archivos .md en la selección.");
      return;
    }
    const parsed = await Promise.all(
      mdFiles.map(async (f) => parseExerciseMarkdown(f.name, await f.text())),
    );
    setRawFiles(files);
    setParsedRows(parsed);
    setOverrides({});
    setImportResult(null);
  }

  const resolvedRows = useMemo(() => {
    if (!meta.data) return [];
    return parsedRows.map((p) => {
      const o = overrides[p.filename] ?? {};

      const topicMatch = p.frontmatter.tema
        ? (meta.data.topics.find(
            (t: any) => normalizeForMatch(t.name) === normalizeForMatch(p.frontmatter.tema!),
          ) ?? null)
        : null;
      const topicId = o.topicId !== undefined ? o.topicId : (topicMatch?.id ?? null);

      const subtopicsForTopic = topicId
        ? meta.data.subtopics.filter((s: any) => s.topic_id === topicId)
        : [];
      const subtopicMatch = p.frontmatter.subtema
        ? (subtopicsForTopic.find(
            (s: any) => normalizeForMatch(s.name) === normalizeForMatch(p.frontmatter.subtema!),
          ) ?? null)
        : null;
      const subtopicId = o.subtopicId !== undefined ? o.subtopicId : (subtopicMatch?.id ?? null);

      const universityMatch = p.frontmatter.universidad
        ? (meta.data.universities.find(
            (u: any) =>
              u.active &&
              (normalizeForMatch(u.name) === normalizeForMatch(p.frontmatter.universidad!) ||
                normalizeForMatch(u.short_name) === normalizeForMatch(p.frontmatter.universidad!)),
          ) ?? null)
        : null;
      const universityId =
        o.universityId !== undefined ? o.universityId : (universityMatch?.id ?? null);

      const difficulty = o.difficulty !== undefined ? o.difficulty : p.difficulty;

      // Content fields — editable in-session via the "Editar ejercicio" panel.
      // Falls back to what the parser extracted from the .md file when there's
      // no override yet.
      const statement_md = o.statementMd !== undefined ? o.statementMd : p.statement_md;
      const choices = o.choices !== undefined ? o.choices : p.choices;
      const choiceLetters =
        o.choices !== undefined
          ? o.choices.map((_, i) => String.fromCharCode(65 + i))
          : p.choiceLetters;
      const correctChoiceIndex =
        o.correctChoiceIndex !== undefined ? o.correctChoiceIndex : p.correctChoiceIndex;
      const solution_md = o.solutionMd !== undefined ? o.solutionMd : p.solution_md;
      const examYear = o.examYear !== undefined ? o.examYear : p.frontmatter.anio_examen;
      const tags = o.tags !== undefined ? o.tags : p.frontmatter.etiquetas;

      const statementImageFile =
        o.statementImageOverride !== undefined
          ? o.statementImageOverride
          : findImageFile(rawFiles, p.frontmatter.imagen_enunciado);
      const solutionImageFile =
        o.solutionImageOverride !== undefined
          ? o.solutionImageOverride
          : findImageFile(rawFiles, p.frontmatter.imagen_solucion);

      // Structural parse errors (bad frontmatter, missing tema/dificultad,
      // unsupported formato_version...) can't be fixed by editing the content
      // fields below, so they stay frozen from parse time. Content errors are
      // re-derived fresh from the current (possibly edited) values instead —
      // otherwise a fix made in the edit panel could never clear the original
      // error.
      const structuralErrors = p.errors.filter(
        (e) => !EDITABLE_CONTENT_ERROR_MARKERS.some((marker) => e.includes(marker)),
      );
      const blockingErrors = [...structuralErrors];
      if (!statement_md || !statement_md.trim()) blockingErrors.push("Falta el enunciado.");
      if (choices.length < 2) blockingErrors.push("Se necesitan al menos 2 alternativas.");
      if (
        correctChoiceIndex === null ||
        correctChoiceIndex < 0 ||
        correctChoiceIndex >= choices.length
      ) {
        blockingErrors.push("Selecciona cuál alternativa es la correcta.");
      }
      if (!solution_md || !solution_md.trim())
        blockingErrors.push("Falta la solución paso a paso.");
      if (!topicId) {
        blockingErrors.push(
          `El curso "${p.frontmatter.tema ?? "(vacío)"}" no existe en el catálogo. Créalo abajo o selecciona uno existente.`,
        );
      }
      if (!difficulty) blockingErrors.push("Selecciona una dificultad válida.");
      if (p.frontmatter.imagen_enunciado && !statementImageFile) {
        blockingErrors.push(
          `No se encontró la imagen "${p.frontmatter.imagen_enunciado}" en los archivos seleccionados.`,
        );
      }
      if (p.frontmatter.imagen_solucion && !solutionImageFile) {
        blockingErrors.push(
          `No se encontró la imagen "${p.frontmatter.imagen_solucion}" en los archivos seleccionados.`,
        );
      }

      const warnings: string[] = [];
      if (p.frontmatter.subtema && !subtopicMatch && o.subtopicId === undefined) {
        warnings.push(
          `Tema "${p.frontmatter.subtema}" no reconocido — créalo abajo o se importará sin tema.`,
        );
      }
      if (p.frontmatter.universidad && !universityMatch && o.universityId === undefined) {
        warnings.push(
          `Universidad "${p.frontmatter.universidad}" no reconocida — se importará sin universidad.`,
        );
      }

      return {
        ...p,
        topicId,
        subtopicId,
        universityId,
        difficulty,
        statement_md,
        choices,
        choiceLetters,
        correctChoiceIndex,
        solution_md,
        examYear,
        tags,
        statementImageFile,
        solutionImageFile,
        subtopicsForTopic,
        blockingErrors,
        warnings,
        isValid: blockingErrors.length === 0,
      };
    });
  }, [parsedRows, meta.data, overrides, rawFiles]);

  const validCount = resolvedRows.filter((r) => r.isValid).length;

  async function onImport() {
    const validRows = resolvedRows.filter((r) => r.isValid);
    if (validRows.length === 0 || importing) return;
    setImporting(true);
    const imageCache = new Map<File, string>();
    async function resolveImagePath(file: File | null): Promise<string | null> {
      if (!file) return null;
      const cached = imageCache.get(file);
      if (cached) return cached;
      const err = validateImageFile(file);
      if (err) throw new Error(`${file.name}: ${err}`);
      const path = await uploadExerciseImage(file);
      imageCache.set(file, path);
      return path;
    }

    try {
      const payload = [];
      for (const r of validRows) {
        const statement_image_path = await resolveImagePath(r.statementImageFile);
        const solution_image_path = await resolveImagePath(r.solutionImageFile);
        payload.push({
          _filename: r.filename,
          topic_id: r.topicId,
          subtopic_id: r.subtopicId,
          university_id: r.universityId,
          exam_year: r.examYear,
          difficulty: r.difficulty,
          statement_md: r.statement_md,
          statement_image_path,
          solution_image_path,
          choices: r.choices,
          correct_choice: r.correctChoiceIndex,
          solution_md: r.solution_md,
          tags: r.tags,
        });
      }
      const result = await importFn({ data: { items: payload, exam_id: examId } });
      setImportResult(result);
      if (result.examLinkError) {
        toast.warning(result.examLinkError);
      } else if (result.failed.length === 0) {
        toast.success(
          `${result.insertedCount} ejercicio(s) importado(s) correctamente${
            result.linkedToExamCount ? ` y agregado(s) al examen` : ""
          }.`,
        );
      } else {
        toast.warning(`${result.insertedCount} importado(s), ${result.failed.length} con errores.`);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Error al importar");
    } finally {
      setImporting(false);
    }
  }

  function reset() {
    setRawFiles([]);
    setParsedRows([]);
    setOverrides({});
    setImportResult(null);
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-xl font-bold">Importar ejercicios</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sube una carpeta (o varios archivos sueltos) con un archivo <code>.md</code> por ejercicio
          — frontmatter YAML + enunciado/alternativas/solución en markdown. Si un ejercicio
          referencia una imagen, inclúyela en la misma selección.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          ref={folderInputRef}
          type="file"
          multiple
          className="hidden"
          {...({ webkitdirectory: "", directory: "" } as any)}
          onChange={(e) => handleFilesSelected(e.target.files)}
        />
        <input
          ref={filesInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFilesSelected(e.target.files)}
        />
        <Button type="button" variant="outline" onClick={() => folderInputRef.current?.click()}>
          <FolderUp className="mr-2 h-4 w-4" /> Seleccionar carpeta
        </Button>
        <Button type="button" variant="outline" onClick={() => filesInputRef.current?.click()}>
          <FileUp className="mr-2 h-4 w-4" /> Seleccionar archivos sueltos
        </Button>
        {parsedRows.length > 0 && (
          <Button type="button" variant="ghost" onClick={reset}>
            Limpiar selección
          </Button>
        )}
      </div>

      {importResult && (
        <div
          className={`mt-6 rounded-xl border p-4 text-sm ${
            importResult.failed.length === 0
              ? "border-success/40 bg-success/5"
              : "border-amber-400/40 bg-amber-400/10"
          }`}
        >
          <p className="font-semibold">
            {importResult.insertedCount} ejercicio(s) importado(s) correctamente
            {importResult.linkedToExamCount
              ? `, ${importResult.linkedToExamCount} agregado(s) al examen "${
                  standardExams.find((e: any) => e.id === examId)?.title ?? ""
                }"`
              : ""}
            {importResult.failed.length > 0 ? `, ${importResult.failed.length} con errores` : ""}.
          </p>
          {importResult.examLinkError && (
            <p className="mt-1 text-amber-700 dark:text-amber-400">{importResult.examLinkError}</p>
          )}
          {importResult.failed.length > 0 && (
            <ul className="mt-2 list-inside list-disc text-muted-foreground">
              {importResult.failed.map((f, i) => (
                <li key={i}>
                  {f.filename}: {f.message}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex gap-2">
            <Button asChild size="sm">
              <Link to="/admin/ejercicios">Ver ejercicios</Link>
            </Button>
            {!!importResult.linkedToExamCount && examId && (
              <Button asChild size="sm" variant="outline">
                <Link to="/admin/examenes/$id" params={{ id: examId }}>
                  Ver examen
                </Link>
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={reset}>
              Importar otro lote
            </Button>
          </div>
        </div>
      )}

      {!importResult && parsedRows.length > 0 && (
        <>
          <div className="mt-6 space-y-3 rounded-xl border border-border bg-card p-4">
            <div className="grid gap-1.5 sm:max-w-md">
              <Label className="text-xs text-muted-foreground">
                Agregar a un examen (opcional)
              </Label>
              <Select
                value={examId ?? "__none"}
                onValueChange={(v) => setExamId(v === "__none" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="— ninguno —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— ninguno (solo al banco) —</SelectItem>
                  {standardExams.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.title} · {e.questionCount} pregunta(s)
                      {e.status === "draft" ? " · borrador" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Los ejercicios importados se añadirán como preguntas al final del examen elegido
                (solo exámenes estándar).
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm">
                <strong>{parsedRows.length}</strong> ejercicio(s) detectado(s) ·{" "}
                <strong className="text-success">{validCount}</strong> listo(s) para importar
                {parsedRows.length - validCount > 0 && (
                  <>
                    {" "}
                    · <strong className="text-destructive">
                      {parsedRows.length - validCount}
                    </strong>{" "}
                    con errores
                  </>
                )}
              </p>
              <Button
                type="button"
                className="press"
                onClick={onImport}
                disabled={validCount === 0 || importing || meta.isLoading}
              >
                {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {importing ? "Importando…" : `Importar ${validCount} ejercicio(s)`}
              </Button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {resolvedRows.map((r) => (
              <ImportRowCard
                key={r.filename}
                row={r}
                topics={meta.data?.topics ?? []}
                universities={meta.data?.universities ?? []}
                onOverride={(patch) => setOverride(r.filename, patch)}
                onQuickCreateTopic={() => quickCreateTopic(r.frontmatter.tema!)}
                onQuickCreateSubtopic={() =>
                  quickCreateSubtopic(r.topicId!, r.frontmatter.subtema!)
                }
                creatingTopic={creatingNames.has(
                  `topic:${normalizeForMatch(r.frontmatter.tema ?? "")}`,
                )}
                creatingSubtopic={
                  r.topicId != null &&
                  creatingNames.has(
                    `subtopic:${r.topicId}:${normalizeForMatch(r.frontmatter.subtema ?? "")}`,
                  )
                }
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ImportRowCard({
  row,
  topics,
  universities,
  onOverride,
  onQuickCreateTopic,
  onQuickCreateSubtopic,
  creatingTopic,
  creatingSubtopic,
}: {
  row: ResolvedRow;
  topics: any[];
  universities: any[];
  onOverride: (patch: Override) => void;
  onQuickCreateTopic: () => void;
  onQuickCreateSubtopic: () => void;
  creatingTopic: boolean;
  creatingSubtopic: boolean;
}) {
  const [showPreview, setShowPreview] = useState(false);
  const [editing, setEditing] = useState(false);

  const topicUnresolved = !row.topicId && !!row.frontmatter.tema;
  const subtopicUnresolved = !row.subtopicId && !!row.frontmatter.subtema && !!row.topicId;

  return (
    <div
      className={`rounded-xl border p-4 ${row.isValid ? "border-border bg-card" : "border-destructive/40 bg-destructive/5"}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {row.isValid ? (
            <CheckCircle2 className="h-4 w-4 text-success" />
          ) : (
            <XCircle className="h-4 w-4 text-destructive" />
          )}
          <span className="font-mono text-sm">{row.filename}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {row.tags.map((t) => (
            <Badge key={t} variant="secondary">
              {t}
            </Badge>
          ))}
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label className="text-xs text-muted-foreground">Curso</Label>
          <Select
            value={row.topicId ?? "__none"}
            onValueChange={(v) =>
              onOverride({ topicId: v === "__none" ? null : v, subtopicId: null })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Sin resolver" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">— sin curso —</SelectItem>
              {topics.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {topicUnresolved && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-1.5 w-full"
              onClick={onQuickCreateTopic}
              disabled={creatingTopic}
            >
              {creatingTopic ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Plus className="mr-1 h-3 w-3" />
              )}
              Crear curso "{row.frontmatter.tema}"
            </Button>
          )}
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Tema</Label>
          <Select
            value={row.subtopicId ?? "__none"}
            onValueChange={(v) => onOverride({ subtopicId: v === "__none" ? null : v })}
            disabled={!row.topicId}
          >
            <SelectTrigger>
              <SelectValue placeholder="(ninguno)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">— ninguno —</SelectItem>
              {row.subtopicsForTopic.map((s: any) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {subtopicUnresolved && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-1.5 w-full"
              onClick={onQuickCreateSubtopic}
              disabled={creatingSubtopic}
            >
              {creatingSubtopic ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Plus className="mr-1 h-3 w-3" />
              )}
              Crear tema "{row.frontmatter.subtema}"
            </Button>
          )}
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Universidad</Label>
          <Select
            value={row.universityId ?? "__none"}
            onValueChange={(v) => onOverride({ universityId: v === "__none" ? null : v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Genérico (todas)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">Genérico — todas las universidades</SelectItem>
              {universities.map((u: any) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.short_name}
                  {u.active === false ? " (inactiva)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Dificultad</Label>
          <Select
            value={row.difficulty ?? "__none"}
            onValueChange={(v) =>
              onOverride({ difficulty: v === "__none" ? null : (v as ParsedDifficulty) })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Sin resolver" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="facil">Fácil</SelectItem>
              <SelectItem value="medio">Medio</SelectItem>
              <SelectItem value="dificil">Difícil</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {row.blockingErrors.length > 0 && (
        <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <ul className="list-inside list-disc">
            {row.blockingErrors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}
      {row.warnings.length > 0 && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-400/40 bg-amber-400/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <ul className="list-inside list-disc">
            {row.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-4">
        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          className="text-sm font-medium text-primary hover:underline"
        >
          {showPreview ? "Ocultar vista previa" : "Ver vista previa"}
        </button>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <Pencil className="h-3.5 w-3.5" /> {editing ? "Cerrar edición" : "Editar ejercicio"}
        </button>
      </div>

      {editing && <ExerciseEditPanel row={row} onOverride={onOverride} />}

      {!editing && showPreview && (
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Enunciado</p>
            <MathText text={row.statement_md ?? "_(vacío)_"} className="text-sm" />
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
              Alternativas
            </p>
            <ul className="space-y-1 text-sm">
              {row.choices.map((c, i) => (
                <li
                  key={i}
                  className={i === row.correctChoiceIndex ? "font-semibold text-success" : ""}
                >
                  {row.choiceLetters[i]}. <ChoiceText text={c} />
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
              Solución paso a paso
            </p>
            <MathText text={row.solution_md ?? "_(vacío)_"} className="text-sm" />
          </div>
        </div>
      )}
    </div>
  );
}

function ExerciseEditPanel({
  row,
  onOverride,
}: {
  row: ResolvedRow;
  onOverride: (patch: Override) => void;
}) {
  const [tagsInput, setTagsInput] = useState(row.tags.join(", "));

  function setChoice(i: number, val: string) {
    onOverride({ choices: row.choices.map((c, j) => (j === i ? val : c)) });
  }
  function addChoice() {
    onOverride({ choices: [...row.choices, ""] });
  }
  function removeChoice(i: number) {
    const choices = row.choices.filter((_, j) => j !== i);
    const correctChoiceIndex =
      row.correctChoiceIndex !== null && row.correctChoiceIndex >= choices.length
        ? Math.max(0, choices.length - 1)
        : row.correctChoiceIndex;
    onOverride({ choices, correctChoiceIndex });
  }
  function commitTags() {
    onOverride({
      tags: tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });
  }

  return (
    <div className="mt-3 space-y-4 border-t border-border pt-3">
      <div>
        <Label className="text-xs text-muted-foreground">Enunciado</Label>
        <Textarea
          value={row.statement_md ?? ""}
          onChange={(e) => onOverride({ statementMd: e.target.value })}
          rows={4}
        />
        <LocalImagePicker
          label="Imagen del enunciado"
          file={row.statementImageFile}
          onChange={(f) => onOverride({ statementImageOverride: f })}
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Alternativas</Label>
          <Button type="button" size="sm" variant="ghost" onClick={addChoice}>
            <Plus className="mr-1 h-3 w-3" /> Añadir
          </Button>
        </div>
        <div className="mt-2 space-y-2">
          {row.choices.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                checked={row.correctChoiceIndex === i}
                onChange={() => onOverride({ correctChoiceIndex: i })}
                aria-label={`Marcar alternativa ${row.choiceLetters[i] ?? i + 1} como correcta`}
              />
              <span className="w-5 text-sm font-semibold">
                {row.choiceLetters[i] ?? String.fromCharCode(65 + i)}.
              </span>
              <Input value={c} onChange={(e) => setChoice(i, e.target.value)} />
              {row.choices.length > 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeChoice(i)}
                  aria-label="Quitar"
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
        <Label className="text-xs text-muted-foreground">Solución paso a paso</Label>
        <Textarea
          value={row.solution_md ?? ""}
          onChange={(e) => onOverride({ solutionMd: e.target.value })}
          rows={4}
        />
        <LocalImagePicker
          label="Imagen de la solución"
          file={row.solutionImageFile}
          onChange={(f) => onOverride({ solutionImageOverride: f })}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs text-muted-foreground">Año del examen (opcional)</Label>
          <Input
            type="number"
            value={row.examYear ?? ""}
            onChange={(e) =>
              onOverride({ examYear: e.target.value ? Number(e.target.value) : null })
            }
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Etiquetas (separadas por coma)</Label>
          <Input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            onBlur={commitTags}
          />
        </div>
      </div>
    </div>
  );
}

function LocalImagePicker({
  label,
  file,
  onChange,
}: {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="mt-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="mt-1 flex items-center gap-2">
        {previewUrl && (
          <img
            src={previewUrl}
            alt=""
            className="h-14 w-14 rounded-md border border-border object-cover"
          />
        )}
        <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
          {file ? "Reemplazar" : "Seleccionar imagen"}
        </Button>
        {file && (
          <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null)}>
            Quitar
          </Button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onChange(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
