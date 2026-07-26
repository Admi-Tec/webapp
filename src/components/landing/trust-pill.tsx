import { cn } from "@/lib/utils";

/**
 * Small reassurance/trust pill for moments that need a quiet nudge toward
 * signing up (differentiation claims near the hero, friction-reducers near
 * a CTA). Deliberately calm — a static dot, not the widget's live-pulse —
 * so it never competes with the hero's one bold, animated moment.
 */
export function TrustPill({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-4 py-1.5 text-sm font-medium text-success",
        className,
      )}
    >
      <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
      {children}
    </span>
  );
}
