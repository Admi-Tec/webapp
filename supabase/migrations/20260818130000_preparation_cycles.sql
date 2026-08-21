CREATE TABLE public.preparation_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL REFERENCES public.universities(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  slug text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (university_id, slug)
);

CREATE TABLE public.preparation_cycle_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.preparation_cycles(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE RESTRICT,
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cycle_id, topic_id)
);

CREATE TABLE public.preparation_cycle_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_course_id uuid NOT NULL REFERENCES public.preparation_cycle_courses(id) ON DELETE CASCADE,
  subtopic_id uuid NOT NULL REFERENCES public.subtopics(id) ON DELETE RESTRICT,
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  title_override text CHECK (title_override IS NULL OR char_length(title_override) <= 120),
  youtube_url text,
  youtube_video_id text CHECK (youtube_video_id IS NULL OR youtube_video_id ~ '^[A-Za-z0-9_-]{11}$'),
  video_duration_seconds integer CHECK (video_duration_seconds IS NULL OR video_duration_seconds BETWEEN 1 AND 86400),
  practice_question_count integer NOT NULL DEFAULT 5 CHECK (practice_question_count BETWEEN 1 AND 20),
  practice_selection_mode text NOT NULL DEFAULT 'automatic' CHECK (practice_selection_mode = 'automatic'),
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cycle_course_id, subtopic_id)
);

CREATE TABLE public.preparation_practice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_topic_id uuid NOT NULL REFERENCES public.preparation_cycle_topics(id) ON DELETE CASCADE,
  question_ids uuid[] NOT NULL CHECK (cardinality(question_ids) BETWEEN 1 AND 20),
  answered_ids uuid[] NOT NULL DEFAULT '{}',
  correct_count integer NOT NULL DEFAULT 0 CHECK (correct_count >= 0),
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE public.student_cycle_topic_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_topic_id uuid NOT NULL REFERENCES public.preparation_cycle_topics(id) ON DELETE CASCADE,
  theory_completed_at timestamptz,
  practice_completed_at timestamptz,
  best_score numeric(5,2) CHECK (best_score IS NULL OR best_score BETWEEN 0 AND 100),
  last_score numeric(5,2) CHECK (last_score IS NULL OR last_score BETWEEN 0 AND 100),
  mastery_status text NOT NULL DEFAULT 'not_started' CHECK (
    mastery_status IN ('not_started', 'theory_completed', 'practice_completed', 'needs_review', 'mastered')
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, cycle_topic_id)
);

CREATE INDEX preparation_cycles_university_status_idx ON public.preparation_cycles(university_id, status);
CREATE INDEX preparation_cycle_courses_cycle_position_idx ON public.preparation_cycle_courses(cycle_id, position);
CREATE INDEX preparation_cycle_topics_course_position_idx ON public.preparation_cycle_topics(cycle_course_id, position);
CREATE INDEX preparation_progress_user_idx ON public.student_cycle_topic_progress(user_id);
CREATE INDEX preparation_sessions_user_idx ON public.preparation_practice_sessions(user_id, started_at DESC);

CREATE TRIGGER preparation_cycles_touch_updated_at BEFORE UPDATE ON public.preparation_cycles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER preparation_cycle_courses_touch_updated_at BEFORE UPDATE ON public.preparation_cycle_courses
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER preparation_cycle_topics_touch_updated_at BEFORE UPDATE ON public.preparation_cycle_topics
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER student_cycle_topic_progress_touch_updated_at BEFORE UPDATE ON public.student_cycle_topic_progress
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.preparation_cycles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.preparation_cycle_courses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.preparation_cycle_topics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.preparation_practice_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_cycle_topic_progress TO authenticated;
GRANT ALL ON public.preparation_cycles, public.preparation_cycle_courses,
  public.preparation_cycle_topics, public.preparation_practice_sessions,
  public.student_cycle_topic_progress TO service_role;

ALTER TABLE public.preparation_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preparation_cycle_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preparation_cycle_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preparation_practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_cycle_topic_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "preparation cycles admin all" ON public.preparation_cycles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "published preparation cycles for my universities" ON public.preparation_cycles
  FOR SELECT TO authenticated USING (
    status = 'published' AND EXISTS (
      SELECT 1 FROM public.student_universities su
      WHERE su.user_id = auth.uid() AND su.university_id = preparation_cycles.university_id
    )
  );

CREATE POLICY "preparation courses admin all" ON public.preparation_cycle_courses
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "published preparation courses read" ON public.preparation_cycle_courses
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.preparation_cycles pc
    WHERE pc.id = cycle_id AND pc.status = 'published'
      AND EXISTS (SELECT 1 FROM public.student_universities su
        WHERE su.user_id = auth.uid() AND su.university_id = pc.university_id)
  ));

CREATE POLICY "preparation topics admin all" ON public.preparation_cycle_topics
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "published preparation topics read" ON public.preparation_cycle_topics
  FOR SELECT TO authenticated USING (is_published AND EXISTS (
    SELECT 1 FROM public.preparation_cycle_courses pcc
    JOIN public.preparation_cycles pc ON pc.id = pcc.cycle_id
    WHERE pcc.id = cycle_course_id AND pc.status = 'published'
      AND EXISTS (SELECT 1 FROM public.student_universities su
        WHERE su.user_id = auth.uid() AND su.university_id = pc.university_id)
  ));

CREATE POLICY "own preparation sessions" ON public.preparation_practice_sessions
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own preparation progress" ON public.student_cycle_topic_progress
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

