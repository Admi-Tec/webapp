import { useEffect, useRef, useState } from "react";

// Unlike useInViewOnce (latches true forever on first sight, for entrance
// reveals that must never replay), this toggles both ways — true while
// actually intersecting, false once scrolled past. For anything that should
// only animate while genuinely on screen (e.g. an infinite-loop cue): an
// `infinite` CSS animation gated by a one-shot "has ever been seen" flag
// keeps running forever after the element leaves the viewport, and those
// accumulate the further a user scrolls.
export function useInViewport<T extends Element>(threshold = 0.1) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold,
    });
    observer.observe(node);
    return () => observer.disconnect();
    // threshold is expected to stay constant across a given hook call, like a config value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ref, inView };
}
