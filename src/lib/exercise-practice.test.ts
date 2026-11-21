import { describe, expect, it } from "vitest";
import {
  exerciseListFilters,
  exerciseListSearchSchema,
  exercisePracticeSearchSchema,
  sampleExercisePositions,
} from "./exercise-practice";

describe("exercise practice", () => {
  it("includes every option by default", () => {
    expect(exerciseListFilters("algebra", exerciseListSearchSchema.parse({}))).toEqual({
      topicSlug: "algebra",
      subtopicSlug: undefined,
      difficulty: undefined,
      universitySlug: undefined,
    });
  });

  it("combines the topic, difficulty and origin university", () => {
    expect(
      exerciseListFilters("algebra", {
        subtopic: "matrices-y-determinantes",
        difficulty: "medio",
        university: "uni",
      }),
    ).toEqual({
      topicSlug: "algebra",
      subtopicSlug: "matrices-y-determinantes",
      difficulty: "medio",
      universitySlug: "uni",
    });
  });

  it.each([0, 1, 2, 3, 4, 5])("uses all available exercises when %i match", (total) => {
    const positions = sampleExercisePositions(total, () => 0.4);
    expect([...positions].sort((a, b) => a - b)).toEqual(
      Array.from({ length: total }, (_, index) => index),
    );
  });

  it("can choose exercises beyond the first page and the API row limit", () => {
    const positions = sampleExercisePositions(2500, () => 0.99999);
    expect(positions).toHaveLength(5);
    expect(new Set(positions).size).toBe(5);
    expect(positions.every((position) => position >= 2495 && position < 2500)).toBe(true);
  });

  it("terminates with distinct exercises even when the random draws collide", () => {
    const positions = sampleExercisePositions(100, () => 0);
    expect(positions).toHaveLength(5);
    expect(new Set(positions).size).toBe(5);
  });

  it("keeps the selection and return filters when reading a practice URL", () => {
    const practice = [
      "00000000-0000-4000-8000-000000000001",
      "00000000-0000-4000-8000-000000000002",
    ];
    const search = {
      practice,
      course: "algebra",
      subtopic: "matrices-y-determinantes",
      difficulty: "medio",
      university: "uni",
    };
    expect(exercisePracticeSearchSchema.parse(search)).toEqual(search);
    expect(
      exercisePracticeSearchSchema.parse({ practice: [...practice, practice[0]] }).practice,
    ).toBeUndefined();
    expect(exercisePracticeSearchSchema.parse({ practice: [] }).practice).toBeUndefined();
    expect(exercisePracticeSearchSchema.parse({ practice: ["invalid"] }).practice).toBeUndefined();
  });
});
