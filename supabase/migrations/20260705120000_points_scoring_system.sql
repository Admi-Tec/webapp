-- Points-per-question scoring system (see plan-sistema-puntajes.md). Replaces
-- the percentage-based score entirely: exam_sessions.score now holds a raw,
-- clamped-to-0 points total computed from each exam/template's own
-- points_correct/points_incorrect/points_empty configuration, never a
-- hardcoded formula.

-- 1. App-wide suggested defaults (admin-editable "Configuración general").
-- Only ever prefills new exams/templates at creation time; never retroactive.
CREATE TABLE IF NOT EXISTS public.app_settings (
  id boolean PRIMARY KEY DEFAULT true,
  default_points_correct numeric NOT NULL DEFAULT 20,
  default_points_incorrect numeric NOT NULL DEFAULT -2,
  default_points_empty numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_settings_singleton CHECK (id)
);
INSERT INTO public.app_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

GRANT SELECT, UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_settings admin read" ON public.app_settings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "app_settings admin update" ON public.app_settings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Per-exam/template scoring config. Existing exams get the suggested
-- defaults as their own saved config (a NOT NULL column needs a value on
-- backfill) — from here on, editing the global defaults above does not touch
-- these already-saved per-exam values.
ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS points_correct numeric NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS points_incorrect numeric NOT NULL DEFAULT -2,
  ADD COLUMN IF NOT EXISTS points_empty numeric NOT NULL DEFAULT 0;

-- 3. Snapshot the breakdown + max possible score at grading time, so a later
-- admin edit to an exam's points config (or a later exercise edit) never
-- silently rewrites a student's already-graded result.
ALTER TABLE public.exam_sessions
  ADD COLUMN IF NOT EXISTS correct_count integer,
  ADD COLUMN IF NOT EXISTS incorrect_count integer,
  ADD COLUMN IF NOT EXISTS empty_count integer,
  ADD COLUMN IF NOT EXISTS max_score numeric;

-- 4. Ranking must never mix different exams' point scales (plan §5): the
-- per-exam leaderboard keeps comparing raw points (valid — same exam, same
-- config for everyone in it) and now also reports max_score for context. The
-- cross-exam "university" leaderboard can no longer average raw points
-- meaningfully across exams with different configs, so it's repurposed to
-- average accuracy (% correct) instead — a scale-independent measure that
-- stays comparable across different exams.
-- (Both functions' RETURN TABLE columns changed, and CREATE OR REPLACE cannot
-- alter a function's output row type — drop first.)
DROP FUNCTION IF EXISTS public.get_university_leaderboard(uuid, int);
DROP FUNCTION IF EXISTS public.get_exam_leaderboard(uuid, int);

CREATE OR REPLACE FUNCTION public.get_university_leaderboard(_university_id uuid, _limit int DEFAULT 100)
RETURNS TABLE (
  user_id uuid,
  pseudonym text,
  avg_accuracy numeric,
  sessions_count bigint,
  is_me boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p.id AS user_id,
    p.pseudonym,
    ROUND(AVG(s.correct_count::numeric / NULLIF(s.total, 0) * 100), 1) AS avg_accuracy,
    COUNT(*)::bigint AS sessions_count,
    (p.id = auth.uid()) AS is_me
  FROM public.exam_sessions s
  JOIN public.exams e ON e.id = s.exam_id
  JOIN public.profiles p ON p.id = s.user_id
  WHERE e.university_id = _university_id
    AND s.status IN ('submitted','graded')
    AND s.correct_count IS NOT NULL AND s.total IS NOT NULL AND s.total > 0
    AND p.leaderboard_opt_in = true
    AND p.pseudonym IS NOT NULL
  GROUP BY p.id, p.pseudonym
  ORDER BY avg_accuracy DESC NULLS LAST
  LIMIT _limit;
$$;

CREATE OR REPLACE FUNCTION public.get_exam_leaderboard(_exam_id uuid, _limit int DEFAULT 100)
RETURNS TABLE (
  user_id uuid,
  pseudonym text,
  best_score numeric,
  max_score numeric,
  attempts_count bigint,
  is_me boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p.id AS user_id,
    p.pseudonym,
    MAX(s.score::numeric) AS best_score,
    MAX(s.max_score::numeric) AS max_score,
    COUNT(*)::bigint AS attempts_count,
    (p.id = auth.uid()) AS is_me
  FROM public.exam_sessions s
  JOIN public.profiles p ON p.id = s.user_id
  WHERE s.exam_id = _exam_id
    AND s.status IN ('submitted','graded')
    AND s.score IS NOT NULL AND s.total IS NOT NULL AND s.total > 0
    AND p.leaderboard_opt_in = true
    AND p.pseudonym IS NOT NULL
  GROUP BY p.id, p.pseudonym
  ORDER BY best_score DESC NULLS LAST
  LIMIT _limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_university_leaderboard(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_exam_leaderboard(uuid, int) TO authenticated;

-- get_exam_stats is intentionally left unchanged: it compares raw `score`
-- values within a single exam (_exam_id), which stays valid under the new
-- points system since every session compared shares the same exam and the
-- same scoring config.
