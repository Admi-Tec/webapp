-- Performance fixes from the app-wide audit:
--
-- 1. exercises and exam_sessions had no index beyond their primary key, even
--    though topic_id/subtopic_id/university_id (exercises) and
--    user_id+exam_id / user_id+university_id (exam_sessions) are exactly the
--    columns filtered on nearly every exercise-listing and exam-session
--    request (listExercises, getSubtopicFrequency, getMyExamAttempts,
--    listMyUniversityExamSessions, startExamSession — see src/lib/exercises.functions.ts
--    and src/lib/exams.functions.ts). Every one of those was a full table
--    scan, and it only gets worse as the exercise bank and session history grow.
--
-- 2. listTopics/listUniversities (src/lib/exercises.functions.ts) counted
--    exercises per topic/university by pulling every single row's topic_id
--    or university_id over the wire and tallying in JS — on the public
--    homepage's own loader. Replaced with a GROUP BY done in Postgres,
--    exposed as two small RPCs returning only one row per topic/university.

CREATE INDEX IF NOT EXISTS exercises_topic_idx ON public.exercises(topic_id);
CREATE INDEX IF NOT EXISTS exercises_subtopic_idx ON public.exercises(subtopic_id);
CREATE INDEX IF NOT EXISTS exercises_university_idx ON public.exercises(university_id);

CREATE INDEX IF NOT EXISTS exam_sessions_user_exam_idx ON public.exam_sessions(user_id, exam_id);
CREATE INDEX IF NOT EXISTS exam_sessions_user_university_idx ON public.exam_sessions(user_id, university_id);

-- Plain (non-SECURITY DEFINER) functions: exercises already grants public
-- SELECT to anon/authenticated with USING (true), so there's no RLS
-- boundary to cross here, just an aggregate the caller could already compute
-- from the raw rows — this only saves the row transfer + JS tally.
CREATE OR REPLACE FUNCTION public.get_exercise_counts_by_topic()
RETURNS TABLE(topic_id uuid, exercise_count bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT topic_id, count(*) AS exercise_count
  FROM public.exercises
  GROUP BY topic_id;
$$;

CREATE OR REPLACE FUNCTION public.get_exercise_counts_by_university()
RETURNS TABLE(university_id uuid, exercise_count bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT university_id, count(*) AS exercise_count
  FROM public.exercises
  WHERE university_id IS NOT NULL
  GROUP BY university_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_exercise_counts_by_topic() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_exercise_counts_by_university() TO anon, authenticated;
