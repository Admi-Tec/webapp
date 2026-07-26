
-- Phase 1: Image storage policies + exercise image columns
-- Phase 2: Topics dynamic fields
-- Phase 3: Exams schema

-- ===== Storage policies for exercise-images =====
CREATE POLICY "exercise-images public read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'exercise-images');

CREATE POLICY "exercise-images admin insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'exercise-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "exercise-images admin update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'exercise-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "exercise-images admin delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'exercise-images' AND public.has_role(auth.uid(), 'admin'));

-- ===== Exercise image columns =====
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS statement_image_path text,
  ADD COLUMN IF NOT EXISTS solution_image_path text;

-- ===== Topics enhancements =====
ALTER TABLE public.topics
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- Allow admin write on topics (already exists from earlier admin migration; ensure)
-- Allow anon/authenticated to read all topics (already there)

-- ===== Exams schema =====
CREATE TABLE IF NOT EXISTS public.exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  time_limit_min integer NOT NULL DEFAULT 60,
  passing_score integer NOT NULL DEFAULT 60,
  max_attempts integer,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  question_order text NOT NULL DEFAULT 'fixed' CHECK (question_order IN ('fixed','random')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.exams TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.exams TO authenticated;
GRANT ALL ON public.exams TO service_role;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published exams" ON public.exams
  FOR SELECT TO anon, authenticated USING (status = 'published' OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage exams insert" ON public.exams
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage exams update" ON public.exams
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage exams delete" ON public.exams
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.exam_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  points integer NOT NULL DEFAULT 1,
  UNIQUE (exam_id, exercise_id)
);
GRANT SELECT ON public.exam_questions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.exam_questions TO authenticated;
GRANT ALL ON public.exam_questions TO service_role;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read exam questions if exam visible" ON public.exam_questions
  FOR SELECT TO anon, authenticated USING (
    EXISTS (SELECT 1 FROM public.exams e WHERE e.id = exam_id AND (e.status = 'published' OR public.has_role(auth.uid(), 'admin')))
  );
CREATE POLICY "Admins write exam questions insert" ON public.exam_questions
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins write exam questions update" ON public.exam_questions
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins write exam questions delete" ON public.exam_questions
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Augment exam_sessions for full attempt state
ALTER TABLE public.exam_sessions
  ADD COLUMN IF NOT EXISTS exam_id uuid REFERENCES public.exams(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','submitted','graded')),
  ADD COLUMN IF NOT EXISTS answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS question_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS flagged jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS time_limit_min integer;

-- Allow university_id to be null for new exam-based sessions
ALTER TABLE public.exam_sessions ALTER COLUMN university_id DROP NOT NULL;

-- exam_sessions RLS: ensure students can manage their own
DROP POLICY IF EXISTS "Users manage own exam sessions" ON public.exam_sessions;
CREATE POLICY "Users manage own exam sessions select" ON public.exam_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users manage own exam sessions insert" ON public.exam_sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own exam sessions update" ON public.exam_sessions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- updated_at trigger for exams
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS exams_touch_updated_at ON public.exams;
CREATE TRIGGER exams_touch_updated_at BEFORE UPDATE ON public.exams
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
