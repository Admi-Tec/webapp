import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { reportExercise } from "@/lib/exercise-feedback.functions";
import { useSignedIn } from "@/hooks/use-signed-in";

export const EXERCISE_REPORT_REASONS: Array<{ value: string; label: string }> = [
  { value: "respuesta_incorrecta", label: "La respuesta marcada como correcta no es correcta" },
  { value: "enunciado_confuso", label: "El enunciado tiene un error o es confuso" },
  { value: "falta_informacion", label: "Falta información para resolver el ejercicio" },
  { value: "imagen_problema", label: "La imagen no se ve bien o falta" },
  { value: "otro", label: "Otro" },
];

export function ReportProblemDialog({
  exerciseId,
  className,
}: {
  exerciseId: string;
  className?: string;
}) {
  const signedIn = useSignedIn();
  const reportFn = useServerFn(reportExercise);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  const m = useMutation({
    mutationFn: () =>
      reportFn({ data: { exerciseId, reason: reason as any, note: note.trim() || undefined } }),
    onSuccess: () => {
      toast.success("Gracias, revisaremos este ejercicio.");
      setOpen(false);
      setReason("");
      setNote("");
    },
    onError: (e: any) => toast.error(e?.message ?? "No se pudo enviar el reporte"),
  });

  if (!signedIn) return null;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) {
      toast.error("Selecciona un motivo");
      return;
    }
    if (reason === "otro" && !note.trim()) {
      toast.error("Cuéntanos brevemente cuál es el problema");
      return;
    }
    m.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={`inline-flex cursor-pointer items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-destructive ${className ?? ""}`}
        >
          <Flag className="h-3.5 w-3.5" /> Reportar problema
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reportar un problema</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <Label>¿Qué está mal? *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un motivo" />
              </SelectTrigger>
              <SelectContent>
                {EXERCISE_REPORT_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Cuéntanos más {reason === "otro" ? "*" : "(opcional)"}</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Explica brevemente el problema..."
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={m.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" className="press" disabled={m.isPending}>
              {m.isPending ? "Enviando…" : "Enviar reporte"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
