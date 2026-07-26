import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { assertPremium } from "@/lib/premium-guard";
import {
  rankSubtopics,
  reasonFor,
  isHighPriority,
  urgencyMultiplier,
  RECENTLY_SOLVED_DAYS,
  type SubtopicSignals,
} from "@/lib/recommendation-scoring";

const EXERCISE_SELECT =
  "id, statement_md, difficulty, exam_year, topic:topics(slug,name), subtopic:subtopics(slug,name), university:universities(slug,short_name)";

// Resuelve "la" universidad/carrera objetivo del estudiante — mismo patrón
// que panel.tsx/simulacros.index.tsx (universities[0], ya determinista tras
// el .order("created_at") agregado a getFullProfile). Reimplementado acá en
// vez de llamar getFullProfile porque un server function no debería invocar
// a otro server function directamente.
async function resolveTargetUniversity(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase
    .from("student_universities")
    .select("university_id, career_id, exam_date, university:universities(id, exam_date)")
    .eq("user_id", context.userId)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const examDate = data.exam_date ?? (data.university as any)?.exam_date ?? null;
  return {
    universityId: data.university_id as string,
    careerId: data.career_id as string | null,
    examDate: examDate as string | null,
  };
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const ms = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

// Best-effort: min_scores hoy exige match exacto (university_id, exam_id,
// career_id), así que esto suele devolver null — se omite sin bloquear el
// resto del cálculo cuando no hay match (ver plan §2, corrección sobre
// get_applicable_min_score, eliminada en una migración posterior).
async function resolveScoreGap(
  context: { supabase: any; userId: string },
  universityId: string,
  careerId: string | null,
): Promise<number | null> {
  if (!careerId) return null;
  const { data: lastSession } = await context.supabase
    .from("exam_sessions")
    .select("exam_id, score")
    .eq("user_id", context.userId)
    .eq("university_id", universityId)
    .eq("status", "graded")
    .not("score", "is", null)
    .order("finished_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!lastSession?.exam_id) return null;
  const { data: minRow } = await context.supabase
    .from("min_scores")
    .select("min_score")
    .eq("university_id", universityId)
    .eq("exam_id", lastSession.exam_id)
    .eq("career_id", careerId)
    .maybeSingle();
  if (!minRow?.min_score || minRow.min_score <= 0) return null;
  return Math.max(0, (minRow.min_score - lastSession.score) / minRow.min_score);
}

type SubtopicMeta = { id: string; slug: string; name: string; topicId: string };
type TopicMeta = { id: string; slug: string; name: string };

/**
 * Reúne las señales crudas necesarias para rankear subtemas: universo de
 * subtemas candidatos (intentados, frecuentes en la universidad objetivo, o
 * de un topic diagnosticado como débil) + las 4 fuentes de datos por señal.
 * Compartido por los 3 endpoints de abajo.
 */
async function gatherSignals(
  context: { supabase: any; userId: string },
  opts: { onlyTopicId?: string } = {},
) {
  const { supabase } = context;

  const [target, profileRes, myStatsRes, globalTimesRes, lowQualityRes] = await Promise.all([
    resolveTargetUniversity(context),
    supabase
      .from("profiles")
      .select("initial_weak_topic_ids")
      .eq("id", context.userId)
      .maybeSingle(),
    supabase.rpc("get_my_subtopic_stats"),
    supabase.rpc("get_subtopic_avg_times"),
    supabase.rpc("get_low_quality_exercise_ids"),
  ]);

  const initialWeakTopicIds: string[] = profileRes.data?.initial_weak_topic_ids ?? [];
  const myStats = (myStatsRes.data ?? []) as Array<{
    subtopic_id: string;
    topic_id: string;
    total: number;
    correct: number;
    accuracy: number;
    avg_time_ms: number | null;
    last_attempt_at: string | null;
  }>;
  const globalTimes = (globalTimesRes.data ?? []) as Array<{
    subtopic_id: string;
    avg_time_ms: number;
  }>;
  const lowQualityIds = new Set<string>(
    ((lowQualityRes.data ?? []) as Array<{ exercise_id: string }>).map((r) => r.exercise_id),
  );

  // Frecuencia en exámenes reales: una sola query agregada para toda la
  // universidad objetivo (en vez de una llamada por topic), últimos 10 años.
  const freqMap = new Map<string, number>();
  const freqByTopic: Record<string, number> = {};
  if (target) {
    const cutoffYear = new Date().getFullYear() - 9;
    const { data: freqRows } = await supabase
      .from("exercises")
      .select("subtopic_id, topic_id, exam_year")
      .eq("university_id", target.universityId)
      .not("exam_year", "is", null)
      .not("subtopic_id", "is", null)
      .gte("exam_year", cutoffYear);
    (freqRows ?? []).forEach((r: any) => {
      freqMap.set(r.subtopic_id, (freqMap.get(r.subtopic_id) ?? 0) + 1);
      freqByTopic[r.topic_id] = Math.max(freqByTopic[r.topic_id] ?? 0, freqMap.get(r.subtopic_id)!);
    });
  }

  // Universo de subtemas candidatos: intentados + frecuentes + diagnosticados,
  // acotado a un solo topic cuando el caller ya sabe cuál le interesa (evita
  // traer subtemas de topics irrelevantes para esa pantalla).
  const allCandidateTopicIds = new Set<string>([
    ...myStats.map((s) => s.topic_id),
    ...Object.keys(freqByTopic),
    ...initialWeakTopicIds,
  ]);
  const candidateTopicIds = opts.onlyTopicId
    ? new Set(allCandidateTopicIds.has(opts.onlyTopicId) ? [opts.onlyTopicId] : [])
    : allCandidateTopicIds;

  const { data: subtopicRows } =
    candidateTopicIds.size > 0
      ? await supabase
          .from("subtopics")
          .select("id, slug, name, topic_id, topic:topics(id, slug, name)")
          .in("topic_id", Array.from(candidateTopicIds))
      : { data: [] };

  const subtopics: SubtopicMeta[] = (subtopicRows ?? []).map((r: any) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    topicId: r.topic_id,
  }));
  const topicById = new Map<string, TopicMeta>(
    (subtopicRows ?? []).map((r: any) => [r.topic_id, r.topic as TopicMeta]),
  );

  const myStatsBySubtopic = new Map(myStats.map((s) => [s.subtopic_id, s]));
  const globalTimeBySubtopic = new Map(globalTimes.map((s) => [s.subtopic_id, s.avg_time_ms]));

  const signals: SubtopicSignals[] = subtopics.map((st) => {
    const mine = myStatsBySubtopic.get(st.id);
    return {
      subtopicId: st.id,
      subtopicName: st.name,
      topicId: st.topicId,
      topicName: topicById.get(st.topicId)?.name ?? "",
      frequencyCount: freqMap.get(st.id) ?? 0,
      maxFrequencyInTopic: freqByTopic[st.topicId] ?? 0,
      attempts: mine?.total ?? 0,
      correct: mine?.correct ?? 0,
      accuracy: mine ? mine.accuracy : null,
      lastAttemptAt: mine?.last_attempt_at ?? null,
      myAvgTimeMs: mine?.avg_time_ms ?? null,
      globalAvgTimeMs: globalTimeBySubtopic.get(st.id) ?? null,
      isDiagnosedWeak: initialWeakTopicIds.includes(st.topicId),
    };
  });

  return { target, signals, lowQualityIds };
}

async function urgencyFor(
  context: { supabase: any; userId: string },
  target: { universityId: string; careerId: string | null; examDate: string | null } | null,
) {
  if (!target) return 1;
  const gapPct = await resolveScoreGap(context, target.universityId, target.careerId);
  return urgencyMultiplier(daysUntil(target.examDate), gapPct);
}

export const getDailyRecommendations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPremium(context);
    const { target, signals, lowQualityIds } = await gatherSignals(context);
    if (signals.length === 0) return [];

    const urgency = await urgencyFor(context, target);
    const ranked = rankSubtopics(signals, urgency);

    const [recentRes, favRes] = await Promise.all([
      context.supabase
        .from("attempts")
        .select("exercise_id")
        .eq("user_id", context.userId)
        .gte("created_at", new Date(Date.now() - RECENTLY_SOLVED_DAYS * 86400000).toISOString()),
      context.supabase
        .from("favorite_exercises")
        .select("exercise_id")
        .eq("user_id", context.userId),
    ]);
    const recentlySolvedIds = new Set<string>(
      (recentRes.data ?? []).map((r: any) => r.exercise_id),
    );
    const favoriteIds = new Set<string>((favRes.data ?? []).map((r: any) => r.exercise_id));

    const count = 4;
    const picked: Array<{ exercise: any; reason: string }> = [];
    const usedSubtopics = new Set<string>();

    // Dos pasadas: primero respetando "no repetir lo resuelto hace poco"
    // (regla blanda), y si no alcanza a llenar `count`, una segunda pasada
    // relajando esa exclusión — la de baja calidad nunca se relaja.
    for (const relaxRecent of [false, true]) {
      if (picked.length >= count) break;
      for (const { signals: s } of ranked) {
        if (picked.length >= count) break;
        if (usedSubtopics.has(s.subtopicId)) continue;

        const { data: candidates } = await context.supabase
          .from("exercises")
          .select(EXERCISE_SELECT)
          .eq("subtopic_id", s.subtopicId)
          .limit(8);

        const pool = (candidates ?? []).filter((c: any) => {
          if (lowQualityIds.has(c.id)) return false;
          if (!relaxRecent && recentlySolvedIds.has(c.id)) return false;
          return true;
        });
        if (pool.length === 0) continue;

        const chosen = pool.find((c: any) => favoriteIds.has(c.id)) ?? pool[0];
        picked.push({ exercise: chosen, reason: reasonFor(s) });
        usedSubtopics.add(s.subtopicId);
      }
    }

    return picked;
  });

const subtopicPrioritiesInput = z.object({ topicSlug: z.string() });

export const getSubtopicPriorities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => subtopicPrioritiesInput.parse(d))
  .handler(async ({ context, data }) => {
    await assertPremium(context);
    const { data: topic } = await context.supabase
      .from("topics")
      .select("id")
      .eq("slug", data.topicSlug)
      .maybeSingle();
    if (!topic) return {};

    const { signals } = await gatherSignals(context, { onlyTopicId: topic.id });
    const result: Record<string, { score: number; isHighPriority: boolean; reason: string }> = {};
    for (const s of signals) {
      if (s.topicId !== topic.id) continue;
      result[s.subtopicId] = {
        score: 0,
        isHighPriority: isHighPriority(s),
        reason: reasonFor(s),
      };
    }
    return result;
  });

const postExamInput = z.object({ sessionId: z.string().uuid() });

export const getPostExamRecommendations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => postExamInput.parse(d))
  .handler(async ({ context, data }) => {
    await assertPremium(context);
    const { supabase, userId } = context;

    const { data: session } = await supabase
      .from("exam_sessions")
      .select("id")
      .eq("id", data.sessionId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!session) return [];

    const { data: sessionAttempts } = await supabase
      .from("attempts")
      .select("exercise_id, is_correct")
      .eq("exam_session_id", data.sessionId)
      .eq("user_id", userId);
    const wrongIds = (sessionAttempts ?? [])
      .filter((a: any) => !a.is_correct)
      .map((a: any) => a.exercise_id as string);
    if (wrongIds.length === 0) return [];

    const { data: wrongExercises } = await supabase
      .from("exercises")
      .select("subtopic_id, topic_id, subtopic:subtopics(slug)")
      .in("id", wrongIds)
      .not("subtopic_id", "is", null);
    const failedTopicIds = new Set((wrongExercises ?? []).map((e: any) => e.topic_id as string));
    if (failedTopicIds.size === 0) return [];
    const subtopicSlugById = new Map(
      (wrongExercises ?? []).map((e: any) => [e.subtopic_id as string, e.subtopic?.slug as string]),
    );

    // Rankea con las mismas señales de debilidad/antigüedad que el resto del
    // motor, pero acotado a los topics de lo que el estudiante acaba de
    // fallar — reactivo a este examen puntual, no proactivo como el dashboard.
    const results: Array<{
      subtopicId: string;
      subtopicSlug: string;
      topicSlug: string;
      reason: string;
      score: number;
    }> = [];
    for (const topicId of failedTopicIds) {
      const { signals } = await gatherSignals(context, { onlyTopicId: topicId });
      const failedSubtopicIds = new Set(
        (wrongExercises ?? [])
          .filter((e: any) => e.topic_id === topicId)
          .map((e: any) => e.subtopic_id as string),
      );
      const relevant = signals.filter((s) => failedSubtopicIds.has(s.subtopicId));
      const ranked = rankSubtopics(relevant, 1);
      if (ranked[0]) {
        const { data: topicRow } = await supabase
          .from("topics")
          .select("slug")
          .eq("id", topicId)
          .maybeSingle();
        results.push({
          subtopicId: ranked[0].signals.subtopicId,
          subtopicSlug: subtopicSlugById.get(ranked[0].signals.subtopicId) ?? "",
          topicSlug: topicRow?.slug ?? "",
          reason: reasonFor(ranked[0].signals),
          score: ranked[0].score,
        });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, 2);
  });
