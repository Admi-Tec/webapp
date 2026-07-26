import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getFullProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: profile, error: pErr }, { data: unis, error: uErr }] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, full_name, avatar_url, target_university, pseudonym, career, leaderboard_opt_in, weekly_goal_questions, weekly_goal_exams, onboarding_completed, prep_time, prep_method, weekly_study_hours, initial_weak_topic_ids",
        )
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("student_universities")
        .select(
          "id, university_id, exam_date, career_id, university:universities(id, slug, short_name, name, exam_date)",
        )
        .eq("user_id", userId)
        // Sin esto el orden de retorno no está garantizado (depende del orden
        // físico de Postgres) — varios consumidores (panel, simulacros, y
        // ahora el motor de recomendaciones) tratan universities[0] como "la"
        // universidad objetivo del estudiante, así que necesita ser estable.
        .order("created_at"),
    ]);
    if (pErr) throw new Error(pErr.message);
    if (uErr) throw new Error(uErr.message);
    return { profile, universities: unis ?? [] };
  });

export const listAllUniversities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("universities")
      .select("id, slug, short_name, name, active")
      .order("short_name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// Blocked words for pseudonyms: covers common Spanish/English vulgarity and slurs.
// Checked server-side (in addition to the format regex) so it can't be bypassed from the client.
const PSEUDONYM_BLOCKLIST = [
  "puta",
  "puto",
  "putita",
  "putito",
  "mierda",
  "pendejo",
  "pendeja",
  "cabron",
  "cabrona",
  "verga",
  "chinga",
  "chingar",
  "carajo",
  "culero",
  "culera",
  "maricon",
  "marica",
  "gilipollas",
  "hijueputa",
  "hdp",
  "conchatumadre",
  "conchasumadre",
  "conchesumadre",
  "huevon",
  "huevona",
  "malparido",
  "malparida",
  "estupido",
  "estupida",
  "idiota",
  "imbecil",
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "bastard",
  "whore",
  "slut",
  "cunt",
  "nigger",
  "faggot",
  "nazi",
  "hitler",
];

function containsBlockedWord(value: string): boolean {
  const normalized = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
  return PSEUDONYM_BLOCKLIST.some((word) => normalized.includes(word));
}

export const PREP_TIME_VALUES = [
  "recien_empiezo",
  "menos_3_meses",
  "3_a_6_meses",
  "mas_6_meses",
] as const;
export const PREP_METHOD_VALUES = [
  "academia",
  "autodidacta",
  "colegio_particular",
  "primera_vez",
] as const;

// Treats "" the same as an omitted/null value: these fields are surfaced as optional
// selects in the UI, and clients (older bundles, form libraries, etc.) sometimes send
// "" rather than null for "not answered" — reject the request only for actually-invalid values.
const nullableOnEmpty = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === "" ? null : v), schema);

const updateSchema = z.object({
  fullName: z.string().trim().max(120).optional(),
  pseudonym: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_\-]+$/)
    .nullable()
    .optional(),
  career: z.string().trim().max(120).nullable().optional(),
  leaderboardOptIn: z.boolean().optional(),
  weeklyGoalQuestions: z.number().int().min(1).max(1000).optional(),
  weeklyGoalExams: z.number().int().min(0).max(50).optional(),
  prepTime: nullableOnEmpty(z.enum(PREP_TIME_VALUES).nullable().optional()),
  prepMethod: nullableOnEmpty(z.enum(PREP_METHOD_VALUES).nullable().optional()),
  weeklyStudyHours: nullableOnEmpty(z.number().int().min(0).max(168).nullable().optional()),
  initialWeakTopicIds: z.array(z.string().uuid()).max(20).nullable().optional(),
  onboardingCompleted: z.boolean().optional(),
  universities: z
    .array(
      z.object({
        universityId: z.string().uuid(),
        examDate: z.string().nullable().optional(),
        careerId: z.string().uuid().nullable().optional(),
      }),
    )
    .max(10)
    .optional(),
});

export const updateFullProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => updateSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    if (data.pseudonym && containsBlockedWord(data.pseudonym)) {
      throw new Error(
        "Ese pseudónimo no está permitido. Elige otro que no contenga lenguaje ofensivo.",
      );
    }

    // Check pseudonym uniqueness (case-insensitive)
    if (data.pseudonym) {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .ilike("pseudonym", data.pseudonym)
        .neq("id", userId)
        .maybeSingle();
      if (existing) throw new Error("Ese pseudónimo ya está en uso. Elige otro.");
    }

    const patch: {
      id: string;
      full_name?: string;
      pseudonym?: string | null;
      career?: string | null;
      leaderboard_opt_in?: boolean;
      weekly_goal_questions?: number;
      weekly_goal_exams?: number;
      prep_time?: string | null;
      prep_method?: string | null;
      weekly_study_hours?: number | null;
      initial_weak_topic_ids?: string[] | null;
      onboarding_completed?: boolean;
      onboarding_completed_at?: string;
    } = { id: userId };
    if (data.fullName !== undefined) patch.full_name = data.fullName;
    if (data.pseudonym !== undefined) patch.pseudonym = data.pseudonym;
    if (data.career !== undefined) patch.career = data.career;
    if (data.leaderboardOptIn !== undefined) patch.leaderboard_opt_in = data.leaderboardOptIn;
    if (data.weeklyGoalQuestions !== undefined)
      patch.weekly_goal_questions = data.weeklyGoalQuestions;
    if (data.weeklyGoalExams !== undefined) patch.weekly_goal_exams = data.weeklyGoalExams;
    if (data.prepTime !== undefined) patch.prep_time = data.prepTime;
    if (data.prepMethod !== undefined) patch.prep_method = data.prepMethod;
    if (data.weeklyStudyHours !== undefined) patch.weekly_study_hours = data.weeklyStudyHours;
    if (data.initialWeakTopicIds !== undefined)
      patch.initial_weak_topic_ids = data.initialWeakTopicIds;
    if (data.onboardingCompleted) {
      patch.onboarding_completed = true;
      patch.onboarding_completed_at = new Date().toISOString();
    }

    // Upsert instead of a plain update: accounts whose `profiles` row was never
    // created by the normal signup trigger (e.g. an admin granted the role by
    // email rather than through signup) would otherwise match zero rows on
    // UPDATE and silently fail to save.
    const { error: profileErr } = await supabase
      .from("profiles")
      .upsert(patch, { onConflict: "id" });
    if (profileErr) throw new Error(profileErr.message);

    if (data.universities) {
      // Replace strategy: delete then insert. Must check the delete's error —
      // a silent failure here followed by a successful insert would leave
      // stale rows alongside the new ones (duplicate universities in the UI).
      const { error: delErr } = await supabase
        .from("student_universities")
        .delete()
        .eq("user_id", userId);
      if (delErr) throw new Error(delErr.message);
      if (data.universities.length > 0) {
        const rows = data.universities.map((u) => ({
          user_id: userId,
          university_id: u.universityId,
          exam_date: u.examDate || null,
          career_id: u.careerId || null,
        }));
        const { error } = await supabase.from("student_universities").insert(rows);
        if (error) throw new Error(error.message);
      }
    }

    return { ok: true };
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
