-- Minimum admission scores ("puntajes mínimos de ingreso"), one row per
-- university + career + admission-process year, kept historical (several
-- years can coexist) so the ranking page can show the trend and the most
-- recent value. See plan-ranking-mensual-puntaje-minimo.md §2/§3.

CREATE TABLE public.min_admission_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  career_id uuid NOT NULL REFERENCES public.careers(id) ON DELETE CASCADE,
  year int NOT NULL,
  min_score numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (university_id, career_id, year)
);

GRANT SELECT ON public.min_admission_scores TO authenticated;
GRANT ALL ON public.min_admission_scores TO service_role;
ALTER TABLE public.min_admission_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "min scores read" ON public.min_admission_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "min scores admin write" ON public.min_admission_scores FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
