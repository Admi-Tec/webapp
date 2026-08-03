import { escapeHtml, renderTemplate } from "@/email-templates/shared";
import { absoluteUrl, SOCIAL_LINKS } from "@/lib/site";
import template from "@/email-templates/welcome.html?raw";

export function buildWelcomeEmail(data: { fullName: string | null }): {
  subject: string;
  html: string;
} {
  const firstName = escapeHtml(data.fullName?.trim().split(/\s+/)[0] || "");
  const greeting = firstName ? `Hola ${firstName},` : "Hola,";

  const html = renderTemplate(template, {
    greeting,
    panelUrl: absoluteUrl("/panel"),
    instagramUrl: SOCIAL_LINKS.instagram,
    whatsappUrl: SOCIAL_LINKS.whatsapp,
  });

  return {
    subject: "¡Bienvenido a Admi-Tec! Tu cuenta ya está lista",
    html,
  };
}
