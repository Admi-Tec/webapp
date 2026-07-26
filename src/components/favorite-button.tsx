import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { toggleFavorite, listMyFavoriteIds } from "@/lib/favorites.functions";
import { useSignedIn } from "@/hooks/use-signed-in";

export function FavoriteButton({
  exerciseId,
  className,
}: {
  exerciseId: string;
  className?: string;
}) {
  const signedIn = useSignedIn();

  const listFn = useServerFn(listMyFavoriteIds);
  const toggleFn = useServerFn(toggleFavorite);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["my-favorite-ids"],
    queryFn: () => listFn(),
    enabled: !!signedIn,
  });
  const favIds = new Set(q.data ?? []);
  const isFav = favIds.has(exerciseId);

  const m = useMutation({
    mutationFn: () => toggleFn({ data: { exerciseId } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["my-favorite-ids"] });
      qc.invalidateQueries({ queryKey: ["my-favorites"] });
      toast.success(r.favorited ? "Añadida a favoritas" : "Removida de favoritas");
    },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  if (!signedIn) return null;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        m.mutate();
      }}
      aria-label={isFav ? "Quitar de favoritas" : "Marcar como favorita"}
      className={`inline-flex cursor-pointer items-center justify-center rounded-md p-1.5 transition hover:scale-110 hover:bg-secondary active:scale-90 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 ${className ?? ""}`}
      disabled={m.isPending}
    >
      <span key={isFav ? "fav" : "unfav"} className="animate-icon-pop inline-flex">
        <Star
          className={`h-4 w-4 ${isFav ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
        />
      </span>
    </button>
  );
}
