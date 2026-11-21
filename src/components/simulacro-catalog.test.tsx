import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SimulacroCatalog } from "./simulacro-catalog";
import { useSignedIn } from "@/hooks/use-signed-in";
import { usePremiumGate } from "@/components/premium/premium-gate";
import { listPublishedTemplates, listMyTemplateSessions } from "@/lib/exams.functions";
import { publishedTemplatesQO } from "@/lib/exam-catalog";

vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/hooks/use-signed-in", () => ({ useSignedIn: vi.fn() }));
vi.mock("@/lib/exams.functions", () => ({
  listPublishedTemplates: vi.fn(),
  listMyTemplateSessions: vi.fn(),
}));
vi.mock("@/components/premium/premium-gate", () => ({
  usePremiumGate: vi.fn(),
  PremiumLockChip: () => <span>Premium</span>,
}));
vi.mock("@/components/exam-attempt-row", () => ({
  ExamAttemptRow: ({ sessionId, onDeleted }: { sessionId: string; onDeleted: () => void }) => (
    <div>
      <span>Resultado {sessionId}</span>
      <button onClick={onDeleted}>Eliminar {sessionId}</button>
    </div>
  ),
}));

type Template = Awaited<ReturnType<typeof listPublishedTemplates>>[number];
const base = {
  description: null,
  time_limit_min: 90,
  passing_score: 10,
  max_attempts: null,
  totalQuestions: 40,
  ruleCount: 3,
};
const templates: Template[] = [
  {
    ...base,
    id: "template-uni",
    title: "Simulacro UNI",
    university: { id: "uni-id", slug: "uni", short_name: "UNI" },
  },
  {
    ...base,
    id: "template-unmsm",
    title: "Simulacro San Marcos",
    university: { id: "unmsm-id", slug: "unmsm", short_name: "UNMSM" },
  },
  { ...base, id: "template-general", title: "Simulacro general", university: null },
];

const clients: QueryClient[] = [];
let premiumState: ReturnType<typeof usePremiumGate>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useSignedIn).mockReturnValue(true);
  vi.mocked(listMyTemplateSessions).mockResolvedValue([]);
  premiumState = {
    signedIn: true,
    loading: false,
    status: null,
    isPremium: true,
    onTrial: false,
    trialUsed: false,
    trialDaysLeft: null,
    betaActive: false,
    betaEndsAt: null,
    betaDaysLeft: null,
    locked: false,
    gate: vi.fn((action?: () => void) => action?.()),
    openGate: vi.fn(),
    gateDialog: <></>,
  };
  vi.mocked(usePremiumGate).mockReturnValue(premiumState);
});

afterEach(() => {
  clients.forEach((client) => client.clear());
  clients.length = 0;
});

async function renderCatalog(universitySlug?: string, catalog = templates) {
  const root = createRootRoute();
  const catalogRoute = createRoute({
    getParentRoute: () => root,
    path: "/",
    component: () => <SimulacroCatalog universitySlug={universitySlug} />,
  });
  const authRoute = createRoute({
    getParentRoute: () => root,
    path: "/auth",
    component: () => <p>Ingreso</p>,
  });
  const previewRoute = createRoute({
    getParentRoute: () => root,
    path: "/simulacro/$id",
    component: () => <p>Vista previa</p>,
  });
  const router = createRouter({
    routeTree: root.addChildren([catalogRoute, authRoute, previewRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
    defaultPendingMinMs: 0,
  });
  await router.load();
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  clients.push(client);
  client.setQueryData(publishedTemplatesQO.queryKey, catalog);
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

describe("simulacros in the exam catalog", () => {
  it("shows only the selected university's templates", async () => {
    await renderCatalog("uni");
    expect(await screen.findByRole("heading", { name: "Simulacro UNI" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Simulacro San Marcos" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Simulacro general" })).not.toBeInTheDocument();
  });

  it("keeps general templates available in the main catalog and accessible without Premium", async () => {
    vi.mocked(usePremiumGate).mockReturnValue({ ...premiumState, locked: true, isPremium: false });
    const router = await renderCatalog();
    expect(await screen.findByRole("heading", { name: "Simulacro general" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Simulacro UNI" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "Generar nuevo simulacro" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/simulacro/template-general"));
    expect(premiumState.gate).not.toHaveBeenCalled();
  });

  it("routes visitors to sign in without requesting private history", async () => {
    vi.mocked(useSignedIn).mockReturnValue(false);
    const router = await renderCatalog("uni");
    fireEvent.click(await screen.findByRole("button", { name: "Ingresar para generar" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/auth"));
    expect(listMyTemplateSessions).not.toHaveBeenCalled();
  });

  it("opens the university template preview through the Premium gate", async () => {
    const router = await renderCatalog("uni");
    fireEvent.click(await screen.findByRole("button", { name: "Generar nuevo simulacro" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/simulacro/template-uni"));
    expect(premiumState.gate).toHaveBeenCalledOnce();
  });

  it("does not navigate past the gate for a free university template", async () => {
    const gate = vi.fn();
    vi.mocked(usePremiumGate).mockReturnValue({
      ...premiumState,
      locked: true,
      isPremium: false,
      gate,
    });
    const router = await renderCatalog("uni");
    fireEvent.click(await screen.findByRole("button", { name: "Generar nuevo simulacro" }));
    expect(gate).toHaveBeenCalledOnce();
    expect(router.state.location.pathname).toBe("/");
  });

  it("keeps the matching attempts and refreshes them after deletion", async () => {
    vi.mocked(listMyTemplateSessions).mockResolvedValue([
      {
        id: "attempt-uni",
        exam_id: "template-uni",
        status: "graded",
        started_at: "2026-11-01T12:00:00Z",
        finished_at: null,
        score: 20,
        total: 40,
        max_score: 40,
        exam: null,
      },
      {
        id: "attempt-unmsm",
        exam_id: "template-unmsm",
        status: "graded",
        started_at: "2026-11-01T12:00:00Z",
        finished_at: null,
        score: 30,
        total: 40,
        max_score: 40,
        exam: null,
      },
    ]);
    await renderCatalog("uni");
    const history = await screen.findByRole("button", { name: "1 intento" });
    expect(history).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "Eliminar attempt-uni" })).not.toBeInTheDocument();
    fireEvent.click(history);
    expect(history).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Resultado attempt-uni")).toBeVisible();
    expect(screen.queryByText("Resultado attempt-unmsm")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar attempt-uni" }));
    await waitFor(() => expect(listMyTemplateSessions).toHaveBeenCalledTimes(2));
  });

  it("leaves empty university templates visible as coming soon", async () => {
    await renderCatalog("uni", [{ ...templates[0], totalQuestions: 0 }]);
    expect(await screen.findByRole("button", { name: "Próximamente" })).toBeDisabled();
  });

  it("shows an empty state for a university with no templates", async () => {
    await renderCatalog("pucp");
    expect(
      await screen.findByText("Aún no hay simulacros publicados para esta universidad."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(listMyTemplateSessions).not.toHaveBeenCalled();
  });
});
