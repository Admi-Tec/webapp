import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteExamSession } from "@/lib/exams.functions";

export function DeleteExamAttemptButton({
  sessionId,
  onDeleted,
  iconOnly = false,
}: {
  sessionId: string;
  onDeleted: () => void;
  iconOnly?: boolean;
}) {
  const deleteFn = useServerFn(deleteExamSession);
  const [deleting, setDeleting] = useState(false);
  const [open, setOpen] = useState(false);

  async function onConfirm() {
    setDeleting(true);
    try {
      await deleteFn({ data: { sessionId } });
      setOpen(false);
      toast.success("Intento eliminado de tu historial.");
      onDeleted();
    } catch (err: any) {
      toast.error(err?.message ?? "No se pudo eliminar el intento.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {iconOnly ? (
          <button
            type="button"
            aria-label="Eliminar intento"
            className="shrink-0 rounded-md p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : (
          <Button
            variant="outline"
            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" /> Eliminar este intento
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar este intento?</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará permanentemente de tu historial y{" "}
            <strong className="text-foreground">ya no contará en el ranking</strong>. Si este examen
            tiene un límite de intentos, liberarás un cupo para volver a rendirlo. Esta acción no se
            puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
