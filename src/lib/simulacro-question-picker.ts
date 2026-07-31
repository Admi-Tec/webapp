// Picks `count` questions for one exam_template_rule out of its exercise
// pool, preferring exercises this student hasn't seen in a prior session of
// the same template — only falling back to already-seen ones when the pool
// doesn't have enough fresh questions. Extracted out of startExamSession's
// handler (exams.functions.ts, no Supabase/server imports here) so the
// selection logic itself can be unit tested — see
// simulacro-question-picker.test.ts.
export function defaultShuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export function pickTemplateQuestions(
  pool: string[],
  seen: ReadonlySet<string>,
  count: number,
  shuffle: <T>(arr: T[]) => T[] = defaultShuffle,
): string[] {
  const unseen = pool.filter((id) => !seen.has(id));
  const alreadySeen = pool.filter((id) => seen.has(id));
  const picked: string[] = [];
  picked.push(...shuffle(unseen).slice(0, count));
  if (picked.length < count) {
    picked.push(...shuffle(alreadySeen).slice(0, count - picked.length));
  }
  return picked;
}
