import { useEffect, useRef } from "react";
import { subscribeScrollFrame } from "@/hooks/use-scroll-frame";

// Ties an element's translateY to how far it sits from viewport center while
// scrolling, exposed as the --parallax-y custom property (consumer decides
// how much of it to use via `translateY(var(--parallax-y, 0px))`). Disabled
// outright under prefers-reduced-motion, like the rest of the landing's motion.
//
// The homepage stacks up to a dozen of these (hero glows, section watermarks,
// section photos). All targets share ONE registration with the app-wide
// scroll-frame dispatcher (use-scroll-frame.ts) instead of each instance
// owning a listener: every mounted target's geometry is read first, then
// every write happens, so a single scroll tick does one batched read/write
// pass no matter how many parallax layers are on screen — not an interleaved
// read/write per layer (classic layout thrashing).
type ParallaxTarget = {
  node: HTMLElement;
  speed: number;
  maxPx: number;
};

const targets = new Set<ParallaxTarget>();
let unsubscribe: (() => void) | null = null;

function updateAll() {
  const viewportHeight = window.innerHeight;
  // Read phase — every target's geometry, before any style is touched.
  const offsets = new Map<ParallaxTarget, number>();
  targets.forEach((target) => {
    const rect = target.node.getBoundingClientRect();
    const center = rect.top + rect.height / 2 - viewportHeight / 2;
    offsets.set(target, Math.max(-target.maxPx, Math.min(target.maxPx, -center * target.speed)));
  });
  // Write phase.
  offsets.forEach((offset, target) => {
    target.node.style.setProperty("--parallax-y", `${offset.toFixed(1)}px`);
  });
}

function registerTarget(target: ParallaxTarget) {
  targets.add(target);
  if (!unsubscribe) unsubscribe = subscribeScrollFrame(updateAll);
  updateAll();
}

function unregisterTarget(target: ParallaxTarget) {
  targets.delete(target);
  if (targets.size === 0 && unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}

export function useParallax<T extends HTMLElement>(speed = 0.06, maxPx = 40) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const target: ParallaxTarget = { node, speed, maxPx };
    registerTarget(target);

    return () => unregisterTarget(target);
    // speed/maxPx are expected to stay constant across a given hook call, like a config value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return ref;
}
