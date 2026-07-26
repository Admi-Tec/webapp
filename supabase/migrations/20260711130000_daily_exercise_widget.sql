-- Landing page "reto del día" widget: a single exercise, picked deterministically
-- per calendar day (America/Lima) so every visitor sees the same question and it
-- rotates automatically at local midnight with no cron/scheduled job needed.
-- Answers are intentionally anonymous (no user_id) since most visitors to the
-- public landing page aren't signed in yet — this is a vanity/engagement stat,
-- not part of the authenticated attempts/streak system.

CREATE TABLE public.daily_exercise_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  answer_date date NOT NULL,
  is_correct boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX daily_exercise_answers_exercise_date_idx
  ON public.daily_exercise_answers(exercise_id, answer_date);

-- No GRANTs to anon/authenticated and no policies: this table is only ever
-- touched through the SECURITY DEFINER functions below, matching the
-- cross-user-aggregate pattern used elsewhere (get_exercise_avg_times, etc.)
-- rather than opening direct anonymous INSERT/SELECT on a bare table.
ALTER TABLE public.daily_exercise_answers ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.daily_exercise_answers TO service_role;

-- Deterministic "random" pick for a given local date: same exercise for every
-- caller on the same day, changes automatically at the next day's boundary.
CREATE OR REPLACE FUNCTION public.get_daily_exercise_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT e.id
  FROM public.exercises e
  ORDER BY md5(e.id::text || (now() AT TIME ZONE 'America/Lima')::date::text)
  LIMIT 1;
$$;

-- Today's exercise (statement + choices, no correct_choice — grading happens
-- server-side in submit_daily_exercise_answer) plus today's running accuracy.
CREATE OR REPLACE FUNCTION public.get_daily_exercise()
RETURNS TABLE (
  exercise_id uuid,
  statement_md text,
  choices jsonb,
  difficulty public.difficulty,
  topic_name text,
  total_answers bigint,
  correct_answers bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    e.id,
    e.statement_md,
    e.choices,
    e.difficulty,
    t.name,
    COALESCE(a.total, 0),
    COALESCE(a.correct, 0)
  FROM public.exercises e
  LEFT JOIN public.topics t ON t.id = e.topic_id
  LEFT JOIN (
    SELECT
      exercise_id,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE is_correct) AS correct
    FROM public.daily_exercise_answers
    WHERE answer_date = (now() AT TIME ZONE 'America/Lima')::date
    GROUP BY exercise_id
  ) a ON a.exercise_id = e.id
  WHERE e.id = public.get_daily_exercise_id();
$$;

-- Grades against today's exercise server-side (never trusts a client-supplied
-- exercise id, so a visitor can't submit an answer against an arbitrary
-- exercise to pollute its stats) and records one anonymous answer row.
CREATE OR REPLACE FUNCTION public.submit_daily_exercise_answer(_selected_choice int)
RETURNS TABLE (
  exercise_id uuid,
  is_correct boolean,
  correct_choice int,
  total_answers bigint,
  correct_answers bigint
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _today date := (now() AT TIME ZONE 'America/Lima')::date;
  _exercise_id uuid := public.get_daily_exercise_id();
  _correct_choice int;
  _is_correct boolean;
BEGIN
  IF _exercise_id IS NULL THEN
    RAISE EXCEPTION 'No hay ejercicio disponible hoy';
  END IF;

  SELECT e.correct_choice INTO _correct_choice
  FROM public.exercises e
  WHERE e.id = _exercise_id;

  _is_correct := (_selected_choice = _correct_choice);

  INSERT INTO public.daily_exercise_answers (exercise_id, answer_date, is_correct)
  VALUES (_exercise_id, _today, _is_correct);

  RETURN QUERY
  SELECT
    _exercise_id,
    _is_correct,
    _correct_choice,
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE daa.is_correct)::bigint
  FROM public.daily_exercise_answers daa
  WHERE daa.exercise_id = _exercise_id AND daa.answer_date = _today;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_daily_exercise_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_daily_exercise() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.submit_daily_exercise_answer(int) TO authenticated, anon;
