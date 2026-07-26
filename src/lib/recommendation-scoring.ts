// Motor de recomendaciones de ejercicios (plan-motor-recomendaciones.md):
// scoring puro en TS, sin acceso a DB — los pesos son fijos para esta v1
// (decisión §7 del plan, no configurables por admin), así que viven acá en
// vez de en la base de datos, donde serían más caros de iterar.

export const WEIGHTS = {
  frequency: 0.35,
  weakness: 0.4,
  staleness: 0.15,
  pace: 0.1,
  // Bono aparte, no parte del presupuesto 1.0 de arriba: garantiza que un
  // subtema frecuente EN el examen real Y de bajo rendimiento quede siempre
  // por encima de cualquiera de las dos señales por separado (plan §3: "debe
  // quedar siempre como la prioridad más alta").
  synergy: 0.3,
} as const;

// Un subtema se considera "no practicado hace tiempo" a partir de 4 semanas
// sin intentos (plan §7).
export const STALE_WEEKS = 4;

// Cuántos intentos sobre UN subtema hacen falta para que su rendimiento real
// reemplace por completo al diagnóstico inicial del onboarding (plan §3:
// "a medida que acumula intentos reales, el peso del rendimiento real debe ir
// reemplazando gradualmente al diagnóstico inicial").
export const CONFIDENCE_FULL_AT_ATTEMPTS = 5;

// Ventana corta para no repetir un ejercicio recién resuelto — distinta de
// STALE_WEEKS, que mide antigüedad del SUBTEMA, no del ejercicio puntual.
export const RECENTLY_SOLVED_DAYS = 3;

export type SubtopicSignals = {
  subtopicId: string;
  subtopicName: string;
  topicId: string;
  topicName: string;
  /** Cuántas veces aparece este subtema en exámenes reales de la universidad objetivo. */
  frequencyCount: number;
  /** Mayor frequencyCount entre los subtemas de este mismo topic (para normalizar 0..1). */
  maxFrequencyInTopic: number;
  attempts: number;
  correct: number;
  /** 0..1, null si el estudiante nunca intentó este subtema. */
  accuracy: number | null;
  lastAttemptAt: string | null;
  myAvgTimeMs: number | null;
  globalAvgTimeMs: number | null;
  /** true si el topic de este subtema está en profiles.initial_weak_topic_ids. */
  isDiagnosedWeak: boolean;
};

/**
 * Prioridad de estudio de un subtema (mayor = más urgente practicarlo).
 * No tiene techo fijo (~0..1.75 en la práctica) — solo sirve para ordenar
 * relativamente entre subtemas, no como probabilidad ni porcentaje.
 */
export function scoreSubtopic(s: SubtopicSignals, now: Date = new Date()): number {
  const normFreq = s.maxFrequencyInTopic > 0 ? s.frequencyCount / s.maxFrequencyInTopic : 0;

  // Mezcla de cold start: la confianza en el dato real crece con los intentos
  // sobre ESTE subtema. Un topic diagnosticado como débil en el onboarding
  // arranca "asumido débil" (0.75); uno no marcado arranca neutral (0.45) en
  // vez de "asumido fuerte" — un subtema sin diagnóstico ni intentos igual
  // debe poder recomendarse por frecuencia/antigüedad.
  const confidence = Math.min(1, s.attempts / CONFIDENCE_FULL_AT_ATTEMPTS);
  const diagnosticWeakness = s.isDiagnosedWeak ? 0.75 : 0.45;
  const realWeakness = s.accuracy === null ? diagnosticWeakness : 1 - s.accuracy;
  const weakness = confidence * realWeakness + (1 - confidence) * diagnosticWeakness;

  const staleMs = STALE_WEEKS * 7 * 24 * 3600 * 1000;
  const isStale =
    s.lastAttemptAt === null || now.getTime() - new Date(s.lastAttemptAt).getTime() >= staleMs;
  const staleness = isStale ? 1 : 0;

  // Señal secundaria (plan §3.3: "no determinante por sí sola") — capada a
  // 0..1 y nunca negativa: solo suma cuando el estudiante es MÁS LENTO que el
  // promedio, jamás resta por ser rápido.
  const pace =
    s.myAvgTimeMs && s.globalAvgTimeMs
      ? Math.max(0, Math.min(1, s.myAvgTimeMs / s.globalAvgTimeMs - 1))
      : 0;

  const base =
    WEIGHTS.frequency * normFreq +
    WEIGHTS.weakness * weakness +
    WEIGHTS.staleness * staleness +
    WEIGHTS.pace * pace;

  const synergy = WEIGHTS.synergy * normFreq * weakness;

  return base + synergy;
}

/**
 * Multiplicador global (no por subtema) por urgencia: fecha de examen cercana
 * y/o brecha respecto al puntaje mínimo. Se aplica sobre el ranking ya
 * calculado en vez de mezclarse en scoreSubtopic porque ambas señales son
 * por-estudiante, no por-subtema. gapPct suele ser null (min_scores exige
 * hoy un match exacto university+exam+career) — cuando no hay match, se
 * omite sin bloquear el resto del cálculo.
 */
export function urgencyMultiplier(daysToExam: number | null, gapPct: number | null): number {
  let m = 1;
  if (daysToExam !== null) {
    if (daysToExam <= 14) m += 0.3;
    else if (daysToExam <= 30) m += 0.15;
  }
  if (gapPct !== null && gapPct > 0) {
    m += Math.min(0.3, gapPct);
  }
  return m;
}

/** Texto de explicación (plan §5), en orden de prioridad: sinergia → debilidad → antigüedad → frecuencia. */
export function reasonFor(s: SubtopicSignals, now: Date = new Date()): string {
  const accuracyPct = s.accuracy !== null ? Math.round(s.accuracy * 100) : null;
  const isFrequent = s.frequencyCount > 0;
  const isWeak = accuracyPct !== null && accuracyPct < 60;

  if (isFrequent && isWeak) {
    return `Tema frecuente en tu examen y baja tasa de acierto (${accuracyPct}%) en ${s.subtopicName}`;
  }
  if (isWeak) {
    return `Baja tasa de acierto (${accuracyPct}%) en ${s.subtopicName}`;
  }
  if (s.lastAttemptAt === null) {
    return `Aún no practicas ${s.subtopicName}`;
  }
  const weeks = Math.floor((now.getTime() - new Date(s.lastAttemptAt).getTime()) / (7 * 864e5));
  if (weeks >= STALE_WEEKS) {
    return `No has practicado esto en ${weeks} semanas`;
  }
  if (isFrequent) {
    return `Tema frecuente en tu examen`;
  }
  return `Te puede servir reforzar ${s.subtopicName}`;
}

export type RankedSubtopic = {
  signals: SubtopicSignals;
  score: number;
};

/** Ordena de mayor a menor prioridad (score * urgencyMultiplier). */
export function rankSubtopics(
  signals: SubtopicSignals[],
  urgency: number,
  now: Date = new Date(),
): RankedSubtopic[] {
  return signals
    .map((s) => ({ signals: s, score: scoreSubtopic(s, now) * urgency }))
    .sort((a, b) => b.score - a.score);
}

/** Definición exacta del plan §4: "Prioridad alta" = frecuente Y bajo rendimiento. */
export function isHighPriority(s: SubtopicSignals): boolean {
  return s.frequencyCount > 0 && s.accuracy !== null && s.accuracy < 0.6;
}
