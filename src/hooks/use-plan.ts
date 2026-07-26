import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPlanStatus, type PlanStatus } from "@/lib/plan.functions";
import { useSignedIn } from "@/hooks/use-signed-in";

/**
 * Estado del plan del estudiante para el gating visual de funcionalidades.
 *
 * - `isPremium` solo es true con una respuesta confirmada del servidor, así
 *   que mientras carga se trata al usuario como free (los candados aparecen
 *   y desaparecen, nunca al revés: contenido premium nunca "parpadea" abierto).
 * - Para visitantes sin sesión todo es free y `signedIn` permite distinguir
 *   "inicia sesión" de "activa tu prueba" en los puntos de bloqueo.
 */
export function usePlan() {
  const signedIn = useSignedIn();
  const fetchStatus = useServerFn(getPlanStatus);
  const q = useQuery({
    queryKey: ["plan-status"],
    queryFn: () => fetchStatus(),
    enabled: signedIn === true,
    staleTime: 60_000,
  });

  const status: PlanStatus | null = signedIn === true ? (q.data ?? null) : null;

  return {
    signedIn,
    loading: signedIn === null || (signedIn === true && q.isLoading),
    status,
    isPremium: status?.isPremium === true,
    onTrial: status?.onTrial === true,
    trialUsed: status?.trialUsed === true,
    trialDaysLeft: status?.trialDaysLeft ?? null,
    betaActive: status?.betaActive === true,
    betaEndsAt: status?.betaEndsAt ?? null,
    betaDaysLeft: status?.betaDaysLeft ?? null,
  };
}
