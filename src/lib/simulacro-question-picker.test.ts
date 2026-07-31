import { describe, expect, it } from "vitest";
import { pickTemplateQuestions } from "@/lib/simulacro-question-picker";

// Shuffle identidad: hace el resultado determinista para poder afirmar
// exactamente qué ids se eligen (el shuffle real usa Math.random()).
const identity = <T>(arr: T[]): T[] => arr;

describe("pickTemplateQuestions", () => {
  it("prioriza preguntas no vistas por sobre las ya vistas", () => {
    const pool = ["seen-1", "unseen-1", "unseen-2", "seen-2"];
    const seen = new Set(["seen-1", "seen-2"]);
    const picked = pickTemplateQuestions(pool, seen, 2, identity);
    expect(picked).toEqual(["unseen-1", "unseen-2"]);
  });

  it("recurre a preguntas ya vistas solo si no alcanzan las no vistas", () => {
    const pool = ["seen-1", "unseen-1", "seen-2"];
    const seen = new Set(["seen-1", "seen-2"]);
    const picked = pickTemplateQuestions(pool, seen, 3, identity);
    expect(picked).toEqual(["unseen-1", "seen-1", "seen-2"]);
  });

  it("respeta la cantidad exacta pedida cuando hay suficientes no vistas", () => {
    const pool = ["a", "b", "c", "d", "e"];
    const picked = pickTemplateQuestions(pool, new Set(), 3, identity);
    expect(picked).toHaveLength(3);
    expect(picked).toEqual(["a", "b", "c"]);
  });

  it("si el pool completo ya fue visto, devuelve preguntas vistas hasta la cantidad pedida", () => {
    const pool = ["seen-1", "seen-2", "seen-3"];
    const seen = new Set(pool);
    const picked = pickTemplateQuestions(pool, seen, 2, identity);
    expect(picked).toEqual(["seen-1", "seen-2"]);
  });

  it("si el pool tiene menos preguntas que las pedidas, devuelve todas las disponibles", () => {
    const pool = ["a", "b"];
    const picked = pickTemplateQuestions(pool, new Set(), 5, identity);
    expect(picked).toEqual(["a", "b"]);
  });
});
