import { useState } from "react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ExercisePracticeControls } from "./exercise-practice-controls";
import type { ExerciseListSearch } from "@/lib/exercise-practice";

const scrollIntoView = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollIntoView");

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
});

afterAll(() => {
  if (scrollIntoView) {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", scrollIntoView);
  } else {
    Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
  }
});

function Controls() {
  const [filters, setFilters] = useState<ExerciseListSearch>({
    subtopic: "all",
    difficulty: "all",
    university: "all",
  });
  return (
    <ExercisePracticeControls
      filters={filters}
      topics={[{ slug: "funciones", name: "Funciones" }]}
      universities={[{ slug: "uni", short_name: "UNI" }]}
      total={20}
      pending={false}
      starting={false}
      onChange={setFilters}
      onStart={() => {}}
    />
  );
}

describe("exercise filters", () => {
  it.each([
    { name: "Tema", option: "Funciones", reset: "Todos los temas", label: "Tema" },
    { name: "Dificultad", option: "Fácil", reset: "Todas las dificultades", label: "Dificultad" },
    {
      name: "Universidad de procedencia",
      option: "UNI",
      reset: "Todas las universidades",
      label: "Universidad",
    },
  ])(
    "keeps the $name label visible when resetting the filter",
    async ({ name, option, reset, label }) => {
      render(<Controls />);
      const trigger = screen.getByRole("combobox", { name });
      expect(trigger).toHaveTextContent(label);

      // Exercise the real Radix menu, including its open/close lifecycle.
      for (let cycle = 0; cycle < 2; cycle++) {
        fireEvent.keyDown(trigger, { key: "ArrowDown" });
        fireEvent.keyDown(await screen.findByRole("option", { name: option }), { key: "Enter" });
        await waitFor(() => expect(trigger).toHaveTextContent(option));

        fireEvent.keyDown(trigger, { key: "ArrowDown" });
        fireEvent.keyDown(await screen.findByRole("option", { name: reset }), { key: "Enter" });
        await waitFor(() => expect(trigger).toHaveTextContent(label));
      }
    },
  );
});
