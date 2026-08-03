import { APP_SENDER_EMAIL } from "@/email-templates/shared";

// Envío genérico vía la API HTTP de Brevo — usado tanto para correos
// estudiante→admin (reclamos, contacto) como admin→estudiante (bienvenida).
export async function sendBrevoEmail(opts: {
  to: { email: string; name?: string };
  subject: string;
  html: string;
  replyTo?: { email: string; name?: string };
}) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error("El envío de correo no está configurado (falta BREVO_API_KEY).");

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: { email: APP_SENDER_EMAIL, name: "Admi-Tec" },
      to: [opts.to],
      ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
      subject: opts.subject,
      htmlContent: opts.html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Brevo respondió ${res.status}${body ? `: ${body}` : ""}`);
  }
}
