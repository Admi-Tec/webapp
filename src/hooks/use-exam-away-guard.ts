import { useCallback, useEffect, useRef, useState } from "react";
import { requestExamFullscreen } from "@/lib/exam-fullscreen";

export const EXAM_AWAY_BUDGET_MS = 5 * 60 * 1000;

interface UseExamAwayGuardOptions {
  /** Solo debe vigilar mientras el examen está en curso (in_progress). */
  active: boolean;
  /** Se llama una única vez al agotarse el presupuesto de 5 minutos. */
  onBudgetExceeded: () => void;
}

interface UseExamAwayGuardResult {
  /** El estudiante salió (perdió foco/visibilidad o salió de pantalla completa) y aún no ha reanudado. */
  isAway: boolean;
  usedMs: number;
  remainingMs: number;
  /** Click en "Reanudar examen": vuelve a pedir pantalla completa y limpia el estado de ausencia. */
  resume: () => void;
}

// Solo exigimos permanecer en fullscreen si el navegador lo soporta; en
// dispositivos donde no (buena parte de mobile) el único criterio de
// "ausencia" es la visibilidad de la pestaña.
const fullscreenSupported = typeof document !== "undefined" && document.fullscreenEnabled;

function computeAway() {
  if (typeof document === "undefined") return false;
  return document.hidden || (fullscreenSupported && !document.fullscreenElement);
}

export function useExamAwayGuard({
  active,
  onBudgetExceeded,
}: UseExamAwayGuardOptions): UseExamAwayGuardResult {
  const [isAway, setIsAway] = useState(false);
  const [usedMs, setUsedMs] = useState(0);
  const awaySinceRef = useRef<number | null>(null);
  const usedBeforeRef = useRef(0);
  const expiredRef = useRef(false);
  const onBudgetExceededRef = useRef(onBudgetExceeded);
  onBudgetExceededRef.current = onBudgetExceeded;

  // Detecta transiciones reales del navegador (perder/recuperar visibilidad,
  // entrar/salir de fullscreen). Reanudar solo ocurre de forma explícita vía
  // resume(), así que un requestFullscreen() fallido no deja esto en loop.
  useEffect(() => {
    if (!active) return;
    const evaluate = () => {
      const away = computeAway();
      setIsAway((prev) => {
        if (away && !prev) awaySinceRef.current = Date.now();
        return away;
      });
    };
    document.addEventListener("visibilitychange", evaluate);
    document.addEventListener("fullscreenchange", evaluate);
    evaluate();
    return () => {
      document.removeEventListener("visibilitychange", evaluate);
      document.removeEventListener("fullscreenchange", evaluate);
    };
  }, [active]);

  // Mientras está afuera, sigue acumulando y revisa el presupuesto incluso
  // si el estudiante no ha vuelto todavía (el envío automático no depende de
  // que regrese).
  useEffect(() => {
    if (!active || !isAway || expiredRef.current) return;
    const tick = () => {
      const since = awaySinceRef.current ?? Date.now();
      const total = usedBeforeRef.current + (Date.now() - since);
      setUsedMs(total);
      if (total >= EXAM_AWAY_BUDGET_MS && !expiredRef.current) {
        expiredRef.current = true;
        onBudgetExceededRef.current();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active, isAway]);

  // Confirmación estándar del navegador al cerrar/recargar durante el examen.
  useEffect(() => {
    if (!active) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [active]);

  const resume = useCallback(() => {
    if (awaySinceRef.current !== null) {
      usedBeforeRef.current = Math.min(
        EXAM_AWAY_BUDGET_MS,
        usedBeforeRef.current + (Date.now() - awaySinceRef.current),
      );
      awaySinceRef.current = null;
    }
    setUsedMs(usedBeforeRef.current);
    setIsAway(false);
    requestExamFullscreen();
  }, []);

  return {
    isAway,
    usedMs,
    remainingMs: Math.max(0, EXAM_AWAY_BUDGET_MS - usedMs),
    resume,
  };
}
