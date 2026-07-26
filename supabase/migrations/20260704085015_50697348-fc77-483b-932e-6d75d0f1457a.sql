
REVOKE EXECUTE ON FUNCTION public.get_university_leaderboard(uuid, int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_exam_leaderboard(uuid, int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_exam_stats(uuid, numeric) FROM PUBLIC, anon;
