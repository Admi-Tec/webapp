import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Ban, CheckCircle2, KeyRound, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import {
  getAdminStudent,
  setAdminStudentSuspended,
  updateAdminStudentPlan,
  updateAdminStudentPseudonym,
} from "@/lib/admin.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/admin/alumnos/$studentId")({
  component: StudentDetailPage,
});
const fmt = new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" });
const date = (value?: string | null) => (value ? fmt.format(new Date(value)) : "—");
const excerpt = (value?: string | null) =>
  value ? value.replace(/[#*_`]/g, "").slice(0, 90) : "Ejercicio";

function StudentDetailPage() {
  const { studentId } = Route.useParams();
  const qc = useQueryClient();
  const getFn = useServerFn(getAdminStudent);
  const planFn = useServerFn(updateAdminStudentPlan);
  const suspendFn = useServerFn(setAdminStudentSuspended);
  const pseudoFn = useServerFn(updateAdminStudentPseudonym);
  const query = useQuery({
    queryKey: ["admin-student", studentId],
    queryFn: () => getFn({ data: { id: studentId } }),
  });
  const [planOpen, setPlanOpen] = useState(false);
  const [plan, setPlan] = useState<"free" | "premium">("free");
  const [expires, setExpires] = useState("");
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [pseudoOpen, setPseudoOpen] = useState(false);
  const [temporaryPseudo, setTemporaryPseudo] = useState("");
  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["admin-student", studentId] });
    await qc.invalidateQueries({ queryKey: ["admin-students"] });
  };
  const action = useMutation({
    mutationFn: async (job: () => Promise<unknown>) => job(),
    onSuccess: async () => {
      toast.success("Cambio guardado");
      await refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo guardar"),
  });
  if (query.isLoading)
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  if (query.error || !query.data)
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5">
        <p className="font-medium">No se pudo cargar el alumno.</p>
        <p className="text-sm text-muted-foreground">
          {query.error instanceof Error ? query.error.message : "Perfil no encontrado"}
        </p>
      </div>
    );
  const d = query.data;
  const p = d.profile;
  const suspended = !!p.suspended_at;
  const planLabel =
    p.plan_type === "free"
      ? "Gratis"
      : p.premium_source === "trial"
        ? "Prueba gratuita"
        : "Premium administrativo";
  return (
    <section className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/admin/alumnos">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a alumnos
        </Link>
      </Button>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary">
            <UserRound className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold">{p.full_name || "Sin nombre"}</h2>
              {suspended && <Badge variant="destructive">Cuenta suspendida</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">
              {d.auth.email}
              {p.pseudonym ? ` · @${p.pseudonym}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setPlan(p.plan_type as "free" | "premium");
              setExpires(p.premium_ends_at?.slice(0, 16) ?? "");
              setPlanOpen(true);
            }}
          >
            <ShieldCheck className="mr-2 h-4 w-4" />
            Cambiar plan
          </Button>
          <Button variant="outline" onClick={() => setPseudoOpen(true)}>
            <KeyRound className="mr-2 h-4 w-4" />
            Pseudónimo
          </Button>
          <Button
            variant={suspended ? "outline" : "destructive"}
            onClick={() => setSuspendOpen(true)}
          >
            {suspended ? (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            ) : (
              <Ban className="mr-2 h-4 w-4" />
            )}
            {suspended ? "Reactivar" : "Suspender"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Info title="Perfil">
          <Row label="Pseudónimo" value={p.pseudonym ? `@${p.pseudonym}` : "Sin definir"} />
          <Row label="Registro" value={date(d.auth.createdAt)} />
          <Row label="Último acceso" value={date(d.auth.lastSignInAt)} />
          <Row
            label="Login"
            value={
              d.auth.providers.length
                ? d.auth.providers
                    .map((x) =>
                      x === "email" ? "Correo/contraseña" : x === "google" ? "Google" : x,
                    )
                    .join(" + ")
                : "Correo"
            }
          />
          {p.pseudonym_change_required && (
            <p className="mt-3 rounded-md bg-amber-100 px-3 py-2 text-xs text-amber-950">
              Debe elegir un pseudónimo nuevo en su próximo acceso.
            </p>
          )}
        </Info>
        <Info title="Plan y acceso">
          <div className="mb-3">
            <Badge variant={p.plan_type === "premium" ? "default" : "outline"}>{planLabel}</Badge>
          </div>
          <Row label="Vencimiento" value={date(p.premium_ends_at ?? p.trial_ends_at)} />
          <Row label="Prueba utilizada" value={p.trial_used ? "Sí" : "No"} />
          <Row
            label="Estado"
            value={suspended ? `Suspendida desde ${date(p.suspended_at)}` : "Activa"}
          />
        </Info>
        <Info title="Meta semanal">
          <Row label="Preguntas" value={`${d.weekly.questionsDone} / ${d.weekly.questionsGoal}`} />
          <Row label="Correctas" value={`${d.weekly.correct} de ${d.weekly.questionsDone}`} />
          <Row label="Exámenes" value={`${d.weekly.examsDone} / ${d.weekly.examsGoal}`} />
        </Info>
      </div>
      <Info title="Universidades objetivo">
        {d.universities.length ? (
          <div className="divide-y">
            {d.universities.map((u) => (
              <div key={u.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                <span className="font-medium">{u.university?.name}</span>
                <span className="text-muted-foreground">
                  {u.career?.name ?? "Carrera sin definir"} · Examen:{" "}
                  {u.exam_date ? date(u.exam_date) : "sin fecha"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <Empty text="No ha definido universidades objetivo." />
        )}
      </Info>
      <Info title={`Exámenes y simulacros (${d.sessions.length})`}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Examen</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Puntaje</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {d.sessions.slice(0, 20).map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{date(s.started_at)}</TableCell>
                  <TableCell>{s.exam?.title ?? "Práctica"}</TableCell>
                  <TableCell>
                    {s.exam?.exam_type === "template" ? "Simulacro" : "Oficial"}
                  </TableCell>
                  <TableCell>
                    {s.score ?? "—"}
                    {s.max_score ? ` / ${s.max_score}` : ""}
                  </TableCell>
                  <TableCell>{s.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {!d.sessions.length && <Empty text="Todavía no ha rendido exámenes." />}
      </Info>
      <div className="grid gap-4 xl:grid-cols-3">
        <Interaction
          title={`Favoritos (${d.favorites.length})`}
          rows={d.favorites.map((x) => ({
            id: x.id,
            main: excerpt(x.exercise?.statement_md),
            meta: date(x.created_at),
          }))}
        />
        <Interaction
          title={`Calificaciones (${d.ratings.length})`}
          rows={d.ratings.map((x) => ({
            id: x.id,
            main: excerpt(x.exercise?.statement_md),
            meta: `${x.stars}/5 · ${date(x.created_at)}`,
          }))}
        />
        <Interaction
          title={`Reportes (${d.reports.length})`}
          rows={d.reports.map((x) => ({
            id: x.id,
            main: excerpt(x.exercise?.statement_md),
            meta: `${x.status} · ${x.reason}`,
          }))}
        />
      </div>
      <Info title="Historial administrativo">
        {d.audit.length ? (
          <div className="divide-y">
            {d.audit.map((x) => (
              <div key={x.id} className="flex justify-between gap-4 py-3 text-sm">
                <span>{auditLabel(x.action)}</span>
                <span className="whitespace-nowrap text-muted-foreground">
                  {date(x.created_at)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <Empty text="Aún no se registraron acciones administrativas." />
        )}
      </Info>

      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Plan</Label>
              <Select value={plan} onValueChange={(v) => setPlan(v as typeof plan)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Gratis</SelectItem>
                  <SelectItem value="premium">Premium administrativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {plan === "premium" && (
              <div>
                <Label htmlFor="expiry">Vencimiento opcional</Label>
                <Input
                  id="expiry"
                  type="datetime-local"
                  value={expires}
                  onChange={(e) => setExpires(e.target.value)}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Déjalo vacío para acceso indefinido.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={action.isPending}
              onClick={() =>
                action.mutate(async () => {
                  await planFn({
                    data: {
                      id: studentId,
                      planType: plan,
                      expiresAt:
                        plan === "premium" && expires ? new Date(expires).toISOString() : null,
                    },
                  });
                  setPlanOpen(false);
                })
              }
            >
              Guardar cambio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={pseudoOpen} onOpenChange={setPseudoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gestionar pseudónimo</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Puedes exigir que el alumno elija uno nuevo o asignar uno temporal y exigir el cambio.
          </p>
          <div>
            <Label htmlFor="pseudo">Pseudónimo temporal</Label>
            <Input
              id="pseudo"
              value={temporaryPseudo}
              onChange={(e) => setTemporaryPseudo(e.target.value)}
              minLength={3}
              maxLength={24}
              placeholder="usuario-temporal"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              disabled={action.isPending}
              onClick={() =>
                action.mutate(async () => {
                  await pseudoFn({ data: { id: studentId, mode: "require" } });
                  setPseudoOpen(false);
                })
              }
            >
              Solo forzar cambio
            </Button>
            <Button
              disabled={action.isPending || temporaryPseudo.trim().length < 3}
              onClick={() =>
                action.mutate(async () => {
                  await pseudoFn({
                    data: { id: studentId, mode: "reset", pseudonym: temporaryPseudo.trim() },
                  });
                  setPseudoOpen(false);
                })
              }
            >
              Asignar temporal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={suspendOpen} onOpenChange={setSuspendOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {suspended ? "¿Reactivar esta cuenta?" : "¿Suspender esta cuenta?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {suspended
                ? "El alumno podrá volver a iniciar sesión y conservará todos sus datos."
                : "El alumno no podrá iniciar sesión. Sus datos no se eliminarán y podrás reactivar la cuenta en cualquier momento."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={
                !suspended
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : undefined
              }
              disabled={action.isPending}
              onClick={() =>
                action.mutate(() => suspendFn({ data: { id: studentId, suspended: !suspended } }))
              }
            >
              {suspended ? "Sí, reactivar" : "Sí, suspender"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function Info({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-card p-5">
      <h3 className="mb-4 font-semibold">{title}</h3>
      {children}
    </section>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return <p className="py-5 text-center text-sm text-muted-foreground">{text}</p>;
}
function Interaction({
  title,
  rows,
}: {
  title: string;
  rows: { id: string; main: string; meta: string }[];
}) {
  return (
    <Info title={title}>
      {rows.length ? (
        <div className="divide-y">
          {rows.slice(0, 8).map((x) => (
            <div key={x.id} className="py-3">
              <p className="line-clamp-2 text-sm">{x.main}</p>
              <p className="mt-1 text-xs text-muted-foreground">{x.meta}</p>
            </div>
          ))}
        </div>
      ) : (
        <Empty text="Sin interacciones." />
      )}
    </Info>
  );
}
function auditLabel(action: string) {
  return (
    (
      {
        plan_changed: "Plan modificado",
        account_suspended: "Cuenta suspendida",
        account_reactivated: "Cuenta reactivada",
        pseudonym_reset: "Pseudónimo temporal asignado",
        pseudonym_change_required: "Cambio de pseudónimo solicitado",
      } as Record<string, string>
    )[action] ?? action
  );
}
