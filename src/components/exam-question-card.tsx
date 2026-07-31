import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Flag } from "lucide-react";
import { MathText, ChoiceText } from "@/lib/math-render";
import { FavoriteButton } from "@/components/favorite-button";
import { ZoomableImage } from "@/components/zoomable-image";

export type ExamQuestionExercise = {
  id: string;
  topic: { name: string } | null;
  statement_md: string;
  choices: string[];
};

// Bloque puramente presentacional de una pregunta durante un examen —
// extraído de TakeExam (examen-sesion.$sessionId.index.tsx), que retiene el
// timer/autosave/navegación. Sin eso, esto se puede testear aislado — ver
// exam-question-card.test.tsx.
export function ExamQuestionCard({
  exercise,
  selectedIndex,
  flagged,
  disabled,
  imageUrl,
  onSelect,
  onToggleFlag,
}: {
  exercise: ExamQuestionExercise;
  selectedIndex: number | undefined;
  flagged: boolean;
  disabled: boolean;
  imageUrl?: string;
  onSelect: (index: number) => void;
  onToggleFlag: () => void;
}) {
  return (
    <div
      key={exercise.id}
      className="animate-card-swap mt-5 rounded-xl border border-border bg-card p-6"
    >
      <div className="mb-3 flex items-center justify-between">
        {exercise.topic?.name && <Badge variant="secondary">{exercise.topic.name}</Badge>}
        <div className="flex items-center gap-1">
          <FavoriteButton exerciseId={exercise.id} />
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleFlag}
            className={flagged ? "text-warning" : ""}
          >
            <span
              key={flagged ? "flagged" : "unflagged"}
              className="animate-icon-pop mr-1 inline-flex"
            >
              <Flag className="h-4 w-4" />
            </span>
            {flagged ? "Desmarcar" : "Marcar"}
          </Button>
        </div>
      </div>
      <MathText text={exercise.statement_md} />
      {imageUrl && <ZoomableImage src={imageUrl} alt="Enunciado" />}
      <ul className="mt-5 space-y-2">
        {exercise.choices.map((c, i) => {
          const picked = selectedIndex === i;
          return (
            <li key={i}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSelect(i)}
                className={`press w-full rounded-lg border px-4 py-3 text-left text-sm transition ${picked ? "border-primary bg-primary/10 font-medium" : "border-border bg-background hover:border-primary/40"}`}
              >
                <span className="mr-2 font-semibold text-primary">
                  {String.fromCharCode(65 + i)}.
                </span>
                <ChoiceText text={c} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
