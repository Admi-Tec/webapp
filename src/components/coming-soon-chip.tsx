import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

// Un examen/simulacro sin preguntas todavía (el admin lo dejó creado pero
// vacío) se marca así en vez de dejar que el estudiante intente entrar y
// choque con el error de startExamSession. Mismo molde que PremiumLockChip
// (src/components/premium/premium-gate.tsx) para no inventar un estilo nuevo.
export function ComingSoonChip({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-muted-foreground/30 bg-muted px-2 py-0.5 text-[0.7rem] font-semibold text-muted-foreground",
        className,
      )}
    >
      <Clock className="h-3 w-3" aria-hidden /> Próximamente
    </span>
  );
}
