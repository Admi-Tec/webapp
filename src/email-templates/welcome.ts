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
    facebookUrl: escapeHtml(SOCIAL_LINKS.facebook),
    instagramUrl: escapeHtml(SOCIAL_LINKS.instagram),
    tiktokUrl: escapeHtml(SOCIAL_LINKS.tiktok),
    whatsappUrl: escapeHtml(SOCIAL_LINKS.whatsapp),
  });

  return {
    subject: "¡Bienvenido a Admi-Tec! Tu cuenta ya está lista",
    html,
  };
}
