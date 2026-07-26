-- Chart "Aciertos por curso" mejorado (ver plan-mejoras-chart-aciertos-curso.md
-- §5): línea de comparación con el promedio general de otros estudiantes, por
-- tema y por subtema (para la vista de drill-down). Mismo patrón que
-- get_subtopic_avg_times (agregado cross-user, SECURITY DEFINER, solo
-- accuracy — nunca filas crudas de otros usuarios).
CREATE OR REPLACE FUNCTION public.get_topic_avg_accuracy()
RETURNS TABLE (
  topic_id uuid,
  accuracy numeric,
  samples bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    e.topic_id,
    ROUND(COUNT(*) FILTER (WHERE a.is_correct)::numeric / COUNT(*), 4) AS accuracy,
    COUNT(*)::bigint AS samples
  FROM public.attempts a
  JOIN public.exercises e ON e.id = a.exercise_id
  WHERE e.topic_id IS NOT NULL
  GROUP BY e.topic_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_topic_avg_accuracy() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_topic_avg_accuracy() FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.get_subtopic_avg_accuracy()
RETURNS TABLE (
  subtopic_id uuid,
  accuracy numeric,
  samples bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    e.subtopic_id,
    ROUND(COUNT(*) FILTER (WHERE a.is_correct)::numeric / COUNT(*), 4) AS accuracy,
    COUNT(*)::bigint AS samples
  FROM public.attempts a
  JOIN public.exercises e ON e.id = a.exercise_id
  WHERE e.subtopic_id IS NOT NULL
  GROUP BY e.subtopic_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_subtopic_avg_accuracy() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_subtopic_avg_accuracy() FROM PUBLIC, anon;
