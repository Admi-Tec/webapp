import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { checkIsAdmin } from "@/lib/admin.functions";
import { useSignedIn } from "@/hooks/use-signed-in";

export function useIsAdmin() {
  const fn = useServerFn(checkIsAdmin);
  const signedIn = useSignedIn();

  const q = useQuery({
    queryKey: ["is-admin", signedIn],
    queryFn: () => fn(),
    enabled: signedIn === true,
    staleTime: 5 * 60 * 1000,
  });

  return { isAdmin: !!q.data?.isAdmin, isLoading: signedIn === null || q.isLoading };
}
