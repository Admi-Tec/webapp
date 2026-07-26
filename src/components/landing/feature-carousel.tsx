import { useCallback, useEffect, useRef, useState } from "react";
import useEmblaCarousel, { type UseEmblaCarouselType } from "embla-carousel-react";
import { cn } from "@/lib/utils";

/**
 * Carrusel de "feature cards" arrastrable — el estudiante desliza con el dedo
 * o el mouse entre los 3 pilares en vez de solo hacer clic (cursor-grab en
 * la zona de arrastre marca la afordancia). La tarjeta centrada queda nítida
 * y a tamaño completo; las vecinas se ven más pequeñas y opacas (sin
 * desenfoque, por pedido explícito) — profundidad de campo cuadro a cuadro
 * con el propio scroll de embla, no un simple fade al soltar. `activeIndex` es
 * bidireccional: el carrusel sube el índice seleccionado a PillarsSection
 * (resalta el bloque que le corresponde en SimulacroShowcase) y también lo
 * escucha, así que hacer clic en un bloque del simulacro desplaza el
 * carrusel hasta esa tarjeta.
 */

type EmblaApi = NonNullable<UseEmblaCarouselType[1]>;

type PillarItem = {
  title: string;
  text: React.ReactNode;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;
};

// Qué tan rápido cae la escala/opacidad al alejarse del centro — más alto,
// caída más agresiva (las vecinas se notan más chicas y borrosas).
const TWEEN_FACTOR = 1.35;

export function FeatureCarousel({
  items,
  activeIndex,
  onActiveChange,
}: {
  items: PillarItem[];
  activeIndex: number;
  onActiveChange: (index: number) => void;
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "center" });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const tweenFactorRef = useRef(0);

  const setTweenFactor = useCallback((api: EmblaApi) => {
    tweenFactorRef.current = TWEEN_FACTOR * api.scrollSnapList().length;
  }, []);

  // Adaptado del ejemplo oficial "Tween scale" de embla: en vez de escribir
  // transform/opacity directamente, escribe una sola custom property
  // (--tween, 0 = borde · 1 = centrado) y deja que el CSS derive escala y
  // opacidad — así puede combinarse con las clases de Tailwind del borde
  // activo sin que JS y CSS se peleen por la misma propiedad.
  const tweenScale = useCallback((api: EmblaApi, eventName?: string) => {
    const engine = api.internalEngine();
    const scrollProgress = api.scrollProgress();
    const slidesInView = api.slidesInView();
    const isScrollEvent = eventName === "scroll";

    api.scrollSnapList().forEach((scrollSnap, snapIndex) => {
      let diffToTarget = scrollSnap - scrollProgress;
      const slidesInSnap = engine.slideRegistry[snapIndex];

      slidesInSnap.forEach((slideIndex) => {
        if (isScrollEvent && !slidesInView.includes(slideIndex)) return;

        if (engine.options.loop) {
          engine.slideLooper.loopPoints.forEach((loopItem) => {
            const target = loopItem.target();
            if (slideIndex === loopItem.index && target !== 0) {
              const sign = Math.sign(target);
              if (sign === -1) diffToTarget = scrollSnap - (1 + scrollProgress);
              if (sign === 1) diffToTarget = scrollSnap + (1 - scrollProgress);
            }
          });
        }

        const tween = 1 - Math.min(Math.abs(diffToTarget * tweenFactorRef.current), 1);
        api.slideNodes()[slideIndex].style.setProperty("--tween", tween.toFixed(3));
      });
    });
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    setTweenFactor(emblaApi);
    tweenScale(emblaApi);

    emblaApi
      .on("reInit", setTweenFactor)
      .on("reInit", tweenScale)
      .on("scroll", tweenScale)
      .on("slideFocus", tweenScale);
  }, [emblaApi, setTweenFactor, tweenScale]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      const i = emblaApi.selectedScrollSnap();
      setSelectedIndex(i);
      onActiveChange(i + 1);
    };
    onSelect();
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onActiveChange]);

  // Sincroniza en el otro sentido: si el estudiante hace clic en un bloque de
  // SimulacroShowcase, el carrusel se desplaza hasta esa tarjeta — el mismo
  // "select" de arriba dispara onActiveChange con el mismo valor al llegar,
  // así que no hay ida y vuelta infinita entre los dos estados.
  useEffect(() => {
    if (!emblaApi) return;
    const target = activeIndex - 1;
    if (emblaApi.selectedScrollSnap() === target) return;
    emblaApi.scrollTo(target);
  }, [emblaApi, activeIndex]);

  // Auto-avance cada 5s, en desktop y celular por igual (loop:true ya hace
  // que scrollNext() vuelva a la primera tarjeta al llegar al final). Se
  // pausa mientras el estudiante arrastra (pointerDown→pointerUp) para no
  // pelear con un drag en curso, y retoma el conteo desde cero al soltar.
  useEffect(() => {
    if (!emblaApi) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let timer: ReturnType<typeof setInterval> | null = null;
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const start = () => {
      stop();
      timer = setInterval(() => emblaApi.scrollNext(), 5000);
    };

    start();
    emblaApi.on("pointerDown", stop);
    emblaApi.on("pointerUp", start);

    return () => {
      stop();
      emblaApi.off("pointerDown", stop);
      emblaApi.off("pointerUp", start);
    };
  }, [emblaApi]);

  return (
    <div className="flex flex-col">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        Desliza para descubrir cada función
      </p>

      <div ref={emblaRef} className="mt-4 cursor-pointer overflow-hidden">
        <div className="flex touch-pan-y">
          {items.map((item, i) => (
            <div
              key={item.title}
              className="min-w-0 shrink-0 grow-0 basis-[80%] px-2 sm:basis-[74%]"
            >
              <FeatureSlide item={item} active={selectedIndex === i} />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 flex justify-center gap-1">
        {items.map((item, i) => (
          <button
            key={item.title}
            type="button"
            onClick={() => emblaApi?.scrollTo(i)}
            aria-label={`Ver pilar ${i + 1}`}
            aria-pressed={selectedIndex === i}
            className="grid h-11 w-11 shrink-0 place-items-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <span
              className={cn(
                "block h-2 rounded-full transition-[width,background-color] duration-300 ease-out motion-reduce:transition-none",
                selectedIndex === i ? "w-6 bg-primary" : "w-2 bg-border",
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function FeatureSlide({ item, active }: { item: PillarItem; active: boolean }) {
  const { Icon } = item;
  return (
    <article
      className={cn(
        "feature-slide flex flex-col rounded-lg border bg-card p-5 transition-[border-color,box-shadow] duration-300 ease-out motion-reduce:transition-none sm:p-6",
        active ? "border-primary/60 shadow-[0_8px_8px_-4px_rgba(15,23,42,0.4)]" : "border-border",
      )}
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        <Icon aria-hidden className="h-5 w-5" strokeWidth={2} />
      </span>
      <h3 className="mt-3 text-balance text-base font-bold leading-snug tracking-tight sm:text-lg">
        {item.title}
      </h3>
      <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">{item.text}</p>
    </article>
  );
}
