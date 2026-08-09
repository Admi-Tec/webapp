-- Gestión de estudiantes desde el panel administrador.
-- La identidad/correo y el bloqueo de login siguen viviendo en auth.users;
-- estas columnas guardan el estado visible para la aplicación y su auditoría.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS premium_source text
    CHECK (premium_source IN ('trial', 'admin')),
  ADD COLUMN IF NOT EXISTS premium_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS pseudonym_change_required boolean NOT NULL DEFAULT false;

-- Migra las pruebas ya activas al modelo explícito sin alterar su vencimiento.
UPDATE public.profiles
SET premium_source = 'trial', premium_ends_at = trial_ends_at
WHERE plan_type = 'premium' AND trial_ends_at IS NOT NULL AND premium_source IS NULL;

CREATE TABLE IF NOT EXISTS public.admin_student_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES auth.users(id),
  student_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN (
    'plan_changed', 'account_suspended', 'account_reactivated',
    'pseudonym_reset', 'pseudonym_change_required'
  )),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_student_audit_student_idx
  ON public.admin_student_audit_log (student_user_id, created_at DESC);

GRANT SELECT, INSERT ON public.admin_student_audit_log TO authenticated;
GRANT ALL ON public.admin_student_audit_log TO service_role;
ALTER TABLE public.admin_student_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student audit admin read" ON public.admin_student_audit_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "student audit admin insert" ON public.admin_student_audit_log
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin') AND admin_user_id = auth.uid()
  );

-- El trigger de protección también cubre los nuevos campos de acceso.
CREATE OR REPLACE FUNCTION public.protect_plan_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_setting('app.allow_plan_change', true) = '1' THEN RETURN NEW; END IF;
  IF (auth.jwt() ->> 'role') = 'authenticated' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.plan_type := 'free';
      NEW.trial_used := false;
      NEW.trial_ends_at := NULL;
      NEW.premium_source := NULL;
      NEW.premium_ends_at := NULL;
    ELSIF (
      NEW.plan_type IS DISTINCT FROM OLD.plan_type OR
      NEW.trial_used IS DISTINCT FROM OLD.trial_used OR
      NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at OR
      NEW.premium_source IS DISTINCT FROM OLD.premium_source OR
      NEW.premium_ends_at IS DISTINCT FROM OLD.premium_ends_at
    ) THEN
      RAISE EXCEPTION 'plan fields can only be changed through trusted functions';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Mantiene compatibilidad con el flujo de prueba existente y registra origen.
CREATE OR REPLACE FUNCTION public.activate_premium_trial()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _profile public.profiles%ROWTYPE;
  _ends_at timestamptz := now() + interval '7 days';
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO _profile FROM public.profiles WHERE id = _uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'profile not found'; END IF;
  IF _profile.trial_used THEN RAISE EXCEPTION 'trial already used'; END IF;
  IF _profile.plan_type = 'premium' THEN RAISE EXCEPTION 'already premium'; END IF;
  PERFORM set_config('app.allow_plan_change', '1', true);
  UPDATE public.profiles SET
    plan_type = 'premium', trial_used = true, trial_ends_at = _ends_at,
    premium_source = 'trial', premium_ends_at = _ends_at
  WHERE id = _uid;
  RETURN jsonb_build_object('plan_type', 'premium', 'trial_used', true,
    'trial_ends_at', _ends_at, 'premium_source', 'trial', 'premium_ends_at', _ends_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_plan_status()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _p public.profiles%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO _p FROM public.profiles WHERE id = _uid;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('plan_type','free','trial_used',false,'trial_ends_at',NULL,
      'premium_source',NULL,'premium_ends_at',NULL);
  END IF;
  IF _p.plan_type = 'premium' AND COALESCE(_p.premium_ends_at, _p.trial_ends_at) IS NOT NULL
     AND COALESCE(_p.premium_ends_at, _p.trial_ends_at) < now() THEN
    PERFORM set_config('app.allow_plan_change', '1', true);
    UPDATE public.profiles SET plan_type='free', premium_source=NULL,
      premium_ends_at=NULL, trial_ends_at=NULL WHERE id=_uid;
    _p.plan_type := 'free'; _p.premium_source := NULL;
    _p.premium_ends_at := NULL; _p.trial_ends_at := NULL;
  END IF;
  RETURN jsonb_build_object('plan_type',_p.plan_type,'trial_used',_p.trial_used,
    'trial_ends_at',_p.trial_ends_at,'premium_source',_p.premium_source,
    'premium_ends_at',_p.premium_ends_at);
END;
$$;
