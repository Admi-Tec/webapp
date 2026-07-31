import { describe, expect, it } from "vitest";
import {
  containsBlockedWord,
  isValidPseudonymFormat,
  PSEUDONYM_MAX_LENGTH,
  PSEUDONYM_MIN_LENGTH,
} from "@/lib/pseudonym";

describe("isValidPseudonymFormat", () => {
  it("acepta letras, números, guion y guion bajo dentro del rango de largo", () => {
    expect(isValidPseudonymFormat("Juan_Perez-99")).toBe(true);
  });

  it("rechaza pseudónimos más cortos que el mínimo", () => {
    expect(isValidPseudonymFormat("a".repeat(PSEUDONYM_MIN_LENGTH - 1))).toBe(false);
  });

  it("acepta exactamente el largo mínimo y máximo", () => {
    expect(isValidPseudonymFormat("a".repeat(PSEUDONYM_MIN_LENGTH))).toBe(true);
    expect(isValidPseudonymFormat("a".repeat(PSEUDONYM_MAX_LENGTH))).toBe(true);
  });

  it("rechaza pseudónimos más largos que el máximo", () => {
    expect(isValidPseudonymFormat("a".repeat(PSEUDONYM_MAX_LENGTH + 1))).toBe(false);
  });

  it("rechaza espacios, acentos y símbolos no permitidos", () => {
    expect(isValidPseudonymFormat("juan perez")).toBe(false);
    expect(isValidPseudonymFormat("josé")).toBe(false);
    expect(isValidPseudonymFormat("user@name")).toBe(false);
  });
});

describe("containsBlockedWord", () => {
  it("detecta una palabra bloqueada tal cual", () => {
    expect(containsBlockedWord("carajo")).toBe(true);
  });

  it("es insensible a mayúsculas/minúsculas", () => {
    expect(containsBlockedWord("CARAJO123")).toBe(true);
  });

  it("normaliza acentos antes de comparar", () => {
    expect(containsBlockedWord("estúpido")).toBe(true);
  });

  it("no marca un pseudónimo limpio como bloqueado", () => {
    expect(containsBlockedWord("estudiante_2026")).toBe(false);
  });
});
