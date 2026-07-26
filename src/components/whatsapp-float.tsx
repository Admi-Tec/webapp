import { SOCIAL_LINKS } from "@/lib/site";
import { WhatsAppIcon } from "@/components/social-icons";

/**
 * Floating WhatsApp contact button pinned to the bottom-right corner.
 * WhatsApp's own brand green on both themes (it's a logo, not a UI token).
 */
export function WhatsAppFloat() {
  return (
    <a
      href={SOCIAL_LINKS.whatsapp}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      title="Escríbenos por WhatsApp"
      className="press fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform duration-200 hover:scale-105"
    >
      <WhatsAppIcon className="h-7 w-7" />
    </a>
  );
}
