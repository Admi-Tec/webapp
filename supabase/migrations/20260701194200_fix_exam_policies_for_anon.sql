-- Fix anonymous published exam access so anonymous users do not need permission to execute public.has_role.
DROP POLICY IF EXISTS "Anyone can read published exams" ON public.exams;
CREATE POLICY "Anyone can read published exams" ON public.exams
  FOR SELECT TO anon, authenticated
  USING (
    status = 'published'
    OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'))
  );

DROP POLICY IF EXISTS "Read exam questions if exam visible" ON public.exam_questions;
CREATE POLICY "Read exam questions if exam visible" ON public.exam_questions
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.exams e
      WHERE e.id = exam_id
        AND (
          e.status = 'published'
          OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'))
        )
    )
  );
