import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlanBadge } from "@/components/premium/plan-badge";
import { usePlan } from "@/hooks/use-plan";

vi.mock("@/hooks/use-plan", () => ({ usePlan: vi.fn() }));

// PlanBadge renderiza <Link> incondicionalmente cuando hay premium — se
// reemplaza por un <a> plano, ya que estos tests no necesitan un router real.
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
      <a href={to} {...rest}>
        {children}
      </a>
    ),
  };
});

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

describe("PlanBadge", () => {
  it("estudiante free: no muestra nada", () => {
    mockPlan({ status: null });
    const { container } = render(<PlanBadge />);
    expect(container).toBeEmptyDOMElement();
  });

  it("premium pagado (sin trial): muestra el chip Premium sin días restantes", () => {
    mockPlan({
      isPremium: true,
      status: {
        planType: "premium",
        trialUsed: true,
        trialEndsAt: null,
        isPremium: true,
        onTrial: false,
        trialDaysLeft: null,
        betaActive: false,
        betaEndsAt: null,
        betaDaysLeft: null,
      },
    });
    render(<PlanBadge />);
    expect(screen.getByText("Premium")).toBeInTheDocument();
    expect(screen.queryByText(/día/)).not.toBeInTheDocument();
  });

  it("premium en prueba gratuita: muestra los días restantes", () => {
    mockPlan({
      isPremium: true,
      onTrial: true,
      trialDaysLeft: 3,
      status: {
        planType: "premium",
        trialUsed: true,
        trialEndsAt: "2026-08-10T00:00:00.000Z",
        isPremium: true,
        onTrial: true,
        trialDaysLeft: 3,
        betaActive: false,
        betaEndsAt: null,
        betaDaysLeft: null,
      },
    });
    render(<PlanBadge />);
    expect(screen.getByText("Premium")).toBeInTheDocument();
    expect(screen.getByText(/3 días/)).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/planes");
  });
});
