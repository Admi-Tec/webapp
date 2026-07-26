import { useState } from "react";

export type SaveFeedback = "idle" | "accepted" | "refused";

// Drives the accept/refuse micro-interaction on a form's submit button (checkmark
// pop vs. shake — see .animate-icon-pop / .animate-shake in styles.css). Shared by
// every admin CRUD form and the student profile form so the timing stays identical
// everywhere: an "accepted" flash holds long enough to read before anything else
// happens (dialog close, navigation), a "refused" one is just long enough to notice.
export function useSaveFeedback() {
  const [feedback, setFeedback] = useState<SaveFeedback>("idle");

  function flash(state: "accepted" | "refused") {
    setFeedback(state);
    setTimeout(() => setFeedback("idle"), state === "accepted" ? 1800 : 500);
  }

  return [feedback, flash] as const;
}
