import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  useNavigate,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import appCss from "../styles.css?url";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BetaBanner } from "@/components/beta-banner";
import { Toaster } from "@/components/ui/sonner";
import { JsonLd } from "@/components/json-ld";
import { supabase } from "@/integrations/supabase/client";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, GA_MEASUREMENT_ID, absoluteUrl } from "@/lib/site";
import {
  capturedAuthParams,
  capturedAuthHasSession,
  isPasswordRecoveryRedirect,
  translateHashAuthError,
} from "@/lib/auth-redirect";
import { sendWelcomeEmail } from "@/lib/welcome-email.functions";

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página no encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La página que buscas no existe o fue movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">La página no cargó</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Algo salió mal. Puedes reintentar o volver al inicio.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Reintentar
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Inicio
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: `${SITE_NAME} — Exámenes oficiales, simulacros y ranking para tu admisión` },
      { name: "description", content: SITE_DESCRIPTION },
      { name: "author", content: SITE_NAME },
      { property: "og:site_name", content: SITE_NAME },
      {
        property: "og:title",
        content: `${SITE_NAME} — Exámenes oficiales, simulacros y ranking para tu admisión`,
      },
      { property: "og:description", content: SITE_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:image", content: absoluteUrl("/og-image.png") },
      { property: "og:image:type", content: "image/png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:locale", content: "es_PE" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: `${SITE_NAME} — Exámenes oficiales, simulacros y ranking para tu admisión`,
      },
      { name: "twitter:description", content: SITE_DESCRIPTION },
      { name: "twitter:image", content: absoluteUrl("/og-image.png") },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      // Google Search recommends a stable square favicon larger than 48px.
      // Put the canonical 512px brand mark first so crawlers don't select one
      // of the small browser fallbacks below.
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/brand/icon.png" },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16.png" },
      { rel: "shortcut icon", type: "image/x-icon", href: "/favicon.ico" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      // Fraunces + Inter run everywhere (header, footer, and every page outside
      // the homepage hero). Bricolage Grotesque / Public Sans / JetBrains Mono
      // are the homepage-hero-only "at" register — loaded from index.tsx's own
      // head() instead, so every other page isn't paying for 12 font-weight
      // downloads it never renders a single character in.
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
    // Google Analytics (GA4) — solo en producción, para que el tráfico de
    // `bun run dev`/preview local no ensucie las métricas reales.
    scripts: import.meta.env.PROD
      ? [
          {
            src: `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`,
            async: true,
          },
          {
            children: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');`,
          },
        ]
      : [],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const navigate = useNavigate();
  const sendWelcomeFn = useServerFn(sendWelcomeEmail);
  // Modo examen en pantalla completa: sin header/footer/banner para inmersión
  // total mientras el estudiante rinde (ver plan-modo-examen-fullscreen.md).
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hideChrome = pathname.startsWith("/examen-sesion/");

  useEffect(() => {
    // Only actual identity changes (login/logout) warrant refetching every
    // active query app-wide. USER_UPDATED fires on routine metadata syncs
    // (e.g. Google avatar sync) unrelated to most of the cache, and firing a
    // blanket invalidateQueries() for it was forcing unrelated public data
    // (topics, universities, etc.) to refetch on top of whatever the route
    // loader already re-runs via router.invalidate().
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        router.invalidate();
        if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  // Surface feedback for the redirect Supabase sends after an email confirmation /
  // magic link / OAuth callback lands back on the app (see src/lib/auth-redirect.ts).
  // Covers both the implicit flow (#access_token in the hash) and PKCE (?code= in the
  // query string) since we can't assume which one the project is configured to use.
  useEffect(() => {
    if (!capturedAuthParams) return;

    // Google auth opens in a popup (see auth.tsx's handleGoogle); when this page loads
    // inside it, defer to the opener instead of toasting/navigating in the small window.
    // The opener polls localStorage + the session directly, so this is best-effort —
    // it just makes the popup close itself a little faster when it works.
    const isPopup = typeof window !== "undefined" && !!window.opener;

    const error = capturedAuthParams.get("error");
    if (error) {
      const message = translateHashAuthError(capturedAuthParams);
      if (isPopup) {
        try {
          localStorage.setItem("admitec_google_auth_error", message);
        } catch {
          // ignore — the opener's popup.closed poll still catches this
        }
        window.close();
      } else {
        toast.error(message);
      }
      return;
    }

    if (!capturedAuthHasSession) return;

    if (isPopup) {
      // Confirm the session before closing — getSession() awaits the client's full
      // initialization, including detectSessionInUrl's code/token exchange. Closing
      // the popup any earlier risks interrupting that exchange mid-flight, so the
      // session never actually reaches localStorage and the opener sees nothing.
      supabase.auth.getSession().then(({ data }) => {
        try {
          if (data.session) localStorage.setItem("admitec_google_auth_success", "1");
        } catch {
          // ignore — the opener's own getSession() fallback poll still catches this
        }
        window.close();
      });
      return;
    }

    // Email confirmation / magic link / invite carry a `type` on the hash (implicit
    // flow), but GoTrue's PKCE redirect — what this app actually uses (see
    // client.ts's flowType: "pkce") — only ever appends `?code=...`, never `type`.
    // Gating on `type` here used to silently skip both the toast and the welcome
    // email for the normal confirm-by-link signup path, since `type` was always
    // null for it. Google OAuth never reaches this branch (it's handled entirely
    // in the popup above), so any non-recovery session landing here is genuinely
    // a signup/invite/email-change confirmation.
    // Password recovery gets its own dedicated flow: /restablecer-password reads this
    // same session itself and asks the student to set a new password before treating
    // them as "logged in normally". PKCE only returns `?code=...` (without a `type`),
    // so the callback pathname is the recovery signal in that flow.
    const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
    if (isPasswordRecoveryRedirect(currentPath, capturedAuthParams)) return;

    toast.success("¡Correo confirmado! Tu cuenta ya está activa.");
    // The server-side claim on welcome_email_sent_at makes this safe to call
    // unconditionally even if another flow already sent it (e.g. the account
    // also has a Google identity that logged in first).
    sendWelcomeFn().catch(() => {});

    // Only auto-redirect from the email-confirmation callback when the user is
    // currently on a public/auth landing page. If the session is received while
    // the user is already on a protected destination like /panel, preserve it
    // and let the authenticated route guard decide if /onboarding is needed.
    const shouldRedirectToOnboarding =
      currentPath === "/" || currentPath === "/auth" || currentPath === "/restablecer-password";
    if (!shouldRedirectToOnboarding) return;

    // Navigate straight to /onboarding instead of /panel: this is always a
    // brand-new signup/invite confirming their email, so onboarding is never
    // already done — going to /panel first only means _authenticated's
    // beforeLoad immediately throws a redirect back to /onboarding anyway,
    // and that extra client-side redirect-during-navigate hop is what left
    // the page blank until a manual refresh. (onboarding.tsx itself still
    // bounces back to /panel if onboarding somehow turns out to be already
    // complete, so this stays safe for the email-change confirmation case.)
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) navigate({ to: "/onboarding", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) navigate({ to: "/onboarding", replace: true });
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: SITE_NAME,
          url: SITE_URL,
          logo: absoluteUrl("/favicon.svg"),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          url: SITE_URL,
          potentialAction: {
            "@type": "SearchAction",
            target: `${SITE_URL}/buscar?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        }}
      />
      <div className="flex min-h-dvh flex-col bg-background text-foreground">
        {!hideChrome && (
          <>
            <BetaBanner />
            <SiteHeader />
          </>
        )}
        <main className="flex-1">
          <Outlet />
        </main>
        {!hideChrome && <SiteFooter />}
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}
