// Particle field kept as static data (not random per-render) so SSR and the
// client agree on layout — a `Math.random()` here would cause a hydration
// mismatch. Positions/timings are hand-picked to feel scattered, not gridded.
const PARTICLES = [
  { top: "8%", left: "12%", size: 3, duration: "4.5s", delay: "0s", color: "primary" },
  { top: "18%", left: "82%", size: 2, duration: "3.8s", delay: "-1.2s", color: "success" },
  { top: "32%", left: "6%", size: 2, duration: "5.2s", delay: "-2.5s", color: "success" },
  { top: "42%", left: "92%", size: 3, duration: "4.1s", delay: "-0.6s", color: "primary" },
  { top: "58%", left: "18%", size: 2, duration: "4.8s", delay: "-3.1s", color: "primary" },
  { top: "68%", left: "88%", size: 3, duration: "3.6s", delay: "-1.8s", color: "success" },
  { top: "78%", left: "10%", size: 2, duration: "5.5s", delay: "-2.2s", color: "primary" },
  { top: "88%", left: "70%", size: 2, duration: "4.3s", delay: "-0.9s", color: "success" },
  { top: "22%", left: "48%", size: 2, duration: "6s", delay: "-3.6s", color: "primary" },
  { top: "94%", left: "40%", size: 3, duration: "4.6s", delay: "-1.5s", color: "success" },
] as const;

/**
 * Site-wide ambient backdrop for the landing page: a soft aurora-style
 * gradient mesh, a few drifting light particles, and a static noise texture
 * — fixed behind every section so the page feels alive at rest, not just at
 * scroll-triggered moments. Deliberately constrained to the page's only two
 * allowed hues (amber/teal, see DESIGN.md's One Pencil Rule) at low opacity:
 * "premium ambient," never a second decorative color or a distraction from
 * the content sitting on top of it.
 */
export function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Aurora mesh: three large, heavily blurred blobs that drift and
          slowly change shape — never fast enough to read as "moving,"
          just enough that the canvas doesn't feel static. No parallax here
          on purpose: this backdrop is `fixed` (stays glued to the viewport),
          so a scroll-position-based transform would never have visibly
          changed anything — a useParallax() call here was dead weight
          (getBoundingClientRect() reads on every scroll frame for zero
          visual effect), removed rather than wired up, to avoid changing
          the look. */}
      <div
        className="animate-float animate-blob-morph absolute -left-[10%] top-[5%] h-[34rem] w-[34rem] bg-primary/[0.07] blur-[100px]"
        style={
          {
            "--float-x": "-24px",
            "--float-y": "18px",
            "--float-duration": "16s",
            "--blob-duration": "22s",
          } as React.CSSProperties
        }
      />
      <div
        className="animate-float animate-blob-morph absolute right-[-8%] top-[35%] h-[30rem] w-[30rem] bg-success/[0.06] blur-[110px]"
        style={
          {
            "--float-x": "20px",
            "--float-y": "-22px",
            "--float-duration": "19s",
            "--float-delay": "-4s",
            "--blob-duration": "26s",
            "--blob-delay": "-6s",
          } as React.CSSProperties
        }
      />
      <div
        className="animate-float animate-blob-morph absolute bottom-[8%] left-[22%] h-[26rem] w-[26rem] bg-primary/[0.05] blur-[100px]"
        style={
          {
            "--float-x": "16px",
            "--float-y": "20px",
            "--float-duration": "21s",
            "--float-delay": "-9s",
            "--blob-duration": "24s",
            "--blob-delay": "-12s",
          } as React.CSSProperties
        }
      />

      {/* Light particles: sparse, small, twinkling — a texture cue, not
          confetti (static count, no burst, no physics). */}
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="animate-twinkle absolute rounded-full"
          style={
            {
              top: p.top,
              left: p.left,
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: p.color === "primary" ? "var(--primary)" : "var(--success)",
              "--twinkle-duration": p.duration,
              "--twinkle-delay": p.delay,
              "--twinkle-min": "0.1",
              "--twinkle-max": "0.55",
            } as React.CSSProperties
          }
        />
      ))}

      {/* Static grain on top of everything else in this layer. */}
      <div className="noise-texture absolute inset-0" />
    </div>
  );
}
