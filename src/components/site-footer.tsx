import { Link } from "@tanstack/react-router";
import { BookOpenText, Mail } from "lucide-react";
import { CONTACT_EMAIL, SITE_NAME, SOCIAL_LINKS } from "@/lib/site";
import { InstagramIcon, TikTokIcon, WhatsAppIcon } from "@/components/social-icons";

const SOCIALS = [
  { label: "Instagram", href: SOCIAL_LINKS.instagram, Icon: InstagramIcon },
  { label: "TikTok", href: SOCIAL_LINKS.tiktok, Icon: TikTokIcon },
  { label: "WhatsApp", href: SOCIAL_LINKS.whatsapp, Icon: WhatsAppIcon },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <p className="font-display text-lg font-semibold text-foreground">
            Admi<span className="text-accent">-</span>Tec
          </p>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            Exámenes oficiales, simulacros y ranking para tu examen de admisión.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Hecho con ♥ para estudiantes peruanos.
          </p>
        </div>

        <nav aria-label="Contacto y legal">
          <p className="text-sm font-semibold text-foreground">Contacto</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <Mail className="h-4 w-4" aria-hidden /> Contáctanos
              </a>
            </li>
            <li>
              <Link
                to="/libro-de-reclamaciones"
                className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <BookOpenText className="h-4 w-4" aria-hidden /> Libro de reclamaciones
              </Link>
            </li>
          </ul>
        </nav>

        <div>
          <p className="text-sm font-semibold text-foreground">Síguenos</p>
          <ul className="mt-3 flex gap-3">
            {SOCIALS.map(({ label, href, Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  title={label}
                  className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  <Icon className="h-5 w-5" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row">
          <p>
            © {new Date().getFullYear()} {SITE_NAME}. Todos los derechos reservados.
          </p>
          <p>Lima, Perú</p>
        </div>
      </div>
    </footer>
  );
}
