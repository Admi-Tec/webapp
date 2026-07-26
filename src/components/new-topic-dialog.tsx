import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Check } from "lucide-react";
import { useSaveFeedback } from "@/hooks/use-save-feedback";
import { createSubtopic, createTopic } from "@/lib/admin.functions";

interface Props {
  onCreated: (id: string) => void;
  type?: "topic" | "subtopic";
  topicId?: string | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
  triggerLabel?: string;
}

export function NewTopicDialog({
  onCreated,
  type = "topic",
  topicId = null,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  showTrigger = true,
  triggerLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const isControlled = openProp !== undefined && onOpenChangeProp !== undefined;
  const actualOpen = isControlled ? openProp : open;
  const actualOnOpenChange = onOpenChangeProp ?? setOpen;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#3B82F6");
  const [saving, setSaving] = useState(false);
  const [saveFeedback, flashSaveFeedback] = useSaveFeedback();
  const createTopicFn = useServerFn(createTopic);
  const createSubtopicFn = useServerFn(createSubtopic);
  const qc = useQueryClient();

  const isSubtopic = type === "subtopic";
  const title = isSubtopic ? "Nuevo tema" : "Nuevo curso";
  const submitLabel = isSubtopic ? "Crear tema" : "Crear curso";
  const triggerText = triggerLabel ?? (isSubtopic ? "Nuevo tema" : "Nuevo curso");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) {
      toast.error("Nombre demasiado corto");
      flashSaveFeedback("refused");
      return;
    }
    if (isSubtopic && !topicId) {
      toast.error("Selecciona primero un curso");
      flashSaveFeedback("refused");
      return;
    }
    setSaving(true);
    try {
      const res = isSubtopic
        ? await createSubtopicFn({ data: { topic_id: topicId!, name: name.trim() } })
        : await createTopicFn({
            data: { name: name.trim(), description: description.trim() || null, color },
          });

      if (res.duplicated) {
        toast.info(
          isSubtopic
            ? "Ese tema ya existía; se seleccionó el existente."
            : "Ese curso ya existía; se seleccionó el existente.",
        );
      } else {
        toast.success(isSubtopic ? "Tema creado" : "Curso creado");
      }
      flashSaveFeedback("accepted");
      await qc.invalidateQueries({ queryKey: ["admin-meta"] });
      onCreated(res.id);
      setTimeout(() => actualOnOpenChange(false), 550);
      setName("");
      setDescription("");
    } catch (e: any) {
      toast.error(e?.message ?? "Error al crear");
      flashSaveFeedback("refused");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={actualOpen} onOpenChange={actualOnOpenChange}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <Plus className="mr-1 h-3 w-3" /> {triggerText}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <Label>Nombre *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} />
          </div>
          {!isSubtopic && (
            <div>
              <Label>Descripción</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                maxLength={300}
              />
            </div>
          )}
          {!isSubtopic && (
            <div>
              <Label>Color</Label>
              <Input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-20"
              />
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => actualOnOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className={`press ${saveFeedback === "refused" ? "animate-shake" : ""}`}
              disabled={saving}
            >
              {saveFeedback === "accepted" ? (
                <span className="inline-flex items-center gap-2 animate-icon-pop">
                  <Check className="h-4 w-4" /> Creado
                </span>
              ) : saving ? (
                "Guardando…"
              ) : (
                submitLabel
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
