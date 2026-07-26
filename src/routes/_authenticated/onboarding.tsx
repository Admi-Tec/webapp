import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus, Check, GraduationCap } from "lucide-react";
import {
  getFullProfile,
  updateFullProfile,
  listAllUniversities,
  PREP_TIME_VALUES,
  PREP_METHOD_VALUES,
} from "@/lib/profile.functions";
import { listTopics } from "@/lib/exercises.functions";
import { listCareersForUniversities } from "@/lib/careers.functions";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Bienvenido · MatePre" }] }),
  component: OnboardingPage,
});

const TOTAL_STEPS = 5;

const STEP_LABELS = ["Universidad", "Tiempo", "Método", "Carrera", "Refuerzo"];

const PREP_TIME_OPTIONS: Array<{ value: (typeof PREP_TIME_VALUES)[number]; label: string }> = [
  { value: "recien_empiezo", label: "Recién empiezo" },
  { value: "menos_3_meses", label: "Menos de 3 meses" },
  { value: "3_a_6_meses", label: "3 a 6 meses" },
  { value: "mas_6_meses", label: "Más de 6 meses" },
];

const PREP_METHOD_OPTIONS: Array<{ value: (typeof PREP_METHOD_VALUES)[number]; label: string }> = [
  { value: "academia", label: "Academia preuniversitaria" },
  { value: "autodidacta", label: "Autodidacta" },
  { value: "colegio_particular", label: "Colegio / profesores particulares" },
  { value: "primera_vez", label: "Esta es mi primera preparación formal" },
];

type UniRow = { universityId: string; examDate: string; careerId: string | null };

const profileQO = (fetchProfile: () => Promise<any>) =>
  queryOptions({ queryKey: ["full-profile"], queryFn: () => fetchProfile() });

function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchProfile = useServerFn(getFullProfile);
  const save = useServerFn(updateFullProfile);
  const universitiesFn = useServerFn(listAllUniversities);
  const topicsFn = useServerFn(listTopics);
  const careersFn = useServerFn(listCareersForUniversities);

  const qo = useMemo(() => profileQO(fetchProfile), [fetchProfile]);
  const { data } = useSuspenseQuery(qo);
  const universitiesQ = useQuery({
    queryKey: ["all-universities"],
    queryFn: () => universitiesFn(),
  });
  const topicsQ = useQuery({ queryKey: ["topics"], queryFn: () => topicsFn() });
  const allUniversities = universitiesQ.data ?? [];
  const allTopics = topicsQ.data ?? [];

  const [step, setStep] = useState(1);
  const [universities, setUniversities] = useState<UniRow[]>([]);
  const [prepTime, setPrepTime] = useState<string | null>(null);
  const [prepMethod, setPrepMethod] = useState<string | null>(null);
  const [weakTopicIds, setWeakTopicIds] = useState<string[]>([]);

  const universityIds = universities.map((u) => u.universityId);
  const careersQ = useQuery({
    queryKey: ["careers-for-universities", universityIds],
    queryFn: () => careersFn({ data: { universityIds } }),
    enabled: universityIds.length > 0,
  });
  const careersByUniversity = new Map<string, any[]>();
  (careersQ.data ?? []).forEach((c: any) => {
    const list = careersByUniversity.get(c.university_id) ?? [];
    list.push(c);
    careersByUniversity.set(c.university_id, list);
  });
  const [weeklyStudyHours, setWeeklyStudyHours] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Seed the form from the server exactly once. The ["full-profile"] query
  // refetches on window refocus once it goes stale (60s), and re-running the
  // setters below mid-flow would wipe the student's in-progress answers back
  // to the (empty) server values right before they submit.
  const seededRef = useRef(false);
  useEffect(() => {
    if (data?.profile?.onboarding_completed) {
      navigate({ to: "/panel", replace: true });
      return;
    }
    if (seededRef.current) return;
    seededRef.current = true;
    setUniversities(
      (data?.universities ?? []).map((u: any) => ({
        universityId: u.university_id,
        examDate: u.exam_date ?? "",
        careerId: u.career_id ?? null,
      })),
    );
    setPrepTime(data?.profile?.prep_time ?? null);
    setPrepMethod(data?.profile?.prep_method ?? null);
    setWeakTopicIds(data?.profile?.initial_weak_topic_ids ?? []);
    setWeeklyStudyHours(
      data?.profile?.weekly_study_hours != null ? String(data.profile.weekly_study_hours) : "",
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  function addUniversityRow() {
    const used = new Set(universities.map((u) => u.universityId));
    const next = allUniversities.find((u: any) => u.active && !used.has(u.id));
    if (!next) {
      toast.error("Ya agregaste todas las universidades disponibles");
      return;
    }
    setUniversities((rows) => [...rows, { universityId: next.id, examDate: "", careerId: null }]);
  }
  function updateUniversityRow(index: number, patch: Partial<UniRow>) {
    setUniversities((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }
  function removeUniversityRow(index: number) {
    setUniversities((rows) => rows.filter((_, i) => i !== index));
  }
  function toggleWeakTopic(id: string) {
    setWeakTopicIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  async function finish() {
    setSubmitting(true);
    try {
      await save({
        data: {
          universities: universities.map((u) => ({
            universityId: u.universityId,
            examDate: u.examDate || null,
            careerId: u.careerId || null,
          })),
          prepTime: prepTime as any,
          prepMethod: prepMethod as any,
          weeklyStudyHours: weeklyStudyHours ? Number(weeklyStudyHours) : null,
          initialWeakTopicIds: weakTopicIds,
          onboardingCompleted: true,
        },
      });
      // These caches were seeded with the pre-save (empty) profile while the
      // student filled the form; left as-is, /perfil, /panel and /practica
      // keep showing that snapshot for up to staleTime after finishing.
      queryClient.invalidateQueries({ queryKey: ["full-profile"] });
      queryClient.invalidateQueries({ queryKey: ["full-profile-mini"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-progress"] });
      toast.success("¡Listo! Ya puedes empezar a practicar.");
      navigate({ to: "/panel", replace: true });
    } catch (err: any) {
      toast.error(err?.message ?? "No se pudo guardar tu información");
      setSubmitting(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const canProceedStep1 = universities.length > 0;

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Cuéntanos sobre ti</h1>
        <button
          type="button"
          onClick={handleSignOut}
          className="text-xs text-muted-foreground hover:text-foreground hover:underline"
        >
          Cerrar sesión
        </button>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        5 preguntas rápidas — con esto armamos tu plan de estudio y tu cuenta regresiva. No hay
        respuestas incorrectas.
      </p>

      <Progress value={(step / TOTAL_STEPS) * 100} className="mt-5" />
      <div className="mt-2.5 flex items-start justify-between gap-1">
        {STEP_LABELS.map((label, i) => {
          const idx = i + 1;
          const done = idx < step;
          const active = idx === step;
          return (
            <div key={label} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-semibold transition-colors duration-200",
                  done && "bg-primary text-primary-foreground",
                  active && "border-2 border-primary text-primary",
                  !done && !active && "border border-border text-muted-foreground",
                )}
              >
                {done ? <Check className="animate-icon-pop h-3.5 w-3.5" /> : idx}
              </div>
              <span
                className={cn(
                  "hidden text-center text-[0.65rem] leading-tight sm:block",
                  active ? "font-semibold text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>

      <div
        key={step}
        className="animate-card-swap mt-8 rounded-xl border border-border bg-card p-6"
      >
        {step === 1 && (
          <div>
            <h2 className="font-display text-lg font-bold">
              ¿A qué universidad(es) buscas postular?
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Agrega al menos una. Si conoces la fecha de tu examen, indícala para tu cuenta
              regresiva.
            </p>
            <div className="mt-4 space-y-2">
              {universities.length === 0 && (
                <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border p-6 text-center">
                  <GraduationCap className="h-5 w-5 text-muted-foreground" aria-hidden />
                  <p className="text-sm text-muted-foreground">
                    Empieza agregando la universidad a la que quieres postular.
                  </p>
                </div>
              )}
              {universities.map((row, i) => (
                <div
                  key={i}
                  className="animate-fade-up flex items-center gap-2"
                  style={{ "--i": i } as React.CSSProperties}
                >
                  <Select
                    value={row.universityId}
                    onValueChange={(v) => updateUniversityRow(i, { universityId: v })}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Universidad" />
                    </SelectTrigger>
                    <SelectContent>
                      {allUniversities
                        .filter((u: any) => u.active)
                        .map((u: any) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.short_name ?? u.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    className="w-40"
                    value={row.examDate}
                    onChange={(e) => updateUniversityRow(i, { examDate: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="press"
                    onClick={() => removeUniversityRow(i)}
                    aria-label="Quitar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="press mt-3"
              onClick={addUniversityRow}
            >
              <Plus className="mr-1 h-3 w-3" /> Agregar universidad
            </Button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="font-display text-lg font-bold">¿Cuánto tiempo llevas preparándote?</h2>
            <div className="mt-4 space-y-2">
              {PREP_TIME_OPTIONS.map((opt) => {
                const selected = prepTime === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPrepTime(opt.value)}
                    className={cn(
                      "press flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-colors duration-150",
                      selected
                        ? "border-primary bg-primary/10 font-medium"
                        : "border-border bg-background hover:border-primary/40",
                    )}
                  >
                    {opt.label}
                    {selected && <Check className="animate-icon-pop h-4 w-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="font-display text-lg font-bold">¿Cómo te has preparado hasta ahora?</h2>
            <div className="mt-4 space-y-2">
              {PREP_METHOD_OPTIONS.map((opt) => {
                const selected = prepMethod === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPrepMethod(opt.value)}
                    className={cn(
                      "press flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-colors duration-150",
                      selected
                        ? "border-primary bg-primary/10 font-medium"
                        : "border-border bg-background hover:border-primary/40",
                    )}
                  >
                    {opt.label}
                    {selected && <Check className="animate-icon-pop h-4 w-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="font-display text-lg font-bold">¿A qué carrera te gustaría postular?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Opcional — puedes cambiarlo después desde tu perfil. Cada universidad tiene sus
              propias carreras, así que elige una por cada una.
            </p>
            <div className="mt-4 space-y-4">
              {universities.map((row, i) => {
                const uni = allUniversities.find((u: any) => u.id === row.universityId);
                const rowCareers = (careersByUniversity.get(row.universityId) ?? []).filter(
                  (c: any) => c.active || c.id === row.careerId,
                );
                return (
                  <div key={row.universityId}>
                    <Label>{uni?.short_name ?? uni?.name ?? "Universidad"}</Label>
                    <Select
                      value={row.careerId ?? "__none"}
                      onValueChange={(v) =>
                        setUniversities((rows) =>
                          rows.map((r, j) =>
                            j === i ? { ...r, careerId: v === "__none" ? null : v } : r,
                          ),
                        )
                      }
                      disabled={rowCareers.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            rowCareers.length === 0 ? "Sin carreras registradas" : "Selecciona…"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">— ninguna —</SelectItem>
                        {rowCareers.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {step === 5 && (
          <div>
            <h2 className="font-display text-lg font-bold">
              ¿En qué cursos sientes que necesitas más refuerzo?
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Nos ayuda a sugerirte por dónde empezar mientras acumulas tu propio historial.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {allTopics.map((t: any) => {
                const selected = weakTopicIds.includes(t.id);
                return (
                  <label
                    key={t.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors duration-150",
                      selected
                        ? "border-primary bg-primary/10 font-medium"
                        : "border-border bg-background hover:border-primary/40",
                    )}
                  >
                    <Checkbox checked={selected} onCheckedChange={() => toggleWeakTopic(t.id)} />
                    {t.name}
                  </label>
                );
              })}
            </div>

            <div className="mt-6">
              <Label htmlFor="hours">¿Cuántas horas a la semana puedes dedicar a estudiar?</Label>
              <Input
                id="hours"
                type="number"
                min={0}
                max={168}
                value={weeklyStudyHours}
                onChange={(e) => setWeeklyStudyHours(e.target.value)}
                placeholder="ej. 10"
                className="max-w-[140px]"
              />
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <div>
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              className="press"
              onClick={() => setStep((s) => s - 1)}
              disabled={submitting}
            >
              Atrás
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {step > 1 && step < TOTAL_STEPS && (
            <Button
              type="button"
              variant="ghost"
              className="press"
              onClick={() => setStep((s) => s + 1)}
              disabled={submitting}
            >
              Omitir por ahora
            </Button>
          )}
          {step < TOTAL_STEPS ? (
            <Button
              type="button"
              className="press"
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 1 && !canProceedStep1}
            >
              Siguiente
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                className="press"
                onClick={finish}
                disabled={submitting}
              >
                Omitir y terminar
              </Button>
              <Button type="button" className="press" onClick={finish} disabled={submitting}>
                {submitting ? "Guardando…" : "Empezar a practicar"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
