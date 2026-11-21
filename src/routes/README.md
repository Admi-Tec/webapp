# Routes

TanStack Start uses **file-based routing**. Every `.tsx` file in this directory
is a route. Do **not** create `src/pages/`, `src/routes/_app/index.tsx`, or
`app/layout.tsx` — those are Next.js / Remix conventions. The only root layout
is `src/routes/__root.tsx`.

## Conventions

| File                     | URL                                                     |
| ------------------------ | ------------------------------------------------------- |
| `index.tsx`              | `/`                                                     |
| `about.tsx`              | `/about`                                                |
| `users/index.tsx`        | `/users`                                                |
| `users/$id.tsx`          | `/users/:id` (dynamic — bare `$`, no curly braces)      |
| `posts/{-$category}.tsx` | `/posts/:category?` (optional segment)                  |
| `files/$.tsx`            | `/files/*` (splat — read via `_splat` param, never `*`) |
| `_layout.tsx`            | layout route (renders children via `<Outlet />`)        |
| `__root.tsx`             | app shell — wraps every page; preserve `<Outlet />`     |

`routeTree.gen.ts` is auto-generated. Don't edit it by hand.

## Exam catalog

`/examenes` is the shared entry point for official exams and simulacros.
`/examenes/$slug` shows both for that university; general simulacros without a
university appear in the main catalog. `/simulacros` redirects permanently to
`/examenes` so existing links still work. Simulacro previews keep their
authenticated `/simulacro/$id` URLs, with breadcrumbs back to the university's
exam catalog. The `#simulacros` anchor links directly to that part of the catalog.
