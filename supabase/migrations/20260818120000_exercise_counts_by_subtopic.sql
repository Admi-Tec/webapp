-- The admin Courses screen used to fetch every exercise row and aggregate it
-- in JavaScript. PostgREST caps a response at the project's max rows (1000 by
-- default), so courses/subtopics beyond that window showed partial counts.
-- Aggregate in Postgres and return one row per subtopic instead.

CREATE OR REPLACE FUNCTION public.get_exercise_counts_by_subtopic()
RETURNS TABLE(subtopic_id uuid, exercise_count bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT subtopic_id, count(*) AS exercise_count
  FROM public.exercises
  WHERE subtopic_id IS NOT NULL
  GROUP BY subtopic_id;
$$;

-- exercises is already publicly readable; this aggregate exposes no data the
-- caller could not query directly and only avoids transferring raw rows.
GRANT EXECUTE ON FUNCTION public.get_exercise_counts_by_subtopic() TO anon, authenticated;
