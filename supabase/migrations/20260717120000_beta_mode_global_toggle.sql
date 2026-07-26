-- Modo beta global: mientras esté activo, TODOS los estudiantes tienen acceso
-- Premium completo, sin importar su plan_type individual. Se activa/desactiva
-- editando esta fila directamente desde Supabase Studio (sin panel admin ni
-- redeploy) -- mismo patrón singleton que daily_exercise_settings.
-- Arranca desactivada a propósito: activarla es un paso manual aparte (ver
-- instrucciones de activación), para poder verificar banner, Planes y RPCs en
-- producción antes de que un estudiante vea la beta.
CREATE TABLE public.app_config (
  id boolean PRIMARY KEY DEFAULT true,
  beta_mode boolean NOT NULL DEFAULT false,
  beta_ends_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_config_singleton CHECK (id)
);
INSERT INTO public.app_config (id, beta_mode, beta_ends_at) VALUES (true, false, NULL);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.app_config TO service_role;

-- get_plan_status(): agrega beta_mode/beta_ends_at al JSON de retorno en el
-- mismo round-trip, para que isPremium (calculado en toStatus(), TS) combine
-- plan_type real + beta sin una llamada RPC adicional.
CREATE OR REPLACE FUNCTION public.get_plan_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _p public.profiles%ROWTYPE;
  _cfg public.app_config%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT * INTO _cfg FROM public.app_config WHERE id = true;

  SELECT * INTO _p FROM public.profiles WHERE id = _uid;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'plan_type', 'free',
      'trial_used', false,
      'trial_ends_at', NULL,
      'beta_mode', COALESCE(_cfg.beta_mode, false),
      'beta_ends_at', _cfg.beta_ends_at
    );
  END IF;

  IF _p.plan_type = 'premium' AND _p.trial_ends_at IS NOT NULL AND _p.trial_ends_at < now() THEN
    PERFORM set_config('app.allow_plan_change', '1', true);
    UPDATE public.profiles SET plan_type = 'free' WHERE id = _uid;
    _p.plan_type := 'free';
  END IF;

  RETURN jsonb_build_object(
    'plan_type', _p.plan_type,
    'trial_used', _p.trial_used,
    'trial_ends_at', _p.trial_ends_at,
    'beta_mode', COALESCE(_cfg.beta_mode, false),
    'beta_ends_at', _cfg.beta_ends_at
  );
END;
$$;

-- Estado público de la beta (sin auth): alimenta el banner sitewide, visible
-- también en la landing pública para visitantes sin sesión. No expone nada
-- sensible -- las mismas dos columnas globales que get_plan_status().
CREATE OR REPLACE FUNCTION public.get_beta_status()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'beta_mode', COALESCE(beta_mode, false),
    'beta_ends_at', beta_ends_at
  )
  FROM public.app_config WHERE id = true;
$$;

REVOKE ALL ON FUNCTION public.get_beta_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_beta_status() TO anon, authenticated;
