-- Marca cuándo se envió el correo de bienvenida a un estudiante nuevo.
-- NULL = todavía no se envió. El server function que lo dispara hace un
-- UPDATE ... WHERE welcome_email_sent_at IS NULL como "claim" atómico antes
-- de llamar a Brevo, así que aunque el cliente dispare la llamada más de una
-- vez (login con Google, doble tab, reintento) el correo solo sale una vez.
ALTER TABLE public.profiles
  ADD COLUMN welcome_email_sent_at TIMESTAMPTZ;
