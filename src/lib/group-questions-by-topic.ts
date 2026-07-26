export interface QuestionGroup<T> {
  name: string;
  items: Array<{ question: T; index: number }>;
}

// Agrupa visualmente las preguntas de un examen/simulacro por curso,
// preservando el índice global (posición real en question_ids) de cada una —
// las preguntas pueden llegar mezcladas entre cursos (los simulacros siempre
// las baraja; los exámenes estándar también si question_order es "random").
// Los grupos se ordenan por la primera pregunta que aparece de cada curso,
// para que el panel siga el mismo orden 1, 2, 3... que ve el estudiante.
export function groupQuestionsByTopic<T extends { topic?: { name?: string | null } | null }>(
  questions: T[],
): QuestionGroup<T>[] {
  const map = new Map<string, QuestionGroup<T>["items"]>();
  questions.forEach((question, index) => {
    const name = question.topic?.name ?? "Otros";
    if (!map.has(name)) map.set(name, []);
    map.get(name)!.push({ question, index });
  });
  return Array.from(map.entries())
    .map(([name, items]) => ({ name, items }))
    .sort((a, b) => a.items[0].index - b.items[0].index);
}
