
-- Google OAuth profile sync (see plan "Sincronización con el perfil del estudiante").
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- Extend the existing signup trigger to also capture the avatar and to accept
-- either `full_name` or `name` depending on which the provider populates.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student');
  RETURN NEW;
END;
$$;

-- Keep avatar_url (and a still-empty full_name) in sync if identity metadata changes
-- after the profile row already exists — e.g. a student who registered with
-- email/password first later signs in with Google and Supabase links the identity,
-- or their Google profile photo changes. Never overwrites a full_name the student
-- already set themselves from the profile page.
CREATE OR REPLACE FUNCTION public.handle_user_identity_sync()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_avatar text;
BEGIN
  new_avatar := COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture');
  UPDATE public.profiles
  SET
    avatar_url = COALESCE(new_avatar, avatar_url),
    full_name = CASE
      WHEN COALESCE(full_name, '') = '' THEN COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', full_name)
      ELSE full_name
    END
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_metadata_updated ON auth.users;
CREATE TRIGGER on_auth_user_metadata_updated
AFTER UPDATE OF raw_user_meta_data ON auth.users
FOR EACH ROW
WHEN (NEW.raw_user_meta_data IS DISTINCT FROM OLD.raw_user_meta_data)
EXECUTE FUNCTION public.handle_user_identity_sync();

REVOKE EXECUTE ON FUNCTION public.handle_user_identity_sync() FROM PUBLIC, anon, authenticated;
