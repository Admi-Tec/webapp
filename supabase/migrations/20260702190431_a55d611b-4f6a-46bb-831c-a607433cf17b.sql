
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;

ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS exam_type text NOT NULL DEFAULT 'standard'
    CHECK (exam_type IN ('standard','template')),
  ADD COLUMN IF NOT EXISTS allow_multiple_attempts boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.exam_template_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  difficulty_filter public.difficulty NULL,
  question_count integer NOT NULL CHECK (question_count > 0),
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS exam_template_rules_exam_idx ON public.exam_template_rules(exam_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_template_rules TO authenticated;
GRANT ALL ON public.exam_template_rules TO service_role;

ALTER TABLE public.exam_template_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view template rules of published exams" ON public.exam_template_rules;
CREATE POLICY "Authenticated can view template rules of published exams"
  ON public.exam_template_rules FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.exams e WHERE e.id = exam_id AND (e.status = 'published' OR public.has_role(auth.uid(), 'admin')))
  );

DROP POLICY IF EXISTS "Admins manage template rules" ON public.exam_template_rules;
CREATE POLICY "Admins manage template rules"
  ON public.exam_template_rules FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
