
-- Average time spent (ms) per exercise across all students' attempts, used to flag
-- "slow" questions in the exam result screen without exposing individual attempts
-- (attempts table RLS is scoped to auth.uid(), so this needs SECURITY DEFINER).
CREATE OR REPLACE FUNCTION public.get_exercise_avg_times(_exercise_ids uuid[])
RETURNS TABLE (
  exercise_id uuid,
  avg_time_ms numeric,
  samples bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    a.exercise_id,
    ROUND(AVG(a.time_spent_ms)) AS avg_time_ms,
    COUNT(*)::bigint AS samples
  FROM public.attempts a
  WHERE a.exercise_id = ANY(_exercise_ids)
    AND a.time_spent_ms > 0
  GROUP BY a.exercise_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_exercise_avg_times(uuid[]) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_exercise_avg_times(uuid[]) FROM PUBLIC, anon;
