import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ExamForm } from "@/components/exam-form";
import { getAdminExam } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/examenes/$id")({
  component: EditExam,
});

function EditExam() {
  const { id } = Route.useParams();
  const fn = useServerFn(getAdminExam);
  const q = useQuery({ queryKey: ["admin-exam", id], queryFn: () => fn({ data: { id } }) });

  if (q.isLoading) return <p className="text-sm text-muted-foreground">Cargando…</p>;
  if (!q.data) return <p className="text-sm text-destructive">No encontrado.</p>;
  const e = q.data as any;

  return (
    <div>
      <h2 className="mb-4 font-display text-xl font-bold">Editar examen</h2>
      <ExamForm
        initial={{
          id: e.id,
          title: e.title,
          description: e.description,
          university_id: e.university_id ?? "",
          time_limit_min: e.time_limit_min,
          passing_score: e.passing_score,
          max_attempts: e.max_attempts,
          status: e.status,
          question_order: e.question_order,
          exam_type: e.exam_type ?? "standard",
          exercise_ids: e.exercise_ids ?? [],
          template_rules: e.template_rules ?? [],
          points_correct: e.points_correct,
          points_incorrect: e.points_incorrect,
          points_empty: e.points_empty,
        }}
      />
    </div>
  );
}
