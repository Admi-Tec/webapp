-- Freemium: plan del estudiante + prueba gratuita de Premium (7 días).
-- Fase sin pasarela de pago: los upgrades pagados se otorgan manualmente desde
-- Supabase (dashboard / service_role); por eso el trigger de protección solo
-- restringe los cambios hechos por el rol `authenticated`.

ALTER TABLE public.profiles
  ADD COLUMN plan_type TEXT NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'premium')),
  ADD COLUMN trial_used BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN trial_ends_at TIMESTAMPTZ;

-- Los campos de plan no pueden cambiarse con un INSERT/UPDATE directo del
-- cliente (con la política RLS "self update" un estudiante podría darse
-- premium a sí mismo vía PostgREST). Solo las funciones SECURITY DEFINER de
-- abajo (que setean app.allow_plan_change en su transacción) y los roles no
-- authenticated (dashboard, service_role) pueden tocarlos.
CREATE OR REPLACE FUNCTION public.protect_plan_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_setting('app.allow_plan_change', true) = '1' THEN
    RETURN NEW;
  END IF;
  IF (auth.jwt() ->> 'role') = 'authenticated' THEN
    IF TG_OP = 'INSERT' THEN
      -- Normaliza en vez de fallar: el upsert legítimo del perfil nunca envía
      -- estos campos, así que forzar los defaults no rompe ningún flujo real.
      NEW.plan_type := 'free';
      NEW.trial_used := false;
      NEW.trial_ends_at := NULL;
    ELSIF (
      NEW.plan_type IS DISTINCT FROM OLD.plan_type
      OR NEW.trial_used IS DISTINCT FROM OLD.trial_used
      OR NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at
    ) THEN
      RAISE EXCEPTION 'plan fields can only be changed through activate_premium_trial()';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_plan_columns_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_plan_columns();

-- Activa la prueba gratuita de 7 días. Única por estudiante: si trial_used ya
-- es true, falla — aunque la prueba haya vencido y el plan haya vuelto a free.
CREATE OR REPLACE FUNCTION public.activate_premium_trial()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _profile public.profiles%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  SELECT * INTO _profile FROM public.profiles WHERE id = _uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile not found';
  END IF;
  IF _profile.trial_used THEN
    RAISE EXCEPTION 'trial already used';
  END IF;
  IF _profile.plan_type = 'premium' THEN
    RAISE EXCEPTION 'already premium';
  END IF;

  PERFORM set_config('app.allow_plan_change', '1', true);
  UPDATE public.profiles
  SET plan_type = 'premium',
      trial_used = true,
      trial_ends_at = now() + INTERVAL '7 days'
  WHERE id = _uid;

  RETURN jsonb_build_object(
    'plan_type', 'premium',
    'trial_used', true,
    'trial_ends_at', now() + INTERVAL '7 days'
  );
END;
$$;

-- Estado del plan del estudiante actual. La reversión de una prueba vencida
-- ocurre aquí, en el momento en que se consulta el estado — no hace falta un
-- cron: ninguna pantalla concede premium sin pasar por esta función.
CREATE OR REPLACE FUNCTION public.get_plan_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _p public.profiles%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  SELECT * INTO _p FROM public.profiles WHERE id = _uid;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('plan_type', 'free', 'trial_used', false, 'trial_ends_at', NULL);
  END IF;

  -- trial_ends_at solo se setea en la prueba gratuita; un premium pagado
  -- (asignado manualmente) lo tiene en NULL y nunca se revierte aquí.
  IF _p.plan_type = 'premium' AND _p.trial_ends_at IS NOT NULL AND _p.trial_ends_at < now() THEN
    PERFORM set_config('app.allow_plan_change', '1', true);
    UPDATE public.profiles SET plan_type = 'free' WHERE id = _uid;
    _p.plan_type := 'free';
  END IF;

  RETURN jsonb_build_object(
    'plan_type', _p.plan_type,
    'trial_used', _p.trial_used,
    'trial_ends_at', _p.trial_ends_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.activate_premium_trial() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_plan_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.activate_premium_trial() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_plan_status() TO authenticated;
