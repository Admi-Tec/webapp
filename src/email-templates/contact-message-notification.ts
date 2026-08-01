import type { ContactMessageInput } from "@/lib/contact.functions";
import { escapeHtml, nl2br, renderTemplate } from "@/email-templates/shared";
import template from "@/email-templates/contact-message-notification.html?raw";

export function buildContactMessageEmail(data: ContactMessageInput): {
  subject: string;
  html: string;
} {
  const html = renderTemplate(template, {
    name: escapeHtml(data.name),
    email: escapeHtml(data.email),
    message: nl2br(data.message),
  });

  return {
    subject: `[Contacto] Mensaje de ${data.name}`,
    html,
  };
}
