// The single scroll/resize listener + single requestAnimationFrame for
// every scroll-driven visual update on the page (parallax offsets, the
// scroll-progress rail, ...). Each caller registers a plain callback; a
// scroll or resize tick schedules at most one rAF, and that one frame runs
// every registered callback in turn. This is what keeps the landing page at
// exactly one scroll listener no matter how many scroll-driven widgets are
// mounted — useParallax and useScrollProgress each register one callback
// here instead of owning their own listener.
const callbacks = new Set<() => void>();
let rafId = 0;
let listenersAttached = false;

function runFrame() {
  rafId = 0;
  callbacks.forEach((cb) => cb());
}

function scheduleFrame() {
  if (rafId) return;
  rafId = requestAnimationFrame(runFrame);
}

function attachListeners() {
  if (listenersAttached) return;
  listenersAttached = true;
  window.addEventListener("scroll", scheduleFrame, { passive: true });
  window.addEventListener("resize", scheduleFrame);
}

function detachListenersIfIdle() {
  if (callbacks.size > 0) return;
  listenersAttached = false;
  window.removeEventListener("scroll", scheduleFrame);
  window.removeEventListener("resize", scheduleFrame);
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
}

export function subscribeScrollFrame(callback: () => void) {
  callbacks.add(callback);
  attachListeners();
  scheduleFrame();
  return () => {
    callbacks.delete(callback);
    detachListenersIfIdle();
  };
}
