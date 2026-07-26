import { createFileRoute } from "@tanstack/react-router";
import { ExamForm } from "@/components/exam-form";

export const Route = createFileRoute("/_authenticated/admin/examenes/nuevo")({
  component: () => (
    <div>
      <h2 className="mb-4 font-display text-xl font-bold">Nuevo examen</h2>
      <ExamForm />
    </div>
  ),
});
