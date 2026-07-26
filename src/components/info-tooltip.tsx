import { useRef, useState } from "react";
import { HelpCircle } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

// Single reusable "explain this value" affordance. Uses Popover (not Tooltip)
// as the actual mechanism so the same interaction works identically on touch
// (tap opens/closes it, exactly like a mobile popover) and on desktop, where
// we additionally layer hover-to-open on top since that's the expected
// behavior there. Radix's own outside-click/Escape handling closes it either
// way — no separate mobile/desktop code paths to maintain.
export function InfoTooltip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function supportsHover() {
    return (
      typeof window !== "undefined" &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches
    );
  }
  function openOnHover() {
    if (!supportsHover()) return;
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }
  function closeOnHoverOut() {
    if (!supportsHover()) return;
    closeTimer.current = setTimeout(() => setOpen(false), 100);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Más información"
          onMouseEnter={openOnHover}
          onMouseLeave={closeOnHoverOut}
          className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${className ?? ""}`}
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        onMouseEnter={openOnHover}
        onMouseLeave={closeOnHoverOut}
        className="w-64 p-3 text-sm leading-snug"
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}
