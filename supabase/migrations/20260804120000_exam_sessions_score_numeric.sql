-- Fix: allow decimal exam scores in exam_sessions.
-- The points-per-question scoring system can produce non-integer scores (e.g.
-- 81.25), so the score column must be numeric instead of integer.

ALTER TABLE public.exam_sessions
  ALTER COLUMN score TYPE numeric USING score::numeric;
