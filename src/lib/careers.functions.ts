import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Non-admin read used by onboarding/perfil to populate the per-university
// career select — careers are scoped per university, so callers pass every
// university id the student currently targets and group the results client-side.
export const listCareersForUniversities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ universityIds: z.array(z.string().uuid()).max(10) }).parse(d))
  .handler(async ({ context, data }) => {
    if (data.universityIds.length === 0) return [];
    const { data: rows, error } = await context.supabase
      .from("careers")
      .select("id, name, active, university_id")
      .in("university_id", data.universityIds)
      .order("name");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
