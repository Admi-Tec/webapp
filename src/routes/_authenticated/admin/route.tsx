import { createFileRoute, Outlet, Link, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { checkIsAdmin } from "@/lib/admin.functions";
import { getExerciseReviewBadgeCount } from "@/lib/exercise-review.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async () => {
    try {
      const { isAdmin } = await checkIsAdmin();
      if (!isAdmin) throw redirect({ to: "/panel" });
    } catch (e: any) {
      if (e?.isRedirect) throw e;
      throw redirect({ to: "/panel" });
    }
  },
  component: AdminLayout,
});

const NAV_ITEMS = [
  { to: "/admin/ejercicios", label: "Ejercicios" },
  { to: "/admin/importar", label: "Importar" },
  { to: "/admin/examenes", label: "Exámenes" },
  { to: "/admin/materias", label: "Cursos" },
  { to: "/admin/universidades", label: "Universidades" },
  { to: "/admin/carreras", label: "Carreras" },
  { to: "/admin/puntajes-minimos", label: "Puntajes mínimos" },
  { to: "/admin/revisar", label: "Revisar" },
] as const;

function AdminLayout() {
  const badgeFn = useServerFn(getExerciseReviewBadgeCount);
  const badgeQ = useQuery({
    queryKey: ["admin-exercise-review-badge"],
    queryFn: () => badgeFn(),
    refetchInterval: 60_000,
  });
  const pendingCount = badgeQ.data?.count ?? 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <div className="mb-6 flex flex-col gap-3 sm:gap-4">
        <h1 className="font-display text-2xl font-bold">Administración</h1>
        <nav
          aria-label="Secciones de administración"
          className="-mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeProps={{ className: "bg-secondary text-foreground" }}
              className="relative shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-secondary hover:text-foreground"
            >
              {item.label}
              {item.to === "/admin/revisar" && pendingCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                  {pendingCount}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </div>
      <Outlet />
    </div>
  );
}
