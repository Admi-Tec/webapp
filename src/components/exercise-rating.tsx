import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { getMyExerciseRating, rateExercise } from "@/lib/exercise-feedback.functions";
import { useSignedIn } from "@/hooks/use-signed-in";

export function ExerciseRating({
  exerciseId,
  className,
}: {
  exerciseId: string;
  className?: string;
}) {
  const signedIn = useSignedIn();
  const getFn = useServerFn(getMyExerciseRating);
  const rateFn = useServerFn(rateExercise);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["my-exercise-rating", exerciseId],
    queryFn: () => getFn({ data: { exerciseId } }),
    enabled: signedIn === true,
  });

  const [hovered, setHovered] = useState<number | null>(null);
  const m = useMutation({
    mutationFn: (stars: number) => rateFn({ data: { exerciseId, stars } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-exercise-rating", exerciseId] });
      toast.success("¡Gracias por tu calificación!");
    },
    onError: (e: any) => toast.error(e?.message ?? "No se pudo calificar"),
  });

  if (!signedIn) return null;

  const myStars = q.data?.stars ?? 0;
  const displayed = hovered ?? myStars;

  return (
    <div
      className={`inline-flex items-center gap-0.5 ${className ?? ""}`}
      role="radiogroup"
      aria-label="Calificar este ejercicio"
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={myStars === n}
          aria-label={`${n} estrella${n > 1 ? "s" : ""}`}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(null)}
          onClick={() => m.mutate(n)}
          disabled={m.isPending}
          className="cursor-pointer p-0.5 disabled:cursor-not-allowed"
        >
          <span
            key={n === displayed ? `on-${n}` : `off-${n}`}
            className="inline-flex animate-icon-pop"
          >
            <Star
              className={`h-4 w-4 transition-colors ${
                n <= displayed ? "fill-amber-400 text-amber-400" : "text-muted-foreground/50"
              }`}
            />
          </span>
        </button>
      ))}
    </div>
  );
}
