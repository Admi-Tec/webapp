import { useBetaStatus } from "@/hooks/use-beta-status";

/**
 * Franja delgada anunciando el modo beta (Premium gratis para todos) —
 * sitewide, vive en __root.tsx junto a SiteHeader/SiteFooter, así que corre
 * en el registro visual "Cuaderno de Estudio" (tema claro), no en el .at
 * navy/amber de la landing. Desaparece sola cuando betaActive es false, sin
 * botón de cerrar ni estado propio — el plan de producto pide que el cierre
 * de la beta sea 100% manual desde Supabase, nunca algo que el visitante
 * pueda ocultar por su cuenta. Sin cuenta regresiva a propósito: mostrar
 * "termina en N días" invitaba a preguntar qué pasa después, más ruido que
 * valor para el anuncio en sí.
 */
export function BetaBanner() {
  const { betaActive } = useBetaStatus();
  if (!betaActive) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-accent/15 px-4 py-2 text-center text-xs font-medium text-accent-foreground sm:text-sm">
      <span>
        <strong className="font-semibold">Admi-Tec está en beta</strong> — acceso Premium gratis
        para todos por tiempo limitado.
      </span>
    </div>
  );
}
