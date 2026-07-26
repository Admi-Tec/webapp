-- The "reto del día" widget only ever renders the statement (no image viewer,
-- no zoom) in a compact card meant to display well without scrolling, so
-- exclude exercises whose statement needs an accompanying image — they'd show
-- up incomplete/confusing without one. get_daily_exercise() and
-- submit_daily_exercise_answer() both resolve today's exercise through this
-- function, so filtering here is enough to keep both in sync.
CREATE OR REPLACE FUNCTION public.get_daily_exercise_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT e.id
  FROM public.exercises e
  WHERE e.statement_image_path IS NULL
  ORDER BY md5(e.id::text || (now() AT TIME ZONE 'America/Lima')::date::text)
  LIMIT 1;
$$;
