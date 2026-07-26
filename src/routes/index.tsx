import { Fragment, lazy, Suspense } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Banknote,
  Check,
  Compass,
  HelpCircle,
  Loader2,
  Lock,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { listTopics, listUniversities } from "@/lib/exercises.functions";
import { PillarsSection } from "@/components/landing/pillars";
import { SectionNav, type SectionNavItem } from "@/components/landing/section-nav";
import { dailyExerciseQO } from "@/lib/daily-exercise.functions";
import { UniversityMarquee } from "@/components/landing/university-marquee";
import { TrustPill } from "@/components/landing/trust-pill";
import { WhatsAppFloat } from "@/components/whatsapp-float";
import { cn } from "@/lib/utils";
import { useActiveSection } from "@/hooks/use-active-section";
import { useInViewOnce } from "@/hooks/use-in-view-once";
import { useInViewport } from "@/hooks/use-in-viewport";
import { useCountUp } from "@/hooks/use-count-up";
import { useScrollProgress } from "@/hooks/use-scroll-progress";
import { useBetaStatus } from "@/hooks/use-beta-status";
import { useCornerRibbon } from "@/hooks/use-corner-ribbon";
import { fireConfetti } from "@/lib/confetti";
import { pageMeta, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";
import { PLAN_PRICES, TRIAL_DAYS } from "@/lib/plan";

// Lazy, not a static import: AnswerSheetWidget pulls in KaTeX (@/lib/math-render)
// to render the daily exercise's math — ~130KB gzipped, the single heaviest
// chunk on the site, for one below-the-fold widget. Statically importing it
// forced every landing-page visitor (the entire public/marketing audience) to
// pay for math rendering they might never scroll to see. Deferred to its own
// chunk, fetched once the "Reto del día" section actually mounts.
const AnswerSheetWidget = lazy(() =>
  import("@/components/landing/answer-sheet-widget").then((m) => ({
    default: m.AnswerSheetWidget,
  })),
);

// Mirrors AnswerSheetWidget's own shape (header bar, blurred question card,
// score footer) so the Suspense fallback doesn't cause a layout jump when
// the real widget's chunk finishes loading.
function AnswerSheetSkeleton() {
  return (
    <div
      className="animate-pulse overflow-hidden rounded-lg border border-border bg-card motion-reduce:animate-none"
      aria-hidden="true"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="h-3 w-28 rounded bg-muted" />
        <div className="h-6 w-14 rounded-md bg-muted" />
      </div>
      <div className="space-y-2.5 px-5 py-5">
        <div className="h-3 w-full rounded bg-muted" />
        <div className="h-3 w-3/4 rounded bg-muted" />
        <div className="mt-3 h-10 rounded-md border border-border bg-muted/60" />
        <div className="h-10 rounded-md border border-border bg-muted/60" />
        <div className="h-10 rounded-md border border-border bg-muted/60" />
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/40 px-5 py-4">
        <div className="h-6 w-16 rounded bg-muted" />
        <div className="h-6 w-20 rounded-md bg-muted" />
      </div>
    </div>
  );
}

// Secciones "de pantalla completa" que participan del scroll-snap: nav
// lateral de puntos + fade de opacidad de la no activa (ver SectionNav /
// useActiveSection). El ticker de universidades no entra — es un listón
// interstitial, no una sección propia.
const NAV_ITEMS: SectionNavItem[] = [
  { id: "hero", label: "Inicio" },
  { id: "pilares", label: "Pilares" },
  { id: "empezar", label: "Primeros pasos" },
  { id: "reto", label: "Reto del día" },
  { id: "ranking", label: "Ranking" },
  { id: "planes", label: "Planes" },
  { id: "faq", label: "Preguntas" },
  { id: "cta", label: "Crear cuenta" },
];

const topicsQO = queryOptions({ queryKey: ["topics"], queryFn: () => listTopics() });
const uniQO = queryOptions({ queryKey: ["universities"], queryFn: () => listUniversities() });

export const Route = createFileRoute("/")({
  head: () => {
    const base = pageMeta({
      path: "/",
      title: `${SITE_NAME} — Exámenes oficiales, simulacros y ranking`,
      description: SITE_DESCRIPTION,
      rawTitle: true,
    });
    return {
      ...base,
      links: [
        ...base.links,
        // Homepage-hero-only "at" register fonts — see __root.tsx for why these
        // aren't in the global stylesheet link. Weights trimmed to only what's
        // actually rendered (grepped every font-display/font-data usage on
        // this page): Bricolage is 700 everywhere except the marquee's 600,
        // never 500 or 800; JetBrains Mono never appears at 500. Requesting
        // unused weights was pure wasted font-file GETs on the page's own
        // critical path.
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=Public+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap",
        },
        // The three section-background photos below the hero are all hosted
        // on Unsplash — warm the connection so the first one (lazy-loaded,
        // but still on this page) doesn't pay DNS+TLS setup cost on top of
        // the fetch itself.
        { rel: "preconnect", href: "https://images.unsplash.com" },
      ],
    };
  },
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(topicsQO);
    context.queryClient.ensureQueryData(uniQO);
    context.queryClient.ensureQueryData(dailyExerciseQO);
  },
  component: Index,
  pendingComponent: LandingPending,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-destructive">
      {error.message}
    </div>
  ),
});

// Classic skeleton + spinner fallback while this route's loader is in
// flight (router.tsx's defaultPendingComponent is generic and tuned for the
// temas/exámenes listing pages — it doesn't carry the "at" dark register, so
// it flashed as a mismatched light page before the hero mounted). Own dark
// canvas here keeps that flash from happening.
function LandingPending() {
  return (
    <div className="at flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-4">
      <Loader2
        className="h-8 w-8 animate-spin text-primary motion-reduce:animate-none"
        aria-hidden="true"
      />
      <span role="status" className="sr-only">
        Cargando
      </span>
      <div className="w-full max-w-xl animate-pulse motion-reduce:animate-none" aria-hidden="true">
        <div className="mx-auto h-9 w-5/6 rounded bg-muted sm:h-11" />
        <div className="mx-auto mt-3 h-9 w-2/3 rounded bg-muted sm:h-11" />
        <div className="mx-auto mt-6 h-4 w-full max-w-md rounded bg-muted" />
        <div className="mx-auto mt-2 h-4 w-3/4 max-w-md rounded bg-muted" />
        <div className="mt-8 flex justify-center gap-3">
          <div className="h-11 w-40 rounded-md bg-muted" />
          <div className="h-11 w-40 rounded-md bg-muted" />
        </div>
      </div>
    </div>
  );
}

// Puntajes de ejemplo según la grilla de puntuación del examen (no
// porcentajes) — coherentes con el "812 pts / mínimo 800" del hero.
// Los 4 pasos reales que da un estudiante nuevo, en orden: el onboarding
// (única pantalla obligatoria: universidad — carrera/tiempo/temas débiles
// se pueden saltar), ejercicios sueltos sin cronómetro visible con
// corrección y solución instantáneas, un simulacro cronometrado y
// calificado, y por último su análisis de resultado — la misma secuencia
// que ve dentro de la app, no una versión idealizada para el marketing. El
// paso 4 es honesto sobre el límite real: nota y tiempo por pregunta son
// gratis para todos (ver examen-sesion.$sessionId.resultado.tsx); percentil,
// promedio general y la recomendación de curso más débil están detrás de
// PremiumOverlay (mismo archivo + panel.tsx) — `premium: true` dispara el
// aviso en vez de fingir que todo es gratis.
// Palabras en negrita: el gancho concreto de cada paso (lo que
// realistamente atrae a un postulante), no cualquier frase — mismo patrón
// <strong className="font-semibold text-foreground"> que ya usa el párrafo
// del hero, para que ambos bloques lean como una sola voz.
const START_STEPS = [
  {
    title: "Elige tu universidad",
    text: (
      <>
        Es lo único obligatorio para empezar.{" "}
        <strong className="font-semibold text-foreground">Exámenes, simulacros y ranking</strong>{" "}
        quedan <strong className="font-semibold text-foreground">ajustados a tu examen</strong>{" "}
        desde ese momento.
      </>
    ),
  },
  {
    title: "Practica sin presión",
    text: (
      <>
        Resuelve ejercicio por ejercicio, sin cronómetro visible. Cada respuesta{" "}
        <strong className="font-semibold text-foreground">se corrige al instante</strong>, con la{" "}
        <strong className="font-semibold text-foreground">solución completa paso a paso</strong>.
      </>
    ),
  },
  {
    title: "Simulacros como examen real",
    text: (
      <>
        Cuando estés listo, rinde un simulacro cronometrado con{" "}
        <strong className="font-semibold text-foreground">preguntas reales</strong>. Se corrige al
        instante y te dice, en puntaje,{" "}
        <strong className="font-semibold text-foreground">
          si ya alcanzaste el mínimo que pide tu carrera
        </strong>
        .
      </>
    ),
  },
  {
    title: "Descubre qué reforzar",
    text: (
      <>
        Después de cada simulacro ves{" "}
        <strong className="font-semibold text-foreground">tu nota y el tiempo que usaste</strong> en
        cada pregunta. Con Premium, además comparas tu percentil frente a otros postulantes y ves{" "}
        <strong className="font-semibold text-foreground">qué tema exacto conviene reforzar</strong>
        .
      </>
    ),
  },
];

const LEADERBOARD = [
  { rank: 1, handle: "Vector_123", score: 941 },
  { rank: 2, handle: "RaízDe2", score: 926 },
  { rank: 3, handle: "Postulante_UNI19", score: 918 },
  { rank: 4, handle: "MatrizPeru", score: 903 },
  { rank: 5, handle: "Asíntota_04", score: 897 },
];

function Index() {
  const { data: topics } = useSuspenseQuery(topicsQO);
  const { data: unis } = useSuspenseQuery(uniQO);
  const totalExercises = topics.reduce((s, t) => s + t.exerciseCount, 0);
  const { ref: rankingRef, visible: rankingVisible } = useInViewOnce<HTMLDivElement>();
  const { ref: rankingIntroRef, visible: rankingIntroVisible } = useInViewOnce<HTMLDivElement>();
  const { ref: startRef, visible: startVisible } = useInViewOnce<HTMLDivElement>();
  const { ref: retoRef, visible: retoVisible } = useInViewOnce<HTMLDivElement>();
  const { ref: planesRef, visible: planesVisible } = useInViewOnce<HTMLDivElement>(0.3);
  // useBetaStatus (público, sin auth) en vez de usePlan: la mayoría de
  // visitantes del landing no tienen sesión, y usePlan solo consulta cuando
  // signedIn === true — acá necesitamos que también funcione para un
  // visitante anónimo.
  const { betaActive } = useBetaStatus();
  // La cinta "Gratis por tiempo limitado" va de esquina a esquina de la
  // tarjeta de precio real (lengthScale=1 por defecto) — ver useCornerRibbon
  // para por qué el ángulo no puede ser un rotate-X fijo.
  const { ref: priceCardRef, ribbon } = useCornerRibbon<HTMLDivElement>();
  const { ref: faqRef, visible: faqVisible } = useInViewOnce<HTMLDivElement>();
  const { ref: ctaRef, visible: ctaVisible } = useInViewOnce<HTMLDivElement>(0.3);
  const scrollProgressRef = useScrollProgress<HTMLDivElement>();
  // Parallax removed (isolation test, see styles.css/use-parallax.ts for the
  // revert path) — the seven `ref={xRef}` attachments below were also
  // removed, along with each element's `transform: translateY(var(--parallax-y))`
  // + `willChange` inline style, since with nothing registered there's no
  // offset to apply.
  const activeId = useActiveSection(NAV_ITEMS.map((item) => item.id));
  const fadeSection = (id: string) =>
    cn(
      "transition-opacity duration-500 ease-out motion-reduce:transition-none",
      activeId === id ? "opacity-100" : "opacity-80",
    );

  // Las 5 preguntas que más frenan a un postulante antes de registrarse
  // (crédibilidad de los exámenes, cobertura, privacidad del ranking, costo)
  // — la de plan gratuito/Premium se ajusta sola durante la beta en vez de
  // decir "Premium cuesta X" cuando en realidad hoy es gratis para todos.
  const uniNames = unis.map((u) => u.short_name).join(", ");
  const FAQ_ITEMS = [
    {
      q: "¿Es realmente gratis crear una cuenta?",
      a: "Sí. Registrarte y usar el plan gratuito no cuesta nada, para siempre — sin tarjeta, sin trucos. Premium es opcional, para cuando quieras exámenes oficiales completos, simulacros por universidad y el ranking completo.",
    },
    {
      q: "¿Los ejercicios y exámenes son reales, o inventados como en otras apps?",
      a: "Todos los exámenes oficiales son de años anteriores, tal cual se tomaron — no ejercicios genéricos. Los simulacros se corrigen con el mismo sistema de puntos (positivo y negativo) del examen real.",
    },
    {
      q: "¿Para qué universidades sirve Admi-Tec?",
      a: uniNames
        ? `Cubrimos los exámenes de admisión de ${unis.length} universidades: ${uniNames}.`
        : "Cubrimos los exámenes de admisión de las principales universidades del Perú.",
    },
    {
      q: "¿Otros van a ver mi nombre real en el ranking?",
      a: "No. El ranking es pseudónimo — eliges un apodo, y nadie ve tu nombre real, ni siquiera en tu propia posición dentro del ranking.",
    },
    {
      q: "¿Qué diferencia hay entre el plan gratuito y Premium?",
      a: betaActive
        ? "Ahora mismo estamos en beta: todos tienen acceso Premium completo gratis, por tiempo limitado. El plan gratuito incluye práctica por curso, simulacros con plantillas generales y tu reto del día, para siempre. Premium (hoy gratis para todos) suma los exámenes oficiales completos, los simulacros específicos de tu universidad, el ranking completo y el puntaje exacto que te falta para tu carrera."
        : "El plan gratuito incluye práctica por curso, simulacros con plantillas generales y tu reto del día, para siempre y sin costo. Premium desbloquea los exámenes oficiales completos, los simulacros específicos de tu universidad, el ranking completo y el puntaje exacto que te falta para tu carrera.",
    },
  ];

  return (
    // overflow-x-clip: the hero's own glow blobs still bleed past the
    // viewport edges; without the clip they create horizontal scroll and a
    // white body stripe shows beside the navy canvas.
    // isolate: keeps this page's own stacking context self-contained
    // (SectionNav, the progress rail, WhatsAppFloat are all fixed-position).
    // AmbientBackground removed (isolation test — three blurred,
    // continuously-morphing blobs plus 10 twinkling particles, running
    // regardless of scroll; a likely jank source on mid/low-end devices).
    // To restore: re-add the import and `<AmbientBackground />` here — the
    // component itself is untouched at
    // src/components/landing/ambient-background.tsx.
    <div className="at isolate overflow-x-clip">
      {/* Scroll progress rail — a position indicator, not decoration, so it
          stays put under prefers-reduced-motion (only the transition below
          is cosmetic smoothing). scaleX from a full-width bar, not a width
          animation — transform-only, no layout reflow on every scroll frame. */}
      <div aria-hidden className="fixed inset-x-0 top-0 z-50 h-[3px] bg-border/30">
        <div
          ref={scrollProgressRef}
          className="h-full w-full origin-left bg-primary transition-transform duration-150 ease-out motion-reduce:transition-none"
          style={{ transform: "scaleX(0)" }}
        />
      </div>

      <SectionNav items={NAV_ITEMS} activeId={activeId} />

      {/* Hero */}
      <section
        id="hero"
        className={cn(
          "relative overflow-hidden border-b border-border",
          "snap-section flex flex-col justify-center",
          fadeSection("hero"),
        )}
      >
        {/* Ambient depth: two large soft glows (amber = pencil light, teal =
            "correct") so the navy canvas reads as lit paper, never a flat fill.
            Each floats continuously at rest via animate-float (scroll
            parallax removed — isolation test). */}
        <div
          aria-hidden
          className="animate-float pointer-events-none absolute -top-40 right-[-10rem]"
          style={
            {
              "--float-x": "-16px",
              "--float-y": "20px",
              "--float-duration": "10s",
            } as React.CSSProperties
          }
        >
          <div className="h-[30rem] w-[30rem] rounded-full bg-primary/15 blur-[120px]" />
        </div>
        <div
          aria-hidden
          className="animate-float pointer-events-none absolute -bottom-48 left-[-12rem]"
          style={
            {
              "--float-x": "18px",
              "--float-y": "-14px",
              "--float-duration": "12s",
              "--float-delay": "-3s",
            } as React.CSSProperties
          }
        >
          <div className="h-[26rem] w-[26rem] rounded-full bg-success/[0.12] blur-[110px]" />
        </div>
        <div className="relative mx-auto grid max-w-6xl gap-8 px-4 pb-8 pt-12 sm:pb-10 sm:pt-16 lg:grid-cols-[1.2fr_1fr] lg:items-start lg:gap-12 lg:pb-12 lg:pt-20">
          <div>
            <h1 className="text-balance text-[clamp(2.5rem,1.9rem+3.2vw,4.5rem)] font-bold leading-[1.02] tracking-[-0.03em]">
              <StaggeredWords text="Cuando llegues a tu examen," startIndex={0} />{" "}
              <span className="text-primary">
                <StaggeredWords text="ya lo habrás resuelto." startIndex={5} />
              </span>
            </h1>
            <p
              className="animate-fade-up mt-6 max-w-md text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg"
              style={{ "--i": 11 } as React.CSSProperties}
            >
              Exámenes oficiales de tu universidad, simulacros de{" "}
              <strong className="font-semibold text-foreground">todos tus cursos</strong> que se
              corrigen como el examen real, y{" "}
              <strong className="font-semibold text-foreground">
                el puntaje exacto que te falta
              </strong>{" "}
              para tu carrera, así sabes dónde estás parado, sin adivinar ✅.
            </p>
            <div
              className="animate-fade-up mt-8 flex flex-wrap gap-3"
              style={{ "--i": 13 } as React.CSSProperties}
            >
              <Button asChild size="lg" className="press cta-overshoot min-h-11">
                <Link to="/temas">
                  Empezar a practicar <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="press cta-overshoot min-h-11">
                <Link to="/examenes">Ver exámenes oficiales</Link>
              </Button>
            </div>
            <div className="animate-fade-up" style={{ "--i": 14 } as React.CSSProperties}>
              <TrustPill className="mt-4">Regístrate totalmente gratis.</TrustPill>
            </div>
            <div
              className="animate-fade-up mt-10 flex flex-wrap items-baseline gap-x-8 gap-y-4 sm:max-w-md"
              style={{ "--i": 15 } as React.CSSProperties}
            >
              <HeroStat label="Ejercicios" value={totalExercises} />
              <div className="hidden h-9 w-px bg-border sm:block" aria-hidden />
              <HeroStat label="Cursos" value={topics.length} />
              <div className="hidden h-9 w-px bg-border sm:block" aria-hidden />
              <HeroStat label="Universidades" value={unis.length} />
            </div>
          </div>

          {/* Postulante real de cuerpo presente: solo aparece cuando la
              grilla tiene espacio para ponerlo junto al texto (lg+). Debajo
              de eso el texto manda solo — nunca se apila la foto bajo la
              copy en celulares/tablets. */}
          <div className="relative mx-auto hidden w-full max-w-[24rem] items-end justify-center lg:-mb-16 lg:flex">
            {/* Único destello ámbar detrás del postulante: respira lento
                (mismo animate-glow que el widget del reto del día) para
                darle dinamismo sin la línea de contorno que antes lo
                enjaulaba. */}
            <div
              aria-hidden
              className="animate-glow absolute -inset-x-[16%] -inset-y-[6%] rounded-[50%] bg-primary/[0.18] blur-2xl"
            />
            {/* AVIF/WebP first (62KB / 108KB vs. the original 442KB PNG —
                a colormap PNG is the wrong codec for a photo); PNG stays as
                the fallback for browsers that support neither. */}
            <picture>
              <source srcSet="/landing/estudiante-hero.avif" type="image/avif" />
              <source srcSet="/landing/estudiante-hero.webp" type="image/webp" />
              <img
                src="/landing/estudiante-hero.png"
                alt="Postulante preuniversitario sonriendo, listo para su examen de admisión"
                width={900}
                height={1468}
                fetchPriority="high"
                decoding="async"
                className="relative w-full object-contain drop-shadow-[0_24px_40px_rgba(0,0,0,0.45)]"
              />
            </picture>
          </div>
        </div>
      </section>

      {/* University marquee + course ticker — a thin interstitial ribbon
          between the Hero and Pilares sections. Visible en todos los
          anchos — la animación en sí sigue corriendo en celular (no está
          apagada por CSS), así que no hay tira congelada que se vea rota. */}
      <section className="border-b border-border bg-card/50">
        <div className="mx-auto max-w-6xl px-4 py-5">
          <div className="flex items-center gap-6">
            <span className="hidden shrink-0 text-sm font-medium text-muted-foreground sm:block">
              Preparación oficial para
            </span>
            <UniversityMarquee universities={unis} />
          </div>
          {/* Second strip drifting the other way: every course covered, with its
              exercise count — full coverage made visible, not implied. */}
          {topics.length > 0 && (
            <div className="mt-4 flex items-center gap-6">
              <span className="hidden shrink-0 text-sm font-medium text-muted-foreground sm:block">
                Cursos disponibles
              </span>
              <div
                className="marquee-track relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
                role="list"
                aria-label="Cursos disponibles"
              >
                <div className="animate-marquee-reverse flex w-max items-center gap-3">
                  {[...topics, ...topics].map((t, i) => (
                    <span
                      key={`${t.id}-${i}`}
                      role="listitem"
                      aria-hidden={i >= topics.length}
                      className="shrink-0 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-foreground/85 transition-transform duration-[350ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-110"
                    >
                      {t.name}
                      <span className="font-data ml-1.5 tabular-nums text-muted-foreground">
                        {t.exerciseCount}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Los 3 pilares */}
      <PillarsSection sectionActive={activeId === "pilares"} />

      {/* Cómo empezar: reassurance section para quien recién llega — sin
          cronómetro, sin ranking, sin urgencia todavía. Navy plano (sin
          imagen de fondo) para que se sienta como una pausa antes del
          "reto del día". */}
      <section
        id="empezar"
        className={cn(
          "relative overflow-hidden border-b border-border",
          "snap-section flex flex-col justify-center",
          fadeSection("empezar"),
        )}
      >
        {/* Marca de agua decorativa: una brújula a gran escala y casi
            invisible (orientación/primeros pasos) — nunca un segundo glow
            (ver el One Glow Rule en DESIGN.md). Parallax removido (test de
            aislamiento), queda estática. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-16 -top-16 text-foreground/[0.06]"
        >
          <Compass className="h-[24rem] w-[24rem]" strokeWidth={1} />
        </div>
        <div ref={startRef} className="relative mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-balance text-[clamp(1.75rem,1.5rem+1.2vw,2.5rem)] font-bold tracking-[-0.03em]">
              No necesitas ser el mejor para empezar hoy.
            </h2>
            <p className="mt-3 text-pretty text-muted-foreground">
              Así se ven tus primeros días en Admi-Tec. A tu ritmo, sin cronómetro hasta que tú
              quieras.
            </p>
            <TrustPill className="mt-4">Registrate gratis, en menos de un minuto</TrustPill>
          </div>

          {/* Flex row, not a grid: a real connecting line has to live between
              two cards as its own sibling element, and a flex row is the
              natural place to interleave "card, connector, card, connector,
              card" — see the step-connector rule in styles.css for why the
              line itself is a one-shot scroll-triggered draw, not another
              always-on loop. Row layout only kicks in at lg, not sm: at 4
              steps, cramming four cards into a ~640-1023px tablet width
              read as squeezed, so tablets now get one more breakpoint of
              stacked cards before the connected row appears. */}
          <div className="mt-10 flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-0">
            {START_STEPS.map((s, i) => (
              <Fragment key={s.title}>
                <div
                  className={cn(
                    startVisible && "animate-rise-in",
                    "group rounded-lg border border-border bg-card p-6 transition-transform duration-[350ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-2 lg:flex-1",
                  )}
                  style={startVisible ? ({ "--i": i * 2 } as React.CSSProperties) : undefined}
                >
                  <span className="font-data grid h-9 w-9 place-items-center rounded-full bg-primary text-base font-bold text-primary-foreground transition-transform duration-[350ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:rotate-12 group-hover:scale-110">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 text-balance text-lg font-bold leading-snug tracking-tight">
                    {s.title}
                  </h3>
                  {/* Honest about the plan split (see the note above
                      START_STEPS): this is the one step that isn't fully
                      free, so it gets the same lock+label device the
                      product itself uses for gated features, not a claim
                      buried only in the paragraph below. */}
                  {s.premium && (
                    <span className="mt-2 inline-flex items-center gap-1 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-primary">
                      <Lock className="h-3 w-3" aria-hidden /> Premium
                    </span>
                  )}
                  <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
                    {s.text}
                  </p>
                </div>
                {/* Connects step i to step i+1. Vertical offset (42px) lands
                    the line on the badge's own center (24px card padding +
                    half of the 36px badge). Hidden below lg: stacked
                    tablet/mobile steps read fine from their numbers alone. */}
                {i < START_STEPS.length - 1 && (
                  <div
                    aria-hidden
                    className="hidden w-10 shrink-0 pointer-events-none pt-[42px] lg:block"
                  >
                    <span
                      className={cn(
                        "step-connector block h-px w-full bg-gradient-to-r from-primary/60 to-primary/10",
                        startVisible && "animate-step-draw",
                      )}
                      style={
                        startVisible ? ({ "--i": i * 2 + 1 } as React.CSSProperties) : undefined
                      }
                    />
                  </div>
                )}
              </Fragment>
            ))}
          </div>

          <div className="mt-10 flex justify-center">
            <Button asChild size="lg" className="press cta-overshoot min-h-11">
              <Link to="/auth" onClick={() => fireConfetti()}>
                Crear cuenta gratis <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Reto del día — cream paper (mismo .at-paper que Pilares) en vez de la
          foto de fondo: una pausa clara entre los dos bloques navy
          ("empezar" arriba, "ranking" abajo). */}
      <section
        id="reto"
        className={cn(
          "at-paper relative overflow-hidden border-b border-border",
          "snap-section flex flex-col justify-center",
          fadeSection("reto"),
        )}
      >
        <SectionSweep />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-primary/10 blur-[100px]"
        />
        <div
          ref={retoRef}
          className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:py-24 lg:grid-cols-[1fr_1.1fr] lg:items-center"
        >
          <div className={cn(retoVisible && "animate-rise-in")}>
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
              <span className="inline-flex h-2 w-2 rounded-full bg-foreground/70" aria-hidden />{" "}
              Reto del día
            </span>
            <h2 className="mt-3 text-balance text-[clamp(1.75rem,1.5rem+1.2vw,2.5rem)] font-bold tracking-[-0.03em]">
              Ponte a prueba ahora mismo.
            </h2>
            <p className="mt-3 max-w-md text-pretty text-muted-foreground">
              Cada día publicamos{" "}
              <strong className="font-semibold text-foreground">
                un ejercicio real de nuestra base
              </strong>{" "}
              (el mismo para todos los estudiantes). Resuélvelo contra el reloj y compara tus resultados con todos
              los que lo intentaron hoy.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Sin registrarte y sin presión: pruébalo cuando quieras,{" "}
              <strong className="font-semibold text-foreground">el cronómetro te espera</strong>.
            </p>
          </div>
          <div
            className={cn(
              // Re-anida "at" (mismo truco que SimulacroShowcase en Pilares):
              // el widget se pierde en el beige de .at-paper si hereda sus
              // tokens, así que vuelve a su navy/card original aquí adentro.
              // rounded-lg empareja el radio con el propio rounded-lg del
              // widget: mismo tamaño exacto (sin padding entre ambos), así
              // que el widget lo tapa por completo y no asoma navy cuadrado
              // detrás de sus esquinas redondeadas.
              "at mx-auto w-full max-w-sm rounded-lg lg:max-w-none",
              retoVisible && "animate-rise-in",
            )}
          >
            <Suspense fallback={<AnswerSheetSkeleton />}>
              <AnswerSheetWidget />
            </Suspense>
          </div>
        </div>
      </section>

      {/* Ranking / community */}
      <section
        id="ranking"
        className={cn(
          "relative overflow-hidden",
          "snap-section flex flex-col justify-center",
          fadeSection("ranking"),
        )}
      >
        <SectionSweep />
        {/* Los rivales existen: grupo de postulantes como fondo de toda la
            sección, oscurecido hacia la derecha donde vive el texto (el
            cuadro de puntaje ahora va a la izquierda, ver order-* abajo). */}
        <img
          src="https://images.unsplash.com/photo-1760574740270-067dc14bf164?auto=format&fit=crop&w=1600&q=45"
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover opacity-[0.22] saturate-[0.35]"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-l from-background via-background/80 to-background/55"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-success/[0.12] blur-[100px]"
        />
        <div
          ref={rankingIntroRef}
          className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:py-24 lg:grid-cols-[1.1fr_1fr] lg:items-center"
        >
          <div className={cn(rankingIntroVisible && "animate-rise-in", "lg:order-2")}>
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
              <Trophy className="h-4 w-4" /> Ranking anónimo
            </span>
            <h2 className="mt-3 text-balance text-[clamp(1.75rem,1.5rem+1.2vw,2.5rem)] font-bold tracking-[-0.03em]">
              Compite sin exponer tu nombre.
            </h2>
            <p className="mt-3 max-w-md text-pretty text-muted-foreground">
              Compara tu desempeño con{" "}
              <strong className="font-semibold text-foreground">
                otros postulantes a tu misma universidad y carrera
              </strong>
              , con seudónimo y solo con los últimos 3 meses de actividad.{" "}
              <strong className="font-semibold text-foreground">Nadie ve tu nombre real</strong>.
            </p>
            <Button asChild variant="outline" className="press cta-overshoot mt-6">
              <Link to="/ranking">
                Ver ranking completo <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div
            ref={rankingRef}
            className={cn(
              rankingVisible && "animate-rise-in",
              "overflow-hidden rounded-lg border border-border bg-card lg:order-1",
            )}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <span className="font-data text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                PUCP · Últimos 3 meses
              </span>
              <span className="font-data text-[0.7rem] text-muted-foreground">Puntaje</span>
            </div>
            <ul>
              {LEADERBOARD.map((row, i) => (
                <li
                  key={row.rank}
                  className={cn(
                    rankingVisible && "animate-fade-up",
                    "flex items-center gap-3 border-b border-border px-5 py-3 last:border-b-0",
                  )}
                  style={
                    rankingVisible ? ({ "--i": Math.min(i, 10) } as React.CSSProperties) : undefined
                  }
                >
                  <span className="font-data w-5 text-sm text-muted-foreground">{row.rank}</span>
                  <span className="flex-1 text-sm font-medium">{row.handle}</span>
                  <span className="font-data text-sm font-semibold tabular-nums">
                    {row.score} <span className="font-normal text-muted-foreground">pts</span>
                  </span>
                </li>
              ))}
              <li
                className={cn(
                  rankingVisible && "animate-fade-up",
                  "relative flex items-center gap-3 border-t border-primary/30 px-5 py-3",
                )}
                style={
                  rankingVisible
                    ? ({ "--i": Math.min(LEADERBOARD.length, 10) } as React.CSSProperties)
                    : undefined
                }
              >
                {/* Tinte propio en un elemento aparte: así respira sin pelear
                    con la animación de entrada de la fila (misma propiedad
                    `animation` no se puede compartir entre dos clases). */}
                <span aria-hidden className="animate-pulse-row absolute inset-0 bg-primary/5" />
                <span className="font-data relative w-5 text-sm text-primary">27</span>
                <span className="relative flex-1 text-sm font-medium text-primary">Tú</span>
                <span className="font-data relative text-sm font-semibold tabular-nums text-primary">
                  812 <span className="font-normal opacity-70">pts</span>
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Planes: banda ámbar de borde a borde — el único bloque drenched de la
          página, para que el precio no se pierda entre el navy. */}
      <section
        id="planes"
        className={cn(
          "relative overflow-hidden bg-primary text-primary-foreground",
          "snap-section flex flex-col justify-center",
          fadeSection("planes"),
        )}
      >
        <SectionSweep className="via-primary-foreground/70" />
        {/* Marca de agua decorativa: en tinta navy sobre el ámbar (mismo dúo
            de color de la sección, ninguna tercera tonalidad) — nunca un
            glow nuevo, ver el One Glow Rule en DESIGN.md. Parallax removido
            (test de aislamiento), queda estática. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -bottom-16 text-primary-foreground/[0.08]"
        >
          <Banknote className="h-[22rem] w-[22rem]" strokeWidth={1} />
        </div>
        <div
          ref={planesRef}
          className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:py-20 lg:grid-cols-[1.15fr_1fr]"
        >
          <div className={cn(planesVisible && "animate-rise-in")}>
            <span className="font-data text-[0.7rem] font-bold uppercase tracking-[0.14em]">
              Planes y precios
            </span>
            <h2 className="mt-3 max-w-xl text-balance text-[clamp(1.5rem,1.3rem+1.2vw,2.25rem)] font-bold tracking-[-0.03em]">
              Empieza gratis. Premium te dice si hoy ingresarías.
            </h2>
            <p className="mt-3 max-w-lg text-pretty font-medium text-primary-foreground/85">
              El plan gratuito es tuyo para siempre. Premium te da lo que de verdad decide una
              admisión.
            </p>
            <Button
              asChild
              size="lg"
              className="press cta-overshoot mt-6 min-h-11 bg-background text-foreground hover:bg-background/90"
            >
              <Link to="/planes">
                Ver planes y precios <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* Tarjeta de precio en navy sobre el ámbar: el contraste invertido
              hace que el número se lea como dato de instrumento, no como oferta.
              overflow-hidden acá es lo que recorta la cinta diagonal de abajo
              a las esquinas redondeadas de la tarjeta. */}
          <div
            ref={priceCardRef}
            className={cn(
              planesVisible && "animate-rise-in",
              "relative overflow-hidden rounded-lg bg-background p-6 text-foreground shadow-[0_8px_8px_-4px_rgba(15,23,42,0.45)] sm:p-8",
            )}
            style={planesVisible ? ({ "--i": 2 } as React.CSSProperties) : undefined}
          >
            {/* Cinta diagonal (solo durante la beta): el precio se sigue
                mostrando tal cual — para que el estudiante vea que Premium
                existe y cuánto vale — pero la cinta deja claro de un vistazo
                que hoy no se cobra nada. Centrada en la tarjeta con un ancho
                exactamente igual a su diagonal (Math.hypot) y rotada el
                ángulo real entre esa diagonal y la horizontal (Math.atan2,
                medido en vivo con ResizeObserver más arriba), así sus dos
                puntas caen justo en las esquinas opuestas sin importar el
                tamaño de pantalla — no un ángulo fijo aproximado. */}
            {betaActive && ribbon && (
              <div
                aria-hidden
                className="absolute left-1/2 top-1/2 bg-destructive py-2 text-center text-xl font-bold uppercase tracking-wider text-destructive-foreground shadow-md"
                style={{
                  width: `${ribbon.width}px`,
                  transform: `translate(-50%, -50%) rotate(-${ribbon.angle}deg)`,
                }}
              >
                Gratis por tiempo limitado
              </div>
            )}
            <p className="font-data text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Premium desde
            </p>
            <p className="font-data mt-2 text-5xl font-bold tabular-nums">
              S/ {PLAN_PRICES.quarterly.monthlyEquivalent.split(".")[0]}
              <span className="text-2xl">
                .{PLAN_PRICES.quarterly.monthlyEquivalent.split(".")[1]}
              </span>{" "}
              <span className="text-base font-normal text-muted-foreground">/ mes</span>
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">con el plan trimestral</p>
            <ul className="mt-5 space-y-2.5 border-t border-border pt-5 text-sm">
              {[
                "Exámenes oficiales de admisión completos",
                "Simulacros ilimitados de tu universidad",
                "Ranking completo frente a otros postulantes",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <Check
                    className="mt-0.5 h-4 w-4 shrink-0 text-success"
                    strokeWidth={3}
                    aria-hidden
                  />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Preguntas frecuentes: resuelve las objeciones más comunes justo
          antes del CTA final — quien llega hasta acá con dudas sin resolver
          rara vez se registra. at-paper (cream) para alternar con el navy
          de Planes/CTA a los lados, mismo patrón que Pilares/Reto. */}
      <section
        id="faq"
        className={cn(
          "at-paper snap-section relative flex flex-col justify-center border-b border-border",
          fadeSection("faq"),
        )}
      >
        {/* Marca de agua decorativa, mismo criterio que Pilares/Empezar: un
            ícono a gran escala y casi invisible, nunca un segundo glow. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -bottom-20 -left-16 text-foreground/[0.05]">
            <HelpCircle className="h-[24rem] w-[24rem]" strokeWidth={1} />
          </div>
        </div>
        <div ref={faqRef} className="relative mx-auto max-w-3xl px-4 py-16 sm:py-24">
          <div className="max-w-xl">
            <h2 className="text-balance text-[clamp(1.75rem,1.5rem+1.2vw,2.5rem)] font-bold tracking-[-0.03em]">
              Antes de registrarte
            </h2>
            <p className="mt-3 text-pretty text-muted-foreground">
              Las preguntas que más nos hacen los postulantes antes de crear su cuenta.
            </p>
          </div>
          {/* faq-accordion (ver styles.css): Radix anima el alto del
              contenido al abrir/cerrar (height 0 → alto real) — sin eso el
              bloque completo (pregunta + respuesta, un solo recuadro con
              borde) se sentía "agrandar" de golpe. Acá se apaga esa
              animación por completo: abre/cierra instantáneo, texto mismo
              tamaño en pregunta y respuesta (ver AccordionContent) así no
              queda ningún salto de tamaño que disimular con una animación. */}
          <Accordion
            type="single"
            collapsible
            className={cn("faq-accordion mt-10", faqVisible && "animate-rise-in")}
          >
            {FAQ_ITEMS.map((item, i) => (
              <AccordionItem key={item.q} value={`item-${i}`}>
                <AccordionTrigger className="font-display text-base font-bold">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-pretty text-base text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section
        id="cta"
        className={cn(
          "relative overflow-hidden border-t border-border",
          "snap-section flex flex-col justify-center",
          fadeSection("cta"),
        )}
      >
        <SectionSweep />
        {/* Real exam moment: a hand writing on answer sheets, desaturated and
            sunk into the navy so the type keeps full contrast. */}
        <img
          src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1600&q=45"
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover opacity-25 saturate-[0.25]"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-background via-background/65 to-background/35"
        />
        <div
          ref={ctaRef}
          className="relative mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 py-24 text-center"
        >
          <div
            className={cn(ctaVisible && "animate-rise-in")}
            style={{ "--i": 0 } as React.CSSProperties}
          >
            <TrustPill>Únete en menos de un minuto</TrustPill>
          </div>
          <h2
            className={cn(
              ctaVisible && "animate-rise-in",
              "text-balance text-[clamp(1.75rem,1.4rem+1.6vw,3rem)] font-bold tracking-[-0.03em]",
            )}
            style={{ "--i": 2 } as React.CSSProperties}
          >
            Tu próximo simulacro puede empezar ahora mismo.
          </h2>
          <p
            className={cn(
              ctaVisible && "animate-rise-in",
              "max-w-md text-pretty text-muted-foreground",
            )}
            style={{ "--i": 4 } as React.CSSProperties}
          >
            Crea tu cuenta gratis y elige tu universidad.{" "}
            <strong className="font-semibold text-foreground">Sin tarjeta, sin compromiso.</strong>
          </p>
          <div
            className={cn(ctaVisible && "animate-rise-in")}
            style={{ "--i": 6 } as React.CSSProperties}
          >
            <Button asChild size="lg" className="press cta-overshoot min-h-11">
              <Link to="/auth" onClick={() => fireConfetti()}>
                Crear cuenta gratis <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <WhatsAppFloat />
    </div>
  );
}

// Splits a phrase into per-word spans that fade up in sequence (40ms/word via
// the shared fade-up stagger) — the hero's one typographic flourish on load.
function StaggeredWords({ text, startIndex = 0 }: { text: string; startIndex?: number }) {
  const words = text.split(" ");
  return (
    <>
      {words.map((word, i) => (
        <span key={i}>
          <span
            className="animate-fade-up inline-block"
            style={{ "--i": startIndex + i } as React.CSSProperties}
          >
            {word}
          </span>
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  );
}

// Thin gradient line that sweeps across a section's top edge once, the
// moment it scrolls into view — the "something changed" cue between
// sections. A line, not a blur, so it never competes with the hero widget's
// one ambient glow (see the One Glow Rule in DESIGN.md).
// Self-observes its own position (useInViewport, bidirectional) instead of
// taking a `visible` prop from the parent's one-shot useInViewOnce flag —
// that flag latches true forever on first sight, which meant this
// `infinite` CSS animation kept looping for every section long after it
// scrolled off-screen, accumulating as the page got scrolled further.
function SectionSweep({ className }: { className?: string }) {
  const { ref, inView } = useInViewport<HTMLDivElement>(0);
  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px overflow-hidden"
    >
      <span
        className={cn(
          "absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-primary/70 to-transparent",
          inView && "animate-sweep-line",
          className,
        )}
      />
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: number }) {
  const shown = useCountUp(value, true);
  return (
    <div>
      <div className="font-data text-3xl font-bold tabular-nums tracking-tight sm:text-4xl">
        {shown.toLocaleString("es-PE")}
      </div>
      <div className="mt-0.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
