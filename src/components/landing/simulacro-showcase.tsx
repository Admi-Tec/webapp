import { useInViewOnce } from "@/hooks/use-in-view-once";
import { useCountUp } from "@/hooks/use-count-up";
import { cn } from "@/lib/utils";

/**
 * Resultado de simulacro de ejemplo — el centro de atención de la sección de
 * pilares. Cada insignia numerada (1·2·3) señala dónde aparece cada pilar
 * dentro del resultado real; `highlightPillar` lo controla el carrusel
 * arrastrable de al lado (FeatureCarousel), siempre con una tarjeta
 * centrada. El bloque activo se resalta con más fuerza y los otros dos se
 * opacan — el resaltado enfoca la mirada en la parte que el estudiante
 * eligió, en vez de dejar los tres bloques compitiendo por igual. Cada
 * bloque también es clicable (`onSelectPillar`): hacer clic mueve el
 * carrusel hasta la tarjeta correspondiente para revisar la explicación.
 * Los datos siguen siendo `aria-hidden` (decorativos, el dato real vive en
 * la app) — la misma acción ya es accesible vía los puntos del carrusel, así
 * que estos bloques quedan como atajo solo para mouse/touch, sin robarle
 * foco de teclado a un control que un lector de pantalla no puede describir.
 */

const FREQUENT_TOPICS = [
  { name: "🔥 Funciones", pct: "38%" },
  { name: "🔥 Matrices y determinantes", pct: "22%" },
  { name: "🔥 Teoría de conjuntos", pct: "44%" },
];

function PillarBadge({ n }: { n: number }) {
  return (
    <span
      aria-label={`Pilar ${n}`}
      className="font-data grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-[0_0_0_3px_oklch(0.83_0.16_92_/_0.25)]"
    >
      {n}
    </span>
  );
}

// Estructura siempre presente (mismo padding/márgenes), solo cambian tinte,
// anillo y opacidad — para no causar layout shift al activarse. El bloque
// elegido se resalta con más fuerza (tinte + anillo); los otros dos se
// opacan para que la mirada no compita entre los tres — el mismo "focus
// pull" que ya usan las tarjetas del carrusel de al lado. Cada bloque
// también es clicable (cursor-pointer + un tinte sutil en hover que sólo
// aparece si el bloque no está ya activo) para saltar directo a esa tarjeta.
const blockState = (active: boolean, hasSelection: boolean) =>
  cn(
    "pillar-link-block -mx-3 cursor-pointer rounded-md px-3",
    active && "bg-primary/[0.16] ring-2 ring-primary/60",
    !active && hasSelection && "pillar-link-block-dim",
    !active && "hover:bg-primary/[0.04]",
  );

export function SimulacroShowcase({
  highlightPillar,
  onSelectPillar,
}: {
  highlightPillar?: number | null;
  onSelectPillar?: (n: number) => void;
}) {
  const { ref, visible } = useInViewOnce<HTMLDivElement>(0.3);
  const score = useCountUp(1059, visible, 2000);
  const hasSelection = highlightPillar != null;

  return (
    <div ref={ref} className="w-full">
      {/* Marco de navegador: la sección se lee como una captura real del
          producto, no como una tarjeta de marketing más — refuerzo de
          "esto existe de verdad" para quien recién llega. */}
      <div
        className={cn(
          "at",
          visible && "animate-fade-up",
          "relative overflow-hidden rounded-xl bg-muted/60 shadow-[0_8px_8px_-4px_rgba(15,23,42,0.4)]",
        )}
        style={{ "--i": 2 } as React.CSSProperties}
      >
        <div className="flex items-center gap-3 border-b border-border px-3 py-2 sm:px-4 sm:py-2.5">
          <div className="flex gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-destructive/40" />
            <span className="h-2.5 w-2.5 rounded-full bg-primary/40" />
            <span className="h-2.5 w-2.5 rounded-full bg-success/40" />
          </div>
          <span className="font-data flex-1 truncate rounded-md bg-card px-3 py-1 text-center text-[0.65rem] text-muted-foreground">
            admi-tec.com/simulacro
          </span>
        </div>

        <div
          className={cn(
            "relative overflow-hidden rounded-b-xl bg-card shadow-[0_0_0_1px_rgba(0,0,0,0.2)]",
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-b border-border px-4 py-2.5 sm:px-5 sm:py-3.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-2 w-2 rounded-full bg-primary" aria-hidden />
              <span className="font-data text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground sm:text-[0.7rem]">
                Simulacro UNMSM · Resultado
              </span>
            </div>
            <span className="font-data rounded-md border border-success/50 bg-success/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-success sm:text-[0.65rem]">
              Ingresarías
            </span>
          </div>

          <div aria-hidden className="px-4 py-4 sm:px-5 sm:py-5">
            {/* 1 · Puntaje real vs. mínimo de ingreso */}
            <div
              onClick={() => onSelectPillar?.(1)}
              className={blockState(highlightPillar === 1, hasSelection)}
            >
              <div className="flex items-center justify-between gap-3 py-1">
                <p className="font-data text-[0.7rem] uppercase tracking-[0.12em] text-muted-foreground">
                  Tu puntaje
                </p>
                <PillarBadge n={1} />
              </div>
              <p className="font-data mt-1 text-3xl font-bold tabular-nums sm:text-4xl">
                {score} <span className="text-base text-muted-foreground sm:text-lg">pts</span>
              </p>

              <div className="relative mt-3 h-2.5 rounded-full bg-muted sm:mt-5 sm:h-3">
                {/* max-sm:transition-none: en celular el ancho salta directo
                    a su valor final sin animar (mismo criterio que el resto
                    de animaciones de landing apagadas bajo 640px) — la barra
                    sigue llegando a 55%, solo que sin el barrido de 1s. */}
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-out max-sm:transition-none"
                  style={{ width: visible ? "55%" : "0%" }}
                />
                {/* Línea del mínimo al 52% */}
                <div className="absolute -top-1.5 bottom-[-6px] left-[52%] w-0.5 rounded bg-foreground/70" />
              </div>
              <div className="mt-2 flex flex-col gap-0.5 text-xs sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                <span className="text-muted-foreground">0</span>
                <span className="font-data font-semibold text-foreground sm:text-right">
                  Puntaje mínimo de ingreso · Ing. Civil: 1047 pts
                </span>
              </div>

              <div className="mt-2.5 flex items-center gap-2 rounded-md border border-success/40 bg-success/10 px-3 py-1.5 text-xs font-semibold text-success sm:mt-3 sm:py-2">
                ⭐ +12 pts sobre el puntaje mínimo del año pasado
              </div>
            </div>

            {/* 2 · Los temas que más se repiten */}
            <div
              onClick={() => onSelectPillar?.(2)}
              className={cn(
                "mt-3 border-t border-border pt-2.5 sm:mt-4 sm:pt-3",
                blockState(highlightPillar === 2, hasSelection),
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-data text-[0.65rem] uppercase tracking-[0.1em] text-muted-foreground sm:text-[0.7rem] sm:tracking-[0.12em]">
                  Los 3 temas más frecuentes del curso de Álgebra
                </p>
                <PillarBadge n={2} />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {FREQUENT_TOPICS.map((t) => (
                  <span
                    key={t.name}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    {t.name}
                    <span className="font-data font-semibold text-primary">{t.pct}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* 3 · Tu ritmo por pregunta */}
            <div
              onClick={() => onSelectPillar?.(3)}
              className={cn(
                "mt-3 border-t border-border pt-2.5 sm:mt-4 sm:pt-3",
                blockState(highlightPillar === 3, hasSelection),
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-data text-[0.65rem] uppercase tracking-[0.1em] text-muted-foreground sm:text-[0.7rem] sm:tracking-[0.12em]">
                  Tiempo que pasaste en la pregunta 23 del curso de Álgebra
                </p>
                <PillarBadge n={3} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <p className="font-data text-sm font-bold tabular-nums">⌛ 1m 12 s</p>
                <span className="text-xs font-normal text-muted-foreground sm:text-sm">
                  · promedio 1m 38s
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
