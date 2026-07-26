import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getBetaStatus } from "@/lib/plan.functions";

/**
 * Estado público del modo beta, para el banner sitewide — a diferencia de
 * usePlan(), no depende de haber iniciado sesión (getBetaStatus no exige
 * auth.uid()), porque el banner también debe verse en la landing pública.
 */
export function useBetaStatus() {
  const fetchStatus = useServerFn(getBetaStatus);
  const q = useQuery({
    queryKey: ["beta-status"],
    queryFn: () => fetchStatus(),
    staleTime: 60_000,
  });

  return {
    betaActive: q.data?.betaActive === true,
    betaDaysLeft: q.data?.betaDaysLeft ?? null,
  };
}
