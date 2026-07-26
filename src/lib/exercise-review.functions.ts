import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

// "Ejercicios a revisar" (see plan-calificacion-reportes-ejercicios.md §3/§5):
// an exercise surfaces here for two independent reasons — it has a pending
// problem report, or (even without any report) its average star rating is
// below the low-rating threshold. Both are read from get_exercise_review_queue,
// which itself already gates results to admins only.

export const getExerciseReviewBadgeCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.rpc("get_exercise_review_queue");
    if (error) throw new Error(error.message);
    return { count: (data ?? []).length };
  });

export const listLowRatedExercises = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.rpc("get_exercise_review_queue");
    if (error) throw new Error(error.message);
    return (data ?? []).filter((r: any) => r.flag_reason === "calificacion_baja");
  });

const reportStatus = z.enum(["pendiente", "resuelto", "descartado", "all"]).default("pendiente");

export const listExerciseReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ status: reportStatus }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    let q = context.supabase
      .from("exercise_reports")
      .select(
        "id, exercise_id, reason, note, status, created_at, resolved_at, exercise:exercises(statement_md, topic:topics(name), subtopic:subtopics(name))",
      )
      .order("created_at", { ascending: false });
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const resolveExerciseReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ reportId: z.string().uuid(), action: z.enum(["resolve", "dismiss"]) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: report, error: fetchErr } = await context.supabase
      .from("exercise_reports")
      .select("id, user_id, status")
      .eq("id", data.reportId)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!report) throw new Error("Reporte no encontrado");

    const nextStatus = data.action === "resolve" ? "resuelto" : "descartado";
    const { data: rows, error } = await context.supabase
      .from("exercise_reports")
      .update({
        status: nextStatus,
        resolved_at: new Date().toISOString(),
        resolved_by: context.userId,
      })
      .eq("id", data.reportId)
      .select("id");
    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) {
      throw new Error("No se pudo actualizar el reporte: no se encontró o no tienes permiso.");
    }

    // Resolving (not dismissing) notifies the reporting student — this writes
    // to a DIFFERENT user's row, which the self-only notifications RLS policy
    // blocks for the admin's own session, so it needs the service-role client.
    if (data.action === "resolve") {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("notifications").insert({
        user_id: report.user_id,
        kind: "exercise_report_resolved",
        title: "Gracias, ya corregimos el ejercicio que reportaste",
        body: null,
      });
    }
    return { ok: true };
  });
