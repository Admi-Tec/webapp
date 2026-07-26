-- Motor de recomendaciones de ejercicios (ver plan-motor-recomendaciones.md):
-- tres funciones que entregan señales crudas por subtema. Los pesos del
-- scoring viven en TS (src/lib/recommendation-scoring.ts), no acá — estas
-- funciones solo agregan datos, nunca deciden prioridad.

-- 1. Accuracy/ritmo/antigüedad por subtema, SOLO del usuario que llama, sobre
-- TODO su historial (a diferencia de getUserStats en attempts.functions.ts,
-- que trae un tope de 200 intentos recientes para el dashboard). No necesita
-- SECURITY DEFINER: attempts ya restringe por RLS a auth.uid() = user_id, y
-- exercises es de lectura pública, así que ejecutada como `authenticated`
-- esta función ya ve únicamente las filas propias del llamador.
CREATE OR REPLACE FUNCTION public.get_my_subtopic_stats()
RETURNS TABLE (
  subtopic_id uuid,
  topic_id uuid,
  total bigint,
  correct bigint,
  accuracy numeric,
  avg_time_ms numeric,
  last_attempt_at timestamptz
)
LANGUAGE sql STABLE SET search_path = public
AS $$
  SELECT
    e.subtopic_id,
    e.topic_id,
    COUNT(*)::bigint AS total,
    COUNT(*) FILTER (WHERE a.is_correct)::bigint AS correct,
    ROUND(COUNT(*) FILTER (WHERE a.is_correct)::numeric / COUNT(*), 4) AS accuracy,
    ROUND(AVG(a.time_spent_ms) FILTER (WHERE a.time_spent_ms > 0)) AS avg_time_ms,
    MAX(a.created_at) AS last_attempt_at
  FROM public.attempts a
  JOIN public.exercises e ON e.id = a.exercise_id
  WHERE a.user_id = auth.uid() AND e.subtopic_id IS NOT NULL
  GROUP BY e.subtopic_id, e.topic_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_subtopic_stats() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_my_subtopic_stats() FROM PUBLIC, anon;

-- 2. Tiempo promedio por subtema cruzando TODOS los usuarios — baseline para
-- normalizar el ritmo propio contra el de los demás. Cross-user, así que sí
-- necesita SECURITY DEFINER (mismo motivo que get_exercise_avg_times), pero
-- agregado por subtopic_id en vez de exercise_id: una fila por subtema, no
-- por ejercicio, que es lo que necesita el motor de recomendaciones.
CREATE OR REPLACE FUNCTION public.get_subtopic_avg_times()
RETURNS TABLE (
  subtopic_id uuid,
  avg_time_ms numeric,
  samples bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    e.subtopic_id,
    ROUND(AVG(a.time_spent_ms)) AS avg_time_ms,
    COUNT(*)::bigint AS samples
  FROM public.attempts a
  JOIN public.exercises e ON e.id = a.exercise_id
  WHERE a.time_spent_ms > 0 AND e.subtopic_id IS NOT NULL
  GROUP BY e.subtopic_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_subtopic_avg_times() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_subtopic_avg_times() FROM PUBLIC, anon;

-- 3. Ids de ejercicios de baja calidad a EXCLUIR de las recomendaciones —
-- mismo criterio que get_exercise_review_queue (reporte pendiente O
-- calificación promedio baja) pero sin el gate de admin de esa función y sin
-- exponer razones de reporte ni detalle de calificaciones: solo ids, seguro
-- de llamar desde cualquier estudiante autenticado.
CREATE OR REPLACE FUNCTION public.get_low_quality_exercise_ids(_low_rating_threshold numeric DEFAULT 2)
RETURNS TABLE (exercise_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH report_counts AS (
    SELECT r.exercise_id, COUNT(*) AS pending_count
    FROM public.exercise_reports r
    WHERE r.status = 'pendiente'
    GROUP BY r.exercise_id
  ),
  rating_stats AS (
    SELECT rt.exercise_id, AVG(rt.stars) AS avg_stars
    FROM public.exercise_ratings rt
    GROUP BY rt.exercise_id
  )
  SELECT e.id
  FROM public.exercises e
  LEFT JOIN report_counts rc ON rc.exercise_id = e.id
  LEFT JOIN rating_stats rs ON rs.exercise_id = e.id
  WHERE COALESCE(rc.pending_count, 0) > 0
     OR (rs.avg_stars IS NOT NULL AND rs.avg_stars < _low_rating_threshold);
$$;

GRANT EXECUTE ON FUNCTION public.get_low_quality_exercise_ids(numeric) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_low_quality_exercise_ids(numeric) FROM PUBLIC, anon;
