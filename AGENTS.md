# AGENTS.md

## Project identity and documentation

- The product is **Admi-Tec**. MatePre is a former name; do not use it in new copy, documentation, or explanations.
- Admi-Tec prepares Peruvian students across admission-exam subjects, including mathematics and history; it is not a math-only app. Public identity and SEO helpers live in `src/lib/site.ts` (`SITE_NAME`, `SITE_DESCRIPTION`, URLs).
- Read `PRODUCT.md` for audience and positioning, `DESIGN.md` for visual rules, and the relevant implementation for current behavior. When documentation disagrees with code, report the discrepancy rather than treating planned features as shipped.
- This guide was reconciled with local source on 2026-11-08; it does not establish the deployed database, catalog, beta status, or production behavior.

## Design Context

This project has `PRODUCT.md` and `DESIGN.md` at the repo root (managed by the `impeccable` skill). Read them before making UI/UX decisions.

- **Users:** Peruvian preuniversitario students prepping for admission exams (UNI, San Marcos, PUCP, UNALM, UNFV) across every course their exam covers, not just math.
- **Two coexisting visual systems** (see `DESIGN.md` for full tokens and component rules):
  - **Product Surface** (default, everywhere): warm notebook-paper light theme, one authoritative blue (`app-primary`), one sparing amber highlight (`app-highlighter`), Fraunces (display) + Inter (body), flat/whisper-shadow elevation. Runs the header, footer, temas/exámenes/simulacros, auth, and the whole authenticated app.
  - **Homepage hero only** (`.at` scope, scoped to `/`'s own landing sections — hero, marquee, feature grid, stats, ranking teaser, final CTA): dark ink-navy (`at-background`), amber-gold primary (`at-primary`), teal "correct" accent (`at-success`), Bricolage Grotesque (display) + Public Sans (body) + JetBrains Mono (measured figures). Reverted from a site-wide rollout on 2026-07-11 — study-facing pages read better light, per explicit user feedback.
  - Keep the scopes separate: the homepage can show light shared header/footer around dark landing content. Do not mix the two systems inside a component or apply `.at` outside the homepage landing content.

Live-mode config lives at `.impeccable/live/config.json` (injects into `src/routes/__root.tsx`).

## Commands

Package manager is **bun** (`bun.lock` is authoritative; a `package-lock.json` also exists but isn't used for installs). `bun install` enforces a 24h supply-chain guard (`minimumReleaseAge` in `bunfig.toml`) — never add a package to `minimumReleaseAgeExcludes` without asking the user first.

```bash
bun run dev          # vite dev server
bun run build        # production build (vite build)
bun run build:dev    # development-mode build
bun run preview      # preview a production build
bun run lint         # eslint .
bun run lint:ci      # eslint --max-warnings=0 . --ext .js,.ts,.tsx
bun run typecheck    # TypeScript check
bun run test         # Vitest, single run
bun run test:watch   # Vitest, watch mode
bun run test:coverage # Vitest with V8 coverage
bun run format       # prettier --write .
```

Unit/component tests use **Vitest + Testing Library**, configured in `vitest.config.ts` with jsdom and `src/test/setup.ts`. Tests sit alongside source as `*.test.ts` / `*.test.tsx` (auth, scoring, recommendations, question selection, plan status, premium UI, etc.). The test config is intentionally separate from the application Vite/SSR config. Run checks appropriate to the change; documentation-only edits do not require an application build.

## Architecture

This is **Admi-Tec**, a TanStack Start (React 19 + Vite + TanStack Router/Query) + Supabase app for Peruvian preuniversitario students preparing across all subjects of their admission exams (UNI, San Marcos/UNMSM, PUCP, UNALM, UNFV). It is no longer connected to Lovable Cloud (no live sync to the Lovable editor); the build still depends on the `@lovable.dev/vite-tanstack-config` Vite plugin bundle (see Build config below).

### Feature map

- Public discovery: `/temas`, `/examenes`, `/examenes-oficiales`, `/simulacros`, `/buscar`, individual exercises, and `/planes`.
- Student app: `/panel`, `/practica/$topicSlug`, `/preparacion` (cycles and topics), exam/session and simulacro flows, `/ranking`, `/favoritas`, `/perfil`, and `/onboarding`.
- Admin: `/admin` manages students, exercises, Markdown import, exams, courses, preparation cycles, universities, careers, minimum admission scores, and exercise review. Its layout also checks the admin role; server-side authorization remains required.
- Plans and access: `src/lib/plan.ts` defines offering/prices; `plan-status.ts`, `plan.functions.ts`, and `premium-guard.ts` implement access logic. Beta access is driven by backend state; do not infer that it is active from banner text alone.

### Routing

File-based routing under `src/routes/**` (see `src/routes/README.md` for the naming conventions — `index.tsx` → `/`, `$id.tsx` → dynamic segment, `_layout.tsx` → layout route, etc.). `src/routeTree.gen.ts` is auto-generated by the TanStack Router Vite plugin on `dev`/`build` — never hand-edit it, and don't be alarmed if it's briefly stale after moving/adding route files (it regenerates on the next dev/build run).

`src/routes/_authenticated/` is a pathless layout route: its `route.tsx` runs a `beforeLoad` that checks `supabase.auth.getUser()` and redirects to `/auth` if there's no session, gating every route nested under it. Routes outside `_authenticated/` (temas, exámenes, simulacros, the landing page) are public — some of them still branch client-side on auth state (via the `useSignedIn()` hook in `src/hooks/use-signed-in.ts`) to gate specific _actions_ (e.g. generating a simulacro) without gating the whole page.

The authenticated layout disables SSR, checks onboarding, signs out suspended profiles, and routes users requiring a pseudonym change to `/perfil`. The full ranking route is authenticated; the homepage ranking teaser is public.

### Backend: server functions, not REST/tRPC

Application backend operations use **TanStack Start server functions** (`createServerFn` from `@tanstack/react-start`), grouped by domain in `src/lib/*.functions.ts`, not tRPC. Domains include admin, attempts, exams, exercises, favorites, goals, leaderboard, notifications, profile, preparation, careers, recommendations, plans, exercise feedback/review, contact, daily exercises, and welcome email. Client code calls them via `useServerFn(fn)` from `@tanstack/react-start`, then invokes the result inside `useQuery`/`useMutation`. Some file routes also have server handlers for public metadata such as `/sitemap.xml`; do not confuse those with the application data layer.

Three access patterns, mixed within the same `*.functions.ts` files:

- **Authenticated**: `.middleware([requireSupabaseAuth])` (from `src/integrations/supabase/auth-middleware.ts`) validates the bearer JWT and injects `{ supabase, userId, claims }` into `context`. `supabase` here is scoped to that user via RLS.
- **Admin-only**: authenticated handlers that additionally call `assertAdmin(context)`, which checks the `has_role` Postgres RPC.
- **Public**: no middleware; these build their own `publicClient()` (anon key, no session) for unauthenticated reads (topics, universities, published exams/templates).

### Exercise authoring and Markdown import

- The repository-local skill is `.agents/skills/exercise-markdown-format/SKILL.md`. Use it for exercise extraction/conversion, including mathematics and history. Installing it does not add an automatic conversion feature to the web app.
- `/admin/importar` is implemented in `src/routes/_authenticated/admin/importar.tsx`; its parser/format contract is `src/lib/markdown-exercise-parser.ts`. Persistence uses `bulkImportExercises` in `src/lib/admin.functions.ts`; image uploads use `src/lib/storage.ts`.
- Output one `.md` per exercise with YAML frontmatter, `## Enunciado`, `## Alternativas`, and `## Solución paso a paso`; keep formulas in LaTeX and required figures in adjacent `img/`. Use `formato_version: 1` and the skill's naming/metadata conventions.
- Check compatibility against the parser and importer when the format changes. `media` is accepted and normalized to internal `medio`; answers must match a listed alternative. Do not reduce five-option source questions to four just because the skill's example has A–D.
- Catalog names must resolve to real topics/subtopics/universities. Do not assume the deployed catalog from source or silently invent entries. The importer previews and validates rows before importing valid exercises.
- An unresolved answer or empty solution is a review draft, not import-ready: the parser requires a matching answer and a nonempty solution. Keep such cases clearly identified for manual review.

### Supabase integration files are generated — don't hand-edit

Everything under `src/integrations/supabase/` except `types.ts`'s consumers is marked `// This file is automatically generated. Do not edit it directly.`:

- `client.ts` — browser/SSR client (anon key), session-persisting.
- `client.server.ts` — **service-role client that bypasses RLS**. Only for trusted server-side operations; must be dynamically imported inside server handlers (`await import("@/integrations/supabase/client.server")`), never imported at module top-level in route files or `*.functions.ts` (those ship to the client bundle).
- `auth-middleware.ts` — the `requireSupabaseAuth` server middleware described above.
- `auth-attacher.ts` — client middleware (registered as `functionMiddleware` in `src/start.ts`) that attaches the user's bearer token to every server-function call.
- `types.ts` — the generated `Database` type. There's no Supabase CLI/db-push wired up in this environment, so **after adding a migration you must manually update `types.ts`** (table columns, and especially the `Functions` section for any new/changed `SECURITY DEFINER` RPCs) to keep it truthful.

### Database

Raw SQL migrations in `supabase/migrations/*.sql` — no ORM. Every table has RLS scoped to `auth.uid()`. Anything that needs to read _across_ users (leaderboard, exam-vs-average comparison, per-exercise average time) is exposed as a `SECURITY DEFINER` SQL function (`get_university_leaderboard`, `get_exam_leaderboard`, `get_exam_stats`, `get_exercise_avg_times`, ...) called via `supabase.rpc(...)`, explicitly filtered/aggregated so it never leaks another user's raw rows — follow that pattern rather than relaxing RLS for new cross-user features.

Core domain tables: `profiles` (+ `student_universities`, a many-to-many to `universities` with a per-university `exam_date`), `exercises` (topic/subtopic/university/difficulty), `exams` (`exam_type` is `standard` = fixed question list via `exam_questions`, or `template` = randomly generated per attempt via `exam_template_rules`), `exam_sessions` (an in-progress or graded attempt at an exam/template), `attempts` (one row per answered question, including `time_spent_ms`), `favorite_exercises`, `notifications`.

### Build config

`vite.config.ts` uses `@lovable.dev/vite-tanstack-config`, which already wires up `tanstackStart`, `viteReact`, `tailwindcss`, `tsConfigPaths`, `nitro` (Cloudflare target by default), dev-only `componentTagger`, and the `@` → `src` path alias. **Do not add any of those plugins manually** — the file has an explicit comment warning that duplicating them breaks the app. `src/server.ts` wraps the Nitro/h3 server entry to turn swallowed SSR 500s into a rendered error page; `src/start.ts` registers the global `attachSupabaseAuth` (client) and error-normalizing (server) middleware.

### Styling / design system

Tailwind v4, CSS-first config (`@theme inline` block in `src/styles.css` — there is no `tailwind.config.js`). Colors are OKLCH tokens on a "notebook" palette (paper background, deep-blue primary, sparing amber accent); typography pairs Fraunces (display/headings) with Inter (body/UI). Components in `src/components/ui/` are shadcn/ui primitives (Radix + `class-variance-authority`); prefer composing those over new bespoke primitives. `PRODUCT.md` and `DESIGN.md` at the repo root document the product register and full visual system (managed by the `impeccable` design skill) — read them before making non-trivial UI/UX decisions.
