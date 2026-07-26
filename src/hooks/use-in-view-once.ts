import { useEffect, useRef, useState } from "react";

// Flips to true the first time the element scrolls into view, then stops
// observing — for gating an entrance animation, never content visibility
// (the element must already render normally regardless of this flag).
export function useInViewOnce<T extends Element>(threshold = 0.5) {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(node);
    return () => observer.disconnect();
    // threshold is expected to stay constant across a given hook call, like a config value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ref, visible };
}
