import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { listAdminMeta, listAdminStudents } from "@/lib/admin.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { useInfiniteScrollTrigger } from "@/hooks/use-infinite-scroll-trigger";

export const Route = createFileRoute("/_authenticated/admin/alumnos/")({ component: StudentsPage });

const dateFormat = new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" });
const activityDate = (value: string | null) =>
  value ? dateFormat.format(new Date(value)) : "Sin actividad";

function StudentsPage() {
  const listFn = useServerFn(listAdminStudents);
  const metaFn = useServerFn(listAdminMeta);
  const [search, setSearch] = useState("");
  const [universityId, setUniversityId] = useState("all");
  const [plan, setPlan] = useState<"all" | "free" | "premium" | "trial">("all");
  const [hasSearched, setHasSearched] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<{
    search: string;
    universityId?: string;
    plan: "all" | "free" | "premium" | "trial";
  } | null>(null);
  const meta = useQuery({ queryKey: ["admin-student-meta"], queryFn: () => metaFn() });
  const query = useInfiniteQuery({
    queryKey: ["admin-students", appliedFilters],
    queryFn: ({ pageParam }) =>
      listFn({
        data: {
          ...appliedFilters,
          page: pageParam,
          pageSize: 100,
        },
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      pages.length * 100 < lastPage.total ? pages.length : undefined,
    enabled: hasSearched && appliedFilters !== null,
  });
  const students = useMemo(
    () => query.data?.pages.flatMap((resultPage) => resultPage.items) ?? [],
    [query.data],
  );
  const total = query.data?.pages[0]?.total ?? 0;
  const loadMoreRef = useInfiniteScrollTrigger<HTMLDivElement>(
    () => query.fetchNextPage(),
    !!query.hasNextPage && !query.isFetchingNextPage,
  );

  function resetSearch() {
    setHasSearched(false);
    setAppliedFilters(null);
  }

  function applyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedFilters({
      search: search.trim(),
      universityId: universityId === "all" ? undefined : universityId,
      plan,
    });
    setHasSearched(true);
  }

  return (
    <section className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Alumnos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Consulta perfiles, actividad y accesos de los estudiantes registrados.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{hasSearched ? `${students.length} de ${total} estudiantes` : "Sin búsqueda"}</span>
        </div>
      </div>
      <div className="rounded-lg border bg-card p-4">
        <form className="flex flex-wrap gap-3" onSubmit={applyFilters}>
          <div className="relative min-w-64 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Buscar estudiante por correo electrónico"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetSearch();
              }}
              placeholder="Correo electrónico"
              type="email"
              className="pl-9"
            />
          </div>
          <Select
            value={universityId}
            onValueChange={(value) => {
              setUniversityId(value);
              resetSearch();
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Universidad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las universidades</SelectItem>
              {meta.data?.universities.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.short_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={plan}
            onValueChange={(value) => {
              setPlan(value as typeof plan);
              resetSearch();
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los planes</SelectItem>
              <SelectItem value="free">Gratis</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
              <SelectItem value="trial">Prueba activa</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" disabled={query.isFetching}>
            <Search className="mr-2 h-4 w-4" />
            Buscar
          </Button>
        </form>
      </div>
      {!hasSearched ? (
        <div className="rounded-lg border border-dashed bg-card px-6 py-16 text-center">
          <Search className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-3 font-medium">Busca los alumnos que necesitas consultar</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ajusta los filtros y presiona &quot;Buscar&quot; para ver los alumnos.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estudiante</TableHead>
                  <TableHead>Universidad objetivo</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Registro</TableHead>
                  <TableHead>Última actividad</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.isLoading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}>
                        <div className="h-8 animate-pulse rounded bg-muted" />
                      </TableCell>
                    </TableRow>
                  ))}
                {students.map((student) => (
                  <TableRow
                    key={student.id}
                    className={student.suspendedAt ? "bg-destructive/5" : undefined}
                  >
                    <TableCell>
                      <div className="font-medium">{student.fullName || "Sin nombre"}</div>
                      <div className="text-xs text-muted-foreground">
                        {student.email}
                        {student.pseudonym ? ` · @${student.pseudonym}` : ""}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {student.universities.length ? (
                          student.universities.map((u) => (
                            <Badge key={u.university_id} variant="secondary">
                              {u.university?.short_name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">Sin definir</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {student.suspendedAt ? (
                        <Badge variant="destructive">Suspendido</Badge>
                      ) : student.planType === "free" ? (
                        <Badge variant="outline">Gratis</Badge>
                      ) : (
                        <Badge>
                          {student.premiumSource === "trial" ? "Prueba activa" : "Premium"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {dateFormat.format(new Date(student.createdAt))}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {activityDate(student.lastActivity)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link to="/admin/alumnos/$studentId" params={{ studentId: student.id }}>
                          Ver detalle
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {query.data && !students.length && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      No hay estudiantes que coincidan con estos filtros.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div
            ref={loadMoreRef}
            className="border-t px-4 py-4 text-center text-sm text-muted-foreground"
          >
            {query.isFetchingNextPage
              ? "Cargando más alumnos…"
              : query.hasNextPage
                ? "Desplázate para cargar más"
                : students.length
                  ? `Se cargaron los ${students.length} resultados`
                  : ""}
          </div>
        </div>
      )}
    </section>
  );
}
