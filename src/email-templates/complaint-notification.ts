import type { ComplaintInput } from "@/lib/contact.functions";
import { escapeHtml, nl2br, renderTemplate } from "@/email-templates/shared";
import template from "@/email-templates/complaint-notification.html?raw";

export function buildComplaintEmail(data: ComplaintInput): { subject: string; html: string } {
  const complaintTypeLabel = data.complaintType === "reclamo" ? "Reclamo" : "Queja";

  const html = renderTemplate(template, {
    complaintTypeLabel,
    fullName: escapeHtml(data.fullName),
    document: escapeHtml(data.document),
    email: escapeHtml(data.email),
    phone: escapeHtml(data.phone || "—"),
    address: escapeHtml(data.address || "—"),
    guardian: escapeHtml(data.guardian || "—"),
    goodTypeLabel: data.goodType === "servicio" ? "Servicio" : "Producto",
    goodDescription: escapeHtml(data.goodDescription),
    claimedAmountLabel: data.claimedAmount ? `S/ ${escapeHtml(data.claimedAmount)}` : "—",
    detail: nl2br(data.detail),
    request: nl2br(data.request),
  });

  return {
    subject: `[Libro de Reclamaciones] Nuevo ${data.complaintType} de ${data.fullName}`,
    html,
  };
}
