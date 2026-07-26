import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

function startOfIsoWeek(d: Date) {
  const date = new Date(d);
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day; // ISO Monday
  date.setUTCDate(date.getUTCDate() + diff);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

export const getWeeklyProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const start = startOfIsoWeek(new Date()).toISOString();

    const [{ data: profile }, attemptsRes, sessionsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("weekly_goal_questions, weekly_goal_exams")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("attempts")
        .select("id", { head: true, count: "exact" })
        .eq("user_id", userId)
        .gte("created_at", start),
      supabase
        .from("exam_sessions")
        .select("id", { head: true, count: "exact" })
        .eq("user_id", userId)
        .in("status", ["submitted", "graded"])
        .gte("finished_at", start),
    ]);

    return {
      questionsGoal: profile?.weekly_goal_questions ?? 50,
      questionsDone: attemptsRes.count ?? 0,
      examsGoal: profile?.weekly_goal_exams ?? 2,
      examsDone: sessionsRes.count ?? 0,
      weekStart: start,
    };
  });

export const getExamStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        examId: z.string().uuid(),
        myScorePct: z.number().min(0).max(100).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase.rpc("get_exam_stats", {
      _exam_id: data.examId,
      _my_score_pct: data.myScorePct ?? undefined,
    });

    if (error) throw new Error(error.message);
    const first = Array.isArray(rows) ? rows[0] : rows;
    return first ?? { avg_score: null, sessions_count: 0, my_percentile: null };
  });
