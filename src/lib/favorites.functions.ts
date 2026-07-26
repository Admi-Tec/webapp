import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const toggleFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ exerciseId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("favorite_exercises")
      .select("id")
      .eq("user_id", userId)
      .eq("exercise_id", data.exerciseId)
      .maybeSingle();
    if (existing) {
      const { error } = await supabase.from("favorite_exercises").delete().eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { favorited: false };
    }
    const { error } = await supabase
      .from("favorite_exercises")
      .insert({ user_id: userId, exercise_id: data.exerciseId });
    if (error) throw new Error(error.message);
    return { favorited: true };
  });

export const listMyFavorites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("favorite_exercises")
      .select(
        "id, created_at, exercise:exercises(id, statement_md, difficulty, exam_year, topic:topics(slug,name), university:universities(slug,short_name))",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listMyFavoriteIds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("favorite_exercises")
      .select("exercise_id")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => r.exercise_id as string);
  });
