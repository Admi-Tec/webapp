import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  capturedAuthParams,
  capturedAuthHasSession,
  translateHashAuthError,
} from "@/lib/auth-redirect";
import { pageMeta } from "@/lib/site";

export const Route = createFileRoute("/restablecer-password")({
  // Only reachable via a one-time emailed token — no standalone value to index.
  head: () =>
    pageMeta({ path: "/restablecer-password", title: "Restablecer contraseña", noindex: true }),
  component: ResetPasswordPage,
});

// Captured once at module load, same rationale as src/lib/auth-redirect.ts: read before
// anything else (supabase-js's own session detection) can touch the URL.
const linkError = capturedAuthParams?.get("error")
  ? translateHashAuthError(capturedAuthParams)
  : null;
const isRecoveryLink = capturedAuthHasSession && capturedAuthParams?.get("type") === "recovery";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (password.length < 8) {
      setFormError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Las contraseñas no coinciden.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Contraseña actualizada. Ya iniciaste sesión con ella.");
      navigate({ to: "/panel", replace: true });
    } catch (err: any) {
      const friendly = err?.message ?? "No se pudo actualizar tu contraseña. Inténtalo de nuevo.";
      setFormError(friendly);
      toast.error(friendly);
    } finally {
      setBusy(false);
    }
  }

  if (linkError || !isRecoveryLink) {
    return (
      <div className="mx-auto grid min-h-[80dvh] max-w-md place-items-center px-4 py-10">
        <div className="w-full rounded-2xl border border-border bg-card p-6 text-center shadow-sm sm:p-8">
          <h1 className="font-display text-2xl font-bold">Enlace no válido</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {linkError ??
              "Este enlace de recuperación no es válido o ya expiró. Solicita uno nuevo desde la pantalla de ingreso."}
          </p>
          <Button asChild className="press mt-6 min-h-11">
            <Link to="/auth">Volver a ingresar</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto grid min-h-[80dvh] max-w-md place-items-center px-4 py-10">
      <div className="w-full rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <h1 className="text-balance font-display text-2xl font-bold">Elige tu nueva contraseña</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Define una nueva contraseña para tu cuenta.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="new-password">Nueva contraseña</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center overflow-hidden rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                <span key={showPassword ? "hide" : "show"} className="animate-icon-pop">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </span>
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
          </div>

          <div>
            <Label htmlFor="confirm-password">Confirmar nueva contraseña</Label>
            <Input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          {formError && (
            <p
              role="alert"
              className="animate-alert-in rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {formError}
            </p>
          )}

          <Button type="submit" className="press w-full min-h-11" disabled={busy}>
            {busy ? "Guardando…" : "Guardar nueva contraseña"}
          </Button>
        </form>
      </div>
    </div>
  );
}
