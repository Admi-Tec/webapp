import { createFileRoute, Link, notFound, useRouterState } from "@tanstack/react-router";
import {
  queryOptions,
  infiniteQueryOptions,
  useSuspenseQuery,
  useSuspenseInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import { zodValidator } from "@tanstack/zod-adapter";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  getTopicBySlug,
  listExercisesPage,
  getSubtopicFrequency,
  listUniversities,
  createExercisePracticeBatch,
} from "@/lib/exercises.functions";
import {
  exerciseListSearchSchema,
  exerciseListFilters,
  type ExerciseListSearch,
} from "@/lib/exercise-practice";
import { ExercisePracticeControls } from "@/components/exercise-practice-controls";
import { getFullProfile } from "@/lib/profile.functions";
import { getSubtopicPriorities } from "@/lib/recommendations.functions";
import { useSignedIn } from "@/hooks/use-signed-in";
import { usePlan } from "@/hooks/use-plan";
import { useInfiniteScrollTrigger } from "@/hooks/use-infinite-scroll-trigger";
import { ExerciseCard } from "@/components/exercise-card";
import { ExerciseCardSkeleton, LoadingNotice } from "@/components/skeletons";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InfoTooltip } from "@/components/info-tooltip";
import { pageMeta, absoluteUrl } from "@/lib/site";
import { JsonLd } from "@/components/json-ld";

const universitiesQO = queryOptions({
  queryKey: ["universities"],
  queryFn: () => listUniversities(),
});

const topicQO = (slug: string) =>
  queryOptions({ queryKey: ["topic", slug], queryFn: () => getTopicBySlug({ data: { slug } }) });

const EXERCISES_PAGE_SIZE = 20;

const exercisesQO = (slug: string, search: ExerciseListSearch) =>
  infiniteQueryOptions({
    queryKey: ["exercises", "topic", slug, search],
    queryFn: ({ pageParam }) =>
      listExercisesPage({
        data: {
          ...exerciseListFilters(slug, search),
          page: pageParam,
          pageSize: EXERCISES_PAGE_SIZE,
        },
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => (lastPage.hasMore ? allPages.length : undefined),
  });

export const Route = createFileRoute("/temas/$slug/")({
  validateSearch: zodValidator(exerciseListSearchSchema),
  loaderDeps: ({ search }) => search,
  loader: async ({ context, params, deps }) => {
    const [topic] = await Promise.all([
      context.queryClient.ensureQueryData(topicQO(params.slug)),
      context.queryClient.ensureInfiniteQueryData(exercisesQO(params.slug, deps)),
      context.queryClient.ensureQueryData(universitiesQO),
    ]);
    if (!topic) throw notFound();
    return { topic };
  },
  head: ({ params, loaderData }) => {
    const name = loaderData?.topic?.name ?? params.slug;
    return pageMeta({
      path: `/temas/${params.slug}`,
      title: name,
      description:
        loaderData?.topic?.description ??
        `Ejercicios de ${name} resueltos paso a paso, organizados por tema y dificultad.`,
    });
  },
  component: TopicPage,
  pendingComponent: TopicPagePending,
  pendingMs: 150,
  pendingMinMs: 300,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-destructive">
      {error.message}
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h2 className="font-display text-2xl font-bold">Curso no encontrado</h2>
      <Link to="/temas" className="mt-4 inline-block text-primary hover:underline">
        Volver a cursos
      </Link>
    </div>
  ),
});

function TopicPagePending() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="h-3.5 w-24 animate-pulse rounded bg-muted motion-reduce:animate-none" />
      <div className="mt-3 h-9 w-64 animate-pulse rounded bg-muted motion-reduce:animate-none sm:h-10" />
      <div className="mt-5">
        <LoadingNotice label="Cargando ejercicios" />
      </div>
      <div className="mt-5 h-28 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <ExerciseCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

function TopicPage() {
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const pending = useRouterState({ select: (state) => state.status === "pending" });
  const { data: universities } = useSuspenseQuery(universitiesQO);
  const createBatch = useServerFn(createExercisePracticeBatch);
  const [starting, setStarting] = useState(false);
  const startingRef = useRef(false);
  const { data: topic } = useSuspenseQuery(topicQO(slug));
  const {
    data: exercisePages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSuspenseInfiniteQuery(exercisesQO(slug, search));
  const exercises = exercisePages.pages.flatMap((p) => p.items);
  const total = exercisePages.pages[0]?.total ?? 0;

  async function startPractice() {
    if (startingRef.current || pending || total === 0) return;
    startingRef.current = true;
    setStarting(true);
    try {
      const practice = await createBatch({ data: exerciseListFilters(slug, search) });
      if (!practice.length) {
        toast("No hay ejercicios con estos filtros");
        return;
      }
      await navigate({
        to: "/ejercicio/$id",
        params: { id: practice[0] },
        search: { ...search, practice, course: slug },
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo preparar la práctica. Inténtalo de nuevo.",
      );
    } finally {
      startingRef.current = false;
      setStarting(false);
    }
  }
  const loadMoreRef = useInfiniteScrollTrigger<HTMLDivElement>(
    fetchNextPage,
    hasNextPage && !isFetchingNextPage,
  );

  const signedIn = useSignedIn();
  const profileFn = useServerFn(getFullProfile);
  const profileQ = useQuery({
    queryKey: ["full-profile"],
    queryFn: () => profileFn(),
    enabled: signedIn === true,
  });
  const targetUniversities = (profileQ.data?.universities ?? [])
    .map((u) => u.university)
    .filter(Boolean);

  const [selectedUniversityId, setSelectedUniversityId] = useState<string>("");
  const frequencyUniversity =
    targetUniversities.find((u) => u.id === selectedUniversityId) ?? targetUniversities[0];
  const effectiveUniversityId = frequencyUniversity?.id ?? "";

  const freqFn = useServerFn(getSubtopicFrequency);
  const freqQ = useQuery({
    queryKey: ["subtopic-frequency", slug, effectiveUniversityId],
    queryFn: () => freqFn({ data: { topicSlug: slug, universityId: effectiveUniversityId } }),
    enabled: !!effectiveUniversityId,
  });

  useEffect(() => {
    if (freqQ.isError) {
      toast.error(
        "No se pudo cargar la frecuencia por universidad. Puedes seguir usando los filtros.",
      );
    }
  }, [freqQ.isError]);

  // "Prioridad alta" (frecuente en tu examen Y bajo rendimiento) es premium —
  // esta página en sí sigue siendo pública, solo esta etiqueta se gatea.
  const { isPremium } = usePlan();
  const priorityFn = useServerFn(getSubtopicPriorities);
  const priorityQ = useQuery({
    queryKey: ["subtopic-priorities", slug],
    queryFn: () => priorityFn({ data: { topicSlug: slug } }),
    enabled: isPremium,
  });
  const priorityIds = new Set(
    Object.entries(isPremium ? (priorityQ.data ?? {}) : {})
      .filter(([, v]) => v.isHighPriority)
      .map(([id]) => id),
  );

  if (!topic) return null;

  const freqMap = freqQ.data ?? {};
  const hasTargetUniversity = targetUniversities.length > 0;
  const subtopicsRanked = hasTargetUniversity
    ? [...topic.subtopics]
        .map((s) => ({ ...s, count: freqMap[s.id] ?? 0 }))
        .sort((a, b) => b.count - a.count || a.order - b.order)
    : topic.subtopics.map((s) => ({ ...s, count: 0 }));
  const topFrequentIds = new Set(
    subtopicsRanked
      .filter((s) => s.count > 0)
      .slice(0, 3)
      .map((s) => s.id),
  );
  const suggestedSubtopics = subtopicsRanked
    .filter((s) => priorityIds.has(s.id) || topFrequentIds.has(s.id))
    .sort((a, b) => Number(priorityIds.has(b.id)) - Number(priorityIds.has(a.id)));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Cursos", item: absoluteUrl("/temas") },
            {
              "@type": "ListItem",
              position: 2,
              name: topic.name,
              item: absoluteUrl(`/temas/${slug}`),
            },
          ],
        }}
      />
      <nav className="text-xs text-muted-foreground" aria-label="Migas">
        <Link to="/temas" className="hover:underline">
          Cursos
        </Link>{" "}
        / <span className="text-foreground">{topic.name}</span>
      </nav>
      <header className="mt-3 flex flex-col items-start gap-4 sm:flex-row sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">{topic.name}</h1>
          {topic.description && (
            <p className="mt-2 max-w-2xl text-muted-foreground">{topic.description}</p>
          )}
        </div>
      </header>

      {hasTargetUniversity ? (
        <section className="mt-5 space-y-3" aria-labelledby="study-focus-heading">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="flex items-center gap-1.5">
              <h2 id="study-focus-heading" className="text-sm font-normal">
                Para enfocar tu estudio
              </h2>
              <InfoTooltip>
                Los temas más frecuentes en exámenes reales están marcados con 🔥. Prioridad alta
                combina frecuencia y bajo rendimiento para tu universidad objetivo principal.
              </InfoTooltip>
            </div>
            {targetUniversities.length > 1 ? (
              <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
                <Label htmlFor="frequency-university" className="text-xs text-muted-foreground">
                  Frecuencia en
                </Label>
                <Select value={effectiveUniversityId} onValueChange={setSelectedUniversityId}>
                  <SelectTrigger
                    id="frequency-university"
                    className="min-h-11 w-auto max-w-full gap-3 text-sm font-normal lg:min-h-9"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {targetUniversities.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.short_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Frecuencia en {frequencyUniversity?.short_name}
              </p>
            )}
          </div>
          {priorityIds.size > 0 && targetUniversities.length > 1 && (
            <p className="text-xs text-muted-foreground">
              Prioridad alta según tu rendimiento y tu universidad objetivo principal:{" "}
              {targetUniversities[0]?.short_name}.
            </p>
          )}
          {suggestedSubtopics.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {suggestedSubtopics.map((s) => {
                const isTopFrequent = topFrequentIds.has(s.id);
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      aria-pressed={search.subtopic === s.slug}
                      disabled={pending || starting}
                      onClick={() => {
                        void navigate({
                          search: {
                            ...search,
                            subtopic: search.subtopic === s.slug ? "all" : s.slug,
                          },
                          replace: true,
                        });
                      }}
                      className={`flex min-h-11 max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-md border px-3 py-2 text-left text-sm font-normal transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 lg:min-h-9 ${
                        search.subtopic === s.slug
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border text-foreground"
                      }`}
                    >
                      {isTopFrequent && (
                        <>
                          <span aria-hidden="true">🔥</span>
                          <span className="sr-only">
                            Frecuente en {frequencyUniversity?.short_name}:{" "}
                          </span>
                        </>
                      )}
                      <span>{s.name}</span>
                      {priorityIds.has(s.id) && (
                        <Badge
                          variant="outline"
                          className="border-destructive/40 bg-destructive/10 px-1.5 py-0 text-xs text-destructive"
                        >
                          Prioridad alta
                        </Badge>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground" role="status">
              {freqQ.isPending
                ? "Consultando temas frecuentes…"
                : freqQ.isError
                  ? "La frecuencia no está disponible. Puedes elegir cualquier tema con los filtros."
                  : "Aún no hay datos de frecuencia para esta universidad."}
            </p>
          )}
        </section>
      ) : signedIn === false || (signedIn === true && profileQ.isSuccess) ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Agrega tu universidad objetivo en{" "}
          <Link to="/perfil" className="text-primary hover:underline">
            tu perfil
          </Link>{" "}
          para descubrir los temas más frecuentes en sus exámenes reales.
        </p>
      ) : null}

      <ExercisePracticeControls
        filters={search}
        topics={topic.subtopics}
        universities={universities}
        total={total}
        pending={pending}
        starting={starting}
        onChange={(filters) => {
          void navigate({ search: filters, replace: true });
        }}
        onStart={startPractice}
      />

      <section className="mt-8 min-w-0" aria-label="Ejercicios disponibles" aria-busy={pending}>
        <p className="mb-4 text-sm text-muted-foreground" role="status">
          {total} {total === 1 ? "ejercicio disponible" : "ejercicios disponibles"}
        </p>
        {exercises.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No hay ejercicios con estos filtros
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {exercises.map((ex, i) => (
                <div
                  key={ex.id}
                  className="animate-fade-up"
                  style={{ "--i": Math.min(i, 10) } as React.CSSProperties}
                >
                  <ExerciseCard ex={ex} />
                </div>
              ))}
              {isFetchingNextPage && (
                <>
                  <ExerciseCardSkeleton />
                  <ExerciseCardSkeleton />
                </>
              )}
            </div>
            {/* Sentinel: invisible, sits right after the grid. The
                  IntersectionObserver fires fetchNextPage ~400px before this
                  actually scrolls into view (see useInfiniteScrollTrigger),
                  and only while there's more to fetch and nothing's already
                  in flight — no separate isLoading state to hand-manage. */}
            {hasNextPage && <div ref={loadMoreRef} aria-hidden="true" className="h-1" />}
            {!hasNextPage && !isFetchingNextPage && (
              <p className="mt-6 text-center text-xs text-muted-foreground">
                No hay más preguntas.
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
