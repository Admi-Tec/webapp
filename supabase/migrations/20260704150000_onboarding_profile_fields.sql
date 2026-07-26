
-- Onboarding wizard (first-login flow): additional profile fields.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS prep_time text,
  ADD COLUMN IF NOT EXISTS prep_method text,
  ADD COLUMN IF NOT EXISTS weekly_study_hours integer,
  ADD COLUMN IF NOT EXISTS initial_weak_topic_ids uuid[];

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_prep_time_check
    CHECK (prep_time IS NULL OR prep_time IN ('recien_empiezo', 'menos_3_meses', '3_a_6_meses', 'mas_6_meses'));

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_prep_method_check
    CHECK (prep_method IS NULL OR prep_method IN ('academia', 'autodidacta', 'colegio_particular', 'primera_vez'));

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_weekly_study_hours_check
    CHECK (weekly_study_hours IS NULL OR (weekly_study_hours >= 0 AND weekly_study_hours <= 168));

-- Don't force students who already have an account through the new wizard retroactively.
UPDATE public.profiles
SET onboarding_completed = true, onboarding_completed_at = now()
WHERE onboarding_completed = false;
