import { useRef, useState } from "react";
import { Gauge, ListChecks, Target } from "lucide-react";
import { useInViewOnce } from "@/hooks/use-in-view-once";
import { SimulacroShowcase } from "@/components/landing/simulacro-showcase";
import { FeatureCarousel } from "@/components/landing/feature-carousel";
import { cn } from "@/lib/utils";

/**
 * Los 3 pilares diferenciadores del producto sobre papel claro (.at-paper).
 * El simulacro de ejemplo (SimulacroShowcase) es el centro de atención de la
 * sección; a la derecha, un carrusel arrastrable (FeatureCarousel) deja al
 * estudiante deslizar entre los 3 pilares — el pilar centrado resalta el
 * bloque que le corresponde dentro del simulacro real, haciendo visible la
 * relación "esto que lees es exactamente lo que verás".
 */

// Una sola frase resaltada por pilar — la afirmación que el visitante debe
// retener — en tinta semibold, nunca en ámbar (reservado para acciones).
const em = "font-semibold text-foreground";

const PILLARS: Array<{
  title: string;
  text: React.ReactNode;
  Icon: typeof Target;
}> = [
  {
    title: "Tu puntaje real, tu meta real",
    text: (
      <>
        Cada simulacro se corrige con el sistema de puntos del examen real (las respuestas correctas suman, las
        incorrectas restan), y se compara con el puntaje mínimo de ingreso de tu carrera. No sabes si "vas
        bien", <strong className={em}>sabes si hoy ingresarías</strong>.
      </>
    ),
    Icon: Target,
  },
  {
    title: "Estudia lo que de verdad se pregunta",
    text: (
      <>
        Analizamos los exámenes oficiales de tu universidad y te mostramos{" "}
        <strong className={em}>los temas que más se repiten en el examen</strong>. Tus horas de
        estudio van donde hay puntos, no donde el índice del libro diga.
      </>
    ),
    Icon: ListChecks,
  },
  {
    title: "Conoce tu propio ritmo",
    text: (
      <>
        Medimos <strong className={em}>cuánto te toma cada pregunta</strong> y lo comparamos con el
        tiempo promedio de todos los postulantes que la resolvieron. La velocidad se entrena, pero primero hay que
        poder verla.
      </>
    ),
    Icon: Gauge,
  },
];

export function PillarsSection({ sectionActive }: { sectionActive: boolean }) {
  const { ref, visible } = useInViewOnce<HTMLDivElement>();
  // El carrusel reporta qué pilar queda centrado al arrastrar — controla el
  // resaltado dentro del simulacro real de al lado, así que deslizar una
  // tarjeta y ver su bloque iluminarse en el resultado son el mismo gesto.
  // El sentido inverso también existe: hacer clic en un bloque del
  // simulacro mueve el carrusel hasta esa tarjeta (ver activeIndex más abajo).
  const [active, setActive] = useState(1);
  const carouselWrapRef = useRef<HTMLDivElement>(null);

  // En mobile el simulacro y el carrusel quedan apilados — un clic en el
  // simulacro puede dejar la explicación fuera de pantalla, así que además
  // de cambiar el pilar activo, lo llevamos a la vista ("nearest" no mueve
  // nada si ya es visible, como en desktop donde ambos están lado a lado).
  const handleSelectPillar = (n: number) => {
    setActive(n);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    carouselWrapRef.current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "nearest",
    });
  };

  return (
    <section
      id="pilares"
      className={cn(
        "at-paper snap-section relative flex flex-col justify-center border-y border-border",
        "transition-opacity duration-500 ease-out motion-reduce:transition-none",
        sectionActive ? "opacity-100" : "opacity-80",
      )}
    >
      {/* Marca de agua decorativa: el ícono del primer pilar, a gran escala
          y casi invisible — profundidad sin competir con el texto ni sumar
          un segundo glow (reservado al widget del hero, ver DESIGN.md).
          Parallax removido (test de aislamiento), queda estática. Clip
          propio en un wrapper aparte (no en la <section>): SimulacroShowcase
          usa `lg:sticky` más abajo, y un overflow-hidden en un ancestro
          directo del elemento sticky le rompería el anclaje. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-16 -top-20 text-foreground/[0.05]">
          <Target className="h-[26rem] w-[26rem]" strokeWidth={1} />
        </div>
      </div>
      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <div className="max-w-xl">
          <h2 className="text-balance text-[clamp(1.75rem,1.5rem+1.2vw,2.5rem)] font-bold tracking-[-0.03em]">
            ¿Cómo se prepara alguien que sí va a ingresar?
          </h2>
          <p className="mt-3 text-pretty text-muted-foreground">
            <strong className="font-semibold text-foreground">
              Con datos, no con sensaciones.
            </strong>{" "}
            Estas son las tres cosas que Admi-Tec te dice y ningún solucionario te va a decir.
          </p>
        </div>

        <div
          ref={ref}
          className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-start lg:gap-10"
        >
          {/* Centro de atención: el simulacro real — el mismo lenguaje de
              "objeto vivo" que antes llevaban las tarjetas, ahora reservado
              para lo único que importa mostrar de verdad. Tilt 3D al mouse
              removido (se sentía como un efecto de zoom). */}
          <div
            className={cn(visible && "animate-rise-in", "min-w-0 lg:sticky lg:top-24")}
            style={visible ? ({ "--i": 2 } as React.CSSProperties) : undefined}
          >
            <SimulacroShowcase highlightPillar={active} onSelectPillar={handleSelectPillar} />
          </div>

          <div
            ref={carouselWrapRef}
            className={cn(visible && "animate-rise-in", "flex min-w-0 flex-col")}
            style={visible ? ({ "--i": 4 } as React.CSSProperties) : undefined}
          >
            <FeatureCarousel items={PILLARS} activeIndex={active} onActiveChange={setActive} />
          </div>
        </div>
      </div>
    </section>
  );
}
