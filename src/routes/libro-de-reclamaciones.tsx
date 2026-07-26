import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BookOpenText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { pageMeta, SITE_NAME } from "@/lib/site";

export const Route = createFileRoute("/libro-de-reclamaciones")({
  head: () =>
    pageMeta({
      path: "/libro-de-reclamaciones",
      title: "Libro de Reclamaciones",
      description: `Libro de Reclamaciones virtual de ${SITE_NAME}: registra tu reclamo o queja conforme al Código de Protección y Defensa del Consumidor.`,
    }),
  component: ComplaintsBookPage,
});

type FormState = {
  fullName: string;
  document: string;
  phone: string;
  email: string;
  address: string;
  guardian: string;
  goodType: "producto" | "servicio";
  goodDescription: string;
  claimedAmount: string;
  complaintType: "reclamo" | "queja";
  detail: string;
  request: string;
  truthful: boolean;
};

const INITIAL: FormState = {
  fullName: "",
  document: "",
  phone: "",
  email: "",
  address: "",
  guardian: "",
  goodType: "servicio",
  goodDescription: "",
  claimedAmount: "",
  complaintType: "reclamo",
  detail: "",
  request: "",
  truthful: false,
};

function ComplaintsBookPage() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitted, setSubmitted] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Frontend only for now: the form validates and confirms in place; wiring
  // the submission to the backend (persistence + email) is pending.
  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const today = new Date().toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="rounded-xl border border-success/40 bg-success/5 p-8 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-success" aria-hidden />
          <h1 className="font-display mt-4 text-2xl font-bold">Hoja de reclamación registrada</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Gracias, {form.fullName.split(" ")[0] || "postulante"}. Hemos registrado tu{" "}
            {form.complaintType} con fecha {today}. Te responderemos al correo{" "}
            <strong className="text-foreground">{form.email}</strong> en un plazo máximo de quince
            (15) días hábiles, conforme al Código de Protección y Defensa del Consumidor.
          </p>
          <Button
            className="mt-6"
            variant="outline"
            onClick={() => {
              setForm(INITIAL);
              setSubmitted(false);
            }}
          >
            Registrar otra hoja
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <header>
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <BookOpenText className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">Libro de Reclamaciones</h1>
            <p className="text-sm text-muted-foreground">Hoja de reclamación virtual · {today}</p>
          </div>
        </div>
        {/* Razón social y RUC del proveedor: completar el RUC cuando exista. */}
        <p className="mt-4 rounded-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Proveedor: <strong className="text-foreground">{SITE_NAME}</strong> — plataforma de
          preparación preuniversitaria. Conforme al D.S. N.º 011-2011-PCM, tienes derecho a
          registrar aquí tu reclamo o queja.
        </p>
      </header>

      <form onSubmit={onSubmit} className="mt-8 space-y-8">
        <fieldset className="space-y-4">
          <legend className="font-display text-lg font-bold">1. Tus datos</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="lr-name">Nombre completo *</Label>
              <Input
                id="lr-name"
                required
                maxLength={120}
                value={form.fullName}
                onChange={(e) => set("fullName", e.target.value)}
                autoComplete="name"
              />
            </div>
            <div>
              <Label htmlFor="lr-doc">DNI / CE *</Label>
              <Input
                id="lr-doc"
                required
                maxLength={15}
                value={form.document}
                onChange={(e) => set("document", e.target.value)}
                inputMode="numeric"
              />
            </div>
            <div>
              <Label htmlFor="lr-email">Correo electrónico *</Label>
              <Input
                id="lr-email"
                type="email"
                required
                maxLength={120}
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                autoComplete="email"
              />
            </div>
            <div>
              <Label htmlFor="lr-phone">Teléfono</Label>
              <Input
                id="lr-phone"
                maxLength={15}
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                inputMode="tel"
                autoComplete="tel"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="lr-address">Domicilio</Label>
            <Input
              id="lr-address"
              maxLength={200}
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              autoComplete="street-address"
            />
          </div>
          <div>
            <Label htmlFor="lr-guardian">
              Padre, madre o apoderado (solo si eres menor de edad)
            </Label>
            <Input
              id="lr-guardian"
              maxLength={120}
              value={form.guardian}
              onChange={(e) => set("guardian", e.target.value)}
            />
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="font-display text-lg font-bold">2. Bien contratado</legend>
          <RadioGroup
            value={form.goodType}
            onValueChange={(v) => set("goodType", v as FormState["goodType"])}
            className="flex gap-6"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="servicio" id="lr-servicio" />
              <Label htmlFor="lr-servicio" className="font-normal">
                Servicio
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="producto" id="lr-producto" />
              <Label htmlFor="lr-producto" className="font-normal">
                Producto
              </Label>
            </div>
          </RadioGroup>
          <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
            <div>
              <Label htmlFor="lr-good">Descripción *</Label>
              <Input
                id="lr-good"
                required
                maxLength={200}
                placeholder="Ej. Plan Premium trimestral"
                value={form.goodDescription}
                onChange={(e) => set("goodDescription", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="lr-amount">Monto reclamado (S/)</Label>
              <Input
                id="lr-amount"
                type="number"
                min="0"
                step="0.01"
                value={form.claimedAmount}
                onChange={(e) => set("claimedAmount", e.target.value)}
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="font-display text-lg font-bold">3. Detalle</legend>
          <RadioGroup
            value={form.complaintType}
            onValueChange={(v) => set("complaintType", v as FormState["complaintType"])}
            className="grid gap-3 sm:grid-cols-2"
          >
            <label
              htmlFor="lr-reclamo"
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-4 has-[[data-state=checked]]:border-primary"
            >
              <RadioGroupItem value="reclamo" id="lr-reclamo" className="mt-0.5" />
              <span>
                <span className="block text-sm font-semibold">Reclamo</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Disconformidad con el producto o servicio recibido.
                </span>
              </span>
            </label>
            <label
              htmlFor="lr-queja"
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-4 has-[[data-state=checked]]:border-primary"
            >
              <RadioGroupItem value="queja" id="lr-queja" className="mt-0.5" />
              <span>
                <span className="block text-sm font-semibold">Queja</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Malestar respecto a la atención al público.
                </span>
              </span>
            </label>
          </RadioGroup>
          <div>
            <Label htmlFor="lr-detail">Cuéntanos qué pasó *</Label>
            <Textarea
              id="lr-detail"
              required
              rows={4}
              maxLength={2000}
              value={form.detail}
              onChange={(e) => set("detail", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="lr-request">¿Qué solución esperas? *</Label>
            <Textarea
              id="lr-request"
              required
              rows={3}
              maxLength={1000}
              value={form.request}
              onChange={(e) => set("request", e.target.value)}
            />
          </div>
        </fieldset>

        <div className="flex items-start gap-2">
          <Checkbox
            id="lr-truthful"
            required
            checked={form.truthful}
            onCheckedChange={(v) => set("truthful", v === true)}
            className="mt-0.5"
          />
          <Label htmlFor="lr-truthful" className="font-normal leading-snug">
            Declaro que la información proporcionada es verdadera y acepto que la respuesta se envíe
            al correo indicado.
          </Label>
        </div>

        <Button type="submit" size="lg" className="press w-full sm:w-auto">
          Enviar hoja de reclamación
        </Button>

        <div className="space-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
          <p>
            * La formulación del reclamo no impide acudir a otras vías de solución de controversias
            ni es requisito previo para interponer una denuncia ante el INDECOPI.
          </p>
          <p>
            * El proveedor debe dar respuesta al reclamo o queja en un plazo no mayor a quince (15)
            días hábiles improrrogables.
          </p>
        </div>
      </form>
    </div>
  );
}
