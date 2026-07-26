import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  Loader2,
  Lock,
  Mail,
  Minus,
  Sparkles,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useActivateTrial } from "@/components/premium/premium-gate";
import { usePlan } from "@/hooks/use-plan";
import {
  FREE_FEATURES,
  PLAN_COMPARISON,
  PLAN_PRICES,
  PREMIUM_FEATURES,
  TRIAL_DAYS,
} from "@/lib/plan";
import { CONTACT_EMAIL, pageMeta } from "@/lib/site";
import { useInViewOnce } from "@/hooks/use-in-view-once";
import { useBetaStatus } from "@/hooks/use-beta-status";
import { useCornerRibbon } from "@/hooks/use-corner-ribbon";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/planes")({
  head: () =>
    pageMeta({
      path: "/planes",
      title: "Planes y precios",
      description: `Empieza gratis y desbloquea todo con Premium: exámenes oficiales, simulacros de tu universidad y ranking completo. Desde S/ ${PLAN_PRICES.quarterly.monthlyEquivalent} al mes, con ${TRIAL_DAYS} días de prueba gratis.`,
    }),
  component: PlanesPage,
});

type Billing = "monthly" | "quarterly";

function PlanesPage() {
  const { signedIn, isPremium, onTrial, trialUsed, trialDaysLeft } = usePlan();
  // useBetaStatus (público, sin auth) en vez del betaActive de usePlan: esta
  // página es visible sin sesión (el CTA de las columnas premium ya maneja
  // signedIn === false), y usePlan solo consulta cuando signedIn === true —
  // un visitante anónimo nunca vería el mensaje/cinta de beta si dependiera
  // de ese hook.
  const { betaActive } = useBetaStatus();
  // Which plan's mailto the placeholder "muy pronto" dialog is showing —
  // null means closed. Two premium columns now exist side by side (no more
  // single toggled Premium card), so the dialog has to know which one the
  // student actually clicked to avoid quoting the wrong price back at them.
  const [subscribeBilling, setSubscribeBilling] = useState<Billing | null>(null);
  const activate = useActivateTrial();
  const { ref: tableRef, visible: tableVisible } = useInViewOnce<HTMLDivElement>();
  // Cintas diagonales (una por tarjeta premium, cada una mide su propia
  // tarjeta): a diferencia del landing (esquina a esquina exacta),
  // edgeInset=0.25 las hace entrar/salir 1/4 del alto más adentro de cada
  // esquina — menos empinada y más centrada, pero sigue tocando ambos
  // bordes, así que sus puntas quedan escondidas por overflow-hidden en vez
  // de verse como un rectángulo cuadrado a mitad de tarjeta.
  const monthlyRibbon = useCornerRibbon<HTMLDivElement>(0.25);
  const quarterlyRibbon = useCornerRibbon<HTMLDivElement>(0.25);

  const canTrial = signedIn === true && !isPremium && !trialUsed;

  // Identical state machine for both premium columns (Mensual/Trimestral) —
  // the free trial itself is plan-agnostic, so only which billing gets
  // written into the subscribe-dialog mailto differs between the two calls.
  function renderPremiumCta(billing: Billing) {
    if (signedIn === false) {
      return (
        <>
          <Button asChild size="lg" className="press">
            <Link to="/auth">
              Crear cuenta
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </>
      );
    }
    // Durante la beta nadie tiene nada que activar o pagar todavía — el
    // bloque de precio de arriba ya lo comunica ("Premium incluido durante
    // la beta"), así que acá no hace falta ningún botón.
    if (betaActive) return null;
    // Sin CTA de prueba gratis acá: la prueba ya se ofrece en la columna
    // Gratuito y en el CTA final, y para cuando alguien está mirando estas
    // dos columnas de pago suele ya haberla usado — repetirla acá era ruido.
    // Una sola acción: activar Premium (suscribirse).
    if (signedIn === true && !isPremium && !onTrial) {
      return (
        <>
          <Button size="lg" className="press" onClick={() => setSubscribeBilling(billing)}>
            Activar premium <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            {trialUsed
              ? `Ya usaste tu prueba gratuita de ${TRIAL_DAYS} días.`
              : "Cancela cuando quieras, sin compromiso."}
          </p>
        </>
      );
    }
    if (onTrial) {
      return (
        <>
          <Button size="lg" className="press" onClick={() => setSubscribeBilling(billing)}>
            Suscribirme para continuar
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Asegura tu acceso antes de que termine la prueba.
          </p>
        </>
      );
    }
    if (isPremium && !onTrial) {
      return (
        <div className="inline-flex items-center justify-center gap-2 rounded-lg border border-success/40 bg-success/10 px-4 py-2.5 text-sm font-semibold text-success">
          <BadgeCheck className="h-4 w-4" /> Ya tienes Premium
        </div>
      );
    }
    return null;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      {/* Encabezado */}
      <header className="mx-auto max-w-2xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium">
          <Sparkles className="h-3 w-3" /> Planes
        </div>
        <h1 className="mt-4 text-balance font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Empieza gratis. <span className="text-primary">Ingresa con Premium.</span>
        </h1>
        <p className="mt-4 text-pretty text-muted-foreground">
          El plan gratuito te acompaña todos los días. Premium te da lo que de verdad decide una
          admisión: exámenes oficiales reales, simulacros de tu universidad y el puntaje exacto que
          te falta para tu carrera, para que sepas si hoy ingresarías, no para que lo adivines.
        </p>
      </header>

      {/* Estado actual: beta gana sobre prueba individual — durante la beta
          nadie necesita saber de su trial personal, el mensaje relevante es
          que todos están cubiertos por la beta. */}
      {betaActive ? (
        <div className="animate-alert-in mx-auto mt-6 max-w-lg rounded-xl border border-accent/50 bg-accent/15 px-4 py-3 text-center text-sm">
          Durante la version beta, <strong className="font-semibold">todos tienen Premium gratis</strong>.
        </div>
      ) : (
        onTrial && (
          <div className="animate-alert-in mx-auto mt-6 flex max-w-lg items-center justify-center gap-2 rounded-full border border-accent/50 bg-accent/15 px-4 py-2 text-sm font-medium">
            <Timer className="h-4 w-4 text-accent-foreground" aria-hidden />
            Tu prueba Premium está activa{" "}
            <span className="font-data font-semibold tabular-nums">
              {trialDaysLeft} {trialDaysLeft === 1 ? "día restante" : "días restantes"}
            </span>
          </div>
        )
      )}

      {/* Tarjetas de plan: 3 columnas fijas, sin toggle — Gratis, Mensual
          (recomendado) y Trimestral se comparan de un vistazo en vez de
          ocultarse una a la otra detrás de un selector. Por debajo de lg,
          en vez de apilarlas, el mismo contenedor se vuelve una fila con
          scroll-snap horizontal — cada tarjeta ocupa ~85% del ancho (un
          "peek" de la siguiente asoma como pista de que se puede deslizar),
          y en lg vuelve a ser un grid normal sin scroll. */}
      {/* mt-10 vive en este wrapper, no en el hint de abajo: el hint es
          lg:hidden, así que su propio margen desaparecía por completo en
          desktop y las columnas quedaban pegadas al header. */}
      <div className="mt-10">
        <p className="mb-3 text-center text-xs font-medium text-muted-foreground lg:hidden">
          Desliza para ver los 3 planes →
        </p>
        <div className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:grid-cols-3 lg:snap-none lg:overflow-visible lg:px-0 lg:pb-0">
          {/* Gratuito */}
          <section
            aria-label="Plan Gratuito"
            className="animate-fade-up flex w-[85%] shrink-0 snap-center flex-col rounded-2xl border border-border bg-card p-6 sm:p-8 lg:w-auto lg:shrink lg:snap-align-none"
            style={{ "--i": 0 } as React.CSSProperties}
          >
            <h2 className="font-display text-xl font-bold">Gratuito</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Para practicar todos los días, a tu ritmo.
            </p>
            <p className="mt-5 font-display text-4xl font-bold">
              S/ 0
              <span className="ml-1 text-base font-normal text-muted-foreground">para siempre</span>
            </p>
            <ul className="mt-6 flex-1 space-y-3 text-sm">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" strokeWidth={3} />
                  {f}
                </li>
              ))}
            </ul>
            {signedIn === true ? (
              <div className="mt-8 flex flex-col gap-2">
                <div className="rounded-lg border border-dashed border-border px-4 py-2.5 text-center text-sm font-medium text-muted-foreground">
                  {betaActive
                    ? "Incluido gratis durante la beta"
                    : isPremium
                      ? "Incluido en tu plan Premium"
                      : "Tu plan actual"}
                </div>
                {/* Elegir Gratis no cierra la puerta a Premium: si todavía no
                  gastó su prueba, se lo recordamos aquí mismo en vez de que
                  tenga que descubrirlo mirando las otras dos columnas. */}
                {canTrial && (
                  <Button
                    variant="outline"
                    size="lg"
                    className="press"
                    disabled={activate.isPending}
                    onClick={() => activate.mutate()}
                  >
                    {activate.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    Activar premium {TRIAL_DAYS} días gratis
                  </Button>
                )}
              </div>
            ) : (
              <div className="mt-8 flex flex-col gap-2">
                <Button asChild variant="outline" size="lg" className="press">
                  <Link to="/auth">Crear cuenta gratis</Link>
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Al crear tu cuenta puedes activar {TRIAL_DAYS} días de Premium gratis.
                </p>
              </div>
            )}
          </section>

          {/* Premium Mensual — el recomendado: la columna elevada de las tres,
            para quien quiere probar Premium sin comprometerse a 3 meses. */}
          <section
            ref={monthlyRibbon.ref}
            aria-label="Plan Premium Mensual"
            className="animate-fade-up relative flex w-[85%] shrink-0 snap-center flex-col overflow-hidden rounded-2xl border-2 border-primary bg-card p-6 shadow-lg sm:p-8 lg:w-auto lg:shrink lg:snap-align-none"
            style={{ "--i": 1 } as React.CSSProperties}
          >
            {/* Cinta diagonal (solo durante la beta): el precio se sigue
                mostrando tal cual — para que el estudiante vea que Premium
                existe y cuánto vale — la cinta solo aclara que hoy no se
                cobra nada. edgeInset=0.25 (ver useCornerRibbon) la deja
                menos empinada que la del landing, pero sigue tocando ambos
                bordes de la tarjeta. Va antes que el resto del contenido en
                el DOM para que el texto (sin z-index explícito) pinte
                encima suyo. */}
            {betaActive && monthlyRibbon.ribbon && (
              <div
                aria-hidden
                className="absolute left-1/2 top-1/2 bg-destructive py-1.5 text-center text-xl font-bold uppercase tracking-wider text-destructive-foreground shadow-md"
                style={{
                  width: `${monthlyRibbon.ribbon.width}px`,
                  transform: `translate(-50%, -50%) rotate(-${monthlyRibbon.ribbon.angle}deg)`,
                }}
              >
                Gratis por tiempo limitado
              </div>
            )}
            <span className="absolute right-0 top-0 rounded-bl-xl bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
              Recomendado
            </span>
            <h2 className="inline-flex items-center gap-2 font-display text-xl font-bold">
              Premium Mensual <Sparkles className="h-4 w-4 text-accent-foreground" aria-hidden />
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Todo lo que decide tu ingreso, mes a mes.
            </p>
            <p className="mt-5 font-display text-4xl font-bold">
              S/ {PLAN_PRICES.monthly.amount}
              <span className="ml-1 text-base font-normal text-muted-foreground">
                {PLAN_PRICES.monthly.per}
              </span>
            </p>
            {/* Precio por día: el mismo monto reformulado en la unidad más
                chica posible (mental accounting) — S/14.99/mes cuesta
                "pensar" más que S/0.50/día, aunque sea el mismo número. */}
            <p className="mt-1 text-sm font-medium text-foreground">
              S/ {(Number(PLAN_PRICES.monthly.amount) / 30).toFixed(2)} al día
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {betaActive
                ? "El precio se activa cuando termine el período beta."
                : "Cancelas cuando quieras, sin plazos."}
            </p>
            <ul className="mt-6 flex-1 space-y-3 text-sm">
              {PREMIUM_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" strokeWidth={3} />
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col gap-2">{renderPremiumCta("monthly")}</div>
          </section>

          {/* Premium Trimestral — mismos beneficios, precio por 3 meses con
            descuento. No es la recomendada, pero su ahorro debe seguir
            siendo visible de un vistazo (chip verde junto al título). */}
          <section
            ref={quarterlyRibbon.ref}
            aria-label="Plan Premium Trimestral"
            className="animate-fade-up relative flex w-[85%] shrink-0 snap-center flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8 lg:w-auto lg:shrink lg:snap-align-none"
            style={{ "--i": 2 } as React.CSSProperties}
          >
            {betaActive && quarterlyRibbon.ribbon && (
              <div
                aria-hidden
                className="absolute left-1/2 top-1/2 bg-destructive py-1.5 text-center text-xl font-bold uppercase tracking-wider text-destructive-foreground shadow-md"
                style={{
                  width: `${quarterlyRibbon.ribbon.width}px`,
                  transform: `translate(-50%, -50%) rotate(-${quarterlyRibbon.ribbon.angle}deg)`,
                }}
              >
                Gratis por tiempo limitado
              </div>
            )}
            <h2 className="inline-flex flex-wrap items-center gap-2 font-display text-xl font-bold">
              Premium Trimestral
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              El mismo Premium, pagado cada 3 meses.
            </p>
            <p className="mt-5 font-display text-4xl font-bold">
              S/ {PLAN_PRICES.quarterly.amount}
              <span className="ml-1 text-base font-normal text-muted-foreground">
                {PLAN_PRICES.quarterly.per}
              </span>
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              S/ {(Number(PLAN_PRICES.quarterly.amount) / 90).toFixed(2)} al día
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="line-through">S/ {PLAN_PRICES.quarterly.fullPrice}</span>{" "}
              <span className="font-semibold text-success">
                ahorras {PLAN_PRICES.quarterly.discountPct}%
              </span>
            </p>
            {betaActive && (
              <p className="mt-1 text-xs text-muted-foreground">
                El precio se activa cuando termine el período beta.
              </p>
            )}
            <ul className="mt-6 flex-1 space-y-3 text-sm">
              {PREMIUM_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" strokeWidth={3} />
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col gap-2">{renderPremiumCta("quarterly")}</div>
          </section>
        </div>
      </div>

      {/* Cómo funciona la prueba — antes solo tenía aria-label (accesible
          para lectores de pantalla, pero invisible en pantalla: nada le
          decía a un visitante vidente qué explicaba este bloque). Oculta
          durante la beta: explicar el trial de 7 días mientras arriba dice
          "todos tienen Premium gratis" lee como contradictorio. */}
      {!betaActive && (
        <section aria-labelledby="trial-how-heading" className="mt-14">
          <h2 id="trial-how-heading" className="text-center font-display text-2xl font-bold">
            Así funciona tu prueba gratuita
          </h2>
          <div className="mt-6 grid gap-4 rounded-2xl border border-border bg-secondary/30 p-6 sm:grid-cols-3 sm:p-8">
            {[
              {
                title: "Actívala cuando quieras",
                text: "Un click y tienes Premium completo. Sin tarjeta, sin formularios.",
              },
              {
                title: `${TRIAL_DAYS} días completos`,
                text: "Exámenes oficiales, simulacros de tu universidad, ranking y análisis de tiempo.",
              },
              {
                title: "Vuelves a gratis solo",
                text: "Si no te suscribes, tu cuenta regresa al plan gratuito automáticamente. Nada se cobra.",
              },
            ].map((s, i) => (
              <div key={s.title} className="flex gap-3">
                <span className="font-data grid h-8 w-8 shrink-0 place-items-center rounded-full border border-primary/40 text-sm font-bold text-primary">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-sm font-bold">{s.title}</h3>
                  <p className="mt-1 text-pretty text-sm text-muted-foreground">{s.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tabla comparativa */}
      <section aria-label="Comparación de planes" className="mt-14">
        <h2 className="text-center font-display text-2xl font-bold">
          Todo lo que incluye cada plan
        </h2>
        <div
          ref={tableRef}
          className="mt-6 overflow-hidden rounded-2xl border border-border bg-card"
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50 text-left">
                <th className="px-4 py-3 font-semibold sm:px-6">Funcionalidad</th>
                <th className="w-24 px-2 py-3 text-center font-semibold sm:w-32">Gratis</th>
                <th className="w-24 px-2 py-3 text-center font-semibold text-primary sm:w-32">
                  Premium
                </th>
              </tr>
            </thead>
            <tbody>
              {PLAN_COMPARISON.map((row, i) => (
                <tr
                  key={row.feature}
                  className={cn(
                    tableVisible && "animate-fade-up",
                    "border-b border-border last:border-b-0",
                  )}
                  style={
                    tableVisible ? ({ "--i": Math.min(i, 10) } as React.CSSProperties) : undefined
                  }
                >
                  <td className="px-4 py-3 sm:px-6">{row.feature}</td>
                  <td className="px-2 py-3 text-center">
                    {row.free === true ? (
                      <Check
                        className="mx-auto h-4 w-4 text-success"
                        strokeWidth={3}
                        aria-label="Incluido"
                      />
                    ) : row.free === "partial" ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Minus className="h-3.5 w-3.5" aria-hidden /> {row.freeNote}
                      </span>
                    ) : (
                      <Lock
                        className="mx-auto h-4 w-4 text-muted-foreground/50"
                        aria-label="Solo Premium"
                      />
                    )}
                  </td>
                  <td className="px-2 py-3 text-center">
                    <Check
                      className="mx-auto h-4 w-4 text-success"
                      strokeWidth={3}
                      aria-label="Incluido"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* CTA final */}
      <section className="mt-14 text-center">
        {signedIn === false ? (
          <Button asChild size="lg" className="press min-h-11">
            <Link to="/auth">
              Crear cuenta gratis <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        ) : canTrial ? (
          <Button
            size="lg"
            className="press min-h-11"
            disabled={activate.isPending}
            onClick={() => activate.mutate()}
          >
            <Sparkles className="mr-2 h-4 w-4" /> Activar premium {TRIAL_DAYS} días gratis
          </Button>
        ) : null}
        <p className="mt-3 text-xs text-muted-foreground">
          ¿Dudas sobre los planes? Escríbenos a{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-primary hover:underline">
            {CONTACT_EMAIL}
          </a>
        </p>
      </section>

      {/* Suscripción: placeholder hasta integrar la pasarela de pago.
          `subscribeBilling` (no un booleano) porque ahora hay dos columnas
          premium a la vez — el diálogo tiene que confirmar el plan
          específico que el estudiante tocó, no un genérico "Premium" que
          podía referirse a cualquiera de los dos precios. */}
      <Dialog
        open={subscribeBilling !== null}
        onOpenChange={(open) => !open && setSubscribeBilling(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
              <Mail className="h-6 w-6" aria-hidden />
            </div>
            <DialogTitle className="text-center font-display text-2xl">
              Muy pronto podrás suscribirte aquí
            </DialogTitle>
            <DialogDescription className="text-center">
              Estamos habilitando los pagos en línea para el plan{" "}
              {subscribeBilling && PLAN_PRICES[subscribeBilling].label.toLowerCase()}. Mientras
              tanto, escríbenos y te activamos Premium de forma manual — responde una persona real,
              rápido.
            </DialogDescription>
          </DialogHeader>
          <Button asChild size="lg" className="press">
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
                `Quiero suscribirme a Admi-Tec Premium (${
                  subscribeBilling ? PLAN_PRICES[subscribeBilling].label : ""
                })`,
              )}`}
            >
              <Mail className="mr-2 h-4 w-4" /> Escribir a {CONTACT_EMAIL}
            </a>
          </Button>
          {subscribeBilling && (
            <p className="text-center text-xs text-muted-foreground">
              Premium {PLAN_PRICES[subscribeBilling].label}: S/{" "}
              {PLAN_PRICES[subscribeBilling].amount} {PLAN_PRICES[subscribeBilling].per}.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
