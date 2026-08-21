import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { listAllUniversities } from "@/lib/profile.functions";
import {
  listPreparationCyclesAdmin,
  savePreparationCycle,
  setPreparationCycleStatus,
} from "@/lib/preparation.functions";

export const Route = createFileRoute("/_authenticated/admin/ciclos/")({
  component: PreparationCyclesAdminPage,
});

function PreparationCyclesAdminPage() {
  const listFn = useServerFn(listPreparationCyclesAdmin);
  const universitiesFn = useServerFn(listAllUniversities);
  const saveFn = useServerFn(savePreparationCycle);
  const statusFn = useServerFn(setPreparationCycleStatus);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const cyclesQ = useQuery({ queryKey: ["admin-preparation-cycles"], queryFn: () => listFn() });
  const universitiesQ = useQuery({
    queryKey: ["all-universities"],
    queryFn: () => universitiesFn(),
  });
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [universityId, setUniversityId] = useState("");
  const [description, setDescription] = useState("");

  const createM = useMutation({
    mutationFn: () =>
      saveFn({
        data: { name, universityId, description: description || null, status: "draft" },
      }),
    onSuccess: async (row) => {
      await queryClient.invalidateQueries({ queryKey: ["admin-preparation-cycles"] });
      setOpen(false);
      navigate({ to: "/admin/ciclos/$cycleId", params: { cycleId: row.id } });
    },
    onError: (error) => toast.error(error.message),
  });

  const changeStatus = async (id: string, status: "draft" | "published" | "archived") => {
    try {
      await statusFn({ data: { id, status } });
      await queryClient.invalidateQueries({ queryKey: ["admin-preparation-cycles"] });
      toast.success(status === "published" ? "Ciclo publicado" : "Estado actualizado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Ciclos de preparación</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Rutas ordenadas de teoría y práctica para cada universidad.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Crear ciclo
        </Button>
      </div>

      {cyclesQ.isLoading && <p className="text-sm text-muted-foreground">Cargando ciclos…</p>}
      {cyclesQ.data?.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <h3 className="font-medium">Todavía no hay ciclos de preparación</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea el primero para organizar una ruta de estudio por universidad.
          </p>
        </div>
      )}
      <div className="space-y-3">
        {cyclesQ.data?.map((cycle) => (
          <article
            key={cycle.id}
            className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">{cycle.name}</h3>
                <Badge variant={cycle.status === "published" ? "default" : "secondary"}>
                  {cycle.status === "published"
                    ? "Publicado"
                    : cycle.status === "archived"
                      ? "Archivado"
                      : "Borrador"}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {cycle.university?.short_name} · {cycle.courseCount} cursos · {cycle.topicCount}{" "}
                temas
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Actualizado {new Date(cycle.updated_at).toLocaleDateString("es-PE")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {cycle.status !== "published" && cycle.status !== "archived" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => changeStatus(cycle.id, "published")}
                >
                  Publicar
                </Button>
              )}
              {cycle.status === "published" && (
                <Button size="sm" variant="outline" onClick={() => changeStatus(cycle.id, "draft")}>
                  Pasar a borrador
                </Button>
              )}
              {cycle.status !== "archived" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => changeStatus(cycle.id, "archived")}
                >
                  Archivar
                </Button>
              )}
              <Button asChild size="sm">
                <Link to="/admin/ciclos/$cycleId" params={{ cycleId: cycle.id }}>
                  <Settings2 className="mr-2 h-4 w-4" /> Configurar
                </Link>
              </Button>
            </div>
          </article>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear ciclo de preparación</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              createM.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="cycle-name">Nombre</Label>
              <Input
                id="cycle-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cycle-university">Universidad</Label>
              <select
                id="cycle-university"
                value={universityId}
                onChange={(event) => setUniversityId(event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                required
              >
                <option value="">Selecciona una universidad</option>
                {universitiesQ.data?.map((university) => (
                  <option key={university.id} value={university.id}>
                    {university.short_name} · {university.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cycle-description">Descripción</Label>
              <Textarea
                id="cycle-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createM.isPending || !universityId}>
                {createM.isPending ? "Creando…" : "Crear y configurar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
