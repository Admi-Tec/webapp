-- Bug fix: listPublishedTemplates() (src/lib/exams.functions.ts) always reads
-- through publicClient() (anon key, no session) since /simulacros is a public
-- route. exam_template_rules only granted SELECT to `authenticated`
-- (migration 20260702190431), so that anon read always came back empty,
-- making every template show "0 preguntas" / "0 materia(s)" regardless of who
-- was looking (logged in or not, since the listing call itself never carries
-- the user's session). exams/exam_questions already got this same anon
-- carve-out in 20260701194200_fix_exam_policies_for_anon.sql; template rules
-- were added a day later and missed it.

GRANT SELECT ON public.exam_template_rules TO anon;

DROP POLICY IF EXISTS "Authenticated can view template rules of published exams" ON public.exam_template_rules;
CREATE POLICY "Anyone can view template rules of published exams"
  ON public.exam_template_rules FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exams e
      WHERE e.id = exam_id
        AND (
          e.status = 'published'
          OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'))
        )
    )
  );
