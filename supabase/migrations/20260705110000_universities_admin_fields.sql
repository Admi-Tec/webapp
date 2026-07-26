-- Admin university management (see plan-gestion-universidades.md): add the
-- fields the admin CRUD needs that don't exist yet, and enforce unique names
-- so duplicate universities can't be created from the admin form.

ALTER TABLE public.universities
  ADD COLUMN IF NOT EXISTS logo_path text,
  ADD COLUMN IF NOT EXISTS exam_date date,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS universities_name_unique ON public.universities (lower(name));
