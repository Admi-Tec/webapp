import { createFileRoute } from "@tanstack/react-router";
import { ExerciseForm } from "@/components/exercise-form";

export const Route = createFileRoute("/_authenticated/admin/ejercicios/nuevo")({
  component: () => (
    <div>
      <h2 className="mb-4 font-display text-xl font-bold">Nuevo ejercicio</h2>
      <ExerciseForm />
    </div>
  ),
});
