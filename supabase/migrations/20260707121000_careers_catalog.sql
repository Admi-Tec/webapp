-- Careers ("carreras") catalog, scoped per university (each university has
-- its own set — not a shared list). Students pick one career per target
-- university, so the FK lives on student_universities rather than profiles.
-- See plan-ranking-mensual-puntaje-minimo.md §2. The old free-text
-- profiles.career column is left untouched (unused going forward) to avoid
-- losing existing data with no reliable way to map it onto this new catalog.

CREATE TABLE public.careers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX careers_university_name_unique ON public.careers (university_id, lower(name));

GRANT SELECT ON public.careers TO authenticated;
GRANT ALL ON public.careers TO service_role;
ALTER TABLE public.careers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "careers read" ON public.careers FOR SELECT TO authenticated USING (true);
CREATE POLICY "careers admin write" ON public.careers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.student_universities
  ADD COLUMN career_id uuid REFERENCES public.careers(id) ON DELETE SET NULL;
