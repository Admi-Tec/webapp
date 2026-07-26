-- Requiring only "at least one" of university/exam/career on min_scores let
-- an admin save an incomplete row (e.g. university+exam but no career) that
-- silently outranked a more specific one for some students and looked
-- "ignored" for others depending on the specificity-resolution order. Make
-- all three mandatory instead: a min score is always defined for one exact
-- (university, exam, career) combination, so resolution becomes a plain
-- equality lookup — no wildcard/specificity logic needed anymore.

-- Any existing row missing a dimension can't be migrated to the new shape
-- meaningfully; it was seeded/test data, so it's dropped rather than guessed at.
DELETE FROM public.min_scores
WHERE university_id IS NULL OR exam_id IS NULL OR career_id IS NULL;

ALTER TABLE public.min_scores
  ALTER COLUMN university_id SET NOT NULL,
  ALTER COLUMN exam_id SET NOT NULL,
  ALTER COLUMN career_id SET NOT NULL,
  DROP CONSTRAINT IF EXISTS min_scores_at_least_one_dim;

-- One min score per exact (university, exam, career) triple.
ALTER TABLE public.min_scores
  ADD CONSTRAINT min_scores_unique_combo UNIQUE (university_id, exam_id, career_id);

-- No longer needed: resolution is now a direct equality lookup done in the
-- app layer against a fully public-read table, not a specificity search.
DROP FUNCTION IF EXISTS public.get_applicable_min_score(uuid, uuid, uuid);
