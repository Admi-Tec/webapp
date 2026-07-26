import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Bell, Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  listNotifications,
  markAllNotificationsRead,
  regenerateNotifications,
  deleteNotification,
} from "@/lib/notifications.functions";
import { supabase } from "@/integrations/supabase/client";

export function NotificationsBell() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const listFn = useServerFn(listNotifications);
  const markFn = useServerFn(markAllNotificationsRead);
  const regenFn = useServerFn(regenerateNotifications);
  const delFn = useServerFn(deleteNotification);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listFn(),
    enabled: signedIn,
    refetchInterval: 60_000,
  });

  const markMutation = useMutation({
    mutationFn: () => markFn(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const delMutation = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unread = (q.data ?? []).filter((n) => !n.read_at).length;

  async function onOpen(open: boolean) {
    if (open && signedIn) {
      try {
        await regenFn();
        qc.invalidateQueries({ queryKey: ["notifications"] });
      } catch {}
    }
  }

  if (!signedIn) return null;

  return (
    <Popover onOpenChange={onOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notificaciones" className="relative">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border p-3">
          <p className="text-sm font-semibold">Notificaciones</p>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => markMutation.mutate()}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Check className="h-3 w-3" /> Marcar leídas
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-auto">
          {(q.data ?? []).length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">Sin notificaciones.</p>
          )}
          {(q.data ?? []).map((n) => (
            <div
              key={n.id}
              className={`group flex gap-2 border-b border-border p-3 last:border-b-0 ${n.read_at ? "opacity-70" : "bg-primary/5"}`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{n.title}</p>
                {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
                {/* El aviso de prueba por vencer (y el de beta por terminar)
                    lleva directo a Planes (es su única acción útil); el resto
                    de avisos son informativos. */}
                {(n.kind === "trial_expiring" || n.kind === "beta_ending") && (
                  <Link
                    to="/planes"
                    className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    Ver planes <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {new Date(n.created_at).toLocaleString("es-PE")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => delMutation.mutate(n.id)}
                aria-label="Eliminar"
                className="opacity-0 group-hover:opacity-100"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
