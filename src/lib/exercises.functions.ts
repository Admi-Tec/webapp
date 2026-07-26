import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";
import { EXERCISE_IMAGES_BUCKET } from "@/lib/storage";

function publicClient() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

export const listTopics = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data, error } = await sb
    .from("topics")
    .select("id, slug, name, description, icon, order, color")
    .eq("active", true)
    .order("order");
  if (error) throw new Error(error.message);
  // GROUP BY in Postgres (see get_exercise_counts_by_topic) instead of
  // pulling every exercise row's topic_id over the wire just to tally them
  // in JS — this loader runs on the public homepage on every visit.
  const { data: counts, error: countsError } = await sb.rpc("get_exercise_counts_by_topic");
  if (countsError) throw new Error(countsError.message);
  const map = new Map<string, number>();
  (counts ?? []).forEach((r) => map.set(r.topic_id, r.exercise_count));
  return (data ?? []).map((t) => ({ ...t, exerciseCount: map.get(t.id) ?? 0 }));
});

export const listUniversities = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data, error } = await sb
    .from("universities")
    .select("id, slug, name, short_name, description, logo_path")
    .eq("active", true)
    .order("short_name");
  if (error) throw new Error(error.message);
  // Same fix as listTopics above: GROUP BY in Postgres instead of a
  // full-table row transfer for a per-university tally.
  const { data: counts, error: countsError } = await sb.rpc("get_exercise_counts_by_university");
  if (countsError) throw new Error(countsError.message);
  const map = new Map<string, number>();
  (counts ?? []).forEach((r) => {
    if (r.university_id) map.set(r.university_id, r.exercise_count);
  });

  // getPublicUrl is a local string builder (no network call, no expiring
  // token) — the bucket is public and its RLS already grants anon read on
  // every object, so a signed URL bought no extra protection here, just a
  // URL that changes (and can't be cached by the browser) on every request.
  return (data ?? []).map((u) => ({
    ...u,
    exerciseCount: map.get(u.id) ?? 0,
    logoUrl: u.logo_path
      ? sb.storage.from(EXERCISE_IMAGES_BUCKET).getPublicUrl(u.logo_path).data.publicUrl
      : null,
  }));
});

const topicInput = z.object({ slug: z.string() });

export const getTopicBySlug = createServerFn({ method: "GET" })
  .inputValidator((d) => topicInput.parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: topic, error } = await sb
      .from("topics")
      .select("id, slug, name, description, icon")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!topic) return null;
    const { data: subtopics } = await sb
      .from("subtopics")
      .select("id, slug, name, order")
      .eq("topic_id", topic.id)
      .order("order");
    return { ...topic, subtopics: subtopics ?? [] };
  });

const subtopicFreqInput = z.object({
  topicSlug: z.string(),
  universityId: z.string().uuid(),
  yearsBack: z.number().int().min(1).max(50).default(10),
});

export const getSubtopicFrequency = createServerFn({ method: "GET" })
  .inputValidator((d) => subtopicFreqInput.parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const cutoffYear = new Date().getFullYear() - data.yearsBack + 1;
    const { data: rows, error } = await sb
      .from("exercises")
      .select("subtopic_id, exam_year, topic:topics!inner(slug)")
      .eq("topics.slug", data.topicSlug)
      .eq("university_id", data.universityId)
      .not("exam_year", "is", null)
      .gte("exam_year", cutoffYear);
    if (error) throw new Error(error.message);
    const map = new Map<string, number>();
    (rows ?? []).forEach((r) => {
      if (r.subtopic_id) map.set(r.subtopic_id, (map.get(r.subtopic_id) ?? 0) + 1);
    });
    return Object.fromEntries(map);
  });

const exFilters = z.object({
  topicSlug: z.string().optional(),
  subtopicSlug: z.string().optional(),
  universitySlug: z.string().optional(),
  difficulty: z.enum(["facil", "medio", "dificil"]).optional(),
  year: z.number().int().optional(),
  limit: z.number().int().min(1).max(200).default(50),
});

export const listExercises = createServerFn({ method: "GET" })
  .inputValidator((d) => exFilters.parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    // Force an inner join on subtopics only when filtering by it, so `.eq("subtopics.slug", ...)`
    // takes effect — otherwise leave it a left join so exercises without a subtopic still show up.
    const subtopicEmbed = data.subtopicSlug ? "subtopics!inner(slug,name)" : "subtopics(slug,name)";
    let q = sb
      .from("exercises")
      .select(
        `id, statement_md, statement_image_path, difficulty, exam_year, tags, choices, correct_choice, topic:topics!inner(slug,name), subtopic:${subtopicEmbed}, university:universities(slug,short_name)`,
      )
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.topicSlug) q = q.eq("topics.slug", data.topicSlug);
    if (data.subtopicSlug) q = q.eq("subtopics.slug", data.subtopicSlug);
    if (data.difficulty) q = q.eq("difficulty", data.difficulty);
    if (data.year) q = q.eq("exam_year", data.year);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    let result = rows ?? [];
    if (data.universitySlug) {
      result = result.filter((r: any) => r.university?.slug === data.universitySlug);
    }
    return result;
  });

const exercisesPageInput = z.object({
  topicSlug: z.string().optional(),
  subtopicSlug: z.string().optional(),
  difficulty: z.enum(["facil", "medio", "dificil"]).optional(),
  year: z.number().int().optional(),
  page: z.number().int().min(0).default(0),
  pageSize: z.number().int().min(1).max(50).default(20),
});

/**
 * Paginated sibling of listExercises, for infinite-scroll lists (temas/$slug,
 * temas/$slug/$subtopic) — a separate function rather than adding pagination
 * to listExercises itself, since that one's plain-array return is also relied
 * on by practica.$topicSlug and ejercicio.$id, which want the whole set, not
 * a page of it.
 */
export const listExercisesPage = createServerFn({ method: "GET" })
  .inputValidator((d) => exercisesPageInput.parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const subtopicEmbed = data.subtopicSlug ? "subtopics!inner(slug,name)" : "subtopics(slug,name)";
    const from = data.page * data.pageSize;
    const to = from + data.pageSize - 1;
    let q = sb
      .from("exercises")
      .select(
        `id, statement_md, statement_image_path, difficulty, exam_year, tags, choices, correct_choice, topic:topics!inner(slug,name), subtopic:${subtopicEmbed}, university:universities(slug,short_name)`,
      )
      .order("created_at", { ascending: false })
      .range(from, to);
    if (data.topicSlug) q = q.eq("topics.slug", data.topicSlug);
    if (data.subtopicSlug) q = q.eq("subtopics.slug", data.subtopicSlug);
    if (data.difficulty) q = q.eq("difficulty", data.difficulty);
    if (data.year) q = q.eq("exam_year", data.year);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const items = rows ?? [];
    // Cheap end-of-list heuristic (no separate COUNT query): a page shorter
    // than pageSize can only happen at the end. A page that happens to land
    // exactly on a multiple of pageSize costs one extra empty fetch — it
    // self-corrects immediately, cheaper than a COUNT on every page.
    return { items, hasMore: items.length === data.pageSize };
  });

export const getExercise = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: ex, error } = await sb
      .from("exercises")
      .select(
        "id, statement_md, statement_image_path, choices, correct_choice, solution_md, difficulty, exam_year, tags, topic:topics(slug,name), subtopic:subtopics(slug,name), university:universities(slug,short_name,name)",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return ex;
  });

export const searchExercises = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ q: z.string().min(1).max(20) }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const term = `%${data.q.replace(/[%_]/g, "")}%`;
    const { data: rows, error } = await sb
      .from("exercises")
      .select(
        "id, statement_md, difficulty, exam_year, topic:topics(slug,name), university:universities(slug,short_name)",
      )
      .ilike("statement_md", term)
      .limit(50);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getUniversityBySlug = createServerFn({ method: "GET" })
  .inputValidator((d) => topicInput.parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: u, error } = await sb
      .from("universities")
      .select("id, slug, name, short_name, description")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return u;
  });
