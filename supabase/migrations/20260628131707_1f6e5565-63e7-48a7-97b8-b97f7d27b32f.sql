DROP POLICY IF EXISTS "exercises admin write" ON public.exercises;
DROP POLICY IF EXISTS "subtopics admin write" ON public.subtopics;
DROP POLICY IF EXISTS "topics admin write" ON public.topics;
DROP POLICY IF EXISTS "universities admin write" ON public.universities;

ALTER TYPE public.app_role RENAME TO app_role_old;
CREATE TYPE public.app_role AS ENUM ('student');

ALTER TABLE public.user_roles
  ALTER COLUMN role TYPE public.app_role
  USING role::text::public.app_role;

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role_old);
DROP TYPE public.app_role_old;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;