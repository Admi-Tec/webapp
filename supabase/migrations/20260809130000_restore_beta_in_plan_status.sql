-- Corrección para instalaciones donde 20260809120000 ya fue aplicada:
-- la ampliación de get_plan_status() para Premium administrativo debe seguir
-- devolviendo el modo beta global, pues toPlanStatus() combina ambos accesos.

CREATE OR REPLACE FUNCTION public.get_plan_status()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _p public.profiles%ROWTYPE;
  _cfg public.app_config%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT * INTO _cfg FROM public.app_config WHERE id = true;
  SELECT * INTO _p FROM public.profiles WHERE id = _uid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'plan_type', 'free',
      'trial_used', false,
      'trial_ends_at', NULL,
      'premium_source', NULL,
      'premium_ends_at', NULL,
      'beta_mode', COALESCE(_cfg.beta_mode, false),
      'beta_ends_at', _cfg.beta_ends_at
    );
  END IF;

  IF _p.plan_type = 'premium'
     AND COALESCE(_p.premium_ends_at, _p.trial_ends_at) IS NOT NULL
     AND COALESCE(_p.premium_ends_at, _p.trial_ends_at) < now() THEN
    PERFORM set_config('app.allow_plan_change', '1', true);
    UPDATE public.profiles
    SET plan_type = 'free', premium_source = NULL,
        premium_ends_at = NULL, trial_ends_at = NULL
    WHERE id = _uid;
    _p.plan_type := 'free';
    _p.premium_source := NULL;
    _p.premium_ends_at := NULL;
    _p.trial_ends_at := NULL;
  END IF;

  RETURN jsonb_build_object(
    'plan_type', _p.plan_type,
    'trial_used', _p.trial_used,
    'trial_ends_at', _p.trial_ends_at,
    'premium_source', _p.premium_source,
    'premium_ends_at', _p.premium_ends_at,
    'beta_mode', COALESCE(_cfg.beta_mode, false),
    'beta_ends_at', _cfg.beta_ends_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_plan_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_plan_status() TO authenticated;
