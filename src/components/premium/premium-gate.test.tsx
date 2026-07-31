import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders as render } from "@/test/render";
import { PremiumLockChip, PremiumOverlay } from "@/components/premium/premium-gate";
import { usePlan } from "@/hooks/use-plan";

vi.mock("@/hooks/use-plan", () => ({ usePlan: vi.fn() }));

function mockPlan(overrides: Partial<ReturnType<typeof usePlan>>) {
  vi.mocked(usePlan).mockReturnValue({
    signedIn: true,
    loading: false,
    status: null,
    isPremium: false,
    onTrial: false,
    trialUsed: false,
    trialDaysLeft: null,
    betaActive: false,
    betaEndsAt: null,
    betaDaysLeft: null,
    ...overrides,
  });
}

describe("PremiumOverlay", () => {
  it("estudiante premium: muestra el contenido sin candado ni difuminado", () => {
    mockPlan({ isPremium: true });
    render(
      <PremiumOverlay feature="el ranking completo">
        <p>Contenido premium</p>
      </PremiumOverlay>,
    );
    expect(screen.getByText("Contenido premium")).toBeInTheDocument();
    expect(screen.queryByText("Desbloquear con Premium")).not.toBeInTheDocument();
  });

  it("mientras el plan carga: no muestra el candado (para no parpadear)", () => {
    mockPlan({ isPremium: false, loading: true });
    render(
      <PremiumOverlay feature="el ranking completo">
        <p>Contenido premium</p>
      </PremiumOverlay>,
    );
    expect(screen.getByText("Contenido premium")).toBeInTheDocument();
    expect(screen.queryByText("Desbloquear con Premium")).not.toBeInTheDocument();
  });

  it("estudiante free (plan ya resuelto): muestra el candado y el contenido difuminado", () => {
    mockPlan({ isPremium: false, loading: false });
    render(
      <PremiumOverlay feature="el ranking completo">
        <p>Contenido premium</p>
      </PremiumOverlay>,
    );
    expect(screen.getByText("Contenido premium")).toBeInTheDocument();
    expect(screen.getByText("Desbloquear con Premium")).toBeInTheDocument();
  });

  it("usa el título custom cuando se pasa, o el default si no", () => {
    mockPlan({ isPremium: false, loading: false });
    const { rerender } = render(
      <PremiumOverlay feature="el ranking completo">
        <p>Contenido</p>
      </PremiumOverlay>,
    );
    expect(screen.getByText("Disponible con Premium")).toBeInTheDocument();

    rerender(
      <PremiumOverlay feature="el ranking completo" title="Solo para Premium">
        <p>Contenido</p>
      </PremiumOverlay>,
    );
    expect(screen.getByText("Solo para Premium")).toBeInTheDocument();
  });
});

describe("PremiumLockChip", () => {
  it("muestra el chip de Premium", () => {
    render(<PremiumLockChip />);
    expect(screen.getByText("Premium")).toBeInTheDocument();
  });
});
