import { getPlanStatusRaw } from "@/lib/plan.functions";

// A diferencia de assertAdmin (admin.functions.ts, exercise-review.functions.ts),
// hasta ahora ningún server function validaba plan_type server-side — el gating
// premium era 100% blur de cliente (PremiumOverlay). El motor de recomendaciones
// expone contenido personalizado nuevo, así que este es el primer endpoint que
// lo exige de verdad: sin esto, cualquier usuario Gratuito podría llamar la
// server function directamente (devtools/fetch) y recibir la data completa aunque
// la UI la difumine.
export async function assertPremium(context: { supabase: any; userId: string }) {
  const status = await getPlanStatusRaw(context);
  if (!status.isPremium) throw new Error("Requiere Premium");
}
