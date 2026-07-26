import { Link } from "@tanstack/react-router";
import { DeleteExamAttemptButton } from "@/components/delete-exam-attempt-button";

export function ExamAttemptRow({
  sessionId,
  startedAt,
  score,
  maxScore,
  total,
  onDeleted,
  compact = false,
}: {
  sessionId: string;
  startedAt: string;
  score: number | null;
  maxScore: number | null;
  total: number;
  onDeleted: () => void;
  compact?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <Link
        to="/examen-sesion/$sessionId/resultado"
        params={{ sessionId }}
        className={`press flex flex-1 items-center justify-between rounded-md border border-border hover:border-primary/40 ${
          compact ? "bg-background px-3 py-2 text-sm" : "bg-card p-3"
        }`}
      >
        <div>
          <p className={compact ? "font-medium" : "text-sm font-medium"}>
            {new Date(startedAt).toLocaleString("es-PE")}
          </p>
          <p className="text-xs text-muted-foreground">
            {score ?? 0}
            {maxScore != null ? ` / ${maxScore}` : ""} pts · {total} preguntas
          </p>
        </div>
        <span className={compact ? "text-primary" : "text-sm text-primary"}>Ver resultado →</span>
      </Link>
      <DeleteExamAttemptButton sessionId={sessionId} onDeleted={onDeleted} iconOnly />
    </div>
  );
}
