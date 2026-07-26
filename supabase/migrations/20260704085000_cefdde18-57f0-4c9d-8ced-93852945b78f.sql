
-- 1. Extend profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pseudonym text,
  ADD COLUMN IF NOT EXISTS career text,
  ADD COLUMN IF NOT EXISTS leaderboard_opt_in boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS weekly_goal_questions integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS weekly_goal_exams integer NOT NULL DEFAULT 2;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_pseudonym_unique
  ON public.profiles (lower(pseudonym)) WHERE pseudonym IS NOT NULL;

-- 2. student_universities
CREATE TABLE IF NOT EXISTS public.student_universities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  university_id uuid NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  exam_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, university_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_universities TO authenticated;
GRANT ALL ON public.student_universities TO service_role;
ALTER TABLE public.student_universities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student_universities self all" ON public.student_universities
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. exams.university_id
ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS university_id uuid REFERENCES public.universities(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS exams_university_idx ON public.exams(university_id);

-- 4. exercises.expected_time_ms
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS expected_time_ms integer;

-- 5. favorite_exercises
CREATE TABLE IF NOT EXISTS public.favorite_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, exercise_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorite_exercises TO authenticated;
GRANT ALL ON public.favorite_exercises TO service_role;
ALTER TABLE public.favorite_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "favorite_exercises self all" ON public.favorite_exercises
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications self all" ON public.notifications
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications(user_id, created_at DESC);

-- 7. Leaderboard SECURITY DEFINER functions (never expose user_id or real name)
-- General per university: average score across finished sessions of exams with that university
CREATE OR REPLACE FUNCTION public.get_university_leaderboard(_university_id uuid, _limit int DEFAULT 100)
RETURNS TABLE (
  user_id uuid,
  pseudonym text,
  avg_score numeric,
  sessions_count bigint,
  is_me boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p.id AS user_id,
    p.pseudonym,
    ROUND(AVG(s.score::numeric / NULLIF(s.total, 0) * 100), 1) AS avg_score,
    COUNT(*)::bigint AS sessions_count,
    (p.id = auth.uid()) AS is_me
  FROM public.exam_sessions s
  JOIN public.exams e ON e.id = s.exam_id
  JOIN public.profiles p ON p.id = s.user_id
  WHERE e.university_id = _university_id
    AND s.status IN ('submitted','graded')
    AND s.score IS NOT NULL AND s.total IS NOT NULL AND s.total > 0
    AND p.leaderboard_opt_in = true
    AND p.pseudonym IS NOT NULL
  GROUP BY p.id, p.pseudonym
  ORDER BY avg_score DESC NULLS LAST
  LIMIT _limit;
$$;

-- Per exam: best score per user for a specific exam
CREATE OR REPLACE FUNCTION public.get_exam_leaderboard(_exam_id uuid, _limit int DEFAULT 100)
RETURNS TABLE (
  user_id uuid,
  pseudonym text,
  best_score numeric,
  attempts_count bigint,
  is_me boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p.id AS user_id,
    p.pseudonym,
    MAX(ROUND(s.score::numeric / NULLIF(s.total, 0) * 100, 1)) AS best_score,
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

-- Exam stats (avg + percentile helper) — used in resultado page
CREATE OR REPLACE FUNCTION public.get_exam_stats(_exam_id uuid, _my_score_pct numeric DEFAULT NULL)
RETURNS TABLE (
  avg_score numeric,
  sessions_count bigint,
  my_percentile numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH scores AS (
    SELECT ROUND(s.score::numeric / NULLIF(s.total, 0) * 100, 1) AS pct
    FROM public.exam_sessions s
    WHERE s.exam_id = _exam_id
      AND s.status IN ('submitted','graded')
      AND s.score IS NOT NULL AND s.total IS NOT NULL AND s.total > 0
  )
  SELECT
    ROUND(AVG(pct), 1) AS avg_score,
    COUNT(*)::bigint AS sessions_count,
    CASE
      WHEN _my_score_pct IS NULL OR COUNT(*) = 0 THEN NULL
      ELSE ROUND(100.0 * SUM(CASE WHEN pct <= _my_score_pct THEN 1 ELSE 0 END) / COUNT(*), 1)
    END AS my_percentile
  FROM scores;
$$;

GRANT EXECUTE ON FUNCTION public.get_university_leaderboard(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_exam_leaderboard(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_exam_stats(uuid, numeric) TO authenticated;
