import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Tables } from "@/integrations/supabase/types";
import { assertAdmin } from "@/lib/admin.functions";

export type MasteryStatus =
  | "not_started"
  | "theory_completed"
  | "practice_completed"
  | "needs_review"
  | "mastered";

export function masteryFromScore(score: number): MasteryStatus {
  return score >= 80 ? "mastered" : "needs_review";
}

export function extractYouTubeVideoId(value: string): string | null {
  try {
    const url = new URL(value.trim());
    const host = url.hostname.replace(/^www\./, "");
    let id: string | null = null;
    if (host === "youtu.be") id = url.pathname.split("/").filter(Boolean)[0] ?? null;
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (url.pathname === "/watch") id = url.searchParams.get("v");
      else if (url.pathname.startsWith("/embed/") || url.pathname.startsWith("/shorts/"))
        id = url.pathname.split("/")[2] ?? null;
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 70);
}

const idInput = z.object({ id: z.string().uuid() });
const statusSchema = z.enum(["draft", "published", "archived"]);

export const listPreparationCyclesAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("preparation_cycles")
      .select("*, university:universities(id,name,short_name)")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    const cycles = data ?? [];
    const ids = cycles.map((cycle) => cycle.id);
    if (ids.length === 0) return [];
    const [{ data: courses }, { data: cycleTopics }] = await Promise.all([
      context.supabase.from("preparation_cycle_courses").select("id,cycle_id").in("cycle_id", ids),
      context.supabase
        .from("preparation_cycle_topics")
        .select("id,cycle_course_id, course:preparation_cycle_courses!inner(cycle_id)")
        .in("course.cycle_id", ids),
    ]);
    return cycles.map((cycle) => ({
      ...cycle,
      courseCount: (courses ?? []).filter((row) => row.cycle_id === cycle.id).length,
      topicCount: (cycleTopics ?? []).filter((row) => row.course?.cycle_id === cycle.id).length,
    }));
  });

const cycleInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(120),
  universityId: z.string().uuid(),
  description: z.string().trim().max(1000).nullable().optional(),
  status: statusSchema.default("draft"),
});

export const savePreparationCycle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => cycleInput.parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("preparation_cycles")
        .update({
          name: data.name,
          university_id: data.universityId,
          description: data.description ?? null,
          status: data.status,
        })
        .eq("id", data.id)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    const base = slugify(data.name) || "ciclo";
    const { data: matches } = await context.supabase
      .from("preparation_cycles")
      .select("slug")
      .eq("university_id", data.universityId)
      .like("slug", `${base}%`);
    const used = new Set((matches ?? []).map((row) => row.slug));
    let slug = base;
    let suffix = 2;
    while (used.has(slug)) slug = `${base}-${suffix++}`;
    const { data: row, error } = await context.supabase
      .from("preparation_cycles")
      .insert({
        name: data.name,
        slug,
        university_id: data.universityId,
        description: data.description ?? null,
        status: data.status,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const setPreparationCycleStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), status: statusSchema }).parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("preparation_cycles")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getPreparationCycleAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => idInput.parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const [cycleRes, coursesRes, topicsRes, catalogTopicsRes, catalogSubtopicsRes] =
      await Promise.all([
        context.supabase
          .from("preparation_cycles")
          .select("*, university:universities(id,name,short_name)")
          .eq("id", data.id)
          .single(),
        context.supabase
          .from("preparation_cycle_courses")
          .select("*, topic:topics(id,name,slug)")
          .eq("cycle_id", data.id)
          .order("position"),
        context.supabase
          .from("preparation_cycle_topics")
          .select(
            "*, subtopic:subtopics(id,name,slug,topic_id), course:preparation_cycle_courses!inner(cycle_id)",
          )
          .eq("course.cycle_id", data.id)
          .order("position"),
        context.supabase.from("topics").select("id,name,slug").eq("active", true).order("order"),
        context.supabase.from("subtopics").select("id,name,slug,topic_id").order("order"),
      ]);
    if (cycleRes.error) throw new Error(cycleRes.error.message);
    if (coursesRes.error) throw new Error(coursesRes.error.message);
    if (topicsRes.error) throw new Error(topicsRes.error.message);
    return {
      cycle: cycleRes.data,
      courses: (coursesRes.data ?? []).map((course) => ({
        ...course,
        units: (topicsRes.data ?? []).filter((unit) => unit.cycle_course_id === course.id),
      })),
      catalogTopics: catalogTopicsRes.data ?? [],
      catalogSubtopics: catalogSubtopicsRes.data ?? [],
    };
  });

export const addCourseToPreparationCycle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ cycleId: z.string().uuid(), topicId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { count } = await context.supabase
      .from("preparation_cycle_courses")
      .select("id", { count: "exact", head: true })
      .eq("cycle_id", data.cycleId);
    const { error } = await context.supabase.from("preparation_cycle_courses").insert({
      cycle_id: data.cycleId,
      topic_id: data.topicId,
      position: count ?? 0,
    });
    if (error)
      throw new Error(error.code === "23505" ? "El curso ya está en el ciclo." : error.message);
    return { ok: true };
  });

export const removeCourseFromPreparationCycle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => idInput.parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("preparation_cycle_courses")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addTopicToPreparationCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ cycleCourseId: z.string().uuid(), subtopicId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const [{ data: course }, { data: subtopic }] = await Promise.all([
      context.supabase
        .from("preparation_cycle_courses")
        .select("topic_id")
        .eq("id", data.cycleCourseId)
        .single(),
      context.supabase.from("subtopics").select("topic_id").eq("id", data.subtopicId).single(),
    ]);
    if (!course || !subtopic || course.topic_id !== subtopic.topic_id)
      throw new Error("El tema no pertenece al curso seleccionado.");
    const { count } = await context.supabase
      .from("preparation_cycle_topics")
      .select("id", { count: "exact", head: true })
      .eq("cycle_course_id", data.cycleCourseId);
    const { error } = await context.supabase.from("preparation_cycle_topics").insert({
      cycle_course_id: data.cycleCourseId,
      subtopic_id: data.subtopicId,
      position: count ?? 0,
    });
    if (error)
      throw new Error(error.code === "23505" ? "El tema ya está en el curso." : error.message);
    return { ok: true };
  });

export const removeTopicFromPreparationCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => idInput.parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("preparation_cycle_topics")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updatePreparationCycleTopic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        titleOverride: z.string().trim().max(120).nullable().optional(),
        youtubeUrl: z.string().trim().max(500).nullable().optional(),
        videoDurationMinutes: z.number().int().min(1).max(1440).nullable().optional(),
        practiceQuestionCount: z.number().int().min(1).max(20),
        isPublished: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const videoId = data.youtubeUrl ? extractYouTubeVideoId(data.youtubeUrl) : null;
    if (data.youtubeUrl && !videoId) throw new Error("Ingresa una URL válida de YouTube.");
    const { error } = await context.supabase
      .from("preparation_cycle_topics")
      .update({
        title_override: data.titleOverride || null,
        youtube_url: data.youtubeUrl || null,
        youtube_video_id: videoId,
        video_duration_seconds: data.videoDurationMinutes ? data.videoDurationMinutes * 60 : null,
        practice_question_count: data.practiceQuestionCount,
        is_published: data.isPublished,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const movePreparationItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        kind: z.enum(["course", "topic"]),
        id: z.string().uuid(),
        direction: z.enum(["up", "down"]),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const isCourse = data.kind === "course";
    const currentResult = isCourse
      ? await context.supabase
          .from("preparation_cycle_courses")
          .select("id,position,cycle_id")
          .eq("id", data.id)
          .single()
      : await context.supabase
          .from("preparation_cycle_topics")
          .select("id,position,cycle_course_id")
          .eq("id", data.id)
          .single();
    const { data: current, error } = currentResult;
    if (error || !current) throw new Error("Elemento no encontrado.");
    const parentValue = "cycle_id" in current ? current.cycle_id : current.cycle_course_id;
    const query = isCourse
      ? context.supabase
          .from("preparation_cycle_courses")
          .select("id,position")
          .eq("cycle_id", parentValue)
      : context.supabase
          .from("preparation_cycle_topics")
          .select("id,position")
          .eq("cycle_course_id", parentValue);
    const { data: neighbor } =
      data.direction === "up"
        ? await query
            .lt("position", current.position)
            .order("position", { ascending: false })
            .limit(1)
            .maybeSingle()
        : await query.gt("position", current.position).order("position").limit(1).maybeSingle();
    if (!neighbor) return { ok: true };
    const firstResult = isCourse
      ? await context.supabase
          .from("preparation_cycle_courses")
          .update({ position: neighbor.position })
          .eq("id", current.id)
      : await context.supabase
          .from("preparation_cycle_topics")
          .update({ position: neighbor.position })
          .eq("id", current.id);
    const firstError = firstResult.error;
    if (firstError) throw new Error(firstError.message);
    const secondResult = isCourse
      ? await context.supabase
          .from("preparation_cycle_courses")
          .update({ position: current.position })
          .eq("id", neighbor.id)
      : await context.supabase
          .from("preparation_cycle_topics")
          .update({ position: current.position })
          .eq("id", neighbor.id);
    const secondError = secondResult.error;
    if (secondError) throw new Error(secondError.message);
    return { ok: true };
  });

export const listMyPreparationCycles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("preparation_cycles")
      .select("id,name,slug,description,university:universities(id,name,short_name)")
      .eq("status", "published")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const slugInput = z.object({ slug: z.string().min(1).max(80) });

export const getMyPreparationCycle = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => slugInput.parse(input))
  .handler(async ({ context, data }) => {
    const { data: cycle, error } = await context.supabase
      .from("preparation_cycles")
      .select("id,name,slug,description,university:universities(id,name,short_name)")
      .eq("slug", data.slug)
      .eq("status", "published")
      .single();
    if (error) throw new Error("Ciclo no encontrado para tu universidad.");
    const { data: courses, error: coursesError } = await context.supabase
      .from("preparation_cycle_courses")
      .select("id,position,topic:topics(id,name,slug)")
      .eq("cycle_id", cycle.id)
      .order("position");
    if (coursesError) throw new Error(coursesError.message);
    const courseIds = (courses ?? []).map((course) => course.id);
    const [{ data: units }, { data: progress }] = await Promise.all([
      courseIds.length
        ? context.supabase
            .from("preparation_cycle_topics")
            .select(
              "id,cycle_course_id,title_override,video_duration_seconds,practice_question_count,subtopic:subtopics(id,name,slug)",
            )
            .in("cycle_course_id", courseIds)
            .eq("is_published", true)
            .order("position")
        : Promise.resolve({ data: [], error: null }),
      context.supabase
        .from("student_cycle_topic_progress")
        .select("cycle_topic_id,theory_completed_at,last_score,best_score,mastery_status"),
    ]);
    const progressMap = new Map((progress ?? []).map((row) => [row.cycle_topic_id, row]));
    return {
      cycle,
      courses: (courses ?? [])
        .map((course) => ({
          ...course,
          units: (units ?? [])
            .filter((unit) => unit.cycle_course_id === course.id)
            .map((unit) => ({ ...unit, progress: progressMap.get(unit.id) ?? null })),
        }))
        .filter((course) => course.units.length > 0),
    };
  });

export const getMyPreparationUnit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ cycleSlug: z.string(), cycleTopicId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { data: unit, error } = await context.supabase
      .from("preparation_cycle_topics")
      .select(
        "id,title_override,youtube_video_id,video_duration_seconds,practice_question_count,subtopic:subtopics(id,name,slug), course:preparation_cycle_courses!inner(topic:topics(id,name,slug), cycle:preparation_cycles!inner(name,slug,status,university:universities(id,name,short_name)))",
      )
      .eq("id", data.cycleTopicId)
      .eq("is_published", true)
      .eq("course.cycle.slug", data.cycleSlug)
      .eq("course.cycle.status", "published")
      .single();
    if (error || !unit) throw new Error("Unidad no encontrada.");
    const { data: progress } = await context.supabase
      .from("student_cycle_topic_progress")
      .select("theory_completed_at,practice_completed_at,last_score,best_score,mastery_status")
      .eq("cycle_topic_id", data.cycleTopicId)
      .maybeSingle();
    return { unit, progress };
  });

export const markPreparationTheoryCompleted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ cycleTopicId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { data: accessibleUnit, error: unitError } = await context.supabase
      .from("preparation_cycle_topics")
      .select("id,course:preparation_cycle_courses!inner(cycle:preparation_cycles!inner(status))")
      .eq("id", data.cycleTopicId)
      .eq("is_published", true)
      .eq("course.cycle.status", "published")
      .maybeSingle();
    if (unitError || !accessibleUnit) throw new Error("Unidad no disponible.");
    const now = new Date().toISOString();
    const { error } = await context.supabase.from("student_cycle_topic_progress").upsert(
      {
        user_id: context.userId,
        cycle_topic_id: data.cycleTopicId,
        theory_completed_at: now,
        mastery_status: "theory_completed",
      },
      { onConflict: "user_id,cycle_topic_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

type SafeExercise = Pick<
  Tables<"exercises">,
  "id" | "statement_md" | "statement_image_path" | "difficulty" | "choices"
>;

export const startPreparationPractice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ cycleTopicId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { data: unit, error } = await context.supabase
      .from("preparation_cycle_topics")
      .select(
        "id,practice_question_count,subtopic_id,course:preparation_cycle_courses!inner(topic_id,cycle:preparation_cycles!inner(university_id,status))",
      )
      .eq("id", data.cycleTopicId)
      .eq("is_published", true)
      .eq("course.cycle.status", "published")
      .single();
    if (error || !unit) throw new Error("Unidad no disponible.");
    const wanted = unit.practice_question_count;
    const topicId = unit.course.topic_id;
    const universityId = unit.course.cycle.university_id;
    const { data: recent } = await context.supabase
      .from("attempts")
      .select("exercise_id")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(30);
    const recentIds = new Set((recent ?? []).map((row) => row.exercise_id));
    const { data: pool, error: poolError } = await context.supabase
      .from("exercises")
      .select("id,statement_md,statement_image_path,difficulty,choices,university_id")
      .eq("topic_id", topicId)
      .eq("subtopic_id", unit.subtopic_id)
      .limit(200);
    if (poolError) throw new Error(poolError.message);
    const shuffled = [...(pool ?? [])].sort(() => Math.random() - 0.5);
    const ranked = shuffled.sort((a, b) => {
      const score = (row: (typeof shuffled)[number]) =>
        (row.university_id === universityId ? 0 : row.university_id === null ? 1 : 2) +
        (recentIds.has(row.id) ? 10 : 0);
      return score(a) - score(b);
    });
    const questions = ranked.slice(0, wanted).map(({ university_id: _, ...row }) => row);
    if (questions.length === 0) return { sessionId: null, questions: [] as SafeExercise[] };
    const { data: session, error: sessionError } = await context.supabase
      .from("preparation_practice_sessions")
      .insert({
        user_id: context.userId,
        cycle_topic_id: data.cycleTopicId,
        question_ids: questions.map((question) => question.id),
      })
      .select("id")
      .single();
    if (sessionError) throw new Error(sessionError.message);
    return { sessionId: session.id, questions };
  });

export const recordPreparationPracticeAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        sessionId: z.string().uuid(),
        exerciseId: z.string().uuid(),
        selectedChoice: z.number().int().min(0).max(20),
        timeSpentMs: z.number().int().min(0).max(3_600_000),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { data: session, error: sessionError } = await context.supabase
      .from("preparation_practice_sessions")
      .select("*")
      .eq("id", data.sessionId)
      .eq("user_id", context.userId)
      .single();
    if (sessionError || !session || session.status !== "in_progress")
      throw new Error("La práctica ya no está disponible.");
    if (
      !session.question_ids.includes(data.exerciseId) ||
      session.answered_ids.includes(data.exerciseId)
    )
      throw new Error("Pregunta inválida para esta práctica.");
    const { data: exercise } = await context.supabase
      .from("exercises")
      .select("correct_choice")
      .eq("id", data.exerciseId)
      .single();
    if (!exercise) throw new Error("Ejercicio no encontrado.");
    const isCorrect = exercise.correct_choice === data.selectedChoice;
    const answeredIds = [...session.answered_ids, data.exerciseId];
    const correctCount = session.correct_count + (isCorrect ? 1 : 0);
    const completed = answeredIds.length === session.question_ids.length;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: attemptError } = await supabaseAdmin.from("attempts").insert({
      user_id: context.userId,
      exercise_id: data.exerciseId,
      selected_choice: data.selectedChoice,
      is_correct: isCorrect,
      time_spent_ms: data.timeSpentMs,
      exam_session_id: null,
    });
    if (attemptError) throw new Error(attemptError.message);
    const now = new Date().toISOString();
    const { error: updateError } = await context.supabase
      .from("preparation_practice_sessions")
      .update({
        answered_ids: answeredIds,
        correct_count: correctCount,
        status: completed ? "completed" : "in_progress",
        completed_at: completed ? now : null,
      })
      .eq("id", session.id);
    if (updateError) throw new Error(updateError.message);
    let score: number | null = null;
    let masteryStatus: MasteryStatus | null = null;
    if (completed) {
      score = Math.round((correctCount / session.question_ids.length) * 100);
      masteryStatus = masteryFromScore(score);
      const { data: previous } = await context.supabase
        .from("student_cycle_topic_progress")
        .select("best_score,theory_completed_at")
        .eq("cycle_topic_id", session.cycle_topic_id)
        .maybeSingle();
      const { error: progressError } = await context.supabase
        .from("student_cycle_topic_progress")
        .upsert(
          {
            user_id: context.userId,
            cycle_topic_id: session.cycle_topic_id,
            theory_completed_at: previous?.theory_completed_at ?? null,
            practice_completed_at: now,
            last_score: score,
            best_score: Math.max(previous?.best_score ?? 0, score),
            mastery_status: masteryStatus,
          },
          { onConflict: "user_id,cycle_topic_id" },
        );
      if (progressError) throw new Error(progressError.message);
    }
    return { isCorrect, correctChoice: exercise.correct_choice, completed, score, masteryStatus };
  });
