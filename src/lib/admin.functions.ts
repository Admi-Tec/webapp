import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Tables } from "@/integrations/supabase/types";
import { z } from "zod";

type AdminSupabaseClient = SupabaseClient<Database>;

async function assertAdmin(context: { supabase: AdminSupabaseClient; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

// Postgres RLS silently matches zero rows instead of raising an error when a
// row exists but isn't visible/writable under the current policy — an
// `.update()`/`.delete()` can "succeed" (no `error`) while touching nothing.
// Every write below chains `.select(...)` and checks this so a no-op is
// surfaced to the admin instead of a false "guardado" toast.
function assertRowsAffected(rows: unknown[] | null | undefined, entity: string) {
  if (!rows || rows.length === 0) {
    throw new Error(
      `No se pudo guardar ${entity}: no se encontró el registro o no tienes permiso.`,
    );
  }
}

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (error) throw new Error(error.message);
    return { isAdmin: !!data };
  });

const choiceSchema = z.string().trim().min(1).max(500);

const exerciseBase = z.object({
  topic_id: z.string().uuid(),
  subtopic_id: z.string().uuid().nullable().optional(),
  university_id: z.string().uuid().nullable().optional(),
  exam_year: z.number().int().min(1980).max(2100).nullable().optional(),
  difficulty: z.enum(["facil", "medio", "dificil"]),
  statement_md: z.string().trim().min(5).max(5000),
  statement_image_path: z.string().nullable().optional(),
  solution_image_path: z.string().nullable().optional(),
  choices: z.array(choiceSchema).min(2).max(8),
  correct_choice: z.number().int().min(0),
  solution_md: z.string().trim().min(1).max(8000),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
});

const exerciseSchema = exerciseBase.refine((d) => d.correct_choice < d.choices.length, {
  message: "correct_choice fuera de rango",
  path: ["correct_choice"],
});

const exerciseUpdateSchema = exerciseBase
  .extend({ id: z.string().uuid() })
  .refine((d) => d.correct_choice < d.choices.length, {
    message: "correct_choice fuera de rango",
    path: ["correct_choice"],
  });

export const listAdminExercises = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("exercises")
      .select(
        "id, statement_md, difficulty, exam_year, created_at, topic:topics(id,name,slug), university:universities(id,short_name), subtopic:subtopics(name)",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getAdminExercise = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("exercises")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

// Liviana a propósito: solo trae la columna exam_year (sin joins ni texto de
// enunciados) para poblar el filtro de año en /admin/ejercicios sin tener que
// cargar el banco completo de ejercicios de antemano.
export const listExerciseYears = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("exercises")
      .select("exam_year")
      .not("exam_year", "is", null);
    if (error) throw new Error(error.message);
    const years = Array.from(new Set((data ?? []).map((r) => r.exam_year as number)));
    return years.sort((a, b) => b - a);
  });

export const listAdminMeta = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const [topics, subtopics, universities] = await Promise.all([
      context.supabase.from("topics").select("id,name,slug,active,color").order("order"),
      context.supabase.from("subtopics").select("id,name,topic_id").order("order"),
      context.supabase.from("universities").select("id,short_name,name,active").order("short_name"),
    ]);
    if (topics.error) throw new Error(topics.error.message);
    if (subtopics.error) throw new Error(subtopics.error.message);
    if (universities.error) throw new Error(universities.error.message);
    return {
      topics: topics.data ?? [],
      subtopics: subtopics.data ?? [],
      universities: universities.data ?? [],
    };
  });

export const createExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => exerciseSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const payload = {
      topic_id: data.topic_id,
      subtopic_id: data.subtopic_id || null,
      university_id: data.university_id || null,
      exam_year: data.exam_year ?? null,
      difficulty: data.difficulty,
      statement_md: data.statement_md,
      statement_image_path: data.statement_image_path ?? null,
      solution_image_path: data.solution_image_path ?? null,
      choices: data.choices,
      correct_choice: data.correct_choice,
      solution_md: data.solution_md,
      tags: data.tags ?? [],
    };
    const { data: row, error } = await context.supabase
      .from("exercises")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

// Bulk import (see plan-importar-ejercicios-markdown.md): the client parses
// and catalog-resolves each markdown file itself and only sends rows it
// believes are valid, but we still re-validate every row against the same
// schema used for manual creation (exerciseBase) — cheap defense in depth,
// and it lets us report per-file failures instead of rejecting the whole
// batch if the client and server ever disagree about what's valid.
const bulkImportItemSchema = exerciseBase
  .extend({ _filename: z.string() })
  .refine((d) => d.correct_choice < d.choices.length, {
    message: "correct_choice fuera de rango",
    path: ["correct_choice"],
  });

export const bulkImportExercises = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        exam_id: z.string().uuid().nullable().optional(),
        items: z.array(z.record(z.string(), z.any())).min(1).max(200),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);

    // If the batch should land in an exam, fail fast (before inserting any
    // exercise) so a bad exam choice doesn't leave half the work done.
    if (data.exam_id) {
      const { data: exam, error: examErr } = await context.supabase
        .from("exams")
        .select("id, exam_type")
        .eq("id", data.exam_id)
        .maybeSingle();
      if (examErr) throw new Error(examErr.message);
      if (!exam) throw new Error("El examen seleccionado no existe.");
      if ((exam.exam_type ?? "standard") !== "standard") {
        throw new Error(
          "Solo se pueden agregar preguntas a exámenes estándar (los de plantilla se generan por reglas).",
        );
      }
      const { count: existingCount } = await context.supabase
        .from("exam_questions")
        .select("id", { head: true, count: "exact" })
        .eq("exam_id", data.exam_id);
      if ((existingCount ?? 0) + data.items.length > 200) {
        throw new Error(
          `El examen ya tiene ${existingCount ?? 0} pregunta(s); agregar ${data.items.length} superaría el máximo de 200.`,
        );
      }
    }

    const valid: Array<ReturnType<typeof bulkImportItemSchema.parse>> = [];
    const failed: Array<{ filename: string; message: string }> = [];
    for (const raw of data.items) {
      const parsed = bulkImportItemSchema.safeParse(raw);
      if (!parsed.success) {
        failed.push({
          filename: typeof raw._filename === "string" ? raw._filename : "?",
          message: parsed.error.issues[0]?.message ?? "Ejercicio inválido",
        });
        continue;
      }
      valid.push(parsed.data);
    }

    if (valid.length === 0) return { insertedCount: 0, failed, linkedToExamCount: 0 };

    const payload = valid.map((d) => ({
      topic_id: d.topic_id,
      subtopic_id: d.subtopic_id || null,
      university_id: d.university_id || null,
      exam_year: d.exam_year ?? null,
      difficulty: d.difficulty,
      statement_md: d.statement_md,
      statement_image_path: d.statement_image_path ?? null,
      solution_image_path: d.solution_image_path ?? null,
      choices: d.choices,
      correct_choice: d.correct_choice,
      solution_md: d.solution_md,
      tags: d.tags ?? [],
    }));
    const { data: rows, error } = await context.supabase
      .from("exercises")
      .insert(payload)
      .select("id");
    if (error) throw new Error(error.message);

    // Append the freshly created exercises to the chosen exam, after its
    // current last question. If this step fails the exercises are already in
    // the bank, so report it as a partial success instead of throwing.
    let linkedToExamCount = 0;
    let examLinkError: string | null = null;
    const examId = data.exam_id;
    if (examId && rows && rows.length > 0) {
      const { data: maxRow } = await context.supabase
        .from("exam_questions")
        .select("position")
        .eq("exam_id", examId)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle();
      const startPos = (maxRow?.position ?? -1) + 1;
      const { data: linked, error: linkErr } = await context.supabase
        .from("exam_questions")
        .insert(
          (rows as Pick<Tables<"exercises">, "id">[]).map((r, i) => ({
            exam_id: examId,
            exercise_id: r.id,
            position: startPos + i,
            points: 1,
          })),
        )
        .select("id");
      if (linkErr) {
        examLinkError = `Los ejercicios se importaron, pero no se pudieron agregar al examen: ${linkErr.message}`;
      } else {
        linkedToExamCount = linked?.length ?? 0;
      }
    }
    return { insertedCount: rows?.length ?? 0, failed, linkedToExamCount, examLinkError };
  });

export const updateExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => exerciseUpdateSchema.parse(d))

  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { id, ...rest } = data;
    const payload = {
      ...rest,
      subtopic_id: rest.subtopic_id || null,
      university_id: rest.university_id || null,
      exam_year: rest.exam_year ?? null,
      statement_image_path: rest.statement_image_path ?? null,
      solution_image_path: rest.solution_image_path ?? null,
      tags: rest.tags ?? [],
    };
    const { data: rows, error } = await context.supabase
      .from("exercises")
      .update(payload)
      .eq("id", id)
      .select("id");
    if (error) throw new Error(error.message);
    assertRowsAffected(rows, "el ejercicio");
    return { id };
  });

export const deleteExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("exercises")
      .delete()
      .eq("id", data.id)
      .select("id");
    if (error) throw new Error(error.message);
    assertRowsAffected(rows, "el ejercicio");
    return { ok: true };
  });

// ========== TOPICS (subjects) management ==========

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export const listAdminTopics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const [{ data, error }, subtopicsRes, countsRes] = await Promise.all([
      context.supabase
        .from("topics")
        .select("id, name, slug, description, color, active, order")
        .order("order"),
      context.supabase.from("subtopics").select("id, name, topic_id").order("order"),
      context.supabase.from("exercises").select("topic_id, subtopic_id"),
    ]);
    if (error) throw new Error(error.message);
    if (subtopicsRes.error) throw new Error(subtopicsRes.error.message);
    const topicCounts = new Map<string, number>();
    const subtopicCounts = new Map<string, number>();
    ((countsRes.data ?? []) as Pick<Tables<"exercises">, "topic_id" | "subtopic_id">[]).forEach(
      (r) => {
        topicCounts.set(r.topic_id, (topicCounts.get(r.topic_id) ?? 0) + 1);
        if (r.subtopic_id)
          subtopicCounts.set(r.subtopic_id, (subtopicCounts.get(r.subtopic_id) ?? 0) + 1);
      },
    );
    const subtopicRows = (subtopicsRes.data ?? []) as Pick<
      Tables<"subtopics">,
      "id" | "name" | "topic_id"
    >[];
    return (
      (data ?? []) as Pick<
        Tables<"topics">,
        "id" | "name" | "slug" | "description" | "color" | "active" | "order"
      >[]
    ).map((t) => ({
      ...t,
      exerciseCount: topicCounts.get(t.id) ?? 0,
      subtopics: subtopicRows
        .filter((s) => s.topic_id === t.id)
        .map((s) => ({
          id: s.id,
          name: s.name,
          exerciseCount: subtopicCounts.get(s.id) ?? 0,
        })),
    }));
  });

export const createTopic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        name: z.string().trim().min(2).max(60),
        description: z.string().trim().max(300).nullable().optional(),
        color: z.string().trim().max(20).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    // case-insensitive duplicate check
    const { data: existing } = await context.supabase
      .from("topics")
      .select("id, name")
      .ilike("name", data.name)
      .maybeSingle();
    if (existing) {
      return { id: existing.id as string, duplicated: true };
    }
    let slug = slugify(data.name);
    if (!slug) slug = `tema-${Date.now()}`;
    // ensure unique slug
    const { data: bySlug } = await context.supabase
      .from("topics")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (bySlug) slug = `${slug}-${Date.now().toString(36)}`;
    const { data: maxOrderRow } = await context.supabase
      .from("topics")
      .select("order")
      .order("order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrder = (maxOrderRow?.order ?? 0) + 1;
    const { data: row, error } = await context.supabase
      .from("topics")
      .insert({
        name: data.name,
        slug,
        description: data.description ?? null,
        color: data.color ?? null,
        order: nextOrder,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string, duplicated: false };
  });

export const createSubtopic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        topic_id: z.string().uuid(),
        name: z.string().trim().min(2).max(60),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: existing } = await context.supabase
      .from("subtopics")
      .select("id")
      .eq("topic_id", data.topic_id)
      .ilike("name", data.name)
      .maybeSingle();
    if (existing) {
      return { id: existing.id as string, duplicated: true };
    }
    let slug = slugify(data.name);
    if (!slug) slug = `subtema-${Date.now()}`;
    const { data: bySlug } = await context.supabase
      .from("subtopics")
      .select("id")
      .eq("topic_id", data.topic_id)
      .eq("slug", slug)
      .maybeSingle();
    if (bySlug) slug = `${slug}-${Date.now().toString(36)}`;
    const { data: maxOrderRow } = await context.supabase
      .from("subtopics")
      .select("order")
      .eq("topic_id", data.topic_id)
      .order("order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrder = (maxOrderRow?.order ?? 0) + 1;
    const { data: row, error } = await context.supabase
      .from("subtopics")
      .insert({
        topic_id: data.topic_id,
        name: data.name,
        slug,
        order: nextOrder,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string, duplicated: false };
  });

export const renameSubtopic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().trim().min(2).max(60),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: current, error: curErr } = await context.supabase
      .from("subtopics")
      .select("id, topic_id")
      .eq("id", data.id)
      .maybeSingle();
    if (curErr) throw new Error(curErr.message);
    if (!current) throw new Error("El subtema no existe.");
    const { data: existing } = await context.supabase
      .from("subtopics")
      .select("id")
      .eq("topic_id", current.topic_id)
      .ilike("name", data.name)
      .neq("id", data.id)
      .maybeSingle();
    if (existing) throw new Error("Ya existe otro subtema con ese nombre en esta materia.");
    const { data: rows, error } = await context.supabase
      .from("subtopics")
      .update({ name: data.name })
      .eq("id", data.id)
      .select("id");
    if (error) throw new Error(error.message);
    assertRowsAffected(rows, "el subtema");
    return { ok: true };
  });

// Deleting a subtopic never orphans exercises: exercises.subtopic_id is
// ON DELETE SET NULL, so referencing exercises just lose their subtopic
// classification (the UI confirms this with the admin, showing the count).
export const deleteSubtopic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("subtopics")
      .delete()
      .eq("id", data.id)
      .select("id");
    if (error) throw new Error(error.message);
    assertRowsAffected(rows, "el subtema");
    return { ok: true };
  });

export const renameTopic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().trim().min(2).max(60),
        description: z.string().trim().max(300).nullable().optional(),
        color: z.string().trim().max(20).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("topics")
      .update({
        name: data.name,
        description: data.description ?? null,
        color: data.color ?? null,
      })
      .eq("id", data.id)
      .select("id");
    if (error) throw new Error(error.message);
    assertRowsAffected(rows, "la materia");
    return { ok: true };
  });

export const setTopicActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("topics")
      .update({ active: data.active })
      .eq("id", data.id)
      .select("id");
    if (error) throw new Error(error.message);
    assertRowsAffected(rows, "la materia");
    return { ok: true };
  });

export const deleteTopic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { count } = await context.supabase
      .from("exercises")
      .select("id", { head: true, count: "exact" })
      .eq("topic_id", data.id);
    if ((count ?? 0) > 0) {
      throw new Error(
        `No se puede eliminar: la materia tiene ${count} ejercicios. Desactívala en su lugar.`,
      );
    }
    const { data: rows, error } = await context.supabase
      .from("topics")
      .delete()
      .eq("id", data.id)
      .select("id");
    if (error) throw new Error(error.message);
    assertRowsAffected(rows, "la materia");
    return { ok: true };
  });

// ========== UNIVERSITIES management ==========

export const listAdminUniversities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("universities")
      .select("id, name, short_name, slug, description, logo_path, exam_date, active")
      .order("name");
    if (error) throw new Error(error.message);

    const [{ data: studentRows }, { data: examRows }, { data: exerciseRows }] = await Promise.all([
      context.supabase.from("student_universities").select("university_id"),
      context.supabase
        .from("exams")
        .select("university_id, exam_type")
        .not("university_id", "is", null),
      context.supabase.from("exercises").select("university_id").not("university_id", "is", null),
    ]);

    const bump = (m: Map<string, number>, key: string) => m.set(key, (m.get(key) ?? 0) + 1);
    const studentCounts = new Map<string, number>();
    ((studentRows ?? []) as Pick<Tables<"student_universities">, "university_id">[]).forEach((r) =>
      bump(studentCounts, r.university_id),
    );
    const officialExamCounts = new Map<string, number>();
    const templateCounts = new Map<string, number>();
    ((examRows ?? []) as Pick<Tables<"exams">, "university_id" | "exam_type">[]).forEach((r) =>
      bump(
        r.exam_type === "template" ? templateCounts : officialExamCounts,
        r.university_id as string,
      ),
    );
    const exerciseCounts = new Map<string, number>();
    ((exerciseRows ?? []) as Pick<Tables<"exercises">, "university_id">[]).forEach((r) =>
      bump(exerciseCounts, r.university_id as string),
    );

    return (
      (data ?? []) as Pick<
        Tables<"universities">,
        "id" | "name" | "short_name" | "slug" | "description" | "logo_path" | "exam_date" | "active"
      >[]
    ).map((u) => ({
      ...u,
      studentCount: studentCounts.get(u.id) ?? 0,
      examCount: officialExamCounts.get(u.id) ?? 0,
      templateCount: templateCounts.get(u.id) ?? 0,
      exerciseCount: exerciseCounts.get(u.id) ?? 0,
    }));
  });

const universityBase = z.object({
  name: z.string().trim().min(2).max(150),
  short_name: z.string().trim().min(1).max(40),
  description: z.string().trim().max(500).nullable().optional(),
  logo_path: z.string().nullable().optional(),
  exam_date: z.string().trim().nullable().optional(),
});

export const createUniversity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => universityBase.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: existing } = await context.supabase
      .from("universities")
      .select("id")
      .ilike("name", data.name)
      .maybeSingle();
    if (existing) throw new Error("Ya existe una universidad con ese nombre.");

    let slug = slugify(data.name);
    if (!slug) slug = `universidad-${Date.now()}`;
    const { data: bySlug } = await context.supabase
      .from("universities")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (bySlug) slug = `${slug}-${Date.now().toString(36)}`;

    const { data: row, error } = await context.supabase
      .from("universities")
      .insert({
        name: data.name,
        short_name: data.short_name,
        slug,
        description: data.description ?? null,
        logo_path: data.logo_path ?? null,
        exam_date: data.exam_date || null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const updateUniversity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => universityBase.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: existing } = await context.supabase
      .from("universities")
      .select("id")
      .ilike("name", data.name)
      .neq("id", data.id)
      .maybeSingle();
    if (existing) throw new Error("Ya existe otra universidad con ese nombre.");

    const { data: rows, error } = await context.supabase
      .from("universities")
      .update({
        name: data.name,
        short_name: data.short_name,
        description: data.description ?? null,
        logo_path: data.logo_path ?? null,
        exam_date: data.exam_date || null,
      })
      .eq("id", data.id)
      .select("id");
    if (error) throw new Error(error.message);
    assertRowsAffected(rows, "la universidad");
    return { ok: true };
  });

export const setUniversityActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("universities")
      .update({ active: data.active })
      .eq("id", data.id)
      .select("id");
    if (error) throw new Error(error.message);
    assertRowsAffected(rows, "la universidad");
    return { ok: true };
  });

export const deleteUniversity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const [
      { count: exerciseCount },
      { count: examCount },
      { count: sessionCount },
      { count: studentCount },
    ] = await Promise.all([
      context.supabase
        .from("exercises")
        .select("id", { head: true, count: "exact" })
        .eq("university_id", data.id),
      context.supabase
        .from("exams")
        .select("id", { head: true, count: "exact" })
        .eq("university_id", data.id),
      context.supabase
        .from("exam_sessions")
        .select("id", { head: true, count: "exact" })
        .eq("university_id", data.id),
      context.supabase
        .from("student_universities")
        .select("id", { head: true, count: "exact" })
        .eq("university_id", data.id),
    ]);
    const total =
      (exerciseCount ?? 0) + (examCount ?? 0) + (sessionCount ?? 0) + (studentCount ?? 0);
    if (total > 0) {
      throw new Error(
        `No se puede eliminar: tiene ${studentCount ?? 0} estudiante(s), ${examCount ?? 0} examen(es)/simulacro(s), ${exerciseCount ?? 0} ejercicio(s) y ${sessionCount ?? 0} sesión(es) asociadas. Desactívala en su lugar.`,
      );
    }

    const { data: uni } = await context.supabase
      .from("universities")
      .select("logo_path")
      .eq("id", data.id)
      .maybeSingle();
    const { data: rows, error } = await context.supabase
      .from("universities")
      .delete()
      .eq("id", data.id)
      .select("id");
    if (error) throw new Error(error.message);
    assertRowsAffected(rows, "la universidad");
    if (uni?.logo_path) {
      await context.supabase.storage.from("exercise-images").remove([uni.logo_path]);
    }
    return { ok: true };
  });

// ========== CAREERS management ("carreras", scoped per university) ==========

export const listAdminCareers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ universityId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("careers")
      .select("id, name, active, created_at")
      .eq("university_id", data.universityId)
      .order("name");
    if (error) throw new Error(error.message);

    const { data: studentRows } = await context.supabase
      .from("student_universities")
      .select("career_id")
      .eq("university_id", data.universityId);
    const bump = (m: Map<string, number>, key: string | null) => {
      if (!key) return;
      m.set(key, (m.get(key) ?? 0) + 1);
    };
    const studentCounts = new Map<string, number>();
    ((studentRows ?? []) as Pick<Tables<"student_universities">, "career_id">[]).forEach((r) =>
      bump(studentCounts, r.career_id),
    );

    return ((rows ?? []) as Pick<Tables<"careers">, "id" | "name" | "active" | "created_at">[]).map(
      (c) => ({
        ...c,
        studentCount: studentCounts.get(c.id) ?? 0,
      }),
    );
  });

export const createCareer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ universityId: z.string().uuid(), name: z.string().trim().min(2).max(120) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: existing } = await context.supabase
      .from("careers")
      .select("id")
      .eq("university_id", data.universityId)
      .ilike("name", data.name)
      .maybeSingle();
    if (existing) {
      return { id: existing.id as string, duplicated: true };
    }
    const { data: row, error } = await context.supabase
      .from("careers")
      .insert({ university_id: data.universityId, name: data.name })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string, duplicated: false };
  });

export const renameCareer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ id: z.string().uuid(), name: z.string().trim().min(2).max(120) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("careers")
      .update({ name: data.name })
      .eq("id", data.id)
      .select("id");
    if (error) throw new Error(error.message);
    assertRowsAffected(rows, "la carrera");
    return { ok: true };
  });

export const setCareerActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("careers")
      .update({ active: data.active })
      .eq("id", data.id)
      .select("id");
    if (error) throw new Error(error.message);
    assertRowsAffected(rows, "la carrera");
    return { ok: true };
  });

export const deleteCareer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { count: studentCount } = await context.supabase
      .from("student_universities")
      .select("id", { head: true, count: "exact" })
      .eq("career_id", data.id);
    if ((studentCount ?? 0) > 0) {
      throw new Error(
        `No se puede eliminar: ${studentCount} estudiante(s) la referencian. Desactívala en su lugar.`,
      );
    }
    const { data: rows, error } = await context.supabase
      .from("careers")
      .delete()
      .eq("id", data.id)
      .select("id");
    if (error) throw new Error(error.message);
    assertRowsAffected(rows, "la carrera");
    return { ok: true };
  });

// ========== MIN SCORES management ("puntajes mínimos de ingreso") ==========
// Every row requires all three dimensions — university, exam, and career —
// so a min score always applies to exactly one combination. Resolution on
// the ranking page is a plain equality lookup, no specificity logic needed.

export const listExamsForMinScoreAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("exams")
      .select("id, title, status, university:universities(id,short_name)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listAdminMinScores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("min_scores")
      .select(
        "id, min_score, updated_at, university:universities(id,short_name), exam:exams(id,title), career:careers(id,name)",
      )
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// Notifies whoever already attempted this exact exam — the audience a
// (university, exam, career) min score is actually about. Writing another
// user's notifications row is blocked by the self-only RLS policy, so this
// needs the service-role client (same pattern as resolveExerciseReport in
// exercise-review.functions.ts).
async function notifyMinScoreUpdate(
  supabase: AdminSupabaseClient,
  ids: { universityId: string; examId: string; careerId: string },
  minScore: number,
) {
  const [{ data: exam }, { data: career }, { data: sessions }] = await Promise.all([
    supabase.from("exams").select("title").eq("id", ids.examId).maybeSingle(),
    supabase.from("careers").select("name").eq("id", ids.careerId).maybeSingle(),
    supabase
      .from("exam_sessions")
      .select("user_id")
      .eq("exam_id", ids.examId)
      .in("status", ["submitted", "graded"]),
  ]);
  const affected = [
    ...new Set<string>(
      ((sessions ?? []) as Pick<Tables<"exam_sessions">, "user_id">[]).map((s) => s.user_id),
    ),
  ];
  if (affected.length === 0) return;
  const scopeLabel = [exam?.title, career?.name].filter(Boolean).join(" — ") || "tu perfil";
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const title = `Se actualizó el puntaje mínimo de ingreso de ${scopeLabel}`;
  const body = `Ahora es ${minScore}.`;
  await supabaseAdmin
    .from("notifications")
    .insert(
      affected.map((userId) => ({ user_id: userId, kind: "min_score_updated", title, body })),
    );
}

const minScoreFields = z.object({
  universityId: z.string().uuid(),
  examId: z.string().uuid(),
  careerId: z.string().uuid(),
  minScore: z.number().min(0).max(1000000),
});

async function assertNoDuplicateMinScore(
  context: { supabase: AdminSupabaseClient },
  ids: { universityId: string; examId: string; careerId: string },
  excludeId?: string,
) {
  let q = context.supabase
    .from("min_scores")
    .select("id")
    .eq("university_id", ids.universityId)
    .eq("exam_id", ids.examId)
    .eq("career_id", ids.careerId);
  if (excludeId) q = q.neq("id", excludeId);
  const { data: existing } = await q.maybeSingle();
  if (existing) {
    throw new Error(
      "Ya existe un puntaje mínimo para esa combinación de universidad, examen y carrera.",
    );
  }
}

export const createMinScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => minScoreFields.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    await assertNoDuplicateMinScore(context, data);
    const { data: row, error } = await context.supabase
      .from("min_scores")
      .insert({
        university_id: data.universityId,
        exam_id: data.examId,
        career_id: data.careerId,
        min_score: data.minScore,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await notifyMinScoreUpdate(context.supabase, data, data.minScore);
    return { id: row.id as string };
  });

export const updateMinScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => minScoreFields.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    await assertNoDuplicateMinScore(context, data, data.id);
    const { data: rows, error } = await context.supabase
      .from("min_scores")
      .update({
        university_id: data.universityId,
        exam_id: data.examId,
        career_id: data.careerId,
        min_score: data.minScore,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .select("id");
    if (error) throw new Error(error.message);
    assertRowsAffected(rows, "el puntaje mínimo");
    await notifyMinScoreUpdate(context.supabase, data, data.minScore);
    return { ok: true };
  });

export const deleteMinScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("min_scores")
      .delete()
      .eq("id", data.id)
      .select("id");
    if (error) throw new Error(error.message);
    assertRowsAffected(rows, "el puntaje mínimo");
    return { ok: true };
  });

// ========== EXAMS management ==========

const templateRuleSchema = z.object({
  topic_id: z.string().uuid(),
  difficulty_filter: z.enum(["facil", "medio", "dificil"]).nullable().optional(),
  question_count: z.number().int().min(1).max(100),
});

// Points-per-question scoring config (see plan-sistema-puntajes.md): every
// exam/template carries its own points_correct/incorrect/empty (defaulted to
// +1/-1/0 in the creation form), editable per exam.
const scoringFields = {
  points_correct: z.number().min(-1000).max(1000),
  points_incorrect: z.number().min(-1000).max(1000),
  points_empty: z.number().min(-1000).max(1000),
};

// Sin exigir >=1 pregunta/regla a propósito: un examen se puede crear/guardar
// vacío y publicarse como "Próximamente" — el estudiante lo ve bloqueado
// (ComingSoonChip) hasta que se le agreguen preguntas. startExamSession sigue
// rechazando iniciar una sesión sobre un examen vacío como backstop.
const examSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(1000).nullable().optional(),
  university_id: z.string().uuid(),
  time_limit_min: z.number().int().min(1).max(600),
  passing_score: z.number().int().min(0).max(100000),
  max_attempts: z.number().int().min(1).max(50).nullable().optional(),
  status: z.enum(["draft", "published", "archived"]),
  question_order: z.enum(["fixed", "random"]),
  exam_type: z.enum(["standard", "template"]).default("standard"),
  exercise_ids: z.array(z.string().uuid()).max(200).default([]),
  template_rules: z.array(templateRuleSchema).max(50).default([]),
  ...scoringFields,
});

const examUpdateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(1000).nullable().optional(),
  university_id: z.string().uuid(),
  time_limit_min: z.number().int().min(1).max(600),
  passing_score: z.number().int().min(0).max(100000),
  max_attempts: z.number().int().min(1).max(50).nullable().optional(),
  status: z.enum(["draft", "published", "archived"]),
  question_order: z.enum(["fixed", "random"]),
  exam_type: z.enum(["standard", "template"]).default("standard"),
  exercise_ids: z.array(z.string().uuid()).max(200).default([]),
  template_rules: z.array(templateRuleSchema).max(50).default([]),
  ...scoringFields,
});

async function validateTemplateRules(
  supabase: AdminSupabaseClient,
  rules: Array<{
    topic_id: string;
    difficulty_filter?: Database["public"]["Enums"]["difficulty"] | null;
    question_count: number;
  }>,
  universityId: string,
) {
  for (const rule of rules) {
    let q = supabase
      .from("exercises")
      .select("id", { head: true, count: "exact" })
      .eq("topic_id", rule.topic_id)
      .or(`university_id.eq.${universityId},university_id.is.null`);
    if (rule.difficulty_filter) q = q.eq("difficulty", rule.difficulty_filter);
    const { count, error } = await q;
    if (error) throw new Error(error.message);
    if ((count ?? 0) < rule.question_count) {
      const { data: topic } = await supabase
        .from("topics")
        .select("name")
        .eq("id", rule.topic_id)
        .maybeSingle();
      throw new Error(
        `La materia "${topic?.name ?? rule.topic_id}" solo tiene ${count ?? 0} ejercicios disponibles para esta universidad (propios o genéricos)${rule.difficulty_filter ? ` (${rule.difficulty_filter})` : ""}, pero pediste ${rule.question_count}.`,
      );
    }
  }
}

export const listAdminExams = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("exams")
      .select(
        "id, title, status, exam_type, time_limit_min, created_at, exam_questions(count), exam_template_rules(question_count), exam_sessions(count)",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    type AdminExamListRow = Pick<
      Tables<"exams">,
      "id" | "title" | "status" | "exam_type" | "time_limit_min" | "created_at"
    > & {
      exam_questions: { count: number }[] | null;
      exam_template_rules: { question_count: number }[] | null;
      exam_sessions: { count: number }[] | null;
    };
    return ((data ?? []) as AdminExamListRow[]).map((e) => ({
      ...e,
      questionCount:
        (e.exam_type ?? "standard") === "template"
          ? (e.exam_template_rules ?? []).reduce((sum, r) => sum + (r.question_count ?? 0), 0)
          : (e.exam_questions?.[0]?.count ?? 0),
      attemptCount: e.exam_sessions?.[0]?.count ?? 0,
    }));
  });

export const getAdminExam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: exam, error } = await context.supabase
      .from("exams")
      .select(
        "*, exam_questions(exercise_id, position), exam_template_rules(id, topic_id, difficulty_filter, question_count, position)",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!exam) return null;
    const { count: attemptCount } = await context.supabase
      .from("exam_sessions")
      .select("id", { head: true, count: "exact" })
      .eq("exam_id", data.id);
    type AdminExamDetailRow = Tables<"exams"> & {
      exam_questions: Pick<Tables<"exam_questions">, "exercise_id" | "position">[] | null;
      exam_template_rules:
        | Pick<
            Tables<"exam_template_rules">,
            "id" | "topic_id" | "difficulty_filter" | "question_count" | "position"
          >[]
        | null;
    };
    const typedExam = exam as unknown as AdminExamDetailRow;
    const exercise_ids = (typedExam.exam_questions ?? [])
      .sort((a, b) => a.position - b.position)
      .map((q) => q.exercise_id);
    const template_rules = (typedExam.exam_template_rules ?? [])
      .sort((a, b) => a.position - b.position)
      .map((r) => ({
        topic_id: r.topic_id,
        difficulty_filter: r.difficulty_filter,
        question_count: r.question_count,
      }));
    return { ...exam, exercise_ids, template_rules, attemptCount: attemptCount ?? 0 };
  });

export const listExerciseBank = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("exercises")
      .select(
        "id, statement_md, difficulty, exam_year, topic:topics(id,name), university:universities(id,short_name)",
      )
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => examSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    if (data.exam_type === "template") {
      await validateTemplateRules(context.supabase, data.template_rules, data.university_id);
    }
    const { data: row, error } = await context.supabase
      .from("exams")
      .insert({
        title: data.title,
        description: data.description ?? null,
        university_id: data.university_id,
        time_limit_min: data.time_limit_min,
        passing_score: data.passing_score,
        max_attempts: data.max_attempts ?? null,
        status: data.status,
        question_order: data.question_order,
        exam_type: data.exam_type,
        points_correct: data.points_correct,
        points_incorrect: data.points_incorrect,
        points_empty: data.points_empty,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    if (data.exam_type === "standard") {
      const inserts = data.exercise_ids.map((eid, i) => ({
        exam_id: row.id,
        exercise_id: eid,
        position: i,
        points: 1,
      }));
      const { error: qErr } = await context.supabase.from("exam_questions").insert(inserts);
      if (qErr) throw new Error(qErr.message);
    } else {
      const inserts = data.template_rules.map((r, i) => ({
        exam_id: row.id,
        topic_id: r.topic_id,
        difficulty_filter: r.difficulty_filter ?? null,
        question_count: r.question_count,
        position: i,
      }));
      const { error: rErr } = await context.supabase.from("exam_template_rules").insert(inserts);
      if (rErr) throw new Error(rErr.message);
    }
    return { id: row.id as string };
  });

export const updateExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => examUpdateSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    if (data.exam_type === "template") {
      await validateTemplateRules(context.supabase, data.template_rules, data.university_id);
    }
    const { id } = data;
    const { data: rows, error } = await context.supabase
      .from("exams")
      .update({
        title: data.title,
        description: data.description ?? null,
        university_id: data.university_id,
        time_limit_min: data.time_limit_min,
        passing_score: data.passing_score,
        max_attempts: data.max_attempts ?? null,
        status: data.status,
        question_order: data.question_order,
        exam_type: data.exam_type,
        points_correct: data.points_correct,
        points_incorrect: data.points_incorrect,
        points_empty: data.points_empty,
      })
      .eq("id", id)
      .select("id");
    if (error) throw new Error(error.message);
    assertRowsAffected(rows, "el examen");

    await context.supabase.from("exam_questions").delete().eq("exam_id", id);
    await context.supabase.from("exam_template_rules").delete().eq("exam_id", id);

    if (data.exam_type === "standard") {
      const inserts = data.exercise_ids.map((eid, i) => ({
        exam_id: id,
        exercise_id: eid,
        position: i,
        points: 1,
      }));
      const { error: qErr } = await context.supabase.from("exam_questions").insert(inserts);
      if (qErr) throw new Error(qErr.message);
    } else {
      const inserts = data.template_rules.map((r, i) => ({
        exam_id: id,
        topic_id: r.topic_id,
        difficulty_filter: r.difficulty_filter ?? null,
        question_count: r.question_count,
        position: i,
      }));
      const { error: rErr } = await context.supabase.from("exam_template_rules").insert(inserts);
      if (rErr) throw new Error(rErr.message);
    }
    return { id };
  });

export const deleteExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { count } = await context.supabase
      .from("exam_sessions")
      .select("id", { head: true, count: "exact" })
      .eq("exam_id", data.id);
    if ((count ?? 0) > 0) {
      throw new Error(
        `No se puede eliminar: hay ${count} intento(s) generado(s). Archívalo en su lugar para conservar el historial.`,
      );
    }
    const { data: rows, error } = await context.supabase
      .from("exams")
      .delete()
      .eq("id", data.id)
      .select("id");
    if (error) throw new Error(error.message);
    assertRowsAffected(rows, "el examen");
    return { ok: true };
  });

export const archiveExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("exams")
      .update({ status: "archived" })
      .eq("id", data.id)
      .select("id");
    if (error) throw new Error(error.message);
    assertRowsAffected(rows, "el examen");
    return { ok: true };
  });

// Returns, for each provided topic/difficulty pair, how many exercises exist.
export const getTopicQuestionCounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        university_id: z.string().uuid(),
        pairs: z
          .array(
            z.object({
              topic_id: z.string().uuid(),
              difficulty_filter: z.enum(["facil", "medio", "dificil"]).nullable().optional(),
            }),
          )
          .max(50),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const out: Array<{ topic_id: string; difficulty_filter: string | null; count: number }> = [];
    for (const p of data.pairs) {
      let q = context.supabase
        .from("exercises")
        .select("id", { head: true, count: "exact" })
        .eq("topic_id", p.topic_id)
        .or(`university_id.eq.${data.university_id},university_id.is.null`);
      if (p.difficulty_filter) q = q.eq("difficulty", p.difficulty_filter);
      const { count } = await q;
      out.push({
        topic_id: p.topic_id,
        difficulty_filter: p.difficulty_filter ?? null,
        count: count ?? 0,
      });
    }
    return out;
  });
