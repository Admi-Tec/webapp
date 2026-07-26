import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  LabelList,
} from "recharts";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowUp, ArrowDown, ListFilter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PremiumLockChip, usePremiumGate } from "@/components/premium/premium-gate";
import {
  getTopicAccuracyDetail,
  getTopicFrequencyByUniversity,
  type TopicAccuracyRow,
} from "@/lib/attempts.functions";

type TimeRange = "30d" | "3m" | "all";
type ContentType = "all" | "standard" | "template" | "practice";
type SortBy = "accuracy_asc" | "alphabetical" | "frequency";

const TIME_RANGE_DAYS: Record<Exclude<TimeRange, "all">, number> = { "30d": 30, "3m": 90 };
const TREND_MIN_SAMPLES = 3;
const TREND_MIN_DELTA = 5;

interface BasicTopicStat {
  slug: string;
  name: string;
  total: number;
  correct: number;
  accuracy: number;
}

interface TargetUniversity {
  id: string;
  name: string;
}

interface Bar_ {
  id: string;
  name: string;
  total: number;
  correct: number;
  accuracy: number;
  avgAccuracy: number | null;
  trend: "up" | "down" | "flat" | null;
  frequency: number | null;
}

function aggregate(
  rows: TopicAccuracyRow[],
  trendRows: TopicAccuracyRow[],
  keyOf: (r: TopicAccuracyRow) => { id: string; name: string } | null,
  avgMap: Record<string, number>,
  freqMap: Record<string, number> | null,
): Bar_[] {
  const map = new Map<string, { name: string; total: number; correct: number }>();
  rows.forEach((r) => {
    const k = keyOf(r);
    if (!k) return;
    const cur = map.get(k.id) ?? { name: k.name, total: 0, correct: 0 };
    cur.total += 1;
    if (r.isCorrect) cur.correct += 1;
    map.set(k.id, cur);
  });

  const cutoff30 = Date.now() - 30 * 86400000;
  const cutoff60 = Date.now() - 60 * 86400000;
  const trendMap = new Map<
    string,
    { curTotal: number; curCorrect: number; prevTotal: number; prevCorrect: number }
  >();
  trendRows.forEach((r) => {
    const k = keyOf(r);
    if (!k) return;
    const t = new Date(r.createdAt).getTime();
    const cur = trendMap.get(k.id) ?? { curTotal: 0, curCorrect: 0, prevTotal: 0, prevCorrect: 0 };
    if (t >= cutoff30) {
      cur.curTotal += 1;
      if (r.isCorrect) cur.curCorrect += 1;
    } else if (t >= cutoff60) {
      cur.prevTotal += 1;
      if (r.isCorrect) cur.prevCorrect += 1;
    }
    trendMap.set(k.id, cur);
  });

  return Array.from(map.entries()).map(([id, v]) => {
    const t = trendMap.get(id);
    let trend: Bar_["trend"] = null;
    if (t && t.curTotal >= TREND_MIN_SAMPLES && t.prevTotal >= TREND_MIN_SAMPLES) {
      const curAcc = (t.curCorrect / t.curTotal) * 100;
      const prevAcc = (t.prevCorrect / t.prevTotal) * 100;
      trend =
        curAcc - prevAcc >= TREND_MIN_DELTA
          ? "up"
          : prevAcc - curAcc >= TREND_MIN_DELTA
            ? "down"
            : "flat";
    }
    return {
      id,
      name: v.name,
      total: v.total,
      correct: v.correct,
      accuracy: Math.round((v.correct / v.total) * 100),
      avgAccuracy: avgMap[id] ?? null,
      trend,
      frequency: freqMap ? (freqMap[id] ?? 0) : null,
    };
  });
}

function sortBars(bars: Bar_[], sortBy: SortBy): Bar_[] {
  return [...bars].sort((a, b) => {
    if (sortBy === "alphabetical") return a.name.localeCompare(b.name, "es");
    if (sortBy === "frequency") return (b.frequency ?? 0) - (a.frequency ?? 0);
    return a.accuracy - b.accuracy;
  });
}

// Etiqueta custom sobre la barra "Mi precisión" con la flecha de tendencia
// (punto 6 del plan) — texto SVG simple en vez de un ícono, para no lidiar
// con <svg> anidado dentro del <svg> del propio chart.
function TrendLabel(props: any) {
  const { x, y, width, value } = props;
  if (!value || value === "flat") return null;
  const up = value === "up";
  return (
    <text
      x={x + width / 2}
      y={y - 6}
      textAnchor="middle"
      fontSize={11}
      fontWeight={700}
      fill={up ? "var(--color-success)" : "var(--color-destructive)"}
    >
      {up ? "▲" : "▼"}
    </text>
  );
}

// Sin esto, un promedio null (sin datos de otros estudiantes todavía para
// ese tema) se dibuja como una barra de altura cero — indistinguible de "el
// promedio es 0%", que es información distinta y engañosa. Para un valor
// real no dibuja nada (la barra gris ya lo comunica); solo entra cuando no
// hay dato.
function NoAvgDataLabel(props: any) {
  const { x, y, width, value } = props;
  if (value !== null && value !== undefined) return null;
  return (
    <text
      x={x + width / 2}
      y={y - 4}
      textAnchor="middle"
      fontSize={9}
      fill="var(--color-muted-foreground)"
    >
      Sin datos
    </text>
  );
}

function TopicMultiSelect({
  topics,
  selected,
  onChange,
}: {
  topics: Array<{ id: string; name: string }>;
  selected: string[] | null;
  onChange: (v: string[] | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = selected !== null;

  function toggle(id: string) {
    const current = selected ?? topics.map((t) => t.id);
    const next = current.includes(id) ? current.filter((k) => k !== id) : [...current, id];
    onChange(next.length === topics.length ? null : next);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" size="sm" variant="outline" className="press">
          <ListFilter className="mr-1.5 h-3.5 w-3.5" />
          {active
            ? `${selected.length} curso${selected.length === 1 ? "" : "s"}`
            : "Todos los cursos"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        <div className="max-h-64 space-y-1.5 overflow-auto">
          {topics.map((t) => {
            const checked = selected ? selected.includes(t.id) : true;
            return (
              <label key={t.id} className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={checked} onCheckedChange={() => toggle(t.id)} />
                {t.name}
              </label>
            );
          })}
        </div>
        {active && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 w-full"
            onClick={() => onChange(null)}
          >
            Mostrar todos
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function TopicAccuracyChart({
  basicTopicStats,
  targetUniversities,
}: {
  basicTopicStats: BasicTopicStat[];
  targetUniversities: TargetUniversity[];
}) {
  const premium = usePremiumGate("los filtros y el detalle de aciertos por curso");
  const { isPremium } = premium;

  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [contentType, setContentType] = useState<ContentType>("all");
  const [universityId, setUniversityId] = useState<string>("all");
  const [selectedTopics, setSelectedTopics] = useState<string[] | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>("accuracy_asc");
  const [drillTopic, setDrillTopic] = useState<{ id: string; name: string } | null>(null);

  const detailFn = useServerFn(getTopicAccuracyDetail);
  const detailQ = useQuery({
    queryKey: ["topic-accuracy-detail"],
    queryFn: () => detailFn(),
    enabled: isPremium,
  });

  const effectiveUniversityForFrequency =
    universityId !== "all" ? universityId : (targetUniversities[0]?.id ?? null);
  const needsFrequency = universityId !== "all" || sortBy === "frequency";
  const freqFn = useServerFn(getTopicFrequencyByUniversity);
  const freqQ = useQuery({
    queryKey: ["topic-frequency-by-university", effectiveUniversityForFrequency],
    queryFn: () => freqFn({ data: { universityId: effectiveUniversityForFrequency as string } }),
    enabled: isPremium && needsFrequency && !!effectiveUniversityForFrequency,
  });

  const usingEnhanced = isPremium && !!detailQ.data;

  const rangeCutoff = useMemo(() => {
    if (timeRange === "all") return null;
    return Date.now() - TIME_RANGE_DAYS[timeRange] * 86400000;
  }, [timeRange]);

  const rowsInRange = useMemo(() => {
    const rows = detailQ.data?.rows ?? [];
    return rows.filter((r) => {
      if (contentType !== "all" && r.contentType !== contentType) return false;
      if (rangeCutoff !== null && new Date(r.createdAt).getTime() < rangeCutoff) return false;
      return true;
    });
  }, [detailQ.data, contentType, rangeCutoff]);

  // La tendencia compara los últimos 30 días contra los 30 anteriores,
  // siempre — independiente del rango de fecha elegido en el filtro (que
  // solo acota qué se promedia como "precisión actual" en las barras).
  const rowsForTrend = useMemo(() => {
    const rows = detailQ.data?.rows ?? [];
    return contentType === "all" ? rows : rows.filter((r) => r.contentType === contentType);
  }, [detailQ.data, contentType]);

  const topicBarsAll = useMemo(() => {
    if (!usingEnhanced || !detailQ.data) {
      return basicTopicStats.map((t) => ({
        id: t.slug,
        name: t.name,
        total: t.total,
        correct: t.correct,
        accuracy: t.accuracy,
        avgAccuracy: null,
        trend: null,
        frequency: null,
      })) as Bar_[];
    }
    return aggregate(
      rowsInRange,
      rowsForTrend,
      (r) => ({ id: r.topicId, name: r.topicName }),
      detailQ.data.topicAvgAccuracy,
      universityId !== "all" ? (freqQ.data?.topicFrequency ?? null) : null,
    );
  }, [
    usingEnhanced,
    detailQ.data,
    basicTopicStats,
    rowsInRange,
    rowsForTrend,
    universityId,
    freqQ.data,
  ]);

  const topicOptions = useMemo(
    () => topicBarsAll.map((b) => ({ id: b.id, name: b.name })),
    [topicBarsAll],
  );

  const topicBars = useMemo(() => {
    let bars = topicBarsAll;
    if (universityId !== "all" && freqQ.data) {
      bars = bars.filter((b) => (b.frequency ?? 0) > 0);
    }
    if (selectedTopics) {
      bars = bars.filter((b) => selectedTopics.includes(b.id));
    }
    return sortBars(bars, sortBy);
  }, [topicBarsAll, universityId, freqQ.data, selectedTopics, sortBy]);

  const subtopicBars = useMemo(() => {
    if (!drillTopic || !usingEnhanced || !detailQ.data) return [];
    const rowsForTopic = rowsInRange.filter((r) => r.topicId === drillTopic.id);
    const trendForTopic = rowsForTrend.filter((r) => r.topicId === drillTopic.id);
    let bars = aggregate(
      rowsForTopic,
      trendForTopic,
      (r) => (r.subtopicId ? { id: r.subtopicId, name: r.subtopicName ?? "—" } : null),
      detailQ.data.subtopicAvgAccuracy,
      universityId !== "all" ? (freqQ.data?.subtopicFrequency ?? null) : null,
    );
    if (universityId !== "all" && freqQ.data) {
      bars = bars.filter((b) => (b.frequency ?? 0) > 0);
    }
    return sortBars(bars, sortBy);
  }, [
    drillTopic,
    usingEnhanced,
    detailQ.data,
    rowsInRange,
    rowsForTrend,
    universityId,
    freqQ.data,
    sortBy,
  ]);

  const displayedBars = drillTopic ? subtopicBars : topicBars;
  const hasAnyAttempt = usingEnhanced
    ? (detailQ.data?.rows.length ?? 0) > 0
    : basicTopicStats.length > 0;

  return (
    <section className="mt-10 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">Aciertos por curso</h2>
        {!isPremium && <PremiumLockChip />}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Select
          value={timeRange}
          onValueChange={(v) => premium.gate(() => setTimeRange(v as TimeRange))}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30d">Últimos 30 días</SelectItem>
            <SelectItem value="3m">Últimos 3 meses</SelectItem>
            <SelectItem value="all">Histórico completo</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={contentType}
          onValueChange={(v) => premium.gate(() => setContentType(v as ContentType))}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo el contenido</SelectItem>
            <SelectItem value="standard">Exámenes oficiales</SelectItem>
            <SelectItem value="template">Simulacros</SelectItem>
            <SelectItem value="practice">Práctica por tema</SelectItem>
          </SelectContent>
        </Select>
        {targetUniversities.length > 1 && (
          <Select
            value={universityId}
            onValueChange={(v) => premium.gate(() => setUniversityId(v))}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas mis universidades</SelectItem>
              {targetUniversities.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={sortBy} onValueChange={(v) => premium.gate(() => setSortBy(v as SortBy))}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="accuracy_asc">Menor precisión primero</SelectItem>
            <SelectItem value="alphabetical">Alfabético</SelectItem>
            <SelectItem value="frequency">Frecuencia en tu universidad</SelectItem>
          </SelectContent>
        </Select>
        {!drillTopic && (
          <TopicMultiSelect
            topics={topicOptions}
            selected={selectedTopics}
            onChange={(v) => premium.gate(() => setSelectedTopics(v))}
          />
        )}
      </div>

      {drillTopic && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="button" size="sm" className="press" onClick={() => setDrillTopic(null)}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Volver a todos los cursos
          </Button>
          <nav className="text-xs text-muted-foreground">
            <button type="button" onClick={() => setDrillTopic(null)} className="hover:underline">
              Todos los cursos
            </button>{" "}
            › <span className="text-foreground">{drillTopic.name}</span>
          </nav>
        </div>
      )}

      <div key={drillTopic?.id ?? "topics"} className="animate-card-swap mt-4 h-64">
        {!hasAnyAttempt ? (
          <p className="grid h-full place-items-center text-sm text-muted-foreground">
            Aún no tienes intentos. Empieza practicando un{" "}
            <Link to="/temas" className="ml-1 text-primary hover:underline">
              curso
            </Link>
            .
          </p>
        ) : displayedBars.length === 0 ? (
          <p className="grid h-full place-items-center text-sm text-muted-foreground">
            Ningún intento coincide con estos filtros.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={displayedBars}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: any) => (value === null ? "Sin datos" : `${value}%`)} />
              <Bar
                dataKey="accuracy"
                name="Tu precisión"
                fill="var(--color-primary)"
                radius={[6, 6, 0, 0]}
                cursor={!drillTopic ? "pointer" : undefined}
              >
                <LabelList dataKey="trend" content={TrendLabel} />
                {displayedBars.map((bar) => (
                  <Cell
                    key={bar.id}
                    fill="var(--color-primary)"
                    onClick={() => {
                      // El click siempre intenta abrir el gate premium
                      // (incluso sin datos enriquecidos todavía cargados) —
                      // solo se ignora silenciosamente si ya estamos en el
                      // drill-down o si, siendo premium, el detalle aún no
                      // terminó de cargar (raro, ventana muy breve).
                      if (drillTopic) return;
                      premium.gate(() => {
                        if (!usingEnhanced) return;
                        setDrillTopic({ id: bar.id, name: bar.name });
                      });
                    }}
                  />
                ))}
              </Bar>
              {usingEnhanced && (
                <Bar
                  dataKey="avgAccuracy"
                  name="Promedio general"
                  fill="var(--color-muted-foreground)"
                  fillOpacity={0.35}
                  radius={[6, 6, 0, 0]}
                >
                  <LabelList dataKey="avgAccuracy" content={NoAvgDataLabel} />
                </Bar>
              )}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {usingEnhanced && hasAnyAttempt && displayedBars.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary" /> Tu precisión
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-muted-foreground/35" /> Promedio
            general
          </span>
          <span className="flex items-center gap-1.5">
            <ArrowUp className="h-3 w-3 text-success" /> Mejorando
          </span>
          <span className="flex items-center gap-1.5">
            <ArrowDown className="h-3 w-3 text-destructive" /> Bajando
          </span>
          <span>(últimos 30 días vs. los 30 anteriores)</span>
          {!drillTopic && <span>· Click en una barra para ver el detalle por subtema</span>}
        </div>
      )}

      {premium.gateDialog}
    </section>
  );
}
