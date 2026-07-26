// Landing-only celebratory burst for the primary "Crear cuenta gratis" click
// — the one gamified-adjacent moment the brand allows (see DESIGN.md's CTA
// Bounce Exception), scoped to the actual conversion action, not decoration.
// Dynamically imported so canvas-confetti never ships in the initial bundle.
export async function fireConfetti() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const { default: confetti } = await import("canvas-confetti");
  confetti({
    particleCount: 120,
    spread: 70,
    origin: { y: 0.6 },
    // Ámbar / Teal / Tinta — la paleta de marca, no confetti arcoíris genérico.
    colors: ["#F2C63C", "#5BC0B8", "#101D33"],
  });
}
