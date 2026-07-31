// Points-per-question scoring (see plan-sistema-puntajes.md). The three point
// values are always parameters, never hardcoded here — they come from the
// specific exam/template's own points_correct/incorrect/empty config (or, for
// the rare exam_id-less session, the app-wide default config). This is the
// only formula in the codebase that turns a correct/incorrect/empty count
// into a score; the result is clamped to 0 (a student's score is never shown
// as negative, even though the raw formula can go below zero internally).
//
// Extracted into its own file (no Supabase/server imports) so it can be unit
// tested directly — see exam-scoring.test.ts.
export const FALLBACK_SCORING = { correct: 1, incorrect: -1, empty: 0 };

export function computeExamScore(
  counts: { correct: number; incorrect: number; empty: number },
  points: { correct: number; incorrect: number; empty: number },
): number {
  const raw =
    counts.correct * points.correct +
    counts.incorrect * points.incorrect +
    counts.empty * points.empty;
  return Math.max(0, raw);
}
