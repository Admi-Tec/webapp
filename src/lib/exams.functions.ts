import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

function publicClient() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

const publishedExamsInput = z.object({ universitySlug: z.string().optional() });

export const listPublishedExams = createServerFn({ method: "GET" })
  .inputValidator((d) => publishedExamsInput.parse(d ?? {}))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const baseQuery = sb
      .from("exams")
      .select(
        "id, title, description, time_limit_min, passing_score, max_attempts, status, question_order, exam_questions(count)",
      )
      .eq("status", "published")
      .eq("exam_type", "standard")
      .order("created_at", { ascending: false });

    if (!data?.universitySlug) {
      const { data: exams, error } = await baseQuery;
      if (error) throw new Error(error.message);
      return (exams ?? []).map((e: any) => ({
        ...e,
        questionCount: e.exam_questions?.[0]?.count ?? 0,
      }));
    }

    const { data: university, error: uniError } = await sb
      .from("universities")
      .select("id")
      .eq("slug", data.universitySlug)
      .maybeSingle();
    if (uniError) throw new Error(uniError.message);
    if (!university) return [];

    const { data: exams, error: examError } = await baseQuery.eq("university_id", university.id);
    if (examError) throw new Error(examError.message);
    return (exams ?? []).map((e: any) => ({
      ...e,
      questionCount: e.exam_questions?.[0]?.count ?? 0,
    }));
  });

const listPublishedTemplatesInput = z.object({ universityId: z.string().uuid().optional() });

export const listPublishedTemplates = createServerFn({ method: "GET" })
  .inputValidator((d) => listPublishedTemplatesInput.parse(d ?? {}))
  .handler(async ({ data }) => {
    const sb = publicClient();
    let query = sb
      .from("exams")
      .select(
        "id, title, description, time_limit_min, passing_score, max_attempts, university:universities(id, slug, short_name), exam_template_rules(question_count)",
      )
      .eq("status", "published")
      .eq("exam_type", "template")
      .order("created_at", { ascending: false });
    if (data?.universityId) query = query.eq("university_id", data.universityId);
    const { data: exams, error } = await query;
    if (error) throw new Error(error.message);
    return (exams ?? []).map((e: any) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      time_limit_min: e.time_limit_min,
      passing_score: e.passing_score,
      max_attempts: e.max_attempts,
      university: e.university,
      totalQuestions: (e.exam_template_rules ?? []).reduce(
        (sum: number, r: any) => sum + (r.question_count ?? 0),
        0,
      ),
      ruleCount: (e.exam_template_rules ?? []).length,
    }));
  });

export const getTemplatePreview = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: exam, error } = await sb
      .from("exams")
      .select(
        "id, title, description, time_limit_min, passing_score, status, exam_type, points_correct, points_incorrect, points_empty, university:universities(id, slug, short_name), exam_template_rules(question_count, position, topic:topics(name))",
      )
      .eq("id", data.id)
      .eq("status", "published")
      .eq("exam_type", "template")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!exam) return null;

    const rules = ((exam as any).exam_template_rules ?? []).sort(
      (a: any, b: any) => a.position - b.position,
    );
    const topicBreakdown = rules.map((r: any) => ({
      name: r.topic?.name ?? "Tema",
      count: r.question_count as number,
    }));
    const totalQuestions = topicBreakdown.reduce((sum: number, r: any) => sum + r.count, 0);

    return {
      id: exam.id,
      title: exam.title,
      description: exam.description,
      time_limit_min: exam.time_limit_min,
      passing_score: exam.passing_score,
      university: (exam as any).university,
      points_correct: exam.points_correct,
      points_incorrect: exam.points_incorrect,
      points_empty: exam.points_empty,
      topicBreakdown,
      totalQuestions,
      maxScore: totalQuestions * exam.points_correct,
    };
  });

export const getExamPreview = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: exam, error } = await sb
      .from("exams")
      .select(
        "id, title, description, time_limit_min, passing_score, max_attempts, status, question_order, points_correct, points_incorrect, points_empty, exam_questions(count)",
      )
      .eq("id", data.id)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!exam) return null;

    const { data: rows } = await sb
      .from("exam_questions")
      .select("exercise:exercises(topic:topics(name))")
      .eq("exam_id", data.id);
    const counts = new Map<string, number>();
    (rows ?? []).forEach((r: any) => {
      const name = r.exercise?.topic?.name ?? "Otros";
      counts.set(name, (counts.get(name) ?? 0) + 1);
    });
    const topicBreakdown = Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
    const questionCount = (exam as any).exam_questions?.[0]?.count ?? 0;

    return {
      ...exam,
      questionCount,
      topicBreakdown,
      maxScore: questionCount * exam.points_correct,
    };
  });

export const getMyExamAttempts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ examId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("exam_sessions")
      .select("id, status, started_at, finished_at, score, total, max_score")
      .eq("user_id", userId)
      .eq("exam_id", data.examId)
      .order("started_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listMyUniversityExamSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ universitySlug: z.string().trim() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: university, error: uniError } = await supabase
      .from("universities")
      .select("id")
      .eq("slug", data.universitySlug)
      .maybeSingle();
    if (uniError) throw new Error(uniError.message);
    if (!university) return [];

    const { data: rows, error } = await supabase
      .from("exam_sessions")
      .select("id, status, started_at, finished_at, score, total, max_score")
      .eq("user_id", userId)
      .eq("university_id", university.id)
      .order("started_at", { ascending: false })
      .limit(10);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// Lets a student erase one of their own exam/simulacro attempts. Deleting the
// exam_sessions row also removes it from every ranking/stats RPC (they all read
// exam_sessions live, see get_university_leaderboard / get_exam_leaderboard /
// get_exam_stats) and frees up a used slot for single- or max-attempt exams —
// the UI must warn the student about both effects before calling this.
export const deleteExamSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ sessionId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    // attempts.exam_session_id has no FK/cascade, so the per-question rows would
    // otherwise be orphaned and keep counting toward the panel's topic-accuracy stats.
    const { error: attemptsErr } = await supabase
      .from("attempts")
      .delete()
      .eq("exam_session_id", data.sessionId)
      .eq("user_id", userId);
    if (attemptsErr) throw new Error(attemptsErr.message);
    const { error } = await supabase
      .from("exam_sessions")
      .delete()
      .eq("id", data.sessionId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const startExamSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ examId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    // Resume any in-progress session
    const { data: ongoing } = await supabase
      .from("exam_sessions")
      .select("id, started_at, time_limit_min")
      .eq("user_id", userId)
      .eq("exam_id", data.examId)
      .eq("status", "in_progress")
      .maybeSingle();
    if (ongoing) {
      const elapsed = (Date.now() - new Date(ongoing.started_at as string).getTime()) / 60000;
      if (elapsed < (ongoing.time_limit_min ?? 60)) {
        return { sessionId: ongoing.id as string };
      }
      // status/finished_at are locked down to the service-role client (see
      // protect_exam_session_grading_columns_trigger) — the authenticated
      // client can no longer write them directly.
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("exam_sessions")
        .update({ status: "submitted", finished_at: new Date().toISOString() })
        .eq("id", ongoing.id);
    }

    // Load exam metadata
    const { data: exam, error: examErr } = await supabase
      .from("exams")
      .select("id, status, time_limit_min, max_attempts, question_order, exam_type, university_id")
      .eq("id", data.examId)
      .maybeSingle();
    if (examErr) throw new Error(examErr.message);
    if (!exam || exam.status !== "published")
      throw new Error("Este examen no está disponible en este momento.");

    // Enforce max_attempts — sin límite configurado, el examen permite intentos
    // ilimitados. Simulacros (templates) siempre permiten regenerar.
    if (exam.exam_type !== "template" && exam.max_attempts) {
      const { count: finishedCount } = await supabase
        .from("exam_sessions")
        .select("id", { head: true, count: "exact" })
        .eq("user_id", userId)
        .eq("exam_id", exam.id)
        .in("status", ["submitted", "graded"]);
      const done = finishedCount ?? 0;
      if (done >= exam.max_attempts) {
        throw new Error(
          `Ya alcanzaste el máximo de ${exam.max_attempts} intentos para este examen.`,
        );
      }
    }

    // Build question list based on exam_type
    let questionIds: string[] = [];
    if (exam.exam_type === "template") {
      const { data: rules, error: rErr } = await supabase
        .from("exam_template_rules")
        .select("topic_id, difficulty_filter, question_count, position")
        .eq("exam_id", exam.id)
        .order("position");
      if (rErr) throw new Error(rErr.message);
      if (!rules || rules.length === 0)
        throw new Error("Este examen no tiene reglas configuradas.");

      // Collect questions the student has already seen in prior sessions of this template
      const { data: priorSessions } = await supabase
        .from("exam_sessions")
        .select("question_ids")
        .eq("user_id", userId)
        .eq("exam_id", exam.id);
      const seen = new Set<string>();
      (priorSessions ?? []).forEach((s: any) => {
        (s.question_ids ?? []).forEach((id: string) => seen.add(id));
      });

      for (const rule of rules) {
        let q = supabase
          .from("exercises")
          .select("id, topic:topics(name)")
          .eq("topic_id", rule.topic_id);
        // Pool must combine the exam's own university with generic (university-less)
        // exercises — never every university's exercises unfiltered (see
        // plan-importar-ejercicios-markdown_update.md §5).
        q = exam.university_id
          ? q.or(`university_id.eq.${exam.university_id},university_id.is.null`)
          : q.is("university_id", null);
        if (rule.difficulty_filter) q = q.eq("difficulty", rule.difficulty_filter);
        const { data: pool, error: pErr } = await q;
        if (pErr) throw new Error(pErr.message);
        const ids = (pool ?? []).map((e: any) => e.id as string);
        const topicName = (pool ?? [])[0]?.topic?.name ?? "una materia";
        if (ids.length < rule.question_count) {
          throw new Error(
            `No hay suficientes preguntas de ${topicName} para generar este simulacro.`,
          );
        }
        const unseen = ids.filter((id) => !seen.has(id));
        const alreadySeen = ids.filter((id) => seen.has(id));
        const shuffle = <T>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);
        const picked: string[] = [];
        picked.push(...shuffle(unseen).slice(0, rule.question_count));
        if (picked.length < rule.question_count) {
          picked.push(...shuffle(alreadySeen).slice(0, rule.question_count - picked.length));
        }
        questionIds.push(...picked);
      }
      // template exams always shuffle across all rules
      questionIds = questionIds.sort(() => Math.random() - 0.5);
    } else {
      const { data: eqs, error: eqErr } = await supabase
        .from("exam_questions")
        .select("exercise_id, position")
        .eq("exam_id", exam.id)
        .order("position");
      if (eqErr) throw new Error(eqErr.message);
      questionIds = (eqs ?? []).map((q: any) => q.exercise_id as string);
      if (questionIds.length === 0) throw new Error("El examen no tiene preguntas.");
      if (exam.question_order === "random") {
        questionIds = [...questionIds].sort(() => Math.random() - 0.5);
      }
    }

    const { data: row, error } = await supabase
      .from("exam_sessions")
      .insert({
        user_id: userId,
        exam_id: exam.id,
        status: "in_progress",
        answers: {},
        flagged: [],
        question_ids: questionIds,
        time_limit_min: exam.time_limit_min,
        total: questionIds.length,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { sessionId: row.id as string };
  });

const startRandomExamInput = z.object({ universitySlug: z.string().trim() });

export const startRandomExamSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => startRandomExamInput.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: university, error: uniError } = await supabase
      .from("universities")
      .select("id")
      .eq("slug", data.universitySlug)
      .maybeSingle();
    if (uniError) throw new Error(uniError.message);
    if (!university) throw new Error("Universidad no encontrada");

    const { data: exercises, error: exError } = await supabase
      .from("exercises")
      .select("id")
      .eq("university_id", university.id);
    if (exError) throw new Error(exError.message);
    const ids = (exercises ?? []).map((ex: any) => ex.id as string);
    if (ids.length === 0)
      throw new Error("No hay ejercicios disponibles para generar el simulacro.");

    const questionIds = [...ids].sort(() => Math.random() - 0.5);
    const timeLimitMin = Math.max(1, Math.ceil((questionIds.length * 90) / 60));

    const { data: row, error } = await supabase
      .from("exam_sessions")
      .insert({
        user_id: userId,
        exam_id: null,
        university_id: university.id,
        status: "in_progress",
        answers: {},
        flagged: [],
        question_ids: questionIds,
        time_limit_min: timeLimitMin,
        total: questionIds.length,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { sessionId: row.id as string };
  });

export const getExamSession = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ sessionId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: session, error } = await supabase
      .from("exam_sessions")
      .select("*, exam:exams(id, title, time_limit_min, passing_score)")
      .eq("id", data.sessionId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!session) throw new Error("Sesión no encontrada");

    const ids: string[] = (session.question_ids ?? []) as any;
    let questions: any[] = [];
    if (ids.length) {
      const { data: exs } = await supabase
        .from("exercises")
        .select("id, statement_md, statement_image_path, choices, topic:topics(name)")
        .in("id", ids);
      const byId = new Map((exs ?? []).map((e: any) => [e.id, e]));
      questions = ids.map((id) => byId.get(id)).filter(Boolean);
    }
    return { session, questions };
  });

export const saveExamAnswers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        sessionId: z.string().uuid(),
        answers: z.record(z.string(), z.number().int().min(0).max(20)),
        flagged: z.array(z.string().uuid()).max(500),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("exam_sessions")
      .update({ answers: data.answers, flagged: data.flagged })
      .eq("id", data.sessionId)
      .eq("user_id", userId)
      .eq("status", "in_progress");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Points-per-question scoring (see plan-sistema-puntajes.md). The three point
// values are always parameters, never hardcoded here — they come from the
// specific exam/template's own points_correct/incorrect/empty config (or, for
// the rare exam_id-less session, the app-wide default config). This is the
// only formula in the codebase that turns a correct/incorrect/empty count
// into a score; the result is clamped to 0 (a student's score is never shown
// as negative, even though the raw formula can go below zero internally).
const FALLBACK_SCORING = { correct: 1, incorrect: -1, empty: 0 };

function computeExamScore(
  counts: { correct: number; incorrect: number; empty: number },
  points: { correct: number; incorrect: number; empty: number },
): number {
  const raw =
    counts.correct * points.correct +
    counts.incorrect * points.incorrect +
    counts.empty * points.empty;
  return Math.max(0, raw);
}

export const submitExamSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        sessionId: z.string().uuid(),
        answers: z.record(z.string(), z.number().int().min(0).max(20)).optional(),
        timeSpentMs: z
          .record(
            z.string(),
            z
              .number()
              .int()
              .min(0)
              .max(60 * 60 * 1000),
          )
          .optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: session, error } = await supabase
      .from("exam_sessions")
      .select("id, status, question_ids, answers, exam_id")
      .eq("id", data.sessionId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!session) throw new Error("Sesión no encontrada");
    if (session.status !== "in_progress") {
      return { score: session as any };
    }

    const finalAnswers: Record<string, number> = data.answers ?? (session.answers as any) ?? {};
    const ids: string[] = (session.question_ids ?? []) as any;

    const [{ data: exs }, examPoints] = await Promise.all([
      supabase.from("exercises").select("id, correct_choice").in("id", ids),
      (async () => {
        if (session.exam_id) {
          const { data: exam } = await supabase
            .from("exams")
            .select("points_correct, points_incorrect, points_empty")
            .eq("id", session.exam_id)
            .maybeSingle();
          if (exam) {
            return {
              correct: exam.points_correct,
              incorrect: exam.points_incorrect,
              empty: exam.points_empty,
            };
          }
        }
        return FALLBACK_SCORING;
      })(),
    ]);
    const correctMap = new Map((exs ?? []).map((e: any) => [e.id, e.correct_choice]));

    let correctCount = 0;
    let incorrectCount = 0;
    let emptyCount = 0;
    const attemptInserts = ids
      .map((id) => {
        const selected = finalAnswers[id];
        const correct = correctMap.get(id);
        const isCorrect = selected !== undefined && selected === correct;
        if (selected === undefined) emptyCount += 1;
        else if (isCorrect) correctCount += 1;
        else incorrectCount += 1;
        return {
          user_id: userId,
          exercise_id: id,
          selected_choice: selected ?? -1,
          is_correct: isCorrect,
          time_spent_ms: data.timeSpentMs?.[id] ?? 0,
          exam_session_id: session.id,
        };
      })
      .filter((a) => a.selected_choice >= 0);

    // Grading writes (attempts insert + the exam_sessions result columns) go
    // through the service-role client from here on: attempts' INSERT policy
    // and exam_sessions' grading columns are locked to service_role only (see
    // migration 20260725130000_lock_exam_grading_columns.sql) — the
    // authenticated client used above for reads can no longer write is_correct
    // or score/status directly, closing the RLS gap that let a student write
    // their own exam result via the browser console.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (attemptInserts.length) {
      await supabaseAdmin.from("attempts").insert(attemptInserts);
    }

    const total = ids.length;
    const maxScore = total * examPoints.correct;
    const score = computeExamScore(
      { correct: correctCount, incorrect: incorrectCount, empty: emptyCount },
      examPoints,
    );

    await supabaseAdmin
      .from("exam_sessions")
      .update({
        status: "graded",
        finished_at: new Date().toISOString(),
        answers: finalAnswers,
        score,
        total,
        correct_count: correctCount,
        incorrect_count: incorrectCount,
        empty_count: emptyCount,
        max_score: maxScore,
      })
      .eq("id", session.id);

    return { score, total, correctCount, incorrectCount, emptyCount, maxScore };
  });

export const listMyTemplateSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("exam_sessions")
      .select(
        "id, exam_id, status, started_at, finished_at, score, total, max_score, exam:exams(id, title, exam_type)",
      )
      .eq("user_id", userId)
      .in("status", ["submitted", "graded"])
      .not("exam_id", "is", null)
      .order("started_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []).filter((r: any) => r.exam?.exam_type === "template");
  });

export const getExamResult = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ sessionId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: session, error } = await supabase
      .from("exam_sessions")
      .select(
        "*, exam:exams(id, title, passing_score, points_correct, points_incorrect, points_empty)",
      )
      .eq("id", data.sessionId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!session) throw new Error("Sesión no encontrada");
    const ids: string[] = (session.question_ids ?? []) as any;
    // exs/sessionAttempts/avgRows are three independent reads (none depends
    // on another's result) — previously exs was awaited alone before the
    // other two, an extra round-trip for nothing.
    const [{ data: exs }, { data: sessionAttempts }, { data: avgRows }] = await Promise.all([
      supabase
        .from("exercises")
        .select(
          "id, statement_md, statement_image_path, choices, correct_choice, solution_md, expected_time_ms, topic:topics(name)",
        )
        .in("id", ids),
      supabase
        .from("attempts")
        .select("exercise_id, time_spent_ms")
        .eq("exam_session_id", data.sessionId),
      ids.length > 0
        ? supabase.rpc("get_exercise_avg_times", { _exercise_ids: ids })
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const byId = new Map((exs ?? []).map((e: any) => [e.id, e]));
    const timeByQuestion = new Map(
      (sessionAttempts ?? []).map((a: any) => [a.exercise_id, a.time_spent_ms]),
    );
    const avgByQuestion = new Map((avgRows ?? []).map((r: any) => [r.exercise_id, r.avg_time_ms]));

    const questions = ids
      .map((id) => {
        const base = byId.get(id);
        if (!base) return null;
        return {
          ...base,
          time_spent_ms: timeByQuestion.get(id) ?? null,
          avg_time_ms: base.expected_time_ms ?? avgByQuestion.get(id) ?? null,
        };
      })
      .filter(Boolean);
    return { session, questions };
  });
