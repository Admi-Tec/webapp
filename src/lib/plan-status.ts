// Derives the student-facing plan status from the raw get_plan_status()/
// activate_premium_trial() RPC row — pure date/boolean math, no Supabase
// import, so it can be unit tested directly (the RPC call itself stays in
// plan.functions.ts). See plan-status.test.ts.
export type PlanStatus = {
  planType: "free" | "premium";
  trialUsed: boolean;
  trialEndsAt: string | null;
  isPremium: boolean;
  /** Premium temporal por prueba gratuita (trial_ends_at seteado y vigente). */
  onTrial: boolean;
  /** Días restantes de la prueba (redondeado hacia arriba), null si no hay prueba activa. */
  trialDaysLeft: number | null;
  /** Modo beta global (ver app_config.beta_mode) — da acceso Premium a todos sin tocar planType. */
  betaActive: boolean;
  betaEndsAt: string | null;
  /** Días restantes de la beta, null si la beta no está activa o no tiene fecha de fin. */
  betaDaysLeft: number | null;
};

export function toPlanStatus(raw: unknown, now: Date = new Date()): PlanStatus {
  const r = (raw ?? {}) as {
    plan_type?: string;
    trial_used?: boolean;
    trial_ends_at?: string;
    beta_mode?: boolean;
    beta_ends_at?: string | null;
  };
  const planType = r.plan_type === "premium" ? "premium" : "free";
  const trialEndsAt = r.trial_ends_at ?? null;
  // onTrial/trialDaysLeft reflejan solo la prueba gratuita REAL — nunca la
  // beta, que se calcula aparte (betaActive/betaDaysLeft) para que planes.tsx
  // pueda distinguir "premium por trial/pago real" de "premium solo por la
  // beta" y mostrarle a cada quien el mensaje correcto.
  const onTrial = planType === "premium" && trialEndsAt !== null;
  const trialDaysLeft = onTrial
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - now.getTime()) / 86400000))
    : null;

  const betaActive = r.beta_mode === true;
  const betaEndsAt = r.beta_ends_at ?? null;
  const betaDaysLeft =
    betaActive && betaEndsAt !== null
      ? Math.max(0, Math.ceil((new Date(betaEndsAt).getTime() - now.getTime()) / 86400000))
      : null;

  return {
    planType,
    trialUsed: r.trial_used === true,
    trialEndsAt,
    // Único lugar donde se combinan ambas fuentes: todo el resto de la app
    // (PremiumOverlay, assertPremium, PlanBadge, locks) solo necesita mirar
    // isPremium y automáticamente respeta la beta sin cambios propios.
    isPremium: planType === "premium" || betaActive,
    onTrial,
    trialDaysLeft,
    betaActive,
    betaEndsAt,
    betaDaysLeft,
  };
}
