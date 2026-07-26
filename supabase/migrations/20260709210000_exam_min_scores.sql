-- Ranking is now exam-only (the "por universidad" tab and its average-accuracy
-- leaderboard are gone), so the "puntaje mínimo de ingreso" comparison moves
-- from being keyed on (university, career, year) to a single optional
-- min_score per exam, set by an admin. Replaces min_admission_scores and its
-- two now-unused RPCs entirely — no data migration, the old model is obsolete.

DROP FUNCTION IF EXISTS public.get_university_leaderboard(uuid, int);
DROP FUNCTION IF EXISTS public.get_my_best_score_for_university(uuid);
DROP TABLE IF EXISTS public.min_admission_scores;

CREATE TABLE public.exam_min_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL UNIQUE REFERENCES public.exams(id) ON DELETE CASCADE,
  min_score numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.exam_min_scores TO authenticated;
GRANT ALL ON public.exam_min_scores TO service_role;
ALTER TABLE public.exam_min_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exam min scores read" ON public.exam_min_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "exam min scores admin write" ON public.exam_min_scores FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
