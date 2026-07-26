import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Menu,
  LogOut,
  Shield,
  User,
  LayoutDashboard,
  Star,
  Trophy,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { getFullProfile } from "@/lib/profile.functions";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { useSignedIn } from "@/hooks/use-signed-in";
import { NotificationsBell } from "@/components/notifications-bell";
import { PlanBadge } from "@/components/premium/plan-badge";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

const publicNav = [
  { to: "/temas", label: "Cursos" },
  { to: "/examenes", label: "Exámenes" },
  { to: "/simulacros", label: "Simulacros" },
  { to: "/planes", label: "Planes" },
];

const accountNav = [
  { to: "/panel", label: "Panel", icon: LayoutDashboard },
  { to: "/perfil", label: "Perfil", icon: User },
  { to: "/favoritas", label: "Favoritas", icon: Star },
  { to: "/ranking", label: "Ranking", icon: Trophy },
];

export function SiteHeader() {
  const navigate = useNavigate();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const signedIn = useSignedIn();
  const { isAdmin } = useIsAdmin();
  const fetchProfile = useServerFn(getFullProfile);
  const profileQ = useQuery({
    queryKey: ["full-profile-mini"],
    queryFn: () => fetchProfile(),
    enabled: signedIn === true,
  });
  const avatarUrl = profileQ.data?.profile?.avatar_url ?? undefined;

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    setOpen(false);
    navigate({ to: "/buscar", search: { q: term } });
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.invalidate();
    navigate({ to: "/auth", replace: true });
  }

  return (
    // Solid background, no backdrop-blur: this header is sticky and present
    // on every route, so backdrop-filter was forcing a re-sample of
    // everything scrolling underneath on every single scroll frame — one of
    // the most expensive things a mobile GPU can be asked to do repeatedly,
    // and it never showed up in the landing-only tests because it isn't
    // landing-only.
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto grid max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 sm:gap-6">
        <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="Admi-Tec — inicio">
          <img src="/brand/icon.svg" alt="" aria-hidden className="h-9 w-9" />
          <span className="font-display text-xl font-bold tracking-tight">
            Admi<span className="text-accent">-</span>Tec
          </span>
        </Link>

        <form onSubmit={submitSearch} className="hidden min-w-0 items-center md:flex" role="search">
          <div className="relative w-full max-w-md">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Buscar ejercicios, cursos..."
              className="pl-9 pr-9"
              aria-label="Buscar ejercicios"
            />
            {!searchFocused && q.length === 0 && (
              <ArrowLeft
                aria-hidden
                className="animate-search-hint pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary"
              />
            )}
          </div>
        </form>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Principal">
          {publicNav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeProps={{ className: "bg-secondary text-foreground" }}
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-secondary hover:text-foreground"
            >
              {n.label}
            </Link>
          ))}

          {signedIn === true && (
            <>
              {isAdmin && (
                <Link
                  to="/admin/ejercicios"
                  activeProps={{ className: "bg-secondary text-foreground" }}
                  className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-primary hover:bg-secondary"
                >
                  <Shield className="h-4 w-4" /> Admin
                </Link>
              )}
              <PlanBadge className="ml-1" />
              <NotificationsBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="ml-1 cursor-pointer rounded-full transition duration-150 hover:scale-105 hover:opacity-80 active:scale-95"
                    aria-label="Cuenta"
                  >
                    <Avatar className="h-8 w-8 border border-border">
                      {avatarUrl && (
                        <AvatarImage src={avatarUrl} alt="" referrerPolicy="no-referrer" />
                      )}
                      <AvatarFallback className="bg-secondary text-secondary-foreground">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  {accountNav.map((item) => (
                    <DropdownMenuItem key={item.to} asChild>
                      <Link to={item.to} className="cursor-pointer">
                        <item.icon className="h-4 w-4" /> {item.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={handleSignOut} className="cursor-pointer">
                    <LogOut className="h-4 w-4" /> Cerrar sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          {signedIn === false && (
            <Button asChild size="sm" className="ml-2">
              <Link to="/auth">Ingresar</Link>
            </Button>
          )}
        </nav>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menú">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetTitle className="sr-only">Menú</SheetTitle>
            <div className="mt-6 flex flex-col gap-2">
              <form onSubmit={submitSearch} role="search">
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Buscar..."
                    className="pl-9"
                    aria-label="Buscar ejercicios"
                  />
                </div>
              </form>
              {publicNav.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-3 text-base font-medium hover:bg-secondary"
                >
                  {n.label}
                </Link>
              ))}

              {signedIn === true && (
                <>
                  <PlanBadge className="self-start" />
                  <div className="my-1 h-px bg-border" aria-hidden />
                  {accountNav.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 rounded-md px-3 py-3 text-base font-medium hover:bg-secondary"
                    >
                      <item.icon className="h-4 w-4" /> {item.label}
                    </Link>
                  ))}
                  {isAdmin && (
                    <Link
                      to="/admin/ejercicios"
                      onClick={() => setOpen(false)}
                      className="inline-flex items-center gap-2 rounded-md px-3 py-3 text-base font-medium text-primary hover:bg-secondary"
                    >
                      <Shield className="h-4 w-4" /> Admin
                    </Link>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => {
                      setOpen(false);
                      handleSignOut();
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
                  </Button>
                </>
              )}
              {signedIn === false && (
                <Button asChild onClick={() => setOpen(false)}>
                  <Link to="/auth">Ingresar</Link>
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
