import { useEffect, useRef } from "react";

// Watches a sentinel element (render it right after the last list item) and
// calls `onIntersect` whenever it scrolls into view — re-arms itself each
// time, unlike useInViewOnce, since an infinite-scroll list needs to fire
// this repeatedly (page 2, 3, 4...) rather than once. `enabled` is the
// caller's job to gate on `hasNextPage && !isFetchingNextPage`, so a fetch
// already in flight (or a genuinely exhausted list) can't trigger another.
export function useInfiniteScrollTrigger<T extends HTMLElement>(
  onIntersect: () => void,
  enabled: boolean,
) {
  const ref = useRef<T>(null);
  // Ref, not a dep on the callback itself — the callers below pass a fresh
  // fetchNextPage-wrapping closure each render, which would otherwise tear
  // down and recreate the observer on every render for no reason.
  const onIntersectRef = useRef(onIntersect);
  onIntersectRef.current = onIntersect;

  useEffect(() => {
    const node = ref.current;
    if (!node || !enabled) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onIntersectRef.current();
      },
      // Fires ~400px before the sentinel is actually on-screen, so the next
      // page is usually ready by the time the user scrolls to the bottom.
      { rootMargin: "400px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled]);

  return ref;
}
