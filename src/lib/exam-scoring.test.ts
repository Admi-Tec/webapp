import { describe, expect, it } from "vitest";
import { computeExamScore, FALLBACK_SCORING } from "@/lib/exam-scoring";

describe("computeExamScore", () => {
  it("da el puntaje máximo cuando todas las respuestas son correctas", () => {
    const score = computeExamScore(
      { correct: 10, incorrect: 0, empty: 0 },
      { correct: 1, incorrect: -1, empty: 0 },
    );
    expect(score).toBe(10);
  });

  it("calcula el puntaje con una mezcla de correctas/incorrectas/vacías", () => {
    const score = computeExamScore(
      { correct: 7, incorrect: 3, empty: 2 },
      { correct: 1, incorrect: -0.5, empty: 0 },
    );
    expect(score).toBe(7 - 1.5);
  });

  it("nunca baja de 0 aunque la fórmula interna dé negativo", () => {
    const score = computeExamScore(
      { correct: 1, incorrect: 10, empty: 0 },
      { correct: 1, incorrect: -1, empty: 0 },
    );
    expect(score).toBe(0);
  });

  it("con incorrect=0 (examen sin penalización) ignora las incorrectas", () => {
    const score = computeExamScore(
      { correct: 5, incorrect: 8, empty: 2 },
      { correct: 1, incorrect: 0, empty: 0 },
    );
    expect(score).toBe(5);
  });

  it("FALLBACK_SCORING no penaliza más allá de -1 por incorrecta", () => {
    const score = computeExamScore({ correct: 3, incorrect: 2, empty: 1 }, FALLBACK_SCORING);
    expect(score).toBe(1);
  });
});
