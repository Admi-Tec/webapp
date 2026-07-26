// Pantalla completa es opcional por diseño: en navegadores/dispositivos sin
// soporte (buena parte de mobile) esto simplemente no hace nada, y el guard
// de src/hooks/use-exam-away-guard.ts cae a detectar solo cambios de pestaña.
export function requestExamFullscreen() {
  if (typeof document === "undefined") return;
  const el = document.documentElement as HTMLElement & {
    requestFullscreen?: () => Promise<void>;
  };
  if (document.fullscreenEnabled && el.requestFullscreen) {
    el.requestFullscreen().catch(() => {});
  }
}

export function exitExamFullscreen() {
  if (typeof document === "undefined") return;
  if (document.fullscreenElement) {
    document.exitFullscreen?.().catch(() => {});
  }
}
