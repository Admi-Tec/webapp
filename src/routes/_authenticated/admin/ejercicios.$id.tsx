import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ExerciseForm } from "@/components/exercise-form";
import { getAdminExercise } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/ejercicios/$id")({
  component: EditExercise,
});

function EditExercise() {
  const { id } = Route.useParams();
  const fn = useServerFn(getAdminExercise);
  const q = useQuery({ queryKey: ["admin-exercise", id], queryFn: () => fn({ data: { id } }) });

  if (q.isLoading) return <p className="text-sm text-muted-foreground">Cargando…</p>;
  if (!q.data) return <p className="text-sm text-destructive">No encontrado.</p>;

  const ex = q.data;
  return (
    <div>
      <h2 className="mb-4 font-display text-xl font-bold">Editar ejercicio</h2>
      <ExerciseForm
        initial={{
          id: ex.id,
          topic_id: ex.topic_id,
          subtopic_id: ex.subtopic_id,
          university_id: ex.university_id,
          exam_year: ex.exam_year,
          difficulty: ex.difficulty,
          statement_md: ex.statement_md,
          statement_image_path: ex.statement_image_path ?? null,
          solution_image_path: ex.solution_image_path ?? null,
          choices: Array.isArray(ex.choices) ? (ex.choices as string[]) : [],
          correct_choice: ex.correct_choice,
          solution_md: ex.solution_md,
          tags: ex.tags ?? [],
        }}
      />
    </div>
  );
}
