import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Mail, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitContactMessage } from "@/lib/contact.functions";

const INITIAL = { name: "", email: "", message: "" };

/** Botón "Contáctanos" que abre un formulario en vez de un `mailto:` crudo —
 * envía el mensaje directo a la bandeja vía submitContactMessage. */
export function ContactDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(INITIAL);
  const [sent, setSent] = useState(false);

  const submitFn = useServerFn(submitContactMessage);
  const mutation = useMutation({
    mutationFn: () => submitFn({ data: form }),
    onSuccess: () => setSent(true),
    onError: (e: Error) => toast.error(e.message || "No se pudo enviar tu mensaje."),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      // Reset after the close animation finishes instead of mid-fade.
      setTimeout(() => {
        setForm(INITIAL);
        setSent(false);
        mutation.reset();
      }, 200);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {sent ? (
          <div className="py-4 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-success" aria-hidden />
            <h2 className="font-display mt-4 text-xl font-bold">Mensaje enviado</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Gracias por escribirnos. Te responderemos a {form.email} lo antes posible.
            </p>
            <Button className="press mt-6" variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Contáctanos</DialogTitle>
              <DialogDescription>
                Escríbenos y te respondemos directo a tu correo.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label htmlFor="contact-name">Nombre</Label>
                <Input
                  id="contact-name"
                  required
                  maxLength={120}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  autoComplete="name"
                />
              </div>
              <div>
                <Label htmlFor="contact-email">Correo</Label>
                <Input
                  id="contact-email"
                  type="email"
                  required
                  maxLength={120}
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  autoComplete="email"
                />
              </div>
              <div>
                <Label htmlFor="contact-message">Mensaje</Label>
                <Textarea
                  id="contact-message"
                  required
                  rows={4}
                  maxLength={2000}
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                />
              </div>
              <Button type="submit" className="press w-full" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Enviando…
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Mail className="h-4 w-4" /> Enviar mensaje
                  </span>
                )}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
