import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { ExerciseFilters } from "@/lib/exercise-practice";

/** Listing, counts and practice use the same database filters before pagination. */
export function filteredExercisesQuery(
  client: SupabaseClient<Database>,
  filters: ExerciseFilters,
  head = false,
) {
  const subtopic = filters.subtopicSlug ? "subtopics!inner(slug,name)" : "subtopics(slug,name)";
  const university = filters.universitySlug
    ? "universities!inner(slug,short_name)"
    : "universities(slug,short_name)";
  let query = client
    .from("exercises")
    .select(
      `id, statement_md, statement_image_path, difficulty, exam_year, tags, choices, correct_choice, topic:topics!inner(slug,name), subtopic:${subtopic}, university:${university}`,
      { count: "exact", head },
    );
  // PostgREST filters embedded relations by their aliases.
  if (filters.topicSlug) query = query.eq("topic.slug", filters.topicSlug);
  if (filters.subtopicSlug) query = query.eq("subtopic.slug", filters.subtopicSlug);
  if (filters.universitySlug) query = query.eq("university.slug", filters.universitySlug);
  if (filters.difficulty) query = query.eq("difficulty", filters.difficulty);
  if (filters.year) query = query.eq("exam_year", filters.year);
  return query;
}
