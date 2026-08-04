-- Fix: set leaderboard_opt_in default to false for new profiles.
-- Existing users keep their current opt-in value.

ALTER TABLE public.profiles
  ALTER COLUMN leaderboard_opt_in SET DEFAULT false;
