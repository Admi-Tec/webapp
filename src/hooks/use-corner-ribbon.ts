import { useEffect, useRef, useState } from "react";

/**
 * Mide un elemento con ResizeObserver y calcula el ángulo/largo real de una
 * cinta diagonal que lo cruza de borde a borde — un ángulo fijo no sirve
 * porque depende del ancho/alto real del elemento, que cambia con el
 * viewport y con cuánto ocupe el contenido.
 *
 * `edgeInset` (0-0.5, fracción del alto) mueve dónde la cinta entra/sale por
 * los bordes izquierdo/derecho, sin dejar nunca de tocarlos: con 0 entra por
 * la esquina inferior izquierda exacta y sale por la superior derecha exacta
 * (diagonal completa). Con 0.25 entra 1/4 del alto MÁS ARRIBA de esa esquina
 * y sale 1/4 del alto MÁS ABAJO de la esquina opuesta — una diagonal más
 * centrada/menos empinada, pero todavía de borde a borde. Importante: como
 * los dos extremos siempre caen exactamente sobre los bordes (nunca
 * "flotando" a mitad de tarjeta), overflow-hidden en el contenedor esconde
 * sus puntas cuadradas por completo — a diferencia de simplemente encoger
 * la cinta centrada, que deja ver esas puntas como un rectángulo feo.
 */
export function useCornerRibbon<T extends HTMLElement>(edgeInset = 0) {
  const ref = useRef<T>(null);
  const [ribbon, setRibbon] = useState<{ width: number; angle: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      const span = height * (1 - 2 * edgeInset);
      // Margen fijo de sobra: pase lo que pase con el grosor de la cinta
      // (grosor real vs. línea matemática) o con edgeInset, sus dos puntas
      // quedan bien más allá del borde real, así overflow-hidden las
      // recorta siempre por completo — sin margen suficiente, la esquina
      // cuadrada de la cinta asoma justo donde debería desaparecer. Es
      // seguro subirlo sin límite: lo que sobra queda recortado igual, no
      // cambia nada de lo que sí se ve dentro de la tarjeta.
      const overshoot = 120;
      setRibbon({
        width: Math.hypot(width, span) + overshoot,
        angle: (Math.atan2(span, width) * 180) / Math.PI,
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [edgeInset]);

  return { ref, ribbon };
}
