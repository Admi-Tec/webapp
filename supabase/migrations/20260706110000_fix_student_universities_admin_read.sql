-- Bug fix: listAdminUniversities() (src/lib/admin.functions.ts) counts
-- students per university by reading `student_universities` through the
-- admin's own RLS-bound client. That table only ever had a self-only policy
-- ("student_universities self all", auth.uid() = user_id) — so an admin's
-- session always saw zero rows for every university (they're not the
-- student in any of those rows), showing "0 estudiantes" everywhere
-- regardless of real data. Add the missing admin-read policy, mirroring the
-- same pattern already used for exercise_ratings/exercise_reports.

CREATE POLICY "student_universities admin read" ON public.student_universities
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
