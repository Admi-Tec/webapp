import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { routeTree } from "./routeTree.gen";
import { PagePending } from "./components/skeletons";

export const getRouter = () => {
  // Loaders call queryClient.ensureQueryData(...) to populate this cache during
  // SSR, but without this bridge the client mounts with a brand-new, empty
  // QueryClient — every useSuspenseQuery() call then refetches from scratch
  // immediately after hydration, duplicating every request the server just
  // made (visible as a "double load" on first paint). This wires the router's
  // existing SSR data channel to also carry the dehydrated query cache across,
  // so the client hydrates with the data already in place.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 60 * 1000 } },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // Never leave the user staring at a frozen/blank page while a loader runs:
    // after 300ms of pending navigation show a skeleton fallback, and once it
    // appears keep it up ≥300ms so fast loads don't flash.
    defaultPendingComponent: PagePending,
    defaultPendingMs: 300,
    defaultPendingMinMs: 300,
  });

  setupRouterSsrQueryIntegration({ router, queryClient });

  return router;
};
