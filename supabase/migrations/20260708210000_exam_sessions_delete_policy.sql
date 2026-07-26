-- Students can delete their own exam_sessions (used by the "delete attempt" feature
-- so they can free up a used attempt on single/max-attempt exams; deleting a session
-- also removes it from every ranking/stats RPC, since those read exam_sessions live).
-- Delete was already implicitly allowed via the original "exam_sessions self all" FOR ALL
-- policy, but that policy predates the explicit select/insert/update split added in
-- 20260630193643 — add the matching explicit delete policy for parity and to avoid
-- silently losing delete access if that legacy FOR ALL policy is ever cleaned up.
CREATE POLICY "Users manage own exam sessions delete" ON public.exam_sessions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
