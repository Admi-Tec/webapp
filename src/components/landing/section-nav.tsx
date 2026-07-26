import { cn } from "@/lib/utils";

export type SectionNavItem = { id: string; label: string };

/**
 * Fixed right-edge dot rail for the homepage's snap sections — desktop only
 * (a thumb-width fixed column fights mobile's own edge gestures, and the
 * page already reads fine there via the top progress rail). Each dot jumps
 * to its section on click; the active one is driven by `activeId`
 * (see useActiveSection, IntersectionObserver-based).
 */
export function SectionNav({ items, activeId }: { items: SectionNavItem[]; activeId: string }) {
  const goTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  };

  return (
    <nav
      aria-label="Secciones de la página"
      className="fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-end gap-3 lg:flex"
    >
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => goTo(item.id)}
            aria-label={item.label}
            aria-current={active ? "true" : undefined}
            className="group relative grid h-6 w-6 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <span
              aria-hidden
              className={cn(
                "block rounded-full transition-[width,height,background-color] duration-300 ease-out motion-reduce:transition-none",
                active
                  ? "h-2.5 w-2.5 bg-primary"
                  : "h-1.5 w-1.5 bg-border group-hover:bg-muted-foreground",
              )}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100"
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
