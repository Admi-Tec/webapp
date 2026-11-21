import { z } from "zod";

export const exerciseFiltersSchema = z.object({
  topicSlug: z.string().optional(),
  subtopicSlug: z.string().optional(),
  universitySlug: z.string().optional(),
  difficulty: z.enum(["facil", "medio", "dificil"]).optional(),
  year: z.number().int().optional(),
});

export type ExerciseFilters = z.infer<typeof exerciseFiltersSchema>;

export const PRACTICE_BATCH_SIZE = 5;

export const exerciseListSearchSchema = z.object({
  subtopic: z.string().catch("all").default("all"),
  difficulty: z.enum(["all", "facil", "medio", "dificil"]).catch("all").default("all"),
  university: z.string().catch("all").default("all"),
});

export type ExerciseListSearch = z.infer<typeof exerciseListSearchSchema>;

export function exerciseListFilters(
  topicSlug: string,
  search: ExerciseListSearch,
): ExerciseFilters {
  return {
    topicSlug,
    subtopicSlug: search.subtopic === "all" ? undefined : search.subtopic,
    difficulty: search.difficulty === "all" ? undefined : search.difficulty,
    universitySlug: search.university === "all" ? undefined : search.university,
  };
}

export const exercisePracticeSearchSchema = exerciseListSearchSchema.extend({
  practice: z
    .array(z.string().uuid())
    .min(1)
    .max(PRACTICE_BATCH_SIZE)
    .refine((ids) => new Set(ids).size === ids.length)
    .optional()
    .catch(undefined),
  course: z.string().optional(),
});

/** Sample distinct positions across the entire matching result set, including unloaded pages. */
export function sampleExercisePositions(total: number, random = Math.random): number[] {
  const size = Math.min(PRACTICE_BATCH_SIZE, Math.max(0, total));
  const positions = new Set<number>();
  // Floyd's algorithm uses exactly `size` random draws, even when fewer than five match.
  for (let i = total - size; i < total; i++) {
    const position = Math.floor(random() * (i + 1));
    positions.add(positions.has(position) ? i : position);
  }
  // Shuffle the selected positions so a short batch doesn't follow catalog order.
  const result = [...positions];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
