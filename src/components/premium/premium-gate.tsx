import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, Loader2, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { activatePremiumTrial } from "@/lib/plan.functions";
import { PLAN_PRICES, TRIAL_DAYS } from "@/lib/plan";
import { usePlan } from "@/hooks/use-plan";
import { cn } from "@/lib/utils";

const DIALOG_BENEFITS = [
  "Exámenes oficiales completos de años anteriores",
  "Simulacros ilimitados de tu universidad",
  "Ranking, análisis de tiempo y recomendaciones",
];

/**
 * Diálogo único de desbloqueo premium. Decide su propio contenido según el
 * estado del visitante: sin sesión → crear cuenta; free sin prueba usada →
 * activar la prueba de 7 días; free con prueba usada → pasar a Premium.
 */
/** Mutación compartida (diálogo de desbloqueo y página de Planes) para
 * activar la prueba gratuita, con caché y toasts ya resueltos. */
export function useActivateTrial(opts?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();
  const activateFn = useServerFn(activatePremiumTrial);
  return useMutation({
    mutationFn: () => activateFn(),
    onSuccess: (status) => {
      queryClient.setQueryData(["plan-status"], status);
      queryClient.invalidateQueries({ queryKey: ["plan-status"] });
      toast.success("Premium activado", {
        description: `Tienes ${TRIAL_DAYS} días con acceso completo. Aprovéchalos.`,
      });
      opts?.onSuccess?.();
    },
    onError: (e: Error) => {
      queryClient.invalidateQueries({ queryKey: ["plan-status"] });
      toast.error(e.message || "No se pudo activar la prueba.");
    },
  });
}

export function PremiumGateDialog({
  open,
  onOpenChange,
  feature,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Nombre corto de lo bloqueado, ej. "los exámenes oficiales". */
  feature?: string;
}) {
  const { signedIn, trialUsed } = usePlan();
  const activate = useActivateTrial({ onSuccess: () => onOpenChange(false) });

  const featureText = feature ?? "esta función";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-accent/15 text-accent-foreground">
            {signedIn && !trialUsed ? (
              <Sparkles className="h-6 w-6" aria-hidden />
            ) : (
              <Lock className="h-6 w-6" aria-hidden />
            )}
          </div>
          <DialogTitle className="text-center font-display text-2xl">
            {signedIn === false
              ? "Crea tu cuenta para continuar"
              : trialUsed
                ? "Pasa a Premium"
                : `Prueba Premium gratis por ${TRIAL_DAYS} días`}
          </DialogTitle>
          <DialogDescription className="text-center">
            {signedIn === false
              ? `Para usar ${featureText} necesitas una cuenta. Crearla es gratis y toma menos de un minuto.`
              : trialUsed
                ? `Ya usaste tu prueba gratuita. Para seguir usando ${featureText}, suscríbete desde S/ ${PLAN_PRICES.quarterly.monthlyEquivalent} al mes.`
                : `${featureText[0].toUpperCase()}${featureText.slice(1)} es parte de Premium. Actívalo gratis, sin tarjeta, y al terminar vuelves solo al plan gratuito.`}
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2.5 rounded-xl border border-border bg-secondary/40 p-4 text-sm">
          {DIALOG_BENEFITS.map((b) => (
            <li key={b} className="flex items-start gap-2.5">
              <span className="mt-0.5 grid h-4.5 w-4.5 shrink-0 place-items-center rounded-full bg-success/15 text-success">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              {b}
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2">
          {signedIn === false ? (
            <Button asChild size="lg" className="press">
              <Link to="/auth" onClick={() => onOpenChange(false)}>
                Crear cuenta gratis
              </Link>
            </Button>
          ) : trialUsed ? (
            <Button asChild size="lg" className="press">
              <Link to="/planes" onClick={() => onOpenChange(false)}>
                Ver planes y precios
              </Link>
            </Button>
          ) : (
            <Button
              size="lg"
              className="press"
              disabled={activate.isPending}
              onClick={() => activate.mutate()}
            >
              {activate.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Activar premium {TRIAL_DAYS} días gratis
            </Button>
          )}
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
            <Link to="/planes" onClick={() => onOpenChange(false)}>
              Comparar planes
            </Link>
          </Button>
        </div>

        {signedIn === true && !trialUsed && (
          <p className="text-center text-xs text-muted-foreground">
            Sin tarjeta, sin compromiso. Es única por cuenta.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Chip de candado para marcar tarjetas/botones que requieren Premium. */
export function PremiumLockChip({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-accent/50 bg-accent/15 px-2 py-0.5 text-[0.7rem] font-semibold text-accent-foreground",
        className,
      )}
    >
      <Lock className="h-3 w-3" aria-hidden /> Premium
    </span>
  );
}

/**
 * Hook para puntos de bloqueo con acción propia (ej. un botón "Comenzar"):
 * `gate(fn)` ejecuta `fn` si hay Premium y, si no, abre el diálogo.
 * Renderiza `gateDialog` una vez en la página que lo use.
 */
export function usePremiumGate(feature?: string) {
  const plan = usePlan();
  const [open, setOpen] = useState(false);
  const locked = !plan.isPremium;

  function gate(fn?: () => void) {
    // Con el estado aún cargando no se decide nada: ni ejecutar la acción
    // (podría ser un free) ni abrir el diálogo (podría ser un premium).
    if (plan.loading) return;
    if (plan.isPremium) fn?.();
    else setOpen(true);
  }

  return {
    ...plan,
    locked,
    gate,
    openGate: () => setOpen(true),
    gateDialog: <PremiumGateDialog open={open} onOpenChange={setOpen} feature={feature} />,
  };
}

/**
 * Bloqueo visual de una sección completa: el contenido queda visible pero
 * difuminado (nunca oculto sin explicación) con el candado y el CTA encima.
 * Mientras el estado del plan carga no se muestra nada bloqueado, para que
 * un premium con caché fría no vea parpadear candados.
 */
export function PremiumOverlay({
  children,
  feature,
  title,
  className,
}: {
  children: React.ReactNode;
  /** Nombre corto de lo bloqueado, ej. "el ranking completo". */
  feature: string;
  /** Título mostrado sobre el contenido difuminado. */
  title?: string;
  className?: string;
}) {
  const { isPremium, loading } = usePlan();
  const [open, setOpen] = useState(false);

  if (isPremium || loading) return <>{children}</>;

  return (
    <div className={cn("relative", className)}>
      <div aria-hidden className="pointer-events-none select-none opacity-60 blur-[3px]">
        {children}
      </div>
      <div className="absolute inset-0 z-10 grid place-items-center rounded-xl bg-background/50 p-4 backdrop-blur-[2px]">
        <div className="animate-fade-up flex max-w-xs flex-col items-center gap-3 text-center">
          <span className="grid h-11 w-11 place-items-center rounded-full border border-accent/50 bg-accent/15 text-accent-foreground">
            <Lock className="h-5 w-5" aria-hidden />
          </span>
          <p className="font-display text-lg font-bold leading-snug">
            {title ?? "Disponible con Premium"}
          </p>
          <Button size="sm" className="press" onClick={() => setOpen(true)}>
            Desbloquear con Premium
          </Button>
        </div>
      </div>
      <PremiumGateDialog open={open} onOpenChange={setOpen} feature={feature} />
    </div>
  );
}
