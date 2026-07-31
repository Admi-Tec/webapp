import { createServerFn } from "@tanstack/react-start";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { toPlanStatus, type PlanStatus } from "@/lib/plan-status";

export type { PlanStatus };

function publicClient() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

// Cuerpo compartido de getPlanStatus, extraído para que assertPremium
// (src/lib/premium-guard.ts) pueda reusar exactamente la misma lógica de
// "revertir una prueba vencida antes de responder" sin duplicarla ni pagar
// un round-trip RPC aparte cada vez que un server function premium la llama.
export async function getPlanStatusRaw(context: {
  supabase: SupabaseClient<Database>;
  userId: string;
}) {
  const { supabase, userId } = context;
  const { data, error } = await supabase.rpc("get_plan_status");
  if (error) throw new Error(error.message);
  const status = toPlanStatus(data);

  if (status.onTrial && status.trialDaysLeft !== null && status.trialDaysLeft <= 2) {
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", userId)
      .eq("kind", "trial_expiring")
      .gte("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString())
      .limit(1);
    if (!existing || existing.length === 0) {
      await supabase.from("notifications").insert({
        user_id: userId,
        kind: "trial_expiring",
        title:
          status.trialDaysLeft <= 1
            ? "Tu prueba de Premium termina hoy"
            : `Tu prueba de Premium termina en ${status.trialDaysLeft} días`,
        body: "Suscríbete para no perder los exámenes oficiales, los simulacros de tu universidad y tu posición en el ranking.",
      });
    }
  }

  if (status.betaActive && status.betaDaysLeft !== null && status.betaDaysLeft <= 7) {
    const { data: existingBeta } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", userId)
      .eq("kind", "beta_ending")
      .gte("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString())
      .limit(1);
    if (!existingBeta || existingBeta.length === 0) {
      await supabase.from("notifications").insert({
        user_id: userId,
        kind: "beta_ending",
        title:
          status.betaDaysLeft <= 1
            ? "La beta termina hoy"
            : `La beta termina en ${status.betaDaysLeft} días`,
        body: "Cuando termine, tu acceso vuelve a depender de tu plan (la mayoría vuelve a Gratuito). Revisa Planes si quieres seguir con Premium.",
      });
    }
  }

  return status;
}

// Estado del plan. La RPC (SECURITY DEFINER) revierte una prueba vencida antes
// de responder, así que ningún cliente ve premium ya expirado. De paso genera
// el aviso in-app de "tu prueba está por vencer" (1-2 días antes, idempotente
// por día, mismo patrón que regenerateNotifications).
export const getPlanStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => getPlanStatusRaw(context));

export const activatePremiumTrial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("activate_premium_trial");
    if (error) {
      if (error.message.includes("trial already used")) {
        throw new Error("Ya usaste tu prueba gratuita de Premium.");
      }
      if (error.message.includes("already premium")) {
        throw new Error("Ya tienes Premium activo.");
      }
      throw new Error(error.message);
    }
    return toPlanStatus(data);
  });

// Estado público de la beta (sin sesión) — a diferencia de getPlanStatus,
// get_beta_status() no exige auth.uid(), así que esto funciona en la landing
// pública para un visitante sin cuenta. Solo expone las 2 columnas globales
// de app_config, nada sensible.
export const getBetaStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await publicClient().rpc("get_beta_status");
  if (error) throw new Error(error.message);
  const r = (data ?? {}) as { beta_mode?: boolean; beta_ends_at?: string | null };
  const betaActive = r.beta_mode === true;
  const betaEndsAt = r.beta_ends_at ?? null;
  const betaDaysLeft =
    betaActive && betaEndsAt !== null
      ? Math.max(0, Math.ceil((new Date(betaEndsAt).getTime() - Date.now()) / 86400000))
      : null;
  return { betaActive, betaEndsAt, betaDaysLeft };
});
