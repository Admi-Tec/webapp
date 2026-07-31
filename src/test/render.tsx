import type { ReactElement, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";

// Every data-fetching component in this app goes through React Query
// (useQuery/useMutation via useServerFn), so that's the one provider worth
// wiring up generically here. Add more providers to `AllProviders` as the
// app grows ones that matter for component tests (e.g. a router context or
// cookie-consent provider) — there isn't one today (see plan-testing notes).
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      // No retries/no cache in tests: a failing query should fail once and
      // fast, not retry into a timeout.
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

function AllProviders({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>;
}

export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export * from "@testing-library/react";
