import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight, Loader2 } from "lucide-react";
import { PRACTICE_BATCH_SIZE, type ExerciseListSearch } from "@/lib/exercise-practice";
import { InfoTooltip } from "@/components/info-tooltip";

type Props = {
  filters: ExerciseListSearch;
  topics: { slug: string; name: string }[];
  universities: { slug: string; short_name: string }[];
  total: number;
  pending: boolean;
  starting: boolean;
  onChange: (filters: ExerciseListSearch) => void;
  onStart: () => void;
};

export function ExercisePracticeControls({
  filters,
  topics,
  universities,
  total,
  pending,
  starting,
  onChange,
  onStart,
}: Props) {
  const batchSize = Math.min(PRACTICE_BATCH_SIZE, total);
  const practiceDescription = pending
    ? "Actualizando ejercicios…"
    : total === 0
      ? "Prueba otros filtros para encontrar ejercicios."
      : `Resuelve ${batchSize} ${batchSize === 1 ? "ejercicio elegido" : "ejercicios elegidos"} al azar con estos filtros.`;
  const filterClassName =
    "h-11 w-full min-w-0 border-border/70 text-sm font-normal shadow-none lg:h-9";
  // Always render the label ourselves: mixing custom text and Radix's
  // item-text portal can clear the trigger when switching back to "all".
  const topicLabel = topics.find((topic) => topic.slug === filters.subtopic)?.name ?? "Tema";
  const universityLabel =
    universities.find((university) => university.slug === filters.university)?.short_name ??
    "Universidad";
  const difficultyLabel = {
    all: "Dificultad",
    facil: "Fácil",
    medio: "Medio",
    dificil: "Difícil",
  }[filters.difficulty];

  return (
    <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1fr)] lg:w-full lg:max-w-2xl">
        <div className="min-w-0">
          <Label htmlFor="practice-topic" className="sr-only">
            Tema
          </Label>
          <Select
            value={filters.subtopic}
            onValueChange={(subtopic) => onChange({ ...filters, subtopic })}
            disabled={starting || pending}
          >
            <SelectTrigger id="practice-topic" className={filterClassName}>
              <SelectValue>{topicLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los temas</SelectItem>
              {topics.map((topic) => (
                <SelectItem key={topic.slug} value={topic.slug}>
                  {topic.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-0">
          <Label htmlFor="practice-difficulty" className="sr-only">
            Dificultad
          </Label>
          <Select
            value={filters.difficulty}
            onValueChange={(difficulty: ExerciseListSearch["difficulty"]) =>
              onChange({ ...filters, difficulty })
            }
            disabled={starting || pending}
          >
            <SelectTrigger id="practice-difficulty" className={filterClassName}>
              <SelectValue>{difficultyLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las dificultades</SelectItem>
              <SelectItem value="facil">Fácil</SelectItem>
              <SelectItem value="medio">Medio</SelectItem>
              <SelectItem value="dificil">Difícil</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex min-w-0 items-center gap-1">
          <Label htmlFor="practice-university" className="sr-only">
            Universidad de procedencia
          </Label>
          <Select
            value={filters.university}
            onValueChange={(university) => onChange({ ...filters, university })}
            disabled={starting || pending}
          >
            <SelectTrigger id="practice-university" className={filterClassName}>
              <SelectValue>{universityLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las universidades</SelectItem>
              {universities.map((university) => (
                <SelectItem key={university.slug} value={university.slug}>
                  {university.short_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <InfoTooltip
            label="Cómo funciona el filtro de universidad"
            className="min-h-11 min-w-11 lg:min-h-9 lg:min-w-9"
          >
            Elige la universidad de la que provienen los ejercicios.
          </InfoTooltip>
        </div>
      </div>
      <div className="flex items-center gap-1 lg:shrink-0">
        <p id="practice-batch-count" className="sr-only" role="status">
          {practiceDescription}
        </p>
        <Button
          type="button"
          onClick={onStart}
          disabled={pending || starting || total === 0}
          aria-describedby="practice-batch-count"
          className={`w-full h-11 text-sm font-normal shadow-none sm:w-auto lg:h-9 ${!pending && !starting && total > 0 ? "practice-start-ready" : ""}`}
        >
          {starting ? (
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
          ) : null}
          {starting ? "Preparando práctica…" : "Empezar a practicar"}
          {!starting && (
            <span className="practice-start-cue inline-flex" aria-hidden>
              <ArrowRight className="practice-start-arrow h-4 w-4" />
            </span>
          )}
        </Button>
        <InfoTooltip
          label="Qué incluye la práctica"
          className="min-h-11 min-w-11 lg:min-h-9 lg:min-w-9"
        >
          {practiceDescription}
        </InfoTooltip>
      </div>
    </div>
  );
}
