import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { usePlan } from "@/hooks/use-plan";
import { cn } from "@/lib/utils";

/**
 * Chip de estado del plan en el header. Solo aparece con Premium activo;
 * durante la prueba muestra los días restantes para mantener presente que es
 * temporal (y enlaza a Planes, donde se convierte).
 */
export function PlanBadge({ className }: { className?: string }) {
  const { status } = usePlan();
  if (!status?.isPremium) return null;

  return (
    <Link
      to="/planes"
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-accent/50 bg-accent/15 px-2.5 py-1 text-xs font-semibold text-accent-foreground transition-colors hover:bg-accent/25",
        className,
      )}
      aria-label={
        status.onTrial
          ? `Premium de prueba, ${status.trialDaysLeft} días restantes — ver planes`
          : "Premium activo — ver planes"
      }
    >
      <Sparkles className="h-3.5 w-3.5" aria-hidden />
      Premium
      {status.onTrial && (
        <span className="font-data tabular-nums">
          · {status.trialDaysLeft} {status.trialDaysLeft === 1 ? "día" : "días"}
        </span>
      )}
    </Link>
  );
}
