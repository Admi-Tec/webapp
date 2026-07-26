-- Bug fix: exam_sessions.score is already stored as a 0-100 percentage
-- (see submitExamSession in src/lib/exams.functions.ts, which writes
-- `scorePct = round(correctCount / total * 100)` into `score`). The stats/
-- leaderboard functions below were treating it as a raw correct-answer count
-- and re-dividing it by `total` before multiplying by 100 again, producing
-- nonsensical values like 500% (e.g. score=50, total=10 -> 50/10*100=500).
-- Fix: use s.score directly wherever a percentage is needed.

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
    ROUND(AVG(s.score::numeric), 1) AS avg_score,
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
    MAX(s.score::numeric) AS best_score,
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

CREATE OR REPLACE FUNCTION public.get_exam_stats(_exam_id uuid, _my_score_pct numeric DEFAULT NULL)
RETURNS TABLE (
  avg_score numeric,
  sessions_count bigint,
  my_percentile numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH scores AS (
    SELECT s.score::numeric AS pct
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
