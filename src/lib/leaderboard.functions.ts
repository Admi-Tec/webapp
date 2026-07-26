import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getExamLeaderboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({ examId: z.string().uuid(), limit: z.number().int().min(1).max(500).default(100) })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase.rpc("get_exam_leaderboard", {
      _exam_id: data.examId,
      _limit: data.limit,
    });
    if (error) throw new Error(error.message);
    return (rows ?? []) as Array<{
      user_id: string;
      pseudonym: string;
      best_score: number;
      max_score: number;
      attempts_count: number;
      rank: number;
      total_count: number;
      is_me: boolean;
    }>;
  });

export const listPublishedExamsForRanking = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("exams")
      .select("id, title, university:universities(id, short_name)")
      .eq("status", "published")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// Optional benchmark ("puntaje mínimo de ingreso") set by an admin for one
// exact (university, exam, career) combination — most students resolve to
// none, in which case the ranking page shows a "no hay mínimo registrado"
// message instead of a number. Resolves the caller's own university/career
// context for this exam server-side (via their `student_universities` link)
// so the client only ever passes an examId.
export const getExamMinScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ examId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: exam } = await context.supabase
      .from("exams")
      .select("university_id")
      .eq("id", data.examId)
      .maybeSingle();
    const universityId = exam?.university_id ?? null;
    if (!universityId) return { minScore: null, careerName: null };

    const { data: su } = await context.supabase
      .from("student_universities")
      .select("career_id, career:careers(name)")
      .eq("user_id", context.userId)
      .eq("university_id", universityId)
      .maybeSingle();
    const careerId = su?.career_id ?? null;
    const careerName = (su?.career as any)?.name ?? null;
    if (!careerId) return { minScore: null, careerName: null };

    const { data: row, error } = await context.supabase
      .from("min_scores")
      .select("min_score")
      .eq("university_id", universityId)
      .eq("exam_id", data.examId)
      .eq("career_id", careerId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { minScore: row?.min_score ?? null, careerName };
  });
