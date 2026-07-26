-- Removes the automatic admin-grant backdoor introduced in
-- 20260629201717_0ea192ce-4ed5-420f-b01c-31cb9f7adf99.sql, which silently
-- promoted any account signing up as 'admin@mathpre.edu' to the admin role.
--
-- After this migration there is no remaining mechanism anywhere in this
-- codebase that inserts into public.user_roles with role = 'admin'. Future
-- admins must be granted manually, e.g.:
--   INSERT INTO public.user_roles (user_id, role) VALUES ('<uuid>', 'admin')
--   ON CONFLICT (user_id, role) DO NOTHING;

DROP TRIGGER IF EXISTS on_auth_user_created_grant_admin ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_confirmed_grant_admin ON auth.users;
DROP FUNCTION IF EXISTS public.grant_admin_for_designated_email();
