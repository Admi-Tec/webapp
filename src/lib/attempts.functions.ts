import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertPremium } from "@/lib/premium-guard";
import { z } from "zod";

export interface TopicAccuracyRow {
  id: string;
  isCorrect: boolean;
  createdAt: string;
  topicId: string;
  topicSlug: string;
  topicName: string;
  subtopicId: string | null;
  subtopicName: string | null;
  contentType: "practice" | "template" | "standard";
}

export const recordAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        exerciseId: z.string().uuid(),
        selectedChoice: z.number().int().min(0).max(20),
        timeSpentMs: z
          .number()
          .int()
          .min(0)
          .max(60 * 60 * 1000)
          .default(0),
        examSessionId: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Read the exercise's correct_choice on server to avoid client tampering
    const { data: ex, error: exErr } = await supabase
      .from("exercises")
      .select("correct_choice")
      .eq("id", data.exerciseId)
      .maybeSingle();
    if (exErr || !ex) throw new Error("Ejercicio no encontrado");
    const isCorrect = ex.correct_choice === data.selectedChoice;
    // attempts' INSERT policy is locked to service_role (see migration
    // 20260725130000_lock_exam_grading_columns.sql) — is_correct is computed
    // above from the server's own read of correct_choice, never trusted from
    // the client, so this is the only place that can write it.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("attempts").insert({
      user_id: userId,
      exercise_id: data.exerciseId,
      selected_choice: data.selectedChoice,
      is_correct: isCorrect,
      time_spent_ms: data.timeSpentMs,
      exam_session_id: data.examSessionId ?? null,
    });
    if (error) throw new Error(error.message);
    return { isCorrect, correctChoice: ex.correct_choice };
  });

export const getUserStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: attempts } = await supabase
      .from("attempts")
      .select(
        "id, is_correct, created_at, exercise:exercises(id, statement_md, topic:topics(slug,name))",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200);
    const rows = attempts ?? [];
    const total = rows.length;
    const correct = rows.filter((r) => r.is_correct).length;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

    // by topic
    const byTopic = new Map<string, { name: string; total: number; correct: number }>();
    rows.forEach((r: any) => {
      const t = r.exercise?.topic;
      if (!t) return;
      const cur = byTopic.get(t.slug) ?? { name: t.name, total: 0, correct: 0 };
      cur.total += 1;
      if (r.is_correct) cur.correct += 1;
      byTopic.set(t.slug, cur);
    });
    const topicStats = Array.from(byTopic.entries()).map(([slug, v]) => ({
      slug,
      name: v.name,
      total: v.total,
      correct: v.correct,
      accuracy: Math.round((v.correct / v.total) * 100),
    }));

    // streak (consecutive days with at least 1 attempt)
    const days = new Set(rows.map((r) => new Date(r.created_at).toISOString().slice(0, 10)));
    let streak = 0;
    const d = new Date();
    while (days.has(d.toISOString().slice(0, 10))) {
      streak += 1;
      d.setDate(d.getDate() - 1);
    }
    if (streak === 0 && days.size > 0) {
      // include yesterday if today is empty
      const y = new Date();
      y.setDate(y.getDate() - 1);
      while (days.has(y.toISOString().slice(0, 10))) {
        streak += 1;
        y.setDate(y.getDate() - 1);
      }
    }

    const recent = rows.slice(0, 10).map((r: any) => ({
      id: r.id,
      isCorrect: r.is_correct,
      createdAt: r.created_at,
      exerciseId: r.exercise?.id ?? null,
      statement: (r.exercise?.statement_md ?? "").slice(0, 120),
      topicName: r.exercise?.topic?.name ?? "—",
    }));

    return { total, correct, accuracy, streak, topicStats, recent };
  });

// Chart "Aciertos por curso" mejorado (ver plan-mejoras-chart-aciertos-curso.md):
// a diferencia de getUserStats (tope de 200 intentos, sin subtema ni tipo de
// contenido), esto trae todo el historial reciente con lo necesario para los
// filtros de rango de fecha / tipo de contenido / drill-down a subtema, más
// el promedio cross-user para la línea de comparación. Es la versión Premium
// del chart, así que exige assertPremium — sin esto, un usuario Gratuito
// podría llamar la función directamente y recibir el detalle igual.
export const getTopicAccuracyDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPremium(context);
    const { supabase, userId } = context;
    const [{ data: attempts, error }, { data: topicAvg }, { data: subtopicAvg }] =
      await Promise.all([
        supabase
          .from("attempts")
          .select(
            "id, is_correct, created_at, exam_session_id, exercise:exercises(topic:topics(id,slug,name), subtopic:subtopics(id,name))",
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(5000),
        supabase.rpc("get_topic_avg_accuracy"),
        supabase.rpc("get_subtopic_avg_accuracy"),
      ]);
    if (error) throw new Error(error.message);

    // attempts.exam_session_id no tiene foreign key (a propósito, ver
    // deleteExamSession) — PostgREST no puede resolver un embed anidado
    // exam_session:exam_sessions(...) sin una FK real, así que el tipo de
    // contenido se resuelve con una segunda consulta y un join en TS en vez
    // de un select anidado.
    const sessionIds = Array.from(
      new Set((attempts ?? []).map((a: any) => a.exam_session_id).filter(Boolean)),
    ) as string[];
    const examTypeBySession = new Map<string, "standard" | "template">();
    if (sessionIds.length > 0) {
      const { data: sessions } = await supabase
        .from("exam_sessions")
        .select("id, exam:exams(exam_type)")
        .in("id", sessionIds);
      (sessions ?? []).forEach((s: any) => {
        examTypeBySession.set(s.id, s.exam?.exam_type === "template" ? "template" : "standard");
      });
    }

    const rows = (attempts ?? [])
      .filter((r: any) => r.exercise?.topic)
      .map((r: any) => ({
        id: r.id as string,
        isCorrect: r.is_correct as boolean,
        createdAt: r.created_at as string,
        topicId: r.exercise.topic.id as string,
        topicSlug: r.exercise.topic.slug as string,
        topicName: r.exercise.topic.name as string,
        subtopicId: (r.exercise.subtopic?.id ?? null) as string | null,
        subtopicName: (r.exercise.subtopic?.name ?? null) as string | null,
        // Sin exam_session_id = práctica libre. Con exam_session_id pero sin
        // fila encontrada (huérfano, no debería pasar) se trata como
        // simulacro: la aproximación más cercana a "generado al azar".
        contentType: (!r.exam_session_id
          ? "practice"
          : (examTypeBySession.get(r.exam_session_id) ?? "template")) as
          | "practice"
          | "template"
          | "standard",
      }));

    const topicAvgAccuracy: Record<string, number> = {};
    (topicAvg ?? []).forEach((r: any) => {
      topicAvgAccuracy[r.topic_id] = Math.round(Number(r.accuracy) * 100);
    });
    const subtopicAvgAccuracy: Record<string, number> = {};
    (subtopicAvg ?? []).forEach((r: any) => {
      subtopicAvgAccuracy[r.subtopic_id] = Math.round(Number(r.accuracy) * 100);
    });

    return { rows, topicAvgAccuracy, subtopicAvgAccuracy };
  });

// Frecuencia histórica de cada tema/subtema en los exámenes reales de una
// universidad (mismo cálculo que gatherSignals en recommendations.functions.ts,
// reimplementado aquí porque alimenta un uso distinto: ordenar/filtrar el
// chart de aciertos, no puntuar recomendaciones). Últimos 10 años, igual que
// el motor de recomendaciones.
export const getTopicFrequencyByUniversity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ universityId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertPremium(context);
    const { supabase } = context;
    const cutoffYear = new Date().getFullYear() - 9;
    const { data: rows, error } = await supabase
      .from("exercises")
      .select("topic_id, subtopic_id, exam_year")
      .eq("university_id", data.universityId)
      .not("exam_year", "is", null)
      .gte("exam_year", cutoffYear);
    if (error) throw new Error(error.message);

    const topicFrequency: Record<string, number> = {};
    const subtopicFrequency: Record<string, number> = {};
    (rows ?? []).forEach((r: any) => {
      if (r.topic_id) topicFrequency[r.topic_id] = (topicFrequency[r.topic_id] ?? 0) + 1;
      if (r.subtopic_id)
        subtopicFrequency[r.subtopic_id] = (subtopicFrequency[r.subtopic_id] ?? 0) + 1;
    });
    return { topicFrequency, subtopicFrequency };
  });
