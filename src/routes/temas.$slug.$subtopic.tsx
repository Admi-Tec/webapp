import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  queryOptions,
  infiniteQueryOptions,
  useSuspenseQuery,
  useSuspenseInfiniteQuery,
} from "@tanstack/react-query";
import { getTopicBySlug, listExercisesPage } from "@/lib/exercises.functions";
import { useInfiniteScrollTrigger } from "@/hooks/use-infinite-scroll-trigger";
import { ExerciseCard } from "@/components/exercise-card";
import { ExerciseCardSkeleton, LoadingNotice } from "@/components/skeletons";
import { pageMeta, absoluteUrl } from "@/lib/site";
import { JsonLd } from "@/components/json-ld";

const topicQO = (slug: string) =>
  queryOptions({ queryKey: ["topic", slug], queryFn: () => getTopicBySlug({ data: { slug } }) });

const EXERCISES_PAGE_SIZE = 20;

const exercisesQO = (slug: string, sub: string) =>
  infiniteQueryOptions({
    queryKey: ["exercises", "topic", slug, "sub", sub],
    queryFn: ({ pageParam }) =>
      listExercisesPage({
        data: {
          topicSlug: slug,
          subtopicSlug: sub,
          page: pageParam,
          pageSize: EXERCISES_PAGE_SIZE,
        },
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => (lastPage.hasMore ? allPages.length : undefined),
  });

export const Route = createFileRoute("/temas/$slug/$subtopic")({
  loader: async ({ context, params }) => {
    const topic = await context.queryClient.ensureQueryData(topicQO(params.slug));
    if (!topic) throw notFound();
    const subtopic = topic.subtopics.find((s) => s.slug === params.subtopic);
    if (!subtopic) throw notFound();
    await context.queryClient.ensureInfiniteQueryData(exercisesQO(params.slug, params.subtopic));
    return { topic, subtopic };
  },
  head: ({ params, loaderData }) => {
    const topicName = loaderData?.topic?.name ?? params.slug;
    const subtopicName = loaderData?.subtopic?.name ?? params.subtopic;
    return pageMeta({
      path: `/temas/${params.slug}/${params.subtopic}`,
      title: `${subtopicName} · ${topicName}`,
      description: `Ejercicios de ${subtopicName} (${topicName}) resueltos paso a paso para tu examen de admisión.`,
    });
  },
  component: SubtopicPage,
  pendingComponent: SubtopicPagePending,
  pendingMs: 150,
  pendingMinMs: 300,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-destructive">
      {error.message}
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h2 className="font-display text-2xl font-bold">Tema no encontrado</h2>
      <Link to="/temas" className="mt-4 inline-block text-primary hover:underline">
        Volver a cursos
      </Link>
    </div>
  ),
});

function SubtopicPagePending() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="h-3.5 w-48 animate-pulse rounded bg-muted motion-reduce:animate-none" />
      <div className="mt-3 h-9 w-72 animate-pulse rounded bg-muted motion-reduce:animate-none sm:h-10" />
      <div className="mt-2 h-4 w-24 animate-pulse rounded bg-muted motion-reduce:animate-none" />
      <div className="mt-5">
        <LoadingNotice label="Cargando ejercicios" />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <ExerciseCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

function SubtopicPage() {
  const { slug, subtopic } = Route.useParams();
  const { data: topic } = useSuspenseQuery(topicQO(slug));
  const {
    data: exercisePages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSuspenseInfiniteQuery(exercisesQO(slug, subtopic));
  const exercises = exercisePages.pages.flatMap((p) => p.items);
  const loadMoreRef = useInfiniteScrollTrigger<HTMLDivElement>(
    fetchNextPage,
    hasNextPage && !isFetchingNextPage,
  );
  if (!topic) return null;
  const sub = topic.subtopics.find((s) => s.slug === subtopic)!;

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
              item: absoluteUrl(`/temas/${topic.slug}`),
            },
            {
              "@type": "ListItem",
              position: 3,
              name: sub.name,
              item: absoluteUrl(`/temas/${topic.slug}/${sub.slug}`),
            },
          ],
        }}
      />
      <nav className="text-xs text-muted-foreground" aria-label="Migas">
        <Link to="/temas" className="hover:underline">
          Cursos
        </Link>{" "}
        /{" "}
        <Link to="/temas/$slug" params={{ slug: topic.slug }} className="hover:underline">
          {topic.name}
        </Link>{" "}
        / <span className="text-foreground">{sub.name}</span>
      </nav>
      <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">{sub.name}</h1>
      <p className="mt-1 text-muted-foreground">
        {exercises.length} ejercicio{exercises.length === 1 ? "" : "s"}
      </p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {exercises.map((ex: any, i: number) => (
          <div
            key={ex.id}
            className="animate-fade-up"
            style={{ "--i": Math.min(i, 10) } as React.CSSProperties}
          >
            <ExerciseCard ex={ex} />
          </div>
        ))}
        {exercises.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Aún no hay ejercicios en este tema.
          </p>
        )}
        {isFetchingNextPage && (
          <>
            <ExerciseCardSkeleton />
            <ExerciseCardSkeleton />
          </>
        )}
      </div>
      {hasNextPage && <div ref={loadMoreRef} aria-hidden="true" className="h-1" />}
      {!hasNextPage && !isFetchingNextPage && exercises.length > 0 && (
        <p className="mt-6 text-center text-xs text-muted-foreground">No hay más preguntas.</p>
      )}
    </div>
  );
}
