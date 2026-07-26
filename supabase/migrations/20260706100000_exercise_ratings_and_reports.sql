-- Exercise quality feedback (see plan-calificacion-reportes-ejercicios.md):
-- student star ratings + problem reports, and the admin review-queue
-- aggregate that combines both signals.

CREATE TYPE public.exercise_report_reason AS ENUM (
  'respuesta_incorrecta',
  'enunciado_confuso',
  'falta_informacion',
  'imagen_problema',
  'otro'
);

CREATE TYPE public.exercise_report_status AS ENUM ('pendiente', 'resuelto', 'descartado');

-- 1. Star ratings — one per student per exercise (re-rating updates it, never
-- accumulates). A rating only exists once a student actually rates (1-5);
-- "no rating yet" is simply the absence of a row, not a stored 0.
CREATE TABLE public.exercise_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  stars smallint NOT NULL CHECK (stars BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, exercise_id)
);
GRANT SELECT, INSERT, UPDATE ON public.exercise_ratings TO authenticated;
GRANT ALL ON public.exercise_ratings TO service_role;
ALTER TABLE public.exercise_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exercise_ratings self all" ON public.exercise_ratings
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "exercise_ratings admin read" ON public.exercise_ratings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 2. Problem reports — a student can report the same exercise more than
-- once (distinct problems at distinct times), so no uniqueness constraint.
CREATE TABLE public.exercise_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  reason public.exercise_report_reason NOT NULL,
  note text,
  status public.exercise_report_status NOT NULL DEFAULT 'pendiente',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX exercise_reports_exercise_idx ON public.exercise_reports(exercise_id);
CREATE INDEX exercise_reports_status_idx ON public.exercise_reports(status);

GRANT SELECT, INSERT, UPDATE ON public.exercise_reports TO authenticated;
GRANT ALL ON public.exercise_reports TO service_role;
ALTER TABLE public.exercise_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exercise_reports self insert" ON public.exercise_reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "exercise_reports self read" ON public.exercise_reports
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "exercise_reports admin read" ON public.exercise_reports
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "exercise_reports admin update" ON public.exercise_reports
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Admin review-queue aggregate: exercises with a pending report, OR a low
-- average rating even without any report (plan §5's two-signal rule). Gated
-- to admins inside the function itself (not just RLS) since this is exposed
-- as a plain EXECUTE grant to `authenticated` — a non-admin calling it
-- directly would otherwise see other students' aggregate quality signals.
CREATE OR REPLACE FUNCTION public.get_exercise_review_queue(_low_rating_threshold numeric DEFAULT 2)
RETURNS TABLE (
  exercise_id uuid,
  statement_md text,
  topic_name text,
  subtopic_name text,
  pending_report_count bigint,
  avg_rating numeric,
  rating_count bigint,
  flag_reason text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH report_counts AS (
    SELECT exercise_id, COUNT(*) AS pending_count
    FROM public.exercise_reports
    WHERE status = 'pendiente'
    GROUP BY exercise_id
  ),
  rating_stats AS (
    SELECT exercise_id, ROUND(AVG(stars), 2) AS avg_stars, COUNT(*) AS rating_count
    FROM public.exercise_ratings
    GROUP BY exercise_id
  )
  SELECT
    e.id,
    e.statement_md,
    t.name,
    st.name,
    COALESCE(rc.pending_count, 0),
    rs.avg_stars,
    COALESCE(rs.rating_count, 0),
    CASE WHEN COALESCE(rc.pending_count, 0) > 0 THEN 'reportado' ELSE 'calificacion_baja' END
  FROM public.exercises e
  LEFT JOIN public.topics t ON t.id = e.topic_id
  LEFT JOIN public.subtopics st ON st.id = e.subtopic_id
  LEFT JOIN report_counts rc ON rc.exercise_id = e.id
  LEFT JOIN rating_stats rs ON rs.exercise_id = e.id
  WHERE public.has_role(auth.uid(), 'admin')
    AND (
      COALESCE(rc.pending_count, 0) > 0
      OR (rs.avg_stars IS NOT NULL AND rs.avg_stars < _low_rating_threshold)
    )
  ORDER BY COALESCE(rc.pending_count, 0) DESC, rs.avg_stars ASC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.get_exercise_review_queue(numeric) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_exercise_review_queue(numeric) FROM PUBLIC, anon;
