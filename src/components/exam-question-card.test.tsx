import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExamQuestionCard, type ExamQuestionExercise } from "@/components/exam-question-card";

// Estas dependencias tienen sus propias fuentes de datos (Supabase, KaTeX/
// markdown pesado) que no importan para probar la selección de alternativas
// de ExamQuestionCard — se reemplazan por stubs mínimos.
vi.mock("@/lib/math-render", () => ({
  MathText: ({ text }: { text: string }) => <div data-testid="statement">{text}</div>,
  ChoiceText: ({ text }: { text: string }) => <span>{text}</span>,
}));
vi.mock("@/components/favorite-button", () => ({
  FavoriteButton: () => <button type="button">favorito</button>,
}));
vi.mock("@/components/zoomable-image", () => ({
  ZoomableImage: ({ src }: { src: string }) => <img src={src} alt="Enunciado ampliable" />,
}));

const exercise: ExamQuestionExercise = {
  id: "ex-1",
  topic: { name: "Álgebra" },
  statement_md: "Resuelve x + 1 = 2",
  choices: ["x = 1", "x = 2", "x = 3"],
};

describe("ExamQuestionCard", () => {
  it("renderiza el enunciado, el tema y las alternativas", () => {
    render(
      <ExamQuestionCard
        exercise={exercise}
        selectedIndex={undefined}
        flagged={false}
        disabled={false}
        onSelect={vi.fn()}
        onToggleFlag={vi.fn()}
      />,
    );
    expect(screen.getByTestId("statement")).toHaveTextContent("Resuelve x + 1 = 2");
    expect(screen.getByText("Álgebra")).toBeInTheDocument();
    expect(screen.getByText("x = 1")).toBeInTheDocument();
    expect(screen.getByText("x = 2")).toBeInTheDocument();
    expect(screen.getByText("x = 3")).toBeInTheDocument();
  });

  it("al hacer click en una alternativa, llama a onSelect con su índice", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <ExamQuestionCard
        exercise={exercise}
        selectedIndex={undefined}
        flagged={false}
        disabled={false}
        onSelect={onSelect}
        onToggleFlag={vi.fn()}
      />,
    );
    await user.click(screen.getByText("x = 2").closest("button")!);
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it("marca visualmente la alternativa seleccionada", () => {
    render(
      <ExamQuestionCard
        exercise={exercise}
        selectedIndex={1}
        flagged={false}
        disabled={false}
        onSelect={vi.fn()}
        onToggleFlag={vi.fn()}
      />,
    );
    const selectedButton = screen.getByText("x = 2").closest("button")!;
    const unselectedButton = screen.getByText("x = 1").closest("button")!;
    expect(selectedButton.className).toMatch(/bg-primary\/10/);
    expect(unselectedButton.className).not.toMatch(/bg-primary\/10/);
  });

  it("deshabilita las alternativas cuando se acabó el tiempo", () => {
    render(
      <ExamQuestionCard
        exercise={exercise}
        selectedIndex={undefined}
        flagged={false}
        disabled={true}
        onSelect={vi.fn()}
        onToggleFlag={vi.fn()}
      />,
    );
    for (const choice of exercise.choices) {
      expect(screen.getByText(choice).closest("button")).toBeDisabled();
    }
  });

  it("el botón de marcar/desmarcar dispara onToggleFlag y refleja el estado flagged", async () => {
    const onToggleFlag = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <ExamQuestionCard
        exercise={exercise}
        selectedIndex={undefined}
        flagged={false}
        disabled={false}
        onSelect={vi.fn()}
        onToggleFlag={onToggleFlag}
      />,
    );
    expect(screen.getByText("Marcar")).toBeInTheDocument();
    await user.click(screen.getByText("Marcar"));
    expect(onToggleFlag).toHaveBeenCalledTimes(1);

    rerender(
      <ExamQuestionCard
        exercise={exercise}
        selectedIndex={undefined}
        flagged={true}
        disabled={false}
        onSelect={vi.fn()}
        onToggleFlag={onToggleFlag}
      />,
    );
    expect(screen.getByText("Desmarcar")).toBeInTheDocument();
  });

  it("muestra la imagen del enunciado solo si se pasa imageUrl", () => {
    const { rerender } = render(
      <ExamQuestionCard
        exercise={exercise}
        selectedIndex={undefined}
        flagged={false}
        disabled={false}
        onSelect={vi.fn()}
        onToggleFlag={vi.fn()}
      />,
    );
    expect(screen.queryByAltText("Enunciado ampliable")).not.toBeInTheDocument();

    rerender(
      <ExamQuestionCard
        exercise={exercise}
        selectedIndex={undefined}
        flagged={false}
        disabled={false}
        imageUrl="https://example.com/img.png"
        onSelect={vi.fn()}
        onToggleFlag={vi.fn()}
      />,
    );
    expect(screen.getByAltText("Enunciado ampliable")).toBeInTheDocument();
  });
});
