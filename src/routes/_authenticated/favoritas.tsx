import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listMyFavorites } from "@/lib/favorites.functions";
import { ExerciseCard } from "@/components/exercise-card";
import { ExerciseCardSkeleton, LoadingNotice } from "@/components/skeletons";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/favoritas")({
  head: () => ({ meta: [{ title: "Favoritas · MatePre" }] }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const fn = useServerFn(listMyFavorites);
  const q = useQuery({ queryKey: ["my-favorites"], queryFn: () => fn() });
  const [topic, setTopic] = useState<string>("all");

  // `items` was a fresh array every render, which meant the `topics` useMemo
  // below (keyed on `items`) never actually skipped work — its dependency
  // never stayed referentially equal across renders. Memoizing `items`
  // itself off `q.data` (the actual stable source) fixes both this and
  // `filtered`, which was also unmemoized.
  const items = useMemo(() => (q.data ?? []).map((f: any) => f.exercise).filter(Boolean), [q.data]);
  const topics = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((ex: any) => {
      if (ex.topic?.slug) map.set(ex.topic.slug, ex.topic.name);
    });
    return Array.from(map, ([slug, name]) => ({ slug, name }));
  }, [items]);

  const filtered = useMemo(
    () => (topic === "all" ? items : items.filter((ex: any) => ex.topic?.slug === topic)),
    [items, topic],
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {items.length} guardadas
        </div>
        <h1 className="mt-3 font-display text-3xl font-bold">Tus preguntas favoritas</h1>
        <p className="mt-2 text-muted-foreground">
          Repasa las preguntas que marcaste para revisar más adelante.
        </p>
      </header>

      {topics.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button onClick={() => setTopic("all")}>
            <Badge variant={topic === "all" ? "default" : "outline"} className="cursor-pointer">
              Todas
            </Badge>
          </button>
          {topics.map((t) => (
            <button key={t.slug} onClick={() => setTopic(t.slug)}>
              <Badge variant={topic === t.slug ? "default" : "outline"} className="cursor-pointer">
                {t.name}
              </Badge>
            </button>
          ))}
        </div>
      )}

      {q.isLoading ? (
        <div>
          <LoadingNotice label="Cargando tus favoritas" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <ExerciseCardSkeleton key={i} />
            ))}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center">
          <p className="text-muted-foreground">
            Aún no tienes favoritas. Marca preguntas con la estrella{" "}
            <Star className="inline h-4 w-4" /> mientras practicas.
          </p>
          <Link to="/temas" className="mt-4 inline-block text-primary hover:underline">
            Explorar cursos →
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((ex: any) => (
            <ExerciseCard key={ex.id} ex={ex} />
          ))}
        </div>
      )}
    </div>
  );
}
