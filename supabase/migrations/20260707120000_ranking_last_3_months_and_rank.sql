-- Ranking now only considers exam_sessions from the last 3 rolling months, caps
-- the visible list at _limit, but always includes the querying student's own
-- row (tagged with its real rank) even if they fall outside that cap — the
-- app layer decides whether to render it inline or as a separate "tu posición"
-- block. See plan-ranking-mensual-puntaje-minimo.md §1.

DROP FUNCTION IF EXISTS public.get_university_leaderboard(uuid, int);
DROP FUNCTION IF EXISTS public.get_exam_leaderboard(uuid, int);

CREATE OR REPLACE FUNCTION public.get_university_leaderboard(_university_id uuid, _limit int DEFAULT 100)
RETURNS TABLE (
  user_id uuid,
  pseudonym text,
  avg_accuracy numeric,
  sessions_count bigint,
  rank bigint,
  total_count bigint,
  is_me boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH scored AS (
    SELECT
      p.id AS user_id,
      p.pseudonym,
      ROUND(AVG(s.correct_count::numeric / NULLIF(s.total, 0) * 100), 1) AS avg_accuracy,
      COUNT(*)::bigint AS sessions_count
    FROM public.exam_sessions s
    JOIN public.exams e ON e.id = s.exam_id
    JOIN public.profiles p ON p.id = s.user_id
    WHERE e.university_id = _university_id
      AND s.status IN ('submitted','graded')
      AND s.correct_count IS NOT NULL AND s.total IS NOT NULL AND s.total > 0
      AND s.started_at >= now() - interval '3 months'
      AND p.leaderboard_opt_in = true
      AND p.pseudonym IS NOT NULL
    GROUP BY p.id, p.pseudonym
  ),
  ranked AS (
    SELECT
      *,
      RANK() OVER (ORDER BY avg_accuracy DESC) AS rank,
      COUNT(*) OVER ()::bigint AS total_count
    FROM scored
  )
  SELECT user_id, pseudonym, avg_accuracy, sessions_count, rank, total_count, (user_id = auth.uid()) AS is_me
  FROM ranked
  WHERE rank <= _limit OR user_id = auth.uid()
  ORDER BY rank;
$$;

CREATE OR REPLACE FUNCTION public.get_exam_leaderboard(_exam_id uuid, _limit int DEFAULT 100)
RETURNS TABLE (
  user_id uuid,
  pseudonym text,
  best_score numeric,
  max_score numeric,
  attempts_count bigint,
  rank bigint,
  total_count bigint,
  is_me boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH scored AS (
    SELECT
      p.id AS user_id,
      p.pseudonym,
      MAX(s.score::numeric) AS best_score,
      MAX(s.max_score::numeric) AS max_score,
      COUNT(*)::bigint AS attempts_count
    FROM public.exam_sessions s
    JOIN public.profiles p ON p.id = s.user_id
    WHERE s.exam_id = _exam_id
      AND s.status IN ('submitted','graded')
      AND s.score IS NOT NULL AND s.total IS NOT NULL AND s.total > 0
      AND s.started_at >= now() - interval '3 months'
      AND p.leaderboard_opt_in = true
      AND p.pseudonym IS NOT NULL
    GROUP BY p.id, p.pseudonym
  ),
  ranked AS (
    SELECT
      *,
      RANK() OVER (ORDER BY best_score DESC) AS rank,
      COUNT(*) OVER ()::bigint AS total_count
    FROM scored
  )
  SELECT user_id, pseudonym, best_score, max_score, attempts_count, rank, total_count, (user_id = auth.uid()) AS is_me
  FROM ranked
  WHERE rank <= _limit OR user_id = auth.uid()
  ORDER BY rank;
$$;

GRANT EXECUTE ON FUNCTION public.get_university_leaderboard(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_exam_leaderboard(uuid, int) TO authenticated;

-- Best raw score (same points scale a university's admission process uses)
-- across any exam/template at one university, last 3 months, for the caller
-- only — used to compare against that university+career's minimum admission
-- score. Deliberately has no _user_id parameter so it can never be used to
-- read another student's score.
CREATE OR REPLACE FUNCTION public.get_my_best_score_for_university(_university_id uuid)
RETURNS TABLE (best_score numeric, sessions_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT MAX(s.score::numeric) AS best_score, COUNT(*)::bigint AS sessions_count
  FROM public.exam_sessions s
  JOIN public.exams e ON e.id = s.exam_id
  WHERE e.university_id = _university_id
    AND s.user_id = auth.uid()
    AND s.status IN ('submitted','graded')
    AND s.score IS NOT NULL
    AND s.started_at >= now() - interval '3 months';
$$;

GRANT EXECUTE ON FUNCTION public.get_my_best_score_for_university(uuid) TO authenticated;
