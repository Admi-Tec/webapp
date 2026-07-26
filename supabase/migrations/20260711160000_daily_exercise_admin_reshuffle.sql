-- Lets an admin force a different "reto del día" pick from the UI instead of
-- bumping a hardcoded salt in a migration each time (see the two prior
-- reshuffle migrations). The picking hash now reads its seed from this
-- singleton settings row; incrementing it re-seeds the hash, changing
-- today's (and every future day's) deterministic pick.
CREATE TABLE public.daily_exercise_settings (
  id boolean PRIMARY KEY DEFAULT true,
  reshuffle_seed integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT daily_exercise_settings_singleton CHECK (id)
);
INSERT INTO public.daily_exercise_settings (id) VALUES (true);

-- No grants/policies for anon/authenticated: only ever touched through the
-- SECURITY DEFINER functions below, same as daily_exercise_answers.
ALTER TABLE public.daily_exercise_settings ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.daily_exercise_settings TO service_role;

CREATE OR REPLACE FUNCTION public.get_daily_exercise_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT e.id
  FROM public.exercises e, public.daily_exercise_settings s
  WHERE e.statement_image_path IS NULL
  ORDER BY md5(e.id::text || (now() AT TIME ZONE 'America/Lima')::date::text || s.reshuffle_seed::text)
  LIMIT 1;
$$;

-- Gated to admins inside the function itself (not just at the app layer),
-- matching get_exercise_review_queue's defense-in-depth pattern, since this
-- is exposed as a plain EXECUTE grant to `authenticated`.
CREATE OR REPLACE FUNCTION public.reshuffle_daily_exercise()
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _new_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  UPDATE public.daily_exercise_settings
  SET reshuffle_seed = reshuffle_seed + 1, updated_at = now()
  WHERE id = true;

  SELECT public.get_daily_exercise_id() INTO _new_id;
  RETURN _new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reshuffle_daily_exercise() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.reshuffle_daily_exercise() FROM PUBLIC, anon;
