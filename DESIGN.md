---
name: Admi-Tec
description: Exámenes oficiales, simulacros y ranking anónimo para postulantes peruanos — la hoja de respuestas real que ya resolviste antes del examen.
colors:
  at-background: "oklch(0.20 0.045 258)"
  at-foreground: "oklch(0.97 0.014 85)"
  at-card: "oklch(0.26 0.055 258)"
  at-primary: "oklch(0.83 0.16 92)"
  at-primary-foreground: "oklch(0.20 0.045 258)"
  at-secondary: "oklch(0.30 0.045 258)"
  at-secondary-foreground: "oklch(0.97 0.014 85)"
  at-muted: "oklch(0.27 0.045 258)"
  at-muted-foreground: "oklch(0.68 0.03 250)"
  at-accent-tint: "oklch(0.32 0.05 258)"
  at-border: "oklch(1 0 0 / 13%)"
  at-destructive: "oklch(0.65 0.2 27)"
  at-success: "oklch(0.74 0.11 190)"
  app-paper: "oklch(0.985 0.008 85)"
  app-ink: "oklch(0.21 0.04 260)"
  app-primary: "oklch(0.34 0.13 265)"
  app-primary-dark: "oklch(0.78 0.13 260)"
  app-highlighter: "oklch(0.78 0.165 70)"
  app-success: "oklch(0.62 0.15 152)"
  app-destructive: "oklch(0.58 0.22 27)"
typography:
  display:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 1.9rem + 3.2vw, 4.5rem)"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 1.5rem + 1.2vw, 2.5rem)"
    fontWeight: 700
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Public Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Public Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.08em"
  data:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontFeature: "tabular-nums"
  app-display:
    fontFamily: "Fraunces, ui-serif, Georgia, serif"
    fontSize: "clamp(1.5rem, 1.1rem + 2vw, 3rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  app-body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  full: "9999px"
  app-lg: "16px"
spacing:
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.at-primary}"
    textColor: "{colors.at-primary-foreground}"
    rounded: "{rounded.md}"
    padding: "0 32px"
    height: "40px"
  button-outline:
    backgroundColor: "{colors.at-background}"
    textColor: "{colors.at-foreground}"
    rounded: "{rounded.md}"
    padding: "0 32px"
    height: "40px"
  trust-pill:
    backgroundColor: "{colors.at-success}"
    textColor: "{colors.at-success}"
    rounded: "{rounded.full}"
    padding: "6px 16px"
  card:
    backgroundColor: "{colors.at-card}"
    textColor: "{colors.at-foreground}"
    rounded: "{rounded.lg}"
    padding: "24px"
  letter-badge:
    backgroundColor: "{colors.at-background}"
    textColor: "{colors.at-primary}"
    rounded: "{rounded.full}"
    size: "40px"
---

# Design System: Admi-Tec

## 1. Overview

**Creative North Star: "La Hoja de Respuestas" (The Answer Sheet)**

Admi-Tec's homepage hero is built as a real exam answer sheet, at night, mid-exam: ink-navy paper under exam-room light, a mechanical-pencil amber for every mark that matters, tabular data that reads like an actual scoring column rather than marketing copy. **This "La Hoja de Respuestas" register is deliberately scoped to the homepage's own landing content only** (the hero, marquee, feature grid, stats, ranking teaser and final CTA sections on `/`, wrapped in the `.at` class) — it is not the site's default. Header, footer, and every other page (temas, exámenes, simulacros, auth, and the whole authenticated app) run the calmer "Cuaderno de Estudio" system described under **Product Surface** below. Bricolage Grotesque's blunt geometric weight carries the homepage's headlines with the confidence of a hero claim; Public Sans keeps its paragraphs and labels fast and exam-manual plain; JetBrains Mono is reserved for anything that is actually a number being measured — timers, scores, rankings — so those figures read as instrument data the instant they appear.

Density stays generous at the section level (16px/24px/40px rhythm, wide `max-w-6xl` sections) but tight inside data-bearing components (the ranking table, the answer-sheet widget) where real exam UI is naturally dense. Depth comes from a one-step-lighter card surface plus a whisper border, not shadow stacking — the one deliberate exception is the hero's `AnswerSheetWidget`, which gets a slow ambient amber glow (`animate-glow`, 5s ease-in-out) because it is the single bold, "this is live" moment of the page; nothing else on the page is allowed to compete with it.

Every other screen — header, footer, temas/exámenes/simulacros, and the signed-in product (practice, exams, panel) — runs the original "Cuaderno de Estudio" system (§ noted throughout this document as **Product Surface**): warm notebook-paper light theme, Fraunces + Inter, Azul Academia Profundo primary, Ámbar Resaltador accent. This is the site's default register; the homepage hero is the one deliberate exception, not the other way around. Study-facing pages stay light on purpose — a dark canvas didn't read as fitting for pages meant for sustained reading and practice.

**Key Characteristics:**

- The homepage hero only: dark ink-navy canvas (`oklch(0.20 0.045 258)`), one amber-gold primary, one teal "correct" accent — never a second decorative hue.
- Bricolage Grotesque (blunt geometric display) against Public Sans (clean exam-manual body) on the hero — a weight contrast, not two similar geometrics.
- JetBrains Mono + tabular figures for every number that is actually being measured (timers, scores, ranks, stats), homepage hero only.
- Flat cards, whisper borders, ambient (never bouncy) motion for scroll-triggered section entrances; the hero widget's amber glow is the one deliberate exception to "flat by default."
- No cartoon badges, no mascots — competitive energy is expressed as real instrumentation, never gamified toy UI. The one exception is the **CTA Bounce Exception** (see Motion, below): buttons and interactive cards get a springy overshoot on hover/press, and the primary "Crear cuenta gratis" click fires a brand-colored confetti burst — both scoped to the actual conversion moment, not page decoration.
- Everywhere else — header, footer, temas/exámenes/simulacros, and the authenticated app — runs the light "study notebook" system (Fraunces/Inter, warm paper, blue + amber) described under Product Surface. This is the site's default, not a secondary fallback.

## 2. Colors

The homepage hero's palette is a real answer sheet under exam-room light: one deep navy-ink surface, one amber pencil-mark primary, one teal "correct" accent, and nothing else decorative. It applies only to the `.at`-scoped hero content on `/` — everything else in the product uses the Product Surface palette (see below).

### Primary

- **Amber Pencil Mark** (`at-primary`, `oklch(0.83 0.16 92)`): the one warm, high-energy color on the page. Carries primary buttons, the hero's emphasized word ("ya lo habrás resuelto"), the answer-sheet widget's correct-answer mark, letter badges (A/B/C/D), the "Tú" row in the ranking table, and the focus ring. Nothing else is allowed this much visual weight.

### Neutral

- **Papel Nocturno** (`at-background`, `oklch(0.20 0.045 258)`): the page canvas — deep ink-navy, not black; warm enough to read as paper under low light.
- **Panel Elevado** (`at-card`, `oklch(0.26 0.055 258)`): card and table surfaces, one deliberate step lighter than the canvas so components read as "sheets laid on the desk."
- **Tinta Clara** (`at-foreground`, `oklch(0.97 0.014 85)`): primary text — near-white, warm-tinted, never stark white.
- **Tinta Apagada** (`at-muted-foreground`, `oklch(0.68 0.03 250)`): captions, secondary stats, the marquee's university full names.
- **Borde Fantasma** (`at-border`, `oklch(1 0 0 / 13%)`): the one hairline used on every card, table row, and section divider — a translucent white over navy, not a separate opaque gray.

### Semantic

- **Verde Correcto** (`at-success`, `oklch(0.74 0.11 190)`): teal, not the amber. Used for the "correct answer" checkmark, the trust-pill's reassurance dot and text ("Gratis para crear tu cuenta"), and any positive-delta figure. Deliberately distinct from the amber primary so "correct" and "call to action" never compete for the same visual slot.
- **Rojo de Alerta** (`at-destructive`, `oklch(0.65 0.2 27)`): errors and destructive actions only.

### Named Rules

**The One Pencil Rule.** Amber (`at-primary`) is the only warm, saturated color on the homepage hero. It marks exactly one thing per view — a primary CTA, the one correct answer, the one "you are here" row — never a fill covering a whole section. Teal (`at-success`) handles "correct/positive" so amber stays reserved for emphasis and action.

**The Product Surface Rule.** Everything except the homepage hero's own `.at`-scoped content — header, footer, temas, exámenes, simulacros, auth, and the whole authenticated app — runs the warm, light "notebook" theme instead: `app-paper` (`oklch(0.985 0.008 85)`) background, `app-ink` (`oklch(0.21 0.04 260)`) text, `app-primary` (`oklch(0.34 0.13 265)`, Azul Academia Profundo) as its one authoritative color, and `app-highlighter` (`oklch(0.78 0.165 70)`, amber) as its own sparing accent — with a dark-mode variant at `app-primary-dark` (`oklch(0.78 0.13 260)`). The two systems never mix on the same screen; the `.at` navy/amber system is confined to the homepage's own landing sections, nowhere else.

## 3. Typography

**Display Font:** Bricolage Grotesque (with ui-sans-serif, system-ui, sans-serif fallback)
**Body Font:** Public Sans (with ui-sans-serif, system-ui, sans-serif fallback)
**Data Font:** JetBrains Mono (with ui-monospace, SFMono-Regular, Menlo fallback) — reserved for measured figures

**Character:** Both display and body are geometric sans — this is a deliberate weight-contrast pairing rather than a family-contrast one: Bricolage Grotesque's blunt, slightly irregular geometry gives headlines a hand-cut confidence, while Public Sans stays clean and exam-manual plain underneath it. JetBrains Mono steps in only for numbers that are actually being measured, so a reader learns instantly that a monospaced figure is live data, not styling.

### Hierarchy

- **Display** (700, `clamp(2.5rem, 1.9rem + 3.2vw, 4.5rem)`, 1.02 line-height, -0.03em tracking): the hero claim only. Bricolage Grotesque.
- **Headline** (700, `clamp(1.75rem, 1.5rem + 1.2vw, 2.5rem)`, -0.03em tracking): section headings ("¿Cómo se prepara alguien que sí va a ingresar?", "Compite sin exponer tu nombre"). Bricolage Grotesque.
- **Body** (400, 1rem, 1.6 line-height): paragraph copy under headlines. Public Sans. Cap prose at ~65ch (the hero paragraph and section intros already respect a `max-w-md`/`max-w-xl` measure).
- **Label** (600, 0.75rem, 0.08em tracking, uppercase where used): stat labels ("Ejercicios", "Temas", "Universidades"), the ranking table's column headers ("UNI · Últimos 3 meses", "Precisión").
- **Data** (JetBrains Mono, tabular-nums): hero stat numbers, big stats, timer, ranking scores/ranks, letter badges (A/B/C/D). Always paired with a Label directly beneath or beside it — a bare mono number never stands alone.

### Named Rules

**The Measured-Figure Rule.** If a number changes at runtime or represents a real measurement (a timer, a score, a rank, a stat), it is JetBrains Mono with tabular figures. If it's static marketing copy, it isn't — this is how the page signals "this is really happening" versus "this is just a headline."

### Product Surface: Typography

The signed-in app keeps its own pairing untouched by the above: **Fraunces** (display/headline, 700 weight, `clamp(1.5rem, 1.1rem + 2vw, 3rem)`, -0.02em tracking) against **Inter** (body/UI, 400 weight, 0.875rem). Fraunces never appears below ~18px (the No-Serif-in-the-Body rule carries forward unchanged); Bricolage Grotesque and Public Sans never appear inside the authenticated app.

## 4. Elevation

Flat by default, ink-navy depth conveyed through the card-vs-canvas lightness step (`at-card` one step lighter than `at-background`) plus the whisper border, not shadow stacking. The one deliberate exception is the hero's `AnswerSheetWidget`: a slow ambient amber glow (`blur-3xl`, `bg-primary/25`, `animate-glow` at 5s ease-in-out) sits behind it to signal "this is live" without a bounce or pulse. Everywhere else, motion and state are conveyed by background-opacity and border changes, never by shadow growth.

### Shadow Vocabulary

- **Ghost Ring** (`box-shadow: 0 0 0 1px rgba(0,0,0,0.2)`): the `AnswerSheetWidget` card only — a hairline definition ring, not a drop shadow.
- **Ambient Glow** (`bg-primary/25` at `blur-3xl` behind the widget, animated 0.35→0.6 opacity): the page's one bold live-signal. Never reused elsewhere; reserving it to a single component is what keeps it meaningful.
- **Framed Panel** (`shadow-[0_8px_8px_-4px_rgba(15,23,42,0.4-0.45)]`, no border): the Planes pricing card and the `SimulacroShowcase` device frame — the page's two "floating premium object" moments. Shadow only, capped at 8px blur, never paired with a border on the same element (see the Border-or-Shadow Rule).

### Named Rules

**The One Glow Rule.** The ambient amber glow appears exactly once, on the hero's answer-sheet widget. Every other card, table, and section stays flat with a border only — adding a second glow anywhere else would cancel the effect that makes the hero moment read as special. This is distinct from the `AmbientBackground` mesh (see Motion) — that's a fixed, page-wide backdrop of very-low-opacity drifting blobs, not a pulsing "this is live" signal, so it doesn't compete with or dilute the widget's one glow.

**The Border-or-Shadow Rule.** Never pair a `border` with a soft/wide `box-shadow` (≥16px blur) on the same element as decoration — pick one: a solid whisper border (the page's default, no shadow needed), or a shadow capped at 8px blur with no border (the Framed Panel treatment, reserved for the two "elevated object" moments above). Mixing both is the generic "ghost card" look and reads as template, not designed.

## 5. Components

### Buttons

- **Shape:** rounded-md (8px), 40px height (`lg` size used throughout the homepage hero; `min-h-11` enforced for touch targets).
- **Primary:** Amber Pencil Mark fill, navy text (`at-primary-foreground`), tactile `.press` micro-interaction — scales to 97% on `:active` (100ms, no shadow change). Used for "Empezar a practicar", "Crear cuenta gratis".
- **Outline:** navy background, light text, whisper border; used for secondary asks ("Ver exámenes oficiales", "Ver ranking completo").
- **Hover/Focus:** background-opacity shift only, plus a 1px amber focus ring — never shadow growth (the Whisper Shadow doctrine carries over from the product theme).

### Trust Pill (signature component)

A small, deliberately calm reassurance chip (rounded-full, `at-success` at 10% background, 30% border, teal text, static dot — no pulse) used near the hero and near the final CTA to lower friction ("Gratis para crear tu cuenta, sin tarjeta", "Únete en menos de un minuto"). Static on purpose: it must never compete with the hero widget's one animated glow.

### Letter Badge (signature component)

A 40px rounded-full outline chip in JetBrains Mono holding a single bold letter (A/B/C/D), used to enumerate the four feature cards and, at 24px, to mark each answer option inside the `AnswerSheetWidget`. Reads as exam-sheet bubbling, not a numbered-list eyebrow — the letters map to actual answer choices in the widget, so the device is literal, not decorative scaffolding.

### Cards / Containers

- **Corner Style:** rounded-lg (8-10px, tighter than the product surface's 16px — the public site is crisper, more exam-sheet, less "notebook page").
- **Background:** `at-card` on `at-background`; whisper border (`at-border`) does the definition work, no shadow.
- **Internal Padding:** 24px for feature cards; ranking table rows run tighter (12px/20px) because they're genuinely dense data.

### Ranking Table (signature component)

A bordered card containing a mono-labeled header row ("UNI · Últimos 3 meses" / "Precisión") and ranked rows (rank, pseudonymous handle, tabular-num score). The viewer's own row breaks the pattern deliberately: amber text, amber-tinted background (`bg-primary/5`), amber top border — the one place a table row is allowed to look different, because it's the one row that matters to the reader.

### University Marquee (signature component)

A continuously scrolling strip of university short names (34s linear loop, duplicated track for a seamless illusion), masked with a fade at both edges so it never looks clipped. Pauses on hover/focus so a name can actually be read — a functional pause, not just a nicety, since the whole point is "we cover your university specifically."

### Navigation

The header, footer, and mobile nav sheet always run the Product Surface palette (see below) — on every page, including the homepage. The `.at` navy/amber system never touches shared chrome; it's confined to the content inside the homepage's own hero/landing sections.

### Motion

The landing page's motion register was deliberately turned up (per a direct product decision) to read as energetic and alive throughout, not just at isolated moments — scroll entrances now carry a springy overshoot too, not only buttons.

- **Tactile press** (`.press`, 100ms scale-to-0.97 on `:active`): every button and clickable pill.
- **Ambient glow** (`animate-glow`, 5s ease-in-out): the hero widget only, see Elevation.
- **Ambient float** (`animate-float`, 9-12s ease-in-out infinite, per-instance `--float-x`/`--float-y`/`--float-duration`/`--float-delay`): the hero's two background glows drift continuously at rest, out of sync with each other, independent of the scroll-driven parallax on the same elements (float lives on an outer wrapper so it doesn't fight parallax for the `transform` property).
- **AmbientBackground** (`src/components/landing/ambient-background.tsx`): a `fixed`, page-wide backdrop behind every section (contained via `isolate` on the page root so it stacks correctly instead of escaping to the document root) — three large `blur-[100px]` mesh blobs (`animate-float` + `animate-blob-morph`, 16-24s cycles, border-radius drifting through a few organic shapes) at 5-7% opacity, ten small twinkling particles (`animate-twinkle`, 3.6-6s, opacity 0.1↔0.55), and a static SVG-noise `.noise-texture` overlay (`mix-blend-mode: overlay`, ~3.5% opacity, no animation). Amber/teal only, per the One Pencil Rule — this is ambiance, not a second decorative hue.
- **Marquee** (`animate-marquee`, 34s linear infinite, pauses on hover/focus): the university strip; course chips additionally bounce on hover (`hover:scale-110`, back-ease).
- **Reveal row** (`animate-reveal-row`, 260ms cubic-bezier(0.16,1,0.3,1)): staggered entrance for the answer-sheet widget's option rows as they resolve.
- **Rise-in** (`animate-rise-in`, 560ms, overshoot baked into the keyframe stops — scale 0.92→1.03→0.99→1, translateY 32px→-6px→2px→0): the section-entrance animation, applied broadly (headline blocks, cards, the ranking table, the pricing card, most of the final CTA) so most of a section's content visibly "pops" as it scrolls in, not just one element.
- **Section sweep** (`animate-sweep-line`, 3.6s cubic-bezier(0.4,0,0.2,1) infinite): a thin gradient line crosses a section's top edge, then loops on a slow cycle for as long as the section is visible — a recurring "something's alive" cue between sections.
- **CTA overshoot** (`.cta-overshoot`, 350ms `cubic-bezier(0.34,1.56,0.64,1)` back-ease, scale to 1.06 on hover / 0.95 on `:active`): every primary and secondary button, plus the same back-ease curve on Pillars/"Cómo empezar" card hover-lift and their number-badge wiggle (`rotate-12 scale-110` on hover).
- **Confetti burst** (`fireConfetti`, `canvas-confetti`, brand colors — amber/teal/ink, not rainbow): fires once, only on the primary "Crear cuenta gratis" click — the actual signup action.
- All public-site motion has a `prefers-reduced-motion` fallback (marquee/glow/float/blob-morph/twinkle/reveal/rise-in/sweep/pulse-row/cta-overshoot disabled outright, confetti skipped entirely); this is enforced at the CSS layer (or an explicit `matchMedia` check for confetti), not per-component. The noise texture is static and unaffected — it's a texture, not motion.

### Product Surface: Components

Buttons, cards, badges, inputs, stat tiles, and the favorite-star pattern on the authenticated app follow the original notebook system: 10px button radius, 16px card radius, Susurro/Base shadow pairs (never darkening on hover), and the icon-chip stat tile as the primary way progress data surfaces (streak, accuracy, weekly-goal, countdown). None of the public site's mono-data or letter-badge devices apply there — the app's numbers are set in Fraunces/Inter like the rest of its UI, not JetBrains Mono.

## 6. Do's and Don'ts

### Do:

- **Do** keep Amber Pencil Mark (`oklch(0.83 0.16 92)`) as the homepage hero's only warm, saturated color — the One Pencil Rule.
- **Do** set every measured figure (timers, scores, ranks, stats) in JetBrains Mono with tabular figures on the homepage hero — the Measured-Figure Rule.
- **Do** keep the ambient glow to the hero `AnswerSheetWidget` only — the One Glow Rule.
- **Do** keep the ranking and countdown mechanics reading as real instrumentation (a scoreboard, a stopwatch) per PRODUCT.md's "competitive, not gamified" principle.
- **Do** keep the `.at` navy/amber system scoped to the homepage's own landing sections only — header, footer, temas/exámenes/simulacros, and the authenticated app always use the Product Surface palette. Study-facing pages stay light on purpose.
- **Do** provide a `prefers-reduced-motion` fallback for every homepage-hero animation (marquee, glow, float, reveal-row, rise-in, sweep, pulse-row, cta-overshoot, confetti), matching what's already implemented.
- **Do** keep the confetti burst confined to the primary "Crear cuenta gratis" click — it's a celebration of the actual signup action, not ambient decoration, even though the rest of the page's motion (rise-in, sweep, float, cta-overshoot) is now deliberately energetic throughout. The ranking and countdown *mechanics* (how scores/ranks are computed and shown) still read as real instrumentation, not gamified — only their entrance motion got livelier, not their substance.

