-- The admin "Configuración general" screen for scoring defaults was removed
-- (unused) — the app now hardcodes +1/-1/0 as the default points config
-- shown when creating a new exam/template (still editable per exam). Drop the
-- now-unused app_settings table this fed, and align the exams table's own
-- column defaults so a direct insert (bypassing the app) gets the same
-- values.

DROP TABLE IF EXISTS public.app_settings;

ALTER TABLE public.exams
  ALTER COLUMN points_correct SET DEFAULT 1,
  ALTER COLUMN points_incorrect SET DEFAULT -1;
