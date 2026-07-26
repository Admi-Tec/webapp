import { useRef } from "react";

// Cursor-follow 3D tilt for a card: sets --tilt-x/--tilt-y as the pointer
// moves, consumed by the .pillar-card CSS class (styles.css) so lift and
// tilt compose into one `transform` instead of fighting over the property.
// Imperative DOM writes (no state) so it never triggers a re-render on
// every mousemove — same pattern as useParallax.
export function usePointerTilt<T extends HTMLElement>(maxDeg = 6) {
  const ref = useRef<T>(null);

  function handleMove(e: React.MouseEvent<T>) {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty("--tilt-x", `${(px * maxDeg * 2).toFixed(2)}deg`);
    el.style.setProperty("--tilt-y", `${(-py * maxDeg * 2).toFixed(2)}deg`);
  }

  function handleLeave() {
    ref.current?.style.setProperty("--tilt-x", "0deg");
    ref.current?.style.setProperty("--tilt-y", "0deg");
  }

  return { ref, handleMove, handleLeave };
}
