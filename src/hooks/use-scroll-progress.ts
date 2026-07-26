import { useEffect, useRef } from "react";
import { subscribeScrollFrame } from "@/hooks/use-scroll-frame";

// Fraction (0-1) of the document's scrollable height that's been scrolled —
// drives the landing page's top progress rail. Writes transform directly to
// the returned element (imperative, no React state) instead of re-rendering
// the whole page on every scroll frame — same pattern as useParallax/
// usePointerTilt, and the one that matters most here since this page's
// component tree is large. `scaleX`, not `width`: width is a layout
// property (triggers reflow every scroll frame); scaleX is transform-only,
// so the browser only has to composite it. Registers with the shared
// scroll-frame dispatcher (use-scroll-frame.ts) instead of its own listener,
// so this and every useParallax layer update in the same single rAF pass.
// Kept active under prefers-reduced-motion (it's a position indicator, not
// decorative motion); only the CSS transition smoothing it is what
// reduced-motion trims, handled at the call site.
export function useScrollProgress<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const update = () => {
      const node = ref.current;
      if (!node) return;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
      node.style.transform = `scaleX(${progress})`;
    };
    update();
    return subscribeScrollFrame(update);
  }, []);

  return ref;
}
