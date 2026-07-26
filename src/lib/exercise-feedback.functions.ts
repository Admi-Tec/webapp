import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getMyExerciseRating = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ exerciseId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("exercise_ratings")
      .select("stars")
      .eq("user_id", userId)
      .eq("exercise_id", data.exerciseId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { stars: row?.stars ?? null };
  });

// One rating per student per exercise — rating again updates the existing
// row instead of accumulating a new one.
export const rateExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ exerciseId: z.string().uuid(), stars: z.number().int().min(1).max(5) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("exercise_ratings")
      .select("id")
      .eq("user_id", userId)
      .eq("exercise_id", data.exerciseId)
      .maybeSingle();
    if (existing) {
      const { data: rows, error } = await supabase
        .from("exercise_ratings")
        .update({ stars: data.stars, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select("id");
      if (error) throw new Error(error.message);
      if (!rows || rows.length === 0) throw new Error("No se pudo guardar tu calificación.");
    } else {
      const { error } = await supabase
        .from("exercise_ratings")
        .insert({ user_id: userId, exercise_id: data.exerciseId, stars: data.stars });
      if (error) throw new Error(error.message);
    }
    return { stars: data.stars };
  });

const reportReasons = [
  "respuesta_incorrecta",
  "enunciado_confuso",
  "falta_informacion",
  "imagen_problema",
  "otro",
] as const;

const reportInput = z
  .object({
    exerciseId: z.string().uuid(),
    reason: z.enum(reportReasons),
    note: z.string().trim().max(500).optional(),
  })
  .refine((d) => d.reason !== "otro" || !!d.note?.length, {
    message: "Cuéntanos brevemente cuál es el problema.",
    path: ["note"],
  });

// A student can report the same exercise more than once over time, but not
// while a prior report on it is still "pendiente" — once that one is
// resuelto/descartado, a new report is allowed again.
export const reportExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => reportInput.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: pending, error: pendingErr } = await supabase
      .from("exercise_reports")
      .select("id")
      .eq("user_id", userId)
      .eq("exercise_id", data.exerciseId)
      .eq("status", "pendiente")
      .maybeSingle();
    if (pendingErr) throw new Error(pendingErr.message);
    if (pending) {
      throw new Error("Ya reportaste un problema en este ejercicio, está pendiente de revisión.");
    }
    const { error } = await supabase.from("exercise_reports").insert({
      user_id: userId,
      exercise_id: data.exerciseId,
      reason: data.reason,
      note: data.note?.trim() || null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
