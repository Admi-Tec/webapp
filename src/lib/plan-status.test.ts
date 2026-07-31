import { describe, expect, it } from "vitest";
import { toPlanStatus } from "@/lib/plan-status";

const NOW = new Date("2026-08-01T00:00:00.000Z");

describe("toPlanStatus", () => {
  it("plan free sin trial ni beta: sin acceso premium", () => {
    const status = toPlanStatus({ plan_type: "free", trial_used: false }, NOW);
    expect(status.planType).toBe("free");
    expect(status.isPremium).toBe(false);
    expect(status.onTrial).toBe(false);
    expect(status.trialDaysLeft).toBeNull();
  });

  it("premium pagado (sin trial_ends_at): premium sin contarlo como trial", () => {
    const status = toPlanStatus({ plan_type: "premium", trial_used: true }, NOW);
    expect(status.isPremium).toBe(true);
    expect(status.onTrial).toBe(false);
    expect(status.trialDaysLeft).toBeNull();
  });

  it("premium en prueba gratuita vigente: onTrial true y días restantes redondeados hacia arriba", () => {
    const trialEndsAt = new Date(NOW.getTime() + 2.1 * 86400000).toISOString();
    const status = toPlanStatus(
      { plan_type: "premium", trial_used: true, trial_ends_at: trialEndsAt },
      NOW,
    );
    expect(status.isPremium).toBe(true);
    expect(status.onTrial).toBe(true);
    expect(status.trialDaysLeft).toBe(3);
  });

  it("prueba gratuita vencida: trialDaysLeft se clampea a 0, nunca negativo", () => {
    const trialEndsAt = new Date(NOW.getTime() - 5 * 86400000).toISOString();
    const status = toPlanStatus(
      { plan_type: "premium", trial_used: true, trial_ends_at: trialEndsAt },
      NOW,
    );
    expect(status.trialDaysLeft).toBe(0);
  });

  it("beta_mode activo da acceso premium aunque el plan sea free", () => {
    const status = toPlanStatus({ plan_type: "free", trial_used: false, beta_mode: true }, NOW);
    expect(status.planType).toBe("free");
    expect(status.isPremium).toBe(true);
    expect(status.betaActive).toBe(true);
    // onTrial/trialDaysLeft reflejan solo la prueba real, nunca la beta
    expect(status.onTrial).toBe(false);
    expect(status.trialDaysLeft).toBeNull();
  });

  it("beta_mode activo con beta_ends_at calcula los días restantes", () => {
    const betaEndsAt = new Date(NOW.getTime() + 5 * 86400000).toISOString();
    const status = toPlanStatus(
      { plan_type: "free", trial_used: false, beta_mode: true, beta_ends_at: betaEndsAt },
      NOW,
    );
    expect(status.betaDaysLeft).toBe(5);
  });

  it("beta_mode activo sin beta_ends_at: betaDaysLeft es null (beta indefinida)", () => {
    const status = toPlanStatus(
      { plan_type: "free", trial_used: false, beta_mode: true, beta_ends_at: null },
      NOW,
    );
    expect(status.betaActive).toBe(true);
    expect(status.betaDaysLeft).toBeNull();
  });

  it("beta_mode inactivo: betaDaysLeft null aunque haya beta_ends_at", () => {
    const betaEndsAt = new Date(NOW.getTime() + 5 * 86400000).toISOString();
    const status = toPlanStatus(
      { plan_type: "free", trial_used: false, beta_mode: false, beta_ends_at: betaEndsAt },
      NOW,
    );
    expect(status.betaActive).toBe(false);
    expect(status.betaDaysLeft).toBeNull();
  });

  it("raw null/undefined: defaults seguros (free, sin premium)", () => {
    expect(toPlanStatus(null, NOW).isPremium).toBe(false);
    expect(toPlanStatus(undefined, NOW).planType).toBe("free");
  });
});
