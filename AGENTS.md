## Design Context

This project has `PRODUCT.md` and `DESIGN.md` at the repo root (managed by the `impeccable` skill). Read them before making UI/UX decisions.

- **Users:** Peruvian preuniversitario students prepping for admission exams (UNI, San Marcos, PUCP, UNALM, UNFV) across every course their exam covers, not just math.
- **Two coexisting visual systems** (see `DESIGN.md` for full tokens and component rules):
  - **Product Surface** (default, everywhere): warm notebook-paper light theme, one authoritative blue (`app-primary`), one sparing amber highlight (`app-highlighter`), Fraunces (display) + Inter (body), flat/whisper-shadow elevation. Runs the header, footer, temas/exámenes/simulacros, auth, and the whole authenticated app.
  - **Homepage hero only** (`.at` scope, scoped to `/`'s own landing sections — hero, marquee, feature grid, stats, ranking teaser, final CTA): dark ink-navy (`at-background`), amber-gold primary (`at-primary`), teal "correct" accent (`at-success`), Bricolage Grotesque (display) + Public Sans (body) + JetBrains Mono (measured figures). Reverted from a site-wide rollout on 2026-07-11 — study-facing pages read better light, per explicit user feedback.
  - The two never mix on the same screen; `.at` is confined to the homepage's own landing content, nowhere else.

Live-mode config lives at `.impeccable/live/config.json` (injects into `src/routes/__root.tsx`).
