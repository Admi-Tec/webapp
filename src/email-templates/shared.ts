// Helpers compartidos por los templates de src/email-templates/ — HTML de
// correos transaccionales generados por contact.functions.ts (distinto de
// los templates de Supabase Auth en /emails, que se pegan a mano en su
// dashboard y nunca los ejecuta esta app).

// Remitente de todos los correos que dispara la propia app (reclamos,
// contacto), para poder reconocerlos en la bandeja sin confundirlos con
// correo humano enviado desde contact@admi-tec.com.
export const APP_SENDER_EMAIL = "app@admi-tec.com";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function nl2br(value: string): string {
  return escapeHtml(value).replace(/\n/g, "<br>");
}

// Sustituye placeholders `{{ clave }}` en un template .html cargado con
// `?raw`. Cada valor ya debe venir escapado (via escapeHtml/nl2br) — este
// helper solo reemplaza texto, no sabe qué es seguro insertar sin escapar.
export function renderTemplate(html: string, vars: Record<string, string>): string {
  return html.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : match,
  );
}
