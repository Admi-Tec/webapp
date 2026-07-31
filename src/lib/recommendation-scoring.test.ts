import { describe, expect, it } from "vitest";
import {
  CONFIDENCE_FULL_AT_ATTEMPTS,
  isHighPriority,
  rankSubtopics,
  scoreSubtopic,
  STALE_WEEKS,
  urgencyMultiplier,
  type SubtopicSignals,
} from "@/lib/recommendation-scoring";

const NOW = new Date("2026-08-01T00:00:00.000Z");

function makeSignal(overrides: Partial<SubtopicSignals> = {}): SubtopicSignals {
  return {
    subtopicId: "st-1",
    subtopicName: "Factorización",
    topicId: "t-1",
    topicName: "Álgebra",
    frequencyCount: 0,
    maxFrequencyInTopic: 10,
    attempts: 0,
    correct: 0,
    accuracy: null,
    lastAttemptAt: null,
    myAvgTimeMs: null,
    globalAvgTimeMs: null,
    isDiagnosedWeak: false,
    ...overrides,
  };
}

describe("scoreSubtopic", () => {
  it("un subtema frecuente Y de bajo rendimiento queda por encima de cualquiera de las dos señales por separado", () => {
    const frequentAndWeak = makeSignal({
      frequencyCount: 10,
      maxFrequencyInTopic: 10,
      attempts: 5,
      accuracy: 0.2,
    });
    const onlyFrequent = makeSignal({
      frequencyCount: 10,
      maxFrequencyInTopic: 10,
      attempts: 5,
      accuracy: 0.9,
    });
    const onlyWeak = makeSignal({
      frequencyCount: 0,
      maxFrequencyInTopic: 10,
      attempts: 5,
      accuracy: 0.2,
    });

    const combined = scoreSubtopic(frequentAndWeak, NOW);
    expect(combined).toBeGreaterThan(scoreSubtopic(onlyFrequent, NOW));
    expect(combined).toBeGreaterThan(scoreSubtopic(onlyWeak, NOW));
  });

  it("sin intentos reales, un topic diagnosticado como débil pesa más que uno no diagnosticado", () => {
    const diagnosedWeak = makeSignal({ isDiagnosedWeak: true });
    const neutral = makeSignal({ isDiagnosedWeak: false });
    expect(scoreSubtopic(diagnosedWeak, NOW)).toBeGreaterThan(scoreSubtopic(neutral, NOW));
  });

  it("con intentos suficientes, el rendimiento real reemplaza al diagnóstico inicial", () => {
    // Diagnosticado como débil pero con buen rendimiento real y attempts
    // >= CONFIDENCE_FULL_AT_ATTEMPTS: la confianza es 1, así que el
    // diagnóstico ya no debería influir.
    const highAccuracyDespiteDiagnosis = makeSignal({
      isDiagnosedWeak: true,
      attempts: CONFIDENCE_FULL_AT_ATTEMPTS,
      accuracy: 0.95,
    });
    const lowAccuracyNotDiagnosed = makeSignal({
      isDiagnosedWeak: false,
      attempts: CONFIDENCE_FULL_AT_ATTEMPTS,
      accuracy: 0.1,
    });
    expect(scoreSubtopic(lowAccuracyNotDiagnosed, NOW)).toBeGreaterThan(
      scoreSubtopic(highAccuracyDespiteDiagnosis, NOW),
    );
  });

  it("un subtema no practicado hace STALE_WEEKS o más suma la señal de antigüedad", () => {
    const staleDate = new Date(NOW.getTime() - (STALE_WEEKS * 7 + 1) * 86400000).toISOString();
    const recentDate = new Date(NOW.getTime() - 1 * 86400000).toISOString();
    const stale = makeSignal({ lastAttemptAt: staleDate });
    const recent = makeSignal({ lastAttemptAt: recentDate });
    expect(scoreSubtopic(stale, NOW)).toBeGreaterThan(scoreSubtopic(recent, NOW));
  });

  it("nunca marca el subtema no practicado como si tuviera puntaje 0", () => {
    const neverAttempted = makeSignal({ lastAttemptAt: null });
    expect(scoreSubtopic(neverAttempted, NOW)).toBeGreaterThan(0);
  });

  it("pace solo suma cuando el estudiante es más lento que el promedio, nunca resta por ser rápido", () => {
    const slower = makeSignal({ myAvgTimeMs: 200, globalAvgTimeMs: 100 });
    const faster = makeSignal({ myAvgTimeMs: 50, globalAvgTimeMs: 100 });
    const baseline = makeSignal({ myAvgTimeMs: null, globalAvgTimeMs: null });
    expect(scoreSubtopic(slower, NOW)).toBeGreaterThan(scoreSubtopic(baseline, NOW));
    expect(scoreSubtopic(faster, NOW)).toBe(scoreSubtopic(baseline, NOW));
  });
});

describe("rankSubtopics", () => {
  it("ordena de mayor a menor prioridad, priorizando frecuente+débil", () => {
    const frequentAndWeak = makeSignal({
      subtopicId: "priority",
      frequencyCount: 10,
      maxFrequencyInTopic: 10,
      attempts: 5,
      accuracy: 0.2,
    });
    const untouched = makeSignal({ subtopicId: "low", frequencyCount: 0, accuracy: null });

    const ranked = rankSubtopics([untouched, frequentAndWeak], 1, NOW);
    expect(ranked[0].signals.subtopicId).toBe("priority");
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });

  it("aplica el multiplicador de urgencia a todos los scores por igual", () => {
    const signals = [makeSignal({ subtopicId: "a" }), makeSignal({ subtopicId: "b" })];
    const withoutUrgency = rankSubtopics(signals, 1, NOW);
    const withUrgency = rankSubtopics(signals, 1.3, NOW);
    expect(withUrgency[0].score).toBeCloseTo(withoutUrgency[0].score * 1.3);
  });
});

describe("urgencyMultiplier", () => {
  it("sin fecha de examen ni brecha de puntaje: multiplicador neutral", () => {
    expect(urgencyMultiplier(null, null)).toBe(1);
  });

  it("examen a 14 días o menos aumenta más el multiplicador que a 30 días", () => {
    const close = urgencyMultiplier(10, null);
    const far = urgencyMultiplier(25, null);
    expect(close).toBeGreaterThan(far);
    expect(far).toBeGreaterThan(1);
  });

  it("examen a más de 30 días no aumenta el multiplicador por fecha", () => {
    expect(urgencyMultiplier(60, null)).toBe(1);
  });

  it("una brecha positiva respecto al puntaje mínimo aumenta el multiplicador, capado a 0.3", () => {
    expect(urgencyMultiplier(null, 0.5)).toBe(1.3);
    expect(urgencyMultiplier(null, 2)).toBe(1.3);
  });

  it("brecha nula o negativa no aumenta el multiplicador", () => {
    expect(urgencyMultiplier(null, 0)).toBe(1);
    expect(urgencyMultiplier(null, -0.2)).toBe(1);
  });
});

describe("isHighPriority", () => {
  it("es alta prioridad solo cuando es frecuente Y de bajo rendimiento (<60%)", () => {
    expect(isHighPriority(makeSignal({ frequencyCount: 5, accuracy: 0.5 }))).toBe(true);
  });

  it("no es alta prioridad si no es frecuente en el examen real", () => {
    expect(isHighPriority(makeSignal({ frequencyCount: 0, accuracy: 0.1 }))).toBe(false);
  });

  it("no es alta prioridad si el rendimiento es bueno (>=60%)", () => {
    expect(isHighPriority(makeSignal({ frequencyCount: 5, accuracy: 0.6 }))).toBe(false);
  });

  it("no es alta prioridad si nunca se intentó (accuracy null)", () => {
    expect(isHighPriority(makeSignal({ frequencyCount: 5, accuracy: null }))).toBe(false);
  });
});
