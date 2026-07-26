-- Broadens the just-added exam_min_scores (exam-only) into a single flexible
-- min_scores table: an admin can set a minimum score scoped to any
-- combination of university, exam, and/or career (all optional, at least one
-- required). A row with only university_id set is a broad benchmark; adding
-- career_id narrows it to that career; adding exam_id narrows it further to
-- one specific exam. Resolution (most specific match wins) lives in
-- get_applicable_min_score below.

DROP TABLE IF EXISTS public.exam_min_scores;

CREATE TABLE public.min_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid REFERENCES public.universities(id) ON DELETE CASCADE,
  exam_id uuid REFERENCES public.exams(id) ON DELETE CASCADE,
  career_id uuid REFERENCES public.careers(id) ON DELETE CASCADE,
  min_score numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT min_scores_at_least_one_dim
    CHECK (university_id IS NOT NULL OR exam_id IS NOT NULL OR career_id IS NOT NULL)
);
CREATE INDEX min_scores_university_idx ON public.min_scores(university_id);
CREATE INDEX min_scores_exam_idx ON public.min_scores(exam_id);
CREATE INDEX min_scores_career_idx ON public.min_scores(career_id);

GRANT SELECT ON public.min_scores TO authenticated;
GRANT ALL ON public.min_scores TO service_role;
ALTER TABLE public.min_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "min scores read" ON public.min_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "min scores admin write" ON public.min_scores FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Resolves the single applicable min score for a student viewing one exam:
-- every row whose set dimensions all match the given context is a candidate
-- (NULL dimensions on a row act as a wildcard), and the most specific match
-- (most non-null dimensions) wins, most-recently-updated as tiebreak.
CREATE OR REPLACE FUNCTION public.get_applicable_min_score(
  _exam_id uuid,
  _university_id uuid,
  _career_id uuid
)
RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT min_score
  FROM public.min_scores
  WHERE (exam_id IS NULL OR exam_id = _exam_id)
    AND (university_id IS NULL OR university_id = _university_id)
    AND (career_id IS NULL OR career_id = _career_id)
  ORDER BY
    (exam_id IS NOT NULL)::int + (university_id IS NOT NULL)::int + (career_id IS NOT NULL)::int DESC,
    updated_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_applicable_min_score(uuid, uuid, uuid) TO authenticated;
