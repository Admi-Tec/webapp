import { useEffect, useState } from "react";

// Tracks which of the given element ids is currently the most "in focus"
// while scrolling — drives the landing page's side section nav. Event-driven
// (IntersectionObserver), not a scroll listener: it only recomputes when a
// section actually crosses the threshold instead of on every scroll frame,
// unlike useScrollProgress/useParallax which genuinely need per-frame math.
export function useActiveSection(ids: string[], threshold = 0.6) {
  const [activeId, setActiveId] = useState(ids[0] ?? "");

  useEffect(() => {
    const nodes = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // A fast scroll/snap jump can cross two thresholds in the same
        // tick — keep whichever entry is most visible so the active dot
        // always matches the section actually centered on screen.
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length === 0) return;
        const top = visible.reduce((a, b) => (b.intersectionRatio > a.intersectionRatio ? b : a));
        setActiveId(top.target.id);
      },
      { threshold },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
    // ids/threshold are expected to stay constant across a given hook call, like a config value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return activeId;
}
