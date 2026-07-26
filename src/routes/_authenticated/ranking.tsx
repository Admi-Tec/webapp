import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Trophy, Target, Star, Users, ArrowDown, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getExamLeaderboard,
  listPublishedExamsForRanking,
  getExamMinScore,
} from "@/lib/leaderboard.functions";
import { getFullProfile } from "@/lib/profile.functions";
import { PremiumOverlay } from "@/components/premium/premium-gate";

export const Route = createFileRoute("/_authenticated/ranking")({
  head: () => ({ meta: [{ title: "Ranking · MatePre" }] }),
  component: RankingPage,
});

function RankingPage() {
  const examsFn = useServerFn(listPublishedExamsForRanking);
  const examBoardFn = useServerFn(getExamLeaderboard);
  const profileFn = useServerFn(getFullProfile);

  const examsQ = useQuery({ queryKey: ["rank-exams"], queryFn: () => examsFn() });
  const profileQ = useQuery({ queryKey: ["full-profile"], queryFn: () => profileFn() });

  const [examId, setExamId] = useState<string>("");

  const examBoardQ = useQuery({
    queryKey: ["rank-exam-board", examId],
    queryFn: () => examBoardFn({ data: { examId, limit: 100 } }),
    enabled: !!examId,
  });

  const examRows = examBoardQ.data ?? [];
  const examMe = examRows.find((r: any) => r.is_me);
  const examTotal = examRows[0]?.total_count ?? 0;

  // The leaderboard RPC filters out anyone with leaderboard_opt_in=false or
  // no pseudonym, so `examMe` stays undefined for them even if they have
  // real attempts — without this flag that reads as "sin intentos", which
  // is wrong and confusing.
  const profile = profileQ.data?.profile;
  const optedOut = !!profile && (!profile.leaderboard_opt_in || !profile.pseudonym);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs">
          <Trophy className="h-3 w-3" /> Anónimo
        </div>
        <h1 className="mt-3 font-display text-3xl font-bold">Ranking</h1>
        <p className="mt-2 text-muted-foreground">
          Compara tu desempeño con otros postulantes. Solo se muestran pseudónimos.
        </p>
      </header>

      <Select value={examId} onValueChange={setExamId}>
        <SelectTrigger className="w-full sm:w-96">
          <SelectValue placeholder="Selecciona un examen" />
        </SelectTrigger>
        <SelectContent>
          {(examsQ.data ?? []).map((e: any) => (
            <SelectItem key={e.id} value={e.id}>
              {e.title}
              {e.university ? ` — ${e.university.short_name}` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="mt-2 text-xs text-muted-foreground">
        Mejor puntaje obtenido en los últimos 3 meses. Se muestran los 100 mejores puestos.
      </p>

      {!examId && (
        <div className="mt-10 rounded-xl border border-dashed border-border bg-secondary/20 p-8 text-center">
          <Trophy className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-display text-lg font-bold">Elige un examen para ver el ranking</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Verás tu puesto, tu mejor puntaje y cómo te comparas con otros estudiantes.
          </p>
        </div>
      )}

      {/* El ranking completo (tu puesto + top 100 + puntaje mínimo por carrera)
          es Premium: para el plan gratuito queda visible pero bloqueado, con el
          desbloqueo encima — nunca oculto sin explicación. */}
      {examId ? (
        <PremiumOverlay
          feature="el ranking completo"
          title="El ranking completo es parte de Premium"
        >
          {/* Your standing is always visible up front, whether or not you land
          inside the top-100 rows the table actually renders. */}
          {examId && optedOut && (
            <div className="mt-6 flex items-start gap-3 rounded-lg border border-dashed border-border bg-secondary/30 p-4 text-sm">
              <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="font-medium">No apareces en el ranking</p>
                <p className="mt-1 text-muted-foreground">
                  Tus intentos sí se registran, pero no participas en el ranking porque no activaste
                  esa opción (o no tienes un pseudónimo) en tu perfil.
                </p>
                <Link
                  to="/perfil"
                  className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
                >
                  Activar en mi perfil →
                </Link>
              </div>
            </div>
          )}
          {examId && !optedOut && examBoardQ.isLoading && <StatTilesSkeleton />}

          {!optedOut && examMe && (
            <div className="mt-6">
              <div className="grid gap-3 sm:grid-cols-3">
                <StatTile
                  icon={<Trophy className="h-4 w-4" />}
                  label="Tu puesto"
                  value={`#${examMe.rank}`}
                  caption={
                    examTotal > 0 && examMe.rank > 1
                      ? `Mejor que el ${Math.round(((examTotal - examMe.rank) / examTotal) * 100)}%`
                      : examMe.rank === 1
                        ? "¡El mejor puntaje!"
                        : undefined
                  }
                />
                <StatTile
                  icon={<Star className="h-4 w-4" />}
                  label="Tu mejor puntaje"
                  value={`${examMe.best_score}${examMe.max_score != null ? ` / ${examMe.max_score}` : ""}`}
                />
                <StatTile
                  icon={<Users className="h-4 w-4" />}
                  label="Participantes"
                  value={examTotal}
                />
              </div>
              {examMe.rank > 100 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  No apareces en la tabla porque solo se muestran los 100 mejores puestos.
                </p>
              ) : (
                <a
                  href={`#rank-row-${examMe.rank}`}
                  onClick={(e) => {
                    e.preventDefault();
                    const reduceMotion = window.matchMedia(
                      "(prefers-reduced-motion: reduce)",
                    ).matches;
                    document.getElementById(`rank-row-${examMe.rank}`)?.scrollIntoView({
                      behavior: reduceMotion ? "auto" : "smooth",
                      block: "center",
                    });
                  }}
                  className="press mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <ArrowDown className="h-3.5 w-3.5" /> Ver tu fila en la tabla
                </a>
              )}
            </div>
          )}

          {examId && (
            <ExamMinScoreCard
              examId={examId}
              myBestScore={examMe?.best_score ?? null}
              optedOut={optedOut}
            />
          )}

          {examId &&
            (examBoardQ.isLoading ? (
              <BoardTableSkeleton />
            ) : (
              <BoardTable
                rows={examRows
                  .filter((r: any) => r.rank <= 100)
                  .map((r: any) => ({
                    rank: r.rank,
                    pseudonym: r.pseudonym,
                    scoreText: `${r.best_score}${r.max_score != null ? ` / ${r.max_score}` : ""} pts`,
                    subtitle: `${r.attempts_count} intentos`,
                    is_me: r.is_me,
                  }))}
                scoreLabel="Mejor puntaje"
              />
            ))}
        </PremiumOverlay>
      ) : null}
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  caption,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  caption?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/10 text-primary">
          {icon}
        </span>
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-2 font-display text-2xl font-bold">{value}</p>
      {caption && <p className="mt-0.5 text-xs text-muted-foreground">{caption}</p>}
    </div>
  );
}

function StatTilesSkeleton() {
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-border bg-card p-4 motion-reduce:animate-none"
        >
          <div className="h-3.5 w-20 rounded bg-muted" />
          <div className="mt-3 h-7 w-14 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function BoardTableSkeleton() {
  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-border">
      <div className="divide-y divide-border">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex animate-pulse items-center gap-3 px-4 py-3 motion-reduce:animate-none"
          >
            <div className="h-7 w-7 shrink-0 rounded-full bg-muted" />
            <div className="h-3.5 flex-1 rounded bg-muted" />
            <div className="h-3.5 w-16 shrink-0 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

function BoardTable({
  rows,
  scoreLabel,
}: {
  rows: Array<{
    rank: number;
    pseudonym: string;
    scoreText: string;
    subtitle: string;
    is_me: boolean;
  }>;
  scoreLabel: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="mt-6 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Aún no hay puntuaciones para mostrar. Sé el primero.
      </p>
    );
  }
  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-2 text-left">#</th>
            <th className="px-4 py-2 text-left">Pseudónimo</th>
            <th className="px-4 py-2 text-right">{scoreLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={`${r.rank}-${r.pseudonym}`}
              id={r.is_me ? `rank-row-${r.rank}` : undefined}
              className={`border-t border-border transition-colors ${r.is_me ? "bg-primary/10 font-semibold" : ""}`}
            >
              <td className="px-4 py-3">
                <span
                  className={`grid h-7 w-7 place-items-center rounded-full text-sm font-bold ${
                    r.rank <= 3
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground"
                  }`}
                >
                  {r.rank}
                </span>
              </td>
              <td className="px-4 py-3">
                {r.pseudonym}
                {r.is_me && (
                  <Badge className="ml-2" variant="secondary">
                    Tú
                  </Badge>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex flex-col items-end gap-0.5 sm:flex-row sm:items-baseline sm:justify-end sm:gap-2">
                  <span className="font-semibold">{r.scoreText}</span>
                  <span className="text-xs font-normal text-muted-foreground">{r.subtitle}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Optional benchmark set by an admin for one exact (university, exam,
// career) combination. Still loading -> render nothing; resolved but no
// matching row -> say so explicitly instead of silently disappearing, so a
// student doesn't wonder whether the page is broken.
function ExamMinScoreCard({
  examId,
  myBestScore,
  optedOut,
}: {
  examId: string;
  myBestScore: number | null;
  optedOut: boolean;
}) {
  const minScoreFn = useServerFn(getExamMinScore);
  const minScoreQ = useQuery({
    queryKey: ["exam-min-score", examId],
    queryFn: () => minScoreFn({ data: { examId } }),
  });

  if (!minScoreQ.data) return null;

  const minScore = minScoreQ.data.minScore;
  const careerName = minScoreQ.data.careerName;

  if (minScore == null) {
    return (
      <div className="mt-4 rounded-lg border border-border bg-card p-4">
        <p className="inline-flex items-center gap-1.5 text-sm font-semibold">
          <Target className="h-4 w-4 text-primary" /> Puntaje mínimo de ingreso
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Ningún mínimo ha sido registrado para {careerName ?? "la carrera que estás buscando"}.
        </p>
      </div>
    );
  }

  const forCareer = careerName ? ` para ${careerName}` : "";
  const isBehind = myBestScore == null || myBestScore < minScore;

  return (
    <div className="mt-4 rounded-lg border border-border bg-card p-4">
      <p className="inline-flex items-center gap-1.5 text-sm font-semibold">
        <Target className="h-4 w-4 text-primary" /> Puntaje mínimo de ingreso
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Referencia para este examen{forCareer}:{" "}
        <span className="font-semibold text-foreground">{minScore} puntos</span>
      </p>
      {myBestScore == null ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {optedOut
            ? "No podemos comparar tu puntaje porque no participas en el ranking."
            : "Aún no tienes un intento en este examen para comparar."}
        </p>
      ) : isBehind ? (
        <p className="mt-2 text-sm">
          Te faltan{" "}
          <span className="font-semibold">{Math.round(minScore - myBestScore)} puntos</span> para
          alcanzar el puntaje mínimo de ingreso{forCareer}. ¡Sigue practicando!
        </p>
      ) : (
        <p className="mt-2 text-sm text-success">
          ¡Vas muy bien! Tu mejor puntaje ya supera el puntaje mínimo de ingreso{forCareer}.
        </p>
      )}
    </div>
  );
}
