import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("notifications")
      .select("id, kind, title, body, read_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Generate context-aware notifications lazily (called when bell opens).
// Idempotent per day/kind — uses kind+DATE(created_at) uniqueness at app level.
export const regenerateNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: existing }, { data: unis }, { data: lastAttempt }] = await Promise.all([
      supabase
        .from("notifications")
        .select("kind, created_at")
        .eq("user_id", userId)
        .gte("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString()),
      supabase
        .from("student_universities")
        .select("exam_date, university:universities(short_name)")
        .eq("user_id", userId),
      supabase
        .from("attempts")
        .select("created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const existingKinds = new Set((existing ?? []).map((n) => n.kind));
    const inserts: Array<{ user_id: string; kind: string; title: string; body: string }> = [];

    // Countdown reminders (per uni)
    (unis ?? []).forEach((u: any) => {
      if (!u.exam_date) return;
      const daysLeft = Math.ceil(
        (new Date(u.exam_date).getTime() - Date.now()) / (24 * 3600 * 1000),
      );
      const uniName = u.university?.short_name ?? "tu universidad";
      if (daysLeft > 0 && daysLeft <= 30) {
        const kind = `countdown_${uniName}_${daysLeft <= 7 ? "week" : daysLeft <= 15 ? "twoweeks" : "month"}`;
        if (!existingKinds.has(kind)) {
          inserts.push({
            user_id: userId,
            kind,
            title: `Faltan ${daysLeft} días para ${uniName}`,
            body:
              daysLeft <= 7
                ? "Rinde al menos un simulacro esta semana para practicar en condiciones reales."
                : "Sigue reforzando los temas donde tienes menor rendimiento.",
          });
        }
      }
    });

    // Inactivity
    if (lastAttempt?.created_at) {
      const daysSince = Math.floor(
        (Date.now() - new Date(lastAttempt.created_at).getTime()) / (24 * 3600 * 1000),
      );
      if (daysSince >= 3 && !existingKinds.has("inactive")) {
        inserts.push({
          user_id: userId,
          kind: "inactive",
          title: `No has practicado en ${daysSince} días`,
          body: "La constancia es clave. Dedica al menos 15 minutos hoy a un tema débil.",
        });
      }
    }

    if (inserts.length) {
      await supabase.from("notifications").insert(inserts);
    }
    return { created: inserts.length };
  });
