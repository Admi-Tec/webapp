import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sendBrevoEmail } from "@/lib/brevo";
import { buildWelcomeEmail } from "@/email-templates/welcome";
import { CONTACT_EMAIL } from "@/lib/site";

// Dispara el correo de bienvenida la primera vez (y solo la primera vez) que
// se detecta una cuenta recién activa — puede llamarse desde varios puntos
// del flujo de auth (signup con sesión inmediata, confirmación por correo,
// login con Google) sin arriesgar duplicados: el UPDATE ... WHERE
// welcome_email_sent_at IS NULL actúa como "claim" atómico, así que solo la
// primera llamada que llega realmente envía el correo — el resto son no-ops.
export const sendWelcomeEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;

    const { data: claimed, error } = await supabase
      .from("profiles")
      .update({ welcome_email_sent_at: new Date().toISOString() })
      .eq("id", userId)
      .is("welcome_email_sent_at", null)
      .select("full_name")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!claimed) return { sent: false as const };

    const email = claims.email;
    if (!email) return { sent: false as const };

    const { subject, html } = buildWelcomeEmail({ fullName: claimed.full_name });
    await sendBrevoEmail({
      to: { email, name: claimed.full_name ?? undefined },
      subject,
      html,
      replyTo: { email: CONTACT_EMAIL },
    });

    return { sent: true as const };
  });
