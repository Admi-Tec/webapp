import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { CONTACT_EMAIL } from "@/lib/site";
import { sendBrevoEmail } from "@/lib/brevo";
import { buildComplaintEmail } from "@/email-templates/complaint-notification";
import { buildContactMessageEmail } from "@/email-templates/contact-message-notification";

const complaintSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  document: z.string().trim().min(1).max(15),
  phone: z.string().trim().max(15).optional(),
  email: z.string().trim().email().max(120),
  address: z.string().trim().max(200).optional(),
  guardian: z.string().trim().max(120).optional(),
  goodType: z.enum(["producto", "servicio"]),
  goodDescription: z.string().trim().min(1).max(200),
  claimedAmount: z.string().trim().max(20).optional(),
  complaintType: z.enum(["reclamo", "queja"]),
  detail: z.string().trim().min(1).max(2000),
  request: z.string().trim().min(1).max(1000),
});

export type ComplaintInput = z.infer<typeof complaintSchema>;

// Libro de Reclamaciones: sin persistencia por decisión explícita — si el
// correo no llega, el reclamo se pierde (sin tabla de respaldo en Supabase).
export const submitComplaint = createServerFn({ method: "POST" })
  .inputValidator((d) => complaintSchema.parse(d))
  .handler(async ({ data }) => {
    const { subject, html } = buildComplaintEmail(data);
    await sendBrevoEmail({
      to: { email: CONTACT_EMAIL },
      subject,
      html,
      replyTo: { email: data.email, name: data.fullName },
    });
    return { ok: true as const };
  });

const contactMessageSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(120),
  message: z.string().trim().min(1).max(2000),
});

export type ContactMessageInput = z.infer<typeof contactMessageSchema>;

export const submitContactMessage = createServerFn({ method: "POST" })
  .inputValidator((d) => contactMessageSchema.parse(d))
  .handler(async ({ data }) => {
    const { subject, html } = buildContactMessageEmail(data);
    await sendBrevoEmail({
      to: { email: CONTACT_EMAIL },
      subject,
      html,
      replyTo: { email: data.email, name: data.name },
    });
    return { ok: true as const };
  });
