import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { queryOptions } from "@tanstack/react-query";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function publicClient() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

// Public landing-page "reto del día" widget: one exercise picked deterministically
// per calendar day (see get_daily_exercise() in the DB), the same for every visitor.
// correct_choice is intentionally not included here — grading happens server-side
// in submitDailyExerciseAnswer so the answer isn't sitting in the initial payload.
export const getDailyExercise = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data, error } = await sb.rpc("get_daily_exercise");
  if (error) throw new Error(error.message);
  const row = data?.[0];
  if (!row) return null;
  return {
    exerciseId: row.exercise_id,
    statementMd: row.statement_md,
    choices: row.choices as string[],
    difficulty: row.difficulty,
    topicName: row.topic_name,
    totalAnswers: row.total_answers,
    correctAnswers: row.correct_answers,
  };
});

export const submitDailyExerciseAnswer = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ selectedChoice: z.number().int().min(0).max(9) }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: rows, error } = await sb.rpc("submit_daily_exercise_answer", {
      _selected_choice: data.selectedChoice,
    });
    if (error) throw new Error(error.message);
    const row = rows?.[0];
    if (!row) throw new Error("No hay ejercicio disponible hoy");
    return {
      exerciseId: row.exercise_id,
      isCorrect: row.is_correct,
      correctChoice: row.correct_choice,
      totalAnswers: row.total_answers,
      correctAnswers: row.correct_answers,
    };
  });

// Admin-only: forces a different deterministic pick (see reshuffle_daily_exercise
// in the DB — it bumps a seed so today's, and every future day's, hash-based
// selection changes) instead of waiting for the next calendar day.
export const reshuffleDailyExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.rpc("reshuffle_daily_exercise");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const dailyExerciseQO = queryOptions({
  queryKey: ["daily-exercise"],
  queryFn: () => getDailyExercise(),
});
