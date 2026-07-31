import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import { getUserStats } from "@/lib/attempts.functions";
import { getFullProfile } from "@/lib/profile.functions";
import { getWeeklyProgress } from "@/lib/goals.functions";
import { getDailyRecommendations } from "@/lib/recommendations.functions";
import { MathText } from "@/lib/math-render";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ExerciseCard } from "@/components/exercise-card";
import { PremiumOverlay } from "@/components/premium/premium-gate";
import { TopicAccuracyChart } from "@/components/panel/topic-accuracy-chart";
import { usePlan } from "@/hooks/use-plan";
import {
  Flame,
  Target,
  ListChecks,
  Trophy,
  CalendarClock,
  AlertCircle,
  Shuffle,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/panel")({
  head: () => ({ meta: [{ title: "Panel · MatePre" }] }),
  component: PanelPage,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-destructive">
      {error.message}
    </div>
  ),
});

function PanelPage() {
  const fetchStats = useServerFn(getUserStats);
  const fetchProfile = useServerFn(getFullProfile);
  const fetchWeeklyProgress = useServerFn(getWeeklyProgress);
  const fetchDailyRecommendations = useServerFn(getDailyRecommendations);
  const qo = useMemo(
    () => queryOptions({ queryKey: ["user-stats"], queryFn: () => fetchStats() }),
    [fetchStats],
  );
  const { data: stats } = useSuspenseQuery(qo);
  const profileQ = useQuery({ queryKey: ["full-profile-mini"], queryFn: () => fetchProfile() });
  const weeklyQ = useQuery({ queryKey: ["weekly-progress"], queryFn: () => fetchWeeklyProgress() });
  const { isPremium } = usePlan();
  // enabled: isPremium — el server function ahora exige Premium server-side
  // (assertPremium), así que ni se llama para un usuario Gratuito: el
  // PremiumOverlay ya se encarga del blur+CTA visual, esto evita el error
  // "Requiere Premium" innecesario en la consola.
  const recommendationsQ = useQuery({
    queryKey: ["daily-recommendations"],
    queryFn: () => fetchDailyRecommendations(),
    enabled: isPremium,
  });

  const weakest = [...stats.topicStats].sort((a, b) => a.accuracy - b.accuracy)[0];

  const hasNoTargetUniversity = !!profileQ.data && profileQ.data.universities.length === 0;
  const primaryUniversity = profileQ.data?.universities[0]?.university ?? null;
  const isNewStudent = stats.total === 0;

  const universities = (profileQ.data?.universities ?? [])
    // A student's own date (set in su perfil) always wins; otherwise fall back to the
    // university's own known exam date, so an admin updating it there automatically
    // updates the countdown for every student who hasn't overridden it themselves.
    .map((u) => ({ ...u, effectiveExamDate: u.exam_date ?? u.university?.exam_date ?? null }))
    .filter((u) => u.effectiveExamDate)
    .map((u) => ({
      id: u.id,
      name: u.university?.short_name ?? u.university?.name ?? "",
      examDate: u.effectiveExamDate as string,
      daysLeft: Math.ceil(
        (new Date(u.effectiveExamDate as string).getTime() - new Date().setHours(0, 0, 0, 0)) /
          86400000,
      ),
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft);

  // Para el filtro de universidad del chart de aciertos — a diferencia de
  // `universities` arriba (que solo incluye las que tienen fecha de examen,
  // para la cuenta regresiva), acá se listan todas las universidades
  // objetivo del estudiante tal cual, sin ese filtro.
  const targetUniversities = (profileQ.data?.universities ?? []).map((u) => ({
    id: u.university_id as string,
    name: (u.university?.short_name ?? u.university?.name ?? "") as string,
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold sm:text-4xl">Tu panel</h1>
      <p className="mt-1 text-muted-foreground">
        Revisa tu progreso y planifica tu próxima sesión.
      </p>

      {hasNoTargetUniversity && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent-foreground" />
          <p>
            Aún no elegiste tu universidad objetivo, así que no podemos mostrarte la cuenta
            regresiva ni filtrar contenido para ti.{" "}
            <Link to="/perfil" className="font-medium text-primary hover:underline">
              Completa tu perfil →
            </Link>
          </p>
        </div>
      )}

      {!hasNoTargetUniversity && primaryUniversity && (
        <StartPracticeCard
          universitySlug={primaryUniversity.slug}
          universityName={primaryUniversity.short_name ?? primaryUniversity.name}
          isNewStudent={isNewStudent}
        />
      )}

      {(universities.length > 0 || weeklyQ.data) && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {universities.length > 0 && <CountdownCard universities={universities} />}
          {weeklyQ.data && <WeeklyGoalsCard progress={weeklyQ.data} />}
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<ListChecks className="h-5 w-5" />}
          label="Ejercicios"
          value={stats.total}
        />
        <StatCard
          icon={<Target className="h-5 w-5" />}
          label="% Aciertos"
          value={`${stats.accuracy}%`}
        />
        <StatCard icon={<Trophy className="h-5 w-5" />} label="Correctos" value={stats.correct} />
        <StatCard icon={<Flame className="h-5 w-5" />} label="Racha (días)" value={stats.streak} />
      </div>

      <TopicAccuracyChart
        basicTopicStats={stats.topicStats}
        targetUniversities={targetUniversities}
      />

      <PremiumOverlay
        feature="las recomendaciones personalizadas"
        title="Las recomendaciones personalizadas son Premium"
        className="mt-14"
      >
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-display text-xl font-bold">Recomendado para ti hoy</h2>
          {recommendationsQ.data && recommendationsQ.data.length > 0 ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {recommendationsQ.data.map((r) => (
                <div key={r.exercise.id}>
                  <p className="mb-1.5 text-xs text-muted-foreground">{r.reason}</p>
                  <ExerciseCard ex={r.exercise} />
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              {weakest
                ? "Resuelve algunos ejercicios más para recibir recomendaciones."
                : "Resuelve algunos ejercicios para recibir recomendaciones."}
            </p>
          )}
        </section>
      </PremiumOverlay>

      <section className="mt-10 rounded-xl border border-border bg-card p-5">
        <h2 className="font-display text-xl font-bold">Intentos recientes</h2>
        {stats.recent.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Sin intentos todavía.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {stats.recent.map((r) => (
              <li
                key={r.id}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3"
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    r.isCorrect ? "bg-success" : "bg-destructive"
                  }`}
                  aria-hidden
                />
                <div className="min-w-0">
                  <div className="line-clamp-1 text-sm">
                    <MathText text={r.statement || "(ejercicio)"} />
                  </div>
                  <p className="text-xs text-muted-foreground">{r.topicName}</p>
                </div>
                {r.exerciseId && (
                  <Link
                    to="/ejercicio/$id"
                    params={{ id: r.exerciseId }}
                    className="shrink-0 text-xs font-medium text-primary hover:underline"
                  >
                    Repasar →
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StartPracticeCard({
  universitySlug,
  universityName,
  isNewStudent,
}: {
  universitySlug: string;
  universityName: string;
  isNewStudent: boolean;
}) {
  return (
    <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold">
            {isNewStudent
              ? "¡Bienvenido! Da tu primer examen o simulacro"
              : "Practica con condiciones reales"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isNewStudent
              ? `Rinde un examen oficial o genera un simulacro de ${universityName} para ver dónde estás parado.`
              : `Sigue avanzando con un examen oficial o un nuevo simulacro de ${universityName}.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="press">
            <Link to="/examenes/$slug" params={{ slug: universitySlug }}>
              <ListChecks className="mr-2 h-4 w-4" /> Exámenes de {universityName}
            </Link>
          </Button>
          <Button asChild variant="outline" className="press">
            <Link to="/simulacros">
              <Shuffle className="mr-2 h-4 w-4" /> Generar simulacro
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function CountdownCard({
  universities,
}: {
  universities: Array<{ id: string; name: string; examDate: string; daysLeft: number }>;
}) {
  const [featured, ...rest] = universities;
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/10 text-primary">
          <CalendarClock className="h-4 w-4" />
        </span>
        <span className="text-xs font-medium uppercase tracking-wider">Cuenta regresiva</span>
      </div>
      <p className="mt-3 font-display text-3xl font-bold">
        {featured.daysLeft > 0
          ? `Faltan ${featured.daysLeft} días`
          : featured.daysLeft === 0
            ? "¡Es hoy!"
            : "Ya pasó"}
      </p>
      <p className="text-sm text-muted-foreground">{featured.name}</p>
      {rest.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-border pt-3 text-sm text-muted-foreground">
          {rest.map((u) => (
            <li key={u.id}>
              {u.name}:{" "}
              {u.daysLeft > 0 ? `${u.daysLeft} días` : u.daysLeft === 0 ? "hoy" : "ya pasó"}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function WeeklyGoalsCard({
  progress,
}: {
  progress: { questionsGoal: number; questionsDone: number; examsGoal: number; examsDone: number };
}) {
  const questionsPct = Math.min(
    100,
    Math.round((progress.questionsDone / Math.max(1, progress.questionsGoal)) * 100),
  );
  const examsPct = Math.min(
    100,
    Math.round((progress.examsDone / Math.max(1, progress.examsGoal)) * 100),
  );
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/10 text-primary">
          <Target className="h-4 w-4" />
        </span>
        <span className="text-xs font-medium uppercase tracking-wider">Metas semanales</span>
      </div>
      <div className="mt-4 space-y-4">
        <div>
          <div className="flex items-center justify-between text-sm">
            <span>Preguntas</span>
            <span className="font-medium">
              {progress.questionsDone}/{progress.questionsGoal}
            </span>
          </div>
          <Progress value={questionsPct} className="mt-1.5" />
        </div>
        <div>
          <div className="flex items-center justify-between text-sm">
            <span>Simulacros</span>
            <span className="font-medium">
              {progress.examsDone}/{progress.examsGoal}
            </span>
          </div>
          <Progress value={examsPct} className="mt-1.5" />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/10 text-primary">
          {icon}
        </span>
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-3 font-display text-3xl font-bold">{value}</p>
    </div>
  );
}
